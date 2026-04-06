export type EntityId = number;

export interface Position {
  x: number;
  y: number;
}

export interface WorldConfig {
  gridWidth: number;
  gridHeight: number;
  tps: number;
  positionKey?: string;
  maxTicksPerFrame?: number;
}
