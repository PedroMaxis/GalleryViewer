import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { enviarImagem, ErroApi } from "@/lib/api";
import { formatarBytes } from "@/lib/formato";
import { useToast } from "@/lib/toast-context";
import { ARTISTA_MAXIMO, NOTA_MAXIMA, TITULO_MAXIMO, lerAno, tituloDoArquivo, validarArquivo } from "@/lib/validar";

const Enviar = () => {
  const navegar = useNavigate();
  const { mostrar } = useToast();
  const entrada = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [artista, setArtista] = useState("");
  const [ano, setAno] = useState("");
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [progresso, setProgresso] = useState<number | null>(null);

  useEffect(() => {
    if (!arquivo) return setPrevia(null);
    const url = URL.createObjectURL(arquivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const escolher = (novo: File | undefined) => {
    if (!novo) return;
    const problema = validarArquivo(novo);
    setErro(problema);
    if (problema) return setArquivo(null);
    setArquivo(novo);
    setTitulo((atual) => atual || tituloDoArquivo(novo.name));
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) return setErro("Escolha uma imagem para expor.");
    const anoLido = lerAno(ano);
    if (!titulo.trim()) return setErro("Dê um título à obra.");
    if (anoLido === undefined) return setErro("O ano deve ser um número entre 1000 e 2100.");
    setErro(null);
    setProgresso(0);
    try {
      const obra = await enviarImagem({ title: titulo, artist: artista, year: anoLido, note: nota }, arquivo, setProgresso);
      mostrar(`“${obra.title}” foi pendurada na parede`, "sucesso");
      navegar("/", { state: { novoId: obra.id } });
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível enviar a imagem.");
      setProgresso(null);
    }
  };

  const enviando = progresso !== null;

  return (
    <form onSubmit={enviar} className="mx-auto grid max-w-5xl gap-10 pt-4 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <p className="rotulo">Nova obra</p>
        <h1 className="mb-6 font-display text-5xl font-light italic leading-none sm:text-6xl">Expor uma obra</h1>

        <div
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastando(false); escolher(e.dataTransfer.files[0]); }}
          className={`relative flex min-h-[22rem] items-center justify-center border-2 border-dashed p-6 transition-colors ${arrastando ? "border-ponto bg-ponto/5" : "border-tinta/25"}`}
        >
          {previa ? (
            <span className="moldura ajustada moldura-preta pendurar">
              <span className="passe">
                <img src={previa} alt="Prévia da obra" />
              </span>
            </span>
          ) : (
            <div className="text-center">
              <p className="font-display text-2xl font-light italic">Solte a imagem aqui</p>
              <p className="mt-1 text-sm text-grafite">JPEG, PNG, GIF ou WebP · até 8 MB</p>
            </div>
          )}
          <button type="button" onClick={() => entrada.current?.click()} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Escolher imagem do computador" />
          <input ref={entrada} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} />
        </div>
        {arquivo && (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-grafite">
            {arquivo.name} · {formatarBytes(arquivo.size)} ·{" "}
            <button type="button" onClick={() => entrada.current?.click()} className="underline underline-offset-4 hover:text-tinta">trocar</button>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-5 lg:pt-14">
        <p className="rotulo">Etiqueta da obra</p>
        <label className="block">
          <span className="rotulo">Título *</span>
          <input className="campo font-display text-2xl italic" value={titulo} maxLength={TITULO_MAXIMO} onChange={(e) => setTitulo(e.target.value)} placeholder="Sem título" required />
        </label>
        <div className="grid grid-cols-[1fr_6.5rem] gap-4">
          <label className="block">
            <span className="rotulo">Artista</span>
            <input className="campo" value={artista} maxLength={ARTISTA_MAXIMO} onChange={(e) => setArtista(e.target.value)} />
          </label>
          <label className="block">
            <span className="rotulo">Ano</span>
            <input className="campo" inputMode="numeric" value={ano} onChange={(e) => setAno(e.target.value)} placeholder="2024" />
          </label>
        </div>
        <label className="block">
          <span className="rotulo">Nota <span className="text-grafite/60">({nota.length}/{NOTA_MAXIMA})</span></span>
          <textarea className="campo min-h-24 resize-y" value={nota} maxLength={NOTA_MAXIMA} onChange={(e) => setNota(e.target.value)} placeholder="Técnica, história, o que você quiser contar…" />
        </label>

        {erro && <p role="alert" className="border-l-2 border-ponto pl-3 text-sm text-ponto">{erro}</p>}

        {enviando && (
          <div role="progressbar" aria-valuenow={Math.round((progresso ?? 0) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Envio" className="h-0.5 w-full bg-tinta/10">
            <div className="h-full bg-ponto transition-all" style={{ width: `${(progresso ?? 0) * 100}%` }} />
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={enviando || !arquivo} className="btn-primary">
            {enviando ? `Pendurando… ${Math.round((progresso ?? 0) * 100)}%` : "Pendurar na parede"}
          </button>
          <Link to="/" className="btn-ghost">Cancelar</Link>
        </div>
      </div>
    </form>
  );
};

export default Enviar;
