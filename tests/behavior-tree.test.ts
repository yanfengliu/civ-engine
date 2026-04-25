import { describe, it, expect } from 'vitest';
import {
  NodeStatus,
  createBehaviorTree,
  createBTState,
  clearRunningState,
  BTNode,
} from '../src/behavior-tree.js';

interface TestContext {
  state: { running: number[] };
  value: number;
}

const getState = (ctx: TestContext) => ctx.state;

describe('BehaviorTree', () => {
  function makeCtx(value = 0): TestContext {
    return { state: { running: [] }, value };
  }

  describe('Action', () => {
    it('returns the status from its function', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.action(() => NodeStatus.SUCCESS),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('can return RUNNING', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.action(() => NodeStatus.RUNNING),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
    });

    it('can return FAILURE', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.action(() => NodeStatus.FAILURE),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
    });
  });

  describe('Condition', () => {
    it('returns SUCCESS when predicate is true', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.condition((ctx) => ctx.value > 0),
      );
      const ctx = makeCtx(5);
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('returns FAILURE when predicate is false', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.condition((ctx) => ctx.value > 0),
      );
      const ctx = makeCtx(0);
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
    });
  });

  describe('Selector', () => {
    it('returns SUCCESS on first child success', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.selector([
          b.action(() => NodeStatus.SUCCESS),
          b.action(() => NodeStatus.FAILURE),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('skips failed children and returns next success', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.selector([
          b.action(() => NodeStatus.FAILURE),
          b.action(() => NodeStatus.SUCCESS),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('returns FAILURE when all children fail', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.selector([
          b.action(() => NodeStatus.FAILURE),
          b.action(() => NodeStatus.FAILURE),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
    });

    it('returns RUNNING and resumes from running child', () => {
      let callCount = 0;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.selector([
          b.action(() => NodeStatus.FAILURE),
          b.action(() => {
            callCount++;
            return callCount === 1 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
          }),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('resets running state after success', () => {
      let callCount = 0;
      const ticked: number[] = [];
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.selector([
          b.action(() => {
            ticked.push(0);
            return callCount > 0 ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
          }),
          b.action(() => {
            ticked.push(1);
            callCount++;
            return NodeStatus.SUCCESS;
          }),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      tree.tick(ctx);
      tree.tick(ctx);
      expect(ticked).toEqual([0, 1, 0]);
    });
  });

  describe('Sequence', () => {
    it('returns SUCCESS when all children succeed', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.sequence([
          b.action(() => NodeStatus.SUCCESS),
          b.action(() => NodeStatus.SUCCESS),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('returns FAILURE on first child failure', () => {
      const ticked: number[] = [];
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.sequence([
          b.action(() => {
            ticked.push(0);
            return NodeStatus.SUCCESS;
          }),
          b.action(() => {
            ticked.push(1);
            return NodeStatus.FAILURE;
          }),
          b.action(() => {
            ticked.push(2);
            return NodeStatus.SUCCESS;
          }),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
      expect(ticked).toEqual([0, 1]);
    });

    it('returns RUNNING and resumes from running child', () => {
      let callCount = 0;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.sequence([
          b.action(() => NodeStatus.SUCCESS),
          b.action(() => {
            callCount++;
            return callCount === 1 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
          }),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('resets running state after completion', () => {
      let tick = 0;
      const ticked: number[] = [];
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.sequence([
          b.action(() => {
            ticked.push(0);
            return NodeStatus.SUCCESS;
          }),
          b.action(() => {
            ticked.push(1);
            tick++;
            return tick === 1 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
          }),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      tree.tick(ctx); // child 0 OK, child 1 RUNNING
      tree.tick(ctx); // resumes child 1, SUCCESS
      tree.tick(ctx); // fresh start: child 0, child 1
      expect(ticked).toEqual([0, 1, 1, 0, 1]);
    });
  });

  describe('Reactive Selector', () => {
    it('re-evaluates higher-priority children each tick even when later child was RUNNING', () => {
      let highPrioritySucceeds = false;
      let lowPriorityTicks = 0;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSelector([
          b.condition(() => highPrioritySucceeds),
          b.action(() => {
            lowPriorityTicks++;
            return NodeStatus.RUNNING;
          }),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(lowPriorityTicks).toBe(1);

      highPrioritySucceeds = true;
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
      expect(lowPriorityTicks).toBe(1);
    });

    it('does not write to state.running[index] when returning RUNNING', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSelector([b.action(() => NodeStatus.RUNNING)]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      tree.tick(ctx);
      expect(ctx.state.running[tree.index]).toBe(-1);
    });

    it('returns SUCCESS on first child success', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSelector([
          b.action(() => NodeStatus.SUCCESS),
          b.action(() => NodeStatus.FAILURE),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('returns FAILURE when all children fail', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSelector([
          b.action(() => NodeStatus.FAILURE),
          b.action(() => NodeStatus.FAILURE),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
    });

    it('does not suppress nested selector resume behavior', () => {
      let innerTicks = 0;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSelector([
          b.selector([
            b.action(() => NodeStatus.FAILURE),
            b.action(() => {
              innerTicks++;
              return innerTicks === 1 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
            }),
          ]),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
      expect(innerTicks).toBe(2);
    });
  });

  describe('Reactive Sequence', () => {
    it('restarts from child 0 when a later child was RUNNING', () => {
      const ticked: number[] = [];
      let childTwoCalls = 0;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSequence([
          b.action(() => {
            ticked.push(0);
            return NodeStatus.SUCCESS;
          }),
          b.action(() => {
            ticked.push(1);
            childTwoCalls++;
            return childTwoCalls === 1 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
          }),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
      expect(ticked).toEqual([0, 1, 0, 1]);
    });

    it('does not write to state.running[index] when returning RUNNING', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSequence([b.action(() => NodeStatus.RUNNING)]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      tree.tick(ctx);
      expect(ctx.state.running[tree.index]).toBe(-1);
    });

    it('returns SUCCESS when all children succeed', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSequence([
          b.action(() => NodeStatus.SUCCESS),
          b.action(() => NodeStatus.SUCCESS),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('returns FAILURE on first child failure', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSequence([
          b.action(() => NodeStatus.FAILURE),
          b.action(() => NodeStatus.SUCCESS),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
    });

    it('condition + reactiveSequence gives guard-then-body re-check each tick', () => {
      let guardTrue = true;
      let bodyTicks = 0;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSequence([
          b.condition(() => guardTrue),
          b.action(() => {
            bodyTicks++;
            return NodeStatus.RUNNING;
          }),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(bodyTicks).toBe(1);

      guardTrue = false;
      expect(tree.tick(ctx)).toBe(NodeStatus.FAILURE);
      expect(bodyTicks).toBe(1);
    });
  });

  describe('Reactive preemption clears stateful subtree (H5)', () => {
    it('reactiveSelector preempting a running Sequence resets its progress', () => {
      const events: string[] = [];
      let highPriorityActive = false;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.reactiveSelector([
          // High-priority guarded sequence — only triggers when active
          b.sequence([
            b.condition(() => highPriorityActive),
            b.action(() => {
              events.push('hi');
              return NodeStatus.SUCCESS;
            }),
          ]),
          // Lower-priority running sequence
          b.sequence([
            b.action(() => {
              events.push('a');
              return NodeStatus.SUCCESS;
            }),
            b.action(() => {
              events.push('b');
              return NodeStatus.RUNNING;
            }),
            b.action(() => {
              events.push('c');
              return NodeStatus.SUCCESS;
            }),
          ]),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      // Tick 1: low-priority runs, gets stuck on b
      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(events).toEqual(['a', 'b']);

      // Tick 2: high-priority becomes active and preempts
      highPriorityActive = true;
      events.length = 0;
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
      expect(events).toEqual(['hi']);

      // Tick 3: high-priority deactivates; low-priority should restart from 'a'
      // (NOT resume from 'b' which it was running on tick 1)
      highPriorityActive = false;
      events.length = 0;
      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(events).toEqual(['a', 'b']);
    });
  });

  describe('clearRunningState', () => {
    it('resets every running index to -1 when called without a node', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.selector([
          b.sequence([
            b.action(() => NodeStatus.SUCCESS),
            b.action(() => NodeStatus.RUNNING),
          ]),
          b.action(() => NodeStatus.SUCCESS),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      tree.tick(ctx);
      expect(ctx.state.running.some((v) => v !== -1)).toBe(true);

      clearRunningState(ctx.state);
      expect(ctx.state.running.every((v) => v === -1)).toBe(true);
    });

    it('resets only the given subtree slice when a node is provided', () => {
      let subtreeRoot!: BTNode<TestContext>;
      const tree = createBehaviorTree<TestContext>(getState, (b) => {
        subtreeRoot = b.sequence([
          b.action(() => NodeStatus.SUCCESS),
          b.action(() => NodeStatus.RUNNING),
        ]);
        return b.selector([subtreeRoot, b.action(() => NodeStatus.SUCCESS)]);
      });
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      tree.tick(ctx);
      ctx.state.running[tree.index] = 0;

      clearRunningState(ctx.state, subtreeRoot);

      for (
        let i = subtreeRoot.index;
        i < subtreeRoot.index + subtreeRoot.nodeCount;
        i++
      ) {
        expect(ctx.state.running[i]).toBe(-1);
      }
      expect(ctx.state.running[tree.index]).toBe(0);
    });
  });

  describe('nested trees', () => {
    it('selector containing sequences', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.selector([
          b.sequence([
            b.condition((ctx) => ctx.value > 10),
            b.action(() => NodeStatus.SUCCESS),
          ]),
          b.action(() => NodeStatus.SUCCESS),
        ]),
      );
      const ctx = makeCtx(0);
      ctx.state = createBTState(tree);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });

    it('tracks correct nodeCount through nesting', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.selector([
          b.sequence([
            b.condition(() => true),
            b.action(() => NodeStatus.SUCCESS),
          ]),
          b.action(() => NodeStatus.FAILURE),
        ]),
      );
      expect(tree.nodeCount).toBe(5);
    });

    it('createBTState allocates correct array size', () => {
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.selector([
          b.sequence([
            b.action(() => NodeStatus.SUCCESS),
            b.action(() => NodeStatus.SUCCESS),
          ]),
          b.action(() => NodeStatus.FAILURE),
        ]),
      );
      const state = createBTState(tree);
      expect(state.running.length).toBe(tree.nodeCount);
      expect(state.running.every((v) => v === -1)).toBe(true);
    });

    it('RUNNING state in nested child resumes correctly', () => {
      let innerTicks = 0;
      const tree = createBehaviorTree<TestContext>(getState, (b) =>
        b.selector([
          b.sequence([
            b.action(() => NodeStatus.SUCCESS),
            b.action(() => {
              innerTicks++;
              return innerTicks === 1
                ? NodeStatus.RUNNING
                : NodeStatus.SUCCESS;
            }),
          ]),
        ]),
      );
      const ctx = makeCtx();
      ctx.state = createBTState(tree);

      expect(tree.tick(ctx)).toBe(NodeStatus.RUNNING);
      expect(tree.tick(ctx)).toBe(NodeStatus.SUCCESS);
    });
  });
});
