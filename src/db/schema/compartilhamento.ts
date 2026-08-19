import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizacoes";
import { simulacoes } from "./simulacao";

/**
 * Link publico de leitura. O banco guarda apenas o sha256 do token, nunca o token.
 * Vazamento desta tabela nao produz link valido.
 */
export const compartilhamentos = pgTable(
  "compartilhamentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    simulacaoId: uuid("simulacao_id")
      .notNull()
      .references(() => simulacoes.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    revogadoEm: timestamp("revogado_em", { withTimezone: true }),
    acessos: integer("acessos").notNull().default(0),
  },
  (t) => [
    uniqueIndex("compartilhamentos_token").on(t.tokenHash),
    check("compartilhamento_expira_depois_de_criar", sql`${t.expiraEm} > ${t.criadoEm}`),
    check("compartilhamento_acessos_nao_negativo", sql`${t.acessos} >= 0`),
  ],
);

/**
 * Contador de janela deslizante para rate limit.
 * Unica tabela sem org_id de proposito: ela protege rota nao autenticada,
 * onde ainda nao existe organizacao conhecida. Excecao registrada na spec.
 */
export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chave: text("chave").notNull(),
    janelaInicio: timestamp("janela_inicio", { withTimezone: true }).notNull(),
    contagem: integer("contagem").notNull().default(0),
  },
  (t) => [
    uniqueIndex("rate_limit_chave_janela").on(t.chave, t.janelaInicio),
    check("rate_limit_contagem_nao_negativa", sql`${t.contagem} >= 0`),
  ],
);
