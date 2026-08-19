import { describe, expect, it } from "vitest";
import {
  linhaParaLote,
  linhaParaOferta,
  linhaParaRegime,
  resultadoParaLinha,
} from "@/features/simulacao/data/mapeadores";
import { calcularOferta } from "@/features/simulacao/domain";
import { comoOrgId } from "@/lib/ids";
import { dec } from "@/lib/money";

const linhaSimulacao = {
  cabecas: 40,
  pesoVivoMedioKg: "480.0000",
  taxaDescontoAnual: "0.1200",
};

const linhaOferta = {
  comprador: "Frigorifico A",
  precoArroba: "320.0000",
  rendimentoAcordado: "0.5200",
  quebraPct: "0.0400",
  prazoDias: 30,
  freteModo: "por_km" as const,
  freteValor: "4.0000",
  kmRodados: "240.0000",
  comissaoPct: "0.0100",
};

const linhaRegime = {
  id: "pf-receita-bruta",
  nome: "Pessoa fisica",
  vigenciaInicio: "2018-01-01",
  vigenciaFim: null,
};

const linhasComponentes = [
  { nome: "Previdenciaria", aliquota: "0.0120", base: "receita_bruta" as const },
  { nome: "RAT", aliquota: "0.0010", base: "receita_bruta" as const },
  { nome: "SENAR", aliquota: "0.0020", base: "receita_bruta" as const },
];

describe("linhaParaLote", () => {
  it("converte numeric em Decimal sem passar por number", () => {
    const lote = linhaParaLote(linhaSimulacao);
    expect(lote.cabecas).toBe(40);
    expect(lote.pesoVivoMedioKg.toString()).toBe("480");
  });
});

describe("linhaParaOferta", () => {
  it("converte todos os campos numericos em Decimal", () => {
    const oferta = linhaParaOferta(linhaOferta, []);
    expect(oferta.precoArroba.toString()).toBe("320");
    expect(oferta.quebraPct.toString()).toBe("0.04");
    expect(oferta.kmRodados?.toString()).toBe("240");
    expect(oferta.ajustes).toEqual([]);
  });

  it("mantem km rodados nulo quando o modo nao e por km", () => {
    const oferta = linhaParaOferta({ ...linhaOferta, freteModo: "isento", kmRodados: null }, []);
    expect(oferta.kmRodados).toBeNull();
  });

  it("converte ajustes preservando tipo e modo", () => {
    const oferta = linhaParaOferta(linhaOferta, [
      { nome: "precoce", tipo: "bonificacao", modo: "valor_por_arroba", valor: "4.0000" },
    ]);
    expect(oferta.ajustes[0]?.tipo).toBe("bonificacao");
    expect(oferta.ajustes[0]?.modo).toBe("valor_por_arroba");
    expect(oferta.ajustes[0]?.valor.toString()).toBe("4");
  });
});

describe("linhaParaRegime", () => {
  it("converte data de vigencia e aliquotas", () => {
    const regime = linhaParaRegime(linhaRegime, linhasComponentes);
    expect(regime.vigenciaInicio.toISOString()).toBe("2018-01-01T00:00:00.000Z");
    expect(regime.vigenciaFim).toBeNull();
    expect(regime.componentes).toHaveLength(3);
    expect(regime.componentes[0]?.aliquota.toString()).toBe("0.012");
  });

  it("converte vigencia fechada", () => {
    const regime = linhaParaRegime({ ...linhaRegime, vigenciaFim: "2017-12-31" }, []);
    expect(regime.vigenciaFim?.toISOString()).toBe("2017-12-31T00:00:00.000Z");
  });
});

describe("resultadoParaLinha", () => {
  it("grava o snapshot com a versao de calculo e valores em string", () => {
    const resultado = calcularOferta({
      lote: linhaParaLote(linhaSimulacao),
      oferta: linhaParaOferta(linhaOferta, []),
      regime: linhaParaRegime(linhaRegime, linhasComponentes),
      taxaDescontoAnual: dec("0.12"),
    });
    const linha = resultadoParaLinha(comoOrgId("org-1"), "of-1", resultado);
    expect(linha.versaoCalculo).toBe("1.0.0");
    expect(linha.receitaBruta).toBe("5111.8080");
    expect(linha.receitaLiquida).toBe("4960.0128");
    expect(linha.tributos).toBe("76.6771");
    expect(linha.frete).toBe("24.0000");
    expect(typeof linha.valorPresente).toBe("string");
  });

  it("a ida e volta pelo banco reproduz o caso de conferencia manual", () => {
    const resultado = calcularOferta({
      lote: linhaParaLote(linhaSimulacao),
      oferta: linhaParaOferta(linhaOferta, []),
      regime: linhaParaRegime(linhaRegime, linhasComponentes),
      taxaDescontoAnual: dec("0.12"),
    });
    // Mesmos numeros do caso conferido a mao no plano 1.
    expect(resultado.arrobas.toString()).toBe("15.9744");
    expect(resultado.receitaLiquida.toString()).toBe("4960.0128");
    expect(resultado.valorPresente.toNumber()).toBeCloseTo(4914.0263, 2);
  });
});
