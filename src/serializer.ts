import type { EntityId, WorldConfig } from './types.js';

export interface WorldSnapshot {
  version: 1;
  config: WorldConfig;
  tick: number;
  entities: {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  };
  components: Record<string, Array<[EntityId, unknown]>>;
}
