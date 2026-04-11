export interface RandomState {
  state: number;
}

const DEFAULT_SEED = 0x6d2b79f5;
const UINT32_SIZE = 0x1_0000_0000;

export class DeterministicRandom {
  private state: number;

  constructor(seed: number | string = DEFAULT_SEED) {
    this.state = seedToUint32(seed);
  }

  random(): number {
    return this.nextUint32() / UINT32_SIZE;
  }

  nextUint32(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  }

  getState(): RandomState {
    return { state: this.state };
  }

  static fromState(state: RandomState): DeterministicRandom {
    if (
      !Number.isInteger(state.state) ||
      state.state < 0 ||
      state.state > 0xffff_ffff
    ) {
      throw new RangeError('Random state must be a uint32 integer');
    }
    const random = new DeterministicRandom(0);
    random.state = state.state >>> 0;
    return random;
  }
}

function seedToUint32(seed: number | string): number {
  if (typeof seed === 'number') {
    if (!Number.isFinite(seed)) {
      throw new RangeError('Random seed must be finite');
    }
    return Math.trunc(seed) >>> 0;
  }

  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
