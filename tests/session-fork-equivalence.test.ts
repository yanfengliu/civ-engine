// Spec 5 / Step 7 — equivalence test (load-bearing).
//
// A no-substitution fork from any midTick must produce a bundle that is
// structurally equivalent to source's slice over [targetTick, persistedEndTick]
// after normalizing per-recorder fields (sessionId, recordedAt, sequences,
// metrics, etc.).

import { describe, expect, it } from 'vitest';
import {
  MemorySink,
  SessionRecorder,
  SessionReplayer,
  World,
  type RecordedCommand,
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

/** Strip per-recorder fields from a RecordedCommand. */
function normalizeCommand(rc: RecordedCommand<Cmds>, idx: number): unknown {
  return {
    submissionTick: rc.submissionTick,
    sequence: idx, // rebased
    type: rc.type,
    data: rc.data,
    result: {
      ...rc.result,
      sequence: idx, // rebased; nested in result
      tick: rc.result.tick,
    },
  };
}

/** Build a structural-equivalence representation of a bundle's
 *  command/event/execution streams over `[fromTick, toTick - 1]` (submission
 *  ticks). Ignores per-recorder noise. */
function bundleSpan(
  bundle: SessionBundle<Record<string, never>, Cmds>,
  fromTick: number,
  toTick: number,
): {
  commands: unknown[];
  events: unknown[];
  executions: unknown[];
  failedTicks: number[];
} {
  const commands = bundle.commands
    .filter((c) => c.submissionTick >= fromTick && c.submissionTick < toTick)
    .sort((a, b) => (a.submissionTick - b.submissionTick) || (a.sequence - b.sequence))
    .map((c, i) => normalizeCommand(c, i));

  const events = bundle.ticks
    .filter((t) => t.tick > fromTick && t.tick <= toTick)
    .flatMap((t) => t.events.map((e) => ({ tick: t.tick, type: e.type, data: e.data })));

  const executions = bundle.executions
    .filter((e) => e.tick > fromTick && e.tick <= toTick)
    .map((e, i) => ({
      submissionSequence: i, // rebased
      executed: e.executed,
      commandType: e.commandType,
      code: e.code,
      message: e.message,
      details: e.details,
      tick: e.tick,
    }));

  const failedTicks = (bundle.metadata.failedTicks ?? [])
    .filter((t) => t > fromTick && t <= toTick);

  return { commands, events, executions, failedTicks };
}

describe('Spec 5 / Step 7 — Equivalence invariant (no-substitution fork ≡ source slice)', () => {
  for (const steps of [10, 20, 50] as const) {
    it(`no-substitution fork at midTick of ${steps}-step bundle is structurally equivalent to source slice`, () => {
      const source = recordSession(steps, `equivalence-${steps}`);
      const midTick = Math.floor(steps / 2);
      const replayer = makeReplayer(source);
      const result = replayer.forkAt(midTick).run({
        untilTick: source.metadata.persistedEndTick,
      });

      // Strong invariant: divergence reports equivalent.
      expect(result.divergence.equivalent).toBe(true);
      expect(result.divergence.firstDivergentTick).toBeNull();
      expect(result.divergence.perTickCounts.size).toBe(0);

      // commandSequenceMap.preserved should have one entry per source command at midTick
      // (since no substitutions were made).
      const sourceCmdsAtMid = source.commands.filter((c) => c.submissionTick === midTick);
      expect(result.divergence.commandSequenceMap.preserved.length).toBe(sourceCmdsAtMid.length);
      expect(result.divergence.commandSequenceMap.replaced.length).toBe(0);
      expect(result.divergence.commandSequenceMap.inserted.length).toBe(0);
      expect(result.divergence.commandSequenceMap.dropped.length).toBe(0);

      // Structural span equivalence.
      const sourceSpan = bundleSpan(source, midTick, source.metadata.persistedEndTick);
      const forkSpan = bundleSpan(result.bundle, midTick, source.metadata.persistedEndTick);
      expect(forkSpan.commands).toEqual(sourceSpan.commands);
      expect(forkSpan.events).toEqual(sourceSpan.events);
      expect(forkSpan.executions).toEqual(sourceSpan.executions);
      expect(forkSpan.failedTicks).toEqual(sourceSpan.failedTicks);
    });
  }

  it('forking at startTick produces a bundle equivalent to the entire source', () => {
    const source = recordSession(10, 'fork-at-startTick');
    const replayer = makeReplayer(source);
    const result = replayer.forkAt(0).run({
      untilTick: source.metadata.persistedEndTick,
    });
    expect(result.divergence.equivalent).toBe(true);
    const sourceSpan = bundleSpan(source, 0, source.metadata.persistedEndTick);
    const forkSpan = bundleSpan(result.bundle, 0, source.metadata.persistedEndTick);
    expect(forkSpan.commands).toEqual(sourceSpan.commands);
    expect(forkSpan.events).toEqual(sourceSpan.events);
  });

  it('forking near the end of source produces a small but valid equivalent bundle', () => {
    const source = recordSession(10, 'fork-near-end');
    const replayer = makeReplayer(source);
    const result = replayer.forkAt(8).run({
      untilTick: source.metadata.persistedEndTick,
    });
    expect(result.divergence.equivalent).toBe(true);
    const sourceSpan = bundleSpan(source, 8, source.metadata.persistedEndTick);
    const forkSpan = bundleSpan(result.bundle, 8, source.metadata.persistedEndTick);
    expect(forkSpan.commands).toEqual(sourceSpan.commands);
    expect(forkSpan.events).toEqual(sourceSpan.events);
  });
});
