# Debugging session — FileSink JSONL reader

## Symptom

E11/E13 report aggregate Node string-limit failures and false streaming prose. Exact bytes broken\nbroken also hide a completed malformed first line because its text matches the final unterminated tail.

## Expected vs actual

- Expected: bounded UTF-8 iteration, physical LF/EOF classification, first-next byte horizon and owned descriptor cleanup.
- Actual baseline57de5ce: readFileSync/split/parse-all, with tail classification by text equality.

## Reproduction

Existing file-sink harness comes first; World replay/profiling instruments do not answer filesystem byte-boundary questions. tests/file-sink-reader.test.ts pins all five public iterators and literal65,536-byte bounds. No scratch World probe was written.

## Hypotheses

Source confirms eager whole-file allocation and content-vs-position classification. No unrelated World or format hypothesis is needed.

## Investigation log

-2026-10-02: prior12-file source audit revalidated; initial183 tests returned native1,115failed/68passed, including concrete repeated-line failures.
- 2026-10-02: candidate1 returned native0/all183 PASS. The later root typecheck found six malformed-byte rows had numeric callback arguments and zero loop iterations; these earlier passes do not prove malformed-byte coverage. Original source/test snapshots and source-checks-1 native type/lint failures are retained.
- 2026-10-02: repair1/5 changed those rows to objects and added an exercised-count assertion; helper close precedence moved outside finally for lint. Corrected225 tests, root typecheck and scoped lint returned0.
- 2026-10-02: the literal original-array callback control failed six exercised-count assertions at runtime. Five reader mutants failed10/5/5/5/30 selected cases; exact restoration then passed225 with no skips. All Jobs proved cleanup/active0.

## Root cause

The shared internal reader eagerly materializes streams and compares malformed row contents with the final row rather than checking physical completion.

## Fix

Internal fixed-block StringDecoder generator with first-next fstat horizon and one finally-owned descriptor; public FileSink delegates each stream without changing its signatures or writer.

## Verification

Initial183 RED/GREEN, corrected225 GREEN/typecheck/lint and six meaningful controls are actual; only corrected runs verify malformed-byte seams. Independent source round1 remains historical; focused round2 retracts its six vacuous malformed-byte coverage claims and accepts the corrected instrument/native controls/public docs/version/prepared harness. The single reviewed native proof returned0/PASS on private compiled2.6.1: independent536870912 ASCII bytes and32768 bounded16384-byte LF rows exceed native Node24.12.0 MAX_STRING_LENGTH536870888. Eager readFileSync utf8 threw native ERR_STRING_TOO_LONG; all32768 public iterator records and generated/independent/candidate SHA256469d609bb6e2504e792581fa7b325e9fef72e24f33b0ee76cc4256576620b839 matched.101 source/config and388 compiled hashes were unchanged. Job5.633s/user2.140625s/kernel1.484375s had active0/cleanup true, with no timeout/cleanup errors and marker fixture absent. This is bounded-record correctness, not throughput/peak-memory or whole-bundle constant-memory evidence. Full11 gates, final integrated acceptance, shipping and all21 consumer dispositions remain open. Evidence: aoe2/tmp/engine-reader-m8-1002/{red-1,green-1,source-checks-1,source-checks-2,controls-1,controls-job-1,source-freeze-2,private-build-1,private-build-job-1}/.

## Follow-ups

Root owns E21 real metrics/corpus/MCP adoption and any game directory migration/memory evidence. No general constant-memory or atomic rewrite/truncation claim.
