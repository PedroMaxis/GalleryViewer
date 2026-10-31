import { useMemo } from "react";
import type { Imagem } from "@/lib/api";
import { montarParede } from "@/lib/mosaico";
import Tile from "./Tile";

interface Props {
  imagens: Imagem[];
  largura: number;
  altura: number;
  /** posição da primeira obra desta parede na lista geral (para o atraso da animação) */
  inicio: number;
  marcas: ReadonlySet<number>;
  novoId?: number;
  onAbrir: (id: number) => void;
  onMarcar: (id: number) => void;
}

const VAO = 2;

/** Uma parede: ocupa exatamente uma tela, de ponta a ponta */
const Parede = ({ imagens, largura, altura, inicio, marcas, novoId, onAbrir, onMarcar }: Props) => {
  const parede = useMemo(
    () => montarParede(imagens.map((i) => i.width / i.height), largura, altura, VAO),
    [imagens, largura, altura]
  );

  return (
    <section
      className="flex snap-start snap-always flex-col overflow-hidden bg-parede"
      style={{ height: altura, gap: VAO }}
      aria-label={`Parede com ${imagens.length} obras`}
    >
      {parede.linhas.map((linha) => (
        <div key={linha.indices[0]} className="flex min-h-0" style={{ height: linha.altura, gap: VAO }}>
          {linha.indices.map((i) => (
            <Tile
              key={imagens[i].id}
              imagem={imagens[i]}
              indice={inicio + i}
              marcada={marcas.has(imagens[i].id)}
              recemChegada={imagens[i].id === novoId}
              onAbrir={() => onAbrir(imagens[i].id)}
              onMarcar={() => onMarcar(imagens[i].id)}
            />
          ))}
        </div>
      ))}
    </section>
  );
};

export default Parede;
