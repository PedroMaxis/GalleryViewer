import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import ToastProvider from "@/components/ToastProvider";
import Enviar from "@/pages/Enviar";
import Galeria from "@/pages/Galeria";
import NaoEncontrado from "@/pages/NaoEncontrado";

const App = () => (
  <BrowserRouter>
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
  </BrowserRouter>
);

export default App;
