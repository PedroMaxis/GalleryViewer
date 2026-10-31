const { DatabaseSync } = require("node:sqlite");
const { processar } = require("./imagens");

/** Abre o banco (SQLite embutido no Node, sem dependências nativas) e garante o esquema */
function abrirBanco(arquivo) {
  const db = new DatabaseSync(arquivo);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      artist      TEXT    NOT NULL DEFAULT '',
      year        INTEGER,
      note        TEXT    NOT NULL DEFAULT '',
      mime        TEXT    NOT NULL,
      width       INTEGER NOT NULL,
      height      INTEGER NOT NULL,
      bytes       INTEGER NOT NULL,
      data        BLOB    NOT NULL,
      thumb       BLOB    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_images_created ON images (id DESC);
  `);
  // bancos criados antes dos campos de artista/ano/nota
  const colunas = new Set(db.prepare("PRAGMA table_info(images)").all().map((c) => c.name));
  if (!colunas.has("artist")) db.exec("ALTER TABLE images ADD COLUMN artist TEXT NOT NULL DEFAULT ''");
  if (!colunas.has("year")) db.exec("ALTER TABLE images ADD COLUMN year INTEGER");
  if (!colunas.has("note")) db.exec("ALTER TABLE images ADD COLUMN note TEXT NOT NULL DEFAULT ''");
  return db;
}

/**
 * Traz as imagens do banco da versão anterior (tabela cad_imagem) para o esquema novo, uma única vez.
 * A tabela antiga é renomeada, não apagada.
 */
async function migrarLegado(db) {
  const antiga = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cad_imagem'").get();
  if (!antiga) return { migradas: 0, ignoradas: 0 };

  const linhas = db.prepare("SELECT img_name, img_data FROM cad_imagem ORDER BY id").all();
  const inserir = db.prepare(
    "INSERT INTO images (title, mime, width, height, bytes, data, thumb) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  let migradas = 0;
  let ignoradas = 0;
  for (const linha of linhas) {
    try {
      const buffer = Buffer.from(linha.img_data);
      const { mime, width, height, miniatura } = await processar(buffer);
      inserir.run(String(linha.img_name || "Sem título").slice(0, 80), mime, width, height, buffer.length, buffer, miniatura);
      migradas++;
    } catch {
      ignoradas++; // dado antigo que não é uma imagem válida
    }
  }
  db.exec("ALTER TABLE cad_imagem RENAME TO cad_imagem_migrada");
  return { migradas, ignoradas };
}

module.exports = { abrirBanco, migrarLegado };
