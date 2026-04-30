import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const docsDir = path.join(process.cwd(), 'docs');
const legacyReviewsDir = path.join(docsDir, 'reviews');
const threadsDir = path.join(docsDir, 'threads');

const threadNamePattern = /^[a-z0-9][a-z0-9-]*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const iterationPattern = /^(?:\d+|(?:design|plan)-\d+)$/;
const threadRootFiles = new Set(['DESIGN.md', 'PLAN.md']);
const splitReviewThreadParents = new Map<string, { parent: string; doc: string }>([
  ['session-recording-spec', { parent: 'session-recording', doc: 'DESIGN.md' }],
  ['session-recording-plan', { parent: 'session-recording', doc: 'PLAN.md' }],
]);
const forbiddenArtifactFileNames = new Set([
  'codex.md',
  'codex.txt',
  'claude.md',
  'claude.txt',
  'diff.md',
  'diff.txt',
  'error.md',
  'error.txt',
  'opus.md',
  'opus.txt',
  'prompt.md',
  'prompt.txt',
  'stderr.md',
  'stderr.txt',
  'stdout.md',
  'stdout.txt',
]);
const forbiddenArtifactFilePattern =
  /^(?:.*\.log|.*\.stderr|.*\.stdout|raw-.*\.md|.*-prompt\.md|.*-diff\.md|.*-stdout\.md|.*-stderr\.md|transcript-.*\.md)$/;

function listEntries(dir: string) {
  return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.name !== '.gitkeep');
}

function walkEntries(dir: string): string[] {
  return listEntries(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(docsDir, fullPath).replaceAll(path.sep, '/');
    return entry.isDirectory() ? [relativePath, ...walkEntries(fullPath)] : [relativePath];
  });
}

describe('docs thread archive structure', () => {
  test('uses thread-root design docs and summary-only iterations', () => {
    const requiredThreadDocs = new Map<string, Set<string>>();
    const requireThreadDoc = (lifecycle: string, thread: string, doc: string) => {
      const key = `${lifecycle}/${thread}`;
      const docs = requiredThreadDocs.get(key) ?? new Set<string>();
      docs.add(doc);
      requiredThreadDocs.set(key, docs);
    };

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
        const splitParent = splitReviewThreadParents.get(threadEntry.name);
        if (splitParent && lifecycle === 'done') {
          requireThreadDoc(lifecycle, splitParent.parent, splitParent.doc);
        }

        for (const dateEntry of listEntries(threadDir)) {
          if (threadRootFiles.has(dateEntry.name)) {
            expect(
              dateEntry.isFile(),
              `${threadEntry.name}/${dateEntry.name} should be a thread-root markdown file`,
            ).toBe(true);
            continue;
          }

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
            if (iterationEntry.name.startsWith('design-')) {
              requireThreadDoc(lifecycle, threadEntry.name, 'DESIGN.md');
            }
            if (iterationEntry.name.startsWith('plan-')) {
              requireThreadDoc(lifecycle, threadEntry.name, 'PLAN.md');
            }

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

    for (const [threadKey, docs] of requiredThreadDocs) {
      const [lifecycle, thread] = threadKey.split('/');
      for (const doc of docs) {
        expect(
          existsSync(path.join(threadsDir, lifecycle, thread, doc)),
          `${thread} should keep its authoritative ${doc} at the thread root`,
        ).toBe(true);
      }
    }
  });

  test('does not keep raw review or error-log artifacts in committed docs', () => {
    const forbiddenArtifacts = walkEntries(docsDir).filter((relativePath) => {
      const basename = path.basename(relativePath).toLowerCase();
      return (
        relativePath.split('/').includes('raw') ||
        forbiddenArtifactFileNames.has(basename) ||
        forbiddenArtifactFilePattern.test(basename)
      );
    });

    expect(forbiddenArtifacts).toEqual([]);
  });
});
