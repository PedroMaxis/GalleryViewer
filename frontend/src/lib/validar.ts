export const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
export const TAMANHO_MAXIMO = 8 * 1024 * 1024; // deve acompanhar MAX_UPLOAD_MB do backend (8 MB)
export const TITULO_MAXIMO = 80;
export const ARTISTA_MAXIMO = 60;
export const NOTA_MAXIMA = 300;
export const ANO_MINIMO = 1000;
export const ANO_MAXIMO = 2100;

/** Texto do campo "ano": vazio = sem ano (null); número inteiro válido; qualquer outra coisa = undefined (inválido) */
export const lerAno = (texto: string): number | null | undefined => {
  const limpo = texto.trim();
  if (limpo === "") return null;
  if (!/^\d{1,4}$/.test(limpo)) return undefined;
  const n = Number(limpo);
  return n >= ANO_MINIMO && n <= ANO_MAXIMO ? n : undefined;
};

/** Confere tipo e tamanho antes de enviar (o servidor valida de novo pelos bytes do arquivo). Devolve o erro ou null. */
export const validarArquivo = (arquivo: { type: string; size: number }): string | null => {
  if (!(TIPOS_ACEITOS as readonly string[]).includes(arquivo.type)) return "Formato não suportado. Use JPEG, PNG, GIF ou WebP.";
  if (arquivo.size > TAMANHO_MAXIMO) return `A imagem é grande demais (limite de ${TAMANHO_MAXIMO / 1024 / 1024} MB).`;
  if (arquivo.size === 0) return "O arquivo está vazio.";
  return null;
};

/** "minha-foto_de-ferias.JPG" -> "Minha foto de ferias" (sugestão de título a partir do nome do arquivo) */
export const tituloDoArquivo = (nome: string): string => {
  const base = nome.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  const titulo = base.charAt(0).toUpperCase() + base.slice(1);
  return titulo.slice(0, TITULO_MAXIMO);
};
