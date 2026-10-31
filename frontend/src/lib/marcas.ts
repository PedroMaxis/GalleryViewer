import { useCallback, useEffect, useState } from "react";

const CHAVE = "galleryviewer:marcas";

/** Liga/desliga a marca de um quadro, sem alterar o conjunto original */
export const alternarMarca = (marcas: ReadonlySet<number>, id: number): Set<number> => {
  const novo = new Set(marcas);
  if (!novo.delete(id)) novo.add(id);
  return novo;
};

/** "014" para o quadro de id 14 (numeração de folha de contato) */
export const numeroQuadro = (id: number): string => String(id).padStart(3, "0");

const ler = (): Set<number> => {
  try {
    const bruto: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
    return new Set(Array.isArray(bruto) ? bruto.filter((n): n is number => Number.isInteger(n)) : []);
  } catch {
    return new Set();
  }
};

/** Quadros marcados com o "lápis vermelho" (favoritos), guardados neste navegador */
export const useMarcas = () => {
  const [marcas, setMarcas] = useState<Set<number>>(ler);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify([...marcas]));
    } catch {
      /* sem armazenamento: fica só em memória */
    }
  }, [marcas]);

  const alternar = useCallback((id: number) => setMarcas((atual) => alternarMarca(atual, id)), []);
  return { marcas, alternar };
};
