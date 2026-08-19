# Fundacao e Dominio Puro: plano de implementacao

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a biblioteca de calculo do simulador de venda de gado, pura e 100% testada, capaz de transformar um lote e uma lista de ofertas em um ranking por valor presente liquido por cabeca, sem UI e sem banco.

**Architecture:** TypeScript puro em `src/features/simulacao/domain/`, sem import de Next, de Drizzle ou de React. Toda aritmetica em `decimal.js`, arredondamento apenas na exibicao. As mesmas funcoes rodarao no navegador e no servidor nos planos seguintes, o que elimina a divergencia entre o numero da tela e o numero gravado.

**Tech Stack:** Next.js 15 (App Router), TypeScript estrito com `noUncheckedIndexedAccess`, `decimal.js`, Vitest, Biome, Tailwind CSS v4 (scaffold apenas, sem uso neste plano).

**Spec:** `docs/superpowers/specs/2026-08-19-simulador-venda-gado-design.md`

## Global Constraints

- Nao usar travessao em codigo, README, comentarios ou interface. Vale para toda string, todo comentario e toda mensagem de commit.
- Vocabulario de curral: cabeca, arroba, quebra, rendimento, prazo, frete. Identificadores em portugues sem acento.
- `decimal.js` em toda a cadeia. Nenhum operador aritmetico nativo (`+`, `-`, `*`, `/`) sobre valor monetario, de peso ou de percentual.
- Arredondamento so na exibicao, nunca em passo intermediario.
- Constante 15 kg por arroba vive apenas em `src/lib/units.ts`. Nenhum outro arquivo escreve o literal 15 com esse significado.
- TypeScript estrito com `noUncheckedIndexedAccess: true`. Nenhum `any` implicito ou explicito.
- Base de calculo do tributo e a `receita_bruta`, nao a `receita_ajustada`. Isso diverge do documento de origem de proposito.
- O dominio importa apenas de `src/lib/money.ts` e `src/lib/units.ts`. Nada mais.
- Toda funcao do dominio e pura: sem IO, sem `Date.now()`, sem leitura de ambiente. A data de vigencia entra como parametro.
- Commits frequentes, um por tarefa no minimo.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/units.ts` | `KG_POR_ARROBA` e conversao de kg para arrobas |
| `src/lib/money.ts` | configuracao do `decimal.js`, helpers `dec` e `soma` |
| `src/features/simulacao/domain/tipos.ts` | tipos compartilhados do dominio |
| `src/features/simulacao/domain/peso.ts` | quebra, rendimento, arrobas |
| `src/features/simulacao/domain/receita.ts` | bruta, bonificacoes, descontos, ajustada |
| `src/features/simulacao/domain/tributos.ts` | regime vigente e composicao da aliquota |
| `src/features/simulacao/domain/logistica.ts` | frete por cabeca, por km, isento |
| `src/features/simulacao/domain/valor-presente.ts` | taxa diaria e valor presente |
| `src/features/simulacao/domain/calculo.ts` | orquestra a cadeia e exporta `VERSAO_CALCULO` |
| `src/features/simulacao/domain/comparador.ts` | ranking e diferenca entre ofertas |
| `src/features/simulacao/domain/index.ts` | superficie publica |

`tipos.ts` e `calculo.ts` nao aparecem na tabela de modulos da spec. Foram acrescentados aqui: `tipos.ts` porque os modulos compartilham as mesmas formas de dado, e `calculo.ts` porque a spec descreve a cadeia completa mas nao nomeia o arquivo que a compoe. `comparador.ts` fica com ranking apenas, como a spec define.

---

### Task 1: Scaffold do projeto e trilho de teste

**Files:**
- Move: `03-simulador-venda-gado.md` para `docs/03-simulador-venda-gado.md`
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `biome.json`, `vitest.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx` (gerados pelo scaffold)
- Test: `tests/unit/sanidade.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `npm test`, `npm run build`, `npm run check`. Alias `@/*` apontando para `src/*`.

- [ ] **Step 1: Mover o documento de origem para fora da raiz**

`create-next-app` recusa diretorio que contenha arquivo fora da sua lista de conflitos conhecidos. `docs/` ja e tolerado, o arquivo solto na raiz nao.

```bash
git mv 03-simulador-venda-gado.md docs/03-simulador-venda-gado.md
```

- [ ] **Step 2: Rodar o scaffold**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint --turbopack --yes
```

Esperado: `package.json`, `src/app/` e `tsconfig.json` criados. O scaffold sobrescreve `.gitignore`; o proximo passo restaura as regras que protegem `.env`.

- [ ] **Step 3: Restaurar o .gitignore com protecao de segredo**

O `.gitignore` do commit inicial protege `.env*` e o scaffold o substituiu. Restaure a versao versionada e confirme que ela ainda cobre segredo.

```bash
git checkout -- .gitignore
grep -q '^\.env\.\*$' .gitignore && grep -q '^!\.env\.example$' .gitignore && echo "gitignore protege .env"
```

Esperado: `gitignore protege .env`

- [ ] **Step 4: Instalar as dependencias deste plano**

```bash
npm install decimal.js
npm install -D vitest @vitest/coverage-v8 @biomejs/biome
```

- [ ] **Step 5: Endurecer o tsconfig**

Abra `tsconfig.json` e garanta que `compilerOptions` contenha estas chaves com estes valores. Mantenha o restante que o scaffold gerou.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 6: Configurar o Vitest**

Crie `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/features/**/domain/**", "src/lib/**"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
```

A cobertura de 100% vale apenas para o dominio e para `src/lib`, que e onde a spec exige rigor. O resto do projeto fica fora do recorte de proposito.

- [ ] **Step 7: Configurar o Biome**

O bloco abaixo usa o esquema do Biome 2, onde a chave e `files.includes` com array de globs. Se `npx biome --version` devolver 1.x, a chave equivalente e `files.include` e o `$schema` aponta para `1.9.4`. Confira a versao instalada antes de colar.

Crie `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "files": { "includes": ["src/**", "tests/**"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "error" }
    }
  }
}
```

- [ ] **Step 8: Registrar os scripts**

Em `package.json`, garanta que `scripts` contenha:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "check": "biome check src tests",
    "check:fix": "biome check --write src tests",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 9: Escrever o teste de sanidade**

Crie `tests/unit/sanidade.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";

describe("trilho de teste", () => {
  it("roda o vitest e enxerga o decimal.js", () => {
    expect(new Decimal("0.1").plus("0.2").toString()).toBe("0.3");
  });
});
```

O caso escolhido nao e decorativo: `0.1 + 0.2` em ponto flutuante nativo devolve `0.30000000000000004`. O teste prova que a biblioteca esta de fato no caminho.

- [ ] **Step 10: Rodar o teste**

Run: `npm test`
Expected: PASS, 1 teste.

- [ ] **Step 11: Verificar build, tipos e lint**

```bash
npm run typecheck && npm run build && npm run check
```

Esperado: os tres passam sem erro. Se o Biome reclamar de formatacao nos arquivos do scaffold, rode `npm run check:fix` e repita.

- [ ] **Step 12: Confirmar que nenhum segredo entrou**

```bash
git status --porcelain | grep -E '\.env' && echo "ALERTA: env rastreado" || echo "nenhum env rastreado"
```

Esperado: `nenhum env rastreado`

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold next 15, typescript estrito, vitest e biome"
```

---

### Task 2: Fundacao numerica em lib

**Files:**
- Create: `src/lib/money.ts`
- Create: `src/lib/units.ts`
- Test: `tests/unit/lib/money.test.ts`, `tests/unit/lib/units.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `dec(v: Decimal.Value): Decimal`
  - `soma(valores: readonly Decimal[]): Decimal`
  - `ZERO: Decimal`
  - `Decimal` reexportado ja configurado
  - `KG_POR_ARROBA: Decimal`
  - `kgParaArrobas(kg: Decimal): Decimal`

- [ ] **Step 1: Escrever os testes falhos**

Crie `tests/unit/lib/money.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dec, soma, ZERO } from "@/lib/money";

describe("dec", () => {
  it("aceita string e preserva a precisao decimal", () => {
    expect(dec("320.1234").toString()).toBe("320.1234");
  });

  it("aceita numero", () => {
    expect(dec(15).toString()).toBe("15");
  });

  it("nao acumula erro de ponto flutuante ao somar", () => {
    expect(dec("0.1").plus(dec("0.2")).toString()).toBe("0.3");
  });
});

describe("soma", () => {
  it("soma uma lista de valores", () => {
    expect(soma([dec("1.5"), dec("2.25"), dec("0.25")]).toString()).toBe("4");
  });

  it("devolve zero para lista vazia", () => {
    expect(soma([]).toString()).toBe("0");
  });
});

describe("ZERO", () => {
  it("e zero", () => {
    expect(ZERO.isZero()).toBe(true);
  });
});
```

Crie `tests/unit/lib/units.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dec } from "@/lib/money";
import { KG_POR_ARROBA, kgParaArrobas } from "@/lib/units";

describe("KG_POR_ARROBA", () => {
  it("vale 15 kg", () => {
    expect(KG_POR_ARROBA.toString()).toBe("15");
  });
});

describe("kgParaArrobas", () => {
  it("converte 15 kg em uma arroba", () => {
    expect(kgParaArrobas(dec(15)).toString()).toBe("1");
  });

  it("converte 239.616 kg de carcaca em 15.9744 arrobas", () => {
    expect(kgParaArrobas(dec("239.616")).toString()).toBe("15.9744");
  });

  it("converte zero em zero", () => {
    expect(kgParaArrobas(dec(0)).toString()).toBe("0");
  });
});
```

- [ ] **Step 2: Rodar os testes para ver falhar**

Run: `npm test`
Expected: FAIL com "Failed to resolve import @/lib/money" e "@/lib/units".

- [ ] **Step 3: Implementar money.ts**

Crie `src/lib/money.ts`:

```ts
import Decimal from "decimal.js";

// Precisao alta no meio da cadeia, arredondamento so na exibicao.
// 28 digitos significativos cobrem com folga lote, peso, preco e potencia de taxa diaria.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export const ZERO = new Decimal(0);

export function dec(valor: Decimal.Value): Decimal {
  return new Decimal(valor);
}

export function soma(valores: readonly Decimal[]): Decimal {
  return valores.reduce((total, valor) => total.plus(valor), ZERO);
}
```

- [ ] **Step 4: Implementar units.ts**

Crie `src/lib/units.ts`:

```ts
import { type Decimal, dec } from "@/lib/money";

/** Uma arroba equivale a 15 kg de carcaca. Unico lugar do projeto que declara isso. */
export const KG_POR_ARROBA = dec(15);

export function kgParaArrobas(kg: Decimal): Decimal {
  return kg.dividedBy(KG_POR_ARROBA);
}
```

- [ ] **Step 5: Rodar os testes**

Run: `npm test`
Expected: PASS, todos os casos de `money` e `units`.

- [ ] **Step 6: Commit**

```bash
git add src/lib tests/unit/lib
git commit -m "feat: fundacao numerica com decimal.js e conversao de arroba"
```

---

### Task 3: Tipos do dominio

**Files:**
- Create: `src/features/simulacao/domain/tipos.ts`
- Test: `tests/unit/domain/tipos.test.ts`

**Interfaces:**
- Consumes: `Decimal` de `@/lib/money`
- Produces: `FreteModo`, `AjusteTipo`, `AjusteModo`, `Ajuste`, `Lote`, `OfertaEntrada`, `ComponenteTributo`, `RegimeTributario`, `ResultadoOferta`, e os guardas `FRETE_MODOS`, `AJUSTE_TIPOS`, `AJUSTE_MODOS`.

- [ ] **Step 1: Escrever o teste falho**

Um arquivo so de tipos nao tem comportamento para testar, mas as listas de valores tem, e elas serao a fonte dos enums do banco e dos schemas Zod no plano 2. Testar que existem e estao completas evita divergencia depois.

Crie `tests/unit/domain/tipos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AJUSTE_MODOS, AJUSTE_TIPOS, FRETE_MODOS } from "@/features/simulacao/domain/tipos";

describe("listas de valores do dominio", () => {
  it("tem exatamente os tres modos de frete da spec", () => {
    expect([...FRETE_MODOS]).toEqual(["por_cabeca", "por_km", "isento"]);
  });

  it("separa bonificacao, desconto de qualidade e outra deducao", () => {
    expect([...AJUSTE_TIPOS]).toEqual(["bonificacao", "desconto_qualidade", "outra_deducao"]);
  });

  it("tem os tres modos de ajuste da spec", () => {
    expect([...AJUSTE_MODOS]).toEqual(["percentual", "valor_por_cabeca", "valor_por_arroba"]);
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `npm test -- tests/unit/domain/tipos.test.ts`
Expected: FAIL com "Failed to resolve import".

- [ ] **Step 3: Implementar tipos.ts**

Crie `src/features/simulacao/domain/tipos.ts`:

```ts
import type { Decimal } from "@/lib/money";

export const FRETE_MODOS = ["por_cabeca", "por_km", "isento"] as const;
export type FreteModo = (typeof FRETE_MODOS)[number];

export const AJUSTE_TIPOS = ["bonificacao", "desconto_qualidade", "outra_deducao"] as const;
export type AjusteTipo = (typeof AJUSTE_TIPOS)[number];

export const AJUSTE_MODOS = ["percentual", "valor_por_cabeca", "valor_por_arroba"] as const;
export type AjusteModo = (typeof AJUSTE_MODOS)[number];

/** Bonificacao, desconto de qualidade ou outra deducao de uma oferta. */
export interface Ajuste {
  readonly nome: string;
  readonly tipo: AjusteTipo;
  readonly modo: AjusteModo;
  /** Fracao decimal quando o modo e percentual (0.02 vale 2%), reais nos demais. */
  readonly valor: Decimal;
}

/** O lote que esta a venda. Uma simulacao tem um lote. */
export interface Lote {
  readonly cabecas: number;
  readonly pesoVivoMedioKg: Decimal;
}

/** Uma proposta de comprador, com os parametros que ela negocia. */
export interface OfertaEntrada {
  readonly comprador: string;
  readonly precoArroba: Decimal;
  /** Fracao decimal entre 0.4 e 0.65. */
  readonly rendimentoAcordado: Decimal;
  /** Fracao decimal entre 0 e 0.1. Obrigatoria, sem valor padrao. */
  readonly quebraPct: Decimal;
  readonly prazoDias: number;
  readonly freteModo: FreteModo;
  readonly freteValor: Decimal;
  /** Quilometragem cobrada pela transportadora. Obrigatoria quando o modo e por_km. */
  readonly kmRodados: Decimal | null;
  /** Fracao decimal. Incide sobre a receita bruta. */
  readonly comissaoPct: Decimal;
  readonly ajustes: readonly Ajuste[];
}

export interface ComponenteTributo {
  readonly nome: string;
  readonly aliquota: Decimal;
  readonly base: "receita_bruta";
}

export interface RegimeTributario {
  readonly id: string;
  readonly nome: string;
  readonly vigenciaInicio: Date;
  readonly vigenciaFim: Date | null;
  readonly componentes: readonly ComponenteTributo[];
}

export interface LinhaMemoriaTributo {
  readonly nome: string;
  readonly aliquota: Decimal;
  readonly valor: Decimal;
}

/** Cadeia inteira de uma oferta, por cabeca, mais os totais do lote. */
export interface ResultadoOferta {
  readonly comprador: string;
  readonly pesoVivoEfetivoKg: Decimal;
  readonly pesoCarcacaKg: Decimal;
  readonly arrobas: Decimal;
  readonly receitaBruta: Decimal;
  readonly bonificacoes: Decimal;
  readonly descontosQualidade: Decimal;
  readonly receitaAjustada: Decimal;
  readonly tributos: Decimal;
  readonly memoriaTributos: readonly LinhaMemoriaTributo[];
  readonly fretePorCabeca: Decimal;
  readonly freteTotal: Decimal;
  readonly comissao: Decimal;
  readonly outrasDeducoes: Decimal;
  readonly receitaLiquida: Decimal;
  readonly taxaDiaria: Decimal;
  readonly prazoDias: number;
  readonly valorPresente: Decimal;
  readonly vpPorCabeca: Decimal;
  readonly vpPorArroba: Decimal;
  readonly vpTotalLote: Decimal;
  readonly versaoCalculo: string;
}
```

- [ ] **Step 4: Rodar o teste**

Run: `npm test -- tests/unit/domain/tipos.test.ts`
Expected: PASS, 3 casos.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulacao/domain/tipos.ts tests/unit/domain/tipos.test.ts
git commit -m "feat: tipos do dominio da simulacao"
```

---

### Task 4: Peso, quebra e rendimento

**Files:**
- Create: `src/features/simulacao/domain/peso.ts`
- Test: `tests/unit/domain/peso.test.ts`

**Interfaces:**
- Consumes: `dec` e `Decimal` de `@/lib/money`, `kgParaArrobas` de `@/lib/units`
- Produces:
  - `pesoVivoEfetivo(pesoVivoMedioKg: Decimal, quebraPct: Decimal): Decimal`
  - `pesoCarcaca(pesoVivoEfetivoKg: Decimal, rendimentoAcordado: Decimal): Decimal`
  - `arrobasPorCabeca(pesoVivoMedioKg: Decimal, quebraPct: Decimal, rendimentoAcordado: Decimal): Decimal`

- [ ] **Step 1: Escrever os testes falhos**

Crie `tests/unit/domain/peso.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { arrobasPorCabeca, pesoCarcaca, pesoVivoEfetivo } from "@/features/simulacao/domain/peso";
import { dec } from "@/lib/money";

describe("pesoVivoEfetivo", () => {
  it("desconta a quebra de 4% de 480 kg", () => {
    expect(pesoVivoEfetivo(dec(480), dec("0.04")).toString()).toBe("460.8");
  });

  it("nao muda o peso quando a quebra e zero", () => {
    expect(pesoVivoEfetivo(dec(480), dec(0)).toString()).toBe("480");
  });

  it("aceita a quebra no limite superior de 10%", () => {
    expect(pesoVivoEfetivo(dec(480), dec("0.1")).toString()).toBe("432");
  });
});

describe("pesoCarcaca", () => {
  it("aplica rendimento de 52% sobre 460.8 kg", () => {
    expect(pesoCarcaca(dec("460.8"), dec("0.52")).toString()).toBe("239.616");
  });

  it("aceita o rendimento no limite inferior de 40%", () => {
    expect(pesoCarcaca(dec(500), dec("0.4")).toString()).toBe("200");
  });

  it("aceita o rendimento no limite superior de 65%", () => {
    expect(pesoCarcaca(dec(500), dec("0.65")).toString()).toBe("325");
  });
});

describe("arrobasPorCabeca", () => {
  it("compoe quebra, rendimento e conversao em uma passada", () => {
    expect(arrobasPorCabeca(dec(480), dec("0.04"), dec("0.52")).toString()).toBe("15.9744");
  });

  it("bate com a composicao manual dos tres passos", () => {
    const vivo = pesoVivoEfetivo(dec(510), dec("0.035"));
    const carcaca = pesoCarcaca(vivo, dec("0.505"));
    const esperado = carcaca.dividedBy(15);
    expect(arrobasPorCabeca(dec(510), dec("0.035"), dec("0.505")).toString()).toBe(
      esperado.toString(),
    );
  });
});
```

- [ ] **Step 2: Rodar os testes para ver falhar**

Run: `npm test -- tests/unit/domain/peso.test.ts`
Expected: FAIL com "Failed to resolve import @/features/simulacao/domain/peso".

- [ ] **Step 3: Implementar peso.ts**

Crie `src/features/simulacao/domain/peso.ts`:

```ts
import { type Decimal, dec } from "@/lib/money";
import { kgParaArrobas } from "@/lib/units";

const UM = dec(1);

/**
 * Peso vivo que chega na balanca do comprador.
 * A quebra e a perda de peso no embarque e no transporte, entre 0 e 0.1.
 */
export function pesoVivoEfetivo(pesoVivoMedioKg: Decimal, quebraPct: Decimal): Decimal {
  return pesoVivoMedioKg.times(UM.minus(quebraPct));
}

/** Peso de carcaca conforme o rendimento acordado, entre 0.4 e 0.65. */
export function pesoCarcaca(pesoVivoEfetivoKg: Decimal, rendimentoAcordado: Decimal): Decimal {
  return pesoVivoEfetivoKg.times(rendimentoAcordado);
}

/** Arrobas de carcaca por cabeca, do peso de fazenda ate a unidade de venda. */
export function arrobasPorCabeca(
  pesoVivoMedioKg: Decimal,
  quebraPct: Decimal,
  rendimentoAcordado: Decimal,
): Decimal {
  return kgParaArrobas(pesoCarcaca(pesoVivoEfetivo(pesoVivoMedioKg, quebraPct), rendimentoAcordado));
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test -- tests/unit/domain/peso.test.ts`
Expected: PASS, 8 casos.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulacao/domain/peso.ts tests/unit/domain/peso.test.ts
git commit -m "feat: quebra de peso, rendimento de carcaca e conversao para arrobas"
```

---

### Task 5: Receita bruta, ajustes e receita ajustada

**Files:**
- Create: `src/features/simulacao/domain/receita.ts`
- Test: `tests/unit/domain/receita.test.ts`

**Interfaces:**
- Consumes: `Ajuste`, `AjusteTipo` de `./tipos`; `soma` e o tipo `Decimal` de `@/lib/money`
- Produces:
  - `ContextoAjuste = { receitaBruta: Decimal; arrobas: Decimal }`
  - `receitaBruta(arrobas: Decimal, precoArroba: Decimal): Decimal`
  - `valorDoAjuste(ajuste: Ajuste, ctx: ContextoAjuste): Decimal`
  - `somaAjustesPorTipo(ajustes: readonly Ajuste[], tipo: AjusteTipo, ctx: ContextoAjuste): Decimal`
  - `receitaAjustada(bruta: Decimal, bonificacoes: Decimal, descontosQualidade: Decimal): Decimal`

- [ ] **Step 1: Escrever os testes falhos**

Crie `tests/unit/domain/receita.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  receitaAjustada,
  receitaBruta,
  somaAjustesPorTipo,
  valorDoAjuste,
} from "@/features/simulacao/domain/receita";
import type { Ajuste } from "@/features/simulacao/domain/tipos";
import { dec } from "@/lib/money";

const ctx = { receitaBruta: dec("5111.808"), arrobas: dec("15.9744") };

function ajuste(parcial: Partial<Ajuste>): Ajuste {
  return {
    nome: "teste",
    tipo: "bonificacao",
    modo: "valor_por_cabeca",
    valor: dec(0),
    ...parcial,
  };
}

describe("receitaBruta", () => {
  it("multiplica arrobas pelo preco da arroba", () => {
    expect(receitaBruta(dec("15.9744"), dec(320)).toString()).toBe("5111.808");
  });

  it("devolve zero quando nao ha arrobas", () => {
    expect(receitaBruta(dec(0), dec(320)).toString()).toBe("0");
  });
});

describe("valorDoAjuste", () => {
  it("percentual incide sobre a receita bruta", () => {
    const a = ajuste({ modo: "percentual", valor: dec("0.02") });
    expect(valorDoAjuste(a, ctx).toString()).toBe("102.23616");
  });

  it("valor_por_cabeca entra direto", () => {
    const a = ajuste({ modo: "valor_por_cabeca", valor: dec("30") });
    expect(valorDoAjuste(a, ctx).toString()).toBe("30");
  });

  it("valor_por_arroba multiplica pelas arrobas", () => {
    const a = ajuste({ modo: "valor_por_arroba", valor: dec("5") });
    expect(valorDoAjuste(a, ctx).toString()).toBe("79.872");
  });
});

describe("somaAjustesPorTipo", () => {
  const ajustes: Ajuste[] = [
    ajuste({ nome: "precoce", tipo: "bonificacao", modo: "valor_por_arroba", valor: dec("4") }),
    ajuste({ nome: "rastreabilidade", tipo: "bonificacao", modo: "percentual", valor: dec("0.01") }),
    ajuste({ nome: "hematoma", tipo: "desconto_qualidade", modo: "valor_por_cabeca", valor: dec("12") }),
    ajuste({ nome: "balanca", tipo: "outra_deducao", modo: "valor_por_cabeca", valor: dec("3") }),
  ];

  it("soma apenas as bonificacoes", () => {
    expect(somaAjustesPorTipo(ajustes, "bonificacao", ctx).toString()).toBe("115.01568");
  });

  it("soma apenas os descontos de qualidade", () => {
    expect(somaAjustesPorTipo(ajustes, "desconto_qualidade", ctx).toString()).toBe("12");
  });

  it("soma apenas as outras deducoes", () => {
    expect(somaAjustesPorTipo(ajustes, "outra_deducao", ctx).toString()).toBe("3");
  });

  it("devolve zero quando nao ha ajuste do tipo", () => {
    expect(somaAjustesPorTipo([], "bonificacao", ctx).toString()).toBe("0");
  });
});

describe("receitaAjustada", () => {
  it("soma bonificacao e subtrai desconto de qualidade", () => {
    expect(receitaAjustada(dec("5111.808"), dec("100"), dec("40")).toString()).toBe("5171.808");
  });

  it("sem ajustes fica igual a bruta", () => {
    expect(receitaAjustada(dec("5111.808"), dec(0), dec(0)).toString()).toBe("5111.808");
  });
});
```

Conferencia das constantes: `5111.808 * 0.02 = 102.23616`; `15.9744 * 5 = 79.872`; bonificacoes `15.9744 * 4 = 63.8976` mais `5111.808 * 0.01 = 51.11808`, total `115.01568`.

- [ ] **Step 2: Rodar os testes para ver falhar**

Run: `npm test -- tests/unit/domain/receita.test.ts`
Expected: FAIL com "Failed to resolve import @/features/simulacao/domain/receita".

- [ ] **Step 3: Implementar receita.ts**

Crie `src/features/simulacao/domain/receita.ts`:

```ts
import { type Decimal, soma } from "@/lib/money";
import type { Ajuste, AjusteTipo } from "./tipos";

/** Bases sobre as quais um ajuste percentual ou por arroba incide. */
export interface ContextoAjuste {
  readonly receitaBruta: Decimal;
  readonly arrobas: Decimal;
}

export function receitaBruta(arrobas: Decimal, precoArroba: Decimal): Decimal {
  return arrobas.times(precoArroba);
}

/** Converte um ajuste para reais por cabeca, conforme o modo declarado. */
export function valorDoAjuste(ajuste: Ajuste, ctx: ContextoAjuste): Decimal {
  switch (ajuste.modo) {
    case "percentual":
      return ctx.receitaBruta.times(ajuste.valor);
    case "valor_por_cabeca":
      return ajuste.valor;
    case "valor_por_arroba":
      return ctx.arrobas.times(ajuste.valor);
  }
}

export function somaAjustesPorTipo(
  ajustes: readonly Ajuste[],
  tipo: AjusteTipo,
  ctx: ContextoAjuste,
): Decimal {
  return soma(ajustes.filter((a) => a.tipo === tipo).map((a) => valorDoAjuste(a, ctx)));
}

export function receitaAjustada(
  bruta: Decimal,
  bonificacoes: Decimal,
  descontosQualidade: Decimal,
): Decimal {
  return bruta.plus(bonificacoes).minus(descontosQualidade);
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test -- tests/unit/domain/receita.test.ts`
Expected: PASS, 11 casos.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulacao/domain/receita.ts tests/unit/domain/receita.test.ts
git commit -m "feat: receita bruta, ajustes por modo e receita ajustada"
```

---

### Task 6: Tributos com regime vigente

**Files:**
- Create: `src/features/simulacao/domain/tributos.ts`
- Test: `tests/unit/domain/tributos.test.ts`

**Interfaces:**
- Consumes: `RegimeTributario`, `LinhaMemoriaTributo` de `./tipos`; `dec`, `soma`, `Decimal` de `@/lib/money`
- Produces:
  - `regimeVigenteEm(regimes: readonly RegimeTributario[], data: Date): RegimeTributario | null`
  - `aliquotaTotal(regime: RegimeTributario): Decimal`
  - `calcularTributos(receitaBruta: Decimal, regime: RegimeTributario): { total: Decimal; memoria: LinhaMemoriaTributo[] }`

- [ ] **Step 1: Escrever os testes falhos**

Crie `tests/unit/domain/tributos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aliquotaTotal, calcularTributos, regimeVigenteEm } from "@/features/simulacao/domain/tributos";
import type { RegimeTributario } from "@/features/simulacao/domain/tipos";
import { dec } from "@/lib/money";

const pfAtual: RegimeTributario = {
  id: "pf-receita-bruta",
  nome: "Produtor rural pessoa fisica",
  vigenciaInicio: new Date("2018-01-01T00:00:00Z"),
  vigenciaFim: null,
  componentes: [
    { nome: "Previdenciaria", aliquota: dec("0.012"), base: "receita_bruta" },
    { nome: "RAT", aliquota: dec("0.001"), base: "receita_bruta" },
    { nome: "SENAR", aliquota: dec("0.002"), base: "receita_bruta" },
  ],
};

const pfHistorico: RegimeTributario = {
  id: "pf-receita-bruta-ate-2017",
  nome: "Produtor rural pessoa fisica, ate 2017",
  vigenciaInicio: new Date("2001-01-01T00:00:00Z"),
  vigenciaFim: new Date("2017-12-31T00:00:00Z"),
  componentes: [
    { nome: "Previdenciaria", aliquota: dec("0.02"), base: "receita_bruta" },
    { nome: "RAT", aliquota: dec("0.001"), base: "receita_bruta" },
    { nome: "SENAR", aliquota: dec("0.002"), base: "receita_bruta" },
  ],
};

const regimes = [pfHistorico, pfAtual];

describe("regimeVigenteEm", () => {
  it("escolhe o regime atual para uma data de hoje", () => {
    expect(regimeVigenteEm(regimes, new Date("2026-08-19T00:00:00Z"))?.id).toBe("pf-receita-bruta");
  });

  it("escolhe o regime historico para uma data de 2015", () => {
    expect(regimeVigenteEm(regimes, new Date("2015-06-01T00:00:00Z"))?.id).toBe(
      "pf-receita-bruta-ate-2017",
    );
  });

  it("inclui o primeiro dia da vigencia", () => {
    expect(regimeVigenteEm(regimes, new Date("2018-01-01T00:00:00Z"))?.id).toBe("pf-receita-bruta");
  });

  it("inclui o ultimo dia da vigencia", () => {
    expect(regimeVigenteEm(regimes, new Date("2017-12-31T00:00:00Z"))?.id).toBe(
      "pf-receita-bruta-ate-2017",
    );
  });

  it("devolve nulo quando nenhum regime cobre a data", () => {
    expect(regimeVigenteEm(regimes, new Date("1990-01-01T00:00:00Z"))).toBeNull();
  });

  it("devolve nulo para lista vazia", () => {
    expect(regimeVigenteEm([], new Date("2026-08-19T00:00:00Z"))).toBeNull();
  });
});

describe("aliquotaTotal", () => {
  it("soma os tres componentes da pessoa fisica em 1.5%", () => {
    expect(aliquotaTotal(pfAtual).toString()).toBe("0.015");
  });

  it("soma os componentes do regime historico em 2.3%", () => {
    expect(aliquotaTotal(pfHistorico).toString()).toBe("0.023");
  });

  it("devolve zero para regime sem componente", () => {
    expect(aliquotaTotal({ ...pfAtual, componentes: [] }).toString()).toBe("0");
  });
});

describe("calcularTributos", () => {
  it("aplica a aliquota sobre a receita bruta", () => {
    const { total } = calcularTributos(dec("5111.808"), pfAtual);
    expect(total.toString()).toBe("76.67712");
  });

  it("devolve a memoria de calculo componente a componente", () => {
    const { memoria } = calcularTributos(dec("5111.808"), pfAtual);
    expect(memoria.map((l) => l.nome)).toEqual(["Previdenciaria", "RAT", "SENAR"]);
    expect(memoria.map((l) => l.valor.toString())).toEqual([
      "61.341696",
      "5.111808",
      "10.223616",
    ]);
  });

  it("a soma da memoria bate com o total", () => {
    const { total, memoria } = calcularTributos(dec("5111.808"), pfAtual);
    const somaMemoria = memoria.reduce((acc, l) => acc.plus(l.valor), dec(0));
    expect(somaMemoria.toString()).toBe(total.toString());
  });
});
```

Conferencia: `5111.808 * 0.012 = 61.341696`; `* 0.001 = 5.111808`; `* 0.002 = 10.223616`; soma `76.67712`.

- [ ] **Step 2: Rodar os testes para ver falhar**

Run: `npm test -- tests/unit/domain/tributos.test.ts`
Expected: FAIL com "Failed to resolve import @/features/simulacao/domain/tributos".

- [ ] **Step 3: Implementar tributos.ts**

Crie `src/features/simulacao/domain/tributos.ts`:

```ts
import { type Decimal, soma } from "@/lib/money";
import type { LinhaMemoriaTributo, RegimeTributario } from "./tipos";

/**
 * Regime cuja vigencia cobre a data. Intervalo fechado dos dois lados:
 * o dia de inicio e o dia de fim pertencem a vigencia.
 * Aliquota muda por legislacao, entao ela e dado com data, nunca constante no codigo.
 */
export function regimeVigenteEm(
  regimes: readonly RegimeTributario[],
  data: Date,
): RegimeTributario | null {
  const alvo = data.getTime();
  return (
    regimes.find((regime) => {
      const comecou = regime.vigenciaInicio.getTime() <= alvo;
      const naoAcabou = regime.vigenciaFim === null || regime.vigenciaFim.getTime() >= alvo;
      return comecou && naoAcabou;
    }) ?? null
  );
}

export function aliquotaTotal(regime: RegimeTributario): Decimal {
  return soma(regime.componentes.map((c) => c.aliquota));
}

/**
 * Contribuicao sobre a comercializacao da producao rural.
 * A base e a receita bruta, antes de bonificacao e de desconto de qualidade.
 * Estimativa, nao substitui orientacao contabil.
 */
export function calcularTributos(
  receitaBruta: Decimal,
  regime: RegimeTributario,
): { total: Decimal; memoria: LinhaMemoriaTributo[] } {
  const memoria: LinhaMemoriaTributo[] = regime.componentes.map((c) => ({
    nome: c.nome,
    aliquota: c.aliquota,
    valor: receitaBruta.times(c.aliquota),
  }));
  return { total: soma(memoria.map((l) => l.valor)), memoria };
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test -- tests/unit/domain/tributos.test.ts`
Expected: PASS, 12 casos.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulacao/domain/tributos.ts tests/unit/domain/tributos.test.ts
git commit -m "feat: tributos por regime vigente com memoria de calculo"
```

---

### Task 7: Frete

**Files:**
- Create: `src/features/simulacao/domain/logistica.ts`
- Test: `tests/unit/domain/logistica.test.ts`

**Interfaces:**
- Consumes: `FreteModo` de `./tipos`; `dec`, `ZERO`, `Decimal` de `@/lib/money`
- Produces:
  - `EntradaFrete = { freteModo: FreteModo; freteValor: Decimal; kmRodados: Decimal | null }`
  - `calcularFrete(entrada: EntradaFrete, cabecas: number): { total: Decimal; porCabeca: Decimal }`
  - `ErroFrete` (classe de erro do dominio)

- [ ] **Step 1: Escrever os testes falhos**

Crie `tests/unit/domain/logistica.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calcularFrete, ErroFrete } from "@/features/simulacao/domain/logistica";
import { dec } from "@/lib/money";

describe("calcularFrete modo isento", () => {
  it("nao cobra nada do produtor", () => {
    const r = calcularFrete({ freteModo: "isento", freteValor: dec(999), kmRodados: dec(500) }, 40);
    expect(r.total.toString()).toBe("0");
    expect(r.porCabeca.toString()).toBe("0");
  });
});

describe("calcularFrete modo por_cabeca", () => {
  it("usa o valor informado como custo unitario", () => {
    const r = calcularFrete({ freteModo: "por_cabeca", freteValor: dec("35"), kmRodados: null }, 40);
    expect(r.porCabeca.toString()).toBe("35");
    expect(r.total.toString()).toBe("1400");
  });
});

describe("calcularFrete modo por_km", () => {
  it("multiplica valor por km rodado e rateia pelo lote", () => {
    const r = calcularFrete(
      { freteModo: "por_km", freteValor: dec("4"), kmRodados: dec(240) },
      40,
    );
    expect(r.total.toString()).toBe("960");
    expect(r.porCabeca.toString()).toBe("24");
  });

  it("recusa km rodados ausente", () => {
    expect(() =>
      calcularFrete({ freteModo: "por_km", freteValor: dec("4"), kmRodados: null }, 40),
    ).toThrow(ErroFrete);
  });

  it("recusa lote sem cabeca, para nao dividir por zero", () => {
    expect(() =>
      calcularFrete({ freteModo: "por_km", freteValor: dec("4"), kmRodados: dec(240) }, 0),
    ).toThrow(ErroFrete);
  });
});
```

- [ ] **Step 2: Rodar os testes para ver falhar**

Run: `npm test -- tests/unit/domain/logistica.test.ts`
Expected: FAIL com "Failed to resolve import @/features/simulacao/domain/logistica".

- [ ] **Step 3: Implementar logistica.ts**

Crie `src/features/simulacao/domain/logistica.ts`:

```ts
import { type Decimal, ZERO, dec } from "@/lib/money";
import type { FreteModo } from "./tipos";

export class ErroFrete extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroFrete";
  }
}

export interface EntradaFrete {
  readonly freteModo: FreteModo;
  readonly freteValor: Decimal;
  /** Quilometragem cobrada pela transportadora, com retorno incluso se ela cobrar. */
  readonly kmRodados: Decimal | null;
}

/**
 * Custo de frete do produtor, total do lote e por cabeca.
 * A cadeia de calculo roda por cabeca, entao o modo por_km rateia pelo lote.
 */
export function calcularFrete(
  entrada: EntradaFrete,
  cabecas: number,
): { total: Decimal; porCabeca: Decimal } {
  switch (entrada.freteModo) {
    case "isento":
      return { total: ZERO, porCabeca: ZERO };

    case "por_cabeca": {
      if (cabecas <= 0) {
        throw new ErroFrete("frete por cabeca exige lote com pelo menos uma cabeca");
      }
      return { total: entrada.freteValor.times(cabecas), porCabeca: entrada.freteValor };
    }

    case "por_km": {
      if (entrada.kmRodados === null) {
        throw new ErroFrete("frete por km exige a quilometragem rodada");
      }
      if (cabecas <= 0) {
        throw new ErroFrete("frete por km exige lote com pelo menos uma cabeca para o rateio");
      }
      const total = entrada.freteValor.times(entrada.kmRodados);
      return { total, porCabeca: total.dividedBy(dec(cabecas)) };
    }
  }
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test -- tests/unit/domain/logistica.test.ts`
Expected: PASS, 5 casos.

- [ ] **Step 5: Cobrir o ramo restante de por_cabeca**

O ramo `cabecas <= 0` de `por_cabeca` ainda nao tem teste e a cobertura exige 100%. Acrescente a `tests/unit/domain/logistica.test.ts`, dentro do bloco `describe("calcularFrete modo por_cabeca")`:

```ts
  it("recusa lote sem cabeca", () => {
    expect(() =>
      calcularFrete({ freteModo: "por_cabeca", freteValor: dec("35"), kmRodados: null }, 0),
    ).toThrow(ErroFrete);
  });
```

Run: `npm test -- tests/unit/domain/logistica.test.ts`
Expected: PASS, 6 casos.

- [ ] **Step 6: Commit**

```bash
git add src/features/simulacao/domain/logistica.ts tests/unit/domain/logistica.test.ts
git commit -m "feat: frete isento, por cabeca e por km rodado com rateio"
```

---

### Task 8: Valor presente

**Files:**
- Create: `src/features/simulacao/domain/valor-presente.ts`
- Test: `tests/unit/domain/valor-presente.test.ts`

**Interfaces:**
- Consumes: `dec`, `soma`, `Decimal` de `@/lib/money`
- Produces:
  - `Parcela = { dias: number; percentual: Decimal }` (percentual como fracao, 1 vale 100%)
  - `taxaAnualParaDiaria(taxaAnual: Decimal): Decimal`
  - `valorPresenteDeFluxo(receitaLiquida: Decimal, taxaDiaria: Decimal, parcelas: readonly Parcela[]): Decimal`
  - `valorPresente(receitaLiquida: Decimal, taxaDiaria: Decimal, prazoDias: number): Decimal`
  - `ErroValorPresente`

- [ ] **Step 1: Escrever os testes falhos**

Crie `tests/unit/domain/valor-presente.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ErroValorPresente,
  taxaAnualParaDiaria,
  valorPresente,
  valorPresenteDeFluxo,
} from "@/features/simulacao/domain/valor-presente";
import { dec } from "@/lib/money";

describe("taxaAnualParaDiaria", () => {
  it("converte de forma composta, nao linear", () => {
    const diaria = taxaAnualParaDiaria(dec("0.12"));
    // Linear seria 0.12/365 = 0.000328767. A composta e menor.
    // Composta: e^(ln(1.12)/365) - 1 = 0.00031053780...
    expect(diaria.toNumber()).toBeLessThan(0.12 / 365);
    expect(diaria.toNumber()).toBeCloseTo(0.00031054, 8);
  });

  it("volta a taxa anual quando elevada a 365", () => {
    const diaria = taxaAnualParaDiaria(dec("0.12"));
    expect(diaria.plus(1).pow(365).toNumber()).toBeCloseTo(1.12, 10);
  });

  it("taxa anual zero produz taxa diaria zero", () => {
    expect(taxaAnualParaDiaria(dec(0)).isZero()).toBe(true);
  });

  it("recusa taxa anual menor ou igual a menos um", () => {
    expect(() => taxaAnualParaDiaria(dec("-1"))).toThrow(ErroValorPresente);
  });
});

describe("valorPresente", () => {
  it("desconta 30 dias a 12% ao ano", () => {
    const vp = valorPresente(dec("4960.0128"), taxaAnualParaDiaria(dec("0.12")), 30);
    expect(vp.toNumber()).toBeCloseTo(4914.0263, 2);
  });

  it("inverte de volta ao valor futuro, sem depender de constante conferida a mao", () => {
    const taxa = taxaAnualParaDiaria(dec("0.12"));
    const vp = valorPresente(dec("4960.0128"), taxa, 30);
    const futuro = vp.times(dec(1).plus(taxa).pow(30));
    expect(futuro.toNumber()).toBeCloseTo(4960.0128, 8);
  });

  it("recusa prazo fracionario", () => {
    expect(() => valorPresente(dec(1000), dec(0), 1.5)).toThrow(ErroValorPresente);
  });

  it("prazo zero devolve a propria receita liquida", () => {
    const vp = valorPresente(dec("4960.0128"), taxaAnualParaDiaria(dec("0.12")), 0);
    expect(vp.toString()).toBe("4960.0128");
  });

  it("taxa zero devolve a propria receita liquida", () => {
    const vp = valorPresente(dec("4960.0128"), dec(0), 45);
    expect(vp.toString()).toBe("4960.0128");
  });

  it("desconta mais quanto maior o prazo", () => {
    const taxa = taxaAnualParaDiaria(dec("0.12"));
    const trinta = valorPresente(dec(1000), taxa, 30);
    const noventa = valorPresente(dec(1000), taxa, 90);
    expect(noventa.lessThan(trinta)).toBe(true);
  });

  it("preserva o sinal de receita liquida negativa", () => {
    const vp = valorPresente(dec("-100"), taxaAnualParaDiaria(dec("0.12")), 30);
    expect(vp.isNegative()).toBe(true);
  });

  it("recusa prazo negativo", () => {
    expect(() => valorPresente(dec(1000), dec(0), -1)).toThrow(ErroValorPresente);
  });
});

describe("valorPresenteDeFluxo", () => {
  it("trata prazo unico como fluxo de uma parcela de 100%", () => {
    const taxa = taxaAnualParaDiaria(dec("0.12"));
    const fluxo = valorPresenteDeFluxo(dec("4960.0128"), taxa, [{ dias: 30, percentual: dec(1) }]);
    const simples = valorPresente(dec("4960.0128"), taxa, 30);
    expect(fluxo.toString()).toBe(simples.toString());
  });

  it("desconta cada parcela pelo seu proprio prazo", () => {
    const taxa = taxaAnualParaDiaria(dec("0.12"));
    const fluxo = valorPresenteDeFluxo(dec(1000), taxa, [
      { dias: 0, percentual: dec("0.5") },
      { dias: 60, percentual: dec("0.5") },
    ]);
    const mediaDosPrazos = valorPresente(dec(1000), taxa, 30);
    // A media dos prazos nao equivale ao VPL do fluxo. Esse e o erro que o produto evita.
    expect(fluxo.toString()).not.toBe(mediaDosPrazos.toString());
    expect(fluxo.greaterThan(mediaDosPrazos)).toBe(true);
  });

  it("recusa fluxo cujo percentual nao soma 100%", () => {
    expect(() =>
      valorPresenteDeFluxo(dec(1000), dec(0), [{ dias: 30, percentual: dec("0.9") }]),
    ).toThrow(ErroValorPresente);
  });

  it("recusa fluxo vazio", () => {
    expect(() => valorPresenteDeFluxo(dec(1000), dec(0), [])).toThrow(ErroValorPresente);
  });
});
```

- [ ] **Step 2: Rodar os testes para ver falhar**

Run: `npm test -- tests/unit/domain/valor-presente.test.ts`
Expected: FAIL com "Failed to resolve import @/features/simulacao/domain/valor-presente".

- [ ] **Step 3: Implementar valor-presente.ts**

Crie `src/features/simulacao/domain/valor-presente.ts`:

```ts
import { type Decimal, dec, soma } from "@/lib/money";

const UM = dec(1);
const DIAS_NO_ANO = dec(365);
/** Tolerancia da soma de percentuais do fluxo, para absorver dizima de 1/3. */
const TOLERANCIA_FLUXO = dec("0.000001");

export class ErroValorPresente extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroValorPresente";
  }
}

/** Uma entrada do fluxo de recebimento. `percentual` e fracao: 1 vale 100%. */
export interface Parcela {
  readonly dias: number;
  readonly percentual: Decimal;
}

/**
 * Converte taxa anual em diaria de forma composta.
 * Dividir por 365 subestima o desconto e e o erro comum na conta de papel.
 */
export function taxaAnualParaDiaria(taxaAnual: Decimal): Decimal {
  if (taxaAnual.lessThanOrEqualTo(-1)) {
    throw new ErroValorPresente("taxa anual precisa ser maior que menos um");
  }
  return UM.plus(taxaAnual).pow(UM.dividedBy(DIAS_NO_ANO)).minus(UM);
}

/**
 * Valor presente de um fluxo de recebimento.
 * Cada parcela e descontada pelo proprio prazo, nunca pela media dos prazos.
 */
export function valorPresenteDeFluxo(
  receitaLiquida: Decimal,
  taxaDiaria: Decimal,
  parcelas: readonly Parcela[],
): Decimal {
  if (parcelas.length === 0) {
    throw new ErroValorPresente("fluxo precisa de pelo menos uma parcela");
  }
  const somaPercentuais = soma(parcelas.map((p) => p.percentual));
  if (somaPercentuais.minus(UM).abs().greaterThan(TOLERANCIA_FLUXO)) {
    throw new ErroValorPresente("percentuais do fluxo precisam somar 100%");
  }
  return soma(
    parcelas.map((p) => valorPresente(receitaLiquida.times(p.percentual), taxaDiaria, p.dias)),
  );
}

/** Valor presente de um recebimento unico em `prazoDias`. */
export function valorPresente(
  receitaLiquida: Decimal,
  taxaDiaria: Decimal,
  prazoDias: number,
): Decimal {
  if (!Number.isInteger(prazoDias) || prazoDias < 0) {
    throw new ErroValorPresente("prazo em dias precisa ser inteiro nao negativo");
  }
  return receitaLiquida.dividedBy(UM.plus(taxaDiaria).pow(prazoDias));
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test -- tests/unit/domain/valor-presente.test.ts`
Expected: PASS, 16 casos.

Se a assercao de `4914.0263` falhar, nao ajuste o numero esperado para o que o codigo
devolveu. Esse valor foi conferido a mao a partir de `4960.0128 / 1.12^(30/365)`, e o
teste de inversao ao lado dele nao depende de constante nenhuma. Se um passa e o outro
falha, o erro esta na formula.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulacao/domain/valor-presente.ts tests/unit/domain/valor-presente.test.ts
git commit -m "feat: taxa diaria composta e valor presente de fluxo"
```

---

### Task 9: Cadeia completa e caso de conferencia manual

**Files:**
- Create: `src/features/simulacao/domain/calculo.ts`
- Test: `tests/unit/domain/calculo.test.ts`

**Interfaces:**
- Consumes: tudo das tarefas 4 a 8
- Produces:
  - `VERSAO_CALCULO: string`
  - `EntradaCalculo = { lote: Lote; oferta: OfertaEntrada; regime: RegimeTributario; taxaDescontoAnual: Decimal }`
  - `calcularOferta(entrada: EntradaCalculo): ResultadoOferta`

- [ ] **Step 1: Escrever o teste de conferencia manual**

Este e o teste que a spec exige como conferivel na calculadora. Cada assercao tem a conta ao lado.

Crie `tests/unit/domain/calculo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { VERSAO_CALCULO, calcularOferta } from "@/features/simulacao/domain/calculo";
import type { Lote, OfertaEntrada, RegimeTributario } from "@/features/simulacao/domain/tipos";
import { dec } from "@/lib/money";

const regimePf: RegimeTributario = {
  id: "pf-receita-bruta",
  nome: "Produtor rural pessoa fisica",
  vigenciaInicio: new Date("2018-01-01T00:00:00Z"),
  vigenciaFim: null,
  componentes: [
    { nome: "Previdenciaria", aliquota: dec("0.012"), base: "receita_bruta" },
    { nome: "RAT", aliquota: dec("0.001"), base: "receita_bruta" },
    { nome: "SENAR", aliquota: dec("0.002"), base: "receita_bruta" },
  ],
};

const lote: Lote = { cabecas: 40, pesoVivoMedioKg: dec(480) };

const oferta: OfertaEntrada = {
  comprador: "Frigorifico A",
  precoArroba: dec(320),
  rendimentoAcordado: dec("0.52"),
  quebraPct: dec("0.04"),
  prazoDias: 30,
  freteModo: "por_km",
  freteValor: dec("4"),
  kmRodados: dec(240),
  comissaoPct: dec("0.01"),
  ajustes: [],
};

describe("calcularOferta: caso de conferencia manual", () => {
  const r = calcularOferta({ lote, oferta, regime: regimePf, taxaDescontoAnual: dec("0.12") });

  it("peso vivo efetivo: 480 * (1 - 0.04)", () => {
    expect(r.pesoVivoEfetivoKg.toString()).toBe("460.8");
  });

  it("peso de carcaca: 460.8 * 0.52", () => {
    expect(r.pesoCarcacaKg.toString()).toBe("239.616");
  });

  it("arrobas: 239.616 / 15", () => {
    expect(r.arrobas.toString()).toBe("15.9744");
  });

  it("receita bruta: 15.9744 * 320", () => {
    expect(r.receitaBruta.toString()).toBe("5111.808");
  });

  it("receita ajustada sem ajustes fica igual a bruta", () => {
    expect(r.receitaAjustada.toString()).toBe("5111.808");
  });

  it("tributos: 5111.808 * 0.015", () => {
    expect(r.tributos.toString()).toBe("76.67712");
  });

  it("frete total: 4.00 * 240", () => {
    expect(r.freteTotal.toString()).toBe("960");
  });

  it("frete por cabeca: 960 / 40", () => {
    expect(r.fretePorCabeca.toString()).toBe("24");
  });

  it("comissao: 5111.808 * 0.01", () => {
    expect(r.comissao.toString()).toBe("51.11808");
  });

  it("receita liquida: 5111.808 - 76.67712 - 24 - 51.11808", () => {
    expect(r.receitaLiquida.toString()).toBe("4960.0128");
  });

  it("valor presente: 4960.0128 / (1 + i)^30, i = 1.12^(1/365) - 1", () => {
    expect(r.valorPresente.toNumber()).toBeCloseTo(4914.0263, 2);
  });

  it("vp por arroba: valor presente / 15.9744", () => {
    expect(r.vpPorArroba.toNumber()).toBeCloseTo(307.6188, 2);
  });

  it("vp total do lote: valor presente * 40", () => {
    expect(r.vpTotalLote.toNumber()).toBeCloseTo(196561.05, 1);
  });

  it("carimba a versao de calculo", () => {
    expect(r.versaoCalculo).toBe(VERSAO_CALCULO);
  });
});

describe("calcularOferta: ajustes e casos de borda", () => {
  it("bonificacao entra na receita ajustada, desconto de qualidade sai", () => {
    const r = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: {
        ...oferta,
        ajustes: [
          { nome: "precoce", tipo: "bonificacao", modo: "valor_por_arroba", valor: dec("4") },
          { nome: "hematoma", tipo: "desconto_qualidade", modo: "valor_por_cabeca", valor: dec("12") },
        ],
      },
    });
    // bonificacao 15.9744 * 4 = 63.8976; ajustada = 5111.808 + 63.8976 - 12
    expect(r.bonificacoes.toString()).toBe("63.8976");
    expect(r.descontosQualidade.toString()).toBe("12");
    expect(r.receitaAjustada.toString()).toBe("5163.7056");
  });

  it("bonificacao nao muda o tributo, porque a base e a receita bruta", () => {
    const semBonus = calcularOferta({ lote, oferta, regime: regimePf, taxaDescontoAnual: dec("0.12") });
    const comBonus = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: {
        ...oferta,
        ajustes: [{ nome: "cota", tipo: "bonificacao", modo: "percentual", valor: dec("0.05") }],
      },
    });
    expect(comBonus.tributos.toString()).toBe(semBonus.tributos.toString());
  });

  it("outra deducao sai depois do tributo, junto com a comissao", () => {
    const r = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: {
        ...oferta,
        ajustes: [{ nome: "balanca", tipo: "outra_deducao", modo: "valor_por_cabeca", valor: dec("3") }],
      },
    });
    expect(r.outrasDeducoes.toString()).toBe("54.11808"); // 51.11808 + 3
    expect(r.receitaLiquida.toString()).toBe("4957.0128");
  });

  it("frete isento nao cobra do produtor", () => {
    const r = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: { ...oferta, freteModo: "isento", freteValor: dec(0), kmRodados: null },
    });
    expect(r.fretePorCabeca.toString()).toBe("0");
    expect(r.receitaLiquida.toString()).toBe("4984.0128");
  });

  it("prazo zero nao desconta nada", () => {
    const r = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: { ...oferta, prazoDias: 0 },
    });
    expect(r.valorPresente.toString()).toBe(r.receitaLiquida.toString());
  });

  it("taxa zero nao desconta nada", () => {
    const r = calcularOferta({ lote, oferta, regime: regimePf, taxaDescontoAnual: dec(0) });
    expect(r.valorPresente.toString()).toBe(r.receitaLiquida.toString());
  });

  it("frete alto pode virar receita liquida negativa, e isso e exibido, nao barrado", () => {
    const r = calcularOferta({
      lote,
      regime: regimePf,
      taxaDescontoAnual: dec("0.12"),
      oferta: { ...oferta, freteModo: "por_cabeca", freteValor: dec("6000"), kmRodados: null },
    });
    expect(r.receitaLiquida.isNegative()).toBe(true);
    expect(r.valorPresente.isNegative()).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `npm test -- tests/unit/domain/calculo.test.ts`
Expected: FAIL com "Failed to resolve import @/features/simulacao/domain/calculo".

- [ ] **Step 3: Implementar calculo.ts**

Crie `src/features/simulacao/domain/calculo.ts`:

```ts
import { type Decimal, dec } from "@/lib/money";
import { calcularFrete } from "./logistica";
import { arrobasPorCabeca, pesoCarcaca, pesoVivoEfetivo } from "./peso";
import { receitaAjustada, receitaBruta, somaAjustesPorTipo } from "./receita";
import type { Lote, OfertaEntrada, RegimeTributario, ResultadoOferta } from "./tipos";
import { calcularTributos } from "./tributos";
import { taxaAnualParaDiaria, valorPresente } from "./valor-presente";

/**
 * Versao da formula. Sobe quando uma mudanca altera o resultado para a mesma entrada,
 * nunca por refatoracao sem efeito numerico. Snapshot gravado com versao antiga
 * e exibido com aviso, em vez de recalculado em silencio.
 */
export const VERSAO_CALCULO = "1.0.0";

export interface EntradaCalculo {
  readonly lote: Lote;
  readonly oferta: OfertaEntrada;
  readonly regime: RegimeTributario;
  readonly taxaDescontoAnual: Decimal;
}

/** Cadeia inteira de uma oferta, do peso de fazenda ao valor presente liquido. */
export function calcularOferta(entrada: EntradaCalculo): ResultadoOferta {
  const { lote, oferta, regime, taxaDescontoAnual } = entrada;

  const vivoEfetivo = pesoVivoEfetivo(lote.pesoVivoMedioKg, oferta.quebraPct);
  const carcaca = pesoCarcaca(vivoEfetivo, oferta.rendimentoAcordado);
  const arrobas = arrobasPorCabeca(lote.pesoVivoMedioKg, oferta.quebraPct, oferta.rendimentoAcordado);

  const bruta = receitaBruta(arrobas, oferta.precoArroba);
  const ctx = { receitaBruta: bruta, arrobas };

  const bonificacoes = somaAjustesPorTipo(oferta.ajustes, "bonificacao", ctx);
  const descontosQualidade = somaAjustesPorTipo(oferta.ajustes, "desconto_qualidade", ctx);
  const ajustada = receitaAjustada(bruta, bonificacoes, descontosQualidade);

  // Base do tributo e a receita bruta, antes de bonificacao e desconto de qualidade.
  const { total: tributos, memoria: memoriaTributos } = calcularTributos(bruta, regime);

  const frete = calcularFrete(oferta, lote.cabecas);

  const comissao = bruta.times(oferta.comissaoPct);
  const outrasDeducoes = comissao.plus(somaAjustesPorTipo(oferta.ajustes, "outra_deducao", ctx));

  const liquida = ajustada.minus(tributos).minus(frete.porCabeca).minus(outrasDeducoes);

  const taxaDiaria = taxaAnualParaDiaria(taxaDescontoAnual);
  const vp = valorPresente(liquida, taxaDiaria, oferta.prazoDias);

  return {
    comprador: oferta.comprador,
    pesoVivoEfetivoKg: vivoEfetivo,
    pesoCarcacaKg: carcaca,
    arrobas,
    receitaBruta: bruta,
    bonificacoes,
    descontosQualidade,
    receitaAjustada: ajustada,
    tributos,
    memoriaTributos,
    fretePorCabeca: frete.porCabeca,
    freteTotal: frete.total,
    comissao,
    outrasDeducoes,
    receitaLiquida: liquida,
    taxaDiaria,
    prazoDias: oferta.prazoDias,
    valorPresente: vp,
    vpPorCabeca: vp,
    vpPorArroba: vp.dividedBy(arrobas),
    vpTotalLote: vp.times(dec(lote.cabecas)),
    versaoCalculo: VERSAO_CALCULO,
  };
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test -- tests/unit/domain/calculo.test.ts`
Expected: PASS, 21 casos.

- [ ] **Step 5: Commit**

```bash
git add src/features/simulacao/domain/calculo.ts tests/unit/domain/calculo.test.ts
git commit -m "feat: cadeia completa de calculo por oferta com caso de conferencia manual"
```

---

### Task 10: Comparador, ranking e superficie publica

**Files:**
- Create: `src/features/simulacao/domain/comparador.ts`
- Create: `src/features/simulacao/domain/index.ts`
- Test: `tests/unit/domain/comparador.test.ts`

**Interfaces:**
- Consumes: `ResultadoOferta` de `./tipos`
- Produces:
  - `ItemRanking = { resultado: ResultadoOferta; posicao: number; atrasoParaMelhorTotal: Decimal }`
  - `Ranking = { itens: ItemRanking[]; vantagemDoPrimeiroTotal: Decimal | null }`
  - `ranquear(resultados: readonly ResultadoOferta[]): Ranking`
  - `index.ts` reexportando a superficie publica do dominio

- [ ] **Step 1: Escrever os testes falhos**

Crie `tests/unit/domain/comparador.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ranquear } from "@/features/simulacao/domain/comparador";
import type { ResultadoOferta } from "@/features/simulacao/domain/tipos";
import { dec } from "@/lib/money";

function resultado(comprador: string, vpPorCabeca: string, prazoDias = 30): ResultadoOferta {
  const vp = dec(vpPorCabeca);
  return {
    comprador,
    pesoVivoEfetivoKg: dec(0),
    pesoCarcacaKg: dec(0),
    arrobas: dec(1),
    receitaBruta: dec(0),
    bonificacoes: dec(0),
    descontosQualidade: dec(0),
    receitaAjustada: dec(0),
    tributos: dec(0),
    memoriaTributos: [],
    fretePorCabeca: dec(0),
    freteTotal: dec(0),
    comissao: dec(0),
    outrasDeducoes: dec(0),
    receitaLiquida: vp,
    taxaDiaria: dec(0),
    prazoDias,
    valorPresente: vp,
    vpPorCabeca: vp,
    vpPorArroba: vp,
    vpTotalLote: vp.times(40),
    versaoCalculo: "1.0.0",
  };
}

describe("ranquear", () => {
  it("ordena por valor presente por cabeca, do maior para o menor", () => {
    const r = ranquear([
      resultado("B", "4900"),
      resultado("A", "4914"),
      resultado("C", "4880"),
    ]);
    expect(r.itens.map((i) => i.resultado.comprador)).toEqual(["A", "B", "C"]);
    expect(r.itens.map((i) => i.posicao)).toEqual([1, 2, 3]);
  });

  it("a maior arroba nao vence quando o prazo come a diferenca", () => {
    // Este e o insight do produto, em forma de teste.
    const arrobaAlta = resultado("Preco alto, prazo longo", "4800", 90);
    const arrobaBaixa = resultado("Preco menor, a vista", "4900", 0);
    const r = ranquear([arrobaAlta, arrobaBaixa]);
    expect(r.itens[0]?.resultado.comprador).toBe("Preco menor, a vista");
  });

  it("calcula a vantagem do primeiro sobre o segundo em reais totais", () => {
    const r = ranquear([resultado("A", "4914"), resultado("B", "4900")]);
    // 14 por cabeca * 40 cabecas embutidas no vpTotalLote do helper
    expect(r.vantagemDoPrimeiroTotal?.toString()).toBe("560");
  });

  it("mede o atraso de cada oferta para a melhor, em reais totais", () => {
    const r = ranquear([resultado("A", "4914"), resultado("B", "4900"), resultado("C", "4880")]);
    expect(r.itens.map((i) => i.atrasoParaMelhorTotal.toString())).toEqual(["0", "560", "1360"]);
  });

  it("oferta unica: ranking de um, vantagem ausente e nao zero", () => {
    const r = ranquear([resultado("A", "4914")]);
    expect(r.itens).toHaveLength(1);
    expect(r.vantagemDoPrimeiroTotal).toBeNull();
  });

  it("lista vazia: ranking vazio, vantagem ausente", () => {
    const r = ranquear([]);
    expect(r.itens).toEqual([]);
    expect(r.vantagemDoPrimeiroTotal).toBeNull();
  });

  it("empate no valor presente desempata pelo menor prazo", () => {
    const r = ranquear([resultado("Longo", "4900", 60), resultado("Curto", "4900", 15)]);
    expect(r.itens[0]?.resultado.comprador).toBe("Curto");
  });

  it("empate no valor presente e no prazo desempata pelo nome do comprador", () => {
    const r = ranquear([resultado("Zebu", "4900", 30), resultado("Angus", "4900", 30)]);
    expect(r.itens.map((i) => i.resultado.comprador)).toEqual(["Angus", "Zebu"]);
  });

  it("nao muta a lista recebida", () => {
    const entrada = [resultado("B", "4900"), resultado("A", "4914")];
    ranquear(entrada);
    expect(entrada.map((e) => e.comprador)).toEqual(["B", "A"]);
  });
});
```

- [ ] **Step 2: Rodar os testes para ver falhar**

Run: `npm test -- tests/unit/domain/comparador.test.ts`
Expected: FAIL com "Failed to resolve import @/features/simulacao/domain/comparador".

- [ ] **Step 3: Implementar comparador.ts**

Crie `src/features/simulacao/domain/comparador.ts`:

```ts
import type { Decimal } from "@/lib/money";
import type { ResultadoOferta } from "./tipos";

export interface ItemRanking {
  readonly resultado: ResultadoOferta;
  /** Posicao no ranking, comecando em 1. */
  readonly posicao: number;
  /** Quanto esta oferta deixa na mesa em relacao a melhor, em reais totais do lote. */
  readonly atrasoParaMelhorTotal: Decimal;
}

export interface Ranking {
  readonly itens: readonly ItemRanking[];
  /**
   * Vantagem da melhor oferta sobre a segunda, em reais totais do lote.
   * Nula quando nao existe segunda oferta, porque zero significaria empate.
   */
  readonly vantagemDoPrimeiroTotal: Decimal | null;
}

/**
 * Ordena por valor presente por cabeca, do maior para o menor.
 * Empate desempata pelo menor prazo, depois pelo nome do comprador,
 * para que a ordem seja estavel entre execucoes.
 */
export function ranquear(resultados: readonly ResultadoOferta[]): Ranking {
  const ordenados = [...resultados].sort((a, b) => {
    const porValor = b.vpPorCabeca.comparedTo(a.vpPorCabeca);
    if (porValor !== 0) return porValor;
    if (a.prazoDias !== b.prazoDias) return a.prazoDias - b.prazoDias;
    return a.comprador.localeCompare(b.comprador, "pt-BR");
  });

  const melhor = ordenados[0];
  if (melhor === undefined) {
    return { itens: [], vantagemDoPrimeiroTotal: null };
  }

  const itens = ordenados.map((resultado, indice) => ({
    resultado,
    posicao: indice + 1,
    atrasoParaMelhorTotal: melhor.vpTotalLote.minus(resultado.vpTotalLote),
  }));

  const segundo = ordenados[1];
  const vantagemDoPrimeiroTotal =
    segundo === undefined ? null : melhor.vpTotalLote.minus(segundo.vpTotalLote);

  return { itens, vantagemDoPrimeiroTotal };
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test -- tests/unit/domain/comparador.test.ts`
Expected: PASS, 9 casos.

- [ ] **Step 5: Escrever a superficie publica**

Crie `src/features/simulacao/domain/index.ts`:

```ts
export { VERSAO_CALCULO, calcularOferta, type EntradaCalculo } from "./calculo";
export { ranquear, type ItemRanking, type Ranking } from "./comparador";
export { ErroFrete, calcularFrete, type EntradaFrete } from "./logistica";
export { arrobasPorCabeca, pesoCarcaca, pesoVivoEfetivo } from "./peso";
export {
  receitaAjustada,
  receitaBruta,
  somaAjustesPorTipo,
  valorDoAjuste,
  type ContextoAjuste,
} from "./receita";
export {
  AJUSTE_MODOS,
  AJUSTE_TIPOS,
  FRETE_MODOS,
  type Ajuste,
  type AjusteModo,
  type AjusteTipo,
  type ComponenteTributo,
  type FreteModo,
  type LinhaMemoriaTributo,
  type Lote,
  type OfertaEntrada,
  type RegimeTributario,
  type ResultadoOferta,
} from "./tipos";
export { aliquotaTotal, calcularTributos, regimeVigenteEm } from "./tributos";
export {
  ErroValorPresente,
  taxaAnualParaDiaria,
  valorPresente,
  valorPresenteDeFluxo,
  type Parcela,
} from "./valor-presente";
```

- [ ] **Step 6: Cobrir a superficie publica**

`index.ts` entra no recorte de cobertura de 100%, e um arquivo que nenhum teste importa
conta como zero por cento. Este teste tambem serve de contrato: se alguem remover um
export que a UI usa, ele quebra aqui e nao na tela.

Crie `tests/unit/domain/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as dominio from "@/features/simulacao/domain";

describe("superficie publica do dominio", () => {
  it("exporta a cadeia de calculo e o comparador", () => {
    expect(typeof dominio.calcularOferta).toBe("function");
    expect(typeof dominio.ranquear).toBe("function");
    expect(dominio.VERSAO_CALCULO).toBe("1.0.0");
  });

  it("exporta as funcoes de cada etapa da cadeia", () => {
    for (const nome of [
      "pesoVivoEfetivo",
      "pesoCarcaca",
      "arrobasPorCabeca",
      "receitaBruta",
      "valorDoAjuste",
      "somaAjustesPorTipo",
      "receitaAjustada",
      "regimeVigenteEm",
      "aliquotaTotal",
      "calcularTributos",
      "calcularFrete",
      "taxaAnualParaDiaria",
      "valorPresente",
      "valorPresenteDeFluxo",
    ] as const) {
      expect(typeof dominio[nome], `${nome} nao foi exportado`).toBe("function");
    }
  });

  it("exporta as listas de valores que o banco e o Zod vao consumir", () => {
    expect([...dominio.FRETE_MODOS]).toEqual(["por_cabeca", "por_km", "isento"]);
    expect([...dominio.AJUSTE_TIPOS]).toEqual([
      "bonificacao",
      "desconto_qualidade",
      "outra_deducao",
    ]);
    expect([...dominio.AJUSTE_MODOS]).toEqual([
      "percentual",
      "valor_por_cabeca",
      "valor_por_arroba",
    ]);
  });
});
```

Run: `npm test -- tests/unit/domain/index.test.ts`
Expected: PASS, 3 casos.

- [ ] **Step 7: Commit**

```bash
git add src/features/simulacao/domain/comparador.ts src/features/simulacao/domain/index.ts tests/unit/domain/comparador.test.ts tests/unit/domain/index.test.ts
git commit -m "feat: ranking por valor presente e superficie publica do dominio"
```

---

### Task 11: Fechar o plano com verificacao real

**Files:**
- Create: `tests/unit/domain/isolamento.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: toda a superficie publica do dominio
- Produces: nenhuma API nova. Entrega a prova de que o plano fechou.

- [ ] **Step 1: Escrever o teste que guarda o isolamento do dominio**

A spec exige que o dominio nao conheca Next, banco nem React. Uma regra que so vive em texto e violada em duas semanas. Este teste a torna executavel.

Crie `tests/unit/domain/isolamento.test.ts`:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR_DOMINIO = join(process.cwd(), "src/features/simulacao/domain");

const IMPORTS_PROIBIDOS = [
  "next",
  "react",
  "drizzle-orm",
  "@neondatabase",
  "zod",
  "@/db",
  "@/features/simulacao/data",
  "@/features/simulacao/actions",
  "@/features/simulacao/components",
];

const PERMITIDOS_FORA_DO_DOMINIO = ["@/lib/money", "@/lib/units"];

function arquivosDoDominio(): string[] {
  return readdirSync(DIR_DOMINIO).filter((nome) => nome.endsWith(".ts"));
}

function importsDe(conteudo: string): string[] {
  const encontrados: string[] = [];
  const padrao = /from\s+["']([^"']+)["']/g;
  let achado = padrao.exec(conteudo);
  while (achado !== null) {
    const especificador = achado[1];
    if (especificador !== undefined) encontrados.push(especificador);
    achado = padrao.exec(conteudo);
  }
  return encontrados;
}

describe("isolamento do dominio", () => {
  it("encontra os arquivos do dominio", () => {
    expect(arquivosDoDominio().length).toBeGreaterThan(0);
  });

  it.each(arquivosDoDominio())("%s nao importa framework, banco nem camada externa", (nome) => {
    const conteudo = readFileSync(join(DIR_DOMINIO, nome), "utf8");
    for (const especificador of importsDe(conteudo)) {
      const proibido = IMPORTS_PROIBIDOS.some(
        (p) => especificador === p || especificador.startsWith(`${p}/`),
      );
      expect(proibido, `${nome} importa ${especificador}`).toBe(false);
    }
  });

  it.each(arquivosDoDominio())("%s so importa de lib ou do proprio dominio", (nome) => {
    const conteudo = readFileSync(join(DIR_DOMINIO, nome), "utf8");
    for (const especificador of importsDe(conteudo)) {
      const relativo = especificador.startsWith(".");
      const libPermitida = PERMITIDOS_FORA_DO_DOMINIO.includes(especificador);
      const decimalDireto = especificador === "decimal.js";
      expect(
        relativo || libPermitida || decimalDireto,
        `${nome} importa ${especificador}, fora da lista permitida`,
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Rodar o teste**

Run: `npm test -- tests/unit/domain/isolamento.test.ts`
Expected: PASS. Se falhar apontando um import, o import e que esta errado, nao o teste.

- [ ] **Step 3: Rodar a suite inteira com cobertura**

Run: `npm run test:cov`
Expected: PASS em todos os arquivos, e cobertura de 100% em `src/features/**/domain/**` e `src/lib/**`. Se algum ramo ficar descoberto, escreva o teste que falta antes de seguir. Nao baixe o limite.

- [ ] **Step 4: Rodar tipos, lint e build**

```bash
npm run typecheck && npm run check && npm run build
```

Esperado: os tres limpos.

- [ ] **Step 5: Escrever o README com as formulas e as limitacoes**

Substitua `README.md` pelo conteudo abaixo. As formulas ficam escritas porque a spec exige, e as limitacoes ficam declaradas porque a ferramenta mexe com dinheiro de verdade.

````markdown
# Simulador de Venda de Gado

Compara ofertas de compradores de gado e ordena por valor presente liquido por cabeca,
nao por preco bruto da arroba.

O preco da arroba sozinho nao decide nada. R$ 320 com pagamento em 30 dias pode render
menos que R$ 312 a vista, e R$ 325 com rendimento acordado menor e frete por conta do
produtor pode ser a pior das tres.

## Estado

Dominio de calculo pronto e testado. Persistencia, autenticacao e interface ainda nao.

## Cadeia de calculo

Tudo por cabeca. Os totais do lote sao multiplicacao no fim, para que o arredondamento
nao se acumule.

```
peso_vivo_efetivo   = peso_vivo_medio_kg * (1 - quebra_pct)
peso_carcaca        = peso_vivo_efetivo * rendimento_acordado
arrobas             = peso_carcaca / 15
receita_bruta       = arrobas * preco_arroba
receita_ajustada    = receita_bruta + bonificacoes - descontos_qualidade
tributos            = receita_bruta * aliquota_do_regime_vigente
frete_por_cabeca    = isento     -> 0
                      por_cabeca -> frete_valor
                      por_km     -> (frete_valor * km_rodados) / cabecas
outras_deducoes     = receita_bruta * comissao_pct + outros ajustes
receita_liquida     = receita_ajustada - tributos - frete_por_cabeca - outras_deducoes
taxa_diaria         = (1 + taxa_desconto_anual) ^ (1/365) - 1
valor_presente      = receita_liquida / (1 + taxa_diaria) ^ prazo_dias
```

## Premissas declaradas

- Uma arroba equivale a 15 kg de carcaca.
- A contribuicao sobre a comercializacao incide sobre a receita bruta, antes de
  bonificacao e de desconto de qualidade.
- A comissao do corretor incide sobre a receita bruta.
- No modo por km, `km_rodados` e a quilometragem que a transportadora cobra. Inclua o
  retorno vazio ali se ela cobrar o retorno.
- A conversao de taxa anual para diaria e composta, `(1+i)^(1/365)-1`. Dividir por 365
  subestima o desconto.
- A quebra de peso e sempre informada pelo usuario. O simulador nao adivinha.

## Limitacoes

- O calculo tributario e estimativa. Ele nao substitui orientacao contabil.
- Nesta versao cada oferta tem um prazo unico. Pagamento parcelado nao entra no
  comparativo.
- ICMS e diferimento estadual estao fora do escopo.
- Um lote por simulacao.

## Verificacao

```bash
npm run test:cov   # testes com cobertura de 100% no dominio
npm run typecheck  # tipos
npm run check      # lint e formatacao
npm run build      # build de producao
```

## Convencoes

Vocabulario de curral em codigo e interface: cabeca, arroba, quebra, rendimento, prazo,
frete. Identificadores em portugues sem acento. Nao usar travessao em texto algum do
projeto.
````

- [ ] **Step 6: Confirmar que nenhum segredo entrou no historico**

```bash
git log --all --name-only --pretty=format: | sort -u | grep -E '^\.env' && echo "ALERTA: env no historico" || echo "historico limpo"
```

Esperado: `historico limpo`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: isolamento do dominio e readme com formulas e limitacoes"
```

---

## Definicao de pronto deste plano

Antes de declarar o plano concluido, cole a saida real destes comandos. Nao afirme que
passa sem ter rodado.

```bash
npm run test:cov
npm run typecheck
npm run check
npm run build
```

Criterios:

- Todos os testes passam.
- Cobertura de 100% em linhas, funcoes, ramos e comandos dentro de
  `src/features/**/domain/**` e `src/lib/**`.
- Nenhum erro de tipo, nenhum `any`.
- Build de producao limpo.
- Caso de conferencia manual passando com os valores da spec.
- Nenhum arquivo `.env` rastreado ou no historico.

## O que vem depois

Plano 2, persistencia e auth: esquema Drizzle com os checks da spec, migrations, carga
dos regimes tributarios com vigencia, Auth.js v5 com Credentials, repositorios com
`orgId` obrigatorio e o teste de isolamento entre organizacoes.

Plano 3, interface e compartilhamento: plano de design com autocritica escrita,
formulario de oferta, tabela comparativa, cascata de deducoes, rota publica com token
opaco, favicon, OG dinamico e deploy.
