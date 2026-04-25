import type { EntityId } from './types.js';

export class EntityManager {
  private generations: number[] = [];
  private alive: boolean[] = [];
  private freeList: number[] = [];
  private createdThisTick: EntityId[] = [];
  private destroyedThisTick: EntityId[] = [];
  private _count = 0;

  create(): EntityId {
    if (this.freeList.length > 0) {
      const id = this.freeList.pop()!;
      this.alive[id] = true;
      this._count++;
      this.createdThisTick.push(id);
      return id;
    }
    const id = this.generations.length;
    this.generations.push(0);
    this.alive.push(true);
    this._count++;
    this.createdThisTick.push(id);
    return id;
  }

  destroy(id: EntityId): void {
    if (!this.alive[id]) return;
    this.alive[id] = false;
    this._count--;
    this.generations[id]++;
    this.freeList.push(id);
    this.destroyedThisTick.push(id);
  }

  isAlive(id: EntityId): boolean {
    return id >= 0 && id < this.alive.length && this.alive[id];
  }

  *aliveEntities(): IterableIterator<EntityId> {
    for (let i = 0; i < this.alive.length; i++) {
      if (this.alive[i]) yield i;
    }
  }

  getGeneration(id: EntityId): number {
    return this.generations[id] ?? 0;
  }

  get count(): number {
    return this._count;
  }

  getState(): {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  } {
    return {
      generations: [...this.generations],
      alive: [...this.alive],
      freeList: [...this.freeList],
    };
  }

  getDirty(): { created: EntityId[]; destroyed: EntityId[] } {
    return {
      created: [...this.createdThisTick],
      destroyed: [...this.destroyedThisTick],
    };
  }

  clearDirty(): void {
    this.createdThisTick.length = 0;
    this.destroyedThisTick.length = 0;
  }

  static fromState(state: {
    generations: number[];
    alive: boolean[];
    freeList: number[];
  }): EntityManager {
    if (state.generations.length !== state.alive.length) {
      throw new Error(
        'EntityManager.fromState: generations.length must equal alive.length',
      );
    }
    const seen = new Set<number>();
    for (const id of state.freeList) {
      if (!Number.isInteger(id) || id < 0 || id >= state.alive.length) {
        throw new Error(
          `EntityManager.fromState: freeList contains invalid id ${id}`,
        );
      }
      if (state.alive[id]) {
        throw new Error(
          `EntityManager.fromState: freeList id ${id} points to an alive entity`,
        );
      }
      if (seen.has(id)) {
        throw new Error(
          `EntityManager.fromState: freeList contains duplicate id ${id}`,
        );
      }
      seen.add(id);
    }
    const em = new EntityManager();
    em.generations = [...state.generations];
    em.alive = [...state.alive];
    em.freeList = [...state.freeList];
    em._count = em.alive.reduce((count, alive) => count + (alive ? 1 : 0), 0);
    return em;
  }
}
