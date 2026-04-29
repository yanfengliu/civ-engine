import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const docsDir = path.join(process.cwd(), 'docs');
const legacyReviewsDir = path.join(docsDir, 'reviews');
const threadsDir = path.join(docsDir, 'threads');

const threadNamePattern = /^[a-z0-9][a-z0-9-]*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const iterationPattern = /^(?:\d+|(?:design|plan)-\d+|tie-breaker)$/;

function listEntries(dir: string) {
  return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.name !== '.gitkeep');
}

describe('docs thread archive structure', () => {
  test('uses summary-only docs/threads lifecycle folders', () => {
    expect(existsSync(legacyReviewsDir), 'legacy review directory should be fully migrated to docs/threads').toBe(
      false,
    );
    expect(existsSync(path.join(threadsDir, 'done')), 'docs/threads/done should exist').toBe(true);
    expect(existsSync(path.join(threadsDir, 'current')), 'docs/threads/current should exist').toBe(true);
    expect(listEntries(threadsDir).map((entry) => entry.name).sort()).toEqual(['current', 'done']);

    for (const lifecycle of ['current', 'done'] as const) {
      const lifecycleDir = path.join(threadsDir, lifecycle);

      for (const threadEntry of listEntries(lifecycleDir)) {
        expect(threadEntry.isDirectory(), `${threadEntry.name} should be a thread directory`).toBe(true);
        expect(threadEntry.name, `${threadEntry.name} should be a concise kebab-case objective`).toMatch(
          threadNamePattern,
        );

        const threadDir = path.join(lifecycleDir, threadEntry.name);
        for (const dateEntry of listEntries(threadDir)) {
          expect(dateEntry.isDirectory(), `${threadEntry.name}/${dateEntry.name} should be a date directory`).toBe(
            true,
          );
          expect(dateEntry.name, `${threadEntry.name}/${dateEntry.name} should use yyyy-mm-dd`).toMatch(datePattern);

          const dateDir = path.join(threadDir, dateEntry.name);
          for (const iterationEntry of listEntries(dateDir)) {
            expect(
              iterationEntry.isDirectory(),
              `${threadEntry.name}/${dateEntry.name}/${iterationEntry.name} should be an iteration directory`,
            ).toBe(true);
            expect(
              iterationEntry.name,
              `${threadEntry.name}/${dateEntry.name}/${iterationEntry.name} should be numeric or design-N/plan-N`,
            ).toMatch(iterationPattern);

            const iterationDir = path.join(dateDir, iterationEntry.name);
            const iterationEntries = listEntries(iterationDir);
            expect(
              iterationEntries.map((entry) => entry.name).sort(),
              `${threadEntry.name}/${dateEntry.name}/${iterationEntry.name} should keep only REVIEW.md`,
            ).toEqual(['REVIEW.md']);
          }
        }
      }
    }
  });
});
