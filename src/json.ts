import { EngineError } from './engine-error.js';
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export function assertJsonCompatible(value: unknown, label = 'value'): void {
  const seen = new WeakSet<object>();
  // Successful validation needs no diagnostic string. Numeric breadcrumbs are
  // array indexes; object keys remain strings, including keys such as "0".
  const breadcrumbs: Array<string | number> = [];

  function reject(reason: string): never {
    let path = label;
    for (const part of breadcrumbs) {
      path += typeof part === 'number' ? `[${part}]` : `.${part}`;
    }
    throw new EngineError('json_incompatible', `${path} ${reason}`, { details: { context: path } });
  }

  function visit(current: unknown): void {
    if (current === null) return;

    const type = typeof current;
    if (type === 'string' || type === 'boolean') return;
    if (type === 'number') {
      if (!Number.isFinite(current)) reject('must be a finite JSON number');
      return;
    }
    if (type === 'undefined') reject('must not be undefined');
    if (type === 'bigint' || type === 'function' || type === 'symbol') {
      reject('is not JSON-compatible');
    }
    if (type !== 'object') reject('is not JSON-compatible');

    const object = current as object;
    if (seen.has(object)) reject('contains a circular reference');
    seen.add(object);

    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        breadcrumbs.push(i);
        visit(current[i]);
        breadcrumbs.pop();
      }
      seen.delete(object);
      return;
    }

    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      reject('must be a plain object, array, or primitive');
    }

    for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
      breadcrumbs.push(key);
      visit(child);
      breadcrumbs.pop();
    }
    seen.delete(object);
  }

  visit(value);
}

export function jsonFingerprint(value: unknown, label = 'value'): string {
  assertJsonCompatible(value, label);
  return JSON.stringify(value)!;
}

/**
 * Validates that `value` is JSON-compatible, then deep-clones via JSON
 * round-trip. Used by recorders and capture utilities to detach values
 * from caller-owned references so subsequent mutation cannot corrupt
 * stored snapshots.
 */
export function cloneJsonValue<T>(value: T, label: string): T {
  assertJsonCompatible(value, label);
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Convert a `Uint8Array` to a base64 string. Uses the global `btoa` (Node 16+
 * / browser); processes in 4 KiB chunks to avoid a single huge intermediate
 * string. civ-engine doesn't depend on `@types/node`'s `Buffer`, so we use
 * the platform-native API. Used by session-recording sinks for `dataUrl`
 * attachment encoding.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 4096;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    let s = '';
    for (let j = 0; j < chunk.length; j++) s += String.fromCharCode(chunk[j]);
    binary += s;
  }
  return btoa(binary);
}
