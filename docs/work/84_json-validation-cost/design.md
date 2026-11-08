# JSON validation measurement

Candidate source changes only diagnostic-path construction in assertJsonCompatible. Existing validation, object getter enumeration order, array access order, error codes/messages/contexts and JSON fingerprints remain required. This is a validation microbenchmark on real game data, not a World.step or game-throughput benchmark.

## Inputs and method

Base engine301dd86823762bd4dd50c6170591b7b0cd8c9de9, Node24.22.1, TypeScript5.9.3. The ignored measurement-inputs.json binds all97 input/emitted module hashes for each arm and the actual AoE2 retained de-120-2p/save-24000.json (3,770,852 bytes). Both arms use the same transpiler/settings and all other modules are identical; the baseline json.ts is copied from the unchanged checkout before editing. This preparation is not a substitute for the ordinary package build or full gates.

Each sample runs in a fresh hidden Node child, imports the same modules/fixture, warms the chosen operation, requests GC, measures repeated validation using process CPU and monotonic elapsed time, then requests GC again. There are six payload families, one baseline/baseline control pair each, then five alternating baseline/candidate pairs. Counts are200,000 small records,100 component payloads,100 world-state payloads,30 complete saves,5,000 depth-200 objects and5,000 rejected inputs. CPU/wall timing excludes fixture loading, import, warmup and final GC. All72 children completed; no task-owned process remained. Root serialized this run after AoE2's full gate and before work156 focused checks and work83 gates. Other sessions' machine load was not eliminated or continuously censused.

## Observed result

| Payload | Baseline CPU ms, five samples summed | Candidate CPU ms | Reduction | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Actual saved components | 8095 | 7095 | 12.35% | Consistent across all five pairs;100 validations per sample. |
| Actual world state | 407 | 360 | 11.55% | Short samples and coarse CPU counters; no independent speedup claim. |
| Actual complete save | 2750 | 2469 | 10.22% | Directionally consistent; its baseline control pair differed26.55%. |
| Small position-like record | 328 | 312 | 4.88% | Noise is too large for a speedup claim. |
| Depth-200 object | 658 | 625 | 5.02% | Small difference; no independent speedup claim. |
| Invalid nested number | 346 | 312 | 9.83% | Exact diagnostics preserved; noisy short samples. |

For the component payload, baseline samples span1,578–1,657 CPU ms and candidate1,391–1,454 ms. Its baseline/control samples both report1,579 CPU ms. All five candidate fingerprint digests equal the baseline digest. Component peak process RSS ranges126,288–126,572 KiB for the baseline and109,832–110,436 KiB for the candidate; post-GC heap readings stay about19.887 MB in both. These process measurements include the harness, TypeScript import and materialized fixture, are not byte-accurate allocation counts, and do not establish game memory savings. The candidate's breadcrumbs retain O(nesting depth) references during a validation; callers still materialize their payloads and fingerprints.

The Windows process CPU readings are quantized; small-family A/A variation and continuing external load limit inference. The five-pair component result supports proceeding to independent source review. No FPS, whole-game, diff-generation or state-observation-policy improvement is inferred.

## Contract and controls

Before editing production,15 literal diagnostic/observation cases passed on the original validator. Candidate plus existing component/world-state/serialization tests passed96 cases. Strict typecheck passed; the first lint run rejected an intentional sparse-array literal, which was rewritten as deletion of an array element without changing the asserted hole behavior; corrected affected lint passed.

Three deliberate controls fail the intended assertions: treating object keys as array indexes changes exact contexts; removing finite-number validation accepts NaN/Infinity; retaining visited objects rejects a valid DAG as a cycle. Each control restored exact candidate bytes. Restored15-case verification passes. The original measured source SHA256 DEBE60CE1D01DB86C0B08CEF49797EE0D00ECE6C5438F4DE7ECCB943C2522B1E had mixed checkout line endings; source was subsequently normalized to LF, SHA256 F81AA43B322DB419433FCD69BED719639F0903A88B0278B2FE8F04B90F29BDA0. Emitted JavaScript equality is checked separately so this normalization does not silently change the measured program.

Raw inputs, source preimage, executable harness,72 sample records, summaries and control logs stay ignored in tmp/json-validation/. Harness SHA256 A5D28341D906BDA57C2C01C6E098D55E61CE17DBFC615D8716EE484A7A49E7E0; measurements SHA25630B451C2DAC14CC8639A1FC3F359CDF021AC60C649F652709503CF810FF70C76. The full engine gate, exact independent review, patch-version integration, hosted matrix/publication and downloaded runtime acceptance remain pending.
