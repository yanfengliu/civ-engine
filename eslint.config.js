import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**'],
  },
  // Targeted type-aware rules (full-review 2026-06-10 S2/S3). Full
  // recommendedTypeChecked is deferred (churn); these five carry the load:
  // floating/misused promises guard the async surface (runAgentPlaytest,
  // sinks), and consistent-type-imports + no-import-type-side-effects make
  // the World layer chain's "upward imports are type-only" invariant
  // (ADR 43) lint-enforced instead of convention-only.
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },
);
