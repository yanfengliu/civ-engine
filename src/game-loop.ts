export class GameLoop {
  private _tick = 0;
  private readonly _tps: number;
  private readonly tickDuration: number;
  private readonly onTick: () => void;
  private readonly maxTicksPerFrame = 4;
  private running = false;
  private lastTime = 0;
  private accumulated = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: { tps: number; onTick: () => void }) {
    this._tps = config.tps;
    this.tickDuration = 1000 / config.tps;
    this.onTick = config.onTick;
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

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    this.accumulated += now - this.lastTime;
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
