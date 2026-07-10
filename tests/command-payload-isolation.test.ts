import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';
import { MemorySink } from '../src/session-sink.js';
import { SessionRecorder } from '../src/session-recorder.js';
import { SessionReplayer } from '../src/session-replayer.js';
import type { SessionBundle } from '../src/index.js';

// Regression: command payloads must be isolated from the caller's reference at
// submit(), exactly like EventBus.emit clones + validates event payloads
// (event-bus.ts). Before the fix, CommandQueue stored `data` by reference, so
// reusing/mutating one command object across a submit loop made every queued
// command observe the LAST value, AND the per-submit-cloned recording diverged
// from the mutated live execution — corrupting the replay guarantee.
// (full-review 2026-07-10 H1, rev-core, runtime-demonstrated.)

type Cmds = { setMark: { value: number } };
const mkConfig = () => ({ gridWidth: 4, gridHeight: 4, tps: 60 });

describe('command payload isolation', () => {
  it('isolates queued command data from later caller mutation (reused object across submits)', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    const seen: number[] = [];
    world.registerHandler('setMark', (data) => { seen.push(data.value); });

    const cmd = { value: -1 };
    for (let i = 0; i < 3; i++) {
      cmd.value = i; // reuse + mutate one object — a natural loop/buffer pattern
      world.submit('setMark', cmd);
    }
    world.step();

    // Each queued command must reflect its submit-time value, not the last one.
    expect(seen).toEqual([0, 1, 2]);
  });

  it('isolates the handler-observed object from a post-submit mutation', () => {
    const world = new World<Record<string, never>, Cmds>(mkConfig());
    let observed: { value: number } | null = null;
    world.registerHandler('setMark', (data) => { observed = { ...data }; });

    const cmd = { value: 7 };
    world.submit('setMark', cmd);
    cmd.value = 999; // mutate after submit, before drain
    world.step();

    expect(observed).toEqual({ value: 7 });
  });

  it('live execution matches replay when a command object is reused across a submit loop', () => {
    const registerHandlers = (w: World<Record<string, never>, Cmds>): void => {
      w.registerHandler('setMark', (data) => {
        w.setState('sum', ((w.getState('sum') as number | undefined) ?? 0) + data.value);
      });
    };

    const world = new World<Record<string, never>, Cmds>(mkConfig());
    registerHandlers(world);
    world.setState('sum', 0);
    const recorder = new SessionRecorder({ world, sink: new MemorySink() });
    recorder.connect();
    const cmd = { value: -1 };
    for (let i = 1; i <= 3; i++) { cmd.value = i; world.submit('setMark', cmd); }
    world.step();
    const liveSum = world.getState('sum') as number;
    recorder.disconnect();
    const recorded = recorder.toBundle() as unknown as SessionBundle<Record<string, never>, Cmds>;

    const replayer = SessionReplayer.fromBundle(recorded, {
      worldFactory: (snap) => {
        const w = new World<Record<string, never>, Cmds>(mkConfig());
        registerHandlers(w);
        w.applySnapshot(snap);
        return w;
      },
    });
    const check = replayer.selfCheck();

    expect(liveSum).toBe(6); // 1+2+3, not 3+3+3
    expect(check.ok).toBe(true);
    expect(check.stateDivergences).toEqual([]);
  });

  it('rejects non-JSON command data at submit, mirroring emit', () => {
    const world = new World<Record<string, never>, { act: unknown }>(mkConfig());
    world.registerHandler('act', () => {});
    expect(() => world.submit('act', { fn: () => 1 })).toThrowError(/json_incompatible|JSON-compatible/);
  });
});
