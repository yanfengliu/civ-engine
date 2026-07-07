# Visual Playtest Harness Plan

## Implementation

1. Add failing tests for the visual loop, hidden-state prompt modes, redaction, coded invalid config, and finding-to-marker round trip.
2. Add `src/visual-playtest-types.ts` for the public type vocabulary and `src/visual-playtest.ts` for the runner/helpers.
3. Export the new runtime helpers and types through `src/index.ts`; update `tests/fixtures/public-surface.json`.
4. Bump the package from `1.2.0` to `1.3.0` in `package.json`, `package-lock.json`, and `src/version.ts`.
5. Document the new surface in README, API reference, docs hub, AI integration guide, AI playtester guide, architecture docs, drift log, ADRs, changelog, and devlog.
6. Run targeted tests, full gates, and adversarial review; resolve real findings before closing.

## Verification

- `npm test -- tests/visual-playtest.test.ts tests/public-surface.test.ts`
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Adversarial review with doc-accuracy prompt
