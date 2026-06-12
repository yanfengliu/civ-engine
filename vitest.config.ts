import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Scoped to the root suite: the mcp/ subpackage runs its own vitest with
  // its own dependency tree (review H2 — an unscoped include would sweep
  // mcp/tests in CI before mcp's npm ci / the root build).
  test: { include: ['tests/**/*.test.ts'] },
});
