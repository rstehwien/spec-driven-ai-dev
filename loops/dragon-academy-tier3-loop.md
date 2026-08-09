# Dragon Academy Tier 3 — run notes

What happened when eight fully-specified cycles were run end to end by one orchestrator with
subagent fan-out, 2026-08-06/07. Written for the Tier 3 harvest in
`gauntlet-integration-handoff.md` and for the skill/prompt revisions in `pending-updates.md`.

This was **not** a gauntlet loop. It was closer to `execution: portfolio-autonomous` +
`commits: ai-on-branch` with a hand-rolled per-spec workflow and no bars, no verification classes,
and no round vector. Where the gauntlet properties would have changed the outcome, it is called out
below — that is the most useful thing this run produced.

---

## 1. What was actually run

Per spec, one workflow:

```
plan (1 agent)
  → implement (1 agent per plan phase, strictly sequential, same files)
  → review (3 agents in parallel: spec-conformance / runtime-drive / quality+regression)
  → fix (≤2 rounds: 1 fixer + 1 fresh re-checker per round, must-fix only)
  → close (1 agent: final-review artifact, checklist tick, commit)
```

Plus **six out-of-band single-item fix workflows** the orchestrator launched by hand after reading
each cycle's findings. Those were not in the design. They are the main finding of this run.

Order: T3-6 → T3-3 → T3-4 → T3-5 → T3-8 → T3-9 → T3-10 → T3-11, respecting the three declared
constraints (T3-6 first, T3-8 before T3-10, T3-3 before T3-11).

Result: 13 commits on `tier3`, all eight checklist items ticked, harness suite 28 → 48 assert
scenes, green at HEAD verified by the orchestrator independently of any agent's claim.

---

## 2. Measurements

The handoff asks for cost per phase broken out by verification class. **This run cannot answer
that** — it had no classes. It can answer cost per spec, which is still more than has been published
anywhere.

| Cycle | Agents | Subagent tokens | Wall clock | Fix passes |
|---|---|---|---|---|
| T3-6 (plan+impl, crashed) | 6 | 747k | 1.6h | — |
| T3-6 (review-only rerun) | 6 | 755k | 0.6h | 0 |
| T3-3 | 13 | 2.39M | 3.5h | 1 (+0.8h, 538k) |
| T3-4 | 12 | 2.14M | 3.1h | 2 (+1.8h, 1.09M) |
| T3-5 | 13 | 3.08M | 5.3h | 1 (+0.8h, 473k) |
| T3-8 | 13 | 1.92M | 2.6h | 1 (+0.7h, 415k) |
| T3-9 | 12 | 1.67M | 1.9h | 0 |
| T3-10 | 12 | 1.97M | 2.4h | 0 |
| T3-11 | 10 | 1.82M | 1.9h | 0 |
| **Total** | **117** | **~19.0M** | **~26.9h** | **6** |

~7,500 tool calls. Wall clock is workflow-reported and sequential; add orchestrator overhead and
suite runs between cycles. (Your ~24h figure and this ~27h are close enough that the difference is
probably where each of us started counting — worth reconciling if the number gets published.)

Shape worth noting: **the last three cycles needed no fix pass at all.** Not because they were
simpler — T3-10 rewrote the battle scene — but because the carry-forward briefs had gotten specific
and the harness had gotten strict. Cost per spec fell from 3.5h/2.4M to 1.9h/1.8M across the run.

---

## 2a. The mid-run optimization, and what it actually bought

Partway through, three changes landed to cut Godot time: a **preflight scene** (loads every script
in ~1.3 s, names the ones that will not compile), a **runner gate** that refuses to run scenes while
preflight is red, and **driver-script changes** so implementation phases test only what they touched
while the full suite runs at Review and Commit — with a carve-out: *touch a shared autoload, the
save format, or the input map and you run the full suite anyway.*

The justification predicted **~35 min off a 140 min cycle**, and — commendably — stated its own
falsifiable test: **"whether 023's first phase closes in ~8 min instead of ~15."**

Measured, from the workflow transcripts (minutes; reviews run in parallel so `rev_max` is their
wall-clock contribution):

| Cycle | Phases | Plan | Impl total | Impl mean | Impl 1st | Rev (max) | Cycle total |
|---|---|---|---|---|---|---|---|
| T3-3 (022) | 6 | 7.4 | 136.5 | 22.7 | 21.9 | 14.2 | 207.2 |
| **T3-4 (023)** | 5 | 7.8 | 126.6 | **25.3** | **16.1** | 27.8 | 183.7 |
| T3-5 (024) | 6 | 9.2 | 225.8 | 37.6 | 27.2 | 20.4 | 314.1 |
| T3-8 (027) | 6 | 7.3 | 91.1 | 15.2 | 19.3 | 23.2 | 157.6 |
| T3-9 (028) | 5 | 7.7 | 63.5 | 12.7 | 6.3 | 16.2 | 113.8 |
| T3-10 (029) | 5 | 6.9 | 82.3 | 16.5 | 17.0 | 18.3 | 142.2 |
| T3-11 (030) | 5 | 7.2 | 76.0 | 15.2 | 5.1 | 17.5 | 115.0 |

**The stated test failed.** 023's first phase closed in **16.1 min**, not ~8 — i.e. exactly the
"~15" the change was meant to beat. Its mean phase was *worse* than 022's (25.3 vs 22.7).

**The leading hypothesis, and it is a design lesson rather than an implementation failure: the
carve-out swallowed the rule for the one spec chosen to test it.** T3-4 added an autoload, bumped
the save format, and rewrote scene routing — so "touch a shared autoload, the save format, or the
input map" applied to nearly every phase it ran. The exemption was written broadly enough that the
first spec under the new rules was almost entirely exempt from them. Supporting evidence: the two
cycles with the narrowest blast radius, T3-9 (6.3 min) and T3-11 (5.1 min), are the only ones whose
first phase landed near the predicted figure.

Improvement does appear from T3-8 onward — impl mean drops from 22–38 to 12–17 min, cycle totals
from 184–314 to 114–158 — but it is **confounded** and should not be claimed as the change's effect:
spec size varies several-fold (024 is a 763-line spec), carry-forward briefs got much more specific
over the same window, and the last three cycles needed no fix pass at all (each of which cost
40–60 min elsewhere).

Three things worth carrying regardless:

- **The preflight mechanism is right independent of the timing claim.** Turning a 40–180 s hang into
  a 1.3 s named error is correct on its own terms, and it removes a failure mode that *looks
  identical to a slow test*. It should be a standing question for any project: does a broken build
  look different to the runner than a slow one?
- **Wiring the gate into the runner, rather than instructing agents to check first, is the load-bearing
  half.** It does not depend on an agent remembering.
- **Scope the carve-out, or measure on a spec the carve-out does not cover.** As written, the
  exemption triggers on exactly the specs whose phases are slowest — the big, plumbing-heavy ones —
  which is where the savings were supposed to come from.

Also worth recording: **implementation phases are 65–70% of cycle wall clock** (T3-4: 126.6 of
183.7; T3-11: 76.0 of 115.0). Plan is a flat ~7–9 min regardless of spec size, and the three-lens
review costs only its slowest lens, 14–28 min. So optimization effort is aimed at the right stage —
but with ~58% of time being model thinking, the ceiling on *any* Godot-side change is ~40%, and the
suite-run share the change targeted was ~25%. Small denominators deserve cheap experiments.

---

## 3. The severity ladder was the single biggest design error

The workflow auto-fixed `must-fix` and documented everything else, per the run instruction that
"less critical items can be documented and skipped." Reviewers then classified as **should-fix**:

- a shop that wedged **permanently for the session** if its overlay was freed while open — "Browse
  wares" silently dead, the awaited request never returning;
- a teleport **silently lost** to an encounter during the fade, player left somewhere they did not
  choose with no message;
- **Save offered mid-scene-transition** (the fade timer ignored pause), inviting a save written
  against a half-changed world;
- the bag's Back button **~2,400 px off-screen** during targeting, with ESC exiting the whole screen
  — i.e. no way out of the target row;
- pressing `I` over the shop producing **two windows** and resuming a conversation behind one with
  focus stolen.

Every one is player-reachable. Several were regressions introduced by the cycle that shipped them.
All were classified below the auto-fix bar, which is why the orchestrator hand-ran six fix passes.

**Rule to add.** Severity is not a feel. A finding is `must-fix` if any of:

1. it is **reachable by a player** in shipped content, **and** introduced or activated by this cycle;
2. it makes an authored feature **unusable or unrecoverable** within a session;
3. it **contradicts a standing rule** in the design authority (here: "one window at a time",
   "stated reasons", the ESC rule);
4. it is a **false-green** — an assertion that cannot fail for the case it names (§4).

Anything else may be documented. Note that (1) does most of the work: *this cycle broke it* should
outrank *how bad does it feel*, because a regression is cheap now and expensive after four more
cycles build on it.

---

## 4. The dominant defect class was assertions that cannot fail

**Seven found across the tier.** Three distinct shapes:

- **Unfalsifiable bound.** `SAVE_VERSION >= 9` with a comment claiming it "tracks SAVE_VERSION" —
  it can never fail again, and the next cycle to change the save shape reads it and believes it is
  covered.
- **Completeness guard set below the real count.** `EXPECTED_CHECKS := 66` against a 73-check run;
  `:= 91` against 102. A whole section can be skipped silently.
- **Witness outside the shape the game has** — the worst one. A harness asserted "an interrupted
  trip reports back" from a monitor parented to `get_tree().root`, so it survived the scene change.
  Both real callers live *inside* the departing scene and are freed, so they never receive the
  return value. The assertion passed; the player still lost the teleport in silence. The check
  could not fail for the case its own name described.

This is exactly the shared-blind-spot class the handoff predicts: a same-family reviewer reads the
assertion, sees it is present and green, and does not ask *what would have to break for this to go
red?*

**Harvest actions:**
- [ ] A standing review question, not a suggestion: **for each new assertion, name the change that
      makes it red.** If none exists, it is a finding.
- [ ] `validate.py` rule: flag `>=` / `<=` in a check's pass expression, and any `EXPECTED_*`
      constant that does not equal the count the file actually emits.
- [ ] Cheaper and stronger than either: **require every new assertion to be demonstrated red before
      it is made green**, with the failing output pasted into the plan. Late cycles here did this
      voluntarily and it worked — several fixes were caught over-correcting because the red-first
      output did not match the claim.
- [ ] Re-run the sweep at each tier boundary. One was done at T3-8 and it bounded the problem: only
      three harnesses counted checks at all, and every `>=` inside a `check()` call was read and
      individually judged. That took one agent.

---

## 5. Reviewer lenses had wildly different yield

Three parallel lenses per cycle. Measured contribution:

- **Runtime-drive (write a throwaway probe, instantiate the real scenes, call the same handlers the
  keys call, print what the player would see) — nearly every genuine defect.** The 175 px walked
  during a fade, the off-screen Back button, `focus=<none>` after a revert, 0/20 unwinnable fights,
  "3 of 3 places filled" being geometrically impossible.
- **Spec conformance** — good at "authored data with no code path" and silent requirement drops;
  otherwise documentation-grade.
- **Quality/regression** — best value was mechanical: weakened assertions, scope creep in the diff,
  leftover scratch files, style drift. Its SOLID/DRY findings were almost all deferred and none was
  missed.

**Recommendation:** keep all three but make the runtime lens the one with a *required artifact*. A
runtime review that reports "no issues" without a probe transcript is not a review — it is the
Tier 2 failure (`017b`) in a new costume. Consider running the runtime lens **twice with different
scenarios** instead of running the quality lens twice.

Corroborating evidence for the gauntlet's "every round re-verifies the whole bar": **T3-10's round 2
found a visible regression (victory recovery leaving allies in the death pose) that round 1 and a
green 46-scene suite both missed.** A single-round fix pass would have shipped it.

---

## 5a. Case study: the automation measured its own auto-battler, not the game

The single most confident finding of the whole tier was T3-10's: *a full forest group is unwinnable
for a level-1 hero.* It had everything a good finding is supposed to have — a mechanism, a number
(0/400 engine fights solo, 29/400 with one pet), an **independent reproduction by a second agent in
the real battle scene** (0/20), a named lever, and a refusal to tune silently. It got its own
checklist item and the words "must be tuned before the forest is content."

**It was wrong.** The owner played it: tamed the fire horse, walked into the forest, fought two- and
three-enemy groups with that one pet, and had no trouble.

Re-measured (400 fights per cell, mirroring `battle_scene._auto_action()` — skills and statuses, not
just basic attacks):

| Pet | Pets out | Random target | Focus fire |
|---|---|---|---|
| fire horse | 1 | **99.8%** | **100%** |
| slime | 1 | 13.0% | 57.5% |
| — | 0 | 0% | 0% |

The solo row reproduces the original 0/400 exactly, so the simulations agree. **29/400 is the
slime-pet row — and a slime is not the pet a player has when they first reach the forest.** The game
gives them the fire horse and gates leaving without a pet. The finding measured a loadout the player
cannot have.

Two failure modes, both worth naming because neither is caught by independence:

1. **The AI-controlled fallback policy was used as a stand-in for the player.** `_auto_action()`
   picks targets with `pick_target(candidates, randf())` — uniformly at random. A human focuses
   fire. On the weak-pet row that is the difference between 13% and 57.5%. Any harness that
   "simulates a battle" by driving the game's own auto-battler is measuring **the AI, not the
   game** — and it will read as rigorous, because it is running real code.
2. **A plausible fixture was substituted for the real starting state.** Nobody chose the wrong pet
   dishonestly; a slime is the obvious pet to reach for when the forest is full of slimes. But
   "what does the player actually have at this point in progression?" is a question about *content
   sequence*, which no unit-level fixture encodes and no reviewer reading the diff would think to
   ask.

**The independent reproduction made it worse, not better.** The second agent re-ran the same
strawman in a different harness and returned 0/20, which read as convergent evidence. Two agents
sharing a wrong fixture produce agreement, not validation — exactly the A10 shared-blind-spot shape,
and the strongest instance of it in this run.

**Rules this suggests:**
- **A balance or difficulty claim must state its fixture in player terms** — *level N, this
  equipment, these pets, this point in progression* — and cite where in the content that state comes
  from. A claim that cannot name the moment in the game it describes is not a finding.
- **Never let the auto-battler stand for the player without saying so.** If a sim drives the game's
  own AI on the player's side, the finding must carry that caveat in its first sentence and, ideally,
  a second run under a competent policy for comparison. Cheap: the whole re-measurement above was one
  throwaway probe.
- **Prefer "reproduce the owner's session" over "run more trials."** 400 fights of the wrong fixture
  is less informative than 3 fights of the right one, and the run had no way to tell the difference
  until a human played it.
- Worth noting what *did* work: the finding was written down precisely enough — exact numbers, named
  matchups, named lever — that it could be falsified in about twenty minutes. A vaguer version
  ("balance feels off in the forest") would have been unfalsifiable and would have survived.

Three things agents did that they should not have authority to do:

1. **Amended a spec to match the implementation.** T3-8 found that R4.7's escape-grace requirement
   was untrue as shipped and wrote a *dated in-place correction to the spec* saying the requirement
   was false — honest, well-documented, and exactly backwards. Weakening a requirement is the same
   move as weakening an assertion, and it is the owner's call.
   → Skill rule: **an agent may record a deviation, never amend a requirement.** Deviations go in
   the review artifact under a heading the owner reads.
2. **Opened a new checklist item.** T3-10 created `T3-12 — first-encounter balance pass` in
   `docs/dev-checklist.md`, the plan of record. The motive was good (an unowned balance risk with
   measured evidence: 0/400 engine fights, 0/20 real-scene fights for a level-1 hero) but it is the
   automation editing the backlog.
   → Proposals belong in a `proposed-work` section of the final review, promoted by a human.
3. **Ticked its own checklist item before the review ran.** Implementation agents marked the cycle
   `[x]` during the last phase; the closer then re-checked it. Harmless here, wrong in principle —
   the tick is the gate.

---

## 7. Failure modes of the harness itself (cheap to prevent, expensive to hit)

- **The `args` payload arrived as a JSON string, not an object**, so every interpolated field in
  every prompt of the first workflow was the literal `undefined`. The plan agent silently recovered
  by reading the checklist and inferring which cycle it was on — and produced a *correct plan*. The
  bug was only visible in the transcripts.
  → **Orchestration must validate its own inputs and throw before spawning anything.** An agent
  competent enough to recover from a broken prompt is an agent that hides your harness bugs. Added
  a hard precondition check after this; it caught nothing else, which is the point.
- **A prompt template carrying stale specifics from a previous invocation** made a verifier report
  "two of the three briefed defects were untouched" when only one defect had been sent. Shared
  preambles must not contain instance-specific examples.
- **Parallel reviewers read the working tree at different times** relative to fix rounds, so T3-5's
  review re-reported three findings already fixed in round 1. → Reviewers should state the commit or
  tree state they reviewed, and closers should verify each finding against the current tree before
  writing it up. T3-5's closer did this unprompted and explicitly separated the stale ones.
- **An implementation agent's self-reported evidence was simply wrong** — a spawner transcript
  claiming "3 of 3 places filled" that the shipped geometry cannot produce (one spawner sits inside
  the player-proximity refusal radius; the real answer is 2 of 3). The closer re-drove it and marked
  the transcript UNVERIFIED. → **Closers should independently re-derive one evidence claim per
  cycle**, chosen at random. It is one probe and it caught a fabricated-by-accident number.

---

## 8. Baseline verification is not optional and is not cheap

The project's "green harness suite" was, on inspection: 32 scenes of which **13 hang or fail under
`--headless`** because they simulate mouse/keyboard or take screenshots and need a real window, and
**4 more are visual-capture scenes with no pass/fail marker at all** (still writing screenshots to a
macOS path from a machine that is not this one). Real baseline: 28 assert scenes.

Had the run trusted "the suite is green", every subsequent cycle's evidence would have rested on it.
Establishing the true baseline took ~40 minutes and a rewritten runner.

Generalizable rules:
- **A test that cannot fail is not in the suite** — classify capture/showcase scenes out explicitly
  rather than letting them report nothing and count as passing.
- **Make failure modes fail fast.** In this project a GDScript parse error makes a harness scene
  *hang* until the outer timeout — indistinguishable from a slow scene, and it cost one cycle 16
  minutes. The fix was a `preflight` scene that loads every script in ~1.3 s and names the broken
  ones; the runner now refuses to run anything while it is red. **Ask, per project: what does a
  broken build look like to the runner, and does it look different from a slow one?**
- Runner ergonomics matter at this scale: full suite 4.5 min after parallelization (was ~20),
  and agents were told to run focused subsets during iteration and the full suite only at phase end.

---

## 9. What worked, and should survive into the Tier 4 prompt

- **The calibration stop.** Inspecting T3-6's output before launching T3-3 is what surfaced the
  `args` bug. Keep it permanently, as the handoff already argues.
- **Carry-forward briefs with `file:line` + the reason.** The single highest-value prompt element.
  T3-5 was handed seven inherited debts explicitly and returned with all seven done. Compare the
  items that were merely *mentioned* in a review and got carried three cycles untouched (the
  one-word `shop.gd` fix) because no brief named them.
  → **This should be a durable artifact, not orchestrator prose.** A `carry-forward.md` ledger with
  `id | finding | file:line | owner cycle | state` that each cycle reads and updates would remove
  the largest hand-written chunk of every prompt — the same "boundaries live in files, prompts get
  short" move the handoff makes for bars and classes.
- **Naming the trap before the agent hits it.** Warnings that paid for themselves repeatedly: *a
  freed Object compares equal to `null` in GDScript* (bit two cycles), *`create_timer` ignores pause
  by default* (bit three), *this spec's own earlier wording sent the first draft the wrong way*.
  These are project lore; they belong in `AGENTS.md`, not in each prompt.
- **Telling a cycle what is genuinely missing vs. what already works.** T3-9's brief said the item
  half of the MP economy was a finished code path with no data and only the transfer half was
  missing — it planned accordingly instead of rebuilding. Specs describe intent; briefs should
  describe *current repository state*, which is the handoff's "ground every plan in what Tier 3
  actually left behind."
- **Asking for the honest end state.** T3-4 was told to report that the world chain cannot be walked
  past the Forest rather than a clean playthrough, and it did. Cycles will report gaps if the brief
  makes gap-reporting the expected output rather than a confession.

---

## 10. What the gauntlet loop would have added

Concretely, against this run:

- **A bar per phase.** Fix passes here had no bar, so "fixed" meant "the fixer says so and the suite
  is green" — which is how a regression survived T3-10 round 1.
- **Full re-verification each round + a pass/fail vector.** Would have caught that regression by
  construction, and would have made the ≤2-round cap a *measured* stop (plateau/regression) instead
  of an arbitrary one.
- **A closed rubric.** Reviewers here invented dimensions freely; several late "findings" were new
  standards applied to old code, which is the dimension-drift failure mode.
- **Recurring-finding-class stop.** "Assertion that cannot fail" recurred **seven times across eight
  specs**. Under `stop-on-recurring-finding-class: 3` the run would have halted at T3-4 and the
  class would have been fixed as a *harness rule* rather than one instance per cycle.

That last one is the strongest argument in this data for the gauntlet framing: the loop would have
converted the project's dominant defect class into a single stop-and-fix instead of seven
independent rediscoveries.

---

## 11. Open questions this run did not settle

- **Cost by verification class** — unanswerable here; needs the classes to exist. Tier 4 should
  capture it, since it is the comparison nobody has published.
- **Whether the runtime lens can be automated into the suite.** Most of its findings were geometric
  or focus-related (`x=-4 w=1160` on a 1152 canvas, `focus=<none>`, a button 2.4k px off-screen).
  Those are assertable. If they become checks, the expensive lens gets cheaper and the phases
  promote to `automated`.
- **Whether same-family review is sufficient.** No cross-family critic ran. The blind spots that
  showed up (unfalsifiable assertions, spec-amended-to-match-code) are plausibly shared-family, so
  this run neither confirms nor refutes A10.
- **Human eyes.** Nobody played the game. Every review says so — and §5a is what that cost: the
  tier's most confident finding, doubly "reproduced", was refuted by one owner playtest. The other
  open item of the same kind is a HELP line that contradicts the design authority. Neither is a code
  defect; neither would have been caught by any amount of additional agent review.
  **Revised estimate of what human time is worth here:** the owner's single forest session was worth
  more than the ~40 agent-minutes that produced the finding it killed. Budget playtime per tier
  explicitly rather than treating it as the thing that happens if there is time left.
- **Whether the §2a speedup is real.** The stated test failed and the later improvement is
  confounded. Re-running one narrow spec (T3-9-shaped: no autoload, no save-format change) with the
  driver reverted would settle it in ~2 hours. Worth doing before the pattern is generalized into
  the skill, because "phases test only what they touched" is a rule that trades regression coverage
  for time and should be paid for with evidence.

---

## 12. Meta-lesson: predictions in the loop should be dated, falsifiable, and checked

The §2a justification did the right thing — it named the mechanism, estimated the payoff, stated a
specific test, and flagged that the savings were an estimate rather than an observation. That is why
it could be evaluated at all a day later, and why the *interesting* answer (the carve-out exempted
its own test case) was recoverable instead of lost in "it feels faster now."

Cheap to institutionalize: when a run makes a tooling change to buy speed or quality, record it as a
one-line claim — **change / mechanism / predicted effect / test that would falsify it / measured
result (filled in later)**. Three of the six fix passes in this run made implicit performance or
correctness claims that nobody wrote down and nobody checked. The per-agent durations needed to
check them are already in the workflow transcripts; nothing new had to be instrumented.
