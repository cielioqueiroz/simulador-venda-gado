# Persistencia e Isolamento: plano de implementacao

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o esquema de banco completo com as restricoes da spec, migrations geradas, carga dos regimes tributarios com vigencia, repositorios com escopo de organizacao obrigatorio, e o teste que prova que uma organizacao nao le dado de outra.

**Architecture:** Drizzle ORM sobre Postgres. Producao usa Neon com `@neondatabase/serverless`. Testes usam PGlite, que e Postgres compilado para WASM rodando em memoria, o que permite exercitar `check` constraints e isolamento sem rede e sem credencial. O dominio nao e tocado: a camada `data/` traduz linha de banco para tipo de dominio e vice versa.

**Tech Stack:** Drizzle ORM 0.45, drizzle-kit 0.31, `@neondatabase/serverless` 1.1, PGlite 0.5, Zod 4.4, `@t3-oss/env-nextjs` 0.13.

**Spec:** `docs/superpowers/specs/2026-08-19-simulador-venda-gado-design.md`

**Plano anterior:** `docs/superpowers/plans/2026-08-19-fundacao-e-dominio.md` (concluido)

## Global Constraints

Valem todas as do plano 1, mais estas:

- Nao usar travessao em codigo, README, comentarios ou interface.
- Todo metodo de repositorio recebe `orgId` como primeiro parametro, tipado como `OrgId`, nunca `string` solto.
- Nenhuma query sem filtro de organizacao. A unica tabela sem `org_id` e `rate_limit_hits`, que protege rota nao autenticada, e a excecao esta registrada na spec.
- Acesso a registro de outra organizacao falha como nao encontrado, nunca como proibido, para nao confirmar a existencia do registro.
- Valor monetario, de peso e de percentual em `numeric(14,4)`. Leitura converte para `Decimal`, nunca para `number`.
- Nenhum componente React importa de `db/`.
- `.env*` fora do controle de versao. `.env.example` sem valores.
- Nenhum dado sensivel em `NEXT_PUBLIC_`.
- O dominio continua intocado. `tests/unit/domain/isolamento.test.ts` precisa continuar verde.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/env.ts` | validacao das variaveis de ambiente com `@t3-oss/env-nextjs` |
| `src/lib/ids.ts` | tipos marcados `OrgId`, `UserId`, `SimulacaoId`, `OfertaId` |
| `src/db/schema/organizacoes.ts` | organizations, users, memberships |
| `src/db/schema/tributos.ts` | regimes_tributarios, componentes_tributo |
| `src/db/schema/simulacao.ts` | simulacoes, ofertas, ajustes_oferta |
| `src/db/schema/resultados.ts` | resultados |
| `src/db/schema/compartilhamento.ts` | compartilhamentos, rate_limit_hits |
| `src/db/schema/index.ts` | reexporta o esquema inteiro para o drizzle-kit |
| `src/db/client.ts` | conexao Neon para producao |
| `src/db/seed/regimes.ts` | carga dos regimes tributarios com vigencia |
| `src/features/simulacao/data/mapeadores.ts` | linha de banco para tipo de dominio |
| `src/features/simulacao/data/simulacoes.ts` | repositorio de simulacoes |
| `src/features/simulacao/data/ofertas.ts` | repositorio de ofertas |
| `tests/ajuda/banco.ts` | sobe PGlite, aplica migrations, devolve cliente drizzle |
| `tests/integracao/*.test.ts` | restricoes, carga de regimes, isolamento |

`src/db/migrations/` recebe o SQL gerado pelo drizzle-kit e e versionado.

---

### Task 1: Ambiente, dependencias e banco de teste

**Files:**
- Create: `src/lib/env.ts`, `src/lib/ids.ts`, `drizzle.config.ts`, `.env.example`, `tests/ajuda/banco.ts`
- Modify: `package.json`, `vitest.config.mts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `env` com `DATABASE_URL` validada
  - `OrgId`, `UserId`, `SimulacaoId`, `OfertaId` e os construtores `comoOrgId` etc.
  - `criarBancoDeTeste(): Promise<{ db, fechar }>`
  - scripts `db:generate`, `db:migrate`, `db:studio`

- [ ] **Step 1: Instalar as dependencias**

```bash
npm install drizzle-orm @neondatabase/serverless @t3-oss/env-nextjs zod
npm install -D drizzle-kit @electric-sql/pglite
```

- [ ] **Step 2: Escrever o .env.example, sem valores**

Crie `.env.example`:

```
# String de conexao do Postgres. Em producao, a URL do Neon.
# Nunca versione o arquivo .env.local que contem o valor real.
DATABASE_URL=
```

- [ ] **Step 3: Validar o ambiente**

Crie `src/lib/env.ts`:

```ts
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
  experimental__runtimeEnv: process.env,
  // Testes e geracao de migration rodam sem banco de producao configurado.
  skipValidation: process.env.NODE_ENV === "test" || process.env.SKIP_ENV_VALIDATION === "1",
});
```

- [ ] **Step 4: Escrever o teste dos tipos marcados**

Crie `tests/unit/lib/ids.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { comoOfertaId, comoOrgId, comoSimulacaoId, comoUserId } from "@/lib/ids";

describe("tipos marcados de identificador", () => {
  it("preserva o valor da string", () => {
    expect(comoOrgId("org-1")).toBe("org-1");
    expect(comoUserId("user-1")).toBe("user-1");
    expect(comoSimulacaoId("sim-1")).toBe("sim-1");
    expect(comoOfertaId("of-1")).toBe("of-1");
  });

  it("recusa string vazia, que seria filtro de escopo silenciosamente vazio", () => {
    expect(() => comoOrgId("")).toThrow();
  });

  it("recusa string so de espaco", () => {
    expect(() => comoOrgId("   ")).toThrow();
  });
});
```

- [ ] **Step 5: Rodar o teste para ver falhar**

Run: `npm test -- tests/unit/lib/ids.test.ts`
Expected: FAIL com "Cannot find package '@/lib/ids'".

- [ ] **Step 6: Implementar os tipos marcados**

Crie `src/lib/ids.ts`:

```ts
declare const marca: unique symbol;

type Marcado<T, M extends string> = T & { readonly [marca]: M };

/**
 * Identificador de organizacao. E tipo marcado de proposito: um `string` solto
 * nao compila no lugar de um `OrgId`, entao passar o id errado para um repositorio
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
```

- [ ] **Step 7: Rodar o teste**

Run: `npm test -- tests/unit/lib/ids.test.ts`
Expected: PASS, 3 casos.

- [ ] **Step 8: Configurar o drizzle-kit**

Crie `drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/placeholder",
  },
  strict: true,
  verbose: true,
});
```

A URL de reserva existe porque `drizzle-kit generate` le apenas o esquema e nao conecta. Ela nunca e usada para conectar de verdade; `db:migrate` contra producao exige a variavel real.

- [ ] **Step 9: Registrar os scripts**

Acrescente a `scripts` em `package.json`:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

- [ ] **Step 10: Incluir os testes de integracao no Vitest**

Em `vitest.config.mts`, troque `include` por:

```ts
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", "tests/ajuda/**"],
```

E acrescente `"src/db/**"` ao `coverage.exclude`, porque esquema declarativo nao tem ramo para cobrir:

```ts
      exclude: ["src/db/**"],
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: ambiente validado, tipos marcados de id e drizzle-kit"
```

---

### Task 2: Esquema de organizacoes e usuarios

**Files:**
- Create: `src/db/schema/organizacoes.ts`
- Test: coberto pela Task 6, que aplica as migrations e verifica as restricoes

**Interfaces:**
- Consumes: nada
- Produces: tabelas `organizations`, `users`, `memberships` e o enum `papelEnum`

- [ ] **Step 1: Implementar o esquema**

Crie `src/db/schema/organizacoes.ts`:

```ts
import { relations } from "drizzle-orm";
import { pgEnum, pgTable, primaryKey, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

export const papelEnum = pgEnum("papel", ["dono", "membro"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  criadaEm: timestamp("criada_em", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    nome: text("nome").notNull(),
    /** Hash argon2id. Nunca a senha. Preenchido no plano de autenticacao. */
    senhaHash: text("senha_hash"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unico").on(t.email)],
);

export const memberships = pgTable(
  "memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    papel: papelEnum("papel").notNull().default("membro"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.orgId] })],
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  organizacao: one(organizations, {
    fields: [memberships.orgId],
    references: [organizations.id],
  }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema/organizacoes.ts
git commit -m "feat: esquema de organizacoes, usuarios e vinculos"
```

---

### Task 3: Esquema e carga dos regimes tributarios

**Files:**
- Create: `src/db/schema/tributos.ts`, `src/db/seed/regimes.ts`
- Test: `tests/unit/db/regimes-seed.test.ts`

**Interfaces:**
- Consumes: `RegimeTributario` do dominio
- Produces:
  - tabelas `regimes_tributarios`, `componentes_tributo`
  - `REGIMES_INICIAIS`: dados de carga com vigencia
  - `regimesParaDominio(linhas): RegimeTributario[]`

- [ ] **Step 1: Implementar o esquema**

Crie `src/db/schema/tributos.ts`:

```ts
import { relations } from "drizzle-orm";
import { check, date, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
```

- [ ] **Step 2: Escrever o teste da carga**

Crie `tests/unit/db/regimes-seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { regimeVigenteEm } from "@/features/simulacao/domain";
import { REGIMES_INICIAIS, regimesParaDominio } from "@/db/seed/regimes";

describe("carga inicial de regimes tributarios", () => {
  it("traz os cinco regimes da spec", () => {
    expect(REGIMES_INICIAIS.map((r) => r.id)).toEqual([
      "pf-receita-bruta-ate-2017",
      "pf-receita-bruta",
      "pf-folha",
      "pj-receita-bruta",
      "pj-folha",
    ]);
  });

  it("pessoa fisica sobre receita bruta soma 1,5%", () => {
    const pf = REGIMES_INICIAIS.find((r) => r.id === "pf-receita-bruta");
    const total = pf?.componentes.reduce((acc, c) => acc + Number(c.aliquota), 0);
    expect(total).toBeCloseTo(0.015, 10);
  });

  it("regime historico de pessoa fisica soma 2,3%", () => {
    const pf = REGIMES_INICIAIS.find((r) => r.id === "pf-receita-bruta-ate-2017");
    const total = pf?.componentes.reduce((acc, c) => acc + Number(c.aliquota), 0);
    expect(total).toBeCloseTo(0.023, 10);
  });

  it("pessoa juridica sobre receita bruta soma 2,05%", () => {
    const pj = REGIMES_INICIAIS.find((r) => r.id === "pj-receita-bruta");
    const total = pj?.componentes.reduce((acc, c) => acc + Number(c.aliquota), 0);
    expect(total).toBeCloseTo(0.0205, 10);
  });

  it("todo componente incide sobre a receita bruta nesta versao", () => {
    for (const regime of REGIMES_INICIAIS) {
      for (const componente of regime.componentes) {
        expect(componente.base).toBe("receita_bruta");
      }
    }
  });

  it("as vigencias de pessoa fisica sobre receita bruta nao se sobrepoem", () => {
    const dominio = regimesParaDominio(REGIMES_INICIAIS);
    const soPf = dominio.filter((r) => r.id.startsWith("pf-receita-bruta"));
    expect(regimeVigenteEm(soPf, new Date("2015-06-01T00:00:00Z"))?.id).toBe(
      "pf-receita-bruta-ate-2017",
    );
    expect(regimeVigenteEm(soPf, new Date("2026-08-19T00:00:00Z"))?.id).toBe("pf-receita-bruta");
  });

  it("converte para o tipo do dominio com Decimal e Date", () => {
    const dominio = regimesParaDominio(REGIMES_INICIAIS);
    const pf = dominio.find((r) => r.id === "pf-receita-bruta");
    expect(pf?.vigenciaInicio).toBeInstanceOf(Date);
    expect(pf?.vigenciaFim).toBeNull();
    expect(pf?.componentes[0]?.aliquota.toString()).toBe("0.012");
  });
});
```

- [ ] **Step 3: Rodar o teste para ver falhar**

Run: `npm test -- tests/unit/db/regimes-seed.test.ts`
Expected: FAIL com "Cannot find package '@/db/seed/regimes'".

- [ ] **Step 4: Implementar a carga**

Crie `src/db/seed/regimes.ts`:

```ts
import type { RegimeTributario } from "@/features/simulacao/domain";
import { dec } from "@/lib/money";

export interface ComponenteSemente {
  readonly nome: string;
  readonly aliquota: string;
  readonly base: "receita_bruta";
}

export interface RegimeSemente {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly vigenciaInicio: string;
  readonly vigenciaFim: string | null;
  readonly componentes: readonly ComponenteSemente[];
}

function comp(nome: string, aliquota: string): ComponenteSemente {
  return { nome, aliquota, base: "receita_bruta" };
}

/**
 * Contribuicao sobre a comercializacao da producao rural, o chamado Funrural.
 * Aliquota muda por legislacao, por isso ela e dado com vigencia e nao constante.
 * Estimativa: a ferramenta nao substitui orientacao contabil.
 */
export const REGIMES_INICIAIS: readonly RegimeSemente[] = [
  {
    id: "pf-receita-bruta-ate-2017",
    nome: "Pessoa fisica sobre a receita bruta, ate 2017",
    descricao: "Vigencia anterior a reducao da aliquota previdenciaria.",
    vigenciaInicio: "2001-01-01",
    vigenciaFim: "2017-12-31",
    componentes: [comp("Previdenciaria", "0.02"), comp("RAT", "0.001"), comp("SENAR", "0.002")],
  },
  {
    id: "pf-receita-bruta",
    nome: "Pessoa fisica sobre a receita bruta",
    descricao: "Produtor rural pessoa fisica que contribui sobre a comercializacao.",
    vigenciaInicio: "2018-01-01",
    vigenciaFim: null,
    componentes: [comp("Previdenciaria", "0.012"), comp("RAT", "0.001"), comp("SENAR", "0.002")],
  },
  {
    id: "pf-folha",
    nome: "Pessoa fisica optante pela folha de salarios",
    descricao: "Optou por contribuir sobre a folha. Sobre a venda resta apenas o SENAR.",
    vigenciaInicio: "2019-01-01",
    vigenciaFim: null,
    componentes: [comp("SENAR", "0.002")],
  },
  {
    id: "pj-receita-bruta",
    nome: "Pessoa juridica rural sobre a receita bruta",
    descricao: "Produtor rural pessoa juridica que contribui sobre a comercializacao.",
    vigenciaInicio: "2002-01-01",
    vigenciaFim: null,
    componentes: [comp("Previdenciaria", "0.017"), comp("RAT", "0.001"), comp("SENAR", "0.0025")],
  },
  {
    id: "pj-folha",
    nome: "Pessoa juridica optante pela folha de salarios",
    descricao: "Optou por contribuir sobre a folha. Sobre a venda resta apenas o SENAR.",
    vigenciaInicio: "2019-01-01",
    vigenciaFim: null,
    componentes: [comp("SENAR", "0.0025")],
  },
];

/** Converte a carga para o tipo que o dominio consome. */
export function regimesParaDominio(regimes: readonly RegimeSemente[]): RegimeTributario[] {
  return regimes.map((r) => ({
    id: r.id,
    nome: r.nome,
    vigenciaInicio: new Date(`${r.vigenciaInicio}T00:00:00Z`),
    vigenciaFim: r.vigenciaFim === null ? null : new Date(`${r.vigenciaFim}T00:00:00Z`),
    componentes: r.componentes.map((c) => ({
      nome: c.nome,
      aliquota: dec(c.aliquota),
      base: c.base,
    })),
  }));
}
```

- [ ] **Step 5: Rodar o teste**

Run: `npm test -- tests/unit/db/regimes-seed.test.ts`
Expected: PASS, 7 casos.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema/tributos.ts src/db/seed/regimes.ts tests/unit/db/regimes-seed.test.ts
git commit -m "feat: regimes tributarios com vigencia e carga inicial"
```

---

### Task 4: Esquema da simulacao, com as restricoes da spec

**Files:**
- Create: `src/db/schema/simulacao.ts`, `src/db/schema/resultados.ts`, `src/db/schema/compartilhamento.ts`, `src/db/schema/index.ts`

**Interfaces:**
- Consumes: `organizations` da Task 2, `regimesTributarios` da Task 3
- Produces: tabelas `simulacoes`, `ofertas`, `ajustes_oferta`, `resultados`, `compartilhamentos`, `rate_limit_hits`, e o barril `src/db/schema/index.ts`

- [ ] **Step 1: Implementar o esquema da simulacao**

Crie `src/db/schema/simulacao.ts`:

```ts
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
    check(
      "oferta_isento_sem_custo",
      sql`${t.freteModo} <> 'isento' or ${t.freteValor} = 0`,
    ),
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
```

Sobre `ajuste_valor_nao_negativo`: o sinal de um ajuste vem do `tipo`, nao do valor. Um desconto e um valor positivo do tipo `desconto_qualidade`. Permitir valor negativo criaria duas formas de expressar a mesma coisa e um caminho para desconto virar bonificacao por engano.

- [ ] **Step 2: Implementar o esquema de resultados**

Crie `src/db/schema/resultados.ts`:

```ts
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
```

- [ ] **Step 3: Implementar o esquema de compartilhamento e rate limit**

Crie `src/db/schema/compartilhamento.ts`:

```ts
import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
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
```

- [ ] **Step 4: Escrever o barril do esquema**

Crie `src/db/schema/index.ts`:

```ts
export * from "./compartilhamento";
export * from "./organizacoes";
export * from "./resultados";
export * from "./simulacao";
export * from "./tributos";
```

- [ ] **Step 5: Gerar as migrations**

```bash
npm run db:generate
```

Esperado: um arquivo SQL novo em `src/db/migrations/` e um `meta/_journal.json`. Abra o SQL e confirme que os `check` aparecem, em especial `oferta_quebra_faixa`, `oferta_rendimento_faixa` e `oferta_km_exigido_no_modo_por_km`.

- [ ] **Step 6: Verificar tipos e lint**

```bash
npm run typecheck && npm run check
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: esquema de simulacao, ofertas, resultados e compartilhamento"
```

---

### Task 5: Banco de teste com PGlite

**Files:**
- Create: `tests/ajuda/banco.ts`
- Test: `tests/integracao/migracoes.test.ts`

**Interfaces:**
- Consumes: migrations da Task 4
- Produces: `criarBancoDeTeste(): Promise<BancoDeTeste>` com `{ db, fechar }`

- [ ] **Step 1: Escrever a ajuda de teste**

Crie `tests/ajuda/banco.ts`:

```ts
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
 * Roda as mesmas migrations da producao, entao os `check` da spec sao exercitados
 * sem rede e sem credencial.
 */
export async function criarBancoDeTeste(): Promise<BancoDeTeste> {
  const cliente = new PGlite();
  const db = drizzle(cliente, { schema });
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  return { db, fechar: () => cliente.close() };
}
```

- [ ] **Step 2: Escrever o teste que prova que as restricoes existem**

Crie `tests/integracao/migracoes.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { organizations, regimesTributarios, simulacoes, ofertas } from "@/db/schema";
import { REGIMES_INICIAIS } from "@/db/seed/regimes";
import { type BancoDeTeste, criarBancoDeTeste } from "../ajuda/banco";

let banco: BancoDeTeste;
let orgId: string;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  const [org] = await banco.db
    .insert(organizations)
    .values({ nome: "Fazenda Teste" })
    .returning();
  if (org === undefined) throw new Error("organizacao nao criada");
  orgId = org.id;

  const semente = REGIMES_INICIAIS[1];
  if (semente === undefined) throw new Error("regime de semente ausente");
  await banco.db.insert(regimesTributarios).values({
    id: semente.id,
    nome: semente.nome,
    descricao: semente.descricao,
    vigenciaInicio: semente.vigenciaInicio,
    vigenciaFim: semente.vigenciaFim,
  });
});

afterAll(async () => {
  await banco.fechar();
});

async function novaSimulacao(): Promise<string> {
  const [sim] = await banco.db
    .insert(simulacoes)
    .values({
      orgId,
      nome: "Lote de teste",
      cabecas: 40,
      pesoVivoMedioKg: "480",
      categoriaAnimal: "boi",
      taxaDescontoAnual: "0.12",
      regimeTributarioId: "pf-receita-bruta",
    })
    .returning();
  if (sim === undefined) throw new Error("simulacao nao criada");
  return sim.id;
}

function ofertaBase(simulacaoId: string) {
  return {
    orgId,
    simulacaoId,
    comprador: "Frigorifico A",
    precoArroba: "320",
    rendimentoAcordado: "0.52",
    quebraPct: "0.04",
    prazoDias: 30,
    freteModo: "por_km" as const,
    freteValor: "4",
    kmRodados: "240",
    comissaoPct: "0.01",
  };
}

describe("restricoes do esquema", () => {
  it("aceita uma oferta valida", async () => {
    const simulacaoId = await novaSimulacao();
    const [oferta] = await banco.db.insert(ofertas).values(ofertaBase(simulacaoId)).returning();
    expect(oferta?.comprador).toBe("Frigorifico A");
  });

  it("recusa rendimento abaixo de 0.4", async () => {
    const simulacaoId = await novaSimulacao();
    await expect(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), rendimentoAcordado: "0.39" }),
    ).rejects.toThrow();
  });

  it("recusa rendimento acima de 0.65", async () => {
    const simulacaoId = await novaSimulacao();
    await expect(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), rendimentoAcordado: "0.66" }),
    ).rejects.toThrow();
  });

  it("recusa quebra acima de 0.1", async () => {
    const simulacaoId = await novaSimulacao();
    await expect(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), quebraPct: "0.11" }),
    ).rejects.toThrow();
  });

  it("recusa quebra negativa", async () => {
    const simulacaoId = await novaSimulacao();
    await expect(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), quebraPct: "-0.01" }),
    ).rejects.toThrow();
  });

  it("recusa frete por km sem quilometragem", async () => {
    const simulacaoId = await novaSimulacao();
    await expect(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), kmRodados: null }),
    ).rejects.toThrow();
  });

  it("recusa frete isento com custo diferente de zero", async () => {
    const simulacaoId = await novaSimulacao();
    await expect(
      banco.db.insert(ofertas).values({
        ...ofertaBase(simulacaoId),
        freteModo: "isento",
        freteValor: "50",
        kmRodados: null,
      }),
    ).rejects.toThrow();
  });

  it("recusa lote sem cabeca", async () => {
    await expect(
      banco.db.insert(simulacoes).values({
        orgId,
        nome: "Lote vazio",
        cabecas: 0,
        pesoVivoMedioKg: "480",
        categoriaAnimal: "boi",
        taxaDescontoAnual: "0.12",
        regimeTributarioId: "pf-receita-bruta",
      }),
    ).rejects.toThrow();
  });

  it("recusa prazo negativo", async () => {
    const simulacaoId = await novaSimulacao();
    await expect(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), prazoDias: -1 }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Rodar o teste**

Run: `npm test -- tests/integracao/migracoes.test.ts`
Expected: PASS, 9 casos. Se algum `rejects.toThrow` falhar, a restricao nao chegou na migration. Volte ao esquema, nao ao teste.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: banco de teste com pglite e restricoes do esquema exercitadas"
```

---

### Task 6: Mapeadores entre banco e dominio

**Files:**
- Create: `src/features/simulacao/data/mapeadores.ts`
- Test: `tests/unit/data/mapeadores.test.ts`

**Interfaces:**
- Consumes: tipos do dominio e tipos inferidos do esquema
- Produces:
  - `linhaParaLote(linha): Lote`
  - `linhaParaOferta(oferta, ajustes): OfertaEntrada`
  - `linhaParaRegime(regime, componentes): RegimeTributario`
  - `resultadoParaLinha(orgId, ofertaId, resultado): InsertResultado`

- [ ] **Step 1: Escrever o teste**

Crie `tests/unit/data/mapeadores.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  linhaParaLote,
  linhaParaOferta,
  linhaParaRegime,
  resultadoParaLinha,
} from "@/features/simulacao/data/mapeadores";
import { calcularOferta } from "@/features/simulacao/domain";
import { dec } from "@/lib/money";
import { comoOrgId } from "@/lib/ids";

const linhaSimulacao = {
  cabecas: 40,
  pesoVivoMedioKg: "480.0000",
  taxaDescontoAnual: "0.1200",
};

const linhaOferta = {
  comprador: "Frigorifico A",
  precoArroba: "320.0000",
  rendimentoAcordado: "0.5200",
  quebraPct: "0.0400",
  prazoDias: 30,
  freteModo: "por_km" as const,
  freteValor: "4.0000",
  kmRodados: "240.0000",
  comissaoPct: "0.0100",
};

const linhaRegime = {
  id: "pf-receita-bruta",
  nome: "Pessoa fisica",
  vigenciaInicio: "2018-01-01",
  vigenciaFim: null,
};

const linhasComponentes = [
  { nome: "Previdenciaria", aliquota: "0.0120", base: "receita_bruta" as const },
  { nome: "RAT", aliquota: "0.0010", base: "receita_bruta" as const },
  { nome: "SENAR", aliquota: "0.0020", base: "receita_bruta" as const },
];

describe("linhaParaLote", () => {
  it("converte numeric em Decimal sem passar por number", () => {
    const lote = linhaParaLote(linhaSimulacao);
    expect(lote.cabecas).toBe(40);
    expect(lote.pesoVivoMedioKg.toString()).toBe("480");
  });
});

describe("linhaParaOferta", () => {
  it("converte todos os campos numericos em Decimal", () => {
    const oferta = linhaParaOferta(linhaOferta, []);
    expect(oferta.precoArroba.toString()).toBe("320");
    expect(oferta.quebraPct.toString()).toBe("0.04");
    expect(oferta.kmRodados?.toString()).toBe("240");
    expect(oferta.ajustes).toEqual([]);
  });

  it("mantem km rodados nulo quando o modo nao e por km", () => {
    const oferta = linhaParaOferta({ ...linhaOferta, freteModo: "isento", kmRodados: null }, []);
    expect(oferta.kmRodados).toBeNull();
  });

  it("converte ajustes preservando tipo e modo", () => {
    const oferta = linhaParaOferta(linhaOferta, [
      { nome: "precoce", tipo: "bonificacao", modo: "valor_por_arroba", valor: "4.0000" },
    ]);
    expect(oferta.ajustes[0]?.tipo).toBe("bonificacao");
    expect(oferta.ajustes[0]?.valor.toString()).toBe("4");
  });
});

describe("linhaParaRegime", () => {
  it("converte data de vigencia e aliquotas", () => {
    const regime = linhaParaRegime(linhaRegime, linhasComponentes);
    expect(regime.vigenciaInicio.toISOString()).toBe("2018-01-01T00:00:00.000Z");
    expect(regime.vigenciaFim).toBeNull();
    expect(regime.componentes).toHaveLength(3);
    expect(regime.componentes[0]?.aliquota.toString()).toBe("0.012");
  });

  it("converte vigencia fechada", () => {
    const regime = linhaParaRegime({ ...linhaRegime, vigenciaFim: "2017-12-31" }, []);
    expect(regime.vigenciaFim?.toISOString()).toBe("2017-12-31T00:00:00.000Z");
  });
});

describe("resultadoParaLinha", () => {
  it("grava o snapshot com a versao de calculo e valores em string", () => {
    const resultado = calcularOferta({
      lote: linhaParaLote(linhaSimulacao),
      oferta: linhaParaOferta(linhaOferta, []),
      regime: linhaParaRegime(linhaRegime, linhasComponentes),
      taxaDescontoAnual: dec("0.12"),
    });
    const linha = resultadoParaLinha(comoOrgId("org-1"), "of-1", resultado);
    expect(linha.versaoCalculo).toBe("1.0.0");
    expect(linha.receitaBruta).toBe("5111.8080");
    expect(linha.receitaLiquida).toBe("4960.0128");
    expect(typeof linha.valorPresente).toBe("string");
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `npm test -- tests/unit/data/mapeadores.test.ts`
Expected: FAIL com "Cannot find package '@/features/simulacao/data/mapeadores'".

- [ ] **Step 3: Implementar os mapeadores**

Crie `src/features/simulacao/data/mapeadores.ts`:

```ts
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

/** Snapshot do calculo, com valores serializados no formato da coluna numeric(14,4). */
export function resultadoParaLinha(orgId: OrgId, ofertaId: string, r: ResultadoOferta) {
  return {
    orgId: orgId as string,
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
```

- [ ] **Step 4: Rodar o teste**

Run: `npm test -- tests/unit/data/mapeadores.test.ts`
Expected: PASS, 7 casos.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulacao/data/mapeadores.ts tests/unit/data/mapeadores.test.ts
git commit -m "feat: mapeadores entre linha de banco e tipo de dominio"
```

---

### Task 7: Repositorios com escopo de organizacao

**Files:**
- Create: `src/features/simulacao/data/simulacoes.ts`
- Test: coberto pela Task 8

**Interfaces:**
- Consumes: esquema, mapeadores, `OrgId`
- Produces:
  - `criarSimulacao(db, orgId, dados): Promise<SimulacaoId>`
  - `buscarSimulacao(db, orgId, id): Promise<SimulacaoCompleta | null>`
  - `listarSimulacoes(db, orgId): Promise<ResumoSimulacao[]>`
  - `apagarSimulacao(db, orgId, id): Promise<boolean>`
  - `renomearSimulacao(db, orgId, id, nome): Promise<boolean>`

- [ ] **Step 1: Implementar o repositorio**

Crie `src/features/simulacao/data/simulacoes.ts`:

```ts
import { and, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { ajustesOferta, ofertas, simulacoes } from "@/db/schema";
import type { OrgId, SimulacaoId } from "@/lib/ids";
import { comoSimulacaoId } from "@/lib/ids";
import {
  type LinhaAjuste,
  type LinhaOferta,
  type LinhaSimulacao,
  linhaParaLote,
  linhaParaOferta,
} from "./mapeadores";

// biome-ignore lint/suspicious/noExplicitAny: o tipo generico do drizzle varia por driver
type Banco = PgDatabase<any, any, any>;

export interface DadosNovaSimulacao {
  readonly nome: string;
  readonly cabecas: number;
  readonly pesoVivoMedioKg: string;
  readonly categoriaAnimal: "boi" | "novilho" | "novilha" | "vaca" | "touro";
  readonly taxaDescontoAnual: string;
  readonly regimeTributarioId: string;
}

export interface ResumoSimulacao {
  readonly id: SimulacaoId;
  readonly nome: string;
  readonly cabecas: number;
  readonly atualizadaEm: Date;
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
    .values({ ...dados, orgId: orgId as string })
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
    .where(eq(simulacoes.orgId, orgId as string));
  return linhas.map((l) => ({
    id: comoSimulacaoId(l.id),
    nome: l.nome,
    cabecas: l.cabecas,
    atualizadaEm: l.atualizadaEm,
  }));
}

export interface SimulacaoCompleta {
  readonly id: SimulacaoId;
  readonly nome: string;
  readonly regimeTributarioId: string;
  readonly lote: ReturnType<typeof linhaParaLote>;
  readonly taxaDescontoAnual: string;
  readonly ofertas: readonly ReturnType<typeof linhaParaOferta>[];
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
    .where(and(eq(simulacoes.id, id as string), eq(simulacoes.orgId, orgId as string)));
  if (linha === undefined) {
    return null;
  }

  const linhasOferta = await db
    .select()
    .from(ofertas)
    .where(and(eq(ofertas.simulacaoId, id as string), eq(ofertas.orgId, orgId as string)));

  const ofertasCompletas = [];
  for (const o of linhasOferta) {
    const ajustes = await db
      .select({
        nome: ajustesOferta.nome,
        tipo: ajustesOferta.tipo,
        modo: ajustesOferta.modo,
        valor: ajustesOferta.valor,
      })
      .from(ajustesOferta)
      .where(and(eq(ajustesOferta.ofertaId, o.id), eq(ajustesOferta.orgId, orgId as string)));
    ofertasCompletas.push(linhaParaOferta(o as LinhaOferta, ajustes as LinhaAjuste[]));
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
export async function apagarSimulacao(
  db: Banco,
  orgId: OrgId,
  id: SimulacaoId,
): Promise<boolean> {
  const apagadas = await db
    .delete(simulacoes)
    .where(and(eq(simulacoes.id, id as string), eq(simulacoes.orgId, orgId as string)))
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
    .where(and(eq(simulacoes.id, id as string), eq(simulacoes.orgId, orgId as string)))
    .returning({ id: simulacoes.id });
  return alteradas.length > 0;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/features/simulacao/data/simulacoes.ts
git commit -m "feat: repositorio de simulacoes com escopo de organizacao obrigatorio"
```

---

### Task 8: Teste de isolamento entre organizacoes

**Files:**
- Test: `tests/integracao/isolamento-multitenant.test.ts`

**Interfaces:**
- Consumes: repositorio da Task 7, banco de teste da Task 5
- Produces: a prova exigida pelos criterios de aceite

- [ ] **Step 1: Escrever o teste**

Crie `tests/integracao/isolamento-multitenant.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { organizations, regimesTributarios } from "@/db/schema";
import { REGIMES_INICIAIS } from "@/db/seed/regimes";
import {
  apagarSimulacao,
  buscarSimulacao,
  criarSimulacao,
  listarSimulacoes,
  renomearSimulacao,
} from "@/features/simulacao/data/simulacoes";
import { type OrgId, comoOrgId, comoSimulacaoId } from "@/lib/ids";
import { type BancoDeTeste, criarBancoDeTeste } from "../ajuda/banco";

let banco: BancoDeTeste;
let orgA: OrgId;
let orgB: OrgId;
let simulacaoDeA: ReturnType<typeof comoSimulacaoId>;

beforeAll(async () => {
  banco = await criarBancoDeTeste();

  const semente = REGIMES_INICIAIS[1];
  if (semente === undefined) throw new Error("regime de semente ausente");
  await banco.db.insert(regimesTributarios).values({
    id: semente.id,
    nome: semente.nome,
    descricao: semente.descricao,
    vigenciaInicio: semente.vigenciaInicio,
    vigenciaFim: semente.vigenciaFim,
  });

  const criadas = await banco.db
    .insert(organizations)
    .values([{ nome: "Fazenda A" }, { nome: "Fazenda B" }])
    .returning();
  const [a, b] = criadas;
  if (a === undefined || b === undefined) throw new Error("organizacoes nao criadas");
  orgA = comoOrgId(a.id);
  orgB = comoOrgId(b.id);

  simulacaoDeA = await criarSimulacao(banco.db, orgA, {
    nome: "Boiada de setembro",
    cabecas: 40,
    pesoVivoMedioKg: "480",
    categoriaAnimal: "boi",
    taxaDescontoAnual: "0.12",
    regimeTributarioId: "pf-receita-bruta",
  });
});

afterAll(async () => {
  await banco.fechar();
});

describe("isolamento entre organizacoes", () => {
  it("a organizacao dona le a propria simulacao", async () => {
    const encontrada = await buscarSimulacao(banco.db, orgA, simulacaoDeA);
    expect(encontrada?.nome).toBe("Boiada de setembro");
  });

  it("outra organizacao nao le a simulacao, e recebe nao encontrado", async () => {
    const encontrada = await buscarSimulacao(banco.db, orgB, simulacaoDeA);
    expect(encontrada).toBeNull();
  });

  it("outra organizacao nao ve a simulacao na listagem", async () => {
    const deB = await listarSimulacoes(banco.db, orgB);
    expect(deB).toEqual([]);
    const deA = await listarSimulacoes(banco.db, orgA);
    expect(deA).toHaveLength(1);
  });

  it("outra organizacao nao renomeia a simulacao", async () => {
    const alterou = await renomearSimulacao(banco.db, orgB, simulacaoDeA, "Sequestrada");
    expect(alterou).toBe(false);
    const aindaDeA = await buscarSimulacao(banco.db, orgA, simulacaoDeA);
    expect(aindaDeA?.nome).toBe("Boiada de setembro");
  });

  it("outra organizacao nao apaga a simulacao", async () => {
    const apagou = await apagarSimulacao(banco.db, orgB, simulacaoDeA);
    expect(apagou).toBe(false);
    const aindaExiste = await buscarSimulacao(banco.db, orgA, simulacaoDeA);
    expect(aindaExiste).not.toBeNull();
  });

  it("a organizacao dona consegue apagar", async () => {
    const idDescartavel = await criarSimulacao(banco.db, orgA, {
      nome: "Para apagar",
      cabecas: 10,
      pesoVivoMedioKg: "450",
      categoriaAnimal: "vaca",
      taxaDescontoAnual: "0.1",
      regimeTributarioId: "pf-receita-bruta",
    });
    expect(await apagarSimulacao(banco.db, orgA, idDescartavel)).toBe(true);
    expect(await buscarSimulacao(banco.db, orgA, idDescartavel)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste**

Run: `npm test -- tests/integracao/isolamento-multitenant.test.ts`
Expected: PASS, 6 casos.

- [ ] **Step 3: Commit**

```bash
git add tests/integracao/isolamento-multitenant.test.ts
git commit -m "test: isolamento entre organizacoes em leitura, escrita e remocao"
```

---

### Task 9: Fechar o plano com verificacao real

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rodar a suite inteira com cobertura**

Run: `npm run test:cov`
Expected: PASS. A cobertura de 100% continua valendo para `src/features/**/domain/**` e `src/lib/**`. `src/db/**` esta fora do recorte porque esquema declarativo nao tem ramo para cobrir.

- [ ] **Step 2: Verificar o dominio intacto**

Run: `npm test -- tests/unit/domain/isolamento.test.ts`
Expected: PASS. Nenhum arquivo do dominio pode ter ganhado import de Drizzle nesta etapa.

- [ ] **Step 3: Rodar tipos, lint e build**

```bash
npm run typecheck && npm run check && npm run build
```

- [ ] **Step 4: Confirmar que nenhum segredo entrou**

```bash
git log --all --name-only --pretty=format: | sort -u | grep -E '^\.env' && echo "ALERTA" || echo "historico limpo"
```

- [ ] **Step 5: Atualizar a secao de estado do README**

Em `README.md`, troque a secao `## Estado` por:

```markdown
## Estado

Dominio de calculo pronto e testado. Esquema de banco, migrations, carga dos regimes
tributarios e isolamento entre organizacoes prontos e testados contra Postgres.
Autenticacao e interface ainda nao.

Os testes de banco rodam contra PGlite, que e Postgres compilado para WASM em memoria.
Producao usa Neon. As migrations sao as mesmas nos dois, entao os `check` do esquema
sao exercitados de verdade nos testes, sem rede e sem credencial.
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: estado do projeto apos persistencia e isolamento"
```

---

## Definicao de pronto deste plano

Cole a saida real destes comandos antes de declarar concluido.

```bash
npm run test:cov
npm run typecheck
npm run check
npm run build
```

Criterios:

- Todos os testes passam, incluindo os de integracao contra PGlite.
- Teste de isolamento entre organizacoes passando em leitura, listagem, renomeacao e remocao.
- As restricoes da spec existem na migration e sao exercitadas: faixa de rendimento, faixa de quebra, km obrigatorio no modo por km, isento sem custo.
- Cobertura de 100% mantida em dominio e `lib`.
- `tests/unit/domain/isolamento.test.ts` continua verde: o dominio nao ganhou dependencia de banco.
- Build limpo, sem `any` implicito.
- Nenhum segredo no historico.

## O que vem depois

Plano 3, autenticacao: Auth.js v5 com Credentials, hash argon2id, sessao por JWT,
vinculo de usuario com organizacao, e o fluxo de importar o rascunho anonimo ao entrar.

Plano 4, interface e compartilhamento: plano de design com autocritica escrita,
formulario de oferta, tabela comparativa com reordenacao ao vivo, cascata de deducoes,
rota publica com token opaco, favicon, OG dinamico e deploy.
