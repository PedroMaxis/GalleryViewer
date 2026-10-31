/**
 * Preenche a galeria com obras REAIS de domínio público, vindas dos acervos abertos de dois museus:
 *   - Art Institute of Chicago (API pública; só obras com is_public_domain = true)
 *   - Cleveland Museum of Art Open Access (só imagens CC0)
 *
 * Uso:  npm run seed                      (API em http://localhost:5000)
 *       API_URL=https://minha-api npm run seed
 *       FORCAR=1 npm run seed             (adiciona mesmo que a galeria já tenha obras)
 *
 * O Art Institute pede que quem usa a API se identifique (cabeçalho AIC-User-Agent) e limita a ~60 req/min.
 * Este script faz as duas coisas. Imagens e metadados pertencem aos museus; ver o README.
 */
const API = (process.env.API_URL || "http://localhost:5000").replace(/\/$/, "");
const CONTATO = process.env.CONTACT_EMAIL || "pedro11sales14@gmail.com";
const IDENTIFICACAO = `GalleryViewer-seed/2.0 (projeto de estudo; ${CONTATO})`;
const HEADERS = { "User-Agent": IDENTIFICACAO, "AIC-User-Agent": IDENTIFICACAO };

// IDs escolhidos à mão (obras conhecidas, formatos variados). Evitamos gravuras de vários painéis: no mosaico elas parecem colagens.
const AIC = [
  27992, 28560, 80607, 87088, 97933, 20684, 24645, 111442, 13506, 61128, 14655, 81558, 27943, 61603, 14572,
  17229, 154235, 56905, 111436, 64957, 4371, 4368, 21720, 61616,
];
const CMA = [
  125249, 135310, 135299, 125234, 135382, 130391, 95272, 115405, 135185, 135173, 135512, 149410, 148297, 148758,
  108541, 129386, 135336, 119697, 128392, 155626, 136760, 141168, 110953, 141639, 93014, 136911, 144732, 106088,
  124040, 111654, 103244, 126086, 152499, 152490, 152502, 124089, 127573, 122348, 134620, 144966, 125104, 135238,
  135480, 120286, 118159, 121188, 123490, 146752, 123249,
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const cortar = (texto, max) => (texto.length > max ? `${texto.slice(0, max - 1).trimEnd()}…` : texto);
const anoDe = (texto) => {
  const m = /\b(1[0-9]{3}|20[0-9]{2})\b/.exec(texto ?? "");
  return m ? Number(m[1]) : null;
};

async function json(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`${r.status} em ${url}`);
  return r.json();
}

async function baixar(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`${r.status} ao baixar a imagem`);
  return Buffer.from(await r.arrayBuffer());
}

/** Cada fonte devolve { titulo, artista, ano, nota, imagem(Buffer) } ou null se a obra não puder ser usada */
async function doAIC(id) {
  const campos = "id,title,artist_title,date_display,date_end,image_id,is_public_domain,medium_display";
  const { data } = await json(`https://api.artic.edu/api/v1/artworks/${id}?fields=${campos}`);
  if (!data.is_public_domain || !data.image_id) return null; // só domínio público
  const imagem = await baixar(`https://www.artic.edu/iiif/2/${data.image_id}/full/843,/0/default.jpg`);
  return {
    titulo: data.title,
    artista: data.artist_title ?? "",
    ano: anoDe(data.date_display) ?? data.date_end,
    nota: [data.medium_display, "Art Institute of Chicago · domínio público"].filter(Boolean).join(". "),
    imagem,
    espera: 1200, // limite de ~60 requisições por minuto
  };
}

async function doCMA(id) {
  const { data } = await json(`https://openaccess-api.clevelandart.org/api/artworks/${id}`);
  const web = data.images?.web?.url;
  if (data.share_license_status !== "CC0" || !web) return null; // só CC0
  const criador = data.creators?.[0]?.description ?? "";
  return {
    titulo: data.title,
    artista: criador.replace(/\s*\(.*$/, ""), // "Claude Monet (French, 1840–1926)" -> "Claude Monet"
    ano: anoDe(data.creation_date),
    nota: [data.technique, "Cleveland Museum of Art · CC0"].filter(Boolean).join(". "),
    imagem: await baixar(web),
    espera: 350,
  };
}

// embaralha com semente fixa, para as paredes do mosaico misturarem os dois museus sempre do mesmo jeito
const embaralhar = (lista) => {
  let semente = 20261031;
  const aleatorio = () => ((semente = (Math.imul(semente, 1664525) + 1013904223) | 0) >>> 0) / 4294967296;
  return lista
    .map((item) => ({ item, ordem: aleatorio() }))
    .sort((a, b) => a.ordem - b.ordem)
    .map((x) => x.item);
};

async function main() {
  const existente = await fetch(`${API}/api/images?limit=1`).then((r) => r.json());
  if (existente.total > 0 && !process.env.FORCAR) {
    console.log(`A galeria já tem ${existente.total} obras. Use FORCAR=1 para adicionar mesmo assim.`);
    return;
  }

  const fila = embaralhar([...AIC.map((id) => ({ fonte: "aic", id })), ...CMA.map((id) => ({ fonte: "cma", id }))]);
  let enviadas = 0;
  const falhas = [];

  for (const [i, { fonte, id }] of fila.entries()) {
    process.stdout.write(`\r[${i + 1}/${fila.length}] ${fonte.toUpperCase()} ${id}      `);
    try {
      const obra = await (fonte === "aic" ? doAIC(id) : doCMA(id));
      if (!obra) {
        falhas.push(`${fonte} ${id}: sem licença livre ou sem imagem`);
        continue;
      }
      const dados = new FormData();
      dados.append("title", cortar(obra.titulo, 80));
      dados.append("artist", cortar(obra.artista, 60));
      dados.append("year", obra.ano && obra.ano >= 1000 && obra.ano <= 2100 ? String(obra.ano) : "");
      dados.append("note", cortar(obra.nota, 300));
      dados.append("image", new Blob([obra.imagem], { type: "image/jpeg" }), `${fonte}-${id}.jpg`);
      const r = await fetch(`${API}/api/images`, { method: "POST", body: dados });
      if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`);
      enviadas++;
      await dormir(obra.espera);
    } catch (erro) {
      falhas.push(`${fonte} ${id}: ${erro.message}`);
    }
  }

  console.log(`\n${enviadas} obras enviadas.`);
  if (falhas.length) console.log(`Ignoradas (${falhas.length}):\n  - ${falhas.join("\n  - ")}`);
}

main().catch((erro) => {
  console.error("\nFalha:", erro.message);
  process.exit(1);
});
