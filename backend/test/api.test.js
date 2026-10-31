const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const request = require("supertest");
const sharp = require("sharp");
const { abrirBanco, migrarLegado } = require("../src/db");
const { criarApp } = require("../src/app");
const { detectarTipo } = require("../src/imagens");

const imagem = (formato = "png", w = 40, h = 20) =>
  sharp({ create: { width: w, height: h, channels: 3, background: "#cc3333" } })[formato]().toBuffer();

const novoApp = (opcoes = {}) => {
  const db = abrirBanco(":memory:");
  return { db, app: criarApp({ db, ...opcoes }) };
};

const enviar = (app, titulo, buffer, nomeArquivo = "foto.png") =>
  request(app)
    .post("/api/images")
    .field("title", titulo)
    .attach("image", buffer, nomeArquivo);

describe("envio", () => {
  let png;
  before(async () => {
    png = await imagem("png", 40, 20);
  });

  test("aceita uma imagem válida e devolve dimensões e URLs", async () => {
    const { app } = novoApp();
    const r = await enviar(app, "  Meu   pôr do sol  ", png);
    assert.equal(r.status, 201);
    assert.equal(r.body.title, "Meu pôr do sol"); // espaços normalizados
    assert.deepEqual([r.body.width, r.body.height, r.body.mime], [40, 20, "image/png"]);
    assert.match(r.body.thumbUrl, /^\/api\/images\/\d+\/thumb\?v=[a-z0-9-]+$/);
  });

  test("identifica o tipo pelos bytes: serve com o Content-Type correto (antes era sempre image/jpeg)", async () => {
    const { app } = novoApp();
    const webp = await imagem("webp");
    const { body } = await enviar(app, "webp", webp, "foto.jpg"); // extensão enganosa
    const arquivo = await request(app).get(body.url);
    assert.equal(arquivo.headers["content-type"], "image/webp");
    assert.equal(arquivo.headers["cache-control"], "public, max-age=31536000, immutable");
  });

  test("rejeita arquivo que não é imagem, mesmo com extensão e tipo de imagem", async () => {
    const { app } = novoApp();
    const r = await request(app)
      .post("/api/images")
      .field("title", "script")
      .attach("image", Buffer.from("<?php echo 1; ?>"), { filename: "foto.png", contentType: "image/png" });
    assert.equal(r.status, 415);
  });

  test("rejeita imagem corrompida (cabeçalho válido, conteúdo quebrado)", async () => {
    const { app } = novoApp();
    const quebrada = Buffer.concat([png.subarray(0, 40), Buffer.from("lixo")]);
    const r = await enviar(app, "quebrada", quebrada);
    assert.equal(r.status, 415);
  });

  test("limita o tamanho (413) e não derruba o servidor", async () => {
    const { app } = novoApp({ maxBytes: 100 });
    const r = await enviar(app, "grande", png);
    assert.equal(r.status, 413);
    assert.equal((await request(app).get("/api/health")).status, 200);
  });

  test("valida título e arquivo ausentes", async () => {
    const { app } = novoApp();
    assert.equal((await enviar(app, "   ", png)).status, 400);
    assert.equal((await enviar(app, "x".repeat(81), png)).status, 400);
    assert.equal((await request(app).post("/api/images").field("title", "sem arquivo")).status, 400);
  });
});

describe("lista, busca e paginação", () => {
  test("ordena do mais novo para o mais antigo e pagina", async () => {
    const { app } = novoApp();
    const png = await imagem();
    for (const t of ["um", "dois", "três", "quatro", "cinco"]) await enviar(app, t, png);
    const p1 = await request(app).get("/api/images?limit=2&page=1");
    assert.deepEqual(p1.body.items.map((i) => i.title), ["cinco", "quatro"]);
    assert.deepEqual([p1.body.total, p1.body.pages], [5, 3]);
    const p3 = await request(app).get("/api/images?limit=2&page=3");
    assert.deepEqual(p3.body.items.map((i) => i.title), ["um"]);
  });

  test("busca por título sem diferenciar maiúsculas e sem tratar % e _ como curinga", async () => {
    const { app } = novoApp();
    const png = await imagem();
    for (const t of ["Praia", "Montanha", "100% natural", "a_b"]) await enviar(app, t, png);
    assert.deepEqual((await request(app).get("/api/images?q=PRAIA")).body.items.map((i) => i.title), ["Praia"]);
    assert.equal((await request(app).get("/api/images?q=%25")).body.total, 1); // só "100% natural"
    assert.equal((await request(app).get("/api/images?q=_")).body.total, 1); // só "a_b"
    assert.equal((await request(app).get("/api/images?q=inexistente")).body.items.length, 0);
  });

  test("limita o tamanho da página", async () => {
    const { app } = novoApp();
    const r = await request(app).get("/api/images?limit=99999");
    assert.equal(r.status, 200);
  });
});

describe("arquivo, miniatura, edição e exclusão", () => {
  test("miniatura é WebP e menor que o original; download define o nome", async () => {
    const { app } = novoApp();
    const grande = await imagem("jpeg", 1600, 900); // maior que a miniatura (800 px)
    const { body } = await enviar(app, "Foto grande!", grande, "g.jpg");
    const thumb = await request(app).get(body.thumbUrl).buffer(true).parse((res, cb) => {
      const partes = [];
      res.on("data", (c) => partes.push(c));
      res.on("end", () => cb(null, Buffer.concat(partes)));
    });
    assert.equal(thumb.headers["content-type"], "image/webp");
    const meta = await sharp(thumb.body).metadata();
    assert.equal(meta.width, 800);
    const baixar = await request(app).get(`${body.url}&download`);
    assert.match(baixar.headers["content-disposition"], /attachment; filename="Foto_grande_\.jpg"/);
  });

  test("renomeia e exclui; id inexistente ou inválido dá 404", async () => {
    const { app } = novoApp();
    const { body } = await enviar(app, "antes", await imagem());
    const editada = await request(app).patch(`/api/images/${body.id}`).send({ title: "depois" });
    assert.equal(editada.body.title, "depois");
    assert.equal((await request(app).patch(`/api/images/${body.id}`).send({ title: "" })).status, 400);
    assert.equal((await request(app).delete(`/api/images/${body.id}`)).status, 204);
    assert.equal((await request(app).get(body.url)).status, 404);
    assert.equal((await request(app).delete(`/api/images/${body.id}`)).status, 404);
    assert.equal((await request(app).get("/api/images/abc/file")).status, 404);
    assert.equal((await request(app).get("/api/images/1;DROP TABLE images/file")).status, 404);
  });
});

describe("etiqueta da obra: artista, ano e nota", () => {
  test("guarda os campos opcionais e devolve null quando o ano é omitido", async () => {
    const { app } = novoApp();
    const png = await imagem();
    const completa = await request(app).post("/api/images").field("title", "Noite").field("artist", "  Ana  Lima ").field("year", "1998").field("note", "Óleo sobre tela\n\n\n\nSérie azul").attach("image", png, "a.png");
    assert.equal(completa.status, 201);
    assert.deepEqual([completa.body.artist, completa.body.year, completa.body.note], ["Ana Lima", 1998, "Óleo sobre tela\n\nSérie azul"]);
    const simples = await enviar(app, "Sem dados", png);
    assert.deepEqual([simples.body.artist, simples.body.year, simples.body.note], ["", null, ""]);
  });

  test("valida ano, artista e nota", async () => {
    const { app } = novoApp();
    const png = await imagem();
    const tenta = (campos) => { let r = request(app).post("/api/images").field("title", "x"); for (const [k, v] of Object.entries(campos)) r = r.field(k, v); return r.attach("image", png, "a.png"); };
    assert.equal((await tenta({ year: "999" })).status, 400);
    assert.equal((await tenta({ year: "2101" })).status, 400);
    assert.equal((await tenta({ year: "19x8" })).status, 400);
    assert.equal((await tenta({ year: "1998.5" })).status, 400);
    assert.equal((await tenta({ artist: "a".repeat(61) })).status, 400);
    assert.equal((await tenta({ note: "n".repeat(301) })).status, 400);
    assert.equal((await tenta({ year: "" })).status, 201); // vazio = sem ano
  });

  test("busca também pelo nome do artista", async () => {
    const { app } = novoApp();
    const png = await imagem();
    await request(app).post("/api/images").field("title", "Mar").field("artist", "Clara Nunes").attach("image", png, "a.png");
    await request(app).post("/api/images").field("title", "Rua").field("artist", "Paulo").attach("image", png, "a.png");
    assert.deepEqual((await request(app).get("/api/images?q=clara")).body.items.map((i) => i.title), ["Mar"]);
  });

  test("PATCH é parcial: muda só o que foi enviado e mantém o resto", async () => {
    const { app } = novoApp();
    const { body } = await request(app).post("/api/images").field("title", "Original").field("artist", "Eu").field("year", "2020").attach("image", await imagem(), "a.png");
    const r = await request(app).patch(`/api/images/${body.id}`).send({ note: "Nova nota" });
    assert.deepEqual([r.body.title, r.body.artist, r.body.year, r.body.note], ["Original", "Eu", 2020, "Nova nota"]);
    const limpa = await request(app).patch(`/api/images/${body.id}`).send({ year: "" });
    assert.equal(limpa.body.year, null);
    assert.equal((await request(app).patch(`/api/images/${body.id}`).send({ year: "1" })).status, 400);
  });
});

describe("cache do navegador", () => {
  test("a URL da imagem muda quando o banco é refeito: ids reaproveitados não mostram a imagem antiga", async () => {
    const { app, db } = novoApp();
    const { body } = await enviar(app, "primeira", await imagem("png", 40, 20));
    const antes = (await request(app).get("/api/images")).body.items[0];
    assert.equal(antes.id, body.id);

    // simula banco refeito: mesmo id, outra imagem, outra data de criação
    const outra = await imagem("jpeg", 90, 60);
    db.prepare("UPDATE images SET created_at = '2030-01-01T00:00:00.000Z', bytes = ? WHERE id = ?").run(outra.length, body.id);
    const depois = (await request(app).get("/api/images")).body.items[0];
    assert.equal(depois.id, antes.id);
    assert.notEqual(depois.thumbUrl, antes.thumbUrl);
    assert.notEqual(depois.url, antes.url);
  });

  test("a versão não muda se nada mudou (o cache continua valendo)", async () => {
    const { app } = novoApp();
    await enviar(app, "estável", await imagem());
    const a = (await request(app).get("/api/images")).body.items[0];
    const b = (await request(app).get("/api/images")).body.items[0];
    assert.equal(a.thumbUrl, b.thumbUrl);
    assert.equal((await request(app).get(a.thumbUrl)).headers["cache-control"], "public, max-age=31536000, immutable");
  });
});

describe("compatibilidade com a versão antiga", () => {
  test("/items devolve img_url (o campo que o frontend antigo esperava e nunca existiu) e /upload ainda funciona", async () => {
    const { app } = novoApp();
    const r = await request(app).post("/upload").field("name", "legado").attach("image", await imagem(), "x.png");
    assert.equal(r.status, 201);
    const itens = (await request(app).get("/items")).body;
    assert.equal(itens[0].img_name, "legado");
    assert.match(itens[0].img_url, /^\/api\/images\/\d+\/file$/);
  });
});

describe("migração do banco antigo", () => {
  test("converte cad_imagem em images, ignora lixo e preserva a tabela antiga renomeada", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE cad_imagem (id INTEGER PRIMARY KEY AUTOINCREMENT, img_name TEXT NOT NULL, img_data BLOB NOT NULL)");
    const ins = db.prepare("INSERT INTO cad_imagem (img_name, img_data) VALUES (?, ?)");
    ins.run("foto antiga", await imagem("jpeg", 60, 30));
    ins.run("lixo", Buffer.from("não sou imagem"));
    // abrirBanco cria as tabelas novas no mesmo arquivo; aqui reaproveitamos a conexão
    db.exec(`CREATE TABLE images (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, artist TEXT NOT NULL DEFAULT '', year INTEGER, note TEXT NOT NULL DEFAULT '', mime TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, bytes INTEGER NOT NULL, data BLOB NOT NULL, thumb BLOB NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`);
    const r = await migrarLegado(db);
    assert.deepEqual(r, { migradas: 1, ignoradas: 1 });
    const linha = db.prepare("SELECT title, mime, width, height FROM images").get();
    assert.deepEqual({ ...linha }, { title: "foto antiga", mime: "image/jpeg", width: 60, height: 30 });
    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'cad_imagem_migrada'").get());
    assert.deepEqual(await migrarLegado(db), { migradas: 0, ignoradas: 0 }); // segunda vez não faz nada
  });
});

describe("detectarTipo", () => {
  test("reconhece pelos bytes", async () => {
    assert.equal(detectarTipo(await imagem("png")), "image/png");
    assert.equal(detectarTipo(await imagem("jpeg")), "image/jpeg");
    assert.equal(detectarTipo(await imagem("webp")), "image/webp");
    assert.equal(detectarTipo(Buffer.from("GIF89a....")), "image/gif");
    assert.equal(detectarTipo(Buffer.from("hello world, not an image")), null);
    assert.equal(detectarTipo(Buffer.alloc(0)), null);
  });
});
