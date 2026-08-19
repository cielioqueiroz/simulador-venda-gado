import { type Decimal, dec } from "@/lib/money";

/** Uma arroba equivale a 15 kg de carcaca. Unico lugar do projeto que declara isso. */
export const KG_POR_ARROBA = dec(15);

export function kgParaArrobas(kg: Decimal): Decimal {
  return kg.dividedBy(KG_POR_ARROBA);
}
