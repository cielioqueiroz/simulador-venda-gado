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
    expect(() => comoUserId("")).toThrow();
    expect(() => comoSimulacaoId("")).toThrow();
    expect(() => comoOfertaId("")).toThrow();
  });

  it("recusa string so de espaco", () => {
    expect(() => comoOrgId("   ")).toThrow();
  });
});
