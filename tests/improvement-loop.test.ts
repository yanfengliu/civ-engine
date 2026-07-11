import { describe, expect, it } from 'vitest';
import {
  assertImprovementFinding,
  assertImprovementRunManifest,
  createImprovementRunManifest,
  getAiContractVersions,
  improvementFindingToMarker,
  improvementFindingToVisualPlaytestFinding,
  improvementFindingsFromMarkers,
  IMPROVEMENT_FINDING_SCHEMA_VERSION,
  minimalImprovementFindingSchemaVersion,
  visualPlaytestFindingToImprovementFinding,
  type ImprovementFinding,
  type Marker,
  type VisualPlaytestFinding,
} from '../src/index.js';
import { ENGINE_VERSION } from '../src/version.js';

function sampleFinding(): ImprovementFinding {
  return {
    schemaVersion: 1,
    id: 'aoe2-command-card-1',
    title: 'ux-gap - command-card',
    severity: 'medium',
    category: 'usability',
    observed: 'no command to advance past Feudal',
    expected: 'researching Castle Age at the Town Center',
    suggestion: 'implement the age-up command',
    evidence: [{ kind: 'tick', tick: 250 }],
    verificationStatus: 'unverified',
    nextAction: 'proposalOnly',
    data: { aoe2FindingCategory: 'ux-gap' },
  };
}

describe('improvement loop finding helpers', () => {
  it('exposes the improvement finding schema through AI contract versions', () => {
    expect(IMPROVEMENT_FINDING_SCHEMA_VERSION).toBe(2);
    expect(getAiContractVersions().improvementFinding).toBe(IMPROVEMENT_FINDING_SCHEMA_VERSION);
  });

  it('converts improvement findings into visual playtest findings', () => {
    const finding = sampleFinding();

    expect(improvementFindingToVisualPlaytestFinding(finding)).toMatchObject({
      title: 'ux-gap - command-card',
      severity: 'medium',
      category: 'usability',
      observed: 'no command to advance past Feudal',
      expected: 'researching Castle Age at the Town Center',
      suggestion: 'implement the age-up command',
      evidence: { tick: 250 },
      data: {
        improvementLoop: {
          schemaVersion: 1,
          type: 'finding',
          finding: {
            id: 'aoe2-command-card-1',
            verificationStatus: 'unverified',
            nextAction: 'proposalOnly',
          },
        },
      },
    });
  });

  it('records findings as markers with both improvement-loop and visual-playtest payloads', () => {
    const marker = improvementFindingToMarker(sampleFinding());

    expect(marker).toMatchObject({
      kind: 'annotation',
      tick: 250,
      text: '[medium/usability] ux-gap - command-card',
      data: {
        visualPlaytest: {
          schemaVersion: 1,
          type: 'finding',
          finding: { title: 'ux-gap - command-card', evidence: { tick: 250 } },
        },
        improvementLoop: {
          schemaVersion: 1,
          type: 'finding',
          finding: {
            id: 'aoe2-command-card-1',
            data: { aoe2FindingCategory: 'ux-gap' },
          },
        },
      },
    });
  });

  it('recovers valid improvement findings from markers and ignores unrelated markers', () => {
    const markerInput = improvementFindingToMarker(sampleFinding());
    const marker: Marker = {
      id: 'm1',
      tick: markerInput.tick ?? 0,
      kind: markerInput.kind,
      provenance: 'game',
      text: markerInput.text,
      refs: markerInput.refs,
      data: markerInput.data,
    };
    const unrelated: Marker = {
      id: 'm2',
      tick: 0,
      kind: 'annotation',
      provenance: 'game',
      data: { visualPlaytest: { type: 'finding', finding: { title: 'visual only' } } },
    };

    expect(improvementFindingsFromMarkers([unrelated, marker])).toEqual([sampleFinding()]);
  });

  it('rejects malformed finding payloads before they enter the loop', () => {
    expect(() => assertImprovementFinding({ ...sampleFinding(), id: '' })).toThrow(
      /improvement finding id must be a non-empty string/,
    );
    expect(() => assertImprovementFinding({ ...sampleFinding(), evidence: [{ kind: 'tick', tick: -1 }] })).toThrow(
      /tick evidence must be a non-negative integer/,
    );
  });
});

describe('schema version 2 minimal stamping', () => {
  it('rejects widened nextAction values under schemaVersion 1', () => {
    expect(() => assertImprovementFinding({ ...sampleFinding(), nextAction: 'improveHarness' })).toThrow(
      /requires schemaVersion 2/,
    );
  });

  it('accepts widened vocabulary and new optional fields under schemaVersion 2, round-tripping through markers', () => {
    const finding: ImprovementFinding = {
      ...sampleFinding(),
      schemaVersion: 2,
      nextAction: 'fileEngineFeedback',
      verificationStatus: 'verified',
      verificationMethod: 'replay',
      promotionTarget: 'engineFeedback',
      evidence: [{ kind: 'bundle', bundleId: 'campaign-12' }],
    };
    const markerInput = improvementFindingToMarker(finding);
    expect(markerInput).toMatchObject({
      data: { improvementLoop: { schemaVersion: 2, type: 'finding' } },
    });
    const marker: Marker = {
      id: 'm3',
      tick: 0,
      kind: markerInput.kind,
      provenance: 'game',
      data: markerInput.data,
    };
    expect(improvementFindingsFromMarkers([marker])).toEqual([finding]);
  });

  it('keeps schemaVersion 1 payloads valid and mirrors the finding version in the marker envelope', () => {
    const markerInput = improvementFindingToMarker(sampleFinding());
    expect(markerInput).toMatchObject({
      data: { improvementLoop: { schemaVersion: 1 } },
    });
  });

  it('accepts the new optional fields on schemaVersion 1 findings (additive keys)', () => {
    const finding: ImprovementFinding = {
      ...sampleFinding(),
      verificationMethod: 'screenshot',
      promotionTarget: 'backlog',
    };
    expect(() => assertImprovementFinding(finding)).not.toThrow();
  });

  it('silently skips v1-stamped findings using v2 vocabulary when reading markers', () => {
    const good = improvementFindingToMarker(sampleFinding());
    const forged: Marker = {
      id: 'm-bad',
      tick: 0,
      kind: 'annotation',
      provenance: 'game',
      data: {
        improvementLoop: {
          schemaVersion: 1,
          type: 'finding',
          finding: { ...sampleFinding(), nextAction: 'improveHarness' },
        },
      } as unknown as Marker['data'],
    };
    const valid: Marker = {
      id: 'm-good',
      tick: 0,
      kind: 'annotation',
      provenance: 'game',
      data: good.data,
    };
    expect(improvementFindingsFromMarkers([forged, valid])).toEqual([sampleFinding()]);
  });

  it('rejects unsupported verificationMethod and promotionTarget values', () => {
    expect(() =>
      assertImprovementFinding({ ...sampleFinding(), schemaVersion: 2, verificationMethod: 'vibes' }),
    ).toThrow(/verificationMethod/);
    expect(() =>
      assertImprovementFinding({ ...sampleFinding(), schemaVersion: 2, promotionTarget: 'shrug' }),
    ).toThrow(/promotionTarget/);
  });
});

describe('strict verification evidence mode', () => {
  it('rejects verified findings without replayable evidence or method when strict', () => {
    const hollow: ImprovementFinding = {
      ...sampleFinding(),
      verificationStatus: 'verified',
      evidence: [{ kind: 'text', label: 'trust me' }],
    };
    expect(() => assertImprovementFinding(hollow, { requireVerificationEvidence: true })).toThrow(
      /replayable evidence/,
    );
    const methodless: ImprovementFinding = {
      ...sampleFinding(),
      verificationStatus: 'verified',
      evidence: [{ kind: 'tick', tick: 250 }],
    };
    expect(() => assertImprovementFinding(methodless, { requireVerificationEvidence: true })).toThrow(
      /verificationMethod/,
    );
    const unaddressed: ImprovementFinding = {
      ...sampleFinding(),
      schemaVersion: 2,
      verificationStatus: 'verified',
      verificationMethod: 'replay',
      evidence: [{ kind: 'bundle' }, { kind: 'marker' }],
    };
    expect(() => assertImprovementFinding(unaddressed, { requireVerificationEvidence: true })).toThrow(
      /replayable evidence/,
    );
  });

  it('accepts verified findings carrying replayable evidence plus a method when strict', () => {
    const solid: ImprovementFinding = {
      ...sampleFinding(),
      schemaVersion: 2,
      verificationStatus: 'verified',
      verificationMethod: 'replay',
      evidence: [{ kind: 'marker', markerId: 'm-9' }],
    };
    expect(() => assertImprovementFinding(solid, { requireVerificationEvidence: true })).not.toThrow();
  });

  it('requires verification evidence by default for verified findings', () => {
    const hollow: ImprovementFinding = {
      ...sampleFinding(),
      verificationStatus: 'verified',
      evidence: [{ kind: 'screenshot', screenshotPath: 'steps/01.png' }],
    };
    expect(() => assertImprovementFinding(hollow)).toThrow(/replayable evidence/);
    expect(() => assertImprovementFinding(hollow, { requireVerificationEvidence: false })).not.toThrow();
  });

  it('will not construct or record a verified finding without replayable evidence', () => {
    const visual: VisualPlaytestFinding = {
      title: 'stall after guidance',
      severity: 'high',
      category: 'usability',
      observed: 'agent stalled at step 6',
      evidence: { screenshotPath: 'steps/06.png' },
    };
    expect(() =>
      visualPlaytestFindingToImprovementFinding(visual, { id: 'stall-1', verificationStatus: 'verified' }),
    ).toThrow(/replayable evidence/);
    const hollow: ImprovementFinding = {
      ...sampleFinding(),
      verificationStatus: 'verified',
      evidence: [{ kind: 'screenshot', screenshotPath: 'steps/06.png' }],
    };
    expect(() => improvementFindingToMarker(hollow)).toThrow(/replayable evidence/);
  });

  // full-review 2026-07-10 H2: the terminal proven claims must be as honest as
  // 'verified' — evidence + method required, not bypassable by choosing a
  // "stronger" status. The fleet treats fixed-proven as authoritative.
  for (const status of ['fixed', 'regressed'] as const) {
    it(`rejects a ${status} finding without a replayable evidence ref or method (default strict)`, () => {
      const noRef: ImprovementFinding = {
        ...sampleFinding(),
        verificationStatus: status,
        evidence: [{ kind: 'text', label: 'trust me' }],
      };
      expect(() => assertImprovementFinding(noRef)).toThrow(new RegExp(`${status}.*replayable evidence`));
      const methodless: ImprovementFinding = {
        ...sampleFinding(),
        verificationStatus: status,
        evidence: [{ kind: 'tick', tick: 250 }],
      };
      expect(() => assertImprovementFinding(methodless)).toThrow(new RegExp(`${status}.*verificationMethod`));
    });

    it(`accepts a ${status} finding carrying a replayable ref + method`, () => {
      const solid: ImprovementFinding = {
        ...sampleFinding(),
        schemaVersion: 2,
        verificationStatus: status,
        verificationMethod: 'replay',
        evidence: [{ kind: 'marker', markerId: 'm-1' }],
      };
      expect(() => assertImprovementFinding(solid)).not.toThrow();
    });

    it(`will not record a ${status} finding without evidence, but reads historical ones leniently`, () => {
      const hollow: ImprovementFinding = {
        ...sampleFinding(),
        verificationStatus: status,
        evidence: [{ kind: 'screenshot', screenshotPath: 's.png' }],
      };
      expect(() => improvementFindingToMarker(hollow)).toThrow(/replayable evidence/);
      expect(() => assertImprovementFinding(hollow, { requireVerificationEvidence: false })).not.toThrow();
    });
  }

  it('still recovers historical verified findings recorded without evidence (lenient read)', () => {
    const hollow: ImprovementFinding = {
      ...sampleFinding(),
      verificationStatus: 'verified',
      evidence: [{ kind: 'screenshot', screenshotPath: 'steps/01.png' }],
    };
    const recordedBeforeStrictDefault = JSON.parse(JSON.stringify(hollow));
    const marker: Marker = {
      id: 'm-historical',
      tick: 250,
      kind: 'annotation',
      provenance: 'game',
      data: { improvementLoop: { schemaVersion: 1, type: 'finding', finding: recordedBeforeStrictDefault } },
    };
    expect(improvementFindingsFromMarkers([marker])).toEqual([hollow]);
  });
});

describe('run manifest lifecycle', () => {
  it('builds a validated manifest with the engine version auto-filled', () => {
    const manifest = createImprovementRunManifest({
      id: 'run-2026-07-07-1',
      gameId: 'farm',
      objective: 'smoke the build',
      gitCommit: 'abc1234',
      model: 'claude-fable-5',
      provider: 'anthropic',
      seed: 'farm-seed-9',
      costUsd: 0.42,
      durationMs: 61_000,
      stopReason: 'maxSteps',
      artifacts: [{ kind: 'trace', path: 'output/run-1/trace.jsonl' }],
      gates: [{ name: 'vitest', ok: true }],
    });
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.engineVersion).toBe(ENGINE_VERSION);
    expect(() => assertImprovementRunManifest(manifest)).not.toThrow();
  });

  it('tolerates explicitly-undefined optional fields in the builder input', () => {
    const manifest = createImprovementRunManifest({ id: 'run-8', costUsd: undefined, model: undefined });
    expect(Object.keys(manifest)).not.toContain('costUsd');
    expect(Object.keys(manifest)).not.toContain('model');
    expect(() => assertImprovementRunManifest(manifest)).not.toThrow();
  });

  it('keeps a caller-supplied engineVersion instead of auto-filling', () => {
    const manifest = createImprovementRunManifest({ id: 'run-9', engineVersion: '1.4.0' });
    expect(manifest.engineVersion).toBe('1.4.0');
  });

  it('computes the minimal schema version for a next action', () => {
    expect(minimalImprovementFindingSchemaVersion('proposalOnly')).toBe(1);
    expect(minimalImprovementFindingSchemaVersion('improveHarness')).toBe(2);
  });

  it('rejects malformed manifests', () => {
    expect(() => assertImprovementRunManifest({ schemaVersion: 1, id: 'r', costUsd: -1 })).toThrow(
      /costUsd/,
    );
    expect(() =>
      assertImprovementRunManifest({ schemaVersion: 1, id: 'r', artifacts: [{ kind: 'trace' }] }),
    ).toThrow(/artifacts/);
    expect(() => assertImprovementRunManifest({ schemaVersion: 1, id: '' })).toThrow(/id/);
  });

  it('validates the extended manifest embedded as a finding sourceRun', () => {
    const finding: ImprovementFinding = {
      ...sampleFinding(),
      sourceRun: createImprovementRunManifest({ id: 'run-7', durationMs: 5 }),
    };
    expect(() => assertImprovementFinding(finding)).not.toThrow();
  });
});

describe('reverse conversion from visual findings', () => {
  it('lifts a visual finding into the durable contract with defaults and evidence mapping', () => {
    const visual: VisualPlaytestFinding = {
      title: 'Worker path is blocked',
      severity: 'high',
      category: 'rules',
      observed: 'worker accepted the move but stayed still',
      expected: 'worker moves or rejects with feedback',
      evidence: { step: 4, tick: 250, actionIndex: 1, screenshotPath: 'steps/04.png', stateLabels: ['path queue'] },
    };
    const lifted = visualPlaytestFindingToImprovementFinding(visual, { id: 'farm-block-1' });
    expect(lifted.schemaVersion).toBe(1);
    expect(lifted.id).toBe('farm-block-1');
    expect(lifted.verificationStatus).toBe('unverified');
    expect(lifted.nextAction).toBe('proposalOnly');
    expect(() => assertImprovementFinding(lifted)).not.toThrow();
    const roundTripped = improvementFindingToVisualPlaytestFinding(lifted);
    expect(roundTripped.evidence).toEqual(visual.evidence);
  });

  it('drops visual.data on lift and uses init.data instead', () => {
    const visual: VisualPlaytestFinding = {
      title: 'context-carrying finding',
      severity: 'low',
      category: 'visual',
      observed: 'observed',
      data: { harness: 'farm' },
    };
    const withoutInitData = visualPlaytestFindingToImprovementFinding(visual, { id: 'f-1' });
    expect(withoutInitData.data).toBeUndefined();
    const withInitData = visualPlaytestFindingToImprovementFinding(visual, { id: 'f-2', data: { source: 'ledger' } });
    expect(withInitData.data).toEqual({ source: 'ledger' });
  });

  it('stamps schemaVersion 2 when lifted with widened vocabulary', () => {
    const visual: VisualPlaytestFinding = {
      title: 'No affordance for age-up',
      severity: 'medium',
      category: 'usability',
      observed: 'agent kept clicking a disabled button',
    };
    const lifted = visualPlaytestFindingToImprovementFinding(visual, {
      id: 'aoe2-harness-3',
      nextAction: 'improveHarness',
    });
    expect(lifted.schemaVersion).toBe(2);
    expect(() => assertImprovementFinding(lifted)).not.toThrow();
  });
});
