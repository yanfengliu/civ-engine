import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from '../src/version.js';

// Release-discipline pin. src/version.ts is a hand-maintained literal (it
// avoids process.env.npm_package_version so the constant is set outside
// `npm run` too), so a version bump that edits package.json but forgets
// version.ts ships a package whose recorded bundles and run manifests stamp
// the wrong engineVersion — silently, because every other test compares the
// constant against itself. This makes the two sources disagree loudly.
const packageVersion = (): string =>
  (
    JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
      version: string;
    }
  ).version;

describe('ENGINE_VERSION sync', () => {
  it('matches package.json version', () => {
    expect(ENGINE_VERSION).toBe(packageVersion());
  });
});

// The README version badge is the third hand-maintained copy of the version,
// and AGENTS.md requires every bump to update it. Nothing enforced that: no
// test, script, or CI step read README.md at all, so the badge was convention
// only — the same unpinned-duplicate shape that let ENGINE_VERSION drift at
// 2.2.0. It has never actually drifted; this keeps it that way.
describe('README version badge sync', () => {
  it('matches package.json version', () => {
    const readme = readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
    const badge = /!\[version\]\(https:\/\/img\.shields\.io\/badge\/version-([^-]+)-/.exec(
      readme,
    );
    expect(badge, 'README.md is missing the version badge').not.toBeNull();
    expect(badge?.[1]).toBe(packageVersion());
  });
});
