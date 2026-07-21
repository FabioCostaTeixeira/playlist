import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/setup/server-only.ts") } },
  test: { environment: "node", include: ["tests/{unit,integration,security}/**/*.test.ts"], coverage: { provider: "v8", reporter: ["text", "html"], thresholds: { lines: 55, functions: 55, branches: 50, statements: 55 } } },
});
