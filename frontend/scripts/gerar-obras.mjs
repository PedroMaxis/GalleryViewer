/**
 * Gera public/demo/obras.json: o catálogo do demo estático (GitHub Pages), com obras REAIS CC0 do Cleveland Museum
 * of Art (mesmos IDs do backend/scripts/seed.js). Só guarda metadados e o endereço das imagens; o navegador carrega
 * as imagens direto do museu. As do Art Institute ficam de fora: o IIIF deles recusa carregamento de outros sites.
 * Uso: node scripts/gerar-obras.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const seed = readFileSync(new URL("../../backend/scripts/seed.js", import.meta.url), "utf8");
const lista = (nome) => seed.match(new RegExp(`const ${nome} = \\[([^\\]]+)\\]`))[1].split(",").map((s) => Number(s.trim())).filter(Boolean);
const CMA = lista("CMA");

const IDENTIFICACAO = "GalleryViewer-demo/2.0 (projeto de estudo; pedro11sales14@gmail.com)";
const HEADERS = { "User-Agent": IDENTIFICACAO, "AIC-User-Agent": IDENTIFICACAO };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const cortar = (t, max) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);
const anoDe = (t) => { const m = /\b(1[0-9]{3}|20[0-9]{2})\b/.exec(t ?? ""); return m ? Number(m[1]) : null; };
const json = async (url) => { const r = await fetch(url, { headers: HEADERS }); if (!r.ok) throw new Error(`${r.status} em ${url}`); return r.json(); };

async function doAIC(id) {
  const { data } = await json(`https://api.artic.edu/api/v1/artworks/${id}?fields=id,title,artist_title,date_display,date_end,image_id,is_public_domain,medium_display,thumbnail`);
  if (!data.is_public_domain || !data.image_id || !data.thumbnail?.width) return null;
  const { width: w, height: h } = data.thumbnail;
  const base = `https://www.artic.edu/iiif/2/${data.image_id}/full`;
  return {
    title: data.title, artist: data.artist_title ?? "", year: anoDe(data.date_display) ?? data.date_end,
    note: [data.medium_display, "Art Institute of Chicago · domínio público"].filter(Boolean).join(". "),
    width: 843, height: Math.round((h * 843) / w), url: `${base}/843,/0/default.jpg`, thumbUrl: `${base}/400,/0/default.jpg`, espera: 1200,
  };
}
async function doCMA(id) {
  const { data } = await json(`https://openaccess-api.clevelandart.org/api/artworks/${id}`);
  const web = data.images?.web;
  if (data.share_license_status !== "CC0" || !web?.url) return null;
  const criador = data.creators?.[0]?.description ?? "";
  return {
    title: data.title, artist: criador.replace(/\s*\(.*$/, ""), year: anoDe(data.creation_date),
    note: [data.technique, "Cleveland Museum of Art · CC0"].filter(Boolean).join(". "),
    width: Number(web.width), height: Number(web.height), url: web.url, thumbUrl: web.url, espera: 350,
  };
}
const embaralhar = (l) => { let s = 20261031; const a = () => ((s = (Math.imul(s, 1664525) + 1013904223) | 0) >>> 0) / 4294967296; return l.map((item) => ({ item, o: a() })).sort((x, y) => x.o - y.o).map((x) => x.item); };

const fila = embaralhar(CMA.map((id) => ({ f: "cma", id })));
const obras = [];
for (const [i, { f, id }] of fila.entries()) {
  process.stdout.write(`\r[${i + 1}/${fila.length}] ${f} ${id}   `);
  try {
    const o = await (f === "aic" ? doAIC(id) : doCMA(id));
    if (!o) continue;
    const { espera, ...resto } = o;
    obras.push({ id: obras.length + 1, ...resto, title: cortar(resto.title, 80), artist: cortar(resto.artist, 60), note: cortar(resto.note, 300), bytes: 0, mime: "image/jpeg", createdAt: new Date(Date.UTC(2026, 9, 31, 12) - i * 60000).toISOString() });
    await dormir(espera);
  } catch (e) { console.log(`\n  ignorada ${f} ${id}: ${e.message}`); }
}
// a API devolve as mais novas primeiro
writeFileSync(new URL("../public/demo/obras.json", import.meta.url), JSON.stringify(obras.reverse().map((o, i) => ({ ...o, id: i + 1 })).reverse(), null, 0) + "\n");
console.log(`\n${obras.length} obras gravadas.`);
