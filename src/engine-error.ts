// Coded engine errors (engine-error-codes objective). The core engine's
// throw sites carry a stable machine-readable `code` as a first-class field
// so agents branch on codes, not message prose. The session stack keeps its
// established `details.code` idiom (`SessionRecordingError` subclasses);
// discrimination across families is (family, code) — see the api-reference
// error-code table. Unification is a v1-surface question.

import type { JsonValue } from './json.js';
import { SessionRecordingError } from './session-errors.js';
import { StrictModeViolationError } from './world-strict-mode.js';

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
      // Un-mark after visiting (mirrors assertJsonCompatible): `seen` must
      // detect CYCLES only — a shared non-cyclic reference (DAG) is legal
      // JSON and must expand at every site (pre-1.0 full review F2).
      let result: JsonValue;
      if (Array.isArray(value)) {
        // Array.from, not .map: .map skips sparse holes and preserves them,
        // and a surviving hole reads as undefined downstream (impl-2 review).
        result = Array.from(value, (v) => (v === undefined ? null : sanitizeDetailsValue(v, seen)));
      } else {
        const out: Record<string, JsonValue> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (v !== undefined) out[k] = sanitizeDetailsValue(v, seen);
        }
        result = out;
      }
      seen.delete(value);
      return result;
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

/**
 * Cross-family branch key (v1-surface §2, ADR 47): the machine-readable code
 * from ANY engine error family — core (`EngineError` and subclasses, code
 * first-class), session (`SessionRecordingError` subclasses, code mirrored
 * from `details.code`), or strict-mode (`StrictModeViolationError`) — and
 * `null` for plain/foreign errors. instanceof over the families, so
 * errno-style duck types stay excluded. (world-strict-mode has zero runtime
 * imports, so this import is cycle-free — verified.)
 *
 * DELIBERATE EXCEPTION: `WorldTickFailureError` returns `null`. It is a
 * wrapper, not a coded error — its `failure.code` classifies the TICK
 * failure and `failure.error.code` carries the underlying engine error;
 * mirroring either here would conflate the two levels agents must
 * distinguish (api-reference § TickFailure). Catch it and read
 * `e.failure.code` / `e.failure.error?.code` directly (pre-1.0 review F5).
 */
export function getErrorCode(e: unknown): string | null {
  if (isEngineError(e)) return e.code;
  if (e instanceof SessionRecordingError) return e.code;
  if (e instanceof StrictModeViolationError) return e.code;
  return null;
}

/** Internal (module-level, deliberately not in the package surface):
 *  JSON-sanitizes non-core families' details for the TickFailure path —
 *  the same boundary invariant EngineError enforces at construction. */
export function sanitizeForeignDetails(details: JsonValue | undefined): JsonValue | null {
  return sanitizeDetails(details);
}
