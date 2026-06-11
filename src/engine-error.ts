// Coded engine errors (engine-error-codes objective). The core engine's
// throw sites carry a stable machine-readable `code` as a first-class field
// so agents branch on codes, not message prose. The session stack keeps its
// established `details.code` idiom (`SessionRecordingError` subclasses);
// discrimination across families is (family, code) — see the api-reference
// error-code table. Unification is a v1-surface question.

import type { JsonValue } from './json.js';

export interface EngineErrorOptions {
  details?: JsonValue;
}

/**
 * `details` is sanitized to strict JSON at construction: non-finite numbers
 * become their string forms ('NaN', 'Infinity', '-Infinity'), undefined
 * object entries are dropped (array holes become null), non-JSON leaves are
 * stringified, cycles become '[Circular]'. Validation-error sites routinely
 * embed the offending value (that is the point), and TickFailure embeds
 * `details` in payloads that are JSON-asserted and JSON-cloned — an error
 * ABOUT a non-finite input must not itself break the failure path.
 */
function sanitizeDetailsValue(value: unknown, seen: WeakSet<object>): JsonValue {
  if (value === null) return null;
  switch (typeof value) {
    case 'number':
      return Number.isFinite(value) ? value : String(value);
    case 'string':
    case 'boolean':
      return value;
    case 'object': {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
      if (Array.isArray(value)) {
        // Array.from, not .map: .map skips sparse holes and preserves them,
        // and a surviving hole reads as undefined downstream (impl-2 review).
        return Array.from(value, (v) => (v === undefined ? null : sanitizeDetailsValue(v, seen)));
      }
      const out: Record<string, JsonValue> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v !== undefined) out[k] = sanitizeDetailsValue(v, seen);
      }
      return out;
    }
    default:
      // undefined, function, symbol, bigint
      return String(value);
  }
}

function sanitizeDetails(details: JsonValue | undefined): JsonValue | null {
  return details === undefined ? null : sanitizeDetailsValue(details, new WeakSet());
}

export class EngineError extends Error {
  readonly code: string;
  readonly details: JsonValue | null;

  constructor(code: string, message: string, options?: EngineErrorOptions) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
    this.details = sanitizeDetails(options?.details);
  }
}

/** Same shape; preserves `instanceof RangeError` for historically-RangeError
 *  sites (external-consumer courtesy — no in-repo reliance exists). */
export class EngineRangeError extends RangeError {
  readonly code: string;
  readonly details: JsonValue | null;

  constructor(code: string, message: string, options?: EngineErrorOptions) {
    super(message);
    this.name = 'EngineRangeError';
    this.code = code;
    this.details = sanitizeDetails(options?.details);
  }
}

/** Same shape; preserves `instanceof TypeError` (Layer's historical sites). */
export class EngineTypeError extends TypeError {
  readonly code: string;
  readonly details: JsonValue | null;

  constructor(code: string, message: string, options?: EngineErrorOptions) {
    super(message);
    this.name = 'EngineTypeError';
    this.code = code;
    this.details = sanitizeDetails(options?.details);
  }
}

/**
 * instanceof-based by design: a duck-typed string-`code` check would
 * false-positive on Node `ErrnoException`s ('ENOENT' on an Error instance),
 * which this engine surfaces via FileSink (design-1 review, convergent).
 */
export function isEngineError(
  e: unknown,
): e is EngineError | EngineRangeError | EngineTypeError {
  return (
    e instanceof EngineError ||
    e instanceof EngineRangeError ||
    e instanceof EngineTypeError
  );
}
