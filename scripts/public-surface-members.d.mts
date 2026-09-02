// Type declarations for public-surface-members.mjs
// (consumed by tests/public-surface-members.test.ts).

export type SurfaceMembers = Record<string, string[]>;

export function sourceFiles(root?: string): string[];
export function publicNames(fixturePath?: string): Set<string>;
export function scanSurfaceMembers(options?: { root?: string; names?: Set<string> }): SurfaceMembers;
export function readFixture(fixturePath?: string): SurfaceMembers;
