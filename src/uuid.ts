import { EngineError } from './engine-error.js';

// Portable UUID for session/marker ids. The recorder and scenario-bundle
// helpers must load in browsers and workers, where a `node:crypto` import
// fails module resolution and takes the embedding game bundle down with it.
// Ids are metadata, not simulation state, so PRNG discipline does not apply.
export function portableRandomUUID(): string {
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  if (!cryptoObj?.getRandomValues) {
    throw new EngineError(
      'uuid_crypto_unavailable',
      'portableRandomUUID requires a WebCrypto implementation (globalThis.crypto)',
    );
  }
  const bytes = new Uint8Array(16);
  cryptoObj.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
