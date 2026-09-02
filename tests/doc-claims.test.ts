// A doc sweep that greps names verifies the NOUNS, never the VERBS.
//
// This repo's only doc gate was AGENTS.md's "grep removed/renamed API names
// across docs/". By that standard the README was clean — an automated check
// confirmed all ~180 API-shaped identifiers resolved to real exports — and five
// provably-false technical claims passed it anyway, because each was built
// entirely from valid names. `world.transaction()` exists; generation counters
// exist; core throws do carry codes; a system pipeline exists. The falsehood
// lived in the PREDICATE: what the doc said those things do. A name-grep is a
// spell-checker for APIs, so the claims it certifies are exactly the ones that
// rot silently, because they look verified.
//
// Three lessons converge here and this file is the one gate for all three:
//
//  1. Condensing prose REGENERATES claims. A rewrite authors new sentences, and
//     a shorter sentence about a gated invariant is exactly where a qualifier
//     dies. The verbatim pins below make a rewrite of a load-bearing sentence
//     FAIL, so the new text gets read against live source instead of against
//     the old text.
//  2. A sweep scoped to API names is blind to PROCESS claims. Those go stale
//     from a policy or workflow commit, not a code change — the banner promised
//     "mandatory multi-CLI review" for 15 days after the policy that made it
//     true was replaced. `kind: "process"` claims are checked against the live
//     constitution and workflow, not against src/.
//  3. Fan-out audits miss cross-surface duplication. A fact duplicated across
//     surfaces gets fixed only where the assigned agent looked, and a partial
//     fix is worse than none because the corrected copies contradict the missed
//     ones. A claim here lists EVERY surface that carries it, and all of them
//     must agree.
//
// So each pinned claim is checked twice, and the two checks fail for opposite
// reasons:
//   - the QUOTE must appear verbatim in every surface listed  → the doc changed
//   - the PREDICATE must hold against live code/config          → the world changed
// A claim with no predicate is not pinned; the roster test below refuses one.
//
// What to do when this fails: do not re-word the fixture to match the doc. Read
// the NEW sentence against the code path it describes, decide which of the two
// is wrong, fix that one, and only then update the pin. Treat "carried over
// verbatim, still compiles, names all valid" as UNVERIFIED, not safe.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  World,
  assertImprovementFinding,
  type ImprovementFinding,
  type TickDiff,
  type WorldConfig,
} from '../src/index.js';

interface Surface {
  doc: string;
  quote: string;
}
interface Claim {
  id: string;
  kind: 'behavioral' | 'process';
  why: string;
  surfaces: Surface[];
}

const root = process.cwd();
const read = (file: string): string => readFileSync(path.join(root, file), 'utf8');
const claims = JSON.parse(read(path.join('tests', 'fixtures', 'doc-claims.json'))) as Claim[];
const readme = (): string => read('README.md');

const mkConfig = (over: Partial<WorldConfig> = {}): WorldConfig => ({
  gridWidth: 8,
  gridHeight: 8,
  tps: 60,
  positionKey: 'position',
  ...over,
});

/**
 * One executable assertion per claim, checking what the sentence ASSERTS —
 * not that its identifiers exist. Keyed by claim id; the roster test below
 * fails if a fixture entry has no predicate here, so the fixture cannot grow
 * an unverified claim.
 */
const predicates: Record<string, () => void> = {
  'transaction-atomicity': () => {
    // Half one: a precondition failure applies nothing.
    const world = new World(mkConfig({ strict: false }));
    world.registerComponent<{ hp: number }>('health');
    const entity = world.createEntity();
    world.setComponent(entity, 'health', { hp: 10 });
    const refused = world
      .transaction()
      .setComponent(entity, 'health', { hp: 99 })
      .require(() => false)
      .commit();
    expect(refused.ok, 'a failing precondition must refuse the commit').toBe(false);
    expect(world.getComponent(entity, 'health'), 'nothing may be applied').toEqual({ hp: 10 });

    // Half two — the half the README used to deny. A mutation that THROWS
    // mid-commit leaves partial state and consumes the transaction; there is
    // no rollback on the throw path. If this ever starts rolling back, the
    // docs' parenthetical is the thing that became false.
    const partial = new World(mkConfig({ strict: false }));
    partial.registerComponent<{ hp: number }>('health');
    const a = partial.createEntity();
    partial.setComponent(a, 'health', { hp: 1 });
    const tx = partial
      .transaction()
      .setComponent(a, 'health', { hp: 2 })
      // A non-JSON value is rejected by the same validation a direct write
      // gets, and it throws from inside commit() after the first mutation
      // already landed.
      .setComponent(a, 'health', { hp: (() => undefined) as unknown as number });
    expect(() => tx.commit()).toThrow();
    expect(
      partial.getComponent(a, 'health'),
      'the earlier buffered mutation must have been applied — this is the "leaves partial state" claim',
    ).toEqual({ hp: 2 });
    expect(() => tx.commit(), 'the transaction must be consumed, not retryable').toThrow();
  },

  'tick-lifecycle-equality': () => {
    const world = new World(mkConfig({ strict: false }));
    const observed: Array<{ worldTick: number; diffTick: number }> = [];
    world.onDiff((diff: TickDiff) => {
      observed.push({ worldTick: world.tick, diffTick: diff.tick });
    });
    world.step();
    world.step();
    expect(observed.length, 'the onDiff listener never ran — the check proves nothing').toBe(2);
    for (const seen of observed) {
      expect(
        seen.worldTick,
        'listeners must observe world.tick === diff.tick (increment THEN notify)',
      ).toBe(seen.diffTick);
    }
  },

  'evidence-required-statuses': () => {
    // A schema-invalid fixture would throw for the WRONG reason and make this
    // check vacuous — it did, on the first draft: every status threw
    // "severity is not supported" and the predicate would have passed with the
    // evidence gate deleted. So: a fully valid finding, and the assertion is on
    // the failure REASON, not on the fact that something threw.
    const valid = (): ImprovementFinding => ({
      schemaVersion: 1,
      id: 'doc-claim-evidence-gate',
      title: 'pinned by tests/doc-claims.test.ts',
      severity: 'medium',
      category: 'usability',
      observed: 'a claim with no replayable evidence',
      evidence: [{ kind: 'text', label: 'trust me' }],
      verificationStatus: 'unverified',
      nextAction: 'proposalOnly',
    });

    // Control: the fixture itself is accepted, so a later failure is about the
    // status and nothing else.
    expect(() => assertImprovementFinding(valid())).not.toThrow();

    // All three proven-outcome statuses must reject an evidence-free claim BY
    // DEFAULT (no options passed — "by default" is what the README promises).
    // The README naming only `fixed`/`regressed` is the exact understatement
    // that shipped; `verified` has been gated since 2.0.0 and is the one a
    // condensation drops, because the source calls `fixed`/`regressed` "the
    // terminal claims" in contrast to it.
    for (const status of ['verified', 'fixed', 'regressed'] as const) {
      expect(
        () => assertImprovementFinding({ ...valid(), verificationStatus: status }),
        `an evidence-free "${status}" claim must be refused by default`,
      ).toThrow(/replayable evidence|verificationMethod/);
    }

    // And the ungated ones must stay ungated, or the claim overstates instead.
    for (const status of ['unverified', 'falsePositive'] as const) {
      expect(
        () => assertImprovementFinding({ ...valid(), verificationStatus: status }),
        `"${status}" is not a proven-outcome claim and must stay ungated`,
      ).not.toThrow();
    }
  },

  'strict-default-and-legacy-carve-out': () => {
    expect(new World(mkConfig()).strict, 'strict must be ON by default').toBe(true);
    expect(new World(mkConfig({ strict: false })).strict, '`strict: false` must opt out').toBe(
      false,
    );

    // The carve-out the condensation dropped: a pre-flip snapshot (version <= 5)
    // that omits `strict` must deserialize NON-strict, or every legacy bundle
    // replay breaks under the flipped default.
    const source = new World(mkConfig({ strict: false }));
    const snapshot = source.serialize() as unknown as {
      version: number;
      config: Record<string, unknown>;
    };
    const legacy = { ...snapshot, version: 5, config: { ...snapshot.config } };
    delete legacy.config.strict;
    expect(
      World.deserialize(legacy as never).strict,
      'a legacy snapshot with no `strict` key must not be promoted to strict',
    ).toBe(false);
  },

  'node-baseline': () => {
    const pkg = JSON.parse(read('package.json')) as { engines?: { node?: string } };
    expect(pkg.engines?.node, 'README promises Node 20+; package.json must agree').toBe('>=20');
    const ci = read(path.join('.github', 'workflows', 'ci.yml'));
    expect(
      /node-version:\s*\[[^\]]*\b20\b/.test(ci),
      'README promises Node 20+, so CI must keep a job proving it',
    ).toBe(true);
  },

  'engine-dist-rolling': () => {
    const ci = read(path.join('.github', 'workflows', 'ci.yml'));
    expect(ci, 'the install path names a rolling engine-dist release').toContain('engine-dist');
    expect(
      /if:\s*github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/.test(ci),
      'the README says engine-dist always tracks main, so the job must be gated on push-to-main',
    ).toBe(true);
    expect(ci, 'the rolling tag is refreshed by re-uploading over it').toContain('--clobber');
  },

  'review-posture': () => {
    // A process claim's authority is the constitution, not src/. This is the
    // trigger a code-anchored sweep structurally cannot have: the sentence goes
    // stale when a POLICY commit lands.
    const agents = read('AGENTS.md');
    // The anchor must be the sentence that makes the claim TRUE, not a token
    // that happens to appear elsewhere. A first draft asserted only that
    // AGENTS.md contained "multi-cli-review", and deleting the high-risk
    // escalation rule left the gate green — the string still appeared in the
    // unrelated "reviewer model pins live in multi-cli-review.md" line. Bind
    // the two halves of the claim together instead.
    expect(
      /High-risk work[^\n]*multi-cli-review/.test(agents),
      'README says high-risk work escalates to multi-CLI review; AGENTS.md must still route it there',
    ).toBe(true);
    expect(
      /independent (harsh )?critic/i.test(agents),
      'README says adversarial review is the default posture; AGENTS.md must still require it',
    ).toBe(true);
    // And the posture the banner used to overstate must not come back unnoticed:
    // "mandatory multi-CLI review" was true when written and false 15 days later.
    const banner = readme().split(/\r?\n/).find((line) => line.startsWith('> **Post-1.0'));
    expect(banner, 'the README status banner is gone').toBeDefined();
    expect(/mandatory|non-negotiable/i.test(banner!), 'the banner overstates the review guarantee')
      .toBe(false);
  },

  'semver-posture': () => {
    const agents = read('AGENTS.md');
    expect(
      agents,
      'the banner promises breaking changes only as majors; AGENTS.md must still say so',
    ).toContain('(major) = breaking changes ONLY');
    expect(
      agents,
      'the banner promises removals go through the deprecation policy',
    ).toContain('deprecate in a minor, remove in the next major');
  },
};

describe('doc claims — the sentence still says it', () => {
  for (const claim of claims) {
    for (const surface of claim.surfaces) {
      it(`${claim.id}: ${surface.doc} still carries the pinned wording`, () => {
        expect(
          read(surface.doc),
          `The pinned claim "${claim.id}" is no longer in ${surface.doc} verbatim. ` +
            `Condensing or rewording REGENERATES the claim: the new sentence is evidence-free ` +
            `prose no matter how accurate the old one was. Read it against live source, then ` +
            `update tests/fixtures/doc-claims.json. Why this one is pinned: ${claim.why}`,
        ).toContain(surface.quote);
      });
    }
  }
});

describe('doc claims — the sentence is still true', () => {
  for (const claim of claims) {
    it(`${claim.id}: the live ${claim.kind} behaviour matches the claim`, () => {
      const predicate = predicates[claim.id];
      expect(predicate, `no predicate for pinned claim "${claim.id}"`).toBeDefined();
      predicate!();
    });
  }
});

describe('doc claims — the roster cannot silently shrink', () => {
  it('every fixture claim has a predicate and every predicate has a fixture claim', () => {
    // Horizon guard. A pinned-claim gate proves nothing about the sentences it
    // does not list, so the two halves must stay in step: dropping a claim from
    // the fixture without dropping its predicate is how coverage quietly
    // shrinks back to a name-grep.
    expect(Object.keys(predicates).sort()).toEqual(claims.map((c) => c.id).sort());
    expect(claims.length).toBeGreaterThan(0);
  });

  it('the README states no absolutist process claim that is not pinned', () => {
    // The generalisation of the banner defect. A process claim is load-bearing
    // for consumer trust and invisible to every code-anchored check, so it
    // survives indefinitely until a human reads the page. This makes adding an
    // unpinned one impossible rather than merely discouraged.
    const readme = read('README.md');
    const pinned = claims
      .flatMap((claim) => claim.surfaces)
      .filter((surface) => surface.doc === 'README.md')
      .map((surface) => surface.quote);

    const absolutist = /\b(mandatory|non-negotiable|guaranteed|every commit|always|never|all-or-nothing|100%)\b/i;
    const unpinned: string[] = [];
    readme.split(/\r?\n/).forEach((line, index) => {
      if (!absolutist.test(line)) return;
      if (pinned.some((quote) => line.includes(quote))) return;
      unpinned.push(`README.md:${index + 1}: ${line.trim().slice(0, 160)}`);
    });

    expect(
      unpinned,
      'This line makes an absolute claim about how the project behaves, reviews, versions or ' +
        'releases itself, and nothing checks it. Such a claim goes stale from a policy or ' +
        'workflow commit that renames nothing, so no API-name sweep will ever surface it. ' +
        'Either soften the wording, or add it to tests/fixtures/doc-claims.json with a ' +
        'predicate that fails when it stops being true.',
    ).toEqual([]);
  });
});
