export interface QueuedCommand<
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  type: keyof TCommandMap;
  data: TCommandMap[keyof TCommandMap];
  submissionSequence: number | null;
}

export class CommandQueue<
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  private buffer: Array<QueuedCommand<TCommandMap>> = [];

  push<K extends keyof TCommandMap>(
    type: K,
    data: TCommandMap[K],
    options?: {
      submissionSequence?: number | null;
    },
  ): void {
    this.buffer.push({
      type,
      data,
      submissionSequence: options?.submissionSequence ?? null,
    });
  }

  drain(): Array<QueuedCommand<TCommandMap>> {
    const commands = this.buffer;
    this.buffer = [];
    return commands;
  }

  get pending(): number {
    return this.buffer.length;
  }
}
