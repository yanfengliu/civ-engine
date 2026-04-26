import { describe, it, expect } from 'vitest';
import { World } from '../src/world.js';

describe('CommandTransaction', () => {
  describe('basic propose-commit', () => {
    it('commits a single setComponent and the value lands in the world', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const entity = world.createEntity();
      world.registerComponent('hp');

      const result = world
        .transaction()
        .setComponent(entity, 'hp', { current: 100 })
        .commit();

      expect(result.ok).toBe(true);
      expect(world.getComponent(entity, 'hp')).toEqual({ current: 100 });
    });

    it('commits multiple mutations in order', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const entity = world.createEntity();
      world.registerComponent('hp');
      world.registerComponent('shield');

      world
        .transaction()
        .setComponent(entity, 'hp', { current: 50 })
        .setComponent(entity, 'shield', { current: 25 })
        .commit();

      expect(world.getComponent(entity, 'hp')).toEqual({ current: 50 });
      expect(world.getComponent(entity, 'shield')).toEqual({ current: 25 });
    });

    it('returns mutationsApplied count on success', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const entity = world.createEntity();
      world.registerComponent('hp');
      world.registerComponent('shield');

      const result = world
        .transaction()
        .setComponent(entity, 'hp', { current: 50 })
        .setComponent(entity, 'shield', { current: 25 })
        .commit();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mutationsApplied).toBe(2);
      }
    });
  });

  describe('preconditions', () => {
    it('require predicate that returns true allows commit', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const entity = world.createEntity();
      world.registerComponent('hp');

      const result = world
        .transaction()
        .require(() => true)
        .setComponent(entity, 'hp', { current: 100 })
        .commit();

      expect(result.ok).toBe(true);
      expect(world.getComponent(entity, 'hp')).toEqual({ current: 100 });
    });

    it('require predicate returning false aborts commit; no mutations applied', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const entity = world.createEntity();
      world.registerComponent('hp');

      const result = world
        .transaction()
        .setComponent(entity, 'hp', { current: 100 })
        .require(() => false)
        .commit();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('precondition_failed');
      }
      expect(world.getComponent(entity, 'hp')).toBeUndefined();
    });

    it('require predicate returning a string carries the rejection reason', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const entity = world.createEntity();
      world.registerComponent('hp');

      const result = world
        .transaction()
        .setComponent(entity, 'hp', { current: 100 })
        .require(() => 'not enough mana')
        .commit();

      expect(result.ok).toBe(false);
      if (!result.ok && result.code === 'precondition_failed') {
        expect(result.reason).toBe('not enough mana');
      } else {
        throw new Error('expected precondition_failed');
      }
    });

    it('multiple require predicates short-circuit on first failure', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      let secondCalled = false;
      const result = world
        .transaction()
        .require(() => 'first failed')
        .require(() => {
          secondCalled = true;
          return true;
        })
        .commit();

      expect(result.ok).toBe(false);
      if (!result.ok && result.code === 'precondition_failed') {
        expect(result.reason).toBe('first failed');
      } else {
        throw new Error('expected precondition_failed');
      }
      expect(secondCalled).toBe(false);
    });

    it('predicate has access to world for state-dependent checks', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const entity = world.createEntity();
      world.registerComponent('hp');
      world.setComponent(entity, 'hp', { current: 50 });

      const result = world
        .transaction()
        .require((w) => {
          const hp = w.getComponent<{ current: number }>(entity, 'hp');
          return (hp?.current ?? 0) >= 100 || 'hp too low';
        })
        .setComponent(entity, 'hp', { current: 200 })
        .commit();

      expect(result.ok).toBe(false);
      // Existing hp unchanged
      expect(world.getComponent(entity, 'hp')).toEqual({ current: 50 });
    });
  });

  describe('events', () => {
    it('emit during a transaction does not fire until commit', () => {
      type Events = { hit: { entity: number; damage: number } };
      const world = new World<Events>({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const seen: Array<{ entity: number; damage: number }> = [];
      world.on('hit', (data) => seen.push(data));

      const tx = world
        .transaction()
        .emit('hit', { entity: 1, damage: 5 });

      expect(seen).toEqual([]); // not yet emitted

      tx.commit();
      expect(seen).toEqual([{ entity: 1, damage: 5 }]);
    });

    it('aborted transaction does not emit buffered events', () => {
      type Events = { hit: { entity: number; damage: number } };
      const world = new World<Events>({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const seen: Array<{ entity: number; damage: number }> = [];
      world.on('hit', (data) => seen.push(data));

      world
        .transaction()
        .emit('hit', { entity: 1, damage: 5 })
        .require(() => false)
        .commit();

      expect(seen).toEqual([]);
    });
  });

  describe('resources', () => {
    it('addResource committed within transaction', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerResource('wood');
      const entity = world.createEntity();
      world.addResource(entity, 'wood', 100);

      world
        .transaction()
        .addResource(entity, 'wood', 50)
        .commit();

      const pool = world.getResource(entity, 'wood');
      expect(pool?.current).toBe(150);
    });

    it('removeResource within transaction', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerResource('wood');
      const entity = world.createEntity();
      world.addResource(entity, 'wood', 100);

      world
        .transaction()
        .removeResource(entity, 'wood', 30)
        .commit();

      const pool = world.getResource(entity, 'wood');
      expect(pool?.current).toBe(70);
    });

    it('cost-check pattern: require resource then deduct + apply effect', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerResource('wood');
      world.registerComponent('building');
      const player = world.createEntity();
      const site = world.createEntity();
      world.addResource(player, 'wood', 100);

      // Build: requires 80 wood, then place a building
      const result = world
        .transaction()
        .require((w) => {
          const pool = w.getResource(player, 'wood');
          return (pool?.current ?? 0) >= 80 || 'not enough wood';
        })
        .removeResource(player, 'wood', 80)
        .setComponent(site, 'building', { kind: 'house' })
        .commit();

      expect(result.ok).toBe(true);
      expect(world.getResource(player, 'wood')?.current).toBe(20);
      expect(world.getComponent(site, 'building')).toEqual({ kind: 'house' });
    });

    it('cost-check pattern: insufficient resources aborts; no changes applied', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerResource('wood');
      world.registerComponent('building');
      const player = world.createEntity();
      const site = world.createEntity();
      world.addResource(player, 'wood', 50);

      const result = world
        .transaction()
        .require((w) => {
          const pool = w.getResource(player, 'wood');
          return (pool?.current ?? 0) >= 80 || 'not enough wood';
        })
        .removeResource(player, 'wood', 80)
        .setComponent(site, 'building', { kind: 'house' })
        .commit();

      expect(result.ok).toBe(false);
      expect(world.getResource(player, 'wood')?.current).toBe(50); // unchanged
      expect(world.getComponent(site, 'building')).toBeUndefined(); // not built
    });
  });

  describe('position', () => {
    it('setPosition committed via transaction reflects in spatial grid', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('position');
      const entity = world.createEntity();
      world.setPosition(entity, { x: 1, y: 1 });

      world.transaction().setPosition(entity, { x: 5, y: 5 }).commit();

      expect(world.getComponent(entity, 'position')).toEqual({ x: 5, y: 5 });
      expect(world.grid.getAt(5, 5)?.has(entity)).toBe(true);
      expect(world.grid.getAt(1, 1)?.has(entity) ?? false).toBe(false);
    });
  });

  describe('removeComponent and patchComponent', () => {
    it('removeComponent during transaction', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      const entity = world.createEntity();
      world.setComponent(entity, 'hp', { current: 50 });

      world.transaction().removeComponent(entity, 'hp').commit();

      expect(world.getComponent(entity, 'hp')).toBeUndefined();
    });

    it('patchComponent during transaction', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      const entity = world.createEntity();
      world.setComponent(entity, 'hp', { current: 50 });

      world
        .transaction()
        .patchComponent<{ current: number }>(entity, 'hp', (hp) => ({
          current: hp.current + 10,
        }))
        .commit();

      expect(world.getComponent(entity, 'hp')).toEqual({ current: 60 });
    });
  });

  describe('abort', () => {
    it('abort() before commit() discards buffered mutations', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const entity = world.createEntity();
      world.registerComponent('hp');

      const tx = world.transaction().setComponent(entity, 'hp', { current: 100 });
      tx.abort();
      tx.commit();

      expect(world.getComponent(entity, 'hp')).toBeUndefined();
    });

    it('abort returns ok:false with code aborted', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const tx = world.transaction();
      tx.abort();
      const result = tx.commit();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('aborted');
      }
    });

    it('committing twice throws', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const entity = world.createEntity();
      world.registerComponent('hp');
      const tx = world.transaction().setComponent(entity, 'hp', { current: 100 });
      tx.commit();
      expect(() => tx.commit()).toThrow(/already (committed|aborted)/i);
    });

    it('chaining after commit throws', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const entity = world.createEntity();
      world.registerComponent('hp');
      const tx = world.transaction();
      tx.commit();
      expect(() =>
        tx.setComponent(entity, 'hp', { current: 100 }),
      ).toThrow(/already (committed|aborted)/i);
    });
  });

  describe('atomicity guarantees', () => {
    it('precondition failure leaves world untouched (no partial state)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      world.registerComponent('shield');
      world.registerResource('wood');
      const entity = world.createEntity();
      world.addResource(entity, 'wood', 50);
      world.setComponent(entity, 'hp', { current: 50 });

      const result = world
        .transaction()
        .removeResource(entity, 'wood', 30)
        .setComponent(entity, 'hp', { current: 100 })
        .setComponent(entity, 'shield', { current: 25 })
        .require(() => 'too late, abort')
        .commit();

      expect(result.ok).toBe(false);
      // Every original value should be unchanged
      expect(world.getResource(entity, 'wood')?.current).toBe(50);
      expect(world.getComponent(entity, 'hp')).toEqual({ current: 50 });
      expect(world.getComponent(entity, 'shield')).toBeUndefined();
    });

    it('all preconditions run before any mutation applies', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      const entity = world.createEntity();
      world.setComponent(entity, 'hp', { current: 50 });

      let preconditionSawHp: { current: number } | undefined;
      world
        .transaction()
        .setComponent(entity, 'hp', { current: 999 })
        .require((w) => {
          preconditionSawHp = w.getComponent<{ current: number }>(entity, 'hp');
          return true;
        })
        .commit();

      // Precondition should see ORIGINAL value (50), not the proposed 999
      expect(preconditionSawHp).toEqual({ current: 50 });
    });

    it('within a tick, transaction mutations all appear in the same TickDiff', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('a');
      world.registerComponent('b');
      const entity = world.createEntity();

      world.registerSystem({
        name: 'tx-system',
        execute: (w) => {
          w.transaction()
            .setComponent(entity, 'a', { v: 1 })
            .setComponent(entity, 'b', { v: 2 })
            .commit();
        },
      });

      world.step();
      const diff = world.getDiff();
      expect(diff).not.toBeNull();
      const componentTypes = Object.keys(diff!.components);
      expect(componentTypes).toContain('a');
      expect(componentTypes).toContain('b');
    });
  });

  describe('validation', () => {
    it('require throws if predicate is not a function', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      expect(() =>
        world.transaction().require('not a function' as unknown as () => true),
      ).toThrow(/function/);
    });

    it('emit at commit-time validates JSON-compat (delegated to EventBus)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      // EventBus rejects non-JSON-compat payloads
      const tx = world.transaction().emit('hit', { fn: () => 1 } as never);
      expect(() => tx.commit()).toThrow();
    });
  });

  describe('mid-commit throw → transaction is consumed (no retry double-apply)', () => {
    it('a buffered mutation throwing during commit finalizes the transaction', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerResource('wood');
      world.registerComponent('hp');
      const player = world.createEntity();
      const dyingEntity = world.createEntity();
      world.addResource(player, 'wood', 100);

      const tx = world
        .transaction()
        .removeResource(player, 'wood', 30)
        .setComponent(dyingEntity, 'hp', { current: 100 }); // will throw if dyingEntity destroyed

      // Destroy the entity between buffer and commit — setComponent will throw.
      world.destroyEntity(dyingEntity);

      expect(() => tx.commit()).toThrow();
      // After mid-commit throw the player's wood was already debited (partial state).
      expect(world.getResource(player, 'wood')?.current).toBe(70);
      // Crucially: a retry must NOT replay the first removeResource (which would
      // double-debit wood). The transaction is consumed; second commit() throws.
      expect(() => tx.commit()).toThrow(/already committed/i);
      // Wood is still 70, not 40 — no double-debit.
      expect(world.getResource(player, 'wood')?.current).toBe(70);
    });

    it('after a mid-commit throw, builder methods also throw', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      const dyingEntity = world.createEntity();

      const tx = world
        .transaction()
        .setComponent(dyingEntity, 'hp', { current: 100 });

      world.destroyEntity(dyingEntity);
      expect(() => tx.commit()).toThrow();
      expect(() =>
        tx.setComponent(dyingEntity, 'hp', { current: 50 }),
      ).toThrow(/already committed/i);
    });
  });

  describe('aliasing window', () => {
    // Documented behavior: buffered values are stored by reference. Mutating a
    // buffered object before commit reaches commit time. Caller must not
    // mutate buffered values until commit completes. This test pins the
    // current contract so a future change (defensive clone on buffer) would
    // need to update both behavior and this test.
    it('mutating a buffered object before commit is observable at apply time', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      const entity = world.createEntity();
      const data = { current: 50 };

      const tx = world.transaction().setComponent(entity, 'hp', data);
      data.current = 999;
      tx.commit();

      // Caller-side mutation of the buffered object reached commit time.
      expect(world.getComponent(entity, 'hp')).toEqual({ current: 999 });
    });
  });
});
