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
