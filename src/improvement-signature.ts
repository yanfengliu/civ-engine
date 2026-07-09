import { EngineRangeError, EngineTypeError } from './engine-error.js';
import type { ImprovementFinding } from './improvement-loop-types.js';

export interface ImprovementFindingSignatureOptions {
  /** Prefixes the signature (`<gameId>/<class>`) for cross-repo joins; pass the run manifest's gameId. */
  gameId?: string;
}

/**
 * Cross-run, cross-repo bug-class key for an improvement finding.
 *
 * Prefers an explicitly declared `data.class` (non-empty string) and falls
 * back to the finding id. Trims, but never rewrites: there are no
 * suffix-stripping heuristics, because guessing which id parts are
 * run-specific is exactly how classes get falsely merged or split. Repos
 * that want stable cross-run identity declare `data.class` when emitting.
 *
 * Validation is deliberately minimal (a plain object with a usable class or
 * id) so historical ledger rows recorded before stricter contracts stay
 * aggregatable — this helper must never impose the verification-evidence
 * rules on old data.
 */
export function improvementFindingSignature(
  finding: ImprovementFinding,
  options: ImprovementFindingSignatureOptions = {},
): string {
  if (finding === null || typeof finding !== 'object' || Array.isArray(finding) || !isPlainPrototype(finding)) {
    throw new EngineTypeError(
      'improvement_finding_signature_invalid',
      'improvement finding must be a plain object',
    );
  }
  const record = finding as unknown as Record<string, unknown>;
  const declared = declaredClass(record.data);
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const classKey = declared ?? id;
  if (classKey.length === 0) {
    throw new EngineRangeError(
      'improvement_finding_signature_invalid',
      'improvement finding signature requires a non-empty data.class or id',
    );
  }
  if (options.gameId === undefined) return classKey;
  if (typeof options.gameId !== 'string') {
    throw new EngineTypeError(
      'improvement_finding_signature_invalid',
      'gameId must be a string when provided',
    );
  }
  const gameId = options.gameId.trim();
  if (gameId.length === 0) {
    throw new EngineRangeError(
      'improvement_finding_signature_invalid',
      'gameId must be a non-empty string when provided',
    );
  }
  // The join is only unambiguous if the prefix can never contain the
  // separator: ('a/b', class 'c') would equal ('a', class 'b/c').
  if (gameId.includes('/')) {
    throw new EngineRangeError(
      'improvement_finding_signature_invalid',
      'gameId must not contain "/" - the signature join would collide distinct classes',
    );
  }
  return `${gameId}/${classKey}`;
}

function declaredClass(data: unknown): string | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  // Own property only: an inherited .class (prototype default or pollution)
  // must not silently merge classes for every finding without its own.
  if (!Object.hasOwn(data, 'class')) return null;
  const value = (data as Record<string, unknown>).class;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isPlainPrototype(value: object): boolean {
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}
