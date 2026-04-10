# Behavior Trees Guide

This guide covers the behavior tree (BT) framework for building AI decision-making in civ-engine. By the end, you'll understand the BT model, know how to wire trees into the ECS, and be able to build complex multi-priority AI.

## Table of Contents

1. [What is a Behavior Tree?](#what-is-a-behavior-tree)
2. [Node Types](#node-types)
3. [Building Your First Tree](#building-your-first-tree)
4. [Multi-Tick Actions (RUNNING)](#multi-tick-actions-running)
5. [ECS Integration](#ecs-integration)
6. [Shared Trees, Per-Entity State](#shared-trees-per-entity-state)
7. [Complex AI Patterns](#complex-ai-patterns)
8. [Serialization](#serialization)

---

## What is a Behavior Tree?

A behavior tree is a hierarchical structure that models decision-making. Each tick, the tree is traversed from the root. Nodes return one of three statuses:

| Status | Meaning |
|---|---|
| `SUCCESS` | This action/check completed successfully |
| `FAILURE` | This action/check failed |
| `RUNNING` | This action needs more ticks to complete |

Trees are composed of **leaf nodes** (actions, conditions) and **composite nodes** (selectors, sequences) that control traversal.

## Node Types

### Action

A leaf node that performs work and returns a status.

```typescript
import { NodeStatus, type Position } from 'civ-engine';

// Immediate action
builder.action((ctx) => {
  ctx.world.addResource(ctx.entityId, 'food', 5);
  return NodeStatus.SUCCESS;
});

// Multi-tick action
builder.action((ctx) => {
  const pos = ctx.world.getComponent<Position>(ctx.entityId, 'position');
  if (!pos) return NodeStatus.FAILURE;
  if (pos.x === ctx.targetX && pos.y === ctx.targetY) {
    return NodeStatus.SUCCESS;
  }
  // Move one step closer
  ctx.world.setPosition(ctx.entityId, {
    x: pos.x + Math.sign(ctx.targetX - pos.x),
    y: pos.y,
  });
  return NodeStatus.RUNNING;
});
```

### Condition

A leaf node that tests a boolean. Returns `SUCCESS` for `true`, `FAILURE` for `false`. Never returns `RUNNING`.

```typescript
builder.condition((ctx) => {
  const hp = ctx.world.getComponent(ctx.entityId, 'health');
  return hp !== undefined && hp.hp > 0;
});
```

### Selector (OR logic)

A composite node that tries children left-to-right:
- If a child returns **SUCCESS** → selector returns **SUCCESS** (stop)
- If a child returns **RUNNING** → selector returns **RUNNING** (stop, resume here next tick)
- If a child returns **FAILURE** → try the next child
- If all children fail → selector returns **FAILURE**

Think of it as "try plan A, if that fails try plan B, if that fails try plan C."

```typescript
builder.selector([
  attackNearbyEnemy,   // try this first
  gatherResources,     // if nothing to attack, gather
  wander,              // if nothing to gather, wander
]);
```

### Sequence (AND logic)

A composite node that runs children left-to-right:
- If a child returns **SUCCESS** → run the next child
- If a child returns **RUNNING** → sequence returns **RUNNING** (stop, resume here next tick)
- If a child returns **FAILURE** → sequence returns **FAILURE** (stop)
- If all children succeed → sequence returns **SUCCESS**

Think of it as "do step 1, then step 2, then step 3 — abort if any step fails."

```typescript
builder.sequence([
  builder.condition((ctx) => ctx.hasTarget),
  moveToTarget,    // must succeed before attacking
  attackTarget,    // only runs if moveToTarget succeeded
]);
```

## Building Your First Tree

```typescript
import {
  createBehaviorTree,
  createBTState,
  NodeStatus,
  type BTState,
  type BTNode,
  type EntityId,
  type World,
} from 'civ-engine';

// 1. Define your context type
interface AIContext {
  entityId: EntityId;
  world: World;
  btState: BTState;
}

// 2. Build the tree
const tree: BTNode<AIContext> = createBehaviorTree<AIContext>(
  (ctx) => ctx.btState,  // how to find BTState in the context
  (b) =>
    b.selector([
      // If health is low, flee
      b.sequence([
        b.condition((ctx) => {
          const hp = ctx.world.getComponent<{ hp: number }>(ctx.entityId, 'health');
          return hp !== undefined && hp.hp < 20;
        }),
        b.action((ctx) => {
          // flee logic here
          return NodeStatus.SUCCESS;
        }),
      ]),
      // Otherwise, idle
      b.action(() => NodeStatus.SUCCESS),
    ]),
);

// 3. Create per-entity state
const state: BTState = createBTState(tree);

// 4. Tick the tree
const ctx: AIContext = { entityId: 0, world, btState: state };
const status = tree.tick(ctx);
```

## Multi-Tick Actions (RUNNING)

When an action returns `RUNNING`, composite nodes remember which child was active and resume from there on the next tick. This is how you implement actions that span multiple ticks (like movement along a path).

```typescript
const moveToTarget = createBehaviorTree<AIContext>(
  (ctx) => ctx.btState,
  (b) =>
    b.action((ctx) => {
      const pos = ctx.world.getComponent<Position>(ctx.entityId, 'position')!;
      const target = ctx.world.getComponent<{ x: number; y: number }>(ctx.entityId, 'target');

      if (!target) return NodeStatus.FAILURE;

      if (pos.x === target.x && pos.y === target.y) {
        ctx.world.removeComponent(ctx.entityId, 'target');
        return NodeStatus.SUCCESS;
      }

      const next = { x: pos.x, y: pos.y };
      if (next.x < target.x) next.x++;
      else if (next.x > target.x) next.x--;
      if (next.y < target.y) next.y++;
      else if (next.y > target.y) next.y--;
      ctx.world.setPosition(ctx.entityId, next);

      return NodeStatus.RUNNING; // not there yet
    }),
);
```

When a selector has a running child, it resumes from that child instead of starting from the first child. This means high-priority checks are skipped until the running action completes or is interrupted. If you need to check high-priority conditions every tick, structure your tree like this:

```typescript
// This pattern checks "flee" every tick, even during movement
b.selector([
  b.sequence([
    b.condition((ctx) => isLowHealth(ctx)), // checked every tick
    fleeAction,
  ]),
  b.sequence([
    b.condition((ctx) => hasTarget(ctx)),
    moveAndAttack, // may return RUNNING
  ]),
  wanderAction,
]);
```

## ECS Integration

The behavior tree framework is designed to integrate cleanly with the ECS. Here's the standard pattern:

```typescript
import {
  World,
  createBehaviorTree,
  createBTState,
  NodeStatus,
  type BTState,
  type BTNode,
  type Position,
  type EntityId,
} from 'civ-engine';

// Component types
interface Colonist { name: string; state: string }
interface Health { hp: number; maxHp: number }

// Event and command types for your game
type Events = { unitDied: { entityId: EntityId } };
type Commands = Record<string, never>;

const world = new World<Events, Commands>({
  gridWidth: 32, gridHeight: 32, tps: 10,
});

world.registerComponent<Position>('position');
world.registerComponent<Colonist>('colonist');
world.registerComponent<Health>('health');
world.registerComponent<BTState>('btState');

// Context includes everything the AI needs
interface ColonistAI {
  entityId: EntityId;
  world: World<Events, Commands>;
  btState: BTState;
}

// Define the tree (ONE tree, shared by all colonists)
const colonistTree: BTNode<ColonistAI> = createBehaviorTree<ColonistAI>(
  (ctx) => ctx.btState,
  (b) =>
    b.selector([
      // Flee if hurt
      b.sequence([
        b.condition((ctx) => {
          const hp = ctx.world.getComponent<Health>(ctx.entityId, 'health');
          return hp !== undefined && hp.hp < 20;
        }),
        b.action((ctx) => {
          const c = ctx.world.getComponent<Colonist>(ctx.entityId, 'colonist')!;
          c.state = 'fleeing';
          return NodeStatus.SUCCESS;
        }),
      ]),
      // Default: idle
      b.action((ctx) => {
        const c = ctx.world.getComponent<Colonist>(ctx.entityId, 'colonist')!;
        c.state = 'idle';
        return NodeStatus.SUCCESS;
      }),
    ]),
);

// System that ticks all AI entities
function aiSystem(w: World<Events, Commands>): void {
  for (const id of w.query('colonist', 'btState', 'position')) {
    const btState = w.getComponent<BTState>(id, 'btState')!;
    colonistTree.tick({ entityId: id, world: w, btState });
  }
}

world.registerSystem(aiSystem);

// Spawn a colonist
const c = world.createEntity();
world.setPosition(c, { x: 5, y: 5 });
world.addComponent(c, 'colonist', { name: 'Alice', state: 'idle' });
world.addComponent(c, 'health', { hp: 100, maxHp: 100 });
world.addComponent(c, 'btState', createBTState(colonistTree));
```

## Shared Trees, Per-Entity State

The tree structure (nodes) is a blueprint. It's created once and shared across all entities that use the same AI. The **execution state** — which child a selector/sequence is currently running — lives in `BTState`, which is stored as a component on each entity.

This design means:
- **Memory efficient** — One tree object, thousands of entities
- **Serializable** — `BTState` is a plain `{ running: number[] }` that serializes with `world.serialize()`
- **Different trees per entity type** — Create different trees for different unit types, store the same `BTState` component

```typescript
// Worker AI
const workerTree = createBehaviorTree<WorkerContext>(getState, (b) => /* ... */);

// Soldier AI
const soldierTree = createBehaviorTree<SoldierContext>(getState, (b) => /* ... */);

// Spawn a worker
const worker = world.createEntity();
world.addComponent(worker, 'btState', createBTState(workerTree));

// Spawn a soldier
const soldier = world.createEntity();
world.addComponent(soldier, 'btState', createBTState(soldierTree));

// The AI system needs to know which tree to tick.
// Use a component to distinguish:
world.registerComponent<{ type: 'worker' | 'soldier' }>('unitType');

function aiSystem(w: World): void {
  for (const id of w.query('btState', 'unitType')) {
    const btState = w.getComponent<BTState>(id, 'btState')!;
    const unitType = w.getComponent<{ type: string }>(id, 'unitType')!;
    const ctx = { entityId: id, world: w, btState };

    if (unitType.type === 'worker') {
      workerTree.tick(ctx);
    } else {
      soldierTree.tick(ctx);
    }
  }
}
```

## Complex AI Patterns

### Priority-based decision making

Use nested selectors for multi-level priority:

```typescript
b.selector([
  // CRITICAL: survive
  b.sequence([
    b.condition((ctx) => isUnderAttack(ctx)),
    b.selector([
      b.sequence([b.condition((ctx) => canFight(ctx)), fightBack]),
      flee,
    ]),
  ]),
  // HIGH: eat if hungry
  b.sequence([
    b.condition((ctx) => isHungry(ctx)),
    b.selector([
      b.sequence([b.condition((ctx) => hasFood(ctx)), eat]),
      b.sequence([b.condition((ctx) => nearFood(ctx)), gatherAndEat]),
    ]),
  ]),
  // NORMAL: work
  b.sequence([b.condition((ctx) => hasTask(ctx)), doTask]),
  // LOW: wander
  wander,
]);
```

### Guard conditions

Use a sequence with a condition as the first child to guard an action:

```typescript
// Only attack if we have a weapon AND the target is in range
b.sequence([
  b.condition((ctx) => hasWeapon(ctx)),
  b.condition((ctx) => targetInRange(ctx)),
  attackAction,
]);
```

### Cooldowns

Track cooldowns in a component and check them in conditions:

```typescript
interface Cooldowns {
  lastAttack: number;
  attackInterval: number;
}

b.sequence([
  b.condition((ctx) => {
    const cd = ctx.world.getComponent<Cooldowns>(ctx.entityId, 'cooldowns')!;
    return ctx.world.tick - cd.lastAttack >= cd.attackInterval;
  }),
  b.action((ctx) => {
    // attack
    const cd = ctx.world.getComponent<Cooldowns>(ctx.entityId, 'cooldowns')!;
    cd.lastAttack = ctx.world.tick;
    return NodeStatus.SUCCESS;
  }),
]);
```

## Serialization

`BTState` is a plain object `{ running: number[] }` and is automatically included in `world.serialize()` when stored as a component. After deserialization, entities resume their behavior trees from exactly where they left off.

```typescript
// Save
const snapshot = world.serialize();

// Load
const restored = World.deserialize(snapshot, [aiSystem]);

// BTState components are restored, trees resume correctly
restored.step(); // AI picks up where it left off
```

The tree itself is not serialized — it's a structural blueprint defined in code. After deserialization, re-register the same systems that reference the same tree objects.
