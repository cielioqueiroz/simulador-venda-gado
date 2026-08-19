import { describe, expect, it } from "vitest";
import { dec } from "@/lib/money";
import { KG_POR_ARROBA, kgParaArrobas } from "@/lib/units";

describe("KG_POR_ARROBA", () => {
  it("vale 15 kg", () => {
    expect(KG_POR_ARROBA.toString()).toBe("15");
  });
});

describe("kgParaArrobas", () => {
  it("converte 15 kg em uma arroba", () => {
    expect(kgParaArrobas(dec(15)).toString()).toBe("1");
  });

  it("converte 239.616 kg de carcaca em 15.9744 arrobas", () => {
    expect(kgParaArrobas(dec("239.616")).toString()).toBe("15.9744");
  });

  it("converte zero em zero", () => {
    expect(kgParaArrobas(dec(0)).toString()).toBe("0");
  });
});
