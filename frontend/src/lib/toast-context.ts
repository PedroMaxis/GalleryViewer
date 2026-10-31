import { createContext, useContext } from "react";

export type TipoToast = "sucesso" | "erro" | "info";

export interface Toasts {
  mostrar: (mensagem: string, tipo?: TipoToast) => void;
}

export const ToastContext = createContext<Toasts>({ mostrar: () => undefined });

export const useToast = (): Toasts => useContext(ToastContext);
