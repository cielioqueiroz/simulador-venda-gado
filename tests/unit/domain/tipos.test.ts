import { describe, expect, it } from "vitest";
import { AJUSTE_MODOS, AJUSTE_TIPOS, FRETE_MODOS } from "@/features/simulacao/domain/tipos";

describe("listas de valores do dominio", () => {
  it("tem exatamente os tres modos de frete da spec", () => {
    expect([...FRETE_MODOS]).toEqual(["por_cabeca", "por_km", "isento"]);
  });

  it("separa bonificacao, desconto de qualidade e outra deducao", () => {
    expect([...AJUSTE_TIPOS]).toEqual(["bonificacao", "desconto_qualidade", "outra_deducao"]);
  });

  it("tem os tres modos de ajuste da spec", () => {
    expect([...AJUSTE_MODOS]).toEqual(["percentual", "valor_por_cabeca", "valor_por_arroba"]);
  });
});
