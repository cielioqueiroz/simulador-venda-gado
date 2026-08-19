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
    const r = calcularFrete(
      { freteModo: "por_cabeca", freteValor: dec("35"), kmRodados: null },
      40,
    );
    expect(r.porCabeca.toString()).toBe("35");
    expect(r.total.toString()).toBe("1400");
  });

  it("recusa lote sem cabeca", () => {
    expect(() =>
      calcularFrete({ freteModo: "por_cabeca", freteValor: dec("35"), kmRodados: null }, 0),
    ).toThrow(ErroFrete);
  });
});

describe("calcularFrete modo por_km", () => {
  it("multiplica valor por km rodado e rateia pelo lote", () => {
    const r = calcularFrete({ freteModo: "por_km", freteValor: dec("4"), kmRodados: dec(240) }, 40);
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
