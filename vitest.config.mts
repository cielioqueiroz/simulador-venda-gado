import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", "tests/ajuda/**"],
    coverage: {
      provider: "v8",
      include: ["src/features/**/domain/**", "src/lib/**"],
      // Esquema declarativo e config nao tem ramo para cobrir.
      exclude: ["src/db/**", "src/lib/env.ts"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
