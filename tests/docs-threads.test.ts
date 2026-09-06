// Harness: the pre-migration docs/threads gate. This keeps its whole-docs raw
// filename/path prohibition and per-work/per-review category checks under the
// permanent docs/work contract. Inline mutation proofs live in
// docs-work-validator.test.ts; the helper uses no sibling fleet checkout.
// Bound: current tree structure, bytes, and effective Git attributes. It does
// not prove historical grouping, prose truth, reviewer independence, or status.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { validateGitAttributes, validateWorkDocs } from './helpers/docs-work-validator.js';

const root = process.cwd();
const gitSafeRoot = root.replaceAll('\\', '/');
function git(args: string[], input?: string) {
  return execFileSync('git', ['-c', `safe.directory=${gitSafeRoot}`, ...args], {
    cwd: root, encoding: 'utf8', input, timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'],
  });
}
function readDocuments() {
  const files = new Map<string, Buffer>();
  const directories = new Set<string>();
  function walk(directory: string, prefix = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = prefix + entry.name;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) { directories.add(name); walk(fullPath, name + '/'); }
      else if (entry.isFile()) files.set(name, readFileSync(fullPath));
      else throw new Error(`docs/${name} is not an ordinary file or directory; review the unexpected entry.`);
    }
  }
  walk(path.join(root, 'docs'));
  return { files, directories };
}
function readLegacySource(source: string) {
  const match = /^civ-engine@([0-9a-f]{40}|[0-9a-f]{64}):(.+)$/.exec(source);
  if (!match || /[\\\0\r\n]/.test(match[2]) || match[2].split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':'))) {
    throw new Error(`Historical raw source ${source} needs civ-engine@<full-commit>:<safe-repo-path>.`);
  }
  return execFileSync('git', ['-c', `safe.directory=${gitSafeRoot}`, 'show', `${match[1]}:${match[2]}`], { cwd: root, timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
}

describe('permanent work documentation structure', () => {
  test('keeps registered plans, every authored review round, and exact historical exceptions', () => {
    const { files, directories } = readDocuments();
    expect(validateWorkDocs(files, directories, readLegacySource)).toEqual([]);
  });
  test('Git preserves the exact bytes used by imported-file and review-target digests', () => {
    const { files } = readDocuments();
    const workPaths = [...files.keys()].filter((file) => file.startsWith('work/')).map((file) => `docs/${file}`);
    expect(workPaths.length, 'docs/work must exist before its Git attributes can be verified').toBeGreaterThan(0);
    const output = git(['check-attr', '-z', '--stdin', 'text', 'filter', 'working-tree-encoding', 'ident'], workPaths.join('\0') + '\0');
    expect(validateGitAttributes(output, workPaths)).toEqual([]);
  });
});
