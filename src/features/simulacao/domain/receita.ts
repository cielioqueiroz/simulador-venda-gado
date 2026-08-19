import { type Decimal, soma } from "@/lib/money";
import type { Ajuste, AjusteTipo } from "./tipos";

/** Bases sobre as quais um ajuste percentual ou por arroba incide. */
export interface ContextoAjuste {
  readonly receitaBruta: Decimal;
  readonly arrobas: Decimal;
}

export function receitaBruta(arrobas: Decimal, precoArroba: Decimal): Decimal {
  return arrobas.times(precoArroba);
}

/** Converte um ajuste para reais por cabeca, conforme o modo declarado. */
export function valorDoAjuste(ajuste: Ajuste, ctx: ContextoAjuste): Decimal {
  switch (ajuste.modo) {
    case "percentual":
      return ctx.receitaBruta.times(ajuste.valor);
    case "valor_por_cabeca":
      return ajuste.valor;
    case "valor_por_arroba":
      return ctx.arrobas.times(ajuste.valor);
  }
}

export function somaAjustesPorTipo(
  ajustes: readonly Ajuste[],
  tipo: AjusteTipo,
  ctx: ContextoAjuste,
): Decimal {
  return soma(ajustes.filter((a) => a.tipo === tipo).map((a) => valorDoAjuste(a, ctx)));
}

export function receitaAjustada(
  bruta: Decimal,
  bonificacoes: Decimal,
  descontosQualidade: Decimal,
): Decimal {
  return bruta.plus(bonificacoes).minus(descontosQualidade);
}
