// The lessons queue keeps its own discipline, and this is what runs it.
//
// `npm run lessons:check` existed in package.json and appeared in NO gate and NO
// CI step — not in scripts/gates.mjs's eleven, not in .github/workflows/ci.yml.
// A check nobody runs enforces nothing, so the split between lessons.md and
// lessons-evidence.md was held together by convention alone. This test is in
// `npm test`, which IS a gate step and IS a CI step, so the discipline now has a
// machine behind it.
//
// The checks are proved against INLINE fixtures, not against the live files.
// That matters because the live files are a QUEUE whose correct steady state is
// empty: a check that asserts "at least one rule exists" turns emptying the
// queue into a failure, and a check that only reads the live files goes silently
// vacuous the moment they are emptied — indistinguishable from a parser that
// stopped finding anything. Fixtures prove the parsers still work; the live-file
// case then proves the relation holds over whatever is actually there.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EVIDENCE,
  RULES,
  checkLessons,
  parseEntries,
  parseRules,
  slugify,
} from '../scripts/check-lessons.mjs';

const RULE_HEADING = 'A test that only exercises the matched call sites passes green';
const anchor = slugify(RULE_HEADING);
const oneRule = `# Lessons\n\n## Rules\n\n- ${RULE_HEADING} ([evidence](lessons-evidence.md#${anchor})) (gate: tests/example.test.ts)\n`;
const oneEntry = `# Lessons — evidence\n\n## ${RULE_HEADING}\n\nThe war story.\n`;
const emptyRules = '# Lessons\n\n## Rules\n';
const emptyEvidence = '# Lessons — evidence\n\n## Entries\n';

describe('lessons parsers (proved against fixtures, so an empty queue cannot hide a broken parser)', () => {
  it('finds rules only under the ## Rules heading', () => {
    expect(parseRules(oneRule)).toHaveLength(1);
    expect(parseRules('# Lessons\n\n- a stray bullet above the heading\n')).toBeNull();
    expect(parseRules(emptyRules)).toEqual([]);
  });

  it('finds entry headings and skips the template example inside a fenced block', () => {
    const withTemplate = `# Lessons — evidence\n\n\`\`\`\n## <short title> — YYYY-MM-DD\n\`\`\`\n\n## ${RULE_HEADING}\n`;
    expect(parseEntries(withTemplate)).toEqual([RULE_HEADING]);
    expect(parseEntries(emptyEvidence)).toEqual([]);
  });
});

describe('lessons pairing (relations, so they hold over an empty queue and bite over a half-empty one)', () => {
  it('accepts a matched pair', () => {
    expect(checkLessons(oneRule, oneEntry)).toEqual([]);
  });

  it('accepts a fully emptied queue — that is the goal state, not a defect', () => {
    expect(checkLessons(emptyRules, emptyEvidence)).toEqual([]);
  });

  it('rejects a half-emptied queue in both directions', () => {
    // This is the shape of a lesson whose prose was deleted without its gate,
    // and of a gate landed without deleting the prose it replaced.
    expect(checkLessons(oneRule, emptyEvidence).join(' ')).toMatch(/1 rule\(s\).*0 entr/);
    expect(checkLessons(emptyRules, oneEntry).join(' ')).toMatch(/0 rule\(s\).*1 entr/);
  });

  it('rejects a rule that names no gate', () => {
    // The canon: an entry that can name no gate is not a lesson. Promote it,
    // localise it, or drop it — an index that only grows is a list of things
    // that failed to graduate.
    const gateless = oneRule.replace(' (gate: tests/example.test.ts)', '');
    expect(checkLessons(gateless, oneEntry).join(' ')).toMatch(/names no gate/);
  });

  it('rejects a rule whose evidence link resolves to nothing', () => {
    const broken = oneRule.replace(`#${anchor}`, '#no-such-entry');
    expect(checkLessons(broken, oneEntry).join(' ')).toMatch(/which no entry heading produces/);
  });

  it('rejects a rule with no evidence link at all', () => {
    const unlinked = `# Lessons\n\n## Rules\n\n- ${RULE_HEADING} (gate: tests/example.test.ts)\n`;
    expect(checkLessons(unlinked, oneEntry).join(' ')).toMatch(/no link to its evidence/);
  });

  it('rejects two rules that say the same thing', () => {
    const twice = oneRule + oneRule.split('\n').filter((l) => l.startsWith('- '))[0] + '\n';
    const twoEntries = `${oneEntry}\n## ${RULE_HEADING}\n`;
    expect(checkLessons(twice, twoEntries).join(' ')).toMatch(/Two rules say the same thing/);
  });

  it('rejects a rule too long to work as an index line', () => {
    const long = `- ${'x'.repeat(200)} ([evidence](lessons-evidence.md#${anchor})) (gate: t.ts)`;
    expect(checkLessons(`# Lessons\n\n## Rules\n\n${long}\n`, oneEntry).join(' ')).toMatch(
      /exceed 160 characters/,
    );
  });
});

describe('the live queue', () => {
  it('is in step with its evidence', () => {
    const read = (file: string): string => readFileSync(path.join(process.cwd(), file), 'utf8');
    expect(checkLessons(read(RULES), read(EVIDENCE))).toEqual([]);
  });
});
