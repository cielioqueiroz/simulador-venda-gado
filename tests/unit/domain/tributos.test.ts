import { describe, expect, it } from "vitest";
import type { RegimeTributario } from "@/features/simulacao/domain/tipos";
import {
  aliquotaTotal,
  calcularTributos,
  regimeVigenteEm,
} from "@/features/simulacao/domain/tributos";
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
    expect(memoria.map((l) => l.valor.toString())).toEqual(["61.341696", "5.111808", "10.223616"]);
  });

  it("a soma da memoria bate com o total", () => {
    const { total, memoria } = calcularTributos(dec("5111.808"), pfAtual);
    const somaMemoria = memoria.reduce((acc, l) => acc.plus(l.valor), dec(0));
    expect(somaMemoria.toString()).toBe(total.toString());
  });
});
