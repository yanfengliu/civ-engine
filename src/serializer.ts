import type { EntityId, WorldConfig } from './types.js';
import type { ResourceStoreState } from './resource-store.js';
import type { RandomState } from './random.js';

export interface WorldSnapshotV1 {
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

export interface WorldSnapshotV2 {
  version: 2;
  config: WorldConfig;
  tick: number;
  entities: {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  };
  components: Record<string, Array<[EntityId, unknown]>>;
  resources: ResourceStoreState;
}

export interface WorldSnapshotV3 {
  version: 3;
  config: WorldConfig;
  tick: number;
  entities: {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  };
  components: Record<string, Array<[EntityId, unknown]>>;
  resources: ResourceStoreState;
  rng: RandomState;
}

export type WorldSnapshot = WorldSnapshotV1 | WorldSnapshotV2 | WorldSnapshotV3;
