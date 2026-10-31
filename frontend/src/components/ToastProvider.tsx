import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ToastContext, type TipoToast } from "@/lib/toast-context";

interface Item {
  id: number;
  mensagem: string;
  tipo: TipoToast;
}

const ESTILO: Record<TipoToast, string> = {
  sucesso: "bg-emerald-600 text-white",
  erro: "bg-red-600 text-white",
  info: "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900",
};

const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [itens, setItens] = useState<Item[]>([]);

  const mostrar = useCallback((mensagem: string, tipo: TipoToast = "info") => {
    const id = Date.now() + Math.random();
    setItens((atual) => [...atual, { id, mensagem, tipo }]);
    window.setTimeout(() => setItens((atual) => atual.filter((i) => i.id !== id)), 4500);
  }, []);

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {itens.map((t) => (
          <div key={t.id} role={t.tipo === "erro" ? "alert" : "status"} className={`pointer-events-auto rounded-xl px-4 py-2.5 text-sm shadow-xl ${ESTILO[t.tipo]}`}>
            {t.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
