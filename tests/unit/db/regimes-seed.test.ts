import { describe, expect, it } from "vitest";
import { REGIMES_INICIAIS, regimesParaDominio } from "@/db/seed/regimes";
import { regimeVigenteEm } from "@/features/simulacao/domain";

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
