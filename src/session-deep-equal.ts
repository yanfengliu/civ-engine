// Deep-equality helpers for `SessionReplayer.selfCheck()`'s three-stream
// comparison. Extracted from `src/session-replayer.ts` (LOC-budget split,
// v0.8.15); `deepEqualWithPath` stays public via the `session-replayer.ts`
// re-export + `index.ts`, `deepEqualOrdered` remains engine-internal.

/**
 * Recursive deep-equal that short-circuits on first mismatch and produces
 * a best-effort dotted `firstDifferingPath`. Snapshot serialization
 * preserves insertion order, so deep-equal need not canonicalize.
 */
export function deepEqualWithPath(a: unknown, b: unknown, path = ''): { equal: boolean; firstDifferingPath?: string } {
  if (Object.is(a, b)) return { equal: true };
  if (typeof a !== typeof b) return { equal: false, firstDifferingPath: path || '<root>' };
  if (a === null || b === null) return { equal: false, firstDifferingPath: path || '<root>' };
  if (typeof a !== 'object') return { equal: false, firstDifferingPath: path || '<root>' };

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      return { equal: false, firstDifferingPath: path || '<root>' };
    }
    if (a.length !== b.length) return { equal: false, firstDifferingPath: `${path}.length` };
    for (let i = 0; i < a.length; i++) {
      const r = deepEqualWithPath(a[i], b[i], `${path}[${i}]`);
      if (!r.equal) return r;
    }
    return { equal: true };
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) {
    return { equal: false, firstDifferingPath: `${path}.<keys>` };
  }
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) {
      return { equal: false, firstDifferingPath: `${path}.${k}<missing>` };
    }
    const r = deepEqualWithPath(ao[k], bo[k], path ? `${path}.${k}` : k);
    if (!r.equal) return r;
  }
  return { equal: true };
}

export function deepEqualOrdered(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!deepEqualWithPath(a[i], b[i]).equal) return false;
  }
  return true;
}
