declare const marca: unique symbol;

type Marcado<T, M extends string> = T & { readonly [marca]: M };

/**
 * Identificador de organizacao. E tipo marcado de proposito: uma string solta
 * nao compila no lugar de um OrgId, entao passar o id errado para um repositorio
 * vira erro de compilacao em vez de vazamento entre organizacoes.
 */
export type OrgId = Marcado<string, "OrgId">;
export type UserId = Marcado<string, "UserId">;
export type SimulacaoId = Marcado<string, "SimulacaoId">;
export type OfertaId = Marcado<string, "OfertaId">;

function exigirNaoVazio(valor: string, nome: string): string {
  if (valor.trim() === "") {
    throw new Error(`${nome} nao pode ser vazio`);
  }
  return valor;
}

export function comoOrgId(valor: string): OrgId {
  return exigirNaoVazio(valor, "OrgId") as OrgId;
}

export function comoUserId(valor: string): UserId {
  return exigirNaoVazio(valor, "UserId") as UserId;
}

export function comoSimulacaoId(valor: string): SimulacaoId {
  return exigirNaoVazio(valor, "SimulacaoId") as SimulacaoId;
}

export function comoOfertaId(valor: string): OfertaId {
  return exigirNaoVazio(valor, "OfertaId") as OfertaId;
}
