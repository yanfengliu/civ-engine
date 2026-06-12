import type { EntityId, WorldConfig } from './types.js';
import type { TickFailure } from './world-types.js';
import type { ResourceStoreState } from './resource-store.js';
import type { RandomState } from './random.js';
import type { ComponentStoreOptions } from './component-store.js';

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

export interface WorldSnapshotV4 {
  version: 4;
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
  state: Record<string, unknown>;
  tags: Record<number, string[]>;
  metadata: Record<number, Record<string, string | number>>;
}

export interface WorldSnapshotV5 {
  version: 5;
  config: WorldConfig;
  tick: number;
  entities: {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  };
  components: Record<string, Array<[EntityId, unknown]>>;
  componentOptions?: Record<string, ComponentStoreOptions>;
  resources: ResourceStoreState;
  rng: RandomState;
  state: Record<string, unknown>;
  tags: Record<number, string[]>;
  metadata: Record<number, Record<string, string | number>>;
}

/** v6 (1.0): v5 plus terminal poison state, carried for INSPECTION — 
 * `deserialize`/`applySnapshot` keep clearing live poison unless the
 * `restorePoison` option opts in (1.0 decision 2; ADR 48). `config.strict`
 * is always written explicitly in v6 (the strict-default compatibility
 * clause: absent strict in <= v5 loads as false). */
export interface WorldSnapshotV6 extends Omit<WorldSnapshotV5, 'version'> {
  version: 6;
  poisoned: TickFailure | null;
}

export type WorldSnapshot =
  | WorldSnapshotV1
  | WorldSnapshotV2
  | WorldSnapshotV3
  | WorldSnapshotV4
  | WorldSnapshotV5
  | WorldSnapshotV6;
