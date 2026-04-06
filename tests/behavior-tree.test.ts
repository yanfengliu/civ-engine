import { describe, it, expect } from 'vitest';
import {
  NodeStatus,
  createBehaviorTree,
  createBTState,
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
});
