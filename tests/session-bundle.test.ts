import { describe, expect, it } from 'vitest';
import { assertJsonCompatible } from '../src/json.js';
import {
  SESSION_BUNDLE_SCHEMA_VERSION,
  type AttachmentDescriptor,
  type Marker,
  type RecordedCommand,
  type SessionBundle,
  type SessionMetadata,
} from '../src/session-bundle.js';

const mkSnapshot = (tick = 0) => ({
  version: 5,
  config: { gridWidth: 10, gridHeight: 10, tps: 60, positionKey: 'position' },
  tick,
  entities: { generations: [], alive: [], freeList: [] },
  components: {},
  resources: { pools: {}, rates: {}, transfers: {} },
  rng: { state: '0' },
  state: {},
  tags: {},
  metadata: {},
} as unknown as SessionBundle['initialSnapshot']);

const mkMetadata = (): SessionMetadata => ({
  sessionId: '00000000-0000-0000-0000-000000000000',
  engineVersion: '0.7.7',
  nodeVersion: 'v22.14.0',
  recordedAt: '2026-04-27T00:00:00.000Z',
  startTick: 0,
  endTick: 0,
  persistedEndTick: 0,
  durationTicks: 0,
  sourceKind: 'session',
});

describe('SessionBundle types', () => {
  it('SESSION_BUNDLE_SCHEMA_VERSION is the literal 1', () => {
    expect(SESSION_BUNDLE_SCHEMA_VERSION).toBe(1);
  });

  it('a minimal SessionBundle is JSON-compatible and round-trips', () => {
    const bundle: SessionBundle = {
      schemaVersion: 1,
      metadata: mkMetadata(),
      initialSnapshot: mkSnapshot(0),
      ticks: [],
      commands: [],
      executions: [],
      failures: [],
      snapshots: [],
      markers: [],
      attachments: [],
    };
    expect(() => assertJsonCompatible(bundle, 'session bundle')).not.toThrow();
    const round = JSON.parse(JSON.stringify(bundle));
    expect(round.schemaVersion).toBe(1);
    expect(round.metadata.sessionId).toBe(bundle.metadata.sessionId);
    expect(round.initialSnapshot.tick).toBe(0);
  });

  it('Marker accepts annotation/assertion/checkpoint kinds', () => {
    const m1: Marker = { id: 'a', tick: 0, kind: 'annotation', provenance: 'game' };
    const m2: Marker = {
      id: 'b', tick: 0, kind: 'assertion', provenance: 'engine',
      data: { passed: true, failure: null },
    };
    const m3: Marker = {
      id: 'c', tick: 0, kind: 'checkpoint', provenance: 'game',
      refs: { entities: [{ id: 1, generation: 0 }], cells: [{ x: 0, y: 0 }] },
    };
    expect(m1.kind).toBe('annotation');
    expect(m2.data).toEqual({ passed: true, failure: null });
    expect(m3.refs?.entities?.[0]).toEqual({ id: 1, generation: 0 });
  });

  it('Marker.tickRange uses { from, to }', () => {
    const m: Marker = {
      id: 'x', tick: 100, kind: 'annotation', provenance: 'game',
      refs: { tickRange: { from: 50, to: 150 } },
    };
    expect(m.refs?.tickRange).toEqual({ from: 50, to: 150 });
  });

  it('Marker can carry validated:false for retroactive markers', () => {
    const m: Marker = {
      id: 'x', tick: 50, kind: 'annotation', provenance: 'game', validated: false,
    };
    expect(m.validated).toBe(false);
  });

  it('RecordedCommand carries type, data, sequence, submissionTick, result', () => {
    const rc: RecordedCommand = {
      type: 'spawn',
      data: { x: 1, y: 2 },
      sequence: 1,
      submissionTick: 5,
      result: {
        schemaVersion: 1 as never,
        accepted: true,
        commandType: 'spawn',
        code: 'ok',
        message: '',
        details: null,
        tick: 5,
        sequence: 1,
        validatorIndex: null,
      },
    };
    expect(rc.type).toBe('spawn');
    expect(rc.submissionTick).toBe(5);
    expect(rc.result.accepted).toBe(true);
  });

  it('AttachmentDescriptor accepts dataUrl and sidecar refs', () => {
    const a1: AttachmentDescriptor = {
      id: 'x', mime: 'image/png', sizeBytes: 100,
      ref: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
    };
    const a2: AttachmentDescriptor = {
      id: 'y', mime: 'application/octet-stream', sizeBytes: 65537,
      ref: { sidecar: true },
    };
    expect(a1.ref).toHaveProperty('dataUrl');
    expect(a2.ref).toHaveProperty('sidecar', true);
  });

  it('SessionMetadata records engine + node + persistedEndTick', () => {
    const md: SessionMetadata = {
      sessionId: 'abc', engineVersion: '0.7.7', nodeVersion: 'v22',
      recordedAt: '2026-04-27T00:00:00Z',
      startTick: 0, endTick: 100, persistedEndTick: 100, durationTicks: 100,
      sourceKind: 'session',
    };
    expect(md.persistedEndTick).toBe(md.endTick);
  });

  it('SessionMetadata supports incomplete + failedTicks for incomplete bundles', () => {
    const md: SessionMetadata = {
      sessionId: 'abc', engineVersion: '0.7.7', nodeVersion: 'v22',
      recordedAt: '2026-04-27T00:00:00Z',
      startTick: 0, endTick: 100, persistedEndTick: 80, durationTicks: 100,
      sourceKind: 'session',
      incomplete: true,
      failedTicks: [85],
    };
    expect(md.incomplete).toBe(true);
    expect(md.persistedEndTick).toBeLessThan(md.endTick);
    expect(md.failedTicks).toEqual([85]);
  });
});
