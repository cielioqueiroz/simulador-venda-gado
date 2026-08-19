import { type Decimal, dec, soma } from "@/lib/money";

const UM = dec(1);
const DIAS_NO_ANO = dec(365);
/** Tolerancia da soma de percentuais do fluxo, para absorver dizima de 1/3. */
const TOLERANCIA_FLUXO = dec("0.000001");

export class ErroValorPresente extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroValorPresente";
  }
}

/** Uma entrada do fluxo de recebimento. `percentual` e fracao: 1 vale 100%. */
export interface Parcela {
  readonly dias: number;
  readonly percentual: Decimal;
}

/**
 * Converte taxa anual em diaria de forma composta.
 * Dividir por 365 subestima o desconto e e o erro comum na conta de papel.
 */
export function taxaAnualParaDiaria(taxaAnual: Decimal): Decimal {
  if (taxaAnual.lessThanOrEqualTo(-1)) {
    throw new ErroValorPresente("taxa anual precisa ser maior que menos um");
  }
  return UM.plus(taxaAnual).pow(UM.dividedBy(DIAS_NO_ANO)).minus(UM);
}

/** Valor presente de um recebimento unico em `prazoDias`. */
export function valorPresente(
  receitaLiquida: Decimal,
  taxaDiaria: Decimal,
  prazoDias: number,
): Decimal {
  if (!Number.isInteger(prazoDias) || prazoDias < 0) {
    throw new ErroValorPresente("prazo em dias precisa ser inteiro nao negativo");
  }
  return receitaLiquida.dividedBy(UM.plus(taxaDiaria).pow(prazoDias));
}

/**
 * Valor presente de um fluxo de recebimento.
 * Cada parcela e descontada pelo proprio prazo, nunca pela media dos prazos.
 */
export function valorPresenteDeFluxo(
  receitaLiquida: Decimal,
  taxaDiaria: Decimal,
  parcelas: readonly Parcela[],
): Decimal {
  if (parcelas.length === 0) {
    throw new ErroValorPresente("fluxo precisa de pelo menos uma parcela");
  }
  const somaPercentuais = soma(parcelas.map((p) => p.percentual));
  if (somaPercentuais.minus(UM).abs().greaterThan(TOLERANCIA_FLUXO)) {
    throw new ErroValorPresente("percentuais do fluxo precisam somar 100%");
  }
  return soma(
    parcelas.map((p) => valorPresente(receitaLiquida.times(p.percentual), taxaDiaria, p.dias)),
  );
}
