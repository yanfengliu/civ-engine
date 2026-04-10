export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export function assertJsonCompatible(value: unknown, label = 'value'): void {
  const seen = new WeakSet<object>();

  function visit(current: unknown, path: string): void {
    if (current === null) return;

    const type = typeof current;
    if (type === 'string' || type === 'boolean') return;
    if (type === 'number') {
      if (!Number.isFinite(current)) {
        throw new Error(`${path} must be a finite JSON number`);
      }
      return;
    }
    if (type === 'undefined') {
      throw new Error(`${path} must not be undefined`);
    }
    if (type === 'bigint' || type === 'function' || type === 'symbol') {
      throw new Error(`${path} is not JSON-compatible`);
    }
    if (type !== 'object') {
      throw new Error(`${path} is not JSON-compatible`);
    }

    const object = current as object;
    if (seen.has(object)) {
      throw new Error(`${path} contains a circular reference`);
    }
    seen.add(object);

    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        visit(current[i], `${path}[${i}]`);
      }
      seen.delete(object);
      return;
    }

    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${path} must be a plain object, array, or primitive`);
    }

    for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
      visit(child, `${path}.${key}`);
    }
    seen.delete(object);
  }

  visit(value, label);
}

export function jsonFingerprint(value: unknown, label = 'value'): string {
  assertJsonCompatible(value, label);
  return JSON.stringify(value)!;
}
