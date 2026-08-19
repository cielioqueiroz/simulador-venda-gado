import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ajustesOferta, ofertas, organizations, regimesTributarios, simulacoes } from "@/db/schema";
import { REGIMES_INICIAIS } from "@/db/seed/regimes";
import { type BancoDeTeste, criarBancoDeTeste, restricaoViolada } from "../ajuda/banco";

let banco: BancoDeTeste;
let orgId: string;

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  const [org] = await banco.db.insert(organizations).values({ nome: "Fazenda Teste" }).returning();
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
    const violada = await restricaoViolada(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), rendimentoAcordado: "0.39" }),
    );
    expect(violada).toBe("oferta_rendimento_faixa");
  });

  it("recusa rendimento acima de 0.65", async () => {
    const simulacaoId = await novaSimulacao();
    const violada = await restricaoViolada(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), rendimentoAcordado: "0.66" }),
    );
    expect(violada).toBe("oferta_rendimento_faixa");
  });

  it("aceita rendimento nos limites 0.4 e 0.65", async () => {
    const simulacaoId = await novaSimulacao();
    const [minimo] = await banco.db
      .insert(ofertas)
      .values({ ...ofertaBase(simulacaoId), rendimentoAcordado: "0.4" })
      .returning();
    const [maximo] = await banco.db
      .insert(ofertas)
      .values({ ...ofertaBase(simulacaoId), rendimentoAcordado: "0.65" })
      .returning();
    expect(minimo?.rendimentoAcordado).toBe("0.4000");
    expect(maximo?.rendimentoAcordado).toBe("0.6500");
  });

  it("recusa quebra acima de 0.1", async () => {
    const simulacaoId = await novaSimulacao();
    const violada = await restricaoViolada(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), quebraPct: "0.11" }),
    );
    expect(violada).toBe("oferta_quebra_faixa");
  });

  it("recusa quebra negativa", async () => {
    const simulacaoId = await novaSimulacao();
    const violada = await restricaoViolada(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), quebraPct: "-0.01" }),
    );
    expect(violada).toBe("oferta_quebra_faixa");
  });

  it("recusa frete por km sem quilometragem", async () => {
    const simulacaoId = await novaSimulacao();
    const violada = await restricaoViolada(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), kmRodados: null }),
    );
    expect(violada).toBe("oferta_km_exigido_no_modo_por_km");
  });

  it("recusa frete isento com custo diferente de zero", async () => {
    const simulacaoId = await novaSimulacao();
    const violada = await restricaoViolada(
      banco.db.insert(ofertas).values({
        ...ofertaBase(simulacaoId),
        freteModo: "isento",
        freteValor: "50",
        kmRodados: null,
      }),
    );
    expect(violada).toBe("oferta_isento_sem_custo");
  });

  it("recusa prazo negativo", async () => {
    const simulacaoId = await novaSimulacao();
    const violada = await restricaoViolada(
      banco.db.insert(ofertas).values({ ...ofertaBase(simulacaoId), prazoDias: -1 }),
    );
    expect(violada).toBe("oferta_prazo_nao_negativo");
  });

  it("aceita prazo zero, que e pagamento a vista", async () => {
    const simulacaoId = await novaSimulacao();
    const [oferta] = await banco.db
      .insert(ofertas)
      .values({ ...ofertaBase(simulacaoId), prazoDias: 0 })
      .returning();
    expect(oferta?.prazoDias).toBe(0);
  });

  it("recusa lote sem cabeca", async () => {
    const violada = await restricaoViolada(
      banco.db.insert(simulacoes).values({
        orgId,
        nome: "Lote vazio",
        cabecas: 0,
        pesoVivoMedioKg: "480",
        categoriaAnimal: "boi",
        taxaDescontoAnual: "0.12",
        regimeTributarioId: "pf-receita-bruta",
      }),
    );
    expect(violada).toBe("simulacao_cabecas_positivo");
  });

  it("recusa regime com vigencia terminando antes de comecar", async () => {
    const violada = await restricaoViolada(
      banco.db.insert(regimesTributarios).values({
        id: "invertido",
        nome: "Invertido",
        descricao: "Vigencia impossivel",
        vigenciaInicio: "2020-01-01",
        vigenciaFim: "2019-01-01",
      }),
    );
    expect(violada).toBe("regime_vigencia_coerente");
  });

  it("recusa ajuste percentual acima de 100%", async () => {
    const simulacaoId = await novaSimulacao();
    const [oferta] = await banco.db.insert(ofertas).values(ofertaBase(simulacaoId)).returning();
    if (oferta === undefined) throw new Error("oferta nao criada");
    const violada = await restricaoViolada(
      banco.db.insert(ajustesOferta).values({
        orgId,
        ofertaId: oferta.id,
        tipo: "bonificacao",
        nome: "cota absurda",
        modo: "percentual",
        valor: "1.5",
      }),
    );
    expect(violada).toBe("ajuste_percentual_ate_cem");
  });
});
