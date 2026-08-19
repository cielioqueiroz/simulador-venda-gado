import { sql } from "drizzle-orm";
import { check, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizacoes";
import { ofertas } from "./simulacao";

/**
 * Snapshot do calculo no momento em que a simulacao foi salva.
 * `versao_calculo` existe para que uma mudanca de formula nao corrompa comparacao
 * historica: snapshot de versao antiga e exibido com aviso, nunca recalculado calado.
 */
export const resultados = pgTable(
  "resultados",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ofertaId: uuid("oferta_id")
      .notNull()
      .references(() => ofertas.id, { onDelete: "cascade" }),
    calculadoEm: timestamp("calculado_em", { withTimezone: true }).notNull().defaultNow(),
    versaoCalculo: text("versao_calculo").notNull(),
    receitaBruta: numeric("receita_bruta", { precision: 14, scale: 4 }).notNull(),
    tributos: numeric("tributos", { precision: 14, scale: 4 }).notNull(),
    frete: numeric("frete", { precision: 14, scale: 4 }).notNull(),
    deducoes: numeric("deducoes", { precision: 14, scale: 4 }).notNull(),
    receitaLiquida: numeric("receita_liquida", { precision: 14, scale: 4 }).notNull(),
    valorPresente: numeric("valor_presente", { precision: 14, scale: 4 }).notNull(),
    vpPorCabeca: numeric("vp_por_cabeca", { precision: 14, scale: 4 }).notNull(),
    vpPorArroba: numeric("vp_por_arroba", { precision: 14, scale: 4 }).notNull(),
  },
  (t) => [
    index("resultados_org_oferta").on(t.orgId, t.ofertaId),
    check("resultado_versao_preenchida", sql`length(${t.versaoCalculo}) > 0`),
  ],
);
