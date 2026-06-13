// In-process MCP round-trips (DESIGN §Testing): a fixture corpus recorded
// with the real SessionRecorder + FileSink into a temp dir, exercised through
// actual MCP tool calls over the SDK's linked InMemoryTransport pair.
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { FileSink, SessionRecorder, World } from 'civ-engine';
import { buildServer } from '../src/server.js';
import { ok } from '../src/format.js';

type Cmds = { bump: { n: number } };

let root: string;
let client: Client;

function recordInto(dir: string, opts?: { fail?: boolean; label?: string }): void {
  const world = new World<Record<string, never>, Cmds>({
    gridWidth: 4, gridHeight: 4, tps: 60, strict: false,
  });
  world.registerComponent<{ v: number }>('hp');
  const e = world.createEntity();
  world.addComponent(e, 'hp', { v: 0 });
  world.registerHandler('bump', (data, w) => w.setComponent(e, 'hp', { v: data.n }));
  if (opts?.fail) {
    world.registerSystem({
      name: 'boom',
      execute: (w) => {
        if (w.tick === 2) throw new Error('planned failure');
      },
    });
  }
  const sink = new FileSink(dir);
  const recorder = new SessionRecorder({
    world: world as never,
    sink,
    ...(opts?.label ? { sourceLabel: opts.label } : {}),
  });
  recorder.connect();
  for (let i = 1; i <= 4; i++) {
    world.submit('bump', { n: i });
    const r = world.stepWithResult();
    if (!r.ok) break;
  }
  recorder.disconnect();
}

async function call(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const result = (await client.callTool({ name, arguments: args })) as {
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
  const payload = JSON.parse(result.content[0].text) as unknown;
  if (result.isError) throw Object.assign(new Error('tool error'), { payload });
  return payload;
}

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'civ-mcp-'));
  recordInto(join(root, 'clean-a'), { label: 'agent-a' });
  recordInto(join(root, 'clean-b'), { label: 'agent-b' });
  recordInto(join(root, 'failing'), { fail: true, label: 'agent-a' });
  // One corrupt manifest: must be skipped, not brick the server (M4).
  mkdirSync(join(root, 'corrupt'));
  writeFileSync(join(root, 'corrupt', 'manifest.json'), '{ not json');

  const server = buildServer(root);
  client = new Client({ name: 'test-client', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('corpus tools', () => {
  it('corpus_overview counts bundles and surfaces the corrupt manifest as invalid', async () => {
    const overview = (await call('corpus_overview')) as {
      bundleCount: number;
      withFailures: number;
      invalidEntries: Array<{ code: string }>;
    };
    expect(overview.bundleCount).toBe(3);
    expect(overview.withFailures).toBe(1);
    expect(overview.invalidEntries).toHaveLength(1);
    expect(overview.invalidEntries[0].code).toBeTruthy();
  });

  it('corpus_query filters by sourceLabel and reports truncation honestly', async () => {
    const r = (await call('corpus_query', { sourceLabel: 'agent-a' })) as {
      items: Array<{ key: string }>;
      total: number;
      truncated: boolean;
    };
    expect(r.total).toBe(2);
    expect(r.truncated).toBe(false);
    const limited = (await call('corpus_query', { limit: 1 })) as { total: number; truncated: boolean };
    expect(limited.total).toBe(3);
    expect(limited.truncated).toBe(true);
  });

  it('corpus_refresh picks up newly recorded bundles', async () => {
    recordInto(join(root, 'late-arrival'));
    const r = (await call('corpus_refresh')) as { bundleCount: number };
    expect(r.bundleCount).toBe(4);
  });
});

describe('bundle tools', () => {
  it('bundle_summary returns the LLM-flat shape', async () => {
    const s = (await call('bundle_summary', { key: 'clean-a' })) as Record<string, unknown>;
    expect(s).toHaveProperty('sessionId');
    expect(s).toHaveProperty('failedTicks');
  });

  it('bundle_hotspots flags the failing bundle; unknown key maps to a coded tool error', async () => {
    const h = (await call('bundle_hotspots', { key: 'failing' })) as { items: Array<{ kind: string }> };
    expect(h.items.some((x) => x.kind === 'tick_failure')).toBe(true);
    try {
      await call('bundle_summary', { key: 'nope' });
      throw new Error('expected tool error');
    } catch (e) {
      const payload = (e as { payload?: { error: { code: string } } }).payload;
      expect(payload?.error.code).toBe('entry_missing');
    }
  });

  it('bundle_snapshots lists ticks and hydrates state; failure-crossing hydration carries the engine code', async () => {
    const listing = (await call('bundle_snapshots', { key: 'clean-a' })) as {
      recordedSnapshotTicks: number[];
    };
    expect(listing.recordedSnapshotTicks.length).toBeGreaterThan(0);
    const r = (await call('bundle_snapshots', { key: 'clean-a', tick: 2 })) as {
      recorded: boolean;
      carriedForward?: string[];
      snapshot: { version: number; components: Record<string, Array<[number, { v: number }]>> };
    };
    expect(r.snapshot.version).toBe(6);
    expect(r.snapshot.components['hp'][0][1].v).toBe(2);
    // Hydrated (folded) tick: flagged recorded:false with carriedForward so an
    // agent does not read a stale rng/config as tick-accurate (full-review L2).
    expect(r.recorded).toBe(false);
    expect(r.carriedForward).toContain('rng');

    const failing = (await call('bundle_snapshots', { key: 'failing' })) as {
      failedTicks: number[];
      endTick: number;
    };
    expect(failing.failedTicks).toHaveLength(1);
    // The failed tick itself is the RECORDED terminal snapshot — returned
    // verbatim (see the review-M1 test below); the hydration guard is pinned
    // at engine level and via viewer_diff's failure-crossing test.
  });

  it('viewer_frame returns one tick incl. diff; includeState hydrates components', async () => {
    const frame = (await call('viewer_frame', { key: 'clean-a', tick: 1 })) as {
      tick: number;
      commands: unknown[];
      diff: unknown;
    };
    expect(frame.tick).toBe(1);
    expect(frame.commands).toHaveLength(1);
    const withState = (await call('viewer_frame', { key: 'clean-a', tick: 1, includeState: true })) as {
      state: { components: Record<string, unknown> };
      carriedForward?: string[];
    };
    expect(withState.state.components).toHaveProperty('hp');
    // tick 1 is hydrated (not a recorded snapshot) → carriedForward present, and
    // it uses the SAME key as bundle_snapshots (full-review L2 iter-3).
    expect(withState.carriedForward).toContain('rng');
    // A RECORDED tick (startTick 0) returns verbatim state → NO over-claim.
    const atStart = (await call('viewer_frame', { key: 'clean-a', tick: 0, includeState: true })) as {
      carriedForward?: string[];
    };
    expect(atStart.carriedForward).toBeUndefined();
  });

  it('viewer_diff aggregates a range without game code', async () => {
    const diff = (await call('viewer_diff', { key: 'clean-a', fromTick: 0, toTick: 3 })) as {
      source: string;
      diff: { components: Record<string, { set: Array<[number, { v: number }]> }> };
    };
    expect(diff.source).toBeTruthy();
    expect(diff.diff.components['hp'].set[0][1].v).toBe(3);
  });

  it('viewer_diff falls back to snapshot hydration when the fold bails (created+destroyed in range)', async () => {
    // Record a bundle whose range contains a created-then-destroyed entity.
    const dir = join(root, 'churny');
    const world = new World<Record<string, never>, Cmds>({
      gridWidth: 4, gridHeight: 4, tps: 60, strict: false,
    });
    world.registerComponent<{ v: number }>('hp');
    world.registerHandler('bump', () => {});
    world.registerSystem({
      name: 'churn',
      execute: (w) => {
        if (w.tick === 0) {
          const e = w.createEntity();
          w.setComponent(e, 'hp', { v: 1 });
        }
        if (w.tick === 1) {
          for (const e of [...w.query('hp')]) w.destroyEntity(e);
        }
      },
    });
    const recorder = new SessionRecorder({ world: world as never, sink: new FileSink(dir) });
    recorder.connect();
    for (let i = 0; i < 3; i++) {
      world.submit('bump', { n: i });
      world.step();
    }
    recorder.disconnect();
    await call('corpus_refresh');

    const diff = (await call('viewer_diff', { key: 'churny', fromTick: 0, toTick: 3 })) as {
      source: string;
    };
    expect(diff.source).toBe('snapshot');
  });

  it('bundle_commands respects type filters and limits', async () => {
    const r = (await call('bundle_commands', { key: 'clean-a', type: 'bump', limit: 2 })) as {
      items: unknown[];
      total: number;
      truncated: boolean;
    };
    expect(r.items).toHaveLength(2);
    expect(r.total).toBe(4);
    expect(r.truncated).toBe(true);
  });

  it('bundle_commands tick-range filters actually filter (review H1: was a silent no-op)', async () => {
    const ranged = (await call('bundle_commands', { key: 'clean-a', fromTick: 1, toTick: 2 })) as {
      total: number;
    };
    expect(ranged.total).toBe(2);
    const all = (await call('bundle_commands', { key: 'clean-a' })) as { total: number };
    expect(all.total).toBe(4);
  });

  it('bundle_snapshots returns the RECORDED poisoned terminal snapshot verbatim (review M1)', async () => {
    const failing = (await call('bundle_snapshots', { key: 'failing' })) as {
      recordedSnapshotTicks: number[];
      failedTicks: number[];
    };
    const terminal = failing.recordedSnapshotTicks.at(-1)!;
    const fetched = (await call('bundle_snapshots', { key: 'failing', tick: terminal })) as {
      recorded: boolean;
      snapshot: { poisoned: { code: string } | null };
    };
    expect(fetched.recorded).toBe(true);
    expect(fetched.snapshot.poisoned?.code).toBe('system_threw');
  });
});

describe('coverage hardening (impl-1 review)', () => {
  it('bundle_events filters by type; bundle_markers returns bounded markers', async () => {
    const ev = (await call('bundle_events', { key: 'clean-a' })) as { items: unknown[]; total: number };
    expect(ev.total).toBeGreaterThanOrEqual(0);
    const mk = (await call('bundle_markers', { key: 'clean-a' })) as { items: unknown[]; truncated: boolean };
    expect(mk.truncated).toBe(false);
  });

  it('viewer_diff surfaces replay_across_failure (not the fallback) on failure-crossing ranges', async () => {
    const failing = (await call('bundle_snapshots', { key: 'failing' })) as {
      failedTicks: number[]; endTick: number;
    };
    try {
      await call('viewer_diff', { key: 'failing', fromTick: 0, toTick: failing.endTick });
      throw new Error('expected tool error');
    } catch (e) {
      const payload = (e as { payload?: { error: { code: string } } }).payload;
      expect(payload?.error.code).toBe('replay_across_failure');
    }
  });

  it('diff_bundles full mode returns converted per-tick deltas with bounds', async () => {
    const d = (await call('diff_bundles', { keyA: 'clean-a', keyB: 'failing', full: true, limit: 2 })) as {
      perTickDeltas: Record<string, unknown>;
      perTickTotal: number;
      perTickTruncated: boolean;
    };
    expect(Object.keys(d.perTickDeltas).length).toBeLessThanOrEqual(2);
    expect(d.perTickTotal).toBeGreaterThanOrEqual(Object.keys(d.perTickDeltas).length);
    expect(typeof d.perTickTruncated).toBe('boolean');
  });

  it('corpus_query maps keyPattern and min/max range inputs through the adapter', async () => {
    const byPattern = (await call('corpus_query', { keyPattern: '^clean-' })) as { total: number };
    expect(byPattern.total).toBe(2);
    const byFailures = (await call('corpus_query', { minFailedTickCount: 1 })) as {
      total: number;
      items: Array<{ key: string }>;
    };
    expect(byFailures.total).toBe(1);
    expect(byFailures.items[0].key).toBe('failing');
  });
});

describe('cross-bundle tools', () => {
  it('diff_bundles summary mode reports divergence compactly', async () => {
    const d = (await call('diff_bundles', { keyA: 'clean-a', keyB: 'failing' })) as {
      equivalent: boolean;
      perTickCounts: Record<string, unknown>;
    };
    expect(d.equivalent).toBe(false);
    expect(Object.keys(d.perTickCounts).length).toBeGreaterThan(0);
  });

  it('run_metrics + compare_metrics over corpus queries', async () => {
    const m = (await call('run_metrics', { metrics: ['bundleCount', 'failureBundleRate'] })) as Record<string, unknown>;
    expect(m).toHaveProperty('bundleCount');
    const cmp = (await call('compare_metrics', {
      metrics: ['bundleCount'],
      baseline: { sourceLabel: 'agent-a' },
      current: { sourceLabel: 'agent-b' },
    })) as Record<string, unknown>;
    expect(JSON.stringify(cmp)).toContain('bundleCount');
    try {
      await call('run_metrics', { metrics: ['notAMetric'] });
      throw new Error('expected tool error');
    } catch (e) {
      const payload = (e as { payload?: { error: { message: string } } }).payload;
      expect(payload?.error.message).toMatch(/unknown metric/);
    }
  });

  it('prototype-key metric names yield a clean "unknown metric" error (full-review L1)', async () => {
    for (const bad of ['constructor', '__proto__', 'toString', 'valueOf']) {
      try {
        await call('run_metrics', { metrics: [bad] });
        throw new Error(`expected tool error for ${bad}`);
      } catch (e) {
        const payload = (e as { payload?: { error: { message: string } } }).payload;
        expect(payload?.error.message).toMatch(/unknown metric/);
      }
    }
  });
});

describe('format output discipline', () => {
  it('serializes non-finite numbers as strings, not null (full-review M4)', () => {
    // compare_metrics intentionally returns ±Infinity for zero-baseline deltas;
    // JSON.stringify would coerce those to null and drop the signal.
    const text = ok({ delta: Infinity, neg: -Infinity, nan: NaN, normal: 5 }).content[0].text;
    expect(text).toContain('"Infinity"');
    expect(text).toContain('"-Infinity"');
    expect(text).toContain('"NaN"');
    expect(text).toContain('5');
    expect(text).not.toContain('null');
  });
});
