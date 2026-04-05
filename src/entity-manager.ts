import type { EntityId } from './types.js';

export class EntityManager {
  private generations: number[] = [];
  private alive: boolean[] = [];
  private freeList: number[] = [];

  create(): EntityId {
    if (this.freeList.length > 0) {
      const id = this.freeList.pop()!;
      this.alive[id] = true;
      return id;
    }
    const id = this.generations.length;
    this.generations.push(0);
    this.alive.push(true);
    return id;
  }

  destroy(id: EntityId): void {
    if (!this.alive[id]) return;
    this.alive[id] = false;
    this.generations[id]++;
    this.freeList.push(id);
  }

  isAlive(id: EntityId): boolean {
    return id >= 0 && id < this.alive.length && this.alive[id];
  }

  getGeneration(id: EntityId): number {
    return this.generations[id] ?? 0;
  }
}
