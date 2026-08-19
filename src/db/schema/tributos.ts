import { relations, sql } from "drizzle-orm";
import { check, date, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const regimesTributarios = pgTable(
  "regimes_tributarios",
  {
    id: text("id").primaryKey(),
    nome: text("nome").notNull(),
    descricao: text("descricao").notNull(),
    vigenciaInicio: date("vigencia_inicio").notNull(),
    /** Nulo significa vigencia aberta, sem data de fim. */
    vigenciaFim: date("vigencia_fim"),
  },
  (t) => [
    check(
      "regime_vigencia_coerente",
      sql`${t.vigenciaFim} is null or ${t.vigenciaFim} >= ${t.vigenciaInicio}`,
    ),
  ],
);

export const componentesTributo = pgTable(
  "componentes_tributo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    regimeId: text("regime_id")
      .notNull()
      .references(() => regimesTributarios.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    aliquota: numeric("aliquota", { precision: 14, scale: 4 }).notNull(),
    /** Base sobre a qual o componente incide. Nesta versao, sempre a receita bruta. */
    base: text("base").notNull().default("receita_bruta"),
  },
  (t) => [
    check("componente_aliquota_faixa", sql`${t.aliquota} >= 0 and ${t.aliquota} <= 1`),
    check("componente_base_conhecida", sql`${t.base} in ('receita_bruta')`),
  ],
);

export const regimesRelations = relations(regimesTributarios, ({ many }) => ({
  componentes: many(componentesTributo),
}));

export const componentesRelations = relations(componentesTributo, ({ one }) => ({
  regime: one(regimesTributarios, {
    fields: [componentesTributo.regimeId],
    references: [regimesTributarios.id],
  }),
}));
