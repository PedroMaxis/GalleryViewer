import { Link } from "react-router-dom";

const NaoEncontrado = () => (
  <div className="py-24 text-center">
    <p className="rotulo">Erro 404</p>
    <h1 className="mt-2 font-display text-6xl font-light italic">Sala não encontrada</h1>
    <p className="mt-3 text-grafite">Esta página não faz parte da exposição.</p>
    <Link to="/" className="btn-primary mt-6">
      Voltar à galeria
    </Link>
  </div>
);

export default NaoEncontrado;
