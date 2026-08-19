import { type Decimal, dec } from "@/lib/money";
import { kgParaArrobas } from "@/lib/units";

const UM = dec(1);

/**
 * Peso vivo que chega na balanca do comprador.
 * A quebra e a perda de peso no embarque e no transporte, entre 0 e 0.1.
 */
export function pesoVivoEfetivo(pesoVivoMedioKg: Decimal, quebraPct: Decimal): Decimal {
  return pesoVivoMedioKg.times(UM.minus(quebraPct));
}

/** Peso de carcaca conforme o rendimento acordado, entre 0.4 e 0.65. */
export function pesoCarcaca(pesoVivoEfetivoKg: Decimal, rendimentoAcordado: Decimal): Decimal {
  return pesoVivoEfetivoKg.times(rendimentoAcordado);
}

/** Arrobas de carcaca por cabeca, do peso de fazenda ate a unidade de venda. */
export function arrobasPorCabeca(
  pesoVivoMedioKg: Decimal,
  quebraPct: Decimal,
  rendimentoAcordado: Decimal,
): Decimal {
  return kgParaArrobas(
    pesoCarcaca(pesoVivoEfetivo(pesoVivoMedioKg, quebraPct), rendimentoAcordado),
  );
}
