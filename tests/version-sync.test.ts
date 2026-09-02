import { readdirSync, readFileSync } from 'node:fs';
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

// A version bump has more than one source of truth, and this gate's reach used
// to stop at three of them — ENGINE_VERSION, the README badge, and package.json
// itself. That is a horizon, not a pin: three more committed copies existed and
// none was checked. The lockfiles' `version` fields sat at `1.4.0` (root) and
// `1.2.0` (mcp's `..` entry) against an actual `2.4.1` for roughly ten releases,
// found only during the 47-day CI outage postmortem — see
// docs/learning/defect-register.md, which records that `npm ci` does NOT check
// that field, so nothing else will ever say so. The changelog's newest heading
// is the sixth copy and the one an external reader trusts.
//
// The list below is the whole set of committed copies. Adding a seventh without
// adding it here re-opens the horizon.
const readJson = (...segments: string[]): Record<string, unknown> =>
  JSON.parse(readFileSync(path.join(process.cwd(), ...segments), 'utf8')) as Record<
    string,
    unknown
  >;

describe('lockfile version sync', () => {
  it('the root lockfile records the package version in both places', () => {
    const lock = readJson('package-lock.json') as {
      version: string;
      packages: Record<string, { version?: string }>;
    };
    expect(lock.version, 'package-lock.json top-level version').toBe(packageVersion());
    expect(lock.packages['']?.version, 'package-lock.json packages[""].version').toBe(
      packageVersion(),
    );
  });

  it("the mcp subpackage's lockfile records the linked engine's version", () => {
    // mcp depends on the engine as `civ-engine: file:..`, so its lockfile
    // carries a `".."` entry mirroring the root manifest. `npm ci` in mcp/ will
    // not complain when it goes stale, and the mcp/ steps run last in the gate
    // script, so a stale entry survives every other check.
    const lock = readJson('mcp', 'package-lock.json') as {
      packages: Record<string, { version?: string }>;
    };
    expect(lock.packages['..'], 'mcp/package-lock.json has no ".." engine entry').toBeDefined();
    expect(lock.packages['..']?.version, 'mcp/package-lock.json packages["..""].version').toBe(
      packageVersion(),
    );
  });
});

describe('changelog version sync', () => {
  it('the newest changelog heading is the shipped version', () => {
    // AGENTS.md: "one entry per version". A bump with no entry ships a release
    // an external reader cannot find migration notes for, and the changelog is
    // the surface the README tells consumers to read before upgrading.
    const changelog = readFileSync(path.join(process.cwd(), 'docs', 'changelog.md'), 'utf8');
    const newest = /^## (\d+\.\d+\.\d+)/m.exec(changelog);
    expect(newest, 'docs/changelog.md has no `## <version>` heading').not.toBeNull();
    expect(newest?.[1]).toBe(packageVersion());
  });
});

// The other direction of version-literal drift. A test that means "a version
// RELATIVE to the runtime" — cross-major, cross-minor, stale-by-one — must
// derive it from ENGINE_VERSION. A literal is only relative TODAY: the
// cross-major replay-guard test forged `engineVersion: '2.0.0'` while the
// runtime was 1.x, and the 2.0.0 bump made the forged bundle same-major, so the
// guard stopped throwing and the release nearly shipped with a red suite behind
// a changelog claiming green (the gates had been run BEFORE the bump).
//
// This fires at exactly the moment such a literal becomes wrong: the bump. That
// also makes the sibling rule mechanical — a version bump is a code change, so
// the gates must run AFTER the last file of it, and this is one of the things
// that run only says something about once package.json has moved.
//
// Historical literals ('0.7.7' legacy bundles, '0.8.17' benchmark baselines) are
// absolute by intent and unaffected; the check is scoped to the CURRENT version
// precisely so it has no exemption list to rot.
describe('no test hardcodes the current runtime version', () => {
  it('every version literal in tests/ is either historical or derived', () => {
    const current = packageVersion();
    const offenders: string[] = [];
    let scanned = 0;
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts')) {
          // This file legitimately compares against package.json's value.
          if (full.endsWith('version-sync.test.ts')) continue;
          scanned += 1;
          readFileSync(full, 'utf8')
            .split(/\r?\n/)
            .forEach((line, index) => {
              if (line.includes(`'${current}'`) || line.includes(`"${current}"`)) {
                offenders.push(`${full}:${index + 1}: ${line.trim()}`);
              }
            });
        }
      }
    };
    walk(path.join(process.cwd(), 'tests'));

    // Control: an empty offender list from a walk that visited nothing is
    // indistinguishable from a clean tree. Prove the instrument ran.
    expect(scanned, 'the version-literal scan visited no test files').toBeGreaterThan(50);

    expect(
      offenders,
      `A test hardcodes the version the runtime now has ("${current}"). If it means a ` +
        `version RELATIVE to ENGINE_VERSION (cross-major, cross-minor, stale-by-one), ` +
        `derive it — a literal that is relative today stops being relative at the next ` +
        `bump, and the guard it tests silently stops guarding.`,
    ).toEqual([]);
  });
});
