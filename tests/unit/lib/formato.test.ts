import { describe, expect, it } from "vitest";
import { formatarArrobas, formatarBRL, formatarPercentual, formatarPeso } from "@/lib/formato";
import { dec } from "@/lib/money";

describe("formatarBRL", () => {
  it("formata com duas casas e separador brasileiro", () => {
    expect(formatarBRL(dec("4914.0263"))).toBe("4.914,03");
  });

  it("arredonda meio para cima na exibicao", () => {
    expect(formatarBRL(dec("0.005"))).toBe("0,01");
  });

  it("formata zero", () => {
    expect(formatarBRL(dec(0))).toBe("0,00");
  });

  it("preserva o sinal negativo, porque frete alto pode inverter o resultado", () => {
    expect(formatarBRL(dec("-120.5"))).toBe("-120,50");
  });

  it("aceita zero casas para valores totais grandes", () => {
    expect(formatarBRL(dec("196561.0516"), 0)).toBe("196.561");
  });
});

describe("formatarPercentual", () => {
  it("converte fracao em percentual com uma casa", () => {
    expect(formatarPercentual(dec("0.015"))).toBe("1,5%");
  });

  it("mostra zero por cento", () => {
    expect(formatarPercentual(dec(0))).toBe("0%");
  });

  it("aceita mais casas quando a aliquota exige", () => {
    expect(formatarPercentual(dec("0.0025"), 2)).toBe("0,25%");
  });

  it("formata percentual de dois digitos", () => {
    expect(formatarPercentual(dec("0.12"))).toBe("12%");
  });
});

describe("formatarArrobas", () => {
  it("mostra quatro casas, que e a precisao da coluna", () => {
    expect(formatarArrobas(dec("15.9744"))).toBe("15,9744");
  });

  it("completa as casas de um valor redondo", () => {
    expect(formatarArrobas(dec(16))).toBe("16,0000");
  });
});

describe("formatarPeso", () => {
  it("mostra uma casa e a unidade", () => {
    expect(formatarPeso(dec("460.8"))).toBe("460,8 kg");
  });

  it("arredonda para uma casa", () => {
    expect(formatarPeso(dec("239.616"))).toBe("239,6 kg");
  });
});
