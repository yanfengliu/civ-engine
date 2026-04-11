# Systems and Simulation Guide

This guide covers system design, tick execution, real-time vs. deterministic stepping, and speed control.

## Table of Contents

1. [Writing Systems](#writing-systems)
2. [System Execution Order](#system-execution-order)
3. [Tick Lifecycle Detail](#tick-lifecycle-detail)
4. [Deterministic Stepping](#deterministic-stepping)
5. [Real-Time Loop](#real-time-loop)
6. [Speed Control](#speed-control)
7. [System Design Patterns](#system-design-patterns)

---

## Writing Systems

A system is a plain function with the signature `(world: World) => void`, or a registration object with a `name`, `phase`, and `execute` function. There are no classes or return values.

```typescript
import type { World, Position } from 'civ-engine';

interface Velocity { dx: number; dy: number }

function movementSystem(w: World): void {
  for (const id of w.query('position', 'velocity')) {
    const pos = w.getComponent<Position>(id, 'position')!;
    const vel = w.getComponent<Velocity>(id, 'velocity')!;
    w.setPosition(id, { x: pos.x + vel.dx, y: pos.y + vel.dy });
  }
}

world.registerSystem(movementSystem); // defaults to the update phase
world.registerSystem({
  name: 'Combat',
  phase: 'postUpdate',
  execute: combatSystem,
});
```

Systems can:
- Query entities
- Read and mutate components
- Create and destroy entities
- Emit events
- Submit commands (though this is unusual — commands are primarily for external input)
- Read the spatial grid
- Read and modify resources

For position components, prefer `world.setPosition()` over direct mutation when another system needs the spatial grid to reflect the move in the same tick. Direct component mutations are diff-detected, and direct position mutations are synchronized to the grid on the next tick by default. Large simulations can opt out of that fallback with `detectInPlacePositionMutations: false` and call `world.markPositionDirty(id)` after direct position mutation.

## System Execution Order

Systems run one after another, synchronously. They are grouped by phase in this order: `input`, `preUpdate`, `update`, `postUpdate`, `output`. Registration order is preserved inside each phase. There is no dependency graph or parallelism.

```typescript
world.registerSystem({ phase: 'input', execute: inputSystem });
world.registerSystem(movementSystem); // update phase
world.registerSystem({ phase: 'postUpdate', execute: combatSystem });
world.registerSystem({ phase: 'output', execute: reportSystem });
```

**Order matters.** If the movement system moves a unit into range and the combat system checks range, movement must run first. If the combat system kills a unit and the death system cleans up corpses, combat must run before death.

## Tick Lifecycle Detail

Each `step()` call executes one tick in this exact sequence:

```
1. eventBus.clear()              — discard events from previous tick
2. entityManager.clearDirty()    — reset entity creation/destruction tracking
3. clearComponentDirty()         — reset component change tracking
4. resourceStore.clearDirty()    — reset resource change tracking
5. processCommands()             — drain command queue, run handlers
6. syncSpatialIndex()            — optional direct-position-mutation fallback scan
7. input systems                 — input phase
8. preUpdate systems             — setup phase
9. update systems                — default phase
10. postUpdate systems           — follow-up phase
11. output systems               — reporting/output phase
12. resourceStore.processTick()  — production, consumption, transfers
13. buildDiff()                  — collect all changes into TickDiff
14. metrics update               — collect timing/query/spatial metrics
15. notify diffListeners         — push TickDiff to subscribers
16. tick++                       — increment counter
```

### Implications

| Fact | Implication |
|---|---|
| Commands process before systems | Command handlers can set up state that systems act on |
| Spatial sync before systems | Systems see up-to-date grid positions |
| Resources process after systems | Systems can add/remove resources; rates apply on top |
| Diff builds after everything | The diff captures all changes from the entire tick |
| Metrics update after diff | `world.getMetrics()` reports the most recent completed tick |
| Events cleared at tick start | Events from tick N are available during tick N, gone at tick N+1 |

## Deterministic Stepping

`step()` is the primary simulation method. It advances exactly one tick, ignoring:

- Pause state (`step()` works even when paused)
- Speed multiplier (always exactly one tick)
- Real-time timing (no `Date.now()`, no frame timing)

This makes `step()` deterministic: the same state + same commands = same result, every time.

```typescript
// AI agent control loop
for (let i = 0; i < 1000; i++) {
  // Analyze state
  const diff = world.getDiff();
  
  // Submit commands
  world.submit('moveUnit', { entityId: 0, targetX: 5, targetY: 3 });
  
  // Advance exactly one tick
  world.step();
}
```

### Testing

`step()` is how you test systems. No timers, no async, no flakiness:

```typescript
import { describe, it, expect } from 'vitest';

describe('movement system', () => {
  it('moves entity by velocity each tick', () => {
    const world = new World({ gridWidth: 16, gridHeight: 16, tps: 60 });
    world.registerComponent<Position>('position');
    world.registerComponent<Velocity>('velocity');
    world.registerSystem(movementSystem);

    const unit = world.createEntity();
    world.setPosition(unit, { x: 0, y: 0 });
    world.addComponent(unit, 'velocity', { dx: 1, dy: 0 });

    world.step();

    const pos = world.getComponent<Position>(unit, 'position')!;
    expect(pos.x).toBe(1);
    expect(pos.y).toBe(0);
  });
});
```

## Real-Time Loop

`start()` begins a timer-based loop that calls `step()` based on elapsed time and the configured TPS. `stop()` ends it.

```typescript
const world = new World({ gridWidth: 32, gridHeight: 32, tps: 10 });
// ... register systems ...

world.start();  // starts ticking at 10 TPS
// ... some time later ...
world.stop();   // stops the loop
```

### Fixed-timestep algorithm

The real-time loop uses a fixed-timestep approach:

1. Measure elapsed time since last frame
2. Multiply by speed multiplier
3. Accumulate into a time buffer
4. While the buffer >= one tick duration, call `step()` and subtract

This ensures consistent tick rates regardless of frame timing variations.

### Spiral-of-death protection

If the system falls behind (e.g., systems take longer than a tick), the accumulated time could grow unboundedly, causing more and more ticks per frame. The `maxTicksPerFrame` config (default: `4`) caps this. If more ticks are needed, the excess time is discarded.

```typescript
const world = new World({
  gridWidth: 32, gridHeight: 32, tps: 60,
  maxTicksPerFrame: 8, // allow up to 8 catch-up ticks per frame
});
```

## Speed Control

### Speed multiplier

The speed multiplier scales how fast time accumulates in the real-time loop. It has **no effect** on `step()`.

```typescript
world.setSpeed(2);    // ticks accumulate 2x faster
world.setSpeed(0.5);  // ticks accumulate at half rate
world.setSpeed(1);    // normal speed (default)
world.getSpeed();     // current multiplier
```

The multiplier must be a finite positive number. These throw:

```typescript
world.setSpeed(0);         // Error: must be positive
world.setSpeed(-1);        // Error: must be positive
world.setSpeed(Infinity);  // Error: must be finite
world.setSpeed(NaN);       // Error: must be finite
```

### Pause and resume

`pause()` freezes the real-time loop. The speed multiplier is preserved. `resume()` unfreezes at the current speed.

```typescript
world.pause();
world.isPaused;  // true

// step() still works while paused
world.step();    // executes one tick

world.resume();
world.isPaused;  // false
```

`resume()` resets the time accumulator to prevent a burst of ticks from the time spent paused.

## System Design Patterns

### One concern per system

Each system should handle one aspect of game logic:

```typescript
world.registerSystem(inputSystem);       // process player input
world.registerSystem(movementSystem);    // move entities
world.registerSystem(collisionSystem);   // detect collisions
world.registerSystem(combatSystem);      // resolve damage
world.registerSystem(deathSystem);       // clean up dead entities
world.registerSystem(spawnSystem);       // spawn new entities
```

### Conditional systems

Systems can skip work based on game state:

```typescript
function nightSystem(w: World): void {
  // Only run during night phase
  if (w.tick % 100 < 50) return; // first 50 ticks = day, next 50 = night
  
  for (const id of w.query('position', 'nocturnal')) {
    // activate nocturnal creatures
  }
}
```

### Inter-system communication via events

Systems communicate through events, not direct calls:

```typescript
function combatSystem(w: World): void {
  for (const id of w.query('health', 'position')) {
    const hp = w.getComponent<Health>(id, 'health')!;
    if (hp.hp <= 0) {
      w.emit('unitDied', { entityId: id });
    }
  }
}

function lootSystem(w: World): void {
  // React to deaths from combat system (same tick)
  // NOTE: This works because events fire synchronously
  // and lootSystem runs after combatSystem
}

// External observer
world.on('unitDied', (event) => {
  console.log(`Unit ${event.entityId} died`);
});
```

### Inter-system communication via components

Systems can also communicate by setting components that other systems read:

```typescript
// Combat system marks entities for death
function combatSystem(w: World): void {
  for (const id of w.query('health')) {
    const hp = w.getComponent<Health>(id, 'health')!;
    if (hp.hp <= 0) {
      w.addComponent(id, 'dead', {});
    }
  }
}

// Death system cleans up
function deathSystem(w: World): void {
  const toDestroy: EntityId[] = [];
  for (const id of w.query('dead')) {
    toDestroy.push(id);
  }
  for (const id of toDestroy) {
    w.destroyEntity(id);
  }
}
```

### Periodic systems

Run logic every N ticks:

```typescript
function dailySystem(w: World): void {
  if (w.tick % 100 !== 0) return; // every 100 ticks
  
  // daily logic
  for (const id of w.query('settlement')) {
    // collect taxes, grow population, etc.
  }
}
```
