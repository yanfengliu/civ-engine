// "Additive minor, all engine gates green" does NOT prove back-compat for a
// library with a real consumer. A variance break — a more-specific return type
// that will not assign to the less-specific slot the consumer already holds —
// is invisible to the producer's own suite, because no engine code holds engine
// output in a narrowed or default-generic slot. Only building the symlinked
// engine and running the consumer's typecheck with ZERO consumer edits surfaces
// it, and that is a cross-repo step nobody runs on a "engine-only" change.
//
// Provenance: v1.2.0 recorder-generics (44dbde5). Threading TComponents/TState
// through the recorder was purely additive and all four engine gates passed
// (1238+1) — including an extra change parameterizing `SessionRecorder.toBundle()`
// as `SessionBundle<E, C, TDebug>`. That was a silent back-compat BREAK: aoe2's
// runPlaytest.ts holds the result in a default-generic `SessionBundle` slot, and
// a typed bundle will not assign to it. It was caught by the planned aoe2
// cross-check, not by a reviewer and not by any engine gate.
//
// This file is that cross-check, brought in-repo: it holds engine output in the
// slots a CONSUMER holds it in, which the engine's own code never does. The
// assertions are compile-only and enforced by `npm run typecheck` — vitest does
// not typecheck, so a red here shows up in the typecheck gate, not in `npm test`.
// The runtime block below is the control (Addendum: prove the path executes):
// it makes the same calls at runtime so a type assertion cannot be trivially
// satisfied by a signature nothing can actually produce.
//
// Reach and its limits: this pins ASSIGNABILITY into consumer-shaped slots for
// the surfaces downstream repos actually hold. It is not a substitute for the
// real cross-repo typecheck when a change is large; it is the cheap standing
// gate that catches the common variance break on every commit.
//
// Corollary the lesson carries, worth reading before "fixing" a failure here:
// prefer threading types via INFERENCE (a caller's typed value flows in) over
// re-parameterizing OUTPUT types, which widens what the producer hands back and
// breaks narrowed consumer slots.
import { describe, expect, it } from 'vitest';
import {
  MemorySink,
  SessionRecorder,
  SessionReplayer,
  World,
  runScenario,
  scenarioResultToBundle,
  type ScenarioResult,
  type SessionBundle,
  type WorldConfig,
  type WorldDebugSnapshot,
  type WorldSnapshot,
} from '../src/index.js';

const mkConfig = (): WorldConfig => ({
  gridWidth: 8,
  gridHeight: 8,
  tps: 60,
  positionKey: 'position',
  strict: false,
});

type GameComponents = { position: { x: number; y: number }; health: { hp: number } };
type GameState = { era: string };
interface GameEvents {
  spawned: { id: number };
}
interface GameCommands {
  spawn: { x: number; y: number };
}

/** The consumer's fully-typed game world (aoe2's GameWorld shape). */
type GameWorld = World<GameEvents, GameCommands, GameComponents, GameState>;

/**
 * What a REPLAY world looks like once the bundle is the default-generic JSON
 * middle: components and state stay typed, event/command maps do not survive
 * the round trip. This is the slot the consumer's worldFactory returns.
 */
type ReplayWorld = World<Record<string, never>, Record<string, never>, GameComponents, GameState>;

const mkGameWorld = (): GameWorld => {
  const w = new World<GameEvents, GameCommands, GameComponents, GameState>(mkConfig());
  w.registerComponent<{ hp: number }>('health');
  w.registerHandler('spawn', () => undefined);
  return w;
};

const mkReplayWorld = (): ReplayWorld => {
  const w = new World<Record<string, never>, Record<string, never>, GameComponents, GameState>(
    mkConfig(),
  );
  w.registerComponent<{ hp: number }>('health');
  return w;
};

/** runScenario is generic over events/commands only, not components/state. */
const mkScenarioWorld = (): World<GameEvents, GameCommands> => {
  const w = new World<GameEvents, GameCommands>(mkConfig());
  w.registerHandler('spawn', () => undefined);
  return w;
};

// Compile-only. Never executed; enforced by `npm run typecheck`.
function _consumerSlots(): void {
  const world = mkGameWorld();
  const recorder = new SessionRecorder({ world, sink: new MemorySink() });

  // (1) THE break that shipped and was reverted. A consumer declares its bundle
  //     field as the default-generic JSON middle and assigns engine output into
  //     it. Parameterizing toBundle()'s return as SessionBundle<E, C, TDebug>
  //     makes this line a type error while every engine gate stays green.
  const liveBundle: SessionBundle = recorder.toBundle();
  void liveBundle;

  // (2) The scenario path is the second producer of a bundle, and it is
  //     parameterized where toBundle is not: it hands back
  //     SessionBundle<E, C, WorldDebugSnapshot>. That asymmetry is deliberate
  //     and easy to "unify" by accident in either direction, so pin the slot a
  //     consumer declares for it. Widening or narrowing this return breaks a
  //     consumer field annotated this way, and no engine code annotates one.
  const result: ScenarioResult<GameEvents, GameCommands> = runScenario<GameEvents, GameCommands>({
    name: 'consumer-slot',
    world: mkScenarioWorld(),
    setup: () => undefined,
    run: (ctx) => {
      ctx.step();
    },
    checks: [],
  });
  const scenarioBundle: SessionBundle<GameEvents, GameCommands, WorldDebugSnapshot> =
    scenarioResultToBundle(result);
  void scenarioBundle;

  // (3) The reverse direction: a default-generic bundle (what the consumer
  //     stores, loads from disk, or receives over the wire) must still be
  //     accepted by the replayer with the consumer's own component-typed
  //     worldFactory. Narrowing fromBundle's parameter, or its worldFactory's
  //     expected return, breaks this without touching (1).
  const replayer = SessionReplayer.fromBundle(liveBundle, {
    worldFactory: (snap: WorldSnapshot) => {
      const w = mkReplayWorld();
      w.applySnapshot(snap);
      return w;
    },
  });
  const replayed: ReplayWorld = replayer.openAt(0);
  void replayed;

  // (4) A default-generic world still flows into the recorder unchanged — the
  //     pre-1.2.0 consumer that never adopted component threading.
  const plain = new World<GameEvents, GameCommands>(mkConfig());
  void new SessionRecorder({ world: plain, sink: new MemorySink() });
}
void _consumerSlots;

describe('consumer back-compat slots', () => {
  it('a typed recorder still yields a bundle a default-generic consumer slot accepts', () => {
    // Control for the compile-only block above: the same calls, executed, so a
    // signature that typechecks but cannot produce a value is not mistaken for
    // a working contract.
    // No command handler registered: the replay world's command map is
    // `Record<string, never>`, so it cannot register one, and the replayer's
    // registration check compares handlers. Keeping both sides handler-free is
    // what makes this a real round trip rather than a skipRegistrationCheck.
    const world = new World<GameEvents, GameCommands, GameComponents, GameState>(mkConfig());
    world.registerComponent<{ hp: number }>('health');
    const entity = world.createEntity();
    world.setComponent(entity, 'health', { hp: 7 });
    const recorder = new SessionRecorder({ world, sink: new MemorySink() });
    recorder.connect();
    world.step();
    recorder.disconnect();

    const bundle: SessionBundle = recorder.toBundle();
    expect(bundle.metadata.sourceKind).toBe('session');

    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap: WorldSnapshot) => {
        const w = mkReplayWorld();
        w.applySnapshot(snap);
        return w;
      },
    });
    expect(replayer.openAt(0).getComponent(entity, 'health')).toEqual({ hp: 7 });
  });
});
