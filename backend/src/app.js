const express = require("express");
const multer = require("multer");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { processar, ImagemInvalida } = require("./imagens");

const TITULO_MAX = 80;
const ARTISTA_MAX = 60;
const NOTA_MAX = 300;
const ANO_MIN = 1000;
const ANO_MAX = 2100;
const POR_PAGINA_PADRAO = 24;
const POR_PAGINA_MAX = 60;

/** Escapa % e _ para o título buscado não virar curinga do LIKE */
const escaparLike = (texto) => texto.replace(/[\\%_]/g, "\\$&");

const limparTitulo = (valor) => (typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "");

/** Texto livre (nota): apara as pontas e limita os saltos de linha seguidos */
const limparNota = (valor) => (typeof valor === "string" ? valor.trim().replace(/\n{3,}/g, "\n\n") : "");

/** Ano opcional: vazio vira null; fora do intervalo ou não inteiro é inválido (undefined) */
const lerAno = (valor) => {
  if (valor === undefined || valor === null || String(valor).trim() === "") return null;
  const n = Number(valor);
  return Number.isInteger(n) && n >= ANO_MIN && n <= ANO_MAX ? n : undefined;
};

/**
 * Versão da imagem para o cache do navegador. As respostas de /file e /thumb são "immutable" (1 ano), então a URL
 * precisa mudar quando o conteúdo muda: se o banco for refeito ou restaurado, os mesmos ids passam a apontar para
 * outras imagens, e sem isto o navegador mostraria as antigas.
 */
const versao = (linha) => `${Date.parse(linha.created_at).toString(36)}-${linha.bytes.toString(36)}`;

const paraItem = (linha) => ({
  id: linha.id,
  title: linha.title,
  artist: linha.artist,
  year: linha.year,
  note: linha.note,
  width: linha.width,
  height: linha.height,
  bytes: linha.bytes,
  mime: linha.mime,
  createdAt: linha.created_at,
  url: `/api/images/${linha.id}/file?v=${versao(linha)}`,
  thumbUrl: `/api/images/${linha.id}/thumb?v=${versao(linha)}`,
});

/**
 * Cria o app Express. Recebe o banco e as opções por parâmetro para poder ser testado sem subir servidor.
 * @param {{ db: import("node:sqlite").DatabaseSync, maxBytes?: number, origensPermitidas?: string[], limiteUploads?: number }} opcoes
 */
function criarApp({ db, maxBytes = 8 * 1024 * 1024, origensPermitidas = [], limiteUploads = 60 }) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // atrás do proxy da hospedagem (Render, etc.)

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })); // imagens podem ser exibidas por outro domínio
  app.use(
    cors({
      origin: origensPermitidas.length ? origensPermitidas : true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
    })
  );
  app.use(express.json({ limit: "10kb" }));

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1, fields: 5 } });
  const limitador = rateLimit({
    windowMs: 60_000,
    limit: limiteUploads,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Aguarde um minuto." },
  });

  const consultas = {
    inserir: db.prepare(
      "INSERT INTO images (title, artist, year, note, mime, width, height, bytes, data, thumb) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ),
    porId: db.prepare("SELECT id, title, artist, year, note, mime, width, height, bytes, created_at FROM images WHERE id = ?"),
    arquivo: db.prepare("SELECT mime, bytes, data, title FROM images WHERE id = ?"),
    miniatura: db.prepare("SELECT thumb FROM images WHERE id = ?"),
    atualizar: db.prepare("UPDATE images SET title = ?, artist = ?, year = ?, note = ? WHERE id = ?"),
    excluir: db.prepare("DELETE FROM images WHERE id = ?"),
  };

  const idValido = (valor) => (/^\d{1,12}$/.test(valor) ? Number(valor) : null);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  /* ------------------------------------------------------------ lista (com busca e paginação) */
  app.get("/api/images", (req, res) => {
    const pagina = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limite = Math.min(POR_PAGINA_MAX, Math.max(1, parseInt(req.query.limit, 10) || POR_PAGINA_PADRAO));
    const busca = limparTitulo(req.query.q).slice(0, TITULO_MAX);

    const where = busca ? "WHERE (title LIKE ? ESCAPE '\\' OR artist LIKE ? ESCAPE '\\')" : "";
    const termo = `%${escaparLike(busca)}%`;
    const params = busca ? [termo, termo] : [];
    const total = db.prepare(`SELECT COUNT(*) AS n FROM images ${where}`).get(...params).n;
    const linhas = db
      .prepare(
        `SELECT id, title, artist, year, note, mime, width, height, bytes, created_at FROM images ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limite, (pagina - 1) * limite);

    res.json({ items: linhas.map(paraItem), total, page: pagina, pages: Math.max(1, Math.ceil(total / limite)) });
  });

  /* ------------------------------------------------------------ envio */
  /** Valida título, artista, ano e nota; devolve { erro } ou { titulo, artista, ano, nota } */
  const lerCampos = (corpo, { parcial = false, atual } = {}) => {
    const tem = (campo) => !parcial || corpo?.[campo] !== undefined;
    const titulo = tem("title") ? limparTitulo(corpo?.title) : atual.title;
    const artista = tem("artist") ? limparTitulo(corpo?.artist) : atual.artist;
    const ano = tem("year") ? lerAno(corpo?.year) : atual.year;
    const nota = tem("note") ? limparNota(corpo?.note) : atual.note;
    if (!titulo || titulo.length > TITULO_MAX) return { erro: `O título deve ter de 1 a ${TITULO_MAX} caracteres.` };
    if (artista.length > ARTISTA_MAX) return { erro: `O nome do artista deve ter até ${ARTISTA_MAX} caracteres.` };
    if (ano === undefined) return { erro: `O ano deve ser um número entre ${ANO_MIN} e ${ANO_MAX}.` };
    if (nota.length > NOTA_MAX) return { erro: `A nota deve ter até ${NOTA_MAX} caracteres.` };
    return { titulo, artista, ano, nota };
  };

  const enviar = async (req, res, next) => {
    try {
      const campos = lerCampos(req.body);
      if (campos.erro) return res.status(400).json({ error: campos.erro });
      if (!req.file) return res.status(400).json({ error: "Envie uma imagem no campo 'image'." });

      const { mime, width, height, miniatura } = await processar(req.file.buffer);
      const r = consultas.inserir.run(
        campos.titulo, campos.artista, campos.ano, campos.nota,
        mime, width, height, req.file.buffer.length, req.file.buffer, miniatura
      );
      res.status(201).json(paraItem(consultas.porId.get(Number(r.lastInsertRowid))));
    } catch (erro) {
      next(erro);
    }
  };

  app.post("/api/images", limitador, upload.single("image"), enviar);

  /* ------------------------------------------------------------ arquivo e miniatura */
  const CACHE = "public, max-age=31536000, immutable"; // o conteúdo de um id nunca muda

  app.get("/api/images/:id/file", (req, res) => {
    const id = idValido(req.params.id);
    const linha = id && consultas.arquivo.get(id);
    if (!linha) return res.status(404).json({ error: "Imagem não encontrada." });
    res.set("Content-Type", linha.mime);
    res.set("Cache-Control", CACHE);
    if (req.query.download !== undefined) {
      const ext = linha.mime.split("/")[1].replace("jpeg", "jpg");
      const nome = linha.title.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 60) || "imagem";
      res.set("Content-Disposition", `attachment; filename="${nome}.${ext}"; filename*=UTF-8''${encodeURIComponent(nome)}.${ext}`);
    }
    res.send(Buffer.from(linha.data));
  });

  app.get("/api/images/:id/thumb", (req, res) => {
    const id = idValido(req.params.id);
    const linha = id && consultas.miniatura.get(id);
    if (!linha) return res.status(404).json({ error: "Imagem não encontrada." });
    res.set("Content-Type", "image/webp");
    res.set("Cache-Control", CACHE);
    res.send(Buffer.from(linha.thumb));
  });

  /* ------------------------------------------------------------ editar título e excluir */
  app.patch("/api/images/:id", (req, res) => {
    const id = idValido(req.params.id);
    const atual = id && consultas.porId.get(id);
    if (!atual) return res.status(404).json({ error: "Imagem não encontrada." });
    const campos = lerCampos(req.body, { parcial: true, atual });
    if (campos.erro) return res.status(400).json({ error: campos.erro });
    consultas.atualizar.run(campos.titulo, campos.artista, campos.ano, campos.nota, id);
    res.json(paraItem(consultas.porId.get(id)));
  });

  app.delete("/api/images/:id", (req, res) => {
    const id = idValido(req.params.id);
    if (!id || !consultas.excluir.run(id).changes) return res.status(404).json({ error: "Imagem não encontrada." });
    res.status(204).end();
  });

  /* ------------------------------------------------------------ rotas da versão antiga (compatibilidade) */
  app.get("/items", (_req, res) => {
    const linhas = db.prepare("SELECT id, title FROM images ORDER BY id DESC").all();
    res.json(linhas.map((l) => ({ id: l.id, img_name: l.title, name: l.title, img_url: `/api/images/${l.id}/file` })));
  });
  app.get("/items/:id", (req, res) => res.redirect(301, `/api/images/${encodeURIComponent(req.params.id)}/file`));
  app.post("/upload", limitador, upload.single("image"), (req, res, next) => {
    req.body = { ...req.body, title: req.body?.name }; // o formulário antigo enviava o título em "name"
    enviar(req, res, next);
  });

  /* ------------------------------------------------------------ erros */
  app.use("/api", (_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

  // eslint-disable-next-line no-unused-vars
  app.use((erro, _req, res, _next) => {
    if (erro instanceof multer.MulterError) {
      if (erro.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: `Arquivo muito grande. O limite é ${Math.round(maxBytes / 1024 / 1024)} MB.` });
      }
      return res.status(400).json({ error: "Requisição de envio inválida." });
    }
    if (erro instanceof ImagemInvalida) return res.status(415).json({ error: erro.message });
    if (erro?.type === "entity.parse.failed") return res.status(400).json({ error: "JSON inválido." });
    console.error(erro);
    res.status(500).json({ error: "Erro interno do servidor." });
  });

  return app;
}

module.exports = { criarApp, TITULO_MAX };
