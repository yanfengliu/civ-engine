export enum NodeStatus {
  SUCCESS,
  FAILURE,
  RUNNING,
}

export interface BTState {
  running: number[];
}

export abstract class BTNode<TContext> {
  index: number;
  nodeCount: number;
  readonly children: ReadonlyArray<BTNode<TContext>>;

  constructor(
    index: number,
    nodeCount: number,
    children: ReadonlyArray<BTNode<TContext>> = [],
  ) {
    this.index = index;
    this.nodeCount = nodeCount;
    this.children = children;
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
  private getState: (ctx: TContext) => BTState;

  constructor(
    index: number,
    nodeCount: number,
    children: BTNode<TContext>[],
    getState: (ctx: TContext) => BTState,
  ) {
    super(index, nodeCount, children);
    this.getState = getState;
  }

  tick(context: TContext): NodeStatus {
    const state = this.getState(context);
    const startIndex = Math.max(state.running[this.index] ?? -1, 0);

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
  private getState: (ctx: TContext) => BTState;

  constructor(
    index: number,
    nodeCount: number,
    children: BTNode<TContext>[],
    getState: (ctx: TContext) => BTState,
  ) {
    super(index, nodeCount, children);
    this.getState = getState;
  }

  tick(context: TContext): NodeStatus {
    const state = this.getState(context);
    const startIndex = Math.max(state.running[this.index] ?? -1, 0);

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
  private getState: (ctx: TContext) => BTState;

  constructor(
    index: number,
    nodeCount: number,
    children: BTNode<TContext>[],
    getState: (ctx: TContext) => BTState,
  ) {
    super(index, nodeCount, children);
    this.getState = getState;
  }

  tick(context: TContext): NodeStatus {
    const state = this.getState(context);
    for (let i = 0; i < this.children.length; i++) {
      const status = this.children[i].tick(context);
      if (status === NodeStatus.RUNNING) {
        clearReactivePreempted(state, this.children, i + 1);
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.SUCCESS) {
        clearReactivePreempted(state, this.children, i + 1);
        return NodeStatus.SUCCESS;
      }
    }
    return NodeStatus.FAILURE;
  }
}

class ReactiveSequenceNode<TContext> extends BTNode<TContext> {
  private getState: (ctx: TContext) => BTState;

  constructor(
    index: number,
    nodeCount: number,
    children: BTNode<TContext>[],
    getState: (ctx: TContext) => BTState,
  ) {
    super(index, nodeCount, children);
    this.getState = getState;
  }

  tick(context: TContext): NodeStatus {
    const state = this.getState(context);
    for (let i = 0; i < this.children.length; i++) {
      const status = this.children[i].tick(context);
      if (status === NodeStatus.RUNNING) {
        clearReactivePreempted(state, this.children, i + 1);
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.FAILURE) {
        clearReactivePreempted(state, this.children, i + 1);
        return NodeStatus.FAILURE;
      }
    }
    return NodeStatus.SUCCESS;
  }
}

function clearReactivePreempted<TContext>(
  state: BTState,
  children: ReadonlyArray<BTNode<TContext>>,
  startIndex: number,
): void {
  for (let j = startIndex; j < children.length; j++) {
    const child = children[j];
    const end = child.index + child.nodeCount;
    for (let k = child.index; k < end; k++) {
      state.running[k] = -1;
    }
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

/**
 * Re-indexes the tree in depth-first pre-order so that every subtree
 * occupies a contiguous slice [node.index, node.index + node.nodeCount).
 * Returns the total node count.
 */
function reindexPreOrder(node: BTNode<unknown>, nextIndex: number): number {
  node.index = nextIndex;
  let count = 1;
  for (const child of node.children) {
    const childCount = reindexPreOrder(child, nextIndex + count);
    count += childCount;
  }
  node.nodeCount = count;
  return count;
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
      return new ReactiveSelectorNode(index, 1 + childCount, children, getState);
    },
    reactiveSequence(children) {
      const index = nextIndex++;
      const childCount = children.reduce((sum, c) => sum + c.nodeCount, 0);
      return new ReactiveSequenceNode(index, 1 + childCount, children, getState);
    },
  };

  const root = define(builder);
  reindexPreOrder(root, 0);
  return root;
}

export function clearRunningState(
  state: BTState,
  node?: BTNode<unknown>,
): void {
  if (node === undefined) {
    for (let i = 0; i < state.running.length; i++) {
      state.running[i] = -1;
    }
    return;
  }
  const end = node.index + node.nodeCount;
  for (let i = node.index; i < end; i++) {
    state.running[i] = -1;
  }
}
