import type { Decimal } from "@/lib/money";

/**
 * Formatacao para exibicao. Este e o unico ponto do projeto onde valor e
 * arredondado: a cadeia de calculo carrega precisao cheia ate aqui.
 */

const LOCALE = "pt-BR";

function comCasas(valor: number, minimo: number, maximo: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: minimo,
    maximumFractionDigits: maximo,
  }).format(valor);
}

/** Reais, sem o simbolo. O simbolo vive no cabecalho da coluna, nao em cada celula. */
export function formatarBRL(valor: Decimal, casas = 2): string {
  return comCasas(valor.toDecimalPlaces(casas).toNumber(), casas, casas);
}

/** Recebe fracao decimal e devolve percentual. `0.015` vira `1,5%`. */
export function formatarPercentual(valor: Decimal, casasMaximas = 1): string {
  return `${comCasas(valor.times(100).toNumber(), 0, casasMaximas)}%`;
}

/** Arrobas com as quatro casas da coluna numeric(14,4). */
export function formatarArrobas(valor: Decimal): string {
  return comCasas(valor.toDecimalPlaces(4).toNumber(), 4, 4);
}

export function formatarPeso(valor: Decimal): string {
  return `${comCasas(valor.toDecimalPlaces(1).toNumber(), 1, 1)} kg`;
}
