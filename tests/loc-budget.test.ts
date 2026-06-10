import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

// AGENTS.md code-review aspect 4: "No file > 500 LOC." This test makes the
// rule unmissable instead of reviewer-memory-dependent. LOC here means raw
// file lines — comments and blanks count; CRLF and LF both count once; a
// single trailing newline does not add a line. (Matches `wc -l` for files
// that end with a newline, i.e. every file in this repo.)
const MAX_LINES = 500;

// Oversized test suites are pinned at their size as of 2026-06-09 and may
// only shrink. When a pinned file drops to <= MAX_LINES, the "ratchet entries
// stay honest" test forces its entry to be deleted. Splitting these suites is
// tracked follow-up work; the ratchet stops growth without churning ~5k lines
// of test code inside the same refactor diff. src/ gets no such list: every
// engine source file must fit the budget outright.
const TEST_RATCHET: ReadonlyMap<string, number> = new Map([
  ['layer.test.ts', 857],
  // 861 = size at the commit that introduced this test: the same commit's
  // prototype-chain fix to the FORBIDDEN-list meta-test added 13 lines.
  ['command-transaction.test.ts', 861],
  ['world.test.ts', 811],
  ['world-commands.test.ts', 717],
  ['serializer.test.ts', 675],
  ['session-fork.test.ts', 648],
  ['behavior-tree.test.ts', 565],
  ['behavioral-metrics.test.ts', 519],
  ['occupancy-grid.test.ts', 503],
]);

function countLines(filePath: string): number {
  const content = readFileSync(filePath, 'utf8');
  if (content.length === 0) return 0;
  const lines = content.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  return lines.length;
}

function tsFilesRecursive(dir: string, relativeTo: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...tsFilesRecursive(full, relativeTo));
    } else if (entry.endsWith('.ts')) {
      results.push(path.relative(relativeTo, full).replace(/\\/g, '/'));
    }
  }
  return results;
}

const srcDir = path.join(process.cwd(), 'src');
const testsDir = path.join(process.cwd(), 'tests');

describe('LOC budget', () => {
  test('every src/*.ts file is within the 500-line budget', () => {
    const over = tsFilesRecursive(srcDir, srcDir)
      .map((name) => ({ name, lines: countLines(path.join(srcDir, name)) }))
      .filter((file) => file.lines > MAX_LINES)
      .map((file) => `${file.name} (${file.lines})`);
    expect(over, `src files over the ${MAX_LINES}-line budget: ${over.join(', ')}`).toEqual([]);
  });

  test('every tests/*.ts file respects the budget or its ratchet pin', () => {
    const over = tsFilesRecursive(testsDir, testsDir)
      .map((name) => ({
        name,
        lines: countLines(path.join(testsDir, name)),
        limit: TEST_RATCHET.get(name) ?? MAX_LINES,
      }))
      .filter((file) => file.lines > file.limit)
      .map((file) => `${file.name} (${file.lines} > ${file.limit})`);
    expect(over, `test files over budget/pin: ${over.join(', ')}`).toEqual([]);
  });

  test('ratchet entries stay honest', () => {
    const testFiles = new Set(tsFilesRecursive(testsDir, testsDir));
    for (const [name, pin] of TEST_RATCHET) {
      expect(testFiles.has(name), `ratchet entry '${name}' no longer exists; delete it`).toBe(true);
      expect(pin, `ratchet pin for '${name}' must exceed the base budget`).toBeGreaterThan(MAX_LINES);
      const lines = countLines(path.join(testsDir, name));
      expect(
        lines,
        `'${name}' is now within the base budget (${lines} <= ${MAX_LINES}); delete its ratchet entry`,
      ).toBeGreaterThan(MAX_LINES);
      // True ratchet: a pin is the file's exact current size. When a pinned
      // file shrinks, this forces the pin down with it in the same commit, so
      // reclaimed headroom cannot be silently regrown later.
      expect(
        lines,
        `'${name}' shrank below its pin (${lines} < ${pin}); tighten the pin to ${lines}`,
      ).toBe(pin);
    }
  });
});
