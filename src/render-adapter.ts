import { assertJsonCompatible } from './json.js';
import type { TickDiff } from './diff.js';
import type { EntityId, EntityRef } from './types.js';
import type { World } from './world.js';

export interface RenderEntity<TView = unknown> {
  ref: EntityRef;
  view: TView;
}

export interface RenderSnapshot<
  TView = unknown,
  TFrame = unknown,
> {
  tick: number;
  entities: Array<RenderEntity<TView>>;
  frame: TFrame | null;
}

export interface RenderDiff<
  TView = unknown,
  TFrame = unknown,
> {
  tick: number;
  created: Array<RenderEntity<TView>>;
  updated: Array<RenderEntity<TView>>;
  destroyed: EntityRef[];
  frame: TFrame | null;
}

export interface RenderEntityChange {
  id: EntityId;
  created: boolean;
  destroyed: boolean;
  componentKeys: string[];
  resourceKeys: string[];
  previousRef: EntityRef | null;
  currentRef: EntityRef | null;
}

export interface RenderProjector<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TView = unknown,
  TFrame = unknown,
> {
  projectEntity(
    ref: EntityRef,
    world: World<TEventMap, TCommandMap>,
    change: RenderEntityChange | null,
  ): TView | null;
  projectFrame?(
    world: World<TEventMap, TCommandMap>,
    diff: TickDiff | null,
  ): TFrame | null;
  shouldProjectChange?(change: RenderEntityChange): boolean;
}

export type RenderServerMessage<
  TView = unknown,
  TFrame = unknown,
  TDebug = unknown,
> =
  | {
      type: 'renderSnapshot';
      data: {
        render: RenderSnapshot<TView, TFrame>;
        debug: TDebug | null;
      };
    }
  | {
      type: 'renderTick';
      data: {
        render: RenderDiff<TView, TFrame>;
        debug: TDebug | null;
      };
    };

export interface RenderDebugCapture<
  TDebug = unknown,
> {
  capture(): TDebug | null;
}

export class RenderAdapter<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
  TView = unknown,
  TFrame = unknown,
  TDebug = unknown,
> {
  private readonly world: World<TEventMap, TCommandMap>;
  private readonly projector: RenderProjector<
    TEventMap,
    TCommandMap,
    TView,
    TFrame
  >;
  private readonly send: (
    message: RenderServerMessage<TView, TFrame, TDebug>,
  ) => void;
  private readonly onError?: (error: unknown) => void;
  private readonly debug?: RenderDebugCapture<TDebug>;
  private readonly knownRefs = new Map<EntityId, EntityRef>();
  private readonly renderedRefs = new Map<EntityId, EntityRef>();
  private connected = false;
  private diffListener: ((diff: TickDiff) => void) | null = null;

  constructor(config: {
    world: World<TEventMap, TCommandMap>;
    projector: RenderProjector<TEventMap, TCommandMap, TView, TFrame>;
    send: (message: RenderServerMessage<TView, TFrame, TDebug>) => void;
    onError?: (error: unknown) => void;
    debug?: RenderDebugCapture<TDebug>;
  }) {
    this.world = config.world;
    this.projector = config.projector;
    this.send = config.send;
    this.onError = config.onError;
    this.debug = config.debug;
  }

  connect(): void {
    if (this.connected) return;
    this.connected = true;

    if (
      !this.safeSend({
        type: 'renderSnapshot',
        data: {
          render: this.buildSnapshot(),
          debug: this.captureDebug(),
        },
      })
    ) {
      return;
    }

    this.diffListener = (diff: TickDiff) => {
      this.safeSend({
        type: 'renderTick',
        data: {
          render: this.buildDiff(diff),
          debug: this.captureDebug(),
        },
      });
    };
    this.world.onDiff(this.diffListener);
  }

  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    if (this.diffListener) {
      this.world.offDiff(this.diffListener);
      this.diffListener = null;
    }
  }

  private buildSnapshot(): RenderSnapshot<TView, TFrame> {
    const snapshot = this.world.serialize();
    this.knownRefs.clear();
    this.renderedRefs.clear();

    const entities: Array<RenderEntity<TView>> = [];
    for (let id = 0; id < snapshot.entities.alive.length; id++) {
      if (!snapshot.entities.alive[id]) continue;
      const ref = {
        id,
        generation: snapshot.entities.generations[id] ?? 0,
      };
      this.knownRefs.set(id, ref);
      const projected = this.projector.projectEntity(ref, this.world, null);
      if (projected === null) continue;
      assertJsonCompatible(projected, `render entity ${id}`);
      entities.push({ ref, view: projected });
      this.renderedRefs.set(id, ref);
    }

    const frame = this.captureFrame(null);
    return {
      tick: snapshot.tick,
      entities,
      frame,
    };
  }

  private buildDiff(diff: TickDiff): RenderDiff<TView, TFrame> {
    const previousKnown = new Map(this.knownRefs);
    const previousRendered = new Map(this.renderedRefs);
    const changes = collectEntityChanges(diff, previousKnown, this.world);
    const created: Array<RenderEntity<TView>> = [];
    const updated: Array<RenderEntity<TView>> = [];
    const destroyed: EntityRef[] = [];
    const destroyedKeys = new Set<string>();

    const pushDestroyed = (ref: EntityRef | null): void => {
      if (!ref) return;
      const key = refKey(ref);
      if (destroyedKeys.has(key)) return;
      destroyed.push(ref);
      destroyedKeys.add(key);
    };

    for (const change of changes) {
      const previousRenderedRef = previousRendered.get(change.id) ?? null;
      const currentRef = change.currentRef;

      if (currentRef === null) {
        this.knownRefs.delete(change.id);
        this.renderedRefs.delete(change.id);
        pushDestroyed(previousRenderedRef);
        continue;
      }

      this.knownRefs.set(change.id, currentRef);

      const shouldProjectChange = this.projector.shouldProjectChange?.(change) ?? true;
      if (
        !change.created &&
        !change.destroyed &&
        !shouldProjectChange
      ) {
        continue;
      }

      const projected = this.projector.projectEntity(currentRef, this.world, change);
      if (projected === null) {
        this.renderedRefs.delete(change.id);
        pushDestroyed(previousRenderedRef);
        continue;
      }

      assertJsonCompatible(projected, `render entity ${change.id}`);

      if (
        previousRenderedRef === null ||
        previousRenderedRef.generation !== currentRef.generation
      ) {
        pushDestroyed(previousRenderedRef);
        created.push({ ref: currentRef, view: projected });
      } else if (change.created) {
        created.push({ ref: currentRef, view: projected });
      } else {
        updated.push({ ref: currentRef, view: projected });
      }

      this.renderedRefs.set(change.id, currentRef);
    }

    return {
      tick: diff.tick,
      created,
      updated,
      destroyed,
      frame: this.captureFrame(diff),
    };
  }

  private captureFrame(diff: TickDiff | null): TFrame | null {
    const frame = this.projector.projectFrame?.(this.world, diff) ?? null;
    if (frame !== null) {
      assertJsonCompatible(frame, 'render frame');
    }
    return frame;
  }

  private captureDebug(): TDebug | null {
    const debug = this.debug?.capture() ?? null;
    if (debug !== null) {
      assertJsonCompatible(debug, 'render debug payload');
    }
    return debug;
  }

  private safeSend(message: RenderServerMessage<TView, TFrame, TDebug>): boolean {
    try {
      this.send(message);
      return true;
    } catch (error) {
      this.onError?.(error);
      this.disconnect();
      return false;
    }
  }
}

function collectEntityChanges<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
>(
  diff: TickDiff,
  previousKnown: Map<EntityId, EntityRef>,
  world: World<TEventMap, TCommandMap>,
): RenderEntityChange[] {
  const byId = new Map<EntityId, RenderEntityChange>();

  const ensure = (id: EntityId): RenderEntityChange => {
    let change = byId.get(id);
    if (!change) {
      change = {
        id,
        created: false,
        destroyed: false,
        componentKeys: [],
        resourceKeys: [],
        previousRef: previousKnown.get(id) ?? null,
        currentRef: null,
      };
      byId.set(id, change);
    }
    return change;
  };

  for (const id of diff.entities.created) {
    ensure(id).created = true;
  }

  for (const id of diff.entities.destroyed) {
    ensure(id).destroyed = true;
  }

  for (const [key, changes] of Object.entries(diff.components)) {
    for (const [id] of changes.set) {
      ensure(id).componentKeys.push(key);
    }
    for (const id of changes.removed) {
      ensure(id).componentKeys.push(key);
    }
  }

  for (const [key, changes] of Object.entries(diff.resources)) {
    for (const [id] of changes.set) {
      ensure(id).resourceKeys.push(key);
    }
    for (const id of changes.removed) {
      ensure(id).resourceKeys.push(key);
    }
  }

  return [...byId.values()]
    .sort((a, b) => a.id - b.id)
    .map((change) => ({
      ...change,
      componentKeys: uniqueSorted(change.componentKeys),
      resourceKeys: uniqueSorted(change.resourceKeys),
      currentRef: world.getEntityRef(change.id),
    }));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function refKey(ref: EntityRef): string {
  return `${ref.id}:${ref.generation}`;
}
