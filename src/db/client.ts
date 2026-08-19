import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

/**
 * Conexao de producao. Serverless por HTTP, que e o que a Vercel comporta sem
 * pool de conexao persistente.
 *
 * Nenhum componente React importa este arquivo. Ele e consumido por Server Actions
 * e por rotas, que passam o cliente aos repositorios. Os repositorios recebem o
 * banco por parametro justamente para que o teste possa entregar o PGlite no lugar.
 */
export const db = drizzle(neon(env.DATABASE_URL), { schema });
