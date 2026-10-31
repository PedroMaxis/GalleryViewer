export interface Imagem {
  id: number;
  title: string;
  artist: string;
  year: number | null;
  note: string;
  width: number;
  height: number;
  bytes: number;
  mime: string;
  createdAt: string;
  url: string;
  thumbUrl: string;
}

export interface Pagina {
  items: Imagem[];
  total: number;
  page: number;
  pages: number;
}

// Em produção, VITE_API_URL aponta para o domínio da API; em desenvolvimento fica vazio (proxy do Vite).
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export const urlApi = (caminho: string): string => `${BASE}${caminho}`;

export class ErroApi extends Error {
  constructor(
    mensagem: string,
    readonly status: number
  ) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

const erroDe = async (resposta: Response): Promise<ErroApi> => {
  let mensagem = `Erro ${resposta.status}`;
  try {
    const corpo = (await resposta.json()) as { error?: string };
    if (corpo.error) mensagem = corpo.error;
  } catch {
    /* corpo sem JSON */
  }
  return new ErroApi(mensagem, resposta.status);
};

const pedir = async <T>(caminho: string, init?: RequestInit): Promise<T> => {
  let resposta: Response;
  try {
    resposta = await fetch(urlApi(caminho), init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ErroApi("Não foi possível falar com o servidor. Ele pode estar iniciando; tente de novo em instantes.", 0);
  }
  if (!resposta.ok) throw await erroDe(resposta);
  return resposta.status === 204 ? (undefined as T) : ((await resposta.json()) as T);
};

export const montarConsulta = (params: { page?: number; limit?: number; q?: string }): string => {
  const busca = new URLSearchParams();
  if (params.page && params.page > 1) busca.set("page", String(params.page));
  if (params.limit) busca.set("limit", String(params.limit));
  if (params.q?.trim()) busca.set("q", params.q.trim());
  const texto = busca.toString();
  return texto ? `?${texto}` : "";
};

export const listarImagens = (params: { page?: number; limit?: number; q?: string }, sinal?: AbortSignal): Promise<Pagina> =>
  pedir<Pagina>(`/api/images${montarConsulta(params)}`, { signal: sinal });

/** Dados da etiqueta da obra */
export interface Etiqueta {
  title: string;
  artist: string;
  year: number | null;
  note: string;
}

export const atualizarImagem = (id: number, dados: Partial<Etiqueta>): Promise<Imagem> =>
  pedir<Imagem>(`/api/images/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...dados, year: dados.year === undefined ? undefined : (dados.year ?? "") }),
  });

export const excluirImagem = (id: number): Promise<void> => pedir<void>(`/api/images/${id}`, { method: "DELETE" });

/** Envia com XMLHttpRequest para ter o progresso do upload (o fetch ainda não expõe isso) */
export const enviarImagem = (etiqueta: Etiqueta, arquivo: File, onProgresso?: (fracao: number) => void): Promise<Imagem> =>
  new Promise((resolve, reject) => {
    const dados = new FormData();
    dados.append("title", etiqueta.title);
    dados.append("artist", etiqueta.artist);
    dados.append("year", etiqueta.year === null ? "" : String(etiqueta.year));
    dados.append("note", etiqueta.note);
    dados.append("image", arquivo);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", urlApi("/api/images"));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgresso?.(e.loaded / e.total);
    xhr.onerror = () => reject(new ErroApi("Não foi possível falar com o servidor. Verifique sua conexão.", 0));
    xhr.onload = () => {
      let corpo: unknown = null;
      try {
        corpo = JSON.parse(xhr.responseText);
      } catch {
        /* sem JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(corpo as Imagem);
      else reject(new ErroApi((corpo as { error?: string } | null)?.error ?? `Erro ${xhr.status}`, xhr.status));
    };
    xhr.send(dados);
  });

/** Busca todas as obras (a API pagina em até 60 por vez); o mosaico precisa do conjunto inteiro para montar as paredes */
export const listarTodas = async (q: string, sinal?: AbortSignal): Promise<Imagem[]> => {
  const todas: Imagem[] = [];
  for (let pagina = 1; pagina <= 20; pagina++) {
    const r = await listarImagens({ q, limit: 60, page: pagina }, sinal);
    todas.push(...r.items);
    if (pagina >= r.pages) break;
  }
  return todas;
};
