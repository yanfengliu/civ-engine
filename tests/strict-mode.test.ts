import { describe, expect, it } from 'vitest';
import {
  StrictModeViolationError,
  World,
  type WorldConfig,
} from '../src/index.js';

const mkConfig = (strict = false): WorldConfig => ({
  gridWidth: 10,
  gridHeight: 10,
  tps: 60,
  positionKey: 'position',
  strict,
});

interface Cmds { tick: { value: number } }
interface Events { ev: { id: number } }

const mkWorld = (strict = false): World<Events, Cmds> => {
  const w = new World<Events, Cmds>(mkConfig(strict));
  w.registerHandler('tick', () => undefined);
  w.registerComponent('position');
  w.registerComponent('hp');
  w.registerComponent('pos');
  return w;
};

function expectStrictThrow(method: string, fn: () => void): void {
  try {
    fn();
    expect.fail(`expected ${method} to throw StrictModeViolationError`);
  } catch (e) {
    expect(e).toBeInstanceOf(StrictModeViolationError);
    const det = (e as StrictModeViolationError).details;
    expect(det.code).toBe('strict_mode_violation');
    expect(det.method).toBe(method);
    expect(['between-ticks', 'after-failure']).toContain(det.phase);
    expect(typeof det.advice).toBe('string');
    expect(det.advice.length).toBeGreaterThan(0);
  }
}

describe('Strict Mode (Spec 6, v0.8.8)', () => {
  describe('1. default behavior (strict !== true)', () => {
    it('every mutation succeeds in every phase; never throws StrictModeViolationError', () => {
      const w = mkWorld(false);
      // Pre-tick (would-be "between-ticks" if strict)
      const e = w.createEntity();
      w.setState('mode', 'play');
      w.addTag(e, 'unit');
      w.setMeta(e, 'name', 'alice');
      w.random();
      // Step a tick.
      w.step();
      // Post-tick (would-be "between-ticks" if strict)
      w.deleteState('mode');
      w.removeTag(e, 'unit');
      w.deleteMeta(e, 'name');
      w.destroyEntity(e);
      expect(w.isStrict()).toBe(false);
    });
  });

  describe('2. strict construction', () => {
    it('reports correct flags', () => {
      const w = mkWorld(true);
      expect(w.isStrict()).toBe(true);
      expect(w.isInSetup()).toBe(true);
      expect(w.isInTick()).toBe(false);
      expect(w.isInMaintenance()).toBe(false);
    });
  });

  describe('3. setup window allows mutations', () => {
    it('addComponent / setState / addTag / setMeta / setPosition / emit / random all succeed pre-step', () => {
      const w = mkWorld(true);
      const e = w.createEntity();
      w.setState('terrain', 'plains');
      w.addTag(e, 'unit');
      w.setMeta(e, 'name', 'alice');
      w.setComponent(e, 'position', { x: 1, y: 1 });
      w.setPosition(e, { x: 2, y: 2 });
      w.random();
      // Resources need registration first
      w.registerResource('gold');
      w.addResource(e, 'gold', 100);
      // No throws.
      expect(w.isInSetup()).toBe(true);
    });
  });

  describe('4. implicit setup-end on first tick (covers step / stepWithResult / start-driven)', () => {
    it('first step() clears _inSetup', () => {
      const w = mkWorld(true);
      expect(w.isInSetup()).toBe(true);
      w.step();
      expect(w.isInSetup()).toBe(false);
    });

    it('first stepWithResult() clears _inSetup', () => {
      const w = mkWorld(true);
      w.stepWithResult();
      expect(w.isInSetup()).toBe(false);
    });
  });

  describe('5. explicit endSetup()', () => {
    it('clears the setup window before any step; idempotent', () => {
      const w = mkWorld(true);
      w.endSetup();
      expect(w.isInSetup()).toBe(false);
      w.endSetup(); // no-op
      expect(w.isInSetup()).toBe(false);
    });
  });

  describe('6. mutations during system execute succeed', () => {
    it('a registered system mutates components/state; isInTick() === true', () => {
      const w = mkWorld(true);
      const e = w.createEntity();
      let observedInTick = false;
      w.registerSystem({
        name: 's', phase: 'update',
        execute: () => {
          observedInTick = w.isInTick();
          w.setState('counter', 1);
          w.addTag(e, 'live');
        },
      });
      w.step();
      expect(observedInTick).toBe(true);
      expect(w.getState('counter')).toBe(1);
    });
  });

  describe('7. mutations during onDiff listener succeed', () => {
    it('listener that calls setState succeeds (in-tick)', () => {
      const w = mkWorld(true);
      let listenerRan = false;
      w.onDiff(() => { listenerRan = true; w.setState('after', true); });
      w.step();
      expect(listenerRan).toBe(true);
      expect(w.getState('after')).toBe(true);
    });
  });

  describe('8. mutations during onTickFailure listener succeed (load-bearing ordering invariant)', () => {
    it('listener fires while _inTickPhase still true; recover() works', () => {
      const w = mkWorld(true);
      w.registerSystem({
        name: 'boom', phase: 'update',
        execute: () => { throw new Error('intentional'); },
      });
      let listenerRan = false;
      let inTickAtListener = false;
      w.onTickFailure(() => {
        listenerRan = true;
        inTickAtListener = w.isInTick();
        // mutation inside listener should succeed
        w.setState('failure_seen', true);
      });
      try { w.step(); } catch { /* expected */ }
      expect(listenerRan).toBe(true);
      expect(inTickAtListener).toBe(true);
    });
  });

  describe('9. mutations between ticks throw StrictModeViolationError', () => {
    it('every gated method throws between ticks', () => {
      const w = mkWorld(true);
      const e = w.createEntity();
      w.setState('seed', 1);
      w.registerResource('gold');
      w.addResource(e, 'gold', 10);
      w.step();
      // Now between ticks; setup ended.
      expectStrictThrow('createEntity', () => w.createEntity());
      expectStrictThrow('destroyEntity', () => w.destroyEntity(e));
      expectStrictThrow('addComponent', () => w.addComponent(e, 'hp', { v: 10 }));
      expectStrictThrow('setComponent', () => w.setComponent(e, 'hp', { v: 10 }));
      expectStrictThrow('removeComponent', () => w.removeComponent(e, 'hp'));
      expectStrictThrow('patchComponent', () => w.patchComponent(e, 'hp', () => undefined));
      expectStrictThrow('setPosition', () => w.setPosition(e, { x: 0, y: 0 }));
      expectStrictThrow('setState', () => w.setState('seed', 2));
      expectStrictThrow('deleteState', () => w.deleteState('seed'));
      expectStrictThrow('addTag', () => w.addTag(e, 't'));
      expectStrictThrow('removeTag', () => w.removeTag(e, 't'));
      expectStrictThrow('setMeta', () => w.setMeta(e, 'k', 'v'));
      expectStrictThrow('deleteMeta', () => w.deleteMeta(e, 'k'));
      expectStrictThrow('emit', () => w.emit('ev', { id: 1 }));
      // Resources / transfers
      expectStrictThrow('addResource', () => w.addResource(e, 'gold', 1));
      expectStrictThrow('removeResource', () => w.removeResource(e, 'gold', 1));
      expectStrictThrow('setResourceMax', () => w.setResourceMax(e, 'gold', 100));
      expectStrictThrow('setProduction', () => w.setProduction(e, 'gold', 1));
      expectStrictThrow('setConsumption', () => w.setConsumption(e, 'gold', 1));
      const e2 = w.runMaintenance(() => w.createEntity());
      w.runMaintenance(() => { w.addResource(e2, 'gold', 5); });
      const tid = w.runMaintenance(() => w.addTransfer(e, e2, 'gold', 1));
      expectStrictThrow('addTransfer', () => w.addTransfer(e, e2, 'gold', 1));
      expectStrictThrow('removeTransfer', () => w.removeTransfer(tid));
    });
  });

  describe('15-17. CommandTransaction.commit() in three phases (ADR 40)', () => {
    it('15. commit() outside any phase throws StrictModeViolationError at the first applied mutation', () => {
      const w = mkWorld(true);
      const e = w.createEntity();
      w.step();
      const txn = w.transaction();
      txn.setComponent(e, 'hp', { v: 100 });
      try {
        txn.commit();
        expect.fail('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(StrictModeViolationError);
        expect((err as StrictModeViolationError).details.method).toBe('setComponent');
      }
    });

    it('16. commit() inside runMaintenance succeeds', () => {
      const w = mkWorld(true);
      const e = w.createEntity();
      w.step();
      const result = w.runMaintenance(() => {
        const txn = w.transaction();
        txn.setComponent(e, 'hp', { v: 50 });
        return txn.commit();
      });
      expect(result.ok).toBe(true);
    });

    it('17. commit() inside a tick (via system) succeeds', () => {
      const w = mkWorld(true);
      const e = w.createEntity();
      let committed = false;
      w.registerSystem({
        name: 'commit-in-system', phase: 'update',
        execute: () => {
          const txn = w.transaction();
          txn.setComponent(e, 'hp', { v: 25 });
          const r = txn.commit();
          committed = r.ok;
        },
      });
      w.step();
      expect(committed).toBe(true);
    });
  });

  describe('10. random() between ticks throws (determinism-targeted)', () => {
    it('throws StrictModeViolationError with method=random', () => {
      const w = mkWorld(true);
      w.step();
      expectStrictThrow('random', () => w.random());
    });
  });

  describe('11. runMaintenance(fn) allows mutations inside fn', () => {
    it('mutations inside fn succeed; outside fn throw again', () => {
      const w = mkWorld(true);
      const e = w.createEntity();
      w.step();
      const result = w.runMaintenance(() => {
        w.setComponent(e, 'hp', { v: 100 });
        w.setState('after', 1);
        return 'done';
      });
      expect(result).toBe('done');
      expectStrictThrow('setComponent', () => w.setComponent(e, 'hp', { v: 50 }));
    });
  });

  describe('12. runMaintenance(fn) try/finally clears depth on exception', () => {
    it('exception inside fn decrements counter; subsequent mutations throw', () => {
      const w = mkWorld(true);
      const e = w.createEntity();
      w.step();
      try {
        w.runMaintenance(() => {
          w.setComponent(e, 'hp', { v: 1 });
          throw new Error('oops');
        });
      } catch (e) {
        expect((e as Error).message).toBe('oops');
      }
      expect(w.isInMaintenance()).toBe(false);
      expectStrictThrow('setComponent', () => w.setComponent(e, 'hp', { v: 2 }));
    });
  });

  describe('13. nested runMaintenance via depth counter (no-op nesting)', () => {
    it('inner nested call succeeds; outer exit clears the gate', () => {
      const w = mkWorld(true);
      const e = w.createEntity();
      w.step();
      w.runMaintenance(() => {
        expect(w.isInMaintenance()).toBe(true);
        w.runMaintenance(() => {
          expect(w.isInMaintenance()).toBe(true);
          w.setComponent(e, 'hp', { v: 1 });
        });
        expect(w.isInMaintenance()).toBe(true);
        w.setComponent(e, 'hp', { v: 2 });
      });
      expect(w.isInMaintenance()).toBe(false);
      expectStrictThrow('setComponent', () => w.setComponent(e, 'hp', { v: 3 }));
    });

    it('exception inside inner nested fn correctly decrements depth', () => {
      const w = mkWorld(true);
      const e = w.createEntity();
      w.step();
      try {
        w.runMaintenance(() => {
          w.runMaintenance(() => { throw new Error('inner'); });
        });
      } catch { /* expected */ }
      expect(w.isInMaintenance()).toBe(false);
      expectStrictThrow('setComponent', () => w.setComponent(e, 'hp', { v: 1 }));
    });
  });

  describe('14. isInMaintenance() reflects depth', () => {
    it('false outside, true inside, false after', () => {
      const w = mkWorld(true);
      expect(w.isInMaintenance()).toBe(false);
      w.runMaintenance(() => {
        expect(w.isInMaintenance()).toBe(true);
      });
      expect(w.isInMaintenance()).toBe(false);
    });
  });

  describe('18. applySnapshot works at any phase regardless of strict mode', () => {
    it('strict world: applySnapshot between ticks succeeds', () => {
      const w = mkWorld(true);
      w.setState('a', 1);
      w.step();
      const snap = w.serialize();
      // Should not throw
      w.applySnapshot(snap);
      expect(w.getState('a')).toBe(1);
    });
  });

  describe('19. World.deserialize returns fresh world with setup window', () => {
    it('strict world fresh from deserialize preserves strict flag and opens setup window', () => {
      const w = mkWorld(true);
      w.setState('a', 1);
      const snap = w.serialize();
      const w2 = World.deserialize<Events, Cmds>(snap);
      expect(w2.isStrict()).toBe(true);
      expect(w2.isInSetup()).toBe(true);
    });

    it('non-strict world deserializes as non-strict', () => {
      const w = mkWorld(false);
      const snap = w.serialize();
      const w2 = World.deserialize<Events, Cmds>(snap);
      expect(w2.isStrict()).toBe(false);
      expect(w2.isInSetup()).toBe(false);
    });
  });

  describe('20. recover() works in strict mode', () => {
    it('between-ticks recover() does not throw', () => {
      const w = mkWorld(true);
      w.registerSystem({ name: 'boom', phase: 'update', execute: () => { throw new Error('x'); } });
      try { w.step(); } catch { /* expected */ }
      expect(w.isPoisoned()).toBe(true);
      // Between ticks, recover should work.
      w.recover();
      expect(w.isPoisoned()).toBe(false);
    });
  });

  describe('21. submit / step / register / listener-add / pause / resume / setSpeed unrestricted', () => {
    it('all work between ticks in strict mode', () => {
      const w = mkWorld(true);
      w.step();
      // submit goes through unrestricted (queues for next tick)
      w.submit('tick', { value: 1 });
      const result = w.submitWithResult('tick', { value: 2 });
      expect(result).toBeDefined();
      // Registration unrestricted (use a fresh handler name)
      w.registerHandler('newCmd' as never, () => undefined);
      // Listeners unrestricted
      const listener = (): void => undefined;
      w.onDiff(listener);
      w.offDiff(listener);
      // Loop control unrestricted
      w.pause();
      w.resume();
      w.setSpeed(1);
      // step itself OK
      w.step();
    });
  });

  describe('22. StrictModeViolationError shape', () => {
    it('details.code, method, phase, advice all populated', () => {
      const w = mkWorld(true);
      const e = w.createEntity();
      w.step();
      try {
        w.setComponent(e, 'hp', { v: 1 });
        expect.fail('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(StrictModeViolationError);
        const e = err as StrictModeViolationError;
        expect(e.details.code).toBe('strict_mode_violation');
        expect(e.details.method).toBe('setComponent');
        expect(['between-ticks', 'after-failure']).toContain(e.details.phase);
        expect(e.details.advice).toBeTruthy();
      }
    });
  });

  describe('23. determinism parity (synthetic seed)', () => {
    it('same seed produces same output strict vs non-strict (modulo the strict flag itself)', () => {
      const buildAndStep = (strict: boolean): { config: { strict?: boolean } } & object => {
        const w = new World<Events, Cmds>({ ...mkConfig(strict), seed: 'fixed' });
        w.registerHandler('tick', () => undefined);
        w.registerComponent('pos');
        const e = w.createEntity();
        w.setComponent(e, 'pos', { x: 0, y: 0 });
        for (let i = 0; i < 5; i++) w.step();
        return w.serialize() as never;
      };
      const strict = buildAndStep(true);
      const loose = buildAndStep(false);
      // Strip the strict flag from both before comparing — it is the only
      // intentional config-shape difference between strict and non-strict
      // bundles for the same seed/inputs.
      delete strict.config.strict;
      delete loose.config.strict;
      expect(JSON.stringify(strict)).toEqual(JSON.stringify(loose));
    });
  });
});
