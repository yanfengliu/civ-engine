import { describe, expect, it } from 'vitest';
import {
  assertImprovementFinding,
  getAiContractVersions,
  improvementFindingToMarker,
  improvementFindingToVisualPlaytestFinding,
  improvementFindingsFromMarkers,
  IMPROVEMENT_FINDING_SCHEMA_VERSION,
  type ImprovementFinding,
  type Marker,
} from '../src/index.js';

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
    expect(IMPROVEMENT_FINDING_SCHEMA_VERSION).toBe(1);
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
