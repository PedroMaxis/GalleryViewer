import { describe, expect, it } from "vitest";
import { montarParede, obrasPorParede, particionar, repartirEmParedes } from "./mosaico";

const soma = (v: number[]) => v.reduce((a, b) => a + b, 0);

describe("particionar", () => {
  it("mantém a ordem e cobre todos os itens, sem repetir", () => {
    const grupos = particionar([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
    expect(grupos.flat()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(grupos).toHaveLength(3);
  });
  it("equilibra a soma dos grupos", () => {
    const v = [1, 1, 1, 1, 1, 1];
    expect(particionar(v, 2).map((g) => g.length)).toEqual([3, 3]);
    const w = [5, 1, 1, 1, 1, 1, 5];
    const somas = particionar(w, 3).map((g) => soma(g.map((i) => w[i])));
    expect(Math.max(...somas) - Math.min(...somas)).toBeLessThanOrEqual(3);
  });
  it("trata casos limites", () => {
    expect(particionar([2], 5)).toEqual([[0]]);
    expect(particionar([1, 2, 3], 1)).toEqual([[0, 1, 2]]);
    expect(particionar([1, 2, 3], 3)).toEqual([[0], [1], [2]]);
  });
});

describe("montarParede", () => {
  const aspectos = [1.5, 0.75, 1, 1.78, 0.8, 1.2, 1, 0.7, 1.6, 1.1, 0.9, 1.4, 1, 0.66, 1.3, 1.9, 0.85, 1.05, 1.25, 0.78, 1.45, 1, 0.95, 1.6];

  it("preenche exatamente a altura da tela, para qualquer tamanho de janela", () => {
    for (const [w, h] of [[1440, 900], [1920, 1080], [820, 1180], [390, 844], [2560, 1300]]) {
      const parede = montarParede(aspectos, w, h, 2);
      const total = parede.linhas.reduce((s, l) => s + l.altura, 0) + 2 * (parede.linhas.length - 1);
      expect(total).toBeCloseTo(h, 5);
    }
  });

  it("usa todas as obras uma única vez, em ordem", () => {
    const parede = montarParede(aspectos, 1440, 900);
    expect(parede.linhas.flatMap((l) => l.indices)).toEqual(aspectos.map((_, i) => i));
  });

  it("a escala fica perto de 1 (pouco corte) quando a quantidade de obras é adequada ao tamanho", () => {
    const quantas = obrasPorParede(1440, 900);
    const parede = montarParede(aspectos.slice(0, quantas), 1440, 900);
    expect(parede.escala).toBeGreaterThan(0.7);
    expect(parede.escala).toBeLessThan(1.4);
  });

  it("devolve parede vazia para entrada vazia ou tela inválida", () => {
    expect(montarParede([], 1000, 800).linhas).toEqual([]);
    expect(montarParede([1, 1], 0, 800).linhas).toEqual([]);
  });

  it("funciona com uma única obra", () => {
    const p = montarParede([1.5], 1000, 600);
    expect(p.linhas).toHaveLength(1);
    expect(p.linhas[0].altura).toBeCloseTo(600, 5);
  });
});

describe("obrasPorParede e repartirEmParedes", () => {
  it("cresce com a área da tela e respeita os limites", () => {
    expect(obrasPorParede(1440, 900)).toBeGreaterThan(obrasPorParede(390, 844, 160) - 1);
    expect(obrasPorParede(100, 100)).toBe(4);
    expect(obrasPorParede(8000, 8000)).toBe(40);
  });
  it("reparte em paredes de tamanho parecido", () => {
    expect(repartirEmParedes(70, 24)).toEqual([24, 23, 23]);
    expect(repartirEmParedes(25, 24)).toEqual([13, 12]); // em vez de 24 + 1
    expect(repartirEmParedes(10, 24)).toEqual([10]);
    expect(repartirEmParedes(0, 24)).toEqual([]);
    expect(soma(repartirEmParedes(97, 20))).toBe(97);
  });
});
