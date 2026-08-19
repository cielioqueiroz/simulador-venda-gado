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
import { comoOrgId, type OrgId, type SimulacaoId } from "@/lib/ids";
import { type BancoDeTeste, criarBancoDeTeste } from "../ajuda/banco";

let banco: BancoDeTeste;
let orgA: OrgId;
let orgB: OrgId;
let simulacaoDeA: SimulacaoId;

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

  it("a organizacao dona renomeia e apaga a propria simulacao", async () => {
    const idDescartavel = await criarSimulacao(banco.db, orgA, {
      nome: "Para apagar",
      cabecas: 10,
      pesoVivoMedioKg: "450",
      categoriaAnimal: "vaca",
      taxaDescontoAnual: "0.1",
      regimeTributarioId: "pf-receita-bruta",
    });
    expect(await renomearSimulacao(banco.db, orgA, idDescartavel, "Renomeada")).toBe(true);
    expect((await buscarSimulacao(banco.db, orgA, idDescartavel))?.nome).toBe("Renomeada");
    expect(await apagarSimulacao(banco.db, orgA, idDescartavel)).toBe(true);
    expect(await buscarSimulacao(banco.db, orgA, idDescartavel)).toBeNull();
  });
});
