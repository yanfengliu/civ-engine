import { MemorySink, runAgentPlaytest, runSynthPlaytest, World } from '../../src/index.js';
import type { SessionSink, SessionSource, WorldSnapshot } from '../../src/index.js';

export type Events = { seen: { total: number } };
export type Commands = { add: { value: number } };
export type Components = { token: { value: number } };
export type State = { prepared: number; total: number; published: number };
export type TestWorld = World<Events, Commands, Components, State>;
export type Runner = 'synthetic' | 'agent';
export const runners: Runner[] = ['synthetic', 'agent'];

export function makeWorld(): TestWorld {
  const world = new World<Events, Commands, Components, State>({ gridWidth: 4, gridHeight: 4, tps: 60 });
  world.registerComponent('token');
  world.setState('prepared', 0);
  world.setState('total', 0);
  world.setState('published', 0);
  world.registerHandler('add', (data, w) => {
    const total = w.getState('total')! + data.value + w.getState('prepared')!;
    w.setState('total', total);
    w.emit('seen', { total });
  });
  return world;
}

export function worldFactory(snapshot: WorldSnapshot): TestWorld {
  const world = makeWorld();
  world.applySnapshot(snapshot);
  return world;
}

export function prepareAndStep(world: TestWorld): void {
  world.runMaintenance(() => { world.setState('prepared', world.tick + 1); });
  world.step();
}

export async function run(runner: Runner, world: TestWorld, advance?: (w: TestWorld) => void,
  options: { maxTicks?: number; sink?: SessionSink & SessionSource; stopWhen?: () => boolean } = {}) {
  const common = { world, maxTicks: options.maxTicks ?? 3, snapshotInterval: 2, advance,
    sink: options.sink, stopWhen: options.stopWhen };
  if (runner === 'synthetic') {
    return runSynthPlaytest({ ...common, policySeed: 42, policies: [() => [{ type: 'add', data: { value: 10 } }]] });
  }
  return runAgentPlaytest({ ...common, agent: { decide: () => [{ type: 'add', data: { value: 10 } }] } });
}

export function reconnect(world: TestWorld): void {
  // A second runner must be able to capture commands: recorder mutex/listeners were released.
  const result = runSynthPlaytest({ world, policies: [], policySeed: 42, maxTicks: 1, sink: new MemorySink() });
  if (result.ticksRun !== 1) throw new Error('advance error leaked the recorder connection');
}
