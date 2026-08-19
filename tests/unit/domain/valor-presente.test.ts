import { describe, expect, it } from "vitest";
import {
  ErroValorPresente,
  taxaAnualParaDiaria,
  valorPresente,
  valorPresenteDeFluxo,
} from "@/features/simulacao/domain/valor-presente";
import { dec } from "@/lib/money";

describe("taxaAnualParaDiaria", () => {
  it("converte de forma composta, nao linear", () => {
    const diaria = taxaAnualParaDiaria(dec("0.12"));
    // Linear seria 0.12/365 = 0.000328767. A composta e menor.
    // Composta: e^(ln(1.12)/365) - 1 = 0.00031053780...
    expect(diaria.toNumber()).toBeLessThan(0.12 / 365);
    expect(diaria.toNumber()).toBeCloseTo(0.00031054, 8);
  });

  it("volta a taxa anual quando elevada a 365", () => {
    const diaria = taxaAnualParaDiaria(dec("0.12"));
    expect(diaria.plus(1).pow(365).toNumber()).toBeCloseTo(1.12, 10);
  });

  it("taxa anual zero produz taxa diaria zero", () => {
    expect(taxaAnualParaDiaria(dec(0)).isZero()).toBe(true);
  });

  it("recusa taxa anual menor ou igual a menos um", () => {
    expect(() => taxaAnualParaDiaria(dec("-1"))).toThrow(ErroValorPresente);
  });
});

describe("valorPresente", () => {
  it("desconta 30 dias a 12% ao ano", () => {
    const vp = valorPresente(dec("4960.0128"), taxaAnualParaDiaria(dec("0.12")), 30);
    expect(vp.toNumber()).toBeCloseTo(4914.0263, 2);
  });

  it("inverte de volta ao valor futuro, sem depender de constante conferida a mao", () => {
    const taxa = taxaAnualParaDiaria(dec("0.12"));
    const vp = valorPresente(dec("4960.0128"), taxa, 30);
    const futuro = vp.times(dec(1).plus(taxa).pow(30));
    expect(futuro.toNumber()).toBeCloseTo(4960.0128, 8);
  });

  it("recusa prazo fracionario", () => {
    expect(() => valorPresente(dec(1000), dec(0), 1.5)).toThrow(ErroValorPresente);
  });

  it("prazo zero devolve a propria receita liquida", () => {
    const vp = valorPresente(dec("4960.0128"), taxaAnualParaDiaria(dec("0.12")), 0);
    expect(vp.toString()).toBe("4960.0128");
  });

  it("taxa zero devolve a propria receita liquida", () => {
    const vp = valorPresente(dec("4960.0128"), dec(0), 45);
    expect(vp.toString()).toBe("4960.0128");
  });

  it("desconta mais quanto maior o prazo", () => {
    const taxa = taxaAnualParaDiaria(dec("0.12"));
    const trinta = valorPresente(dec(1000), taxa, 30);
    const noventa = valorPresente(dec(1000), taxa, 90);
    expect(noventa.lessThan(trinta)).toBe(true);
  });

  it("preserva o sinal de receita liquida negativa", () => {
    const vp = valorPresente(dec("-100"), taxaAnualParaDiaria(dec("0.12")), 30);
    expect(vp.isNegative()).toBe(true);
  });

  it("recusa prazo negativo", () => {
    expect(() => valorPresente(dec(1000), dec(0), -1)).toThrow(ErroValorPresente);
  });
});

describe("valorPresenteDeFluxo", () => {
  it("trata prazo unico como fluxo de uma parcela de 100%", () => {
    const taxa = taxaAnualParaDiaria(dec("0.12"));
    const fluxo = valorPresenteDeFluxo(dec("4960.0128"), taxa, [{ dias: 30, percentual: dec(1) }]);
    const simples = valorPresente(dec("4960.0128"), taxa, 30);
    expect(fluxo.toString()).toBe(simples.toString());
  });

  it("desconta cada parcela pelo seu proprio prazo", () => {
    const taxa = taxaAnualParaDiaria(dec("0.12"));
    const fluxo = valorPresenteDeFluxo(dec(1000), taxa, [
      { dias: 0, percentual: dec("0.5") },
      { dias: 60, percentual: dec("0.5") },
    ]);
    const mediaDosPrazos = valorPresente(dec(1000), taxa, 30);
    // A media dos prazos nao equivale ao VPL do fluxo. Esse e o erro que o produto evita.
    expect(fluxo.toString()).not.toBe(mediaDosPrazos.toString());
    expect(fluxo.greaterThan(mediaDosPrazos)).toBe(true);
  });

  it("recusa fluxo cujo percentual nao soma 100%", () => {
    expect(() =>
      valorPresenteDeFluxo(dec(1000), dec(0), [{ dias: 30, percentual: dec("0.9") }]),
    ).toThrow(ErroValorPresente);
  });

  it("recusa fluxo vazio", () => {
    expect(() => valorPresenteDeFluxo(dec(1000), dec(0), [])).toThrow(ErroValorPresente);
  });
});
