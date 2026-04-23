export enum NodeStatus {
  SUCCESS,
  FAILURE,
  RUNNING,
}

export interface BTState {
  running: number[];
}

export abstract class BTNode<TContext> {
  readonly index: number;
  readonly nodeCount: number;

  constructor(index: number, nodeCount: number) {
    this.index = index;
    this.nodeCount = nodeCount;
  }

  abstract tick(context: TContext): NodeStatus;
}

class ActionNode<TContext> extends BTNode<TContext> {
  private fn: (ctx: TContext) => NodeStatus;

  constructor(index: number, fn: (ctx: TContext) => NodeStatus) {
    super(index, 1);
    this.fn = fn;
  }

  tick(context: TContext): NodeStatus {
    return this.fn(context);
  }
}

class ConditionNode<TContext> extends BTNode<TContext> {
  private fn: (ctx: TContext) => boolean;

  constructor(index: number, fn: (ctx: TContext) => boolean) {
    super(index, 1);
    this.fn = fn;
  }

  tick(context: TContext): NodeStatus {
    return this.fn(context) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
  }
}

class SelectorNode<TContext> extends BTNode<TContext> {
  readonly children: BTNode<TContext>[];
  private getState: (ctx: TContext) => BTState;

  constructor(
    index: number,
    nodeCount: number,
    children: BTNode<TContext>[],
    getState: (ctx: TContext) => BTState,
  ) {
    super(index, nodeCount);
    this.children = children;
    this.getState = getState;
  }

  tick(context: TContext): NodeStatus {
    const state = this.getState(context);
    const startIndex = Math.max(state.running[this.index], 0);

    for (let i = startIndex; i < this.children.length; i++) {
      const status = this.children[i].tick(context);
      if (status === NodeStatus.RUNNING) {
        state.running[this.index] = i;
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.SUCCESS) {
        state.running[this.index] = -1;
        return NodeStatus.SUCCESS;
      }
    }

    state.running[this.index] = -1;
    return NodeStatus.FAILURE;
  }
}

class SequenceNode<TContext> extends BTNode<TContext> {
  readonly children: BTNode<TContext>[];
  private getState: (ctx: TContext) => BTState;

  constructor(
    index: number,
    nodeCount: number,
    children: BTNode<TContext>[],
    getState: (ctx: TContext) => BTState,
  ) {
    super(index, nodeCount);
    this.children = children;
    this.getState = getState;
  }

  tick(context: TContext): NodeStatus {
    const state = this.getState(context);
    const startIndex = Math.max(state.running[this.index], 0);

    for (let i = startIndex; i < this.children.length; i++) {
      const status = this.children[i].tick(context);
      if (status === NodeStatus.RUNNING) {
        state.running[this.index] = i;
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.FAILURE) {
        state.running[this.index] = -1;
        return NodeStatus.FAILURE;
      }
    }

    state.running[this.index] = -1;
    return NodeStatus.SUCCESS;
  }
}

class ReactiveSelectorNode<TContext> extends BTNode<TContext> {
  readonly children: BTNode<TContext>[];

  constructor(index: number, nodeCount: number, children: BTNode<TContext>[]) {
    super(index, nodeCount);
    this.children = children;
  }

  tick(context: TContext): NodeStatus {
    for (let i = 0; i < this.children.length; i++) {
      const status = this.children[i].tick(context);
      if (status === NodeStatus.RUNNING) {
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.SUCCESS) {
        return NodeStatus.SUCCESS;
      }
    }
    return NodeStatus.FAILURE;
  }
}

class ReactiveSequenceNode<TContext> extends BTNode<TContext> {
  readonly children: BTNode<TContext>[];

  constructor(index: number, nodeCount: number, children: BTNode<TContext>[]) {
    super(index, nodeCount);
    this.children = children;
  }

  tick(context: TContext): NodeStatus {
    for (let i = 0; i < this.children.length; i++) {
      const status = this.children[i].tick(context);
      if (status === NodeStatus.RUNNING) {
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.FAILURE) {
        return NodeStatus.FAILURE;
      }
    }
    return NodeStatus.SUCCESS;
  }
}

export interface TreeBuilder<TContext> {
  action(fn: (ctx: TContext) => NodeStatus): BTNode<TContext>;
  condition(fn: (ctx: TContext) => boolean): BTNode<TContext>;
  selector(children: BTNode<TContext>[]): BTNode<TContext>;
  sequence(children: BTNode<TContext>[]): BTNode<TContext>;
  reactiveSelector(children: BTNode<TContext>[]): BTNode<TContext>;
  reactiveSequence(children: BTNode<TContext>[]): BTNode<TContext>;
}

export function createBTState(tree: BTNode<unknown>): BTState {
  return { running: new Array(tree.nodeCount).fill(-1) };
}

export function createBehaviorTree<TContext>(
  getState: (ctx: TContext) => BTState,
  define: (builder: TreeBuilder<TContext>) => BTNode<TContext>,
): BTNode<TContext> {
  let nextIndex = 0;

  const builder: TreeBuilder<TContext> = {
    action(fn) {
      return new ActionNode(nextIndex++, fn);
    },
    condition(fn) {
      return new ConditionNode(nextIndex++, fn);
    },
    selector(children) {
      const index = nextIndex++;
      const childCount = children.reduce((sum, c) => sum + c.nodeCount, 0);
      return new SelectorNode(index, 1 + childCount, children, getState);
    },
    sequence(children) {
      const index = nextIndex++;
      const childCount = children.reduce((sum, c) => sum + c.nodeCount, 0);
      return new SequenceNode(index, 1 + childCount, children, getState);
    },
    reactiveSelector(children) {
      const index = nextIndex++;
      const childCount = children.reduce((sum, c) => sum + c.nodeCount, 0);
      return new ReactiveSelectorNode(index, 1 + childCount, children);
    },
    reactiveSequence(children) {
      const index = nextIndex++;
      const childCount = children.reduce((sum, c) => sum + c.nodeCount, 0);
      return new ReactiveSequenceNode(index, 1 + childCount, children);
    },
  };

  return define(builder);
}
