export class CommandQueue<
  TCommandMap extends Record<keyof TCommandMap, unknown>,
> {
  private buffer: Array<{
    type: keyof TCommandMap;
    data: TCommandMap[keyof TCommandMap];
  }> = [];

  push<K extends keyof TCommandMap>(type: K, data: TCommandMap[K]): void {
    this.buffer.push({ type, data });
  }

  drain(): Array<{
    type: keyof TCommandMap;
    data: TCommandMap[keyof TCommandMap];
  }> {
    const commands = this.buffer;
    this.buffer = [];
    return commands;
  }

  get pending(): number {
    return this.buffer.length;
  }
}
