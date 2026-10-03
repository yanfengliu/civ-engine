# FileSink incremental JSONL reader contract

The accepted work71/design.md:274-286 contract controls first-next fstat byte horizons and positional reads. This task keeps all five public synchronous iterator signatures, writer/file layout, schema and dependency versions unchanged. Engine2.6.1 is a patch because the change fixes reading and error timing without adding public surface.

One internal65536-byte buffer and UTF-8 StringDecoder preserve whole-buffer replacement/BOM behavior. Each physical LF-terminated malformed nonempty line throws SinkWriteError/codejsonl_parse/file detail. Only malformed actual final unterminated text is ignored; valid tails yield and only empty strings are skipped. Yield a valid record before parsing later rows, including corruption in the same block.

Open lazily on first next and capture fstat size then. Explicit positional reads stop at that horizon; later appends cannot complete JSON or split UTF-8 for the started iterator, and later iterators capture new horizons. Native premature read0 ends iteration. This is not an atomic rewrite/truncation snapshot.

Finally attempts close once after exhaustion, return, break, injected throw or fstat/read/parse failures. A separate hasPrimaryError flag retains all thrown identities, including falsy values, over a close failure. A close-only failure surfaces. Native I/O errors retain their identities; existing missing-path existsSync behavior remains unchanged.

Record parsing and unfinished-line buffering still depend on the largest record. Manifest/snapshot/sidecar reads remain whole-file. toBundle/corpus/viewer/MCP still materialize complete bundles. A suspended iterator retains its descriptor until resumed/exhausted/closed. No async/options/concurrent-snapshot/global constant-memory promise is added.

Tests-first controls observe actual public FileSink reads rather than implementation constants, use literal legacy UTF-8 oracles with nonvacuity assertions, and prove eager/parse-ahead/content-tail/no-finally/close-masking sensitivity with exact restoration. Native giant-file acceptance imports freshly compiled private2.6.1 bytes, independently verifies exact ASCII byte/record counts/checksum, requires native eager ERR_STRING_TOO_LONG and counts candidate rows without aggregate String/record retention. Root releases that one bounded measurement and the final full11 gate separately.
