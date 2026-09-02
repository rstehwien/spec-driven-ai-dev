# Retrospective — 001-gridsweep

Written 2026-09-02, after the final review and two bounded improvement passes.
This is a project retro rather than a phase retro: it looks at the whole 001
cycle, the delivery constraints the spec chose, and what the process failed to
notice.

Covers: [001-gridsweep-spec.md](001-gridsweep-spec.md),
[001-gridsweep-plan.md](001-gridsweep-plan.md),
[001-gridsweep-final-review.md](001-gridsweep-final-review.md), and the shipped
code at `b49c2c1`.

## By the numbers

| | lines |
| --- | --- |
| Shipped game (`board.js`, `ui.js`, `styles.css`, `index.html`) | 726 |
| — of which JavaScript | 526 |
| Tests and tooling (`test/`, `tools/`) | 1,614 |
| Spec artifacts (`specs/*.md`, before this retro) | 1,720 |

The game is **18% of the repo**. Test and tooling code outweighs shipped code
**2.2 : 1**, and outweighs shipped JavaScript **3.1 : 1**.

Test count over the cycle: 42 at the final review → 43 after pass 01 → 54 after
pass 02. Of the 45 tests now in `board.test.js`, 28 exercise board behaviour and
17 scan source text; the scan half is roughly 390 of that file's 790 lines.

The same asymmetry shows up in what the work cost to produce. Priced at Claude
API rates (full accounting in the last section):

| | cost | share |
| --- | ---: | ---: |
| Spec, questions, plan, five phases, final review | $37.47 | 56% |
| Everything after the final review | $29.32 | **44%** |

The second row is the two improvement passes plus this retro and the usage
analysis. Narrowing it to the two passes' implementation turns alone — the work
that closed the debt register — still gives **≈$17.60, about 26% of the total**,
with pass 02 (renderer coverage) the single most expensive turn in the project
at ≈$10.70.

Either way the shape is the same: **closing the debt cost a substantial
fraction of building the thing**, and the largest single item was the renderer
coverage that the no-tooling constraint made expensive. That is the same
argument the line counts make, in a second currency.

## What went well

- **Phase ordering front-loaded the real risk.** Phase 01 was the dual-load
  trick (classic script in the browser, CommonJS tail for Node). If that had not
  worked the whole delivery model was wrong, and it was settled first, in the
  smallest phase.
- **`> Decision:` inline in the review.** Answering each finding where it was
  written, rather than in a summary at the end, meant no decision had to be
  matched back to its question. This is the convention most worth keeping.
- **Mutation testing as evidence.** The thirteen-mutation table in pass 02 is
  the strongest artifact in the project. It turned "we added renderer tests"
  into "here are eleven ways the renderer could have broken silently before, and
  cannot now". Claiming coverage is cheap; demonstrating what the old suite
  missed is not.
- **The plan argued against itself.** It flagged two places where it deviated
  from its own instructions and explained why, instead of quietly complying or
  quietly not. That is what made the final review fast.
- **Bounded passes with explicit out-of-scope lists.** Pass 01 deferred debt
  items 1 and 3 by name and did not drift into them. Pass 02 picked up exactly
  those two. Neither pass expanded.

## What the process missed

Two issues were found by opening the page and trying to play it:

1. **There is no visible legend of the keyboard controls.** Arrow keys, `Enter`
   or `Space` to reveal, `F` to mark — none of it appears anywhere on screen.
2. **The "New game" button sits above the grid**, next to the counter. When a
   game ends the player's attention is on the board; the way to start again is
   behind them.

Neither is a defect against the spec. Both are defects against the game.

**What is worth sitting with is everything that failed to find them.** Eight
acceptance criteria, 54 automated tests, a full headless-Chrome sweep driving
real keyboard and mouse input, a Phase 05 acceptance walk criterion by
criterion, and a final review — none of it could have found either one. A human
found both in minutes of actual use.

The reason is structural, not an oversight in any one stage:

- **Every acceptance criterion has the shape "given this input, this happens".**
  None has the shape "a player can find out what the inputs are". Criterion 7,
  *"the game is fully playable using only the keyboard"*, was verified honestly
  and is literally true — and is hollow for a first-time player, who cannot play
  it at all without being told the bindings. A criterion can be satisfied and
  still not mean what it appears to promise.
- **No test finds a missing affordance nobody specified.** `browser.test.js`
  asserts that what is on screen is correct. Nothing asserts that what is on
  screen is sufficient, and nothing could, without a spec sentence to check it
  against.
- **The spec located accessibility entirely in screen-reader mechanics** —
  `role="grid"`, roving `tabindex`, `aria-label` per cell — all of it good and
  all of it verified. Discoverability for a sighted first-time player was never
  a category the spec had.
- **The button's position was never specified at all.** The spec said the button
  exists and what it does. Phase 03 put it in the HUD because that is where the
  counter was, no stage questioned it, and no criterion could have.

The lesson: this process is very good at holding code to a spec, and has no
mechanism at all for noticing what the spec forgot to want. **The human gate is
not a formality here — it is the only stage in the workflow that can see a
missing affordance.** These two findings are the best argument in the project
for where the gates are placed.

These become the 002 cycle. They are additions to a settled baseline, not
corrections of it.

## Was the no-`package.json` approach right?

You expected the project to be simpler than it turned out, and the numbers back
that up: **roughly 800 lines exist purely as substitutes for standard tooling**
— the 416-line CDP driver, and the ~390-line source-scan half of
`board.test.js`. That is more than the shipped JavaScript.

The verdict is genuinely split, and the split is the interesting part.

### For `board.js`, the choice was clearly right

`node --test`, a three-line CommonJS tail, no config, no install, 28 behavioural
tests. There is nothing a standard setup would have improved. The rule engine is
pure logic with no DOM, and Node's built-in runner is entirely adequate for
that. This half of the project vindicated the constraint completely.

### For the renderer, the choice was expensive

**Two of the four technical debt items existed only because of it:**

- Debt 2 (brittle source-grep tests) exists because the "no ES modules, no
  network, classic scripts in order" rules had to be *policed by regex*. With a
  bundler, a linter, or a type checker, most of those 390 lines would be a
  config file. They cost a full improvement pass to re-aim.
- Debt 1 (no renderer coverage) exists because "`ui.js` is never loaded by the
  tests" left the entire DOM layer untested. Closing it cost a second pass and
  824 new lines.

And the cost was not only lines. The driver ran into an undocumented headless
Chrome behaviour — the input acknowledgement stalling on unconsumed key events —
that took six experiments to characterise and forced a compromise in the
driver's API (`pressIgnoredKey`). A maintained tool would have absorbed that
silently. That is the real tax of hand-rolling: **you inherit the bugs of a
layer you did not choose to own.**

### The comparison that matters

The final review was right to reject a jsdom stub. jsdom has no layout, no
trustworthy cascade resolution, no real focus or tab order, and no default key
actions — it would not have caught most of what the browser tests now catch. So
the honest comparison is not "custom driver vs. jsdom". It is **"custom driver
vs. Playwright"**, and there it is roughly:

| | this project | Playwright |
| --- | --- | --- |
| Driver code to own | 416 lines | ~10 lines of config |
| Renderer test code | 408 lines | ~250–300 lines |
| Install | nothing | `npm i -D`, a lockfile, ~300MB of browsers |
| Works offline, cold, in five years | yes | probably not without a re-install |
| Who owns browser quirks | you | them |

### The conflation at the root of it

The spec fused two constraints that are separable:

> *the game ships with no build step, from `file://`, with nothing installed*

is a real and valuable delivery constraint, and it held perfectly. But

> *therefore the project has no development dependencies*

does not follow. **Test tooling is a development-time dependency that never
ships.** `index.html` would be byte-for-byte identical today if the renderer
tests had been written in Playwright. Nothing about the delivered artifact
required the test side to be hand-rolled — and nobody noticed the two were
separable, because they arrived in the same bullet of the same spec section.

### The layout question

Flat was right for four files. Adding `src/` would have been ceremony, and
`file://` delivery wants `index.html` beside its scripts anyway.

`tools/` is the first sign of strain, and it is worth knowing why it exists: not
because the driver is conceptually a "tool", but because **`node --test` would
otherwise mistake it for a test file**. The directory layout is now shaped by a
test runner's file-discovery rules. That is small, but it is exactly how a
project starts growing structure it did not choose.

### Verdict

The approach was **right for what this is** — a demo meant to be opened cold,
reviewed in an afternoon, and still run in five years with nothing but a Node
install. That property is real and standard tooling would have destroyed it. Six
readable files with no supply chain is a genuine feature, not an affectation.

It would be **wrong for anything under active development**, and the tell is
precisely where the pain landed: the constraint fit the half of the project with
no DOM and fought the half that was all DOM. The cost arrived the moment the
project needed a second kind of testing.

**For a next project:** keep "the artifact ships with no build step" as a
delivery constraint, and make "the project has no dev dependencies" a separate,
explicit decision with its own justification — rather than an inherited
consequence. Had the spec asked those as two questions in
`001-gridsweep-questions-01.md`, the second one probably gets a different
answer, and debt items 1 and 2 never exist.

## Open items

- **A guard test added in pass 02 has the exact brittleness the final review
  criticised.** In `test/board.test.js`, `'the renderer tests skip rather than
  fail when no browser is present'` counts regex matches:

  ```js
  const declared = source.match(/\btest\(/g) || [];
  const guarded = source.match(/\{\s*skip\s*\}/g) || [];
  ```

  The pattern requires the closing brace immediately after `skip`. Writing
  `test('...', { skip, concurrency: 1 }, ...)` — a no-op for behaviour — turns it
  red, as would switching to `describe`/`it`. This is debt item 2's shape,
  reintroduced by the pass that closed debt item 1. It was verified to go red for
  the right reason and not checked for going red for wrong ones. The durable form
  is "no test in this file runs without consulting `findChrome()`", which needs to
  count nothing.

- **824 lines of new code have had no independent review.** `tools/chrome-driver.js`
  and `test/browser.test.js` are now the largest body of code in the repo — more
  than `board.js` and `ui.js` combined — and pass 02 is the only thing that has
  looked at them. Specific places a reviewer should push: whether
  `pressIgnoredKey` is a fidelity hole rationalised too comfortably, whether
  `Connection`'s error and timeout paths are sound, and whether the browser tests
  carry brittleness of their own (hard-coded coordinates, the `faces()` string
  comparison).

- **The final review artifact is becoming a ledger.**
  `001-gridsweep-final-review.md` now stacks *draft → approved → pass 01 → pass
  02*, with an "Approval state" list that gains a line per pass. It is drifting
  from being a review into being a change log with a review at the top. Worth
  deciding: either pass sections live in the plan and the review stays a review,
  or passes get their own numbered artifacts.

## Risks discovered

- Renderer coverage runs against whatever Chrome the machine happens to have. It
  asserts nothing version-specific, but it is not pinned.
- Where a browser exists but cannot launch, the renderer tests fail rather than
  skip. Deliberate — a missing browser is the reviewer's environment, a broken
  one is a real problem — but it is a behaviour someone will meet eventually.
- The source-scan tests remain the only thing standing between the project and a
  silently broken `file://` load. They are much better aimed after pass 01, but
  they are still regexes over source text, and that is a category of test that
  degrades quietly as a file grows.

## Recommended next steps

1. **Fix the brittle guard test.** Small, and it closes the one finding that is
   already known and already diagnosed.

   ```
   Use the human-gated-spec-driven-ai-development skill to make a bounded
   improvement pass for 001-gridsweep-plan.md fixing the brittle guard test
   recorded under Open items in 001-gridsweep-retro.md
   ```

2. **Run the 002 cycle** for the two UI additions: a visible control legend, and
   moving "New game" below the grid. Treat `001-gridsweep-spec.md` as settled.

   ```
   Use the human-gated-spec-driven-ai-development skill in lightweight mode to
   review-spec for a new 002 cycle covering two UI changes to Gridsweep: a
   visible legend of the keyboard controls, and moving the New game button
   below the grid. Treat 001-gridsweep-spec.md as the settled baseline -- these
   are additions to it, not corrections of it.
   ```

3. Optionally, a scoped review of pass 02's 824 new lines. Justified by the
   volume of unreviewed code, not by process — and not a second full final
   review, since no shipped file changed.

## Time, tokens, and cost

Measured from the Claude Code transcripts in
`~/.claude/projects/-Users-res-gridsweep-demo/`, which record per-request token
usage. Figures are as of 2026-09-02 07:40 MDT; the session was still open, so
the totals below are slightly under the final numbers.

### Time

All twelve sessions fall between **Sep 1 19:40 and Sep 2 07:40** local. Merging
every session onto one timeline and counting only the intervals between events
that are shorter than a cutoff:

| Cutoff between events | Sep 1 | Sep 2 | Total |
| --- | ---: | ---: | ---: |
| ≤ 5 min | 1h 16m | 47m | **2h 03m** |
| ≤ 10 min | 1h 23m | 1h 07m | 2h 30m |
| ≤ 15 min | 2h 02m | 1h 32m | 3h 34m |

**Read this as Claude's working time, and nothing else.** The developer ran the
project in the background between other work, so the twelve-hour wall-clock span
is not elapsed effort and the gaps are not thinking time — they are the
developer doing something else entirely. Nothing here measures the human review
that every gate in this workflow depends on, which is the one cost the process
is actually built around.

### Tokens

| Day | Model | Requests | Input | Cache write | Cache read | Output |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Sep 1 | Fable 5 | 12 | 24 | 65,962 | 424,118 | 12,957 |
| Sep 1 | Opus 5 | 393 | 786 | 1,331,856 | 26,427,527 | 518,527 |
| Sep 2 | Opus 5 | 163 | 326 | 801,946 | 19,882,241 | 277,076 |
| **Total** | | **568** | **1,136** | **2,199,764** | **46,733,886** | **808,560** |

**49.7M tokens.** All standard tier, no fast mode, no web searches, no
subagents. The opening session ran on Fable 5; everything after was Opus 5.

### Cost

Subscription usage is not billed per token, so this is what the same work would
have cost on the API. Rates from
[platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing)
— Opus 5 at $5 input / $10 one-hour cache write / $0.50 cache read / $25 output
per MTok, Fable 5 at $10 / $20 / $1 / $50.

| Day | Cost |
| --- | ---: |
| Sep 1 | $41.89 |
| Sep 2 | $24.89 |
| **Total** | **$66.78** |

Two things this measurement turned up:

- **Prompt caching saved about $201.** 46.7M of the 49.7M tokens were cache
  *reads*, billed at a tenth of the input rate. Uncached, the same work would
  have been **$267.66** rather than $66.78 — a 75% reduction. The 21:1
  read-to-write ratio is what agentic coding looks like: the whole conversation
  is resent every turn and almost all of it is a cache hit.
- **The 1M-context model carries no price premium.** Claude 4.6 and later
  include the full 1M window at standard rates — a 900k-token request bills at
  the same per-token price as a 9k one — so none of the above reflects a
  long-context surcharge.

### Caveats

- Local transcripts for this project directory only, and the measurement is a
  snapshot of a session still in progress.
- The cost attribution in "By the numbers" splits sessions by user turn. The
  boundaries are exact, but a turn that mixes work (implementing a pass and then
  answering a question about it) is charged whole to the turn it started in.

## Approval state

- draft pending user review
