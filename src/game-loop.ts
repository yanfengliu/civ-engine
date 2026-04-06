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
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      throw new Error('Speed multiplier must be a finite positive number');
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
