import { describe, expect, it } from 'vitest';
import {
  SessionReplayer,
  World,
  runScenario,
  scenarioResultToBundle,
  type WorldConfig,
} from '../src/index.js';

// full-review 2026-07-10 M1: a scenario bundle built from a rolling-buffer
// WorldHistoryRecorder that truncated must not silently advertise full
// replayability. Two guards: (A) openAt/selfCheck fail fast on a gapped body
// via missing_tick_entries; (B) scenarioResultToBundle refuses to build a
// replayable (payload-carrying) bundle from a truncated history.

const mkConfig = (): WorldConfig => ({ gridWidth: 10, gridHeight: 10, tps: 60 });
interface Cmds { spawn: { x: number; y: number } }

const worldFactory = (snap: Parameters<World<Record<string, never>, Cmds>['applySnapshot']>[0]) => {
  const w = new World<Record<string, never>, Cmds>(mkConfig());
  w.registerHandler('spawn', () => undefined);
  w.applySnapshot(snap);
  return w;
};

function runCommandScenario(name: string, ticks: number, history: { capacity?: number; commandCapacity?: number; captureCommandPayloads?: boolean }) {
  const world = new World<Record<string, never>, Cmds>(mkConfig());
  world.registerHandler('spawn', () => undefined);
  return runScenario<Record<string, never>, Cmds>({
    name, world, history,
    setup: () => undefined,
    run: (ctx) => {
      for (let i = 0; i < ticks; i++) { ctx.submit('spawn', { x: i, y: i }); ctx.step(); }
    },
    checks: [],
  });
}

describe('replay truncation guards (M1)', () => {
  it('B: scenarioResultToBundle refuses a replayable bundle built from a truncated history', () => {
    const result = runCommandScenario('long', 10, { capacity: 3, captureCommandPayloads: true });
    expect(result.history.truncated).toBe(true);
    expect(() => scenarioResultToBundle(result)).toThrowError(/history_truncated|truncated/);
  });

  it('B: refuses a replayable bundle when only COMMANDS truncated (ticks intact)', () => {
    // commandCapacity exhausts before tickCapacity — the command-only vector the
    // tick-entry continuity guard cannot see (verify-high iteration-2 catch: all
    // 5 bounded streams must feed `_truncated`, not just tickEntries).
    const result = runCommandScenario('cmd-trunc', 20, { capacity: 1000, commandCapacity: 5, captureCommandPayloads: true });
    expect(result.history.truncated).toBe(true);
    expect(() => scenarioResultToBundle(result)).toThrowError(/history_truncated|truncated/);
  });

  it('B: a truncated DIAGNOSTIC bundle (no payload capture) is still allowed', () => {
    const result = runCommandScenario('long-diag', 10, { capacity: 3 });
    expect(result.history.truncated).toBe(true);
    // No command payloads → not replayable → truncation is harmless; must not throw.
    expect(() => scenarioResultToBundle(result)).not.toThrow();
  });

  it('B: a within-capacity scenario builds a replayable bundle that self-checks clean', () => {
    const result = runCommandScenario('short', 5, { capacity: 100, captureCommandPayloads: true });
    expect(result.history.truncated).toBeFalsy();
    const bundle = scenarioResultToBundle(result);
    const replayer = SessionReplayer.fromBundle(bundle, { worldFactory });
    expect(replayer.selfCheck().ok).toBe(true);
  });

  it('A: openAt throws missing_tick_entries when the bundle body is gapped (truncated/tampered)', () => {
    const result = runCommandScenario('healthy', 5, { capacity: 100, captureCommandPayloads: true });
    const bundle = scenarioResultToBundle(result);
    // Simulate rolling-buffer eviction / tampering: drop a middle tick entry.
    const gapped = { ...bundle, ticks: bundle.ticks.filter((t) => t.tick !== 3) };
    const replayer = SessionReplayer.fromBundle(gapped, { worldFactory });
    expect(() => replayer.openAt(4)).toThrowError(/missing_tick_entries|gapped/);
  });
});
