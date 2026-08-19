import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

describe("trilho de teste", () => {
  it("roda o vitest e enxerga o decimal.js", () => {
    expect(new Decimal("0.1").plus("0.2").toString()).toBe("0.3");
  });
});
