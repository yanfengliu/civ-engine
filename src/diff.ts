import type { EntityId } from './types.js';

export interface ResourcePool {
  current: number;
  max: number;
}

export interface TickDiff {
  tick: number;
  entities: {
    created: EntityId[];
    destroyed: EntityId[];
  };
  components: Record<
    string,
    {
      set: Array<[EntityId, unknown]>;
      removed: EntityId[];
    }
  >;
  resources: Record<
    string,
    {
      set: Array<[EntityId, ResourcePool]>;
      removed: EntityId[];
    }
  >;
}
