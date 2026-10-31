import { useState } from "react";
import { urlApi, type Imagem } from "@/lib/api";
import { numeroQuadro } from "@/lib/marcas";

interface Props {
  imagem: Imagem;
  indice: number;
  marcada: boolean;
  recemChegada: boolean;
  onAbrir: () => void;
  onMarcar: () => void;
}

/** Uma peça do mosaico em tela cheia: a largura acompanha a proporção da obra */
const Tile = ({ imagem, indice, marcada, recemChegada, onAbrir, onMarcar }: Props) => {
  const [pronta, setPronta] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const proporcao = imagem.width / imagem.height;

  return (
    <div
      className={`group relative h-full min-w-0 overflow-hidden bg-tinta/15 ${recemChegada ? "recem-chegada" : ""}`}
      style={{ flex: `${proporcao} 1 0%` }}
    >
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Contemplar ${imagem.title}`}
        className="absolute inset-0 h-full w-full text-left"
      >
        {falhou ? (
          <span className="flex h-full items-center justify-center p-3 text-center text-xs text-grafite">Imagem indisponível</span>
        ) : (
          <img
            src={urlApi(imagem.thumbUrl)}
            alt={imagem.title}
            width={imagem.width}
            height={imagem.height}
            loading={indice < 12 ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setPronta(true)}
            onError={() => setFalhou(true)}
            style={{ animationDelay: `${Math.min(indice, 24) * 40}ms` }}
            className={`h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07] group-focus-visible:scale-[1.07] ${pronta ? "revelar" : "opacity-0"}`}
          />
        )}
        <span className="pointer-events-none absolute inset-0 bg-tinta/0 transition-colors duration-300 group-hover:bg-tinta/10" />
        {/* etiqueta de museu, que aparece ao passar o mouse */}
        <span className="placa pointer-events-none absolute bottom-3 left-3 right-3 max-w-[18rem] translate-y-2 px-3 py-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <span className="rotulo block">Obra nº {numeroQuadro(imagem.id)}</span>
          <span className="block truncate font-display text-[15px] font-medium italic leading-tight">{imagem.title}</span>
          {(imagem.artist || imagem.year) && (
            <span className="block truncate text-[11px] text-grafite">{[imagem.artist, imagem.year].filter(Boolean).join(", ")}</span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={onMarcar}
        aria-pressed={marcada}
        aria-label={marcada ? `Remover ${imagem.title} da coleção` : `Colecionar ${imagem.title}`}
        title={marcada ? "Na sua coleção" : "Colecionar"}
        className={`ponto absolute right-3 top-3 !h-[18px] !w-[18px] !border-gesso !bg-gesso/30 backdrop-blur-sm transition-opacity ${marcada ? "opacity-100" : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100"}`}
      />
    </div>
  );
};

export default Tile;
