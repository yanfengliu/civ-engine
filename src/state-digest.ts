import { EngineError } from './engine-error.js';

export interface StateDigestOptions {
  /**
   * Key names omitted everywhere in the tree before digesting. Omitted
   * subtrees are exempt from JSON validation too, so wall-clock noise or
   * non-serializable handles can be excluded instead of pre-stripped.
   */
  omitKeys?: readonly string[];
}

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK64 = 0xffffffffffffffffn;

/**
 * Canonical 64-bit FNV-1a digest (16 hex chars) of a JSON-compatible value.
 * Object keys are sorted, so the digest is stable across insertion order;
 * array order is significant. Rejects non-JSON values (non-finite numbers,
 * undefined, functions, class instances, circular references) with coded
 * `state_digest_invalid` errors, mirroring `assertJsonCompatible`. Built for
 * cheap cross-run state comparison in the recursive loop — a comparison
 * key, not a cryptographic hash.
 */
export function stateDigest(value: unknown, options: StateDigestOptions = {}): string {
  const omit = new Set(options.omitKeys ?? []);
  const seen = new WeakSet<object>();
  let hash = FNV_OFFSET;

  const feed = (text: string): void => {
    for (let i = 0; i < text.length; i++) {
      const unit = text.charCodeAt(i);
      hash ^= BigInt(unit & 0xff);
      hash = (hash * FNV_PRIME) & MASK64;
      hash ^= BigInt(unit >> 8);
      hash = (hash * FNV_PRIME) & MASK64;
    }
  };

  const invalid = (path: string, reason: string): EngineError =>
    new EngineError('state_digest_invalid', `${path} ${reason}`, { details: { context: path } });

  const visit = (current: unknown, path: string): void => {
    if (current === null) {
      feed('n;');
      return;
    }
    const type = typeof current;
    if (type === 'string') {
      feed(`s${JSON.stringify(current)};`);
      return;
    }
    if (type === 'boolean') {
      feed(current ? 'b1;' : 'b0;');
      return;
    }
    if (type === 'number') {
      if (!Number.isFinite(current)) throw invalid(path, 'must be a finite JSON number');
      feed(`d${current};`);
      return;
    }
    if (type === 'undefined') throw invalid(path, 'must not be undefined');
    if (type !== 'object') throw invalid(path, 'is not JSON-compatible');

    const object = current as object;
    if (seen.has(object)) throw invalid(path, 'contains a circular reference');
    seen.add(object);

    if (Array.isArray(current)) {
      feed('[');
      for (let i = 0; i < current.length; i++) visit(current[i], `${path}[${i}]`);
      feed(']');
    } else {
      const prototype = Object.getPrototypeOf(current);
      if (prototype !== Object.prototype && prototype !== null) {
        throw invalid(path, 'must be a plain object, array, or primitive');
      }
      feed('{');
      const record = current as Record<string, unknown>;
      const keys = Object.keys(record)
        .filter((key) => !omit.has(key))
        .sort();
      for (const key of keys) {
        feed(`k${JSON.stringify(key)}:`);
        visit(record[key], `${path}.${key}`);
      }
      feed('}');
    }
    seen.delete(object);
  };

  visit(value, 'state');
  return hash.toString(16).padStart(16, '0');
}
