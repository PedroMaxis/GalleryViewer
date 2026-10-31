/**
 * Modo demo (GitHub Pages): não há servidor, então a galeria vive na memória do navegador.
 * O catálogo vem de public/demo/obras.json (obras reais de domínio público, com as imagens carregadas direto
 * dos museus) e as obras enviadas pelo visitante ficam só nesta aba (somem ao recarregar).
 */
import type { Etiqueta, Imagem, Pagina } from "./api";

let catalogo: Promise<Imagem[]> | null = null;
const carregar = (): Promise<Imagem[]> =>
  (catalogo ??= fetch(`${import.meta.env.BASE_URL}demo/obras.json`).then((r) => {
    if (!r.ok) throw new Error("Catálogo do demo indisponível.");
    return r.json() as Promise<Imagem[]>;
  }));

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export async function listarDemo(params: { page?: number; limit?: number; q?: string }): Promise<Pagina> {
  const todas = await carregar();
  const termo = semAcento(params.q?.trim() ?? "");
  const achadas = termo ? todas.filter((o) => semAcento(`${o.title} ${o.artist} ${o.note} ${o.year ?? ""}`).includes(termo)) : todas;
  const limite = Math.min(Math.max(params.limit ?? 24, 1), 60);
  const pages = Math.max(1, Math.ceil(achadas.length / limite));
  const page = Math.min(Math.max(params.page ?? 1, 1), pages);
  return { items: achadas.slice((page - 1) * limite, page * limite), total: achadas.length, page, pages };
}

export async function atualizarDemo(id: number, dados: Partial<Etiqueta>): Promise<Imagem> {
  const obra = (await carregar()).find((o) => o.id === id);
  if (!obra) throw new Error("Obra não encontrada.");
  Object.assign(obra, { ...dados, year: dados.year ?? null });
  return obra;
}

export async function excluirDemo(id: number): Promise<void> {
  const todas = await carregar();
  const i = todas.findIndex((o) => o.id === id);
  if (i >= 0) todas.splice(i, 1);
}

const medir = (url: string) =>
  new Promise<{ width: number; height: number }>((ok, falha) => {
    const img = new Image();
    img.onload = () => ok({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => falha(new Error("Não foi possível ler esta imagem."));
    img.src = url;
  });

export async function enviarDemo(etiqueta: Etiqueta, arquivo: File, onProgresso?: (fracao: number) => void): Promise<Imagem> {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(arquivo.type)) throw new Error("Envie uma imagem JPG, PNG, WebP ou GIF.");
  const todas = await carregar();
  const url = URL.createObjectURL(arquivo);
  const { width, height } = await medir(url);
  onProgresso?.(1);
  const obra: Imagem = { id: Math.max(0, ...todas.map((o) => o.id)) + 1, ...etiqueta, width, height, bytes: arquivo.size, mime: arquivo.type, createdAt: new Date().toISOString(), url, thumbUrl: url };
  todas.unshift(obra);
  return obra;
}
