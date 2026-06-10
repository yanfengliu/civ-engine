// Attachment-id safety guard shared by FileSink (sidecar file paths) and the
// corpus manifest validator (untrusted disk input). Attachment ids become
// file basenames under a bundle's attachments/ directory; reject anything
// that could resolve outside it (full-review 2026-06-10 H2: path traversal
// via crafted ids on both the write and the manifest-driven read path).

import { SinkWriteError } from './session-errors.js';

// Allowlist, not denylist: alphanumerics plus `.`, `_`, `-`, with an
// alphanumeric first character. Rules out path separators, `..` prefixes,
// Windows drive/ADS colons, NUL, and whitespace in one shot. Engine-generated
// ids are UUIDs, which pass.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;

export function isSafeAttachmentId(id: string): boolean {
  return SAFE_ID.test(id);
}

export function assertSafeAttachmentId(id: string): void {
  if (!isSafeAttachmentId(id)) {
    throw new SinkWriteError(
      `invalid attachment id ${JSON.stringify(id)}: ids must match [A-Za-z0-9][A-Za-z0-9._-]* (safe file basename)`,
      { code: 'invalid_attachment_id', id },
    );
  }
}
