import { type Decimal, soma } from "@/lib/money";
import type { LinhaMemoriaTributo, RegimeTributario } from "./tipos";

/**
 * Regime cuja vigencia cobre a data. Intervalo fechado dos dois lados:
 * o dia de inicio e o dia de fim pertencem a vigencia.
 * Aliquota muda por legislacao, entao ela e dado com data, nunca constante no codigo.
 */
export function regimeVigenteEm(
  regimes: readonly RegimeTributario[],
  data: Date,
): RegimeTributario | null {
  const alvo = data.getTime();
  return (
    regimes.find((regime) => {
      const comecou = regime.vigenciaInicio.getTime() <= alvo;
      const naoAcabou = regime.vigenciaFim === null || regime.vigenciaFim.getTime() >= alvo;
      return comecou && naoAcabou;
    }) ?? null
  );
}

export function aliquotaTotal(regime: RegimeTributario): Decimal {
  return soma(regime.componentes.map((c) => c.aliquota));
}

/**
 * Contribuicao sobre a comercializacao da producao rural.
 * A base e a receita bruta, antes de bonificacao e de desconto de qualidade.
 * Estimativa, nao substitui orientacao contabil.
 */
export function calcularTributos(
  receitaBruta: Decimal,
  regime: RegimeTributario,
): { total: Decimal; memoria: LinhaMemoriaTributo[] } {
  const memoria: LinhaMemoriaTributo[] = regime.componentes.map((c) => ({
    nome: c.nome,
    aliquota: c.aliquota,
    valor: receitaBruta.times(c.aliquota),
  }));
  return { total: soma(memoria.map((l) => l.valor)), memoria };
}
