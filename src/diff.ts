import type { EntityId } from './types.js';
import type { ResourcePool } from './resource-store.js';

export type { ResourcePool };

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
