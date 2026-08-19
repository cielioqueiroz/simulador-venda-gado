import { type Decimal, dec } from "@/lib/money";
import { calcularFrete } from "./logistica";
import { arrobasPorCabeca, pesoCarcaca, pesoVivoEfetivo } from "./peso";
import { receitaAjustada, receitaBruta, somaAjustesPorTipo } from "./receita";
import type { Lote, OfertaEntrada, RegimeTributario, ResultadoOferta } from "./tipos";
import { calcularTributos } from "./tributos";
import { taxaAnualParaDiaria, valorPresente } from "./valor-presente";

/**
 * Versao da formula. Sobe quando uma mudanca altera o resultado para a mesma entrada,
 * nunca por refatoracao sem efeito numerico. Snapshot gravado com versao antiga
 * e exibido com aviso, em vez de recalculado em silencio.
 */
export const VERSAO_CALCULO = "1.0.0";

export interface EntradaCalculo {
  readonly lote: Lote;
  readonly oferta: OfertaEntrada;
  readonly regime: RegimeTributario;
  readonly taxaDescontoAnual: Decimal;
}

/** Cadeia inteira de uma oferta, do peso de fazenda ao valor presente liquido. */
export function calcularOferta(entrada: EntradaCalculo): ResultadoOferta {
  const { lote, oferta, regime, taxaDescontoAnual } = entrada;

  const vivoEfetivo = pesoVivoEfetivo(lote.pesoVivoMedioKg, oferta.quebraPct);
  const carcaca = pesoCarcaca(vivoEfetivo, oferta.rendimentoAcordado);
  const arrobas = arrobasPorCabeca(
    lote.pesoVivoMedioKg,
    oferta.quebraPct,
    oferta.rendimentoAcordado,
  );

  const bruta = receitaBruta(arrobas, oferta.precoArroba);
  const ctx = { receitaBruta: bruta, arrobas };

  const bonificacoes = somaAjustesPorTipo(oferta.ajustes, "bonificacao", ctx);
  const descontosQualidade = somaAjustesPorTipo(oferta.ajustes, "desconto_qualidade", ctx);
  const ajustada = receitaAjustada(bruta, bonificacoes, descontosQualidade);

  // Base do tributo e a receita bruta, antes de bonificacao e desconto de qualidade.
  const { total: tributos, memoria: memoriaTributos } = calcularTributos(bruta, regime);

  const frete = calcularFrete(oferta, lote.cabecas);

  const comissao = bruta.times(oferta.comissaoPct);
  const outrasDeducoes = comissao.plus(somaAjustesPorTipo(oferta.ajustes, "outra_deducao", ctx));

  const liquida = ajustada.minus(tributos).minus(frete.porCabeca).minus(outrasDeducoes);

  const taxaDiaria = taxaAnualParaDiaria(taxaDescontoAnual);
  const vp = valorPresente(liquida, taxaDiaria, oferta.prazoDias);

  return {
    comprador: oferta.comprador,
    pesoVivoEfetivoKg: vivoEfetivo,
    pesoCarcacaKg: carcaca,
    arrobas,
    receitaBruta: bruta,
    bonificacoes,
    descontosQualidade,
    receitaAjustada: ajustada,
    tributos,
    memoriaTributos,
    fretePorCabeca: frete.porCabeca,
    freteTotal: frete.total,
    comissao,
    outrasDeducoes,
    receitaLiquida: liquida,
    taxaDiaria,
    prazoDias: oferta.prazoDias,
    valorPresente: vp,
    vpPorCabeca: vp,
    vpPorArroba: vp.dividedBy(arrobas),
    vpTotalLote: vp.times(dec(lote.cabecas)),
    versaoCalculo: VERSAO_CALCULO,
  };
}
