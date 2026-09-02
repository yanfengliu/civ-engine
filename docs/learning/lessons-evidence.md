# Lessons — evidence

The entry behind each rule in [lessons.md](lessons.md), in the same order. Not session-start reading: come here from a rule.

This file is the long half of a queue. An entry is written the session its lesson is learned and deleted in the commit that lands the gate retiring it, so an empty file means every lesson this repo has paid for is enforced by a machine, promoted, or deliberately dropped — not that nothing was learned. What the gates are, and the mutation that proved each one goes red, is in [gate-proofs.md](gate-proofs.md).

Keep entries short; link to code, a devlog entry, or a test id rather than restating. Code lessons need a real test node id (`n/a` is reserved for genuinely process-level lessons); engine and simulation lessons include the affected bundle ID, replay seed, or behavioral metric in the behavior delta.

Format:

```
## <short title> — YYYY-MM-DD
Context: when this came up.
Lesson: the durable rule or trap, phrased so it transfers to future work.
Pointer: devlog entry, file, or test that illustrates it.
```

---

## Entries
