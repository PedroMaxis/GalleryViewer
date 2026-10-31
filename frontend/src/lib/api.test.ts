import { describe, expect, it } from "vitest";
import { formatarBytes, tempoRelativo } from "./formato";
import { montarConsulta } from "./api";
import { lerAno, tituloDoArquivo, validarArquivo, TAMANHO_MAXIMO } from "./validar";
import { alternarMarca, numeroQuadro } from "./marcas";

describe("montarConsulta", () => {
  it("só inclui o que foi informado", () => {
    expect(montarConsulta({})).toBe("");
    expect(montarConsulta({ page: 1 })).toBe("");
    expect(montarConsulta({ page: 3, limit: 24, q: "  praia  " })).toBe("?page=3&limit=24&q=praia");
    expect(montarConsulta({ q: "   " })).toBe("");
  });
  it("codifica a busca", () => {
    expect(montarConsulta({ q: "pôr do sol & mar" })).toBe("?q=p%C3%B4r+do+sol+%26+mar");
  });
});

describe("validarArquivo", () => {
  it("aceita os formatos suportados", () => {
    for (const type of ["image/jpeg", "image/png", "image/gif", "image/webp"]) expect(validarArquivo({ type, size: 1000 })).toBeNull();
  });
  it("recusa outros formatos, arquivos vazios e grandes demais", () => {
    expect(validarArquivo({ type: "application/pdf", size: 1000 })).toMatch(/Formato/);
    expect(validarArquivo({ type: "image/svg+xml", size: 1000 })).toMatch(/Formato/);
    expect(validarArquivo({ type: "image/png", size: 0 })).toMatch(/vazio/);
    expect(validarArquivo({ type: "image/png", size: TAMANHO_MAXIMO + 1 })).toMatch(/grande/);
    expect(validarArquivo({ type: "image/png", size: TAMANHO_MAXIMO })).toBeNull();
  });
});

describe("tituloDoArquivo", () => {
  it("transforma o nome do arquivo em título", () => {
    expect(tituloDoArquivo("minha-foto_de-ferias.JPG")).toBe("Minha foto de ferias");
    expect(tituloDoArquivo("IMG_2024.png")).toBe("IMG 2024");
    expect(tituloDoArquivo("x".repeat(200) + ".png").length).toBe(80);
  });
});

describe("formatação", () => {
  it("bytes", () => {
    expect(formatarBytes(512)).toBe("512 B");
    expect(formatarBytes(2048)).toBe("2 KB");
    expect(formatarBytes(3.5 * 1024 * 1024)).toBe("3,5 MB");
  });
  it("tempo relativo", () => {
    const agora = new Date("2026-10-31T12:00:00Z");
    expect(tempoRelativo("2026-10-31T11:59:40Z", agora)).toBe("agora");
    expect(tempoRelativo("2026-10-31T11:30:00Z", agora)).toBe("há 30 min");
    expect(tempoRelativo("2026-10-31T09:00:00Z", agora)).toBe("há 3 h");
    expect(tempoRelativo("2026-10-30T12:00:00Z", agora)).toBe("há 1 dia");
    expect(tempoRelativo("2026-10-28T12:00:00Z", agora)).toBe("há 3 dias");
    expect(tempoRelativo("lixo", agora)).toBe("");
  });
});

describe("marcas (favoritos)", () => {
  it("liga e desliga sem alterar o conjunto original", () => {
    const original = new Set([1, 2]);
    const com = alternarMarca(original, 3);
    expect([...com].sort()).toEqual([1, 2, 3]);
    expect([...alternarMarca(com, 2)].sort()).toEqual([1, 3]);
    expect([...original]).toEqual([1, 2]);
  });
  it("numeração de quadro", () => {
    expect(numeroQuadro(7)).toBe("007");
    expect(numeroQuadro(1234)).toBe("1234");
  });
});

describe("lerAno", () => {
  it("vazio é sem ano; números válidos passam; o resto é inválido", () => {
    expect(lerAno("")).toBeNull();
    expect(lerAno("  ")).toBeNull();
    expect(lerAno("1998")).toBe(1998);
    expect(lerAno(" 2024 ")).toBe(2024);
    expect(lerAno("999")).toBeUndefined();
    expect(lerAno("2101")).toBeUndefined();
    expect(lerAno("19x8")).toBeUndefined();
    expect(lerAno("1998.5")).toBeUndefined();
    expect(lerAno("-1998")).toBeUndefined();
  });
});
