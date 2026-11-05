import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Módulos com `import "server-only"` são testáveis no Node.
      "server-only": path.resolve(__dirname, "tests/mocks/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Testes RLS acessam o Supabase local — timeouts maiores.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Sequencial: seed compartilhado entre os testes.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
