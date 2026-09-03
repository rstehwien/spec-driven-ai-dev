# Dragon Academy Tier 4 — the small loop

Design notes for the runner used on Tier 4, written **2026-08-14, before the
run**. The Tier 3 file next to this one is the opposite artifact: what happened
after 27 hours of orchestrated fan-out. This one records what was built instead,
and why, so that when the run is over the two can be compared on more than
feel.

Tier 3 was one orchestrator with subagent fan-out and a hand-rolled per-spec
workflow. Tier 4 is **a 220-line Python script that shells out to `claude -p`**
and holds no model state at all. The first attempt at Tier 4 was a gauntlet-loop
adaptation, and it kept bogging down — not in the work, in the loop. The
diagnosis is in §2.

Artifacts, in the game repo:

```
tools/spec_loop.py           the driver
tools/loop_prompts/          _preamble.md, review.md, fix.md
specs/tier4-prompts.md       the prompts AND the loop's state
```

---

## 1. What it does

One `claude -p` process per stage. That is the entire mechanism for "clean
context" — no compaction strategy, no handoff notes, no session ids. Process
boundary is context boundary, and the artifacts on disk are the handoff, which
is what the methodology was already built for.

Per cycle, the stages are the ones the human already writes by hand — Plan,
Implement, sometimes Questions/Fold — plus three the driver reserves:

| Stage | What it means |
|---|---|
| `Review` | run the review prompt, then read one line out of the review artifact |
| `Fix` | never dispatched on its own; the review loop runs it on `NO-GO` |
| `Commit` | no model at all — run the suite, commit only on `SUITE_RESULT=GREEN` |

```
Plan → Implement → Review ──GO──→ Commit
                     ↑ │
                     │ NO-GO
                     └─ Fix        (2 rounds, then stop for the human)
```

State is `[DONE]` written back onto the stage heading in `specs/tier4-prompts.md`,
so resume is "run it again". `[HOLD]` on a heading stops the run there for a
step that genuinely wants a human — Tier 4 has two: 033's part-two go/no-go
(the spec itself says a human decides whether the Map work is the size the spec
assumed) and 036's fold, which is the tier's last chance to answer questions
before the fallbacks answer them.

## 2. The one decision, and why the loop was bogging down

The driver interprets exactly one thing: a line in the final-review artifact.

```
VERDICT: GO
VERDICT: NO-GO
```

Missing line → the driver aborts rather than guessing. Everything else a model
writes is prose the driver copies to a log and never parses.

**That is the whole simplification.** The gauntlet-shaped attempt kept trying to
make the loop understand the work: severity ladders, verification classes, round
vectors, bars, per-finding routing. Every one of those is a place where the loop
needs to model what the cycle is doing, and each needs its own prompt scaffolding
to feed it — which is how a session gets bogged down in the loop rather than the
cycle. The judgment they encode is not missing here; it moved to where it was
already written down and already read: `AGENTS.md` § What counts as must-fix has
the four conditions, and the review prompt tells the reviewer to apply them.
The loop needs to know one bit: does this commit or not.

Corollary worth carrying: **a loop should read exactly as much of a model's
output as it will act on.** If the driver had parsed findings, it would need to
keep parsing them correctly forever, and every prompt change would be a driver
change.

### The obvious attack on it

A reviewer that writes `VERDICT: GO` to be agreeable ships anything. Four things
push against that, and none is the driver's:

- the review runs in a **fresh process** and did not implement the cycle;
- must-fix is defined by four objective conditions in `AGENTS.md`, not by feel,
  and Tier 3's evidence for why is in the file next door;
- the review prompt requires the suite re-run and a runtime probe, and a probe
  that prints the wrong thing is harder to talk past than a paragraph;
- `Commit` re-runs the suite itself, so a GO on a red tree still does not commit.

If Tier 4 ships a defect that a GO review waved through, that list is what to
revise — not the driver.

## 3. What it deliberately does not do

- **No fan-out.** Tier 3's three-lens parallel review had wildly different yield
  per lens. One review, told to drive the game, is the cheap half of that.
- **No severity logic, no finding routing, no auto-triage.**
- **No per-phase gate.** `implement-spec` runs the plan to completion; the gate
  that matters is the review.
- **No parallelism between cycles.** They conflict — the manifest exists because
  T4-1 lands the font T4-2 consumes, and T4-2 defines the frame T4-7 consumes.
- **No token or timing measurement.** Tier 3's numbers came from workflow
  transcripts; here each stage writes a log with a wall-clock line and nothing
  else. If the comparison matters, that is a `--json` flag away and it should be
  added deliberately rather than assumed.
- **No retry on a crashed stage.** A non-zero exit aborts the run with a log
  path. Cheap to add, and wrong to add before seeing what actually crashes.

## 4. Operating it

```sh
tools/spec_loop.py specs/tier4-prompts.md --list      # what is pending
tools/spec_loop.py specs/tier4-prompts.md --dry-run   # render every prompt, run nothing
tools/spec_loop.py specs/tier4-prompts.md             # run everything pending
tools/spec_loop.py specs/tier4-prompts.md --only 032   # one cycle
```

- `--dry-run` renders the fix/review-2 path unconditionally, so the printout is
  the worst case, not the expected one.
- Env: `LOOP_CLAUDE_ARGS` (default `--dangerously-skip-permissions`),
  `LOOP_MAX_FIX_ROUNDS` (2), `LOOP_LOG_DIR`, `LOOP_CLAUDE`.
- **The permissions flag is the real risk surface**, not the loop. An unattended
  stage runs `godot`, edits the tree and can run anything else it decides to.
  It is a git repo on a branch and every stage's output is logged, which is the
  mitigation that was actually taken.
- Run with the **Godot editor closed** (`AGENTS.md` § Editor open vs. closed) and
  `DISPLAY=:0` exported — the windowed harness scenes need a real window. This is
  the one thing about the run that is not visible in the driver.
- Long run; use `nohup`/`tmux`. Per-stage logs land in
  `$TMPDIR/dragon-academy-loop-logs/`.

Expect, from Tier 3's measured shape: implementation is 65–70% of a cycle's wall
clock, plan is a flat ~7–9 min regardless of spec size, and a review costs about
what its slowest lens cost there (14–28 min). A fix round cost 40–60 min in Tier
3, which is why `MAX_FIX_ROUNDS` is 2 and not 5.

## 5. Genericizing it

Splitting the driver from the project, for the eventual move into this repo:

**Generic (belongs in `loops/spec_loop.py`):** the markdown parser, `[DONE]` /
`[HOLD]`, the three reserved stage names, `@template` expansion, `{{spec}}` /
`{{plan}}` / `{{review}}` derivation from a `NNN-<label>-spec.md` heading, the
VERDICT contract, the fix/re-review bound, one process per stage.

**Project-specific (belongs in config):** the test command and the string that
means green (`./tools/run_harness.sh`, `SUITE_RESULT=GREEN`); the commit message
shape; the preamble and the review/fix templates, which cite `AGENTS.md` by
section; and the artifact naming, if a repo does not use `-final-review.md`.

That is about six values. The honest shape is a small `loop.toml` beside the
prompts file, or a `## Config` block in the prompts file itself so a cycle
still has exactly one file to read. **Do not generalize the stage names into a
plugin system** — three reserved words with one decision between them is the
property that made this fit in a page.

The parser is also worth keeping small deliberately: it reads `#` cycle
headings, `##` stage headings, and the first fenced block under each. Everything
else in the file is prose for the human, and the file stays a document first.

## 6. Predictions, dated and falsifiable

Per Tier 3 §12 — a prediction in a loop that is not checked is decoration.
Checked after the tier closes; whoever runs it writes the outcome in beside
them.

1. **Fix rounds.** At most 2 of the 5 remaining cycles need any fix round, and
   none needs a second. *False if* 3+ cycles need a round, or any cycle exhausts
   both. (Tier 3: 4 of 8 needed one, and it also ran 6 out-of-band passes that
   this loop turns into ordinary rounds — so the honest Tier 3 comparator is
   worse than 4 of 8.)
2. **The driver does not change during the run.** Zero commits to
   `tools/spec_loop.py` between the first cycle starting and the tier closing.
   *False if* any. This is the real test of "simple enough": the gauntlet attempt
   failed it before a single cycle ran.
3. **No missing-verdict abort after the first cycle.** *False if* a review ever
   omits the line once 031's fix pass has demonstrated the shape.
4. **The `[HOLD]` markers get used, not deleted.** Both stops produce a human
   decision that changes what runs next. *False if* both are removed unread —
   which would mean they were ceremony.
5. **Cost per cycle beats Tier 3's 1.8–3.1M subagent tokens**, because there is
   no fan-out. *False if* a cycle costs more; a single context that re-runs the
   suite several times is not obviously cheaper than three parallel reviewers,
   and this is a guess.

## 7. Open questions

- **Is one review enough?** Tier 3's three lenses disagreed usefully. If Tier 4
  ships a defect a single review missed, the fix is a second review stage with a
  different lens — cheap in this design, since a stage is a heading — not a
  return to fan-out.
- **Should `Commit` be a model stage?** It writes a mechanical message today. A
  model-written message would be better prose and one more thing to verify.
- **Where does the checklist tick belong?** Deliberately nowhere in the loop:
  `AGENTS.md` § Authority makes it the human's closeout gate, and Tier 4 keeps
  it that way. If the human never ticks a box during the run, that gate is
  ceremony too and should be said out loud rather than automated quietly.
- **Does `--dry-run` actually get used?** It exists because the gauntlet attempt
  was expensive to debug. If nobody runs it, the value was in writing it.
