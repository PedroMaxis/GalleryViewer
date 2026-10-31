import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import Contemplar from "@/components/Contemplar";
import Parede from "@/components/Parede";
import { listarTodas, type Imagem } from "@/lib/api";
import { useMarcas } from "@/lib/marcas";
import { montarParede, obrasPorParede, repartirEmParedes } from "@/lib/mosaico";
import { useTamanho } from "@/lib/useTamanho";

const ASPECTOS_ESQUELETO = [1.5, 0.75, 1, 1.8, 0.8, 1.2, 1, 0.7, 1.6, 1.1, 0.9, 1.4, 1, 0.66, 1.3, 1.9, 0.85, 1.05, 1.25, 0.78];

/** Mosaico de carregamento: já cobre a tela toda, só que em peças pulsantes */
const Esqueleto = ({ largura, altura }: { largura: number; altura: number }) => {
  const parede = montarParede(ASPECTOS_ESQUELETO.slice(0, obrasPorParede(largura, altura)), largura, altura, 2);
  return (
    <div className="flex flex-col" style={{ height: altura, gap: 2 }} role="status" aria-label="Montando a exposição">
      {parede.linhas.map((l) => (
        <div key={l.indices[0]} className="flex" style={{ height: l.altura, gap: 2 }}>
          {l.indices.map((i) => (
            <div key={i} className="min-w-0 animate-pulse bg-tinta/10" style={{ flex: `${ASPECTOS_ESQUELETO[i]} 1 0%` }} />
          ))}
        </div>
      ))}
    </div>
  );
};

const Galeria = () => {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const novoId = (location.state as { novoId?: number } | null)?.novoId;
  const consulta = params.get("q") ?? "";
  const soColecao = params.get("colecao") === "1";

  const rolagem = useRef<HTMLDivElement>(null);
  const { largura, altura } = useTamanho(rolagem);
  const [busca, setBusca] = useState(consulta);
  const [itens, setItens] = useState<Imagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [aberta, setAberta] = useState<number | null>(null);
  const [parede, setParede] = useState(0);
  const { marcas, alternar } = useMarcas();

  // busca com atraso (debounce), refletida na URL
  useEffect(() => {
    const t = window.setTimeout(() => {
      setParams(
        (atual) => {
          const novo = new URLSearchParams(atual);
          if (busca.trim()) novo.set("q", busca.trim());
          else novo.delete("q");
          return novo;
        },
        { replace: true }
      );
    }, 300);
    return () => window.clearTimeout(t);
  }, [busca, setParams]);

  useEffect(() => {
    const controle = new AbortController();
    setCarregando(true);
    setErro(null);
    listarTodas(consulta, controle.signal)
      .then((lista) => {
        setItens(lista);
        setCarregando(false);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setErro(e instanceof Error ? e.message : "Erro desconhecido");
        setCarregando(false);
      });
    return () => controle.abort();
  }, [consulta, tentativa]);

  const visiveis = useMemo(() => (soColecao ? itens.filter((i) => marcas.has(i.id)) : itens), [itens, marcas, soColecao]);

  // divide as obras em paredes que ocupam uma tela cada
  const paredes = useMemo(() => {
    if (!largura || !altura) return [];
    const alvo = largura < 640 ? 150 : 230;
    const tamanhos = repartirEmParedes(visiveis.length, obrasPorParede(largura, altura, alvo));
    let inicio = 0;
    return tamanhos.map((n) => {
      const fatia = { inicio, imagens: visiveis.slice(inicio, inicio + n) };
      inicio += n;
      return fatia;
    });
  }, [visiveis, largura, altura]);

  const indiceAberta = aberta === null ? -1 : visiveis.findIndex((i) => i.id === aberta);

  const irParaParede = (i: number) => {
    const destino = Math.min(Math.max(0, i), Math.max(0, paredes.length - 1));
    rolagem.current?.scrollTo({ top: destino * altura, behavior: "smooth" });
  };

  // teclas ↑ ↓ passam de parede (quando nada está aberto nem sendo digitado)
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (aberta !== null || (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); irParaParede(parede + 1); }
      if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); irParaParede(parede - 1); }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  });

  const alternarColecao = () =>
    setParams((atual) => {
      const novo = new URLSearchParams(atual);
      if (soColecao) novo.delete("colecao");
      else novo.set("colecao", "1");
      return novo;
    }, { replace: true });

  const vazio = !carregando && !erro && visiveis.length === 0;

  return (
    <>
      <div
        ref={rolagem}
        onScroll={(e) => altura && setParede(Math.round(e.currentTarget.scrollTop / altura))}
        className="fixed inset-0 snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth"
      >
        {largura > 0 && carregando && <Esqueleto largura={largura} altura={altura} />}

        {paredes.map((p) => (
          <Parede
            key={p.inicio}
            imagens={p.imagens}
            largura={largura}
            altura={altura}
            inicio={p.inicio}
            marcas={marcas}
            novoId={novoId}
            onAbrir={setAberta}
            onMarcar={alternar}
          />
        ))}

        {(erro || vazio) && (
          <div className="flex items-center justify-center p-6" style={{ height: altura }}>
            {erro ? (
              <div role="alert" className="placa max-w-lg p-8 text-center">
                <p className="font-display text-2xl italic">A exposição não pôde ser montada</p>
                <p className="mt-2 text-sm text-grafite">{erro}</p>
                <button type="button" onClick={() => setTentativa((n) => n + 1)} className="btn-primary mt-5">Tentar de novo</button>
              </div>
            ) : (
              <div className="max-w-xl text-center">
                <p className="font-display text-5xl font-light italic">
                  {soColecao && itens.length > 0 ? "Sua coleção está vazia" : consulta ? "Nenhuma obra encontrada" : "A parede está vazia"}
                </p>
                <p className="mt-3 text-grafite">
                  {soColecao && itens.length > 0
                    ? "Passe o mouse sobre uma obra e toque no ponto para colecioná-la."
                    : consulta
                      ? "Tente outro título ou o nome de um artista."
                      : "Exponha a primeira imagem e veja o mosaico se formar."}
                </p>
                {!consulta && !soColecao && <Link to="/enviar" className="btn-primary mt-6">+ Expor a primeira obra</Link>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* barra flutuante: busca, coleção e passagem entre paredes */}
      <div className="fixed bottom-3 left-1/2 z-40 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-tinta/15 bg-gesso/95 px-4 py-2 shadow-xl backdrop-blur sm:bottom-5">
        <label className="flex items-center gap-2">
          <span className="rotulo hidden sm:inline">Buscar</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="título ou artista"
            aria-label="Buscar obras por título ou artista"
            className="w-32 border-0 border-b border-tinta/25 bg-transparent px-0 py-1 text-sm placeholder:text-tinta/35 focus:border-tinta focus:outline-none focus:ring-0 sm:w-48"
          />
        </label>
        <button
          type="button"
          onClick={alternarColecao}
          aria-pressed={soColecao}
          className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${soColecao ? "bg-tinta text-gesso" : "hover:bg-tinta/5"}`}
        >
          <span className="ponto !mt-0 !h-3 !w-3" aria-pressed="true" aria-hidden="true" />
          <span className="hidden sm:inline">Coleção</span> ({marcas.size})
        </button>
        {paredes.length > 0 && (
          <div className="flex items-center gap-2 border-l border-tinta/15 pl-3" aria-label="Paredes da exposição">
            <span className="rotulo hidden whitespace-nowrap sm:inline" aria-live="polite">
              {visiveis.length} {visiveis.length === 1 ? "obra" : "obras"}
            </span>
            {paredes.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => irParaParede(i)}
                aria-label={`Ir para a parede ${i + 1} de ${paredes.length}`}
                aria-current={i === parede ? "true" : undefined}
                className={`h-2.5 rounded-full transition-all ${i === parede ? "w-6 bg-ponto" : "w-2.5 bg-tinta/25 hover:bg-tinta/50"}`}
              />
            ))}
          </div>
        )}
      </div>

      {indiceAberta >= 0 && (
        <Contemplar
          imagens={visiveis}
          indice={indiceAberta}
          marcada={marcas.has(visiveis[indiceAberta].id)}
          onMarcar={() => alternar(visiveis[indiceAberta].id)}
          onMudarIndice={(i) => setAberta(visiveis[i].id)}
          onFechar={() => setAberta(null)}
          onAtualizada={(nova) => setItens((atual) => atual.map((i) => (i.id === nova.id ? nova : i)))}
          onExcluida={(id) => {
            setItens((atual) => atual.filter((i) => i.id !== id));
            setAberta(null);
          }}
        />
      )}
    </>
  );
};

export default Galeria;
