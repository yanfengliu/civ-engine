import { describe, expect, it } from 'vitest';
import { getErrorCode, improvementFindingSignature, type ImprovementFinding } from '../src/index.js';

function sampleFinding(overrides: Partial<ImprovementFinding> = {}): ImprovementFinding {
  return {
    schemaVersion: 1,
    id: 'visual-loop-ended-with-guidance',
    title: 'loop ended with guidance still visible',
    severity: 'high',
    category: 'usability',
    observed: 'agent made no progress after step 6',
    verificationStatus: 'unverified',
    nextAction: 'manualFix',
    ...overrides,
  } as ImprovementFinding;
}

describe('improvementFindingSignature', () => {
  it('prefers the declared data.class over the finding id', () => {
    const finding = sampleFinding({ data: { class: 'slider-commit-drift', extra: 1 } });
    expect(improvementFindingSignature(finding)).toBe('slider-commit-drift');
    expect(improvementFindingSignature(finding, { gameId: 'photo' })).toBe('photo/slider-commit-drift');
  });

  it('falls back to the finding id when no class is declared', () => {
    expect(improvementFindingSignature(sampleFinding())).toBe('visual-loop-ended-with-guidance');
    expect(improvementFindingSignature(sampleFinding(), { gameId: 'farm' })).toBe(
      'farm/visual-loop-ended-with-guidance',
    );
    // A non-string or empty data.class is treated as undeclared, not an error.
    expect(improvementFindingSignature(sampleFinding({ data: { class: 42 } }))).toBe(
      'visual-loop-ended-with-guidance',
    );
    expect(improvementFindingSignature(sampleFinding({ data: { class: '   ' } }))).toBe(
      'visual-loop-ended-with-guidance',
    );
  });

  it('trims but never rewrites - run-specific suffixes stay the emitter responsibility', () => {
    expect(
      improvementFindingSignature(sampleFinding({ data: { class: '  Toolbar-Unreachable  ' } })),
    ).toBe('Toolbar-Unreachable');
    // No suffix-stripping heuristics: ids differing by run detail differ in
    // signature. Repos that want cross-run identity declare data.class.
    const a = improvementFindingSignature(sampleFinding({ id: 'stall-t120' }));
    const b = improvementFindingSignature(sampleFinding({ id: 'stall-t89' }));
    expect(a).not.toBe(b);
  });

  it('throws the documented error code on unusable inputs', () => {
    const codeOf = (fn: () => void): string | null => {
      try {
        fn();
        return 'did-not-throw';
      } catch (error) {
        return getErrorCode(error);
      }
    };
    expect(codeOf(() => improvementFindingSignature(sampleFinding({ id: '   ' })))).toBe(
      'improvement_finding_signature_invalid',
    );
    expect(codeOf(() => improvementFindingSignature(sampleFinding(), { gameId: '  ' }))).toBe(
      'improvement_finding_signature_invalid',
    );
    expect(
      codeOf(() =>
        improvementFindingSignature(sampleFinding(), { gameId: null as unknown as string }),
      ),
    ).toBe('improvement_finding_signature_invalid');
    expect(codeOf(() => improvementFindingSignature(null as unknown as ImprovementFinding))).toBe(
      'improvement_finding_signature_invalid',
    );
  });

  it('rejects a gameId containing "/" - the join would collide distinct classes', () => {
    // Confirmed collision without this rule: ('a/b', class 'c') === ('a', class 'b/c').
    let code: string | null = null;
    try {
      improvementFindingSignature(sampleFinding(), { gameId: 'a/b' });
    } catch (error) {
      code = getErrorCode(error);
    }
    expect(code).toBe('improvement_finding_signature_invalid');
  });

  it('ignores a data.class inherited through the prototype chain', () => {
    const data = Object.create({ class: 'inherited-from-proto' }) as Record<string, unknown>;
    const finding = { ...sampleFinding(), data } as unknown as ImprovementFinding;
    expect(improvementFindingSignature(finding)).toBe('visual-loop-ended-with-guidance');
  });

  it('rejects non-plain-object findings (class instances are not ledger rows)', () => {
    class FakeFinding {
      id = 'from-instance';
    }
    let code: string | null = null;
    try {
      improvementFindingSignature(new FakeFinding() as unknown as ImprovementFinding);
    } catch (error) {
      code = getErrorCode(error);
    }
    expect(code).toBe('improvement_finding_signature_invalid');
  });

  it('accepts minimally-shaped historical rows without full finding validation', () => {
    // Aggregation reads pre-2.0 ledger rows; the signature must not impose
    // the strict verification-evidence contract on them.
    const historical = {
      id: 'legacy-class',
      verificationStatus: 'verified',
    } as unknown as ImprovementFinding;
    expect(improvementFindingSignature(historical)).toBe('legacy-class');
  });
});
