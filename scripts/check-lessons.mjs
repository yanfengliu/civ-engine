import { readFileSync } from "node:fs";

/**
 * Lessons live in two files on purpose.
 *
 * `lessons.md` is the one-line rule for each lesson and is what a session reads
 * at start. `lessons-evidence.md` holds the war stories and anchors and is
 * opened only when a rule is in doubt. Telling an agent to read part of one
 * large file does not work — reading a file reads all of it — so the split is
 * what actually keeps the session-start cost small.
 *
 * Two files, not one per lesson. Anthropic's progressive-disclosure guidance
 * groups reference material by domain rather than by item, and expects a
 * reference file of a hundred-odd lines to be normal. Split the evidence file by
 * subsystem if it outgrows that; splitting per lesson would trade a cheap read
 * for dozens of files and make reading all the lessons about one subsystem
 * expensive again.
 *
 * Splitting is only safe if the halves cannot drift, which is what this checks:
 * every rule has an entry, every entry has a rule, and every link resolves.
 *
 * TWO THINGS CHANGED ON 2026-09-02, and both are why this file is a module now.
 *
 * 1. The file is a QUEUE, not an index. Its entries are deleted in the commit
 *    that lands their gates, so the correct steady state is EMPTY. The old
 *    non-vacuity checks ("lists no rules", "holds no entries") turned emptying
 *    the queue — the thing the canon asks for — into a failure. They are gone.
 *    What replaces them: the parsers are proved against inline fixtures below,
 *    so an empty live file cannot be confused with a parser that stopped
 *    finding things, and a HALF-emptied queue is still a hard failure.
 *
 * 2. A rule must NAME THE GATE IT IS WAITING FOR. The canon: "an entry that can
 *    name no gate is not a lesson" — fleet-wide knowledge goes to
 *    canon-candidates.md, repo-only knowledge to docs/policies/local-rules.md,
 *    and the rest is folklore and is dropped. An index that only grows is a list
 *    of things that failed to graduate.
 *
 * This module is executed as a CLI by `npm run lessons:check` AND asserted by
 * tests/lessons-pairing.test.ts, which is what `npm test` — and therefore
 * `npm run gates` and CI — actually run. Before that test existed, this script
 * was in package.json and in no gate, on no CI step, so it enforced nothing.
 */
export const RULES = "docs/learning/lessons.md";
export const EVIDENCE = "docs/learning/lessons-evidence.md";

/** GitHub's heading anchor: lowercased, punctuation dropped, spaces hyphenated. */
export function slugify(heading) {
  return heading
    .toLowerCase()
    .replace(/[`'’"]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** The `- ` bullets under `## Rules`. */
export function parseRules(text) {
  const lines = text.split(/\r?\n/);
  const heading = lines.indexOf("## Rules");
  if (heading < 0) return null;
  return lines.slice(heading + 1).filter((line) => line.startsWith("- "));
}

/** The `## ` headings, skipping template examples inside fenced blocks. */
export function parseEntries(text) {
  let fenced = false;
  const entries = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trimStart().startsWith("```")) fenced = !fenced;
    else if (!fenced && line.startsWith("## ") && line.slice(3).trim() !== "Entries") {
      entries.push(line.slice(3).trim());
    }
  }
  return entries;
}

/**
 * Returns the list of problems; empty means the two halves are in step.
 *
 * Deliberately vacuous on two empty files: an emptied queue is the goal state,
 * not a defect. Every check below is a RELATION between the halves, so it holds
 * over nothing and bites the moment either half is non-empty.
 */
export function checkLessons(rulesText, evidenceText) {
  const problems = [];
  const rules = parseRules(rulesText);
  if (rules === null) {
    return [`${RULES} has no "## Rules" section; session start reads that`];
  }
  const entries = parseEntries(evidenceText);

  if (rules.length !== entries.length) {
    problems.push(
      `${RULES} lists ${rules.length} rule(s) but ${EVIDENCE} holds ${entries.length} ` +
        `entr(y|ies). A session reading only the rules would miss the difference — and a ` +
        `half-emptied queue is the shape of a lesson deleted without its gate. Entries: ` +
        `${entries.map((entry) => `"${entry}"`).join(", ") || "(none)"}`,
    );
  }

  const anchors = new Set(entries.map(slugify));
  for (const rule of rules) {
    const link = /\[evidence\]\(lessons-evidence\.md#([a-z0-9-]+)\)/.exec(rule);
    if (!link) {
      problems.push(`A rule has no link to its evidence, so nobody can reach it: ${rule.slice(0, 120)}`);
      continue;
    }
    if (!anchors.has(link[1])) {
      problems.push(
        `A rule links to "${link[1]}", which no entry heading produces. ` +
          `Available: ${[...anchors].join(", ") || "(none)"}`,
      );
    }
  }

  // The canon's queue rule, made mechanical. A rule that can name no gate is
  // not a lesson: promote it (canon-candidates.md), localise it
  // (docs/policies/local-rules.md), or drop it.
  for (const rule of rules) {
    if (!/\(gate:\s*\S[^)]*\)/.test(rule)) {
      problems.push(
        `A rule names no gate, so nothing will ever retire it: ${rule.slice(0, 120)}. ` +
          `Add "(gate: <test file / rule id / command>)" naming the gate it is waiting for. ` +
          `If no gate can be named, this is not a lesson — stage it in ` +
          `docs/learning/canon-candidates.md if it is fleet-wide, put it in ` +
          `docs/policies/local-rules.md if it is repo-only, or drop it.`,
      );
    }
  }

  // The index earns its keep only by staying short.
  const overlong = rules.filter(
    (rule) => rule.replace(/\s*\(\[evidence\].*$/, "").replace(/\s*\(gate:[^)]*\)/, "").length > 160,
  );
  if (overlong.length > 0) {
    problems.push(
      `${overlong.length} rule(s) exceed 160 characters before their link, which defeats an ` +
        `index. First: ${overlong[0].slice(0, 120)}…`,
    );
  }

  const seen = new Set();
  for (const rule of rules) {
    const text = rule.replace(/\s*\(\[evidence\].*$/, "");
    if (seen.has(text)) problems.push(`Two rules say the same thing, so two entries teach it: ${text}`);
    seen.add(text);
  }

  return problems;
}

export function readPair() {
  const read = (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return null;
    }
  };
  return { rules: read(RULES), evidence: read(EVIDENCE) };
}

if (process.argv[1]?.endsWith("check-lessons.mjs")) {
  const { rules, evidence } = readPair();
  if (rules === null || evidence === null) {
    console.error(
      `Lessons check failed: ${rules === null ? RULES : EVIDENCE} is missing; the rules index ` +
        `and its evidence are both required, even when empty.`,
    );
    process.exit(1);
  }
  const problems = checkLessons(rules, evidence);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`Lessons check failed: ${problem}`);
    process.exit(1);
  }
  const count = parseRules(rules)?.length ?? 0;
  console.log(
    count === 0
      ? `Lessons check passed: the queue in ${RULES} is empty, which is the goal state.`
      : `Lessons check passed: ${count} rule(s) in ${RULES}, each linked to an entry in ${EVIDENCE} and each naming its gate.`,
  );
}
