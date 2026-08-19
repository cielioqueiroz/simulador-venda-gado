import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    // `drizzle-kit generate` le apenas o esquema e nao conecta. Esta URL de reserva
    // existe para o config validar. `db:migrate` contra producao exige a real.
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/placeholder",
  },
  strict: true,
  verbose: true,
});
