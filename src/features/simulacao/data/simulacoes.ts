import { and, eq } from "drizzle-orm";
import { ajustesOferta, ofertas, simulacoes } from "@/db/schema";
import type { Lote, OfertaEntrada } from "@/features/simulacao/domain";
import { comoSimulacaoId, type OrgId, type SimulacaoId } from "@/lib/ids";
import {
  type LinhaAjuste,
  type LinhaOferta,
  type LinhaSimulacao,
  linhaParaLote,
  linhaParaOferta,
} from "./mapeadores";

/**
 * O tipo concreto do cliente drizzle muda conforme o driver, Neon em producao e
 * PGlite nos testes. O repositorio recebe o cliente por parametro para funcionar
 * com os dois sem conhecer nenhum deles.
 */
// biome-ignore lint/suspicious/noExplicitAny: o generico do drizzle varia por driver
export type Banco = { select: any; insert: any; update: any; delete: any };

export type CategoriaAnimal = "boi" | "novilho" | "novilha" | "vaca" | "touro";

export interface DadosNovaSimulacao {
  readonly nome: string;
  readonly cabecas: number;
  readonly pesoVivoMedioKg: string;
  readonly categoriaAnimal: CategoriaAnimal;
  readonly taxaDescontoAnual: string;
  readonly regimeTributarioId: string;
}

export interface ResumoSimulacao {
  readonly id: SimulacaoId;
  readonly nome: string;
  readonly cabecas: number;
  readonly atualizadaEm: Date;
}

export interface SimulacaoCompleta {
  readonly id: SimulacaoId;
  readonly nome: string;
  readonly regimeTributarioId: string;
  readonly lote: Lote;
  readonly taxaDescontoAnual: string;
  readonly ofertas: readonly OfertaEntrada[];
}

/**
 * Cria uma simulacao dentro da organizacao. `orgId` e sempre o primeiro parametro
 * e nunca vem do corpo da requisicao: ele vem da sessao, ja verificada.
 */
export async function criarSimulacao(
  db: Banco,
  orgId: OrgId,
  dados: DadosNovaSimulacao,
): Promise<SimulacaoId> {
  const [linha] = await db
    .insert(simulacoes)
    .values({ ...dados, orgId })
    .returning({ id: simulacoes.id });
  if (linha === undefined) {
    throw new Error("simulacao nao foi criada");
  }
  return comoSimulacaoId(linha.id);
}

export async function listarSimulacoes(db: Banco, orgId: OrgId): Promise<ResumoSimulacao[]> {
  const linhas = await db
    .select({
      id: simulacoes.id,
      nome: simulacoes.nome,
      cabecas: simulacoes.cabecas,
      atualizadaEm: simulacoes.atualizadaEm,
    })
    .from(simulacoes)
    .where(eq(simulacoes.orgId, orgId));
  return linhas.map((l: { id: string; nome: string; cabecas: number; atualizadaEm: Date }) => ({
    id: comoSimulacaoId(l.id),
    nome: l.nome,
    cabecas: l.cabecas,
    atualizadaEm: l.atualizadaEm,
  }));
}

/**
 * Busca a simulacao dentro da organizacao.
 * Simulacao de outra organizacao devolve nulo, o mesmo que simulacao inexistente,
 * para nao confirmar que o registro existe.
 */
export async function buscarSimulacao(
  db: Banco,
  orgId: OrgId,
  id: SimulacaoId,
): Promise<SimulacaoCompleta | null> {
  const [linha] = await db
    .select()
    .from(simulacoes)
    .where(and(eq(simulacoes.id, id), eq(simulacoes.orgId, orgId)));
  if (linha === undefined) {
    return null;
  }

  const linhasOferta = await db
    .select()
    .from(ofertas)
    .where(and(eq(ofertas.simulacaoId, id), eq(ofertas.orgId, orgId)));

  const ofertasCompletas: OfertaEntrada[] = [];
  for (const o of linhasOferta as (LinhaOferta & { id: string })[]) {
    const ajustes = await db
      .select({
        nome: ajustesOferta.nome,
        tipo: ajustesOferta.tipo,
        modo: ajustesOferta.modo,
        valor: ajustesOferta.valor,
      })
      .from(ajustesOferta)
      .where(and(eq(ajustesOferta.ofertaId, o.id), eq(ajustesOferta.orgId, orgId)));
    ofertasCompletas.push(linhaParaOferta(o, ajustes as LinhaAjuste[]));
  }

  return {
    id: comoSimulacaoId(linha.id),
    nome: linha.nome,
    regimeTributarioId: linha.regimeTributarioId,
    lote: linhaParaLote(linha as LinhaSimulacao),
    taxaDescontoAnual: linha.taxaDescontoAnual,
    ofertas: ofertasCompletas,
  };
}

/** Devolve `false` quando nada foi apagado, inclusive quando o id e de outra organizacao. */
export async function apagarSimulacao(db: Banco, orgId: OrgId, id: SimulacaoId): Promise<boolean> {
  const apagadas = await db
    .delete(simulacoes)
    .where(and(eq(simulacoes.id, id), eq(simulacoes.orgId, orgId)))
    .returning({ id: simulacoes.id });
  return apagadas.length > 0;
}

/** Devolve `false` quando nada foi alterado, inclusive quando o id e de outra organizacao. */
export async function renomearSimulacao(
  db: Banco,
  orgId: OrgId,
  id: SimulacaoId,
  nome: string,
): Promise<boolean> {
  const alteradas = await db
    .update(simulacoes)
    .set({ nome, atualizadaEm: new Date() })
    .where(and(eq(simulacoes.id, id), eq(simulacoes.orgId, orgId)))
    .returning({ id: simulacoes.id });
  return alteradas.length > 0;
}
