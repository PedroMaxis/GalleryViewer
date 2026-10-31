import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom";

// no demo estático (GitHub Pages) as rotas usam # para não depender de fallback do servidor
const Roteador = import.meta.env.VITE_DEMO ? HashRouter : BrowserRouter;
import Layout from "@/components/Layout";
import ToastProvider from "@/components/ToastProvider";
import Enviar from "@/pages/Enviar";
import Galeria from "@/pages/Galeria";
import NaoEncontrado from "@/pages/NaoEncontrado";

const App = () => (
  <Roteador>
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Galeria />} />
          <Route path="enviar" element={<Enviar />} />
          {/* rota da versão antiga */}
          <Route path="gallery" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NaoEncontrado />} />
        </Route>
      </Routes>
    </ToastProvider>
  </Roteador>
);

export default App;
