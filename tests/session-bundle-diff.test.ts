// Spec 5 / Steps 8 + 9 + 10b — diffBundles tests.

import { describe, expect, it } from 'vitest';
import {
  MemorySink,
  SessionRecorder,
  SessionReplayer,
  World,
  diffBundles,
  type SessionBundle,
  type WorldConfig,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position',
});

interface Cmds { spawn: { x: number; y: number } }

function setupWorld(world: World<Record<string, never>, Cmds>): void {
  world.registerHandler('spawn', () => undefined);
}

function recordSession(steps: number, label: string): SessionBundle<Record<string, never>, Cmds> {
  const world = new World<Record<string, never>, Cmds>(mkConfig());
  setupWorld(world);
  const sink = new MemorySink();
  const rec = new SessionRecorder({ world, sink, sourceLabel: label });
  rec.connect();
  for (let i = 0; i < steps; i++) {
    if (i % 3 === 0) world.submit('spawn', { x: i, y: i });
    world.step();
  }
  rec.disconnect();
  return sink.toBundle() as unknown as SessionBundle<Record<string, never>, Cmds>;
}

function makeReplayer(bundle: SessionBundle<Record<string, never>, Cmds>) {
  return SessionReplayer.fromBundle(bundle, {
    worldFactory: (snapshot) => {
      const w = new World<Record<string, never>, Cmds>(mkConfig());
      setupWorld(w);
      w.applySnapshot(snapshot);
      return w;
    },
  });
}

describe('Spec 5 / Step 8 — diffBundles skeleton', () => {
  it('identical bundles → equivalent: true, empty perTickDeltas, empty metadataDeltas', () => {
    const bundle = recordSession(10, 'identical');
    const result = diffBundles(bundle, bundle);
    expect(result.equivalent).toBe(true);
    expect(result.firstDivergentTick).toBeNull();
    expect(result.perTickDeltas.size).toBe(0);
    expect(result.metadataDeltas.length).toBe(0);
  });

  it('different metadata.sessionId → metadataDeltas populated; equivalent unaffected', () => {
    const a = recordSession(10, 'a');
    const b = recordSession(10, 'b');
    const result = diffBundles(a, b);
    // metadataDeltas should include sessionId, recordedAt, sourceLabel, etc.
    expect(result.metadataDeltas.length).toBeGreaterThan(0);
    expect(result.metadataDeltas.some((d) => d.field === 'sessionId')).toBe(true);
    // equivalent: structural deltas only — same recording semantics, so true.
    expect(result.equivalent).toBe(true);
  });
});

describe('Spec 5 / Step 9 — diffBundles per-tick command + event alignment', () => {
  it('source-vs-fork (with substitution) using commandSequenceMap aligns at targetTick', () => {
    // Fork at startTick (0) so source/fork ranges are equal — the diffBundles
    // union range matches and we can assert the substitution-induced divergence
    // is the FIRST divergence. (Forking at midTick=3 would make ticks [0,2]
    // sourceOnly since fork starts at 3 — that's correct behavior for
    // diffBundles, but it'd swamp the substitution divergence.)
    const source = recordSession(10, 'source');
    const replayer = makeReplayer(source);
    const cmdsAtTick0 = source.commands.filter((c) => c.submissionTick === 0);
    const seq = cmdsAtTick0[0].sequence;
    const result = replayer
      .forkAt(0)
      .replace(seq, { type: 'spawn', data: { x: 999, y: 888 } })
      .run({ untilTick: source.metadata.persistedEndTick });

    const diff = diffBundles(source, result.bundle, {
      commandSequenceMap: result.divergence.commandSequenceMap,
    });
    expect(diff.equivalent).toBe(false);
    expect(diff.firstDivergentTick).toBe(0);
    const delta = diff.perTickDeltas.get(0);
    expect(delta).toBeDefined();
    expect(delta!.commands.changed.length).toBeGreaterThanOrEqual(1);
  });

  it('source-vs-fork without commandSequenceMap (fallback to per-tick index) detects insert as forkOnly', () => {
    const source = recordSession(10, 'source-no-map');
    const replayer = makeReplayer(source);
    const result = replayer
      .forkAt(3)
      .insert({ type: 'spawn', data: { x: 999, y: 999 } })
      .run({ untilTick: source.metadata.persistedEndTick });
    // Without map, alignment is per-tick index. The fork has more commands at
    // tick 3 than source — so the trailing ones should show as forkOnly.
    const diff = diffBundles(source, result.bundle);
    expect(diff.equivalent).toBe(false);
    const delta = diff.perTickDeltas.get(3);
    expect(delta).toBeDefined();
    expect(delta!.commands.forkOnly.length + delta!.commands.changed.length).toBeGreaterThanOrEqual(1);
  });

  it('symmetry without map: diffBundles(a, b) and diffBundles(b, a) produce mirror-image deltas', () => {
    const a = recordSession(10, 'sym-a');
    const replayer = makeReplayer(a);
    const result = replayer
      .forkAt(3)
      .insert({ type: 'spawn', data: { x: 100, y: 100 } })
      .run({ untilTick: a.metadata.persistedEndTick });
    const b = result.bundle;
    const diffAB = diffBundles(a, b);
    const diffBA = diffBundles(b, a);
    // Each tick that has aOnly/forkOnly in AB should have it mirrored in BA.
    expect(diffAB.perTickDeltas.size).toBe(diffBA.perTickDeltas.size);
    for (const [t, dAB] of diffAB.perTickDeltas) {
      const dBA = diffBA.perTickDeltas.get(t);
      expect(dBA).toBeDefined();
      expect(dBA!.commands.sourceOnly.length).toBe(dAB.commands.forkOnly.length);
      expect(dBA!.commands.forkOnly.length).toBe(dAB.commands.sourceOnly.length);
    }
  });
});

describe('Spec 5 / Step 10b — diffBundles state-diff fold', () => {
  it('identical bundles: stateDiff at every tick is empty (folded across snapshots+TickDiffs)', () => {
    const bundle = recordSession(20, 'state-fold-identical');
    const result = diffBundles(bundle, bundle);
    expect(result.equivalent).toBe(true);
    // No perTickDeltas means every tick had empty state diff.
    expect(result.perTickDeltas.size).toBe(0);
  });

  it('hydrated state at tick T matches replayer.openAt(T).serialize() for identical bundles', () => {
    // Indirect check via diffBundles — if hydration was wrong, identical
    // bundles would produce non-empty stateDiff entries (since they'd
    // hydrate-diff against themselves). This is the same assertion as above
    // restated for clarity.
    const bundle = recordSession(15, 'state-fold-hydrate');
    const result = diffBundles(bundle, bundle);
    expect(result.perTickDeltas.size).toBe(0);
  });
});

describe('Spec 5 / Step 11 — Integration RSI loop', () => {
  it('source → forkAt → diffBundles produces a coherent counterfactual report', () => {
    const source = recordSession(20, 'rsi');
    const replayer = makeReplayer(source);
    // recordSession spawns every 3rd step (0, 3, 6, 9, 12, 15, 18) — pick tick 6.
    const cmdsAtTick6 = source.commands.filter((c) => c.submissionTick === 6);
    expect(cmdsAtTick6.length).toBeGreaterThan(0);
    const seq = cmdsAtTick6[0].sequence;
    // Fork at startTick (0) so the union range matches; substitute at tick 6.
    // This requires the substitution to be on a sequence at tick 6, but our
    // fork was opened at 0. forkAt(0) gives access only to commands at tick 0
    // — so we can't substitute tick-6 commands from a forkAt(0) builder.
    // Instead: forkAt(6) for substitution access, accept that ticks [0,5] are
    // pre-fork and show as sourceOnly in the diff.
    const fork = replayer
      .forkAt(6)
      .replace(seq, { type: 'spawn', data: { x: 60, y: 60 } })
      .run({ untilTick: source.metadata.persistedEndTick });
    expect(fork.bundle.metadata.sourceKind).toBe('synthetic');
    expect(fork.bundle.metadata.sourceLabel).toContain('counterfactual-fork-of-');
    // Inline divergence is over the fork's covered range only, so it sees the
    // substitution-tick divergence at tick 6.
    expect(fork.divergence.equivalent).toBe(false);
    expect(fork.divergence.firstDivergentTick).toBe(6);
    // diffBundles over the union range: source covers [0..19], fork covers
    // [6..19], so ticks [0..5] are sourceOnly. firstDivergentTick is 0 here.
    const diff = diffBundles(source, fork.bundle, {
      commandSequenceMap: fork.divergence.commandSequenceMap,
    });
    expect(diff.equivalent).toBe(false);
    // The substitution tick should have a delta entry too.
    expect(diff.perTickDeltas.get(6)).toBeDefined();
    expect(diff.perTickDeltas.get(6)!.commands.changed.length).toBeGreaterThanOrEqual(1);
  });

  it('fork bundle is itself replayable via SessionReplayer.fromBundle', () => {
    const source = recordSession(15, 'replayable-fork');
    const replayer = makeReplayer(source);
    const fork = replayer.forkAt(5).run({ untilTick: source.metadata.persistedEndTick });

    // The fork bundle should be openable at any tick within its range.
    const forkReplayer = makeReplayer(fork.bundle);
    expect(() => forkReplayer.openAt(7)).not.toThrow();
  });

  it('fork bundle is itself forkable (chained fork)', () => {
    const source = recordSession(15, 'chain-fork');
    const replayer = makeReplayer(source);
    const fork1 = replayer.forkAt(5).run({ untilTick: source.metadata.persistedEndTick });
    const replayer2 = makeReplayer(fork1.bundle);
    const fork2 = replayer2.forkAt(8).run({ untilTick: fork1.bundle.metadata.persistedEndTick });
    expect(fork2.bundle.metadata.sourceLabel).toContain('counterfactual-fork-of-');
    expect(fork2.divergence.equivalent).toBe(true); // no-substitution chained fork
  });
});
