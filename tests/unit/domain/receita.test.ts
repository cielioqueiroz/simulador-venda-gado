import { describe, expect, it } from "vitest";
import {
  receitaAjustada,
  receitaBruta,
  somaAjustesPorTipo,
  valorDoAjuste,
} from "@/features/simulacao/domain/receita";
import type { Ajuste } from "@/features/simulacao/domain/tipos";
import { dec } from "@/lib/money";

const ctx = { receitaBruta: dec("5111.808"), arrobas: dec("15.9744") };

function ajuste(parcial: Partial<Ajuste>): Ajuste {
  return {
    nome: "teste",
    tipo: "bonificacao",
    modo: "valor_por_cabeca",
    valor: dec(0),
    ...parcial,
  };
}

describe("receitaBruta", () => {
  it("multiplica arrobas pelo preco da arroba", () => {
    expect(receitaBruta(dec("15.9744"), dec(320)).toString()).toBe("5111.808");
  });

  it("devolve zero quando nao ha arrobas", () => {
    expect(receitaBruta(dec(0), dec(320)).toString()).toBe("0");
  });
});

describe("valorDoAjuste", () => {
  it("percentual incide sobre a receita bruta", () => {
    const a = ajuste({ modo: "percentual", valor: dec("0.02") });
    expect(valorDoAjuste(a, ctx).toString()).toBe("102.23616");
  });

  it("valor_por_cabeca entra direto", () => {
    const a = ajuste({ modo: "valor_por_cabeca", valor: dec("30") });
    expect(valorDoAjuste(a, ctx).toString()).toBe("30");
  });

  it("valor_por_arroba multiplica pelas arrobas", () => {
    const a = ajuste({ modo: "valor_por_arroba", valor: dec("5") });
    expect(valorDoAjuste(a, ctx).toString()).toBe("79.872");
  });
});

describe("somaAjustesPorTipo", () => {
  const ajustes: Ajuste[] = [
    ajuste({ nome: "precoce", tipo: "bonificacao", modo: "valor_por_arroba", valor: dec("4") }),
    ajuste({
      nome: "rastreabilidade",
      tipo: "bonificacao",
      modo: "percentual",
      valor: dec("0.01"),
    }),
    ajuste({
      nome: "hematoma",
      tipo: "desconto_qualidade",
      modo: "valor_por_cabeca",
      valor: dec("12"),
    }),
    ajuste({ nome: "balanca", tipo: "outra_deducao", modo: "valor_por_cabeca", valor: dec("3") }),
  ];

  it("soma apenas as bonificacoes", () => {
    expect(somaAjustesPorTipo(ajustes, "bonificacao", ctx).toString()).toBe("115.01568");
  });

  it("soma apenas os descontos de qualidade", () => {
    expect(somaAjustesPorTipo(ajustes, "desconto_qualidade", ctx).toString()).toBe("12");
  });

  it("soma apenas as outras deducoes", () => {
    expect(somaAjustesPorTipo(ajustes, "outra_deducao", ctx).toString()).toBe("3");
  });

  it("devolve zero quando nao ha ajuste do tipo", () => {
    expect(somaAjustesPorTipo([], "bonificacao", ctx).toString()).toBe("0");
  });
});

describe("receitaAjustada", () => {
  it("soma bonificacao e subtrai desconto de qualidade", () => {
    expect(receitaAjustada(dec("5111.808"), dec("100"), dec("40")).toString()).toBe("5171.808");
  });

  it("sem ajustes fica igual a bruta", () => {
    expect(receitaAjustada(dec("5111.808"), dec(0), dec(0)).toString()).toBe("5111.808");
  });
});
