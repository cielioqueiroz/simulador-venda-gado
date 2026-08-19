import { readdirSync, readFileSync } from "node:fs";
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
