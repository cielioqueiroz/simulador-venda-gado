import Decimal from "decimal.js";

// Precisao alta no meio da cadeia, arredondamento so na exibicao.
// 28 digitos significativos cobrem com folga lote, peso, preco e potencia de taxa diaria.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export const ZERO = new Decimal(0);

export function dec(valor: Decimal.Value): Decimal {
  return new Decimal(valor);
}

export function soma(valores: readonly Decimal[]): Decimal {
  return valores.reduce((total, valor) => total.plus(valor), ZERO);
}
