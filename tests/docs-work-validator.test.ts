// Harness: tests/docs-threads.test.ts. Inline mutations prove the new standalone
// structural gate, including the old whole-docs raw-name/path checks. Bounds:
// filenames, bytes, registry shape and metadata; prose truth is owner-reviewed.
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { validateGitAttributes, validateWorkDocs } from './helpers/docs-work-validator.js';

const plan = `# Example

Status: active
Owner: Example owner
Created: 2026-09-05
Updated: 2026-09-05

## Problem and outcome
Preserve every authored review round.
## Scope
The repository's documentation only.
## Approach
Permanent numbered folders.
## Acceptance criteria
The structural gate rejects malformed work records.
## Implementation steps
Migrate the reviewed mapping and verify it.
## Outcome
Pending final acceptance.
`;
const review = `# Review 0: implementation

## Target
Committed source revision and named paths.
## Reviewers and coverage
Independent reviewer; read-only access.
## Reports
### Reviewer A
No material findings within the assigned scope.
## Findings and disposition
No findings were raised.
## Verification
The named focused gate passed.
## Round outcome
No material findings; final acceptance remains separate.
`;
const source = `civ-engine@${'a'.repeat(40)}:docs/old/REVIEW.md`;
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const registry = (allocations: unknown[] = [{ id: 0, theme: 'example' }]) =>
  Buffer.from(JSON.stringify({ version: 1, allocations }));
function fixture() {
  return new Map([
    ['work/.gitattributes', Buffer.from('* -text\n')],
    ['work/registry.json', registry()],
    ['work/0_example/plan.md', Buffer.from(plan)],
    ['work/0_example/reviews/0_implementation.md', Buffer.from(review)],
  ]);
}
function directories(files: Map<string, Buffer>) {
  return new Set([...files.keys()].flatMap((file) => {
    const parts = file.split('/');
    return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
  }));
}
const check = (files: Map<string, Buffer>, readSource?: (source: string) => Buffer) =>
  validateWorkDocs(files, directories(files), readSource);
function legacy(files: Map<string, Buffer>, file: string, bytes: Buffer) {
  files.set(`work/0_example/${file}`, bytes);
  files.set('work/registry.json', registry([{ id: 0, theme: 'example', legacyFiles: [{ path: file, sha256: hash(bytes), source }] }]));
}

describe('standalone work-document validator mutation controls', () => {
  test('accepts a complete modern record without requiring a design or README', () => {
    expect(check(fixture())).toEqual([]);
    const files = fixture();
    files.delete('work/0_example/reviews/0_implementation.md');
    expect(check(files)).toEqual([]);
  });
  test.each(['threads', 'reviews'])('rejects even an empty legacy docs/%s root', (root) => {
    const files = fixture();
    expect(validateWorkDocs(files, new Set([...directories(files), root]))).not.toEqual([]);
  });
  test.each(['threads', 'reviews'])('rejects a legacy docs/%s root represented by a file', (root) => {
    const files = fixture();
    files.set(root, Buffer.from('A legacy root must not survive as a file.\n'));
    expect(check(files)).not.toEqual([]);
  });
  test.each([
    [{ id: 1, theme: 'example' }],
    [{ id: 0, theme: 'example' }, { id: 2, theme: 'second' }],
    [{ id: 0, theme: 'example' }, { id: 0, theme: 'second' }],
    [{ id: 0, theme: true }],
  ])('rejects a missing, duplicate, or invalid allocation identity: %j', (...allocations) => {
    const files = fixture();
    files.set('work/registry.json', registry(allocations));
    expect(check(files)).not.toEqual([]);
  });
  test('rejects an absent registry, empty plan, unregistered folder, and missing allocated folder', () => {
    for (const mutation of [
      (files: Map<string, Buffer>) => files.delete('work/registry.json'),
      (files: Map<string, Buffer>) => files.set('work/0_example/plan.md', Buffer.alloc(0)),
      (files: Map<string, Buffer>) => files.set('work/1_unregistered/plan.md', Buffer.from(plan)),
      (files: Map<string, Buffer>) => files.set('work/registry.json', registry([{ id: 0, theme: 'example' }, { id: 1, theme: 'missing' }])),
    ]) {
      const files = fixture(); mutation(files); expect(check(files)).not.toEqual([]);
    }
  });
  test.each(['Owner', 'Status', 'Created', 'Updated'])('requires plan field %s', (field) => {
    const files = fixture();
    files.set('work/0_example/plan.md', Buffer.from(plan.replace(new RegExp(`^${field}:.*\\n`, 'm'), '')));
    expect(check(files)).not.toEqual([]);
  });
  test.each(['Problem and outcome', 'Scope', 'Approach', 'Acceptance criteria', 'Implementation steps', 'Outcome'])('requires nonempty plan section %s', (heading) => {
    const files = fixture();
    files.set('work/0_example/plan.md', Buffer.from(plan.replace(`## ${heading}\n`, '## Removed\n')));
    expect(check(files)).not.toEqual([]);
  });
  test('rejects invalid dates and accepts explicit unknown historical metadata', () => {
    const files = fixture();
    files.set('work/0_example/plan.md', Buffer.from(plan.replaceAll('2026-09-05', '2026-02-30')));
    expect(check(files)).not.toEqual([]);
    files.set('work/0_example/plan.md', Buffer.from(plan.replace('Status: active', 'Status: legacy').replaceAll('2026-09-05', 'Unknown (historical record; date not recorded)')));
    expect(check(files)).toEqual([]);
  });
  test.each(['Target', 'Reviewers and coverage', 'Reports', 'Findings and disposition', 'Verification', 'Round outcome'])('requires nonempty review section %s', (heading) => {
    const files = fixture();
    files.set('work/0_example/reviews/0_implementation.md', Buffer.from(review.replace(`## ${heading}\n`, '## Removed\n')));
    expect(check(files)).not.toEqual([]);
  });
  test.each(['reviews/1_plan.md', 'reviews/00_plan.md', 'reviews/0_unknown.md', 'reviews/nested/0_plan.md'])('rejects invalid round identity %s', (file) => {
    const files = fixture(); files.delete('work/0_example/reviews/0_implementation.md');
    files.set(`work/0_example/${file}`, Buffer.from(review)); expect(check(files)).not.toEqual([]);
  });
  test('rejects duplicate round numbers across different stages and design rounds without their document', () => {
    const files = fixture(); files.set('work/0_example/reviews/0_plan.md', Buffer.from(review));
    expect(check(files)).not.toEqual([]);
    files.delete('work/0_example/reviews/0_plan.md'); files.delete('work/0_example/reviews/0_implementation.md');
    files.set('work/0_example/reviews/0_design.md', Buffer.from(review)); expect(check(files)).not.toEqual([]);
    files.set('work/0_example/design.md', Buffer.from('# Design\nThe reviewed design.\n')); expect(check(files)).toEqual([]);
  });
  test('binds each legacy exemption to bytes and leaves future rounds strict', () => {
    const files = fixture(); const old = Buffer.from('# Original synthesis\nNo original target was recorded.\n');
    legacy(files, 'reviews/0_implementation.md', old); expect(check(files)).toEqual([]);
    files.set('work/0_example/reviews/0_implementation.md', Buffer.from('# Changed old review\n')); expect(check(files)).not.toEqual([]);
    files.set('work/0_example/reviews/0_implementation.md', Buffer.from(review)); expect(check(files)).toEqual([]);
    files.set('work/0_example/reviews/1_legacy.md', old); expect(check(files)).not.toEqual([]);
  });
  test('requires historical provenance and rejects changed imported historical bytes', () => {
    const files = fixture(); const old = Buffer.from('# Original plan\n');
    files.set('work/0_example/historical/PLAN.md', old); expect(check(files)).not.toEqual([]);
    legacy(files, 'historical/PLAN.md', old); expect(check(files)).toEqual([]);
    files.set('work/0_example/historical/PLAN.md', Buffer.from('# Changed plan\n')); expect(check(files)).not.toEqual([]);
  });
  test.each(['guides/prompt.md', 'guides/server.log', 'guides/raw/report.md', 'work/0_example/snapshots/stdout.txt'])('preserves the whole-docs raw transport rejection: %s', (file) => {
    const files = fixture(); files.set(file, Buffer.from('raw transport')); expect(check(files)).not.toEqual([]);
  });
  test('permits old raw bytes only when their declared committed source returns the same bytes', () => {
    const files = fixture(); const old = Buffer.from('historical captured output\n');
    legacy(files, 'historical/raw/stdout.txt', old);
    expect(check(files)).not.toEqual([]);
    expect(check(files, () => Buffer.from('different source'))).not.toEqual([]);
    expect(check(files, (requested) => { expect(requested).toBe(source); return old; })).toEqual([]);
  });
  test.each(['snapshots/capture.png', 'snapshots/capture.md', '.gitattributes', 'README.md'])('rejects binary snapshots and extra unit surfaces: %s', (file) => {
    const files = fixture(); files.set(`work/0_example/${file}`, Buffer.from([0, 255, 10])); expect(check(files)).not.toEqual([]);
  });
  test('requires exact work-root attributes and rejects unsupported empty directories', () => {
    const files = fixture(); files.set('work/.gitattributes', Buffer.from('* -text\r\n')); expect(check(files)).not.toEqual([]);
    const valid = fixture(); expect(validateWorkDocs(valid, new Set([...directories(valid), 'work/0_example/other']))).not.toEqual([]);
  });
});

describe('Git byte-preservation measurement', () => {
  const file = 'docs/work/0_example/plan.md';
  const attrs = (changes: Record<string, string> = {}) => ['text', 'filter', 'working-tree-encoding', 'ident']
    .flatMap((attribute) => [file, attribute, changes[attribute] ?? (attribute === 'text' ? 'unset' : 'unspecified')]).join('\0') + '\0';
  test('accepts exactly measured byte-preserving attributes', () => {
    expect(validateGitAttributes(attrs(), [file])).toEqual([]);
  });
  test.each(['text', 'filter', 'working-tree-encoding', 'ident'])('rejects an effective %s override', (attribute) => {
    expect(validateGitAttributes(attrs({ [attribute]: 'set' }), [file])).not.toEqual([]);
  });
  test('does not count an empty or partial measurement as success', () => {
    expect(validateGitAttributes('', [file])).not.toEqual([]);
    expect(validateGitAttributes(attrs(), [file, 'docs/work/registry.json'])).not.toEqual([]);
  });
});
