import type {
  Ajuste,
  AjusteModo,
  AjusteTipo,
  FreteModo,
  Lote,
  OfertaEntrada,
  RegimeTributario,
  ResultadoOferta,
} from "@/features/simulacao/domain";
import type { OrgId } from "@/lib/ids";
import { dec } from "@/lib/money";

/** Casas decimais das colunas numeric(14,4). */
const CASAS = 4;

export interface LinhaSimulacao {
  readonly cabecas: number;
  readonly pesoVivoMedioKg: string;
  readonly taxaDescontoAnual: string;
}

export interface LinhaOferta {
  readonly comprador: string;
  readonly precoArroba: string;
  readonly rendimentoAcordado: string;
  readonly quebraPct: string;
  readonly prazoDias: number;
  readonly freteModo: FreteModo;
  readonly freteValor: string;
  readonly kmRodados: string | null;
  readonly comissaoPct: string;
}

export interface LinhaAjuste {
  readonly nome: string;
  readonly tipo: AjusteTipo;
  readonly modo: AjusteModo;
  readonly valor: string;
}

export interface LinhaRegime {
  readonly id: string;
  readonly nome: string;
  readonly vigenciaInicio: string;
  readonly vigenciaFim: string | null;
}

export interface LinhaComponente {
  readonly nome: string;
  readonly aliquota: string;
  readonly base: "receita_bruta";
}

/** Coluna `date` vem como texto ISO. Fixa em UTC para nao deslocar por fuso. */
function dataDeColuna(valor: string): Date {
  return new Date(`${valor}T00:00:00Z`);
}

export function linhaParaLote(linha: LinhaSimulacao): Lote {
  return { cabecas: linha.cabecas, pesoVivoMedioKg: dec(linha.pesoVivoMedioKg) };
}

export function linhaParaOferta(
  linha: LinhaOferta,
  ajustes: readonly LinhaAjuste[],
): OfertaEntrada {
  const convertidos: Ajuste[] = ajustes.map((a) => ({
    nome: a.nome,
    tipo: a.tipo,
    modo: a.modo,
    valor: dec(a.valor),
  }));
  return {
    comprador: linha.comprador,
    precoArroba: dec(linha.precoArroba),
    rendimentoAcordado: dec(linha.rendimentoAcordado),
    quebraPct: dec(linha.quebraPct),
    prazoDias: linha.prazoDias,
    freteModo: linha.freteModo,
    freteValor: dec(linha.freteValor),
    kmRodados: linha.kmRodados === null ? null : dec(linha.kmRodados),
    comissaoPct: dec(linha.comissaoPct),
    ajustes: convertidos,
  };
}

export function linhaParaRegime(
  linha: LinhaRegime,
  componentes: readonly LinhaComponente[],
): RegimeTributario {
  return {
    id: linha.id,
    nome: linha.nome,
    vigenciaInicio: dataDeColuna(linha.vigenciaInicio),
    vigenciaFim: linha.vigenciaFim === null ? null : dataDeColuna(linha.vigenciaFim),
    componentes: componentes.map((c) => ({
      nome: c.nome,
      aliquota: dec(c.aliquota),
      base: c.base,
    })),
  };
}

export interface LinhaResultado {
  readonly orgId: string;
  readonly ofertaId: string;
  readonly versaoCalculo: string;
  readonly receitaBruta: string;
  readonly tributos: string;
  readonly frete: string;
  readonly deducoes: string;
  readonly receitaLiquida: string;
  readonly valorPresente: string;
  readonly vpPorCabeca: string;
  readonly vpPorArroba: string;
}

/** Snapshot do calculo, com valores serializados no formato da coluna numeric(14,4). */
export function resultadoParaLinha(
  orgId: OrgId,
  ofertaId: string,
  r: ResultadoOferta,
): LinhaResultado {
  return {
    orgId,
    ofertaId,
    versaoCalculo: r.versaoCalculo,
    receitaBruta: r.receitaBruta.toFixed(CASAS),
    tributos: r.tributos.toFixed(CASAS),
    frete: r.fretePorCabeca.toFixed(CASAS),
    deducoes: r.outrasDeducoes.toFixed(CASAS),
    receitaLiquida: r.receitaLiquida.toFixed(CASAS),
    valorPresente: r.valorPresente.toFixed(CASAS),
    vpPorCabeca: r.vpPorCabeca.toFixed(CASAS),
    vpPorArroba: r.vpPorArroba.toFixed(CASAS),
  };
}
