import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const Selo = () => (
  <span className="relative flex h-9 w-9 items-center justify-center bg-tinta" aria-hidden="true">
    <span className="h-6 w-6 bg-gesso p-[3px]">
      <span className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[2px]">
        <span className="row-span-2 bg-dourado" />
        <span className="bg-tinta" />
        <span className="bg-ponto" />
      </span>
    </span>
  </span>
);

const Layout = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  // a luz de ambiente acompanha o cursor
  useEffect(() => {
    const raiz = document.documentElement;
    let quadro = 0;
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        raiz.style.setProperty("--mx", `${e.clientX}px`);
        raiz.style.setProperty("--my", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", mover, { passive: true });
    return () => {
      window.removeEventListener("pointermove", mover);
      cancelAnimationFrame(quadro);
    };
  }, []);

  const inicio = pathname === "/";

  return (
    <div className="flex min-h-screen flex-col">
      <div className="foco-luz" aria-hidden="true" />
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:bg-tinta focus:px-3 focus:py-2 focus:text-gesso">
        Pular para o conteúdo
      </a>
      {/* o cabeçalho flutua sobre o mosaico, em etiquetas de papel */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-4 p-3 sm:p-4">
        <Link to="/" className="placa pointer-events-auto flex items-center gap-3 px-3 py-2 shadow-lg">
          <Selo />
          <span className="font-display text-lg font-medium italic leading-none tracking-tight">Gallery Viewer</span>
        </Link>
        <nav aria-label="Principal" className="pointer-events-auto flex items-center gap-2">
          {!inicio && (
            <Link to="/" className="btn-ghost bg-gesso/90">
              Galeria
            </Link>
          )}
          <Link to="/enviar" className="btn-primary shadow-lg">
            + Expor obra
          </Link>
        </nav>
      </header>
      <main id="conteudo" className={inicio ? "flex-1" : "mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-28 sm:px-8"}>
        <Outlet />
      </main>
      {!inicio && (
        <footer className="mx-auto w-full max-w-6xl px-5 pb-8 font-mono text-[10px] uppercase tracking-[0.2em] text-grafite sm:px-8">
          Gallery Viewer — suas imagens, expostas.
        </footer>
      )}
    </div>
  );
};

export default Layout;
