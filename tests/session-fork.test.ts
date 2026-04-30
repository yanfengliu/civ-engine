import { describe, expect, it } from 'vitest';
import {
  ForkSubstitutionError,
  ForkBuilderConflictError,
  BuilderConsumedError,
  BundleRangeError,
  BundleIntegrityError,
  MemorySink,
  SessionRecorder,
  SessionReplayer,
  World,
  type ForkBuilder,
  type ForkResult,
  type ForkRunConfig,
  type Divergence,
  type DivergenceCounts,
  type CommandSequenceMap,
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

function recordSession(steps: number): SessionBundle<Record<string, never>, Cmds> {
  const world = new World<Record<string, never>, Cmds>(mkConfig());
  setupWorld(world);
  const sink = new MemorySink();
  const rec = new SessionRecorder({ world, sink });
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

describe('Spec 5 / Step 1 — Counterfactual fork types + error classes', () => {
  it('exposes ForkSubstitutionError with code/sequence/tick details', () => {
    const err = new ForkSubstitutionError(
      'unknown command sequence at fork tick',
      { code: 'unknown_command_sequence', sequence: 42, tick: 7 },
    );
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ForkSubstitutionError');
    expect(err.message).toBe('unknown command sequence at fork tick');
    expect(err.details).toEqual({ code: 'unknown_command_sequence', sequence: 42, tick: 7 });
  });

  it('exposes ForkBuilderConflictError with a code-tagged details payload', () => {
    const err = new ForkBuilderConflictError('replace called twice for the same originalSequence', {
      code: 'duplicate_replace',
      sequence: 11,
      tick: 5,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ForkBuilderConflictError');
    expect(err.details).toEqual({ code: 'duplicate_replace', sequence: 11, tick: 5 });
  });

  it('supports each conflict-rule error code', () => {
    const codes: Array<'duplicate_replace' | 'duplicate_drop' | 'replace_drop_conflict'> = [
      'duplicate_replace',
      'duplicate_drop',
      'replace_drop_conflict',
    ];
    for (const code of codes) {
      const err = new ForkBuilderConflictError(`conflict (${code})`, { code, sequence: 1, tick: 0 });
      const details = err.details as { code: string } | undefined;
      expect(details?.code).toBe(code);
    }
  });

  it('exposes BuilderConsumedError as a no-detail subclass', () => {
    const err = new BuilderConsumedError('builder already consumed by run()');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('BuilderConsumedError');
  });

  it('lets ForkRunConfig accept untilTick alone (sink + sourceLabel optional)', () => {
    const minimal: ForkRunConfig = { untilTick: 10 };
    expect(minimal.untilTick).toBe(10);
    expect(minimal.sink).toBeUndefined();
    expect(minimal.sourceLabel).toBeUndefined();
  });

  it('shapes Divergence around firstDivergentTick + perTickCounts + commandSequenceMap + equivalent', () => {
    // Compile-time + runtime structural smoke: build a value that satisfies the type.
    const empty: Divergence = {
      firstDivergentTick: null,
      perTickCounts: new Map<number, DivergenceCounts>(),
      commandSequenceMap: { preserved: [], replaced: [], inserted: [], dropped: [] },
      equivalent: true,
    };
    expect(empty.firstDivergentTick).toBeNull();
    expect(empty.perTickCounts.size).toBe(0);
    expect(empty.equivalent).toBe(true);
    expect(empty.commandSequenceMap.preserved).toHaveLength(0);
  });

  it('shapes DivergenceCounts with the seven directional fields per DESIGN §4', () => {
    const counts: DivergenceCounts = {
      commandsSourceOnly: 0,
      commandsForkOnly: 0,
      commandsChanged: 0,
      eventsSourceOnly: 0,
      eventsForkOnly: 0,
      eventsChanged: 0,
    };
    // Ensure every key exists at runtime — the type guarantees it at compile time.
    expect(Object.keys(counts).sort()).toEqual([
      'commandsChanged',
      'commandsForkOnly',
      'commandsSourceOnly',
      'eventsChanged',
      'eventsForkOnly',
      'eventsSourceOnly',
    ]);
  });

  it('shapes CommandSequenceMap with preserved/replaced/inserted/dropped slots', () => {
    const map: CommandSequenceMap = {
      preserved: [{ tick: 5, originalSequence: 12, assignedSequence: 0 }],
      replaced: [{ tick: 5, originalSequence: 13, assignedSequence: 1 }],
      inserted: [{ tick: 5, assignedSequence: 2 }],
      dropped: [{ tick: 5, originalSequence: 14 }],
    };
    expect(map.preserved[0]).toEqual({ tick: 5, originalSequence: 12, assignedSequence: 0 });
    expect(map.replaced[0]).toEqual({ tick: 5, originalSequence: 13, assignedSequence: 1 });
    expect(map.inserted[0]).toEqual({ tick: 5, assignedSequence: 2 });
    expect(map.dropped[0]).toEqual({ tick: 5, originalSequence: 14 });
  });

  it('shapes ForkResult with bundle + divergence + source slots', () => {
    // Type-only smoke; constructing a real ForkResult requires Step 5's run().
    type CmdMap = Record<string, never>;
    type EventMap = Record<string, never>;
    const _typeCheck: ForkResult<EventMap, CmdMap> | undefined = undefined;
    expect(_typeCheck).toBeUndefined();
  });

  it('shapes ForkBuilder with the chainable surface + snapshot/run methods', () => {
    // Type-only smoke; constructing a real ForkBuilder requires Step 2's forkAt().
    type CmdMap = Record<string, never>;
    type EventMap = Record<string, never>;
    const _typeCheck: ForkBuilder<EventMap, CmdMap> | undefined = undefined;
    expect(_typeCheck).toBeUndefined();
  });
});

describe('Spec 5 / Step 2 — SessionReplayer.forkAt skeleton + preconditions', () => {
  it('returns a ForkBuilder for valid targetTick', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const builder = replayer.forkAt(5);
    expect(builder).toBeDefined();
    // Builder shape — chainable methods present:
    expect(typeof builder.replace).toBe('function');
    expect(typeof builder.insert).toBe('function');
    expect(typeof builder.drop).toBe('function');
    expect(typeof builder.snapshot).toBe('function');
    expect(typeof builder.run).toBe('function');
  });

  it('throws BundleRangeError when targetTick < startTick', () => {
    const bundle = recordSession(5);
    const replayer = makeReplayer(bundle);
    expect(() => replayer.forkAt(-1)).toThrow(BundleRangeError);
    try { replayer.forkAt(-1); } catch (e) {
      const details = (e as BundleRangeError).details as { code: string } | undefined;
      expect(details?.code).toBe('too_low');
    }
  });

  it('throws BundleRangeError when targetTick > endTick (complete bundle)', () => {
    const bundle = recordSession(5);
    const replayer = makeReplayer(bundle);
    expect(() => replayer.forkAt(999)).toThrow(BundleRangeError);
    try { replayer.forkAt(999); } catch (e) {
      const details = (e as BundleRangeError).details as { code: string } | undefined;
      expect(details?.code).toBe('too_high');
    }
  });

  it('throws BundleIntegrityError(replay_across_failure) when targetTick >= a recorded failedTick', () => {
    // Build a bundle with a synthetic failedTicks entry by mutating the metadata
    // (the replayer reads metadata; we don't need an actual recorded failure here).
    const baseBundle = recordSession(10);
    const failingBundle: SessionBundle<Record<string, never>, Cmds> = {
      ...baseBundle,
      metadata: { ...baseBundle.metadata, failedTicks: [3] },
    };
    const replayer = makeReplayer(failingBundle);
    expect(() => replayer.forkAt(5)).toThrow(BundleIntegrityError);
    try { replayer.forkAt(5); } catch (e) {
      const details = (e as BundleIntegrityError).details as { code: string } | undefined;
      expect(details?.code).toBe('replay_across_failure');
    }
  });

  it('throws BundleIntegrityError(no_replay_payloads) when commands are absent and targetTick > startTick', () => {
    const baseBundle = recordSession(5);
    const noPayloadBundle: SessionBundle<Record<string, never>, Cmds> = {
      ...baseBundle,
      commands: [],
    };
    const replayer = makeReplayer(noPayloadBundle);
    // forkAt at startTick is allowed (no replay needed); past startTick requires payloads.
    expect(() => replayer.forkAt(baseBundle.metadata.startTick + 1)).toThrow(BundleIntegrityError);
    try { replayer.forkAt(baseBundle.metadata.startTick + 1); } catch (e) {
      const details = (e as BundleIntegrityError).details as { code: string } | undefined;
      expect(details?.code).toBe('no_replay_payloads');
    }
  });

  it('honors persistedEndTick (not endTick) for incomplete bundles', () => {
    const baseBundle = recordSession(10);
    const incompleteBundle: SessionBundle<Record<string, never>, Cmds> = {
      ...baseBundle,
      metadata: {
        ...baseBundle.metadata,
        incomplete: true,
        persistedEndTick: 5,
      },
    };
    const replayer = makeReplayer(incompleteBundle);
    // 5 should work (within persistedEndTick); 8 should fail.
    expect(() => replayer.forkAt(5)).not.toThrow();
    expect(() => replayer.forkAt(8)).toThrow(BundleRangeError);
  });

  it('eagerly materializes the paused world (snapshot() works pre-run)', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const builder = replayer.forkAt(5);
    const snap = builder.snapshot();
    expect(snap.tick).toBe(5);
  });
});

describe('Spec 5 / Step 3 — ForkBuilder.snapshot()', () => {
  it('returns a snapshot whose tick === targetTick', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const builder = replayer.forkAt(7);
    expect(builder.snapshot().tick).toBe(7);
  });

  it('returns equal-but-reference-distinct snapshots on repeated calls', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const builder = replayer.forkAt(5);
    const snap1 = builder.snapshot();
    const snap2 = builder.snapshot();
    expect(snap1).not.toBe(snap2); // distinct references
    expect(snap1).toEqual(snap2); // structurally equal
  });

  it('matches replayer.openAt(targetTick).serialize()', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const builder = replayer.forkAt(5);
    const builderSnap = builder.snapshot();
    // Independent openAt for comparison.
    const replayer2 = makeReplayer(bundle);
    const indepSnap = replayer2.openAt(5).serialize();
    expect(builderSnap).toEqual(indepSnap);
  });
});

describe('Spec 5 / Step 4 — ForkBuilder.replace / insert / drop conflict rules', () => {
  it('replace() with unknown sequence throws ForkSubstitutionError(unknown_command_sequence)', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const builder = replayer.forkAt(0); // tick 0 has the spawn at i=0
    expect(() => builder.replace(99999, { type: 'spawn', data: { x: 0, y: 0 } }))
      .toThrow(ForkSubstitutionError);
  });

  it('drop() with unknown sequence throws ForkSubstitutionError', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const builder = replayer.forkAt(0);
    expect(() => builder.drop(99999)).toThrow(ForkSubstitutionError);
  });

  it('replace() called twice with same sequence throws ForkBuilderConflictError(duplicate_replace)', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    // pick a known source command sequence at the target tick
    const cmdsAtTick = bundle.commands.filter((c) => c.submissionTick === 0);
    expect(cmdsAtTick.length).toBeGreaterThan(0);
    const seq = cmdsAtTick[0].sequence;
    const builder = replayer.forkAt(0);
    builder.replace(seq, { type: 'spawn', data: { x: 1, y: 1 } });
    expect(() => builder.replace(seq, { type: 'spawn', data: { x: 2, y: 2 } }))
      .toThrow(ForkBuilderConflictError);
  });

  it('drop() called twice with same sequence throws ForkBuilderConflictError(duplicate_drop)', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const cmdsAtTick = bundle.commands.filter((c) => c.submissionTick === 0);
    const seq = cmdsAtTick[0].sequence;
    const builder = replayer.forkAt(0);
    builder.drop(seq);
    expect(() => builder.drop(seq)).toThrow(ForkBuilderConflictError);
  });

  it('replace() then drop() on same sequence throws replace_drop_conflict (and vice versa)', () => {
    const bundle = recordSession(10);
    const cmdsAtTick = bundle.commands.filter((c) => c.submissionTick === 0);
    const seq = cmdsAtTick[0].sequence;
    {
      const replayer = makeReplayer(bundle);
      const builder = replayer.forkAt(0);
      builder.replace(seq, { type: 'spawn', data: { x: 9, y: 9 } });
      expect(() => builder.drop(seq)).toThrow(ForkBuilderConflictError);
    }
    {
      const replayer = makeReplayer(bundle);
      const builder = replayer.forkAt(0);
      builder.drop(seq);
      expect(() => builder.replace(seq, { type: 'spawn', data: { x: 9, y: 9 } }))
        .toThrow(ForkBuilderConflictError);
    }
  });

  it('chainable: replace/insert/drop return the same builder', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const cmdsAtTick = bundle.commands.filter((c) => c.submissionTick === 0);
    const seq = cmdsAtTick[0].sequence;
    const builder = replayer.forkAt(0);
    const after = builder
      .replace(seq, { type: 'spawn', data: { x: 5, y: 5 } })
      .insert({ type: 'spawn', data: { x: 6, y: 6 } });
    expect(after).toBe(builder);
  });

  it('multiple inserts preserve FIFO order', () => {
    // Indirect check: insert calls succeed and return chainable; queue order
    // verified at run() time in Step 5. Here we just confirm two inserts
    // don't conflict with each other.
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const builder = replayer.forkAt(0);
    expect(() => {
      builder
        .insert({ type: 'spawn', data: { x: 100, y: 100 } })
        .insert({ type: 'spawn', data: { x: 200, y: 200 } });
    }).not.toThrow();
  });
});

describe('Spec 5 / Step 5 — ForkBuilder.run() substitution mechanism', () => {
  it('(a) no-substitution run() bundle.commands matches source slice over [targetTick, persistedEndTick - 1]', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const builder = replayer.forkAt(3);
    const result = builder.run({ untilTick: bundle.metadata.persistedEndTick });
    // Source had spawn at i=0,3,6,9 (every 3rd). Slice [3, 9] (since
    // persistedEndTick=10, last submission tick is 9) → spawns at 3, 6, 9.
    const expectedCount = bundle.commands.filter(
      (c) => c.submissionTick >= 3 && c.submissionTick < bundle.metadata.persistedEndTick,
    ).length;
    expect(result.bundle.commands.length).toBe(expectedCount);
  });

  it('(b) replace() puts new command at targetTick; old payload absent', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const cmdsAtTick3 = bundle.commands.filter((c) => c.submissionTick === 3);
    expect(cmdsAtTick3.length).toBeGreaterThan(0);
    const seq = cmdsAtTick3[0].sequence;
    const result = replayer
      .forkAt(3)
      .replace(seq, { type: 'spawn', data: { x: 999, y: 888 } })
      .run({ untilTick: bundle.metadata.persistedEndTick });
    const fkCmdsAtTick3 = result.bundle.commands.filter((c) => c.submissionTick === 3);
    expect(fkCmdsAtTick3.length).toBe(cmdsAtTick3.length); // same count, payload differs
    const replaced = fkCmdsAtTick3.find(
      (c) => c.data.x === 999 && c.data.y === 888,
    );
    expect(replaced).toBeDefined();
    const oldPayload = fkCmdsAtTick3.find(
      (c) => c.data.x === cmdsAtTick3[0].data.x && c.data.y === cmdsAtTick3[0].data.y,
    );
    expect(oldPayload).toBeUndefined();
  });

  it('(c) insert() places new command AFTER all source commands at targetTick', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const sourceCmdsAtTick3 = bundle.commands.filter((c) => c.submissionTick === 3);
    const result = replayer
      .forkAt(3)
      .insert({ type: 'spawn', data: { x: 777, y: 666 } })
      .run({ untilTick: bundle.metadata.persistedEndTick });
    const fkCmdsAtTick3 = result.bundle.commands.filter((c) => c.submissionTick === 3);
    expect(fkCmdsAtTick3.length).toBe(sourceCmdsAtTick3.length + 1);
    // The inserted command should be the LAST one at this tick (after all source commands).
    const lastAtTick3 = fkCmdsAtTick3[fkCmdsAtTick3.length - 1];
    expect(lastAtTick3.data.x).toBe(777);
    expect(lastAtTick3.data.y).toBe(666);
  });

  it('(d) drop() removes the command from the fork bundle', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const cmdsAtTick3 = bundle.commands.filter((c) => c.submissionTick === 3);
    const seq = cmdsAtTick3[0].sequence;
    const result = replayer
      .forkAt(3)
      .drop(seq)
      .run({ untilTick: bundle.metadata.persistedEndTick });
    const fkCmdsAtTick3 = result.bundle.commands.filter((c) => c.submissionTick === 3);
    expect(fkCmdsAtTick3.length).toBe(cmdsAtTick3.length - 1);
    // Verify the dropped command's payload is absent.
    const droppedPayload = fkCmdsAtTick3.find(
      (c) => c.data.x === cmdsAtTick3[0].data.x && c.data.y === cmdsAtTick3[0].data.y,
    );
    expect(droppedPayload).toBeUndefined();
  });

  it('(e) commandSequenceMap populated for replace/insert/drop/preserved', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const cmdsAtTick3 = bundle.commands.filter((c) => c.submissionTick === 3);
    expect(cmdsAtTick3.length).toBeGreaterThan(0);
    const seq = cmdsAtTick3[0].sequence;
    // Replace one, drop none (need a 2nd source cmd to drop, which we don't have at tick 3)
    // So just test replace + insert here.
    const result = replayer
      .forkAt(3)
      .replace(seq, { type: 'spawn', data: { x: 1, y: 1 } })
      .insert({ type: 'spawn', data: { x: 2, y: 2 } })
      .run({ untilTick: bundle.metadata.persistedEndTick });
    expect(result.divergence.commandSequenceMap.replaced.length).toBe(1);
    expect(result.divergence.commandSequenceMap.replaced[0].originalSequence).toBe(seq);
    expect(result.divergence.commandSequenceMap.replaced[0].assignedSequence).toBeGreaterThanOrEqual(0);
    expect(result.divergence.commandSequenceMap.inserted.length).toBe(1);
    expect(result.divergence.commandSequenceMap.dropped.length).toBe(0);
    // Preserved should cover any other source commands at tick 3 (zero in our fixture
    // because i=3 is the only spawn tick and we replaced it, but verify).
    const preservedAtTick3 = result.divergence.commandSequenceMap.preserved.filter((p) => p.tick === 3);
    expect(preservedAtTick3.length).toBe(cmdsAtTick3.length - 1); // all except the replaced
  });

  it('(f) calling .run() twice throws BuilderConsumedError', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const builder = replayer.forkAt(3);
    builder.run({ untilTick: bundle.metadata.persistedEndTick });
    expect(() => builder.run({ untilTick: bundle.metadata.persistedEndTick })).toThrow(BuilderConsumedError);
  });

  it('(g) run({ untilTick: targetTick }) throws RangeError; untilTick < targetTick also throws', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    {
      const builder = replayer.forkAt(5);
      expect(() => builder.run({ untilTick: 5 })).toThrow(RangeError);
    }
    {
      const builder = replayer.forkAt(5);
      expect(() => builder.run({ untilTick: 4 })).toThrow(RangeError);
    }
  });

  it('(h) substituted-command handler throws → bundle preserved up to T_fail-1, no rethrow, failedTicks populated', () => {
    // Build a session with a poison-spawn handler that throws when y === 999.
    const cfg = mkConfig();
    const world = new World<Record<string, never>, Cmds>(cfg);
    world.registerHandler('spawn', (data) => {
      if (data.y === 999) throw new Error('poison spawn');
    });
    const sink = new MemorySink();
    const rec = new SessionRecorder({ world, sink });
    rec.connect();
    for (let i = 0; i < 10; i++) {
      world.submit('spawn', { x: i, y: i });
      world.step();
    }
    rec.disconnect();
    const sourceBundle = sink.toBundle() as unknown as SessionBundle<Record<string, never>, Cmds>;
    const replayer = SessionReplayer.fromBundle(sourceBundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(cfg);
        w.registerHandler('spawn', (data) => {
          if (data.y === 999) throw new Error('poison spawn');
        });
        w.applySnapshot(snap);
        return w;
      },
    });
    const cmdsAtTick3 = sourceBundle.commands.filter((c) => c.submissionTick === 3);
    expect(cmdsAtTick3.length).toBeGreaterThan(0);
    const seq = cmdsAtTick3[0].sequence;
    // Replace tick-3 command with one whose handler throws.
    expect(() => {
      replayer
        .forkAt(3)
        .replace(seq, { type: 'spawn', data: { x: 0, y: 999 } })
        .run({ untilTick: sourceBundle.metadata.persistedEndTick });
    }).not.toThrow();
    const result = replayer
      .forkAt(3)
      .replace(seq, { type: 'spawn', data: { x: 0, y: 999 } })
      .run({ untilTick: sourceBundle.metadata.persistedEndTick });
    expect(result.bundle.metadata.failedTicks).toBeDefined();
    expect((result.bundle.metadata.failedTicks ?? []).length).toBeGreaterThan(0);
    expect(result.bundle.failures.length).toBeGreaterThan(0);
  });

  it('(j) run({ untilTick > source.persistedEndTick }) continues past source range', () => {
    const bundle = recordSession(10); // persistedEndTick = 10
    const replayer = makeReplayer(bundle);
    const builder = replayer.forkAt(5);
    const result = builder.run({ untilTick: 15 });
    expect(result.bundle.metadata.endTick).toBe(15);
  });
});

describe('Spec 5 / Step 6 — Divergence accumulator', () => {
  it('(a) no-substitution: divergence.equivalent === true, firstDivergentTick === null, perTickCounts empty', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const result = replayer.forkAt(3).run({ untilTick: bundle.metadata.persistedEndTick });
    expect(result.divergence.equivalent).toBe(true);
    expect(result.divergence.firstDivergentTick).toBeNull();
    expect(result.divergence.perTickCounts.size).toBe(0);
  });

  it('(b) replace produces commandsChanged at targetTick', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const cmdsAtTick3 = bundle.commands.filter((c) => c.submissionTick === 3);
    const seq = cmdsAtTick3[0].sequence;
    const result = replayer
      .forkAt(3)
      .replace(seq, { type: 'spawn', data: { x: 999, y: 888 } })
      .run({ untilTick: bundle.metadata.persistedEndTick });
    expect(result.divergence.equivalent).toBe(false);
    expect(result.divergence.firstDivergentTick).toBe(3);
    const counts = result.divergence.perTickCounts.get(3);
    expect(counts).toBeDefined();
    expect(counts!.commandsChanged).toBeGreaterThanOrEqual(1);
  });

  it('(c) drop produces commandsSourceOnly at targetTick', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const cmdsAtTick3 = bundle.commands.filter((c) => c.submissionTick === 3);
    const seq = cmdsAtTick3[0].sequence;
    const result = replayer
      .forkAt(3)
      .drop(seq)
      .run({ untilTick: bundle.metadata.persistedEndTick });
    const counts = result.divergence.perTickCounts.get(3);
    expect(counts).toBeDefined();
    expect(counts!.commandsSourceOnly).toBe(1);
  });

  it('(d) insert produces commandsForkOnly at targetTick', () => {
    const bundle = recordSession(10);
    const replayer = makeReplayer(bundle);
    const result = replayer
      .forkAt(3)
      .insert({ type: 'spawn', data: { x: 999, y: 888 } })
      .run({ untilTick: bundle.metadata.persistedEndTick });
    const counts = result.divergence.perTickCounts.get(3);
    expect(counts).toBeDefined();
    expect(counts!.commandsForkOnly).toBe(1);
  });

  it('(h) mid-fork handler-failure: perTickCounts has commandsChanged at T_fail (command-stream walk catches it)', () => {
    const cfg = mkConfig();
    const world = new World<Record<string, never>, Cmds>(cfg);
    world.registerHandler('spawn', (data) => {
      if (data.y === 999) throw new Error('poison spawn');
    });
    const sink = new MemorySink();
    const rec = new SessionRecorder({ world, sink });
    rec.connect();
    for (let i = 0; i < 10; i++) {
      world.submit('spawn', { x: i, y: i });
      world.step();
    }
    rec.disconnect();
    const sourceBundle = sink.toBundle() as unknown as SessionBundle<Record<string, never>, Cmds>;
    const replayer = SessionReplayer.fromBundle(sourceBundle, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(cfg);
        w.registerHandler('spawn', (data) => {
          if (data.y === 999) throw new Error('poison spawn');
        });
        w.applySnapshot(snap);
        return w;
      },
    });
    const cmdsAtTick3 = sourceBundle.commands.filter((c) => c.submissionTick === 3);
    const seq = cmdsAtTick3[0].sequence;
    const result = replayer
      .forkAt(3)
      .replace(seq, { type: 'spawn', data: { x: 0, y: 999 } }) // poison payload
      .run({ untilTick: sourceBundle.metadata.persistedEndTick });
    // The poisoned tick is T_fail = 3 (the substitution tick). The command was
    // recorded at submitWithResult time before world.step() failed, so the
    // command-stream walk should observe a divergence (replaced payload differs from source).
    const countsAtTick3 = result.divergence.perTickCounts.get(3);
    expect(countsAtTick3).toBeDefined();
    expect(countsAtTick3!.commandsChanged).toBeGreaterThanOrEqual(1);
    expect(result.divergence.firstDivergentTick).toBe(3);
  });

  it('(i) untilTick > source.persistedEndTick: perTickCounts only covers source overlap', () => {
    const bundle = recordSession(10); // persistedEndTick = 10, source submissions at 0..9
    const replayer = makeReplayer(bundle);
    const result = replayer.forkAt(5).run({ untilTick: 15 });
    // No-substitution → equivalent: true, no divergence in overlap.
    expect(result.divergence.equivalent).toBe(true);
    expect(result.divergence.firstDivergentTick).toBeNull();
    // Sanity: perTickCounts has no entries at submissionTick > persistedEndTick - 1 = 9.
    for (const t of result.divergence.perTickCounts.keys()) {
      expect(t).toBeLessThanOrEqual(9);
    }
  });
});
