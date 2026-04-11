import { assertJsonCompatible, type JsonValue } from './json.js';
import type { TickDiff } from './diff.js';
import type { WorldSnapshot } from './serializer.js';
import type {
  CommandSubmissionResult,
  World,
  WorldMetrics,
} from './world.js';

export interface WorldHistoryTick<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  tick: number;
  diff: TickDiff;
  events: Array<{
    type: keyof TEventMap;
    data: TEventMap[keyof TEventMap];
  }>;
  metrics: WorldMetrics | null;
  debug: TDebug | null;
}

export interface WorldHistoryState<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  initialSnapshot: WorldSnapshot | null;
  ticks: Array<WorldHistoryTick<TEventMap, TDebug>>;
  commands: Array<CommandSubmissionResult<keyof TCommandMap>>;
}

export class WorldHistoryRecorder<
  TEventMap extends Record<keyof TEventMap, unknown> = Record<string, never>,
  TCommandMap extends Record<keyof TCommandMap, unknown> = Record<string, never>,
  TDebug = JsonValue,
> {
  private readonly world: World<TEventMap, TCommandMap>;
  private readonly tickCapacity: number;
  private readonly commandCapacity: number;
  private readonly debugCapture?: () => TDebug | null;
  private readonly captureInitialSnapshot: boolean;
  private readonly tickEntries: Array<WorldHistoryTick<TEventMap, TDebug>> = [];
  private readonly commandEntries: Array<
    CommandSubmissionResult<keyof TCommandMap>
  > = [];
  private initialSnapshot: WorldSnapshot | null = null;
  private connected = false;
  private readonly diffListener: (diff: TickDiff) => void;
  private readonly commandListener: (
    result: CommandSubmissionResult<keyof TCommandMap>,
  ) => void;

  constructor(config: {
    world: World<TEventMap, TCommandMap>;
    capacity?: number;
    commandCapacity?: number;
    debug?: { capture(): TDebug | null };
    captureInitialSnapshot?: boolean;
  }) {
    this.world = config.world;
    this.tickCapacity = config.capacity ?? 64;
    this.commandCapacity = config.commandCapacity ?? Math.max(this.tickCapacity * 4, 64);
    this.debugCapture = config.debug?.capture.bind(config.debug);
    this.captureInitialSnapshot = config.captureInitialSnapshot ?? true;
    this.diffListener = (diff) => this.recordTick(diff);
    this.commandListener = (result) => this.recordCommand(result);
  }

  connect(): void {
    if (this.connected) return;
    this.connected = true;

    if (this.captureInitialSnapshot) {
      this.initialSnapshot = cloneJsonValue(this.world.serialize(), 'history initial snapshot');
    }

    this.world.onDiff(this.diffListener);
    this.world.onCommandResult(this.commandListener);
  }

  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    this.world.offDiff(this.diffListener);
    this.world.offCommandResult(this.commandListener);
  }

  clear(): void {
    this.tickEntries.length = 0;
    this.commandEntries.length = 0;
    this.initialSnapshot = this.captureInitialSnapshot
      ? cloneJsonValue(this.world.serialize(), 'history initial snapshot')
      : null;
  }

  getTickHistory(): Array<WorldHistoryTick<TEventMap, TDebug>> {
    return this.tickEntries.map((entry) => cloneJsonValue(entry, 'history tick entry'));
  }

  getCommandHistory(): Array<CommandSubmissionResult<keyof TCommandMap>> {
    return this.commandEntries.map((entry) =>
      cloneJsonValue(entry, 'history command entry'),
    );
  }

  findTick(tick: number): WorldHistoryTick<TEventMap, TDebug> | null {
    const entry = this.tickEntries.find((candidate) => candidate.tick === tick);
    return entry ? cloneJsonValue(entry, `history tick ${tick}`) : null;
  }

  getState(): WorldHistoryState<TEventMap, TCommandMap, TDebug> {
    return {
      initialSnapshot: this.initialSnapshot
        ? cloneJsonValue(this.initialSnapshot, 'history initial snapshot')
        : null,
      ticks: this.getTickHistory(),
      commands: this.getCommandHistory(),
    };
  }

  private recordTick(diff: TickDiff): void {
    const debug = this.captureDebug();
    const entry: WorldHistoryTick<TEventMap, TDebug> = {
      tick: diff.tick,
      diff: cloneJsonValue(diff, `history diff tick ${diff.tick}`),
      events: cloneJsonValue(
        [...this.world.getEvents()],
        `history events tick ${diff.tick}`,
      ),
      metrics: this.world.getMetrics(),
      debug,
    };
    pushBounded(this.tickEntries, entry, this.tickCapacity);
  }

  private recordCommand(
    result: CommandSubmissionResult<keyof TCommandMap>,
  ): void {
    pushBounded(
      this.commandEntries,
      cloneJsonValue(result, `history command result ${result.sequence}`),
      this.commandCapacity,
    );
  }

  private captureDebug(): TDebug | null {
    const debug = this.debugCapture?.() ?? null;
    if (debug !== null) {
      assertJsonCompatible(debug, 'history debug payload');
    }
    return debug;
  }
}

function pushBounded<T>(target: T[], value: T, capacity: number): void {
  target.push(value);
  if (target.length > capacity) {
    target.splice(0, target.length - capacity);
  }
}

function cloneJsonValue<T>(value: T, label: string): T {
  assertJsonCompatible(value, label);
  return JSON.parse(JSON.stringify(value)) as T;
}
