import { describe, expect, it } from "vitest";
import { ranquear } from "@/features/simulacao/domain/comparador";
import type { ResultadoOferta } from "@/features/simulacao/domain/tipos";
import { dec } from "@/lib/money";

function resultado(comprador: string, vpPorCabeca: string, prazoDias = 30): ResultadoOferta {
  const vp = dec(vpPorCabeca);
  return {
    comprador,
    pesoVivoEfetivoKg: dec(0),
    pesoCarcacaKg: dec(0),
    arrobas: dec(1),
    receitaBruta: dec(0),
    bonificacoes: dec(0),
    descontosQualidade: dec(0),
    receitaAjustada: dec(0),
    tributos: dec(0),
    memoriaTributos: [],
    fretePorCabeca: dec(0),
    freteTotal: dec(0),
    comissao: dec(0),
    outrasDeducoes: dec(0),
    receitaLiquida: vp,
    taxaDiaria: dec(0),
    prazoDias,
    valorPresente: vp,
    vpPorCabeca: vp,
    vpPorArroba: vp,
    vpTotalLote: vp.times(40),
    versaoCalculo: "1.0.0",
  };
}

describe("ranquear", () => {
  it("ordena por valor presente por cabeca, do maior para o menor", () => {
    const r = ranquear([resultado("B", "4900"), resultado("A", "4914"), resultado("C", "4880")]);
    expect(r.itens.map((i) => i.resultado.comprador)).toEqual(["A", "B", "C"]);
    expect(r.itens.map((i) => i.posicao)).toEqual([1, 2, 3]);
  });

  it("a maior arroba nao vence quando o prazo come a diferenca", () => {
    // Este e o insight do produto, em forma de teste.
    const arrobaAlta = resultado("Preco alto, prazo longo", "4800", 90);
    const arrobaBaixa = resultado("Preco menor, a vista", "4900", 0);
    const r = ranquear([arrobaAlta, arrobaBaixa]);
    expect(r.itens[0]?.resultado.comprador).toBe("Preco menor, a vista");
  });

  it("calcula a vantagem do primeiro sobre o segundo em reais totais", () => {
    const r = ranquear([resultado("A", "4914"), resultado("B", "4900")]);
    // 14 por cabeca * 40 cabecas embutidas no vpTotalLote do helper
    expect(r.vantagemDoPrimeiroTotal?.toString()).toBe("560");
  });

  it("mede o atraso de cada oferta para a melhor, em reais totais", () => {
    const r = ranquear([resultado("A", "4914"), resultado("B", "4900"), resultado("C", "4880")]);
    expect(r.itens.map((i) => i.atrasoParaMelhorTotal.toString())).toEqual(["0", "560", "1360"]);
  });

  it("oferta unica: ranking de um, vantagem ausente e nao zero", () => {
    const r = ranquear([resultado("A", "4914")]);
    expect(r.itens).toHaveLength(1);
    expect(r.vantagemDoPrimeiroTotal).toBeNull();
  });

  it("lista vazia: ranking vazio, vantagem ausente", () => {
    const r = ranquear([]);
    expect(r.itens).toEqual([]);
    expect(r.vantagemDoPrimeiroTotal).toBeNull();
  });

  it("empate no valor presente desempata pelo menor prazo", () => {
    const r = ranquear([resultado("Longo", "4900", 60), resultado("Curto", "4900", 15)]);
    expect(r.itens[0]?.resultado.comprador).toBe("Curto");
  });

  it("empate no valor presente e no prazo desempata pelo nome do comprador", () => {
    const r = ranquear([resultado("Zebu", "4900", 30), resultado("Angus", "4900", 30)]);
    expect(r.itens.map((i) => i.resultado.comprador)).toEqual(["Angus", "Zebu"]);
  });

  it("nao muta a lista recebida", () => {
    const entrada = [resultado("B", "4900"), resultado("A", "4914")];
    ranquear(entrada);
    expect(entrada.map((e) => e.comprador)).toEqual(["B", "A"]);
  });
});
