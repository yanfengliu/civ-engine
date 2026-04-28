import { lstatSync, readFileSync } from 'node:fs';
import type { AttachmentDescriptor, SessionMetadata } from './session-bundle.js';
import { SESSION_BUNDLE_SCHEMA_VERSION } from './session-bundle.js';
import { corpusError } from './bundle-corpus-types.js';

export interface FileManifest {
  schemaVersion: typeof SESSION_BUNDLE_SCHEMA_VERSION;
  metadata: SessionMetadata;
  attachments: AttachmentDescriptor[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, label: string, path: string): string {
  if (typeof value !== 'string') {
    throw corpusError(`${label} must be a string`, {
      code: 'manifest_invalid',
      path,
      message: label,
    });
  }
  return value;
}

function assertInteger(value: unknown, label: string, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw corpusError(`${label} must be a finite integer`, {
      code: 'manifest_invalid',
      path,
      message: label,
    });
  }
  return value;
}

function assertNonNegativeInteger(value: unknown, label: string, path: string): number {
  const out = assertInteger(value, label, path);
  if (out < 0) {
    throw corpusError(`${label} must be non-negative`, {
      code: 'manifest_invalid',
      path,
      message: label,
    });
  }
  return out;
}

function assertCanonicalIso(value: unknown, label: string, path: string): string {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    throw corpusError(`${label} must be a normalized UTC ISO string`, {
      code: 'manifest_invalid',
      path,
      message: label,
    });
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw corpusError(`${label} must round-trip through Date.toISOString()`, {
      code: 'manifest_invalid',
      path,
      message: label,
    });
  }
  return value;
}

function validateMetadata(value: unknown, path: string): SessionMetadata {
  if (!isRecord(value)) {
    throw corpusError('manifest metadata must be an object', {
      code: 'manifest_invalid',
      path,
      message: 'metadata',
    });
  }

  const sourceKind = value.sourceKind;
  if (sourceKind !== 'session' && sourceKind !== 'scenario' && sourceKind !== 'synthetic') {
    throw corpusError('metadata.sourceKind must be session, scenario, or synthetic', {
      code: 'manifest_invalid',
      path,
      message: 'sourceKind',
    });
  }

  const failedTicks = validateFailedTicks(value.failedTicks, path);
  const metadata: SessionMetadata = {
    sessionId: assertString(value.sessionId, 'sessionId', path),
    engineVersion: assertString(value.engineVersion, 'engineVersion', path),
    nodeVersion: assertString(value.nodeVersion, 'nodeVersion', path),
    recordedAt: assertCanonicalIso(value.recordedAt, 'recordedAt', path),
    startTick: assertInteger(value.startTick, 'startTick', path),
    endTick: assertInteger(value.endTick, 'endTick', path),
    persistedEndTick: assertInteger(value.persistedEndTick, 'persistedEndTick', path),
    durationTicks: assertInteger(value.durationTicks, 'durationTicks', path),
    sourceKind,
  };

  if (value.sourceLabel !== undefined) {
    metadata.sourceLabel = assertString(value.sourceLabel, 'sourceLabel', path);
  }
  if (value.incomplete !== undefined) {
    if (value.incomplete !== true) {
      throw corpusError('metadata.incomplete must be true when present', {
        code: 'manifest_invalid',
        path,
        message: 'incomplete',
      });
    }
    metadata.incomplete = true;
  }
  if (failedTicks) {
    metadata.failedTicks = failedTicks;
  }
  if (value.policySeed !== undefined) {
    metadata.policySeed = assertInteger(value.policySeed, 'policySeed', path);
  }
  return metadata;
}

function validateFailedTicks(value: unknown, path: string): number[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw corpusError('metadata.failedTicks must be an array', {
      code: 'manifest_invalid',
      path,
      message: 'failedTicks',
    });
  }
  return value.map((tick, index) => assertInteger(tick, `failedTicks[${index}]`, path));
}

function validateAttachment(value: unknown, path: string, index: number): AttachmentDescriptor {
  if (!isRecord(value)) {
    throw corpusError(`attachments[${index}] must be an object`, {
      code: 'manifest_invalid',
      path,
      message: `attachments[${index}]`,
    });
  }

  const ref = value.ref;
  if (!isRecord(ref)) {
    throw corpusError(`attachments[${index}].ref must be an object`, {
      code: 'manifest_invalid',
      path,
      message: `attachments[${index}].ref`,
    });
  }

  const refKeys = Object.keys(ref).filter((key) => ref[key] !== undefined);
  const validRef =
    (refKeys.length === 1 && typeof ref.dataUrl === 'string') ||
    (refKeys.length === 1 && ref.sidecar === true) ||
    (refKeys.length === 1 && ref.auto === true);
  if (!validRef) {
    throw corpusError(`attachments[${index}].ref must be dataUrl, sidecar, or auto`, {
      code: 'manifest_invalid',
      path,
      message: `attachments[${index}].ref`,
    });
  }

  return {
    id: assertString(value.id, `attachments[${index}].id`, path),
    mime: assertString(value.mime, `attachments[${index}].mime`, path),
    sizeBytes: assertNonNegativeInteger(value.sizeBytes, `attachments[${index}].sizeBytes`, path),
    ref: ref as AttachmentDescriptor['ref'],
  };
}

export function readManifest(manifestPath: string): FileManifest {
  assertRegularManifestFile(manifestPath);

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf-8')) as unknown;
  } catch (error) {
    throw corpusError(`manifest parse failed: ${(error as Error).message}`, {
      code: 'manifest_parse',
      path: manifestPath,
      message: (error as Error).message,
    });
  }

  if (!isRecord(parsed)) {
    throw corpusError('manifest must be an object', {
      code: 'manifest_invalid',
      path: manifestPath,
      message: 'manifest',
    });
  }
  if (parsed.schemaVersion !== SESSION_BUNDLE_SCHEMA_VERSION) {
    throw corpusError('unsupported bundle schema version', {
      code: 'schema_unsupported',
      path: manifestPath,
      message: String(parsed.schemaVersion),
    });
  }
  if (!Array.isArray(parsed.attachments)) {
    throw corpusError('manifest attachments must be an array', {
      code: 'manifest_invalid',
      path: manifestPath,
      message: 'attachments',
    });
  }

  return {
    schemaVersion: SESSION_BUNDLE_SCHEMA_VERSION,
    metadata: validateMetadata(parsed.metadata, manifestPath),
    attachments: parsed.attachments.map((attachment, index) =>
      validateAttachment(attachment, manifestPath, index),
    ),
  };
}

function assertRegularManifestFile(manifestPath: string): void {
  let stat;
  try {
    stat = lstatSync(manifestPath);
  } catch (error) {
    throw corpusError(`manifest stat failed: ${(error as Error).message}`, {
      code: 'manifest_parse',
      path: manifestPath,
      message: (error as Error).message,
    });
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw corpusError('manifest must be a regular file', {
      code: 'manifest_invalid',
      path: manifestPath,
      message: 'manifest',
    });
  }
}
