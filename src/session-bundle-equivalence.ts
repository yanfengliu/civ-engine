// Spec 5 — shared equivalence helpers used by session-fork.ts (inline
// divergence) and session-bundle-diff.ts (full BundleDiff). Split out so the
// two divergence paths use the same comparison semantics.
//
// `commandsEquivalent` compares every CommandSubmissionResult field that's
// meaningful for divergence (accepted/code/message/details/validatorIndex).
// Sequence and tick are NOT compared (per-recorder fields).
//
// `eventsEquivalent` compares { type, data } pairs.
//
// `deepStructuralEqual` is a JSON-shape deep-equality helper.

import type { RecordedCommand } from './session-bundle.js';

export function commandsEquivalent<TCommandMap>(
  a: RecordedCommand<TCommandMap>,
  b: RecordedCommand<TCommandMap>,
): boolean {
  if (a.type !== b.type) return false;
  if (!deepStructuralEqual(a.data, b.data)) return false;
  if (a.result.accepted !== b.result.accepted) return false;
  if (a.result.code !== b.result.code) return false;
  if (a.result.message !== b.result.message) return false;
  if (!deepStructuralEqual(a.result.details, b.result.details)) return false;
  if (a.result.validatorIndex !== b.result.validatorIndex) return false;
  return true;
}

export function eventsEquivalent<TEventMap>(
  a: { type: keyof TEventMap; data: TEventMap[keyof TEventMap] },
  b: { type: keyof TEventMap; data: TEventMap[keyof TEventMap] },
): boolean {
  if (a.type !== b.type) return false;
  return deepStructuralEqual(a.data, b.data);
}

export function deepStructuralEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepStructuralEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object') {
    if (typeof b !== 'object' || b === null) return false;
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const aKeys = Object.keys(ao);
    const bKeys = Object.keys(bo);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
      if (!deepStructuralEqual(ao[k], bo[k])) return false;
    }
    return true;
  }
  return false;
}
