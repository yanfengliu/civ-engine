# Review 1: implementation

## Target

Retained native A captures from Townscaper's GPU sweep `run-4a1190cf-b4f8-4ba7-9503-be5320c7ea37`, corresponding to production source reviewed at tree `735ca09dd0881e4f59ff7b0e68961d81cc6ce8bd`. Report SHA256 `DF43356E024BEC6A987FBACBDD879AAFCA864FF60F0D9107F3CF1B1392D41382`. Full images and run receipts remain ignored under `output/engine-pin-1107/`; native image hashes and implementer inspection notes are in `native-inspection.json`, SHA256 `7FF6F5B5DB9464878FEC0C78069A21C35ECADE5531791C7A3C34CDF5A63F640D`.

## Reviewers and coverage

publisher_review, independent native Astra/xhigh lane. Independently inspected 22 original-resolution PNGs and retained run evidence. The implementer separately inspected all 168 original-resolution A frames; this does not expand the reviewer's own sample.

## Reports

### publisher_review

Townscaper native-capture review — publisher_review, independent native Astra/xhigh lane, 2026-11-07.

Target and coverage: inspected 22 retained A PNGs with view_image detail=original, without resizing, mosaics or derivatives, from C:\Users\38909\Documents\worktrees\townscaper-engine-pin-1107\townscaper\output\engine-pin-1107\sweep\run-4a1190cf-b4f8-4ba7-9503-be5320c7ea37. This supplements the exact source review of Town tree 735ca09dd0881e4f59ff7b0e68961d81cc6ce8bd against f0123b88051dfaf6665c4ea7c901fed956837954; it is not a new source-tree review. The original 20 sampled PNG headers independently confirmed 3840×1843; the two additional dense-grid random-5 frames were also opened at original detail.

Exact inspected paths are the capture root above plus:
- single-cell\moebius-close-front.png; single-cell\painted-mid-high.png; single-cell\moebius-random-2.png; single-cell\painted-random-5.png.
- tall-stack\moebius-close-low.png; tall-stack\painted-side.png; tall-stack\moebius-random-4.png; tall-stack\painted-random-1.png.
- courtyard-ring\moebius-mid-high.png; courtyard-ring\painted-close-rear.png; courtyard-ring\moebius-random-3.png; courtyard-ring\painted-random-6.png.
- stilted-span\moebius-close-front.png; stilted-span\painted-mid-low.png; stilted-span\moebius-random-5.png; stilted-span\painted-random-4.png.
- dense-grid\moebius-close-rear.png; dense-grid\painted-far.png; dense-grid\moebius-random-1.png; dense-grid\painted-random-3.png; dense-grid\moebius-random-5.png; dense-grid\painted-random-5.png.

Findings: no material visual defect observed in this sample. Both styles render coherent building masses, roofs, windows, rails, signs, docks and surrounding water. Wider/random views retain the complete tall structures and dense scene; the close views crop some rooftops or scene edges through camera framing, so those frames alone do not establish complete-object visibility. The courtyard remains open, and the stilted span's passage/support geometry is visible in the wider alternate view. I saw no blank/error frame, grossly missing or exploded geometry, or isolated distracting surface corruption. This is a bounded static-image judgment and does not independently prove absence of motion shimmer or establish a before/after visual equivalence baseline.

Retained evidence read: report.json records 168 captures, 168 poses/measurements, six scenes, explorationSeed 20260929, jitterTheta 0.0002, mutation none, shadows true, instrumentErrors [] and detections []. Its SHA256 is DF43356E024BEC6A987FBACBDD879AAFCA864FF60F0D9107F3CF1B1392D41382. The dense-grid random-5 measurements contain one speckle tile (and one changed tile for moebius), despite the empty final detections array; I additionally inspected both corresponding A images and found no material static artifact. Therefore phrase the automation result as zero detector findings, not zero changed pixels/tiles or a visual proof of no shimmer.

The adjacent sweep-browser-environment.json records engine 2.9.1 resolved from the served Vite civ-engine module, errors [], and ANGLE NVIDIA RTX 4090 Direct3D11. sweep-results.json records environment and sweep exit 0. sweep-process-receipt.json records 27 observed owned processes and leftovers []; these are retained producer receipts, not live process verification by this reviewer. No browser/GUI process was launched, no checks were rerun, and no files were changed. No new acceptance blocker from this independent sample; your full 168-frame inspection and root's delivery checks remain separately attributable.

## Findings and disposition

No material visual finding. Accepted evidence bounds: zero detector findings does not mean zero changed tiles; static inspection does not prove temporal shimmer absence or before/after equivalence. The implementer's complete 168-frame notes also record camera cropping and fine isolated roof marks without attributing them to this dependency-only change.

## Verification

The implementer ran the full sweep on headless Chromium using ANGLE NVIDIA RTX 4090 Direct3D11, six scenes × fourteen fixed/random views × two styles, seed 20260929; 168 captures and no instrument errors or detector findings. It exited 0 in 402.072 seconds, with 27 owned processes and zero leftovers. All 168 PNG headers verify 3840×1843; each frame was actually opened with original detail and bound to SHA256 in the retained inspection manifest. The ignored gallery links the full-resolution images one per row, newest first. No gameplay or renderer bytes changed.

## Round outcome

The independent native sample found no acceptance blocker. Complete implementer inspection is retained separately. Delivery and final resource cleanup remain integration-owner work.
