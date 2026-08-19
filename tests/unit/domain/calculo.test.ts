import { describe, expect, it } from "vitest";
import { calcularOferta, VERSAO_CALCULO } from "@/features/simulacao/domain/calculo";
import type { Lote, OfertaEntrada, RegimeTributario } from "@/features/simulacao/domain/tipos";
import { dec } from "@/lib/money";

const regimePf: RegimeTributario = {
  id: "pf-receita-bruta",
  nome: "Produtor rural pessoa fisica",
  vigenciaInicio: new Date("2018-01-01T00:00:00Z"),
  vigenciaFim: null,
  componentes: [
    { nome: "Previdenciaria", aliquota: dec("0.012"), base: "receita_bruta" },
    { nome: "RAT", aliquota: dec("0.001"), base: "receita_bruta" },
    { nome: "SENAR", aliquota: dec("0.002"), base: "receita_bruta" },
  ],
};

const lote: Lote = { cabecas: 40, pesoVivoMedioKg: dec(480) };

const oferta: OfertaEntrada = {
  comprador: "Frigorifico A",
  precoArroba: dec(320),
  rendimentoAcordado: dec("0.52"),
  quebraPct: dec("0.04"),
  prazoDias: 30,
  freteModo: "por_km",
  freteValor: dec("4"),
  kmRodados: dec(240),
  comissaoPct: dec("0.01"),
  ajustes: [],
};

describe("calcularOferta: caso de conferencia manual", () => {
  const r = calcularOferta({ lote, oferta, regime: regimePf, taxaDescontoAnual: dec("0.12") });

  it("peso vivo efetivo: 480 * (1 - 0.04)", () => {
    expect(r.pesoVivoEfetivoKg.toString()).toBe("460.8");
  });

  it("peso de carcaca: 460.8 * 0.52", () => {
    expect(r.pesoCarcacaKg.toString()).toBe("239.616");
  });

  it("arrobas: 239.616 / 15", () => {
    expect(r.arrobas.toString()).toBe("15.9744");
  });

  it("receita bruta: 15.9744 * 320", () => {
    expect(r.receitaBruta.toString()).toBe("5111.808");
  });

  it("receita ajustada sem ajustes fica igual a bruta", () => {
    expect(r.receitaAjustada.toString()).toBe("5111.808");
  });

  it("tributos: 5111.808 * 0.015", () => {
    expect(r.tributos.toString()).toBe("76.67712");
  });

  it("frete total: 4.00 * 240", () => {
    expect(r.freteTotal.toString()).toBe("960");
  });

  it("frete por cabeca: 960 / 40", () => {
    expect(r.fretePorCabeca.toString()).toBe("24");
  });

  it("comissao: 5111.808 * 0.01", () => {
    expect(r.comissao.toString()).toBe("51.11808");
  });

  it("receita liquida: 5111.808 - 76.67712 - 24 - 51.11808", () => {
    expect(r.receitaLiquida.toString()).toBe("4960.0128");
  });

  it("valor presente: 4960.0128 / (1 + i)^30, i = 1.12^(1/365) - 1", () => {
    expect(r.valorPresente.toNumber()).toBeCloseTo(4914.0263, 2);
  });

  it("vp por arroba: valor presente / 15.9744", () => {
    expect(r.vpPorArroba.toNumber()).toBeCloseTo(307.6188, 2);
  });

  it("vp total do lote: valor presente * 40", () => {
    expect(r.vpTotalLote.toNumber()).toBeCloseTo(196561.05, 1);
  });

  it("carimba a versao de calculo", () => {
    expect(r.versaoCalculo).toBe(VERSAO_CALCULO);
  });
});

describe("calcularOferta: ajustes e casos de borda", () => {
  it("bonificacao entra na receita ajustada, desconto de qualidade sai", () => {
    const r = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: {
        ...oferta,
        ajustes: [
          { nome: "precoce", tipo: "bonificacao", modo: "valor_por_arroba", valor: dec("4") },
          {
            nome: "hematoma",
            tipo: "desconto_qualidade",
            modo: "valor_por_cabeca",
            valor: dec("12"),
          },
        ],
      },
    });
    // bonificacao 15.9744 * 4 = 63.8976; ajustada = 5111.808 + 63.8976 - 12
    expect(r.bonificacoes.toString()).toBe("63.8976");
    expect(r.descontosQualidade.toString()).toBe("12");
    expect(r.receitaAjustada.toString()).toBe("5163.7056");
  });

  it("bonificacao nao muda o tributo, porque a base e a receita bruta", () => {
    const semBonus = calcularOferta({
      lote,
      oferta,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
    });
    const comBonus = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: {
        ...oferta,
        ajustes: [{ nome: "cota", tipo: "bonificacao", modo: "percentual", valor: dec("0.05") }],
      },
    });
    expect(comBonus.tributos.toString()).toBe(semBonus.tributos.toString());
  });

  it("outra deducao sai depois do tributo, junto com a comissao", () => {
    const r = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: {
        ...oferta,
        ajustes: [
          { nome: "balanca", tipo: "outra_deducao", modo: "valor_por_cabeca", valor: dec("3") },
        ],
      },
    });
    expect(r.outrasDeducoes.toString()).toBe("54.11808"); // 51.11808 + 3
    expect(r.receitaLiquida.toString()).toBe("4957.0128");
  });

  it("frete isento nao cobra do produtor", () => {
    const r = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: { ...oferta, freteModo: "isento", freteValor: dec(0), kmRodados: null },
    });
    expect(r.fretePorCabeca.toString()).toBe("0");
    expect(r.receitaLiquida.toString()).toBe("4984.0128");
  });

  it("prazo zero nao desconta nada", () => {
    const r = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: { ...oferta, prazoDias: 0 },
    });
    expect(r.valorPresente.toString()).toBe(r.receitaLiquida.toString());
  });

  it("taxa zero nao desconta nada", () => {
    const r = calcularOferta({ lote, oferta, regime: regimePf, taxaDescontoAnual: dec(0) });
    expect(r.valorPresente.toString()).toBe(r.receitaLiquida.toString());
  });

  it("frete alto pode virar receita liquida negativa, e isso e exibido, nao barrado", () => {
    const r = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: { ...oferta, freteModo: "por_cabeca", freteValor: dec("6000"), kmRodados: null },
    });
    expect(r.receitaLiquida.isNegative()).toBe(true);
    expect(r.valorPresente.isNegative()).toBe(true);
  });
});
