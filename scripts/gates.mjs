import { spawnSync } from "node:child_process";

/**
 * One command that runs what CI runs.
 *
 * This exists because of a 47-day outage: `main` went red on 2026-07-23 and
 * stayed red for 27 consecutive pushes, every one of them behind a green local
 * gate. The gate that failed was `npm audit`, and the reason nobody ran it is
 * that it was documented as a conditional — re-run it "on a dependency change".
 * All 27 commits were docs-only, so by that rule the audit correctly did not
 * apply. But `npm audit` is TIME-dependent, not diff-dependent: a newly
 * published advisory against an unchanged transitive dev dep turns a green repo
 * red with no code change at all. A conditional keyed on the diff cannot see it.
 *
 * So the rule here is unconditional. There is no judgment call about which
 * gates a given commit needs, because that judgment is exactly what failed.
 *
 * Steps run in CI's order, and the whole list runs even after one fails, so a
 * single invocation surfaces every failure. The outage was extended by the
 * opposite habit — fix one failure, push, discover the next — which costs a
 * round trip to a remote runner per defect.
 */

/**
 * Mirrors the `test` job in .github/workflows/ci.yml.
 *
 * `npm ci` is deliberately absent: it deletes node_modules, which is the right
 * call on a fresh runner and the wrong one on a working tree. The lockfiles are
 * still covered — CI runs `npm ci` and will reject a lockfile that disagrees
 * with its manifest.
 *
 * Order is load-bearing: the mcp/ steps must follow the root build, because
 * mcp's `file:..` dependency on the engine resolves against dist/.
 */
const STEPS = [
  { name: "audit (root, full tree)", command: "npm audit --audit-level=high" },
  { name: "audit (root, prod only)", command: "npm audit --audit-level=high --omit=dev" },
  { name: "test", command: "npm test" },
  { name: "typecheck", command: "npm run typecheck" },
  { name: "lint", command: "npm run lint" },
  { name: "build", command: "npm run build" },
  { name: "pack", command: "npm pack --dry-run" },
  { name: "benchmark", command: "node scripts/rts-benchmark.mjs --check" },
  { name: "audit (mcp)", command: "npm audit --audit-level=high", cwd: "mcp" },
  { name: "build (mcp)", command: "npm run build", cwd: "mcp" },
  { name: "test (mcp)", command: "npm test", cwd: "mcp" },
];

const failed = [];

for (const step of STEPS) {
  const where = step.cwd ? ` (in ${step.cwd}/)` : "";
  console.log(`\n=== ${step.name}${where} ===\n$ ${step.command}\n`);

  // shell:true so `npm` resolves to npm.cmd on Windows; this fleet develops on
  // win32 and runs CI on ubuntu, and a gate that only works on one of them is
  // the same class of defect this script exists to catch.
  const run = spawnSync(step.command, {
    shell: true,
    stdio: "inherit",
    cwd: step.cwd,
  });

  if (run.error) {
    failed.push({ ...step, why: `could not be started: ${run.error.message}` });
  } else if (run.status !== 0) {
    failed.push({ ...step, why: `exited ${run.status}` });
  }
}

console.log(`\n${"=".repeat(60)}`);

if (failed.length === 0) {
  console.log(`Gates OK: all ${STEPS.length} steps passed.`);
  process.exit(0);
}

console.error(`Gates FAILED: ${failed.length} of ${STEPS.length} steps.\n`);
for (const step of failed) {
  const where = step.cwd ? `cd ${step.cwd} && ` : "";
  console.error(`  ${step.name} — ${step.why}`);
  console.error(`    reproduce: ${where}${step.command}`);
}
console.error(
  "\nThese are the same steps CI runs. A failure here is a failure there;" +
    "\ndo not push expecting a different result.",
);
process.exit(1);
