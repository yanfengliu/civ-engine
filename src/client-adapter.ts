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
  private connected = false;
  private diffListener: ((diff: TickDiff) => void) | null = null;

  constructor(config: {
    world: World<TEventMap, TCommandMap>;
    send: (message: ServerMessage<TEventMap>) => void;
  }) {
    this.world = config.world;
    this.send = config.send;
  }

  connect(): void {
    if (this.connected) return;
    this.connected = true;

    this.send({ type: 'snapshot', data: this.world.serialize() });

    this.diffListener = (diff: TickDiff) => {
      this.send({
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

  handleMessage(message: ClientMessage<TCommandMap>): void {
    switch (message.type) {
      case 'command': {
        const { id, commandType, payload } = message.data;
        const accepted = this.world.submit(commandType, payload);
        if (!accepted) {
          this.send({ type: 'commandRejected', data: { id } });
        }
        break;
      }
      case 'requestSnapshot':
        this.send({ type: 'snapshot', data: this.world.serialize() });
        break;
    }
  }
}
