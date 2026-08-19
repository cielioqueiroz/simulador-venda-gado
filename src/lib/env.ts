import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Variaveis validadas na carga. Faltando ou malformada, o processo morre no boot
 * em vez de falhar em uma query no meio de uma simulacao.
 * Nada aqui vai para o cliente: nenhuma chave com prefixo NEXT_PUBLIC_.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url({ error: "DATABASE_URL precisa ser uma URL de conexao valida" }),
  },
  // Nenhuma variavel de cliente nesta versao.
  experimental__runtimeEnv: {},
  // Teste e geracao de migration rodam sem banco de producao configurado.
  skipValidation: process.env.NODE_ENV === "test" || process.env.SKIP_ENV_VALIDATION === "1",
});
