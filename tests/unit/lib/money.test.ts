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
