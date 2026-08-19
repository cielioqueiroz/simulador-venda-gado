import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

export type BancoDeTeste = {
  db: ReturnType<typeof drizzle<typeof schema>>;
  fechar: () => Promise<void>;
};

/**
 * Postgres de verdade, compilado para WASM, em memoria.
 * Roda as mesmas migrations da producao, entao os check da spec sao exercitados
 * sem rede e sem credencial.
 */
export async function criarBancoDeTeste(): Promise<BancoDeTeste> {
  const cliente = new PGlite();
  const db = drizzle(cliente, { schema });
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  return { db, fechar: () => cliente.close() };
}

/**
 * Nome da restricao que a operacao violou.
 *
 * O drizzle embrulha o erro do Postgres e a mensagem de topo traz apenas a query,
 * entao um `rejects.toThrow()` sem argumento passaria tambem quando o insert
 * falhasse por outro motivo, um nome de coluna errado por exemplo, e o teste nao
 * provaria nada. O nome da restricao vive em `cause.constraint`.
 */
export async function restricaoViolada(operacao: Promise<unknown>): Promise<string> {
  try {
    await operacao;
  } catch (erro) {
    const causa = (erro as { cause?: { constraint?: string } }).cause;
    return causa?.constraint ?? "erro sem restricao nomeada";
  }
  return "nenhum erro";
}
