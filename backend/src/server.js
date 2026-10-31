const path = require("node:path");
const { abrirBanco, migrarLegado } = require("./db");
const { criarApp } = require("./app");

const PORT = Number(process.env.PORT) || 5000;
const ARQUIVO_DB = process.env.DATABASE_FILE || path.join(__dirname, "..", "database.db");
const MAX_MB = Number(process.env.MAX_UPLOAD_MB) || 8;
const ORIGENS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

async function main() {
  const db = abrirBanco(ARQUIVO_DB);
  const migracao = await migrarLegado(db);
  if (migracao.migradas || migracao.ignoradas) {
    console.log(`Banco antigo migrado: ${migracao.migradas} imagens (${migracao.ignoradas} ignoradas).`);
  }

  const app = criarApp({ db, maxBytes: MAX_MB * 1024 * 1024, origensPermitidas: ORIGENS });
  app.listen(PORT, () => console.log(`API da galeria em http://localhost:${PORT}`));
}

main().catch((erro) => {
  console.error("Falha ao iniciar:", erro);
  process.exit(1);
});
