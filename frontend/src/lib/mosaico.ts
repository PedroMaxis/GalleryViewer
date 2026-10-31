/* Layout do mosaico: encaixa imagens de proporções diferentes em linhas que preenchem a tela por inteiro. */

export interface Linha {
  /** índices das imagens (na ordem recebida) que ficam nesta linha */
  indices: number[];
  /** altura em px, já ajustada para a parede preencher a altura da tela */
  altura: number;
}

export interface Parede {
  linhas: Linha[];
  /** quanto as alturas foram esticadas/encolhidas (1 = sem distorção; perto de 1 = quase nenhum corte) */
  escala: number;
}

/**
 * Divide `valores` em `grupos` pedaços consecutivos cuja soma fique o mais parecida possível
 * (programação dinâmica: minimiza a soma dos quadrados dos desvios da soma ideal).
 */
export const particionar = (valores: readonly number[], grupos: number): number[][] => {
  const n = valores.length;
  const g = Math.min(Math.max(1, grupos), n);
  const prefixo = [0];
  for (const v of valores) prefixo.push(prefixo[prefixo.length - 1] + v);
  const ideal = prefixo[n] / g;
  const custo = (de: number, ate: number) => (prefixo[ate] - prefixo[de] - ideal) ** 2;

  const melhor: number[][] = Array.from({ length: g + 1 }, () => Array<number>(n + 1).fill(Infinity));
  const corte: number[][] = Array.from({ length: g + 1 }, () => Array<number>(n + 1).fill(0));
  melhor[0][0] = 0;
  for (let k = 1; k <= g; k++) {
    for (let i = k; i <= n; i++) {
      for (let j = k - 1; j < i; j++) {
        const c = melhor[k - 1][j] + custo(j, i);
        if (c < melhor[k][i]) {
          melhor[k][i] = c;
          corte[k][i] = j;
        }
      }
    }
  }
  const grupos_: number[][] = [];
  let fim = n;
  for (let k = g; k >= 1; k--) {
    const inicio = corte[k][fim];
    grupos_.unshift(Array.from({ length: fim - inicio }, (_, i) => inicio + i));
    fim = inicio;
  }
  return grupos_;
};

/**
 * Monta uma parede que cobre exatamente `largura` x `altura`: tenta de 1 a `maxLinhas` linhas e fica com a
 * que menos precisa esticar as imagens (escala mais próxima de 1).
 * `aspectos` = largura/altura de cada imagem. `vao` é o espaço entre peças, em px.
 */
export const montarParede = (aspectos: readonly number[], largura: number, altura: number, vao = 2, maxLinhas = 9): Parede => {
  const n = aspectos.length;
  if (n === 0 || largura <= 0 || altura <= 0) return { linhas: [], escala: 1 };

  let melhor: Parede | null = null;
  let melhorCusto = Infinity;

  for (let r = 1; r <= Math.min(n, maxLinhas); r++) {
    const grupos = particionar(aspectos, r);
    // altura natural de cada linha para ocupar a largura inteira
    const naturais = grupos.map((g) => (largura - vao * (g.length - 1)) / g.reduce((s, i) => s + aspectos[i], 0));
    const somaNaturais = naturais.reduce((s, h) => s + h, 0);
    const disponivel = altura - vao * (r - 1);
    const escala = disponivel / somaNaturais;
    const custo = Math.abs(Math.log(escala));
    if (custo < melhorCusto) {
      melhorCusto = custo;
      melhor = { escala, linhas: grupos.map((indices, i) => ({ indices, altura: naturais[i] * escala })) };
    }
  }
  return melhor as Parede;
};

/** Quantas obras cabem numa parede, para as peças ficarem com cerca de `alvo` px de lado */
export const obrasPorParede = (largura: number, altura: number, alvo = 230): number =>
  Math.min(40, Math.max(4, Math.round((largura * altura) / (alvo * alvo))));

/** Reparte `total` obras em paredes de tamanhos parecidos (evita uma última parede quase vazia) */
export const repartirEmParedes = (total: number, porParede: number): number[] => {
  if (total <= 0) return [];
  const paredes = Math.ceil(total / Math.max(1, porParede));
  const base = Math.floor(total / paredes);
  const sobra = total % paredes;
  return Array.from({ length: paredes }, (_, i) => base + (i < sobra ? 1 : 0));
};
