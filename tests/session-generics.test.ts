import { describe, expect, it } from 'vitest';
import {
  MemorySink,
  SessionRecorder,
  SessionReplayer,
  World,
  type SessionBundle,
  type WorldConfig,
  type WorldSnapshot,
} from '../src/index.js';

// recorder-generics objective: SessionRecorder / SessionReplayer thread a game's
// TComponents / TState so a typed world records + replays without the
// `as unknown as World<E, C>` cast seam that erases component-type safety.
// Scope: engine-only (the bundle stays the default-generic JSON middle —
// toBundle is intentionally NOT parameterized, see SessionRecorder.toBundle).

const mkConfig = (): WorldConfig => ({
  gridWidth: 8, gridHeight: 8, tps: 60, positionKey: 'position', strict: false,
});

type Health = { hp: number };
type TestComponents = { position: { x: number; y: number }; health: Health };
type TestState = { era: string };
interface Events { spawned: { id: number } }
interface Cmds { spawn: { x: number; y: number } }

// A fully-typed game world (events + commands + components + state), like aoe2's GameWorld.
type FullWorld = World<Events, Cmds, TestComponents, TestState>;
// A component-typed world with default event/command maps — what a replay world
// looks like when its bundle (the JSON middle) is default-generic.
type CompWorld = World<Record<string, never>, Record<string, never>, TestComponents, TestState>;

function mkCompWorld(): CompWorld {
  const w = new World<Record<string, never>, Record<string, never>, TestComponents, TestState>(mkConfig());
  w.registerComponent<Health>('health');
  return w;
}

// Compile-only type assertions — never executed; enforced by `npm run typecheck`.
// On the un-threaded (pre-1.2.0) signatures every numbered line is a type error
// (TComponents is invariant, so a typed world won't assign to World<E, C>).
function _typeAssertions(typedBundle: SessionBundle<Events, Cmds>, id: number): void {
  const full: FullWorld = new World<Events, Cmds, TestComponents, TestState>(mkConfig());

  // (a) a fully component+state-typed world flows into the recorder WITHOUT a cast.
  const recorder = new SessionRecorder({ world: full, sink: new MemorySink() });
  void recorder;

  // (b) openAt returns the worldFactory's typed world (here the full typed world,
  //     because the bundle carries Events/Cmds).
  const replayer = SessionReplayer.fromBundle(typedBundle, { worldFactory: () => full });
  const replayed: FullWorld = replayer.openAt(0);

  // (c) getComponent on the replayed world yields the registry type (Health), not
  //     `unknown` — the safety this delivers. Fails to compile on the un-threaded
  //     signatures (replayed would be World<E, C, Record<string, unknown>>). The
  //     escape-hatch getComponent<T>(key: string) means a NAME typo still
  //     compiles by design; the typed RETURN is what threading restores.
  const h: Health | undefined = replayed.getComponent(id, 'health');
  void h;

  // (d) back-compat: a default-generic world still flows in unchanged.
  const plain = new World<Events, Cmds>(mkConfig());
  void new SessionRecorder({ world: plain, sink: new MemorySink() });
}
void _typeAssertions;

describe('SessionRecorder/SessionReplayer component-type threading', () => {
  it('records + replays a component-typed world with no cast; component types flow through openAt', () => {
    const world = mkCompWorld();
    const e = world.createEntity();
    world.setComponent(e, 'health', { hp: 42 }); // setup-window write, registry-typed
    const recorder = new SessionRecorder({ world, sink: new MemorySink() }); // no cast seam
    recorder.connect();
    world.step();
    recorder.disconnect();
    const bundle = recorder.toBundle();

    const replayer = SessionReplayer.fromBundle(bundle, {
      worldFactory: (snap: WorldSnapshot) => {
        const w = mkCompWorld();
        w.applySnapshot(snap);
        return w;
      },
    });
    const replayed: CompWorld = replayer.openAt(0); // component-typed world, no fromEngineWorld cast
    const h: Health | undefined = replayed.getComponent(e, 'health'); // typed (not unknown)
    expect(h).toEqual({ hp: 42 });
  });
});
