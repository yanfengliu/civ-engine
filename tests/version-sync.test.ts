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
describe('ENGINE_VERSION sync', () => {
  it('matches package.json version', () => {
    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version: string };
    expect(ENGINE_VERSION).toBe(pkg.version);
  });
});
