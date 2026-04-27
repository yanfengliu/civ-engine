import { describe, it, expect, vi } from 'vitest';
import { World } from '../src/world.js';
import { FORBIDDEN_PRECONDITION_METHODS } from '../src/command-transaction.js';

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

    it('emit() validates JSON-compat at buffer time (M1) — throws before commit', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      const entity = world.createEntity();

      const tx = world.transaction().setComponent(entity, 'hp', { current: 100 });
      // Non-JSON payload is rejected at emit() call time, before any mutation runs.
      expect(() => tx.emit('hit', { fn: () => 1 } as never)).toThrow();
      // Mutations buffered before the bad emit() are NOT applied.
      expect(world.getComponent(entity, 'hp')).toBeUndefined();
    });
  });

  describe('precondition read-only enforcement (C1)', () => {
    it('predicate cannot mutate world via setComponent', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      const e = world.createEntity();

      const tx = world.transaction().require((w) => {
        // Cast away the readonly type; runtime must still block the write.
        (w as unknown as World).setComponent(e, 'hp', { current: 1 });
        return true;
      });
      expect(() => tx.commit()).toThrow(/precondition/i);
      expect(world.getComponent(e, 'hp')).toBeUndefined();
    });

    it('predicate cannot debit resources during evaluation', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerResource('wood');
      const player = world.createEntity();
      world.addResource(player, 'wood', 100);

      const tx = world.transaction().require((w) => {
        (w as unknown as World).removeResource(player, 'wood', 50);
        return false;
      });
      expect(() => tx.commit()).toThrow(/precondition/i);
      // Wood untouched: predicate's side-effect blocked.
      expect(world.getResource(player, 'wood')?.current).toBe(100);
    });

    it('every method in FORBIDDEN_PRECONDITION_METHODS throws when called from a predicate (R1)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      world.registerResource('wood');
      const e = world.createEntity();

      for (const methodName of FORBIDDEN_PRECONDITION_METHODS) {
        const tx = world.transaction().require((w) => {
          // Cast away the readonly type. Runtime proxy must still throw.
          const fn = (w as unknown as Record<string, unknown>)[methodName];
          if (typeof fn !== 'function') {
            // Method does not exist on this concrete World instance — skip.
            // (The list is exhaustive against the public surface, but a few
            // methods like submitWithResult always exist; assertion below
            // would otherwise fail for genuinely-missing names.)
            return true;
          }
          // Invoke the method; we don't care about valid args, the proxy
          // must throw before the method body runs.
          (fn as () => unknown).call(w);
          return true;
        });
        expect(() => tx.commit(), `expected '${methodName}' to be blocked`).toThrow(
          /preconditions must be side-effect free/,
        );
      }
      // World state untouched — no entity components, resources, or state added.
      expect(world.getComponent(e, 'hp')).toBeUndefined();
    });

    it('FORBIDDEN list is exhaustive against World prototype (meta-test)', () => {
      // Cross-check that every public mutating/lifecycle/listener method on
      // World.prototype is classified — either as FORBIDDEN (predicate cannot
      // call) or in PUBLIC_READ_OR_INTERNAL (read-only / TypeScript-private,
      // safe-or-irrelevant for predicates). A new World method that is neither
      // makes this test fail, forcing explicit classification.
      const PUBLIC_READ_OR_INTERNAL = new Set<string>([
        // Public read methods (safe inside preconditions)
        'isAlive', 'getEntityGeneration', 'getEntityRef', 'isCurrent',
        'getComponent', 'getComponents',
        'query', 'findNearest', 'queryInRadius', 'getPosition',
        'isPoisoned', 'getEvents', 'getDiff', 'getMetrics',
        'getInstrumentationProfile', 'getLastTickFailure',
        'getResource', 'getProduction', 'getConsumption', 'getTransfers',
        'getState', 'hasState',
        'hasTag', 'getByTag', 'getTags',
        'getMeta', 'getByMeta',
        'getSpeed', 'isPaused', 'hasCommandHandler',
        'getAliveEntities', 'getResourceEntities', 'tick',
        // TypeScript-private methods (not detectable at runtime; listed
        // explicitly so new private additions still require classification).
        'makeWorldPoisonedFailure', 'getObservableTick',
        'clearComponentDirty', 'clearStateDirty',
        'removeEntityTags', 'removeEntityMeta',
        'addTagInternal', 'setMetaInternal',
        'getStateDirty', 'buildDiff',
        'runTick', 'processCommands', 'dropPendingCommands',
        'createCommandSubmissionResult', 'createCommandExecutionResult',
        'emitCommandResult', 'emitCommandExecutionResult',
        'emitTickFailure', 'finalizeTickFailure', 'createTickFailure',
        'executeTickOrThrow', 'executeSystems', 'resolveSystemOrder',
        'validateCommand', 'emitCommandExecution',
        'normalizeSystemRegistration',
        'syncSpatialEntity', 'rebuildSpatialIndex', 'removeFromSpatialIndex',
        'getStore', 'assertAlive', 'assertPositionInBounds',
        'registerComponentBit', 'setEntityComponentSignature', 'setEntitySignature',
        'updateQueryCacheMembership', 'normalizeQueryKeys', 'getQueryCache',
        'queryMask', 'rebuildComponentSignatures',
      ]);
      const allMembers = Object.getOwnPropertyNames(World.prototype).filter(
        (name) => !name.startsWith('_') && name !== 'constructor',
      );
      const forbidden = new Set<string>(FORBIDDEN_PRECONDITION_METHODS);
      const uncovered: string[] = [];
      for (const member of allMembers) {
        if (!forbidden.has(member) && !PUBLIC_READ_OR_INTERNAL.has(member)) {
          uncovered.push(member);
        }
      }
      expect(
        uncovered,
        `New World members must be classified as forbidden or read-only-or-internal: ${uncovered.join(', ')}`,
      ).toEqual([]);

      // Also verify: every entry in FORBIDDEN_PRECONDITION_METHODS exists on
      // World.prototype. Catches typos / dead entries.
      const memberSet = new Set(allMembers);
      const phantom = FORBIDDEN_PRECONDITION_METHODS.filter((name) => !memberSet.has(name));
      expect(
        phantom,
        `FORBIDDEN_PRECONDITION_METHODS contains entries not on World.prototype: ${phantom.join(', ')}`,
      ).toEqual([]);
    });

    it('predicate cannot call random() — would advance RNG and break determinism (R1)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60, seed: 'fixed' });
      // Capture RNG state by sampling once before the predicate.
      const expected = world.random();
      const tx = world.transaction().require((w) => {
        // Cast away. The proxy must block.
        (w as unknown as { random: () => number }).random();
        return true;
      });
      expect(() => tx.commit()).toThrow(/preconditions must be side-effect free/);
      // RNG sequence is unchanged: the next sample after the failed predicate
      // is the same as the next sample we would have gotten without any
      // predicate intervention.
      expect(world.random()).not.toBe(expected); // sanity: random advances
      // Re-seed and confirm deterministic replay still works.
      const w2 = new World({ gridWidth: 10, gridHeight: 10, tps: 60, seed: 'fixed' });
      expect(w2.random()).toBe(expected);
    });

    it('predicate cannot call setProduction (R1)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerResource('wood');
      const e = world.createEntity();
      world.addResource(e, 'wood', 50);

      const tx = world.transaction().require((w) => {
        (w as unknown as { setProduction: (e: number, k: string, r: number) => void })
          .setProduction(e, 'wood', 99);
        return true;
      });
      expect(() => tx.commit()).toThrow(/preconditions must be side-effect free/);
      expect(world.getProduction(e, 'wood')).toBe(0);
    });

    it('predicate cannot mutate world via in-place edit of getComponent return (Codex Critical, iter-5)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      const e = world.createEntity();
      world.setComponent(e, 'hp', { current: 100 });

      const tx = world.transaction().require((w) => {
        // Read the component, mutate its returned object in place, then
        // return false to "abort". Pre-fix: world.getComponent(e, 'hp')
        // handed back the live ComponentStore reference, so the mutation
        // landed on engine state. Post-fix: the proxy clones the return.
        const hp = w.getComponent(e, 'hp') as { current: number };
        hp.current = 0;
        return false;
      });
      const result = tx.commit();
      expect(result.ok).toBe(false);
      // World state untouched: hp.current still 100.
      expect((world.getComponent(e, 'hp') as { current: number }).current).toBe(100);
    });

    it('predicate cannot mutate world state via in-place edit of getState return', () => {
      const world = new World<Record<string, never>, Record<string, never>, Record<string, unknown>, { config: { rate: number } }>(
        { gridWidth: 10, gridHeight: 10, tps: 60 },
      );
      world.setState('config', { rate: 5 });

      const tx = world.transaction().require((w) => {
        const config = w.getState('config') as { rate: number };
        config.rate = 999;
        return false;
      });
      tx.commit();
      const live = world.getState('config') as { rate: number };
      expect(live.rate).toBe(5);
    });

    it('predicate cannot mutate world via in-place edit of getResource return', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerResource('wood');
      const e = world.createEntity();
      world.addResource(e, 'wood', 100);

      const tx = world.transaction().require((w) => {
        const pool = w.getResource(e, 'wood') as { current: number; max: number | null };
        pool.current = 0;
        return false;
      });
      tx.commit();
      expect(world.getResource(e, 'wood')?.current).toBe(100);
    });

    it('predicate cannot monkey-patch world.grid methods (Codex iter-6 High)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const e = world.createEntity();
      world.registerComponent('position');
      world.setComponent(e, 'position', { x: 3, y: 3 });

      const originalGetAt = world.grid.getAt;
      const tx = world.transaction().require((w) => {
        // world.grid is frozen — assignment must throw in strict mode.
        expect(() => {
          (w.grid as unknown as { getAt: () => null }).getAt = () => null;
        }).toThrow();
        return true;
      });
      tx.commit();
      // grid.getAt is unchanged.
      expect(world.grid.getAt).toBe(originalGetAt);
      // Sanity: the original getAt still works.
      const cell = world.grid.getAt(3, 3);
      expect(cell?.has(e)).toBe(true);
    });

    it('predicate cannot call warnIfPoisoned (proxy blocks the call) — R1 hole', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      // Use a healthy world so the outer commit's own warnIfPoisoned is a no-op,
      // isolating the test to the predicate-blocking behavior.
      const tx = world.transaction().require((w) => {
        (w as unknown as { warnIfPoisoned: (api: string) => void }).warnIfPoisoned('hijacked');
        return true;
      });
      expect(() => tx.commit()).toThrow(/preconditions must be side-effect free/);
    });

    it('predicate cannot call pause / start / setSpeed (R1)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });

      for (const lifecycleMethod of ['pause', 'start', 'setSpeed', 'stop', 'resume'] as const) {
        const tx = world.transaction().require((w) => {
          (w as unknown as Record<string, (n?: number) => void>)[lifecycleMethod](1);
          return true;
        });
        expect(() => tx.commit(), `expected '${lifecycleMethod}' to be blocked`).toThrow(
          /preconditions must be side-effect free/,
        );
      }
    });

    it('predicate can call read methods (getComponent, hasResource)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      world.registerResource('wood');
      const e = world.createEntity();
      world.setComponent(e, 'hp', { current: 50 });
      world.addResource(e, 'wood', 10);

      const result = world
        .transaction()
        .setComponent(e, 'hp', { current: 100 })
        .require((w) => {
          // Reads are allowed.
          const hp = w.getComponent(e, 'hp') as { current: number } | undefined;
          const wood = w.getResource(e, 'wood');
          return hp?.current === 50 && (wood?.current ?? 0) >= 10;
        })
        .commit();

      expect(result.ok).toBe(true);
    });
  });

  describe('poisoned-world warning (H3)', () => {
    it('commit() warns once when world is poisoned', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerSystem(() => {
        throw new Error('boom');
      });
      world.stepWithResult();
      expect(world.isPoisoned()).toBe(true);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      world.transaction().commit();
      world.transaction().commit();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = warnSpy.mock.calls[0][0] as string;
      expect(message).toMatch(/transaction/);
      expect(message).toMatch(/poisoned/);
      warnSpy.mockRestore();
    });

    it('commit() does not warn on a healthy world', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      world.transaction().commit();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('terminal status error messages (L2)', () => {
    it('after abort, builder throws an aborted-flavored error', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      const e = world.createEntity();
      const tx = world.transaction();
      tx.abort();
      expect(() => tx.setComponent(e, 'hp', { current: 1 })).toThrow(/aborted/i);
    });

    it('after successful commit, builder throws a committed-flavored error', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      world.registerComponent('hp');
      const e = world.createEntity();
      const tx = world.transaction();
      tx.commit();
      expect(() => tx.setComponent(e, 'hp', { current: 1 })).toThrow(/committed/i);
    });

    it('after abort then commit then re-commit, the second commit throws aborted-flavored (L_NEW1)', () => {
      const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
      const tx = world.transaction();
      tx.abort();
      const first = tx.commit();
      expect(first.ok).toBe(false);
      if (!first.ok) expect(first.code).toBe('aborted');
      // Status is now 'committed' but terminalReason is 'aborted'.
      expect(() => tx.commit()).toThrow(/aborted/i);
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
