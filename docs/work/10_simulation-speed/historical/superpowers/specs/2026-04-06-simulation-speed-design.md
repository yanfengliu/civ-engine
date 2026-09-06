# Simulation Speed Control Design

**Date:** 2026-04-06
**Status:** Approved

## Overview

Add runtime simulation speed control to civ-engine. A speed multiplier scales how fast ticks accumulate in the real-time loop. A separate pause/resume mechanism freezes the simulation while preserving the current speed setting. `step()` is unaffected by both pause and speed — it always executes exactly one tick for deterministic testing.

## Module

| File | Action | Responsibility |
|---|---|---|
| `src/game-loop.ts` | Modify | Add speedMultiplier, paused state, pause/resume/setSpeed/getSpeed methods |
| `src/world.ts` | Modify | Proxy speed control methods to GameLoop |

## API

### World Methods (new)

```typescript
world.setSpeed(multiplier: number): void  // any positive float; throws on <= 0
world.getSpeed(): number                  // current multiplier (default 1)
world.pause(): void                       // freezes simulation, preserves speed
world.resume(): void                      // unfreezes at current speed
world.isPaused: boolean                   // readonly getter
```

### GameLoop Methods (new)

```typescript
gameLoop.setSpeed(multiplier: number): void
gameLoop.getSpeed(): number
gameLoop.pause(): void
gameLoop.resume(): void
get gameLoop.isPaused: boolean
```

## Behavior

- **Speed multiplier** scales elapsed time before adding to the accumulator: `accumulated += elapsed * speedMultiplier`. Default is 1.
- **Pause** causes the real-time loop to skip time accumulation entirely. The setTimeout loop continues running (to stay responsive for `resume()`), but no ticks fire.
- **Resume** re-enables time accumulation at the current speed multiplier. `lastTime` is reset to `now` on resume to prevent a burst of accumulated ticks from the paused duration.
- **`step()`** ignores both pause and speed — always executes exactly one tick. This preserves deterministic testing.
- **`setSpeed()` while paused** updates the multiplier but does not unpause.
- **`setSpeed(0)` or negative** throws an Error. Use `pause()` to freeze the simulation.
- **`pause()` when already paused** is a no-op (no error).
- **`resume()` when not paused** is a no-op (no error).
- **Serialization:** Speed multiplier and pause state are not serialized. They are runtime UI concerns, not game state.

## Implementation Details

### GameLoop Changes

New private fields:
- `speedMultiplier: number` — default 1
- `paused: boolean` — default false

Modified `loop()` method:
```
if paused:
  update lastTime to now (prevent time buildup)
  schedule next loop iteration
  return (no accumulation, no ticks)
else:
  accumulated += (now - lastTime) * speedMultiplier
  // rest of existing logic unchanged
```

Modified `resume()`:
- Sets `paused = false`
- Resets `lastTime = performance.now()` to prevent burst from paused duration

### World Changes

Proxy methods following the same pattern as `start()`/`stop()`/`step()`:
- `setSpeed(m)` → `this.gameLoop.setSpeed(m)`
- `getSpeed()` → `this.gameLoop.getSpeed()`
- `pause()` → `this.gameLoop.pause()`
- `resume()` → `this.gameLoop.resume()`
- `get isPaused` → `this.gameLoop.isPaused`

## Testing

### GameLoop unit tests (in `tests/game-loop.test.ts`)

- Default speed is 1, not paused
- `setSpeed(2)` updates `getSpeed()` to 2
- `setSpeed(0)` throws
- `setSpeed(-1)` throws
- `pause()` sets `isPaused` true
- `resume()` sets `isPaused` false
- `resume()` when not paused is a no-op
- `pause()` when already paused is a no-op
- `step()` works while paused (fires one tick)
- `setSpeed()` while paused updates multiplier but stays paused

### World proxy tests (in `tests/world.test.ts`)

- `world.setSpeed()` / `world.getSpeed()` work
- `world.pause()` / `world.resume()` / `world.isPaused` work
- `world.step()` works while paused

## Out of Scope

- Speed presets or `speedUp()`/`speedDown()` cycling (game layer concern)
- Serializing speed/pause state (runtime UI concern)
- Slow-motion validation (any positive float is accepted; game layer can restrict)
- Maximum speed cap (caller's responsibility; `maxTicksPerFrame` already prevents spiral of death)
