import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizacoes";
import { regimesTributarios } from "./tributos";

export const freteModoEnum = pgEnum("frete_modo", ["por_cabeca", "por_km", "isento"]);
export const ajusteTipoEnum = pgEnum("ajuste_tipo", [
  "bonificacao",
  "desconto_qualidade",
  "outra_deducao",
]);
export const ajusteModoEnum = pgEnum("ajuste_modo", [
  "percentual",
  "valor_por_cabeca",
  "valor_por_arroba",
]);
export const categoriaAnimalEnum = pgEnum("categoria_animal", [
  "boi",
  "novilho",
  "novilha",
  "vaca",
  "touro",
]);

export const simulacoes = pgTable(
  "simulacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    cabecas: integer("cabecas").notNull(),
    pesoVivoMedioKg: numeric("peso_vivo_medio_kg", { precision: 14, scale: 4 }).notNull(),
    categoriaAnimal: categoriaAnimalEnum("categoria_animal").notNull(),
    taxaDescontoAnual: numeric("taxa_desconto_anual", { precision: 14, scale: 4 }).notNull(),
    regimeTributarioId: text("regime_tributario_id")
      .notNull()
      .references(() => regimesTributarios.id),
    criadaEm: timestamp("criada_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadaEm: timestamp("atualizada_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("simulacoes_org").on(t.orgId),
    check("simulacao_cabecas_positivo", sql`${t.cabecas} > 0`),
    check("simulacao_peso_positivo", sql`${t.pesoVivoMedioKg} > 0`),
    check("simulacao_taxa_faixa", sql`${t.taxaDescontoAnual} > -1`),
  ],
);

export const ofertas = pgTable(
  "ofertas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    simulacaoId: uuid("simulacao_id")
      .notNull()
      .references(() => simulacoes.id, { onDelete: "cascade" }),
    comprador: text("comprador").notNull(),
    precoArroba: numeric("preco_arroba", { precision: 14, scale: 4 }).notNull(),
    rendimentoAcordado: numeric("rendimento_acordado", { precision: 14, scale: 4 }).notNull(),
    /** Obrigatoria e sem valor padrao, por decisao registrada na spec. */
    quebraPct: numeric("quebra_pct", { precision: 14, scale: 4 }).notNull(),
    prazoDias: integer("prazo_dias").notNull(),
    freteModo: freteModoEnum("frete_modo").notNull(),
    freteValor: numeric("frete_valor", { precision: 14, scale: 4 }).notNull().default("0"),
    /** Quilometragem cobrada pela transportadora, com retorno se ela cobrar. */
    kmRodados: numeric("km_rodados", { precision: 14, scale: 4 }),
    comissaoPct: numeric("comissao_pct", { precision: 14, scale: 4 }).notNull().default("0"),
    observacao: text("observacao"),
    criadaEm: timestamp("criada_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ofertas_org_simulacao").on(t.orgId, t.simulacaoId),
    check(
      "oferta_rendimento_faixa",
      sql`${t.rendimentoAcordado} >= 0.4 and ${t.rendimentoAcordado} <= 0.65`,
    ),
    check("oferta_quebra_faixa", sql`${t.quebraPct} >= 0 and ${t.quebraPct} <= 0.1`),
    check("oferta_prazo_nao_negativo", sql`${t.prazoDias} >= 0`),
    check("oferta_preco_positivo", sql`${t.precoArroba} > 0`),
    check("oferta_comissao_faixa", sql`${t.comissaoPct} >= 0 and ${t.comissaoPct} <= 1`),
    check(
      "oferta_km_exigido_no_modo_por_km",
      sql`${t.freteModo} <> 'por_km' or (${t.kmRodados} is not null and ${t.kmRodados} > 0)`,
    ),
    check("oferta_isento_sem_custo", sql`${t.freteModo} <> 'isento' or ${t.freteValor} = 0`),
  ],
);

export const ajustesOferta = pgTable(
  "ajustes_oferta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ofertaId: uuid("oferta_id")
      .notNull()
      .references(() => ofertas.id, { onDelete: "cascade" }),
    tipo: ajusteTipoEnum("tipo").notNull(),
    nome: text("nome").notNull(),
    modo: ajusteModoEnum("modo").notNull(),
    valor: numeric("valor", { precision: 14, scale: 4 }).notNull(),
  },
  (t) => [
    index("ajustes_org_oferta").on(t.orgId, t.ofertaId),
    check(
      "ajuste_percentual_ate_cem",
      sql`${t.modo} <> 'percentual' or (${t.valor} >= 0 and ${t.valor} <= 1)`,
    ),
    // O sinal de um ajuste vem do tipo, nao do valor. Um desconto e valor positivo
    // do tipo desconto_qualidade. Permitir negativo criaria duas formas de dizer
    // a mesma coisa, e um caminho para desconto virar bonificacao por engano.
    check("ajuste_valor_nao_negativo", sql`${t.valor} >= 0`),
  ],
);

export const simulacoesRelations = relations(simulacoes, ({ many, one }) => ({
  ofertas: many(ofertas),
  organizacao: one(organizations, {
    fields: [simulacoes.orgId],
    references: [organizations.id],
  }),
}));

export const ofertasRelations = relations(ofertas, ({ many, one }) => ({
  ajustes: many(ajustesOferta),
  simulacao: one(simulacoes, {
    fields: [ofertas.simulacaoId],
    references: [simulacoes.id],
  }),
}));

export const ajustesRelations = relations(ajustesOferta, ({ one }) => ({
  oferta: one(ofertas, { fields: [ajustesOferta.ofertaId], references: [ofertas.id] }),
}));
