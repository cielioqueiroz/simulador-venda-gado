import type { Decimal } from "@/lib/money";
import type { ResultadoOferta } from "./tipos";

export interface ItemRanking {
  readonly resultado: ResultadoOferta;
  /** Posicao no ranking, comecando em 1. */
  readonly posicao: number;
  /** Quanto esta oferta deixa na mesa em relacao a melhor, em reais totais do lote. */
  readonly atrasoParaMelhorTotal: Decimal;
}

export interface Ranking {
  readonly itens: readonly ItemRanking[];
  /**
   * Vantagem da melhor oferta sobre a segunda, em reais totais do lote.
   * Nula quando nao existe segunda oferta, porque zero significaria empate.
   */
  readonly vantagemDoPrimeiroTotal: Decimal | null;
}

/**
 * Ordena por valor presente por cabeca, do maior para o menor.
 * Empate desempata pelo menor prazo, depois pelo nome do comprador,
 * para que a ordem seja estavel entre execucoes.
 */
export function ranquear(resultados: readonly ResultadoOferta[]): Ranking {
  const ordenados = [...resultados].sort((a, b) => {
    const porValor = b.vpPorCabeca.comparedTo(a.vpPorCabeca);
    if (porValor !== 0) return porValor;
    if (a.prazoDias !== b.prazoDias) return a.prazoDias - b.prazoDias;
    return a.comprador.localeCompare(b.comprador, "pt-BR");
  });

  const melhor = ordenados[0];
  if (melhor === undefined) {
    return { itens: [], vantagemDoPrimeiroTotal: null };
  }

  const itens = ordenados.map((resultado, indice) => ({
    resultado,
    posicao: indice + 1,
    atrasoParaMelhorTotal: melhor.vpTotalLote.minus(resultado.vpTotalLote),
  }));

  const segundo = ordenados[1];
  const vantagemDoPrimeiroTotal =
    segundo === undefined ? null : melhor.vpTotalLote.minus(segundo.vpTotalLote);

  return { itens, vantagemDoPrimeiroTotal };
}
