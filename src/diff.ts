import type { EntityId } from './types.js';

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
}
