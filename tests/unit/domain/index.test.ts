import { describe, expect, it } from "vitest";
import {
  AJUSTE_MODOS,
  AJUSTE_TIPOS,
  aliquotaTotal,
  arrobasPorCabeca,
  calcularFrete,
  calcularOferta,
  calcularTributos,
  FRETE_MODOS,
  pesoCarcaca,
  pesoVivoEfetivo,
  ranquear,
  receitaAjustada,
  receitaBruta,
  regimeVigenteEm,
  somaAjustesPorTipo,
  taxaAnualParaDiaria,
  VERSAO_CALCULO,
  valorDoAjuste,
  valorPresente,
  valorPresenteDeFluxo,
} from "@/features/simulacao/domain";

describe("superficie publica do dominio", () => {
  it("exporta a cadeia de calculo e o comparador", () => {
    expect(typeof calcularOferta).toBe("function");
    expect(typeof ranquear).toBe("function");
    expect(VERSAO_CALCULO).toBe("1.0.0");
  });

  it("exporta as funcoes de cada etapa da cadeia", () => {
    // Os imports nomeados acima ja falham na compilacao se um export sumir.
    // Este caso guarda o outro lado: que cada nome exportado e mesmo uma funcao.
    const etapas = [
      pesoVivoEfetivo,
      pesoCarcaca,
      arrobasPorCabeca,
      receitaBruta,
      valorDoAjuste,
      somaAjustesPorTipo,
      receitaAjustada,
      regimeVigenteEm,
      aliquotaTotal,
      calcularTributos,
      calcularFrete,
      taxaAnualParaDiaria,
      valorPresente,
      valorPresenteDeFluxo,
    ];
    expect(etapas).toHaveLength(14);
    for (const etapa of etapas) {
      expect(typeof etapa).toBe("function");
    }
  });

  it("exporta as listas de valores que o banco e o Zod vao consumir", () => {
    expect([...FRETE_MODOS]).toEqual(["por_cabeca", "por_km", "isento"]);
    expect([...AJUSTE_TIPOS]).toEqual(["bonificacao", "desconto_qualidade", "outra_deducao"]);
    expect([...AJUSTE_MODOS]).toEqual(["percentual", "valor_por_cabeca", "valor_por_arroba"]);
  });
});
