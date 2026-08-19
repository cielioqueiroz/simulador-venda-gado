import type { Decimal } from "@/lib/money";

export const FRETE_MODOS = ["por_cabeca", "por_km", "isento"] as const;
export type FreteModo = (typeof FRETE_MODOS)[number];

export const AJUSTE_TIPOS = ["bonificacao", "desconto_qualidade", "outra_deducao"] as const;
export type AjusteTipo = (typeof AJUSTE_TIPOS)[number];

export const AJUSTE_MODOS = ["percentual", "valor_por_cabeca", "valor_por_arroba"] as const;
export type AjusteModo = (typeof AJUSTE_MODOS)[number];

/** Bonificacao, desconto de qualidade ou outra deducao de uma oferta. */
export interface Ajuste {
  readonly nome: string;
  readonly tipo: AjusteTipo;
  readonly modo: AjusteModo;
  /** Fracao decimal quando o modo e percentual (0.02 vale 2%), reais nos demais. */
  readonly valor: Decimal;
}

/** O lote que esta a venda. Uma simulacao tem um lote. */
export interface Lote {
  readonly cabecas: number;
  readonly pesoVivoMedioKg: Decimal;
}

/** Uma proposta de comprador, com os parametros que ela negocia. */
export interface OfertaEntrada {
  readonly comprador: string;
  readonly precoArroba: Decimal;
  /** Fracao decimal entre 0.4 e 0.65. */
  readonly rendimentoAcordado: Decimal;
  /** Fracao decimal entre 0 e 0.1. Obrigatoria, sem valor padrao. */
  readonly quebraPct: Decimal;
  readonly prazoDias: number;
  readonly freteModo: FreteModo;
  readonly freteValor: Decimal;
  /** Quilometragem cobrada pela transportadora. Obrigatoria quando o modo e por_km. */
  readonly kmRodados: Decimal | null;
  /** Fracao decimal. Incide sobre a receita bruta. */
  readonly comissaoPct: Decimal;
  readonly ajustes: readonly Ajuste[];
}

export interface ComponenteTributo {
  readonly nome: string;
  readonly aliquota: Decimal;
  readonly base: "receita_bruta";
}

export interface RegimeTributario {
  readonly id: string;
  readonly nome: string;
  readonly vigenciaInicio: Date;
  readonly vigenciaFim: Date | null;
  readonly componentes: readonly ComponenteTributo[];
}

export interface LinhaMemoriaTributo {
  readonly nome: string;
  readonly aliquota: Decimal;
  readonly valor: Decimal;
}

/** Cadeia inteira de uma oferta, por cabeca, mais os totais do lote. */
export interface ResultadoOferta {
  readonly comprador: string;
  readonly pesoVivoEfetivoKg: Decimal;
  readonly pesoCarcacaKg: Decimal;
  readonly arrobas: Decimal;
  readonly receitaBruta: Decimal;
  readonly bonificacoes: Decimal;
  readonly descontosQualidade: Decimal;
  readonly receitaAjustada: Decimal;
  readonly tributos: Decimal;
  readonly memoriaTributos: readonly LinhaMemoriaTributo[];
  readonly fretePorCabeca: Decimal;
  readonly freteTotal: Decimal;
  readonly comissao: Decimal;
  readonly outrasDeducoes: Decimal;
  readonly receitaLiquida: Decimal;
  readonly taxaDiaria: Decimal;
  readonly prazoDias: number;
  readonly valorPresente: Decimal;
  readonly vpPorCabeca: Decimal;
  readonly vpPorArroba: Decimal;
  readonly vpTotalLote: Decimal;
  readonly versaoCalculo: string;
}
