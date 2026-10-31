import { useEffect, useState, type RefObject } from "react";

/** Largura e altura úteis de um elemento (acompanha redimensionamento da janela) */
export const useTamanho = (ref: RefObject<HTMLElement>): { largura: number; altura: number } => {
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const medir = () => setTamanho({ largura: elemento.clientWidth, altura: elemento.clientHeight });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [ref]);

  return tamanho;
};
