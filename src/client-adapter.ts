import type { WorldSnapshot } from './serializer.js';
import type { TickDiff } from './diff.js';
import type { World } from './world.js';

export type GameEvent<TEventMap> = {
  type: keyof TEventMap;
  data: TEventMap[keyof TEventMap];
};

export type ServerMessage<TEventMap> =
  | { type: 'snapshot'; data: WorldSnapshot }
  | { type: 'tick'; data: { diff: TickDiff; events: GameEvent<TEventMap>[] } }
  | { type: 'commandRejected'; data: { id: string; reason?: string } };

export type ClientMessage<TCommandMap> =
  | {
      type: 'command';
      data: {
        id: string;
        commandType: keyof TCommandMap;
        payload: TCommandMap[keyof TCommandMap];
      };
    }
  | { type: 'requestSnapshot' };

export class ClientAdapter<
  TEventMap extends Record<keyof TEventMap, unknown>,
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  private world: World<TEventMap, TCommandMap>;
  private send: (message: ServerMessage<TEventMap>) => void;
  private onError?: (error: unknown) => void;
  private connected = false;
  private diffListener: ((diff: TickDiff) => void) | null = null;

  constructor(config: {
    world: World<TEventMap, TCommandMap>;
    send: (message: ServerMessage<TEventMap>) => void;
    onError?: (error: unknown) => void;
  }) {
    this.world = config.world;
    this.send = config.send;
    this.onError = config.onError;
  }

  connect(): void {
    if (this.connected) return;
    this.connected = true;

    if (!this.safeSend({ type: 'snapshot', data: this.world.serialize() })) {
      return;
    }

    this.diffListener = (diff: TickDiff) => {
      this.safeSend({
        type: 'tick',
        data: {
          diff,
          events: [...this.world.getEvents()] as GameEvent<TEventMap>[],
        },
      });
    };
    this.world.onDiff(this.diffListener);
  }

  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    if (this.diffListener) {
      this.world.offDiff(this.diffListener);
      this.diffListener = null;
    }
  }

  handleMessage(message: ClientMessage<TCommandMap> | unknown): void {
    if (!isObject(message) || typeof message.type !== 'string') {
      return;
    }
    switch (message.type) {
      case 'command': {
        if (!isObject(message.data) || typeof message.data.id !== 'string') {
          return;
        }
        if (typeof message.data.commandType !== 'string') {
          this.safeSend({
            type: 'commandRejected',
            data: { id: message.data.id, reason: 'Malformed command type' },
          });
          return;
        }
        const { id, commandType, payload } = message.data;
        const type = commandType as keyof TCommandMap;
        if (!this.world.hasCommandHandler(type)) {
          this.safeSend({
            type: 'commandRejected',
            data: { id, reason: `No handler registered for command '${commandType}'` },
          });
          return;
        }
        const accepted = this.world.submit(type, payload as TCommandMap[keyof TCommandMap]);
        if (!accepted) {
          this.safeSend({
            type: 'commandRejected',
            data: { id, reason: 'Validation failed' },
          });
        }
        break;
      }
      case 'requestSnapshot':
        this.safeSend({ type: 'snapshot', data: this.world.serialize() });
        break;
    }
  }

  private safeSend(message: ServerMessage<TEventMap>): boolean {
    try {
      this.send(message);
      return true;
    } catch (error) {
      this.onError?.(error);
      this.disconnect();
      return false;
    }
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
