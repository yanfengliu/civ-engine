import { describe, expect, it } from 'vitest';
import {
  SessionRecordingError,
  MarkerValidationError,
  RecorderClosedError,
  SinkWriteError,
  BundleVersionError,
  BundleRangeError,
  BundleIntegrityError,
  ReplayHandlerMissingError,
} from '../src/session-errors.js';

describe('SessionRecordingError hierarchy', () => {
  it('all subclasses extend SessionRecordingError', () => {
    expect(new MarkerValidationError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new RecorderClosedError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new SinkWriteError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new BundleVersionError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new BundleRangeError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new BundleIntegrityError('m')).toBeInstanceOf(SessionRecordingError);
    expect(new ReplayHandlerMissingError('m')).toBeInstanceOf(SessionRecordingError);
  });

  it('subclasses are not interchangeable via instanceof', () => {
    expect(new MarkerValidationError('m')).not.toBeInstanceOf(SinkWriteError);
    expect(new RecorderClosedError('m')).not.toBeInstanceOf(BundleVersionError);
    expect(new BundleRangeError('m')).not.toBeInstanceOf(BundleIntegrityError);
  });

  it('errors carry name + message', () => {
    const e = new BundleRangeError('tick out of range', { code: 'too_high', tick: 1000 });
    expect(e.name).toBe('BundleRangeError');
    expect(e.message).toBe('tick out of range');
    expect(e.details).toEqual({ code: 'too_high', tick: 1000 });
  });

  it('details defaults to undefined', () => {
    const e = new MarkerValidationError('bad marker');
    expect(e.details).toBeUndefined();
  });

  it('RecorderClosedError supports a code field via details', () => {
    const e = new RecorderClosedError('poisoned', { code: 'world_poisoned' });
    expect(e.details).toEqual({ code: 'world_poisoned' });
  });

  it('MarkerValidationError carries an optional referencesValidationRule top-level field', () => {
    const e1 = new MarkerValidationError('bad ref', { field: 'refs.entities[0]' }, '6.1.entity_liveness');
    expect(e1.referencesValidationRule).toBe('6.1.entity_liveness');
    expect(e1.details).toEqual({ field: 'refs.entities[0]' });

    const e2 = new MarkerValidationError('also bad');
    expect(e2.referencesValidationRule).toBeUndefined();
  });

  it('errors are throwable + stack-traceable', () => {
    expect(() => { throw new SinkWriteError('disk full'); }).toThrow(SinkWriteError);
    try {
      throw new BundleIntegrityError('replay across failure', { code: 'replay_across_failure' });
    } catch (e) {
      expect(e).toBeInstanceOf(BundleIntegrityError);
      expect((e as BundleIntegrityError).message).toBe('replay across failure');
    }
  });
});
