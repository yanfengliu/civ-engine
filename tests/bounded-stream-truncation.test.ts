// A `replace_all` on a call-shape pattern silently skips the differently-
// formatted call sites — and a test that only exercises the matched ones passes
// green.
//
// Provenance: full-review 2026-07-10 M1. Truncation tracking was wired into 1 of
// 5 bounded streams. The edit LOOKED complete: a `_pushBounded` helper was added
// and "all call sites" swept with `replace_all` on `pushBounded(this.`. That
// literal matched the ONE single-line call — `pushBounded(this.tickEntries, …)`
// — and not the four written as `pushBounded(\n      this.commandEntries, …)`,
// because the newline and indent between `(` and `this.` break the match. The
// suite stayed green because the only regression test exercised the tick-entry
// stream that DID get rewritten, and a command-only eviction shipped a
// payload-gapped bundle advertising full replayability, which replayed WRONG
// state silently.
//
// The regression test written for that fix is still not a gate for its own
// class. Measured 2026-09-02: routing `recordExecution` around the helper again
// leaves `tests/replay-truncation-guard.test.ts` green (5/5) and the whole suite
// green (1382/1382), because that test asserts one shared `truncated` flag which
// any ONE of the three commandCapacity-bounded streams satisfies on its own.
// That is the same false green the lesson describes, at a different call site.
//
// So this file gates the STRUCTURE, which has no such horizon: every bounded
// stream must route through the one helper that sets the flag, and the set of
// streams is pinned by name. A new stream, a bypassed stream, or a renamed
// stream all fail here. The behavioural cases below cover the axes that can be
// isolated; the structural check covers the ones that cannot.
//
// The lesson's own rule, made mechanical: after a structural `replace_all`,
// prove the match count equals the intended count. When a fix claims to cover N
// cases, the check must know what N is.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { World, WorldHistoryRecorder, runScenario } from '../src/index.js';

const RECORDER = path.join('src', 'history-recorder.ts');

/**
 * Every bounded stream in WorldHistoryRecorder, and the capacity that bounds it.
 * This list IS the intended count. Changing it is a deliberate act; drifting
 * from it is the defect.
 */
const BOUNDED_STREAMS = [
  'this.recordedCommandEntries',
  'this.tickEntries',
  'this.commandEntries',
  'this.executionEntries',
  'this.failureEntries',
] as const;

const source = (): ts.SourceFile =>
  ts.createSourceFile(
    RECORDER,
    readFileSync(path.join(process.cwd(), RECORDER), 'utf8'),
    ts.ScriptTarget.ES2022,
    true,
  );

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  node.forEachChild((child) => walk(child, visit));
}

/** The function-or-method declaration a node is lexically inside. */
function enclosingName(node: ts.Node): string {
  for (let cursor: ts.Node | undefined = node.parent; cursor; cursor = cursor.parent) {
    if (ts.isMethodDeclaration(cursor) || ts.isFunctionDeclaration(cursor)) {
      return cursor.name?.getText() ?? '<anonymous>';
    }
  }
  return '<top level>';
}

describe('bounded-stream truncation tracking', () => {
  it('every bounded stream routes through the flag-setting helper', () => {
    const file = source();
    const routed: string[] = [];
    const bypassed: string[] = [];

    walk(file, (node) => {
      if (!ts.isCallExpression(node)) return;
      const callee = node.expression;

      // `this._pushBounded(<stream>, …)` — the routed shape.
      if (
        ts.isPropertyAccessExpression(callee) &&
        callee.expression.kind === ts.SyntaxKind.ThisKeyword &&
        callee.name.text === '_pushBounded'
      ) {
        routed.push(node.arguments[0]?.getText().trim() ?? '<no argument>');
        return;
      }

      // Bare `pushBounded(…)` — legal ONLY inside the helper itself.
      if (ts.isIdentifier(callee) && callee.text === 'pushBounded') {
        bypassed.push(`${enclosingName(node)}: ${node.getText().split('\n')[0]!.trim()}`);
      }
    });

    // Control: an empty `bypassed` list from a walk that matched nothing looks
    // exactly like a clean file. Prove the instrument found the routed calls.
    expect(routed.length, 'the AST walk found no _pushBounded calls at all').toBeGreaterThan(0);

    expect(
      bypassed.filter((entry) => !entry.startsWith('_pushBounded:')),
      'A bounded-stream push bypasses `this._pushBounded`, so eviction on that stream will ' +
        'not set `truncated`. The bundle then advertises full replayability over a gapped ' +
        'body and replays WRONG state silently. Route it through the helper.',
    ).toEqual([]);

    expect(
      [...routed].sort(),
      'The set of bounded streams changed. Every one must feed the shared `_truncated` flag, ' +
        'and a NEW stream also needs behavioural coverage below — a test that exercises only ' +
        'the representative stream passes green over a half-done fix.',
    ).toEqual([...BOUNDED_STREAMS].sort());
  });

  it('no bounded stream is pushed to directly', () => {
    // The second way to bypass the helper: `this.tickEntries.push(entry)`.
    const file = source();
    const direct: string[] = [];
    walk(file, (node) => {
      if (!ts.isCallExpression(node)) return;
      const callee = node.expression;
      if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'push') return;
      const target = callee.expression.getText().trim();
      if ((BOUNDED_STREAMS as readonly string[]).includes(target)) {
        direct.push(`${enclosingName(node)}: ${target}.push(…)`);
      }
    });
    expect(
      direct,
      'A bounded stream is pushed to directly, so it can grow past its capacity or evict ' +
        'without setting `truncated`.',
    ).toEqual([]);
  });
});

interface Cmds {
  spawn: { x: number; y: number };
}

function runCommandScenario(
  name: string,
  ticks: number,
  history: { capacity?: number; commandCapacity?: number; captureCommandPayloads?: boolean },
): ReturnType<typeof runScenario<Record<string, never>, Cmds>> {
  const world = new World<Record<string, never>, Cmds>({ gridWidth: 10, gridHeight: 10, tps: 60 });
  world.registerHandler('spawn', () => undefined);
  return runScenario<Record<string, never>, Cmds>({
    name,
    world,
    history,
    setup: () => undefined,
    run: (ctx) => {
      for (let i = 0; i < ticks; i++) {
        ctx.submit('spawn', { x: 0, y: 0 });
        ctx.step();
      }
    },
    checks: [],
  });
}

describe('bounded-stream truncation, per capacity axis', () => {
  it('tick-entry eviction alone sets truncated', () => {
    const result = runCommandScenario('ticks', 10, { capacity: 3, commandCapacity: 1000 });
    expect(result.history.truncated).toBe(true);
  });

  it('command eviction with payload capture off still sets truncated', () => {
    // Payloads off means `recordedCommandEntries` never receives a push, so this
    // isolates the submission/execution streams from the payload stream — the
    // one the original fix DID rewrite.
    const result = runCommandScenario('cmds-nopayload', 20, {
      capacity: 1000,
      commandCapacity: 5,
      captureCommandPayloads: false,
    });
    expect(result.history.truncated).toBe(true);
  });

  it('failure-stream eviction alone sets truncated', () => {
    // `failureEntries` is the stream no existing test reaches at all. A failing
    // tick records a TickFailure and NO tick entry, so recovering between steps
    // fills the failure stream while `tickEntries` stays empty — the cleanest
    // isolation of any axis, and the one a shared-flag assertion would let a
    // sibling stream satisfy on its behalf.
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60, strict: false });
    world.registerSystem(() => {
      throw new Error('deliberate system failure');
    });
    const recorder = new WorldHistoryRecorder({ world, capacity: 3 });
    recorder.connect();
    for (let i = 0; i < 10; i++) {
      expect(() => world.step()).toThrow();
      world.recover();
    }
    const state = recorder.getState();
    expect(state.ticks.length, 'a failing tick must record no tick entry').toBe(0);
    expect(state.failures.length, 'the failure stream must have evicted down to capacity').toBe(3);
    expect(state.truncated).toBe(true);
  });
});
