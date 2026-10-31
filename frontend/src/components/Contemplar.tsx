import { useEffect, useRef, useState } from "react";
import { atualizarImagem, excluirImagem, urlApi, ErroApi, type Imagem } from "@/lib/api";
import { formatarBytes, tempoRelativo } from "@/lib/formato";
import { numeroQuadro } from "@/lib/marcas";
import { ARTISTA_MAXIMO, NOTA_MAXIMA, TITULO_MAXIMO, lerAno } from "@/lib/validar";
import { useToast } from "@/lib/toast-context";

interface Props {
  imagens: Imagem[];
  indice: number;
  marcada: boolean;
  onMarcar: () => void;
  onMudarIndice: (indice: number) => void;
  onFechar: () => void;
  onAtualizada: (imagem: Imagem) => void;
  onExcluida: (id: number) => void;
}

const ESTILOS = ["moldura-preta", "moldura-madeira", "moldura-dourada", "moldura-branca"] as const;

/** Visão ampliada: a obra emoldurada na parede, com a etiqueta completa ao lado */
const Contemplar = ({ imagens, indice, marcada, onMarcar, onMudarIndice, onFechar, onAtualizada, onExcluida }: Props) => {
  const ref = useRef<HTMLDialogElement>(null);
  const { mostrar } = useToast();
  const imagem = imagens[indice];
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [titulo, setTitulo] = useState(imagem.title);
  const [artista, setArtista] = useState(imagem.artist);
  const [ano, setAno] = useState(imagem.year === null ? "" : String(imagem.year));
  const [nota, setNota] = useState(imagem.note);

  useEffect(() => {
    const dialogo = ref.current;
    if (dialogo && !dialogo.open) dialogo.showModal();
  }, []);

  useEffect(() => {
    setEditando(false);
    setConfirmando(false);
    setTitulo(imagem.title);
    setArtista(imagem.artist);
    setAno(imagem.year === null ? "" : String(imagem.year));
    setNota(imagem.note);
  }, [imagem]);

  const anterior = () => indice > 0 && onMudarIndice(indice - 1);
  const proxima = () => indice < imagens.length - 1 && onMudarIndice(indice + 1);

  const aoTeclar = (e: React.KeyboardEvent) => {
    const alvo = (e.target as HTMLElement).tagName;
    if (editando || alvo === "INPUT" || alvo === "TEXTAREA") return;
    if (e.key === "ArrowLeft") anterior();
    if (e.key === "ArrowRight") proxima();
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const anoLido = lerAno(ano);
    if (!titulo.trim()) return mostrar("Dê um título à obra.", "erro");
    if (anoLido === undefined) return mostrar("O ano deve ser um número entre 1000 e 2100.", "erro");
    setOcupado(true);
    try {
      onAtualizada(await atualizarImagem(imagem.id, { title: titulo, artist: artista, year: anoLido, note: nota }));
      mostrar("Etiqueta atualizada", "sucesso");
    } catch (erro) {
      mostrar(erro instanceof ErroApi ? erro.message : "Não foi possível salvar.", "erro");
    } finally {
      setOcupado(false);
    }
  };

  const excluir = async () => {
    setOcupado(true);
    try {
      await excluirImagem(imagem.id);
      mostrar("Obra retirada da exposição", "info");
      onExcluida(imagem.id);
    } catch (erro) {
      mostrar(erro instanceof ErroApi ? erro.message : "Não foi possível excluir.", "erro");
      setOcupado(false);
    }
  };

  const seta = "absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-tinta/20 bg-gesso/80 text-2xl leading-none backdrop-blur transition hover:bg-gesso md:flex";

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      onKeyDown={aoTeclar}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-label={imagem.title}
      className="m-auto h-[min(92vh,60rem)] w-[min(96vw,84rem)] max-w-none overflow-hidden bg-parede p-0 text-tinta shadow-2xl"
      style={{ backgroundImage: "radial-gradient(900px 420px at 40% -10%, rgba(255,251,238,1), transparent 70%)" }}
    >
      <div className="grid h-full grid-cols-1 overflow-y-auto md:grid-cols-[1fr_21rem] md:overflow-hidden">
        <div className="relative flex min-h-[18rem] items-center justify-center p-6 sm:p-10">
          <span className={`moldura ajustada ${ESTILOS[imagem.id % ESTILOS.length]}`}>
            <span className="passe">
              <img src={urlApi(imagem.url)} alt={imagem.title} />
            </span>
          </span>
          {indice > 0 && (
            <button type="button" onClick={anterior} aria-label="Obra anterior" className={`${seta} left-3`}>
              ‹
            </button>
          )}
          {indice < imagens.length - 1 && (
            <button type="button" onClick={proxima} aria-label="Próxima obra" className={`${seta} right-3`}>
              ›
            </button>
          )}
        </div>

        <aside className="flex flex-col gap-4 border-t border-tinta/10 p-6 md:overflow-y-auto md:border-l md:border-t-0">
          <div className="flex items-start justify-between gap-3">
            <p className="rotulo">
              Obra nº {numeroQuadro(imagem.id)} · {indice + 1}/{imagens.length}
            </p>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Fechar" className="-mr-2 -mt-2 p-2 text-lg leading-none text-grafite hover:text-tinta">
              ✕
            </button>
          </div>

          {editando ? (
            <form onSubmit={salvar} className="flex flex-col gap-4">
              <label className="block">
                <span className="rotulo">Título</span>
                <input className="campo font-display text-xl italic" value={titulo} maxLength={TITULO_MAXIMO} onChange={(e) => setTitulo(e.target.value)} autoFocus />
              </label>
              <label className="block">
                <span className="rotulo">Artista</span>
                <input className="campo" value={artista} maxLength={ARTISTA_MAXIMO} onChange={(e) => setArtista(e.target.value)} />
              </label>
              <label className="block">
                <span className="rotulo">Ano</span>
                <input className="campo" inputMode="numeric" value={ano} onChange={(e) => setAno(e.target.value)} placeholder="ex.: 1998" />
              </label>
              <label className="block">
                <span className="rotulo">Nota</span>
                <textarea className="campo min-h-24 resize-y" value={nota} maxLength={NOTA_MAXIMA} onChange={(e) => setNota(e.target.value)} />
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={ocupado} className="btn-primary">Salvar</button>
                <button type="button" onClick={() => setEditando(false)} className="btn-ghost">Cancelar</button>
              </div>
            </form>
          ) : (
            <>
              <div>
                <h2 className="font-display text-3xl font-medium italic leading-tight">{imagem.title}</h2>
                <p className="mt-1 text-sm text-grafite">
                  {imagem.artist || <span className="italic">Autoria não informada</span>}
                  {imagem.year ? `, ${imagem.year}` : ""}
                </p>
              </div>
              {imagem.note && <p className="whitespace-pre-line border-l-2 border-ponto pl-3 font-display text-[15px] leading-relaxed">{imagem.note}</p>}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[11px] text-grafite">
                <dt>Dimensões</dt>
                <dd className="text-tinta">{imagem.width} × {imagem.height} px</dd>
                <dt>Arquivo</dt>
                <dd className="text-tinta">{formatarBytes(imagem.bytes)}</dd>
                <dt>Exposta</dt>
                <dd className="text-tinta">{tempoRelativo(imagem.createdAt)}</dd>
              </dl>
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <button type="button" onClick={onMarcar} aria-pressed={marcada} className="btn-ghost justify-start">
                  <span className="ponto !mt-0" aria-pressed={marcada} aria-hidden="true" />
                  {marcada ? "Na sua coleção" : "Colecionar"}
                </button>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditando(true)} className="btn-ghost">Editar etiqueta</button>
                  <a href={urlApi(`${imagem.url}${imagem.url.includes("?") ? "&" : "?"}download`)} className="btn-ghost">Baixar</a>
                </div>
                {confirmando ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={excluir} disabled={ocupado} className="btn bg-ponto text-white hover:brightness-110">Confirmar retirada</button>
                    <button type="button" onClick={() => setConfirmando(false)} className="btn-ghost">Voltar</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmando(true)} className="self-start px-1 text-sm text-ponto underline-offset-4 hover:underline">
                    Retirar da exposição
                  </button>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </dialog>
  );
};

export default Contemplar;
