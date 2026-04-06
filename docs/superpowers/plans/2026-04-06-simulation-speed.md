# Simulation Speed Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add runtime simulation speed control (speed multiplier + pause/resume) to the game loop and expose via World.

**Architecture:** Add `speedMultiplier` and `paused` state to `GameLoop`, modify the real-time `loop()` to scale elapsed time by the multiplier and skip accumulation when paused. World proxies the new methods following the existing `start()`/`stop()`/`step()` pattern.

**Tech Stack:** TypeScript 5.7+ (strict mode, ESM, Node16 resolution), Vitest 3

**Spec:** `docs/superpowers/specs/2026-04-06-simulation-speed-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/game-loop.ts` | Modify | Add speedMultiplier, paused fields; setSpeed/getSpeed/pause/resume/isPaused methods; modify loop() |
| `src/world.ts` | Modify | Proxy speed control methods to GameLoop |
| `tests/game-loop.test.ts` | Modify | 10 new unit tests for speed control |
| `tests/world.test.ts` | Modify | 3 new proxy tests |
| `docs/ARCHITECTURE.md` | Modify | Note speed control on GameLoop |
| `docs/ROADMAP.md` | Modify | Replace "Turn / phase management" with "Simulation speed control", move to Built |

---

## Task 1: GameLoop speed control — tests and implementation

**Files:**
- Modify: `src/game-loop.ts`
- Modify: `tests/game-loop.test.ts`

- [ ] **Step 1: Write failing tests for speed control**

Append to `tests/game-loop.test.ts` inside the existing `describe('GameLoop', ...)` block, after the last existing test:

```typescript
  it('defaults to speed 1 and not paused', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(loop.getSpeed()).toBe(1);
    expect(loop.isPaused).toBe(false);
  });

  it('setSpeed updates getSpeed', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.setSpeed(2);
    expect(loop.getSpeed()).toBe(2);
    loop.setSpeed(0.5);
    expect(loop.getSpeed()).toBe(0.5);
  });

  it('setSpeed throws on zero', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(() => loop.setSpeed(0)).toThrow();
  });

  it('setSpeed throws on negative', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    expect(() => loop.setSpeed(-1)).toThrow();
  });

  it('pause sets isPaused true', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.pause();
    expect(loop.isPaused).toBe(true);
  });

  it('resume sets isPaused false', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.pause();
    loop.resume();
    expect(loop.isPaused).toBe(false);
  });

  it('pause when already paused is a no-op', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.pause();
    loop.pause(); // should not throw
    expect(loop.isPaused).toBe(true);
  });

  it('resume when not paused is a no-op', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.resume(); // should not throw
    expect(loop.isPaused).toBe(false);
  });

  it('step works while paused', () => {
    let count = 0;
    const loop = new GameLoop({ tps: 60, onTick: () => { count++; } });
    loop.pause();
    loop.step();
    expect(count).toBe(1);
    expect(loop.tick).toBe(1);
  });

  it('setSpeed while paused updates multiplier but stays paused', () => {
    const loop = new GameLoop({ tps: 60, onTick: () => {} });
    loop.pause();
    loop.setSpeed(4);
    expect(loop.getSpeed()).toBe(4);
    expect(loop.isPaused).toBe(true);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game-loop.test.ts`
Expected: FAIL — `loop.getSpeed is not a function`

- [ ] **Step 3: Implement speed control on GameLoop**

Replace the full content of `src/game-loop.ts` with:

```typescript
export class GameLoop {
  private _tick = 0;
  private readonly _tps: number;
  private readonly tickDuration: number;
  private readonly onTick: () => void;
  private readonly maxTicksPerFrame: number;
  private running = false;
  private lastTime = 0;
  private accumulated = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private speedMultiplier = 1;
  private paused = false;

  constructor(config: {
    tps: number;
    onTick: () => void;
    maxTicksPerFrame?: number;
  }) {
    this._tps = config.tps;
    this.tickDuration = 1000 / config.tps;
    this.onTick = config.onTick;
    this.maxTicksPerFrame = config.maxTicksPerFrame ?? 4;
  }

  step(): void {
    this.onTick();
    this._tick++;
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.accumulated = 0;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  get tick(): number {
    return this._tick;
  }

  get tps(): number {
    return this._tps;
  }

  setTick(value: number): void {
    this._tick = value;
  }

  setSpeed(multiplier: number): void {
    if (multiplier <= 0) {
      throw new Error('Speed multiplier must be positive');
    }
    this.speedMultiplier = multiplier;
  }

  getSpeed(): number {
    return this.speedMultiplier;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    if (this.paused) {
      this.paused = false;
      this.lastTime = performance.now();
    }
  }

  get isPaused(): boolean {
    return this.paused;
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();

    if (this.paused) {
      this.lastTime = now;
      this.timer = setTimeout(() => this.loop(), 1);
      return;
    }

    this.accumulated += (now - this.lastTime) * this.speedMultiplier;
    this.lastTime = now;

    let ticksThisFrame = 0;
    while (
      this.accumulated >= this.tickDuration &&
      ticksThisFrame < this.maxTicksPerFrame
    ) {
      this.step();
      this.accumulated -= this.tickDuration;
      ticksThisFrame++;
    }

    if (ticksThisFrame >= this.maxTicksPerFrame) {
      this.accumulated = 0;
    }

    this.timer = setTimeout(() => this.loop(), 1);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/game-loop.test.ts`
Expected: all 14 tests PASS (4 existing + 10 new)

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/game-loop.ts tests/game-loop.test.ts`
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 6: Commit**

```
git add src/game-loop.ts tests/game-loop.test.ts
git commit -m "feat: add simulation speed control to GameLoop"
```

---

## Task 2: World proxy methods — tests and implementation

**Files:**
- Modify: `src/world.ts`
- Modify: `tests/world.test.ts`

- [ ] **Step 1: Write failing tests for World speed control proxy**

Append to `tests/world.test.ts` inside the existing `describe('World', ...)` block, after the last existing test:

```typescript
  it('setSpeed and getSpeed proxy to game loop', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(world.getSpeed()).toBe(1);
    world.setSpeed(3);
    expect(world.getSpeed()).toBe(3);
  });

  it('pause, resume, and isPaused proxy to game loop', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    expect(world.isPaused).toBe(false);
    world.pause();
    expect(world.isPaused).toBe(true);
    world.resume();
    expect(world.isPaused).toBe(false);
  });

  it('step works while paused', () => {
    const world = new World({ gridWidth: 10, gridHeight: 10, tps: 60 });
    world.pause();
    world.step();
    expect(world.tick).toBe(1);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/world.test.ts`
Expected: FAIL — `world.getSpeed is not a function`

- [ ] **Step 3: Add proxy methods to World**

In `src/world.ts`, add these methods after the existing `stop()` method (around line 136):

```typescript
  setSpeed(multiplier: number): void {
    this.gameLoop.setSpeed(multiplier);
  }

  getSpeed(): number {
    return this.gameLoop.getSpeed();
  }

  pause(): void {
    this.gameLoop.pause();
  }

  resume(): void {
    this.gameLoop.resume();
  }

  get isPaused(): boolean {
    return this.gameLoop.isPaused;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/world.test.ts`
Expected: all tests PASS (31 existing + 3 new = 34)

- [ ] **Step 5: Run lint and typecheck**

Run: `npx eslint src/world.ts tests/world.test.ts`
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 6: Commit**

```
git add src/world.ts tests/world.test.ts
git commit -m "feat: add speed control proxy methods to World"
```

---

## Task 3: Full test suite pass + docs update

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass (183 existing + 13 new = 196 total)

- [ ] **Step 2: Run lint and typecheck on entire project**

Run: `npx eslint .`
Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Update ARCHITECTURE.md**

Update the GameLoop row in the Component Map table. Change:

```
| GameLoop       | `src/game-loop.ts`       | Fixed-timestep loop (60 TPS default), step() for testing, start()/stop() for real-time |
```

To:

```
| GameLoop       | `src/game-loop.ts`       | Fixed-timestep loop, step() for testing, start()/stop() for real-time, speed multiplier, pause/resume |
```

Add to the Drift Log table at the bottom:

```
| 2026-04-06 | Added simulation speed control       | Speed multiplier and pause/resume on GameLoop, proxied via World                             |
```

- [ ] **Step 4: Update ROADMAP.md**

Remove the "Turn / phase management" row from "Planned — Engine Primitives". Add this row to the bottom of the "Built" table:

```
| Simulation speed control | `game-loop.ts`           | 2026-04-06 | Speed multiplier, pause/resume, step() ignores both for deterministic testing |
```

After removing "Turn / phase management", the "Planned — Engine Primitives" section will be empty. Replace its content with:

```
None currently.
```

- [ ] **Step 5: Commit**

```
git add docs/ARCHITECTURE.md docs/ROADMAP.md
git commit -m "docs: update architecture and roadmap for simulation speed control"
```
