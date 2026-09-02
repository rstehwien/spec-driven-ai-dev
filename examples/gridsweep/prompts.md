# The prompts that built Gridsweep

Every turn of the 001 cycle, in order. Each section is one commit in this repo's
history — run `git show <sha>` to see exactly what that prompt produced.

The run happened in a separate, empty repo holding nothing but the starting
spec; each commit was then copied here. See [README.md](README.md) for why.

| # | Stage | Commit |
| ---: | --- | --- |
| 0 | The starting spec | `e32e783` |
| 1 | Review spec | `3087d07` |
| 2 | Answer questions | `9061655` |
| 3 | Fold answers into spec | `8df5722` |
| 4 | Generate plan | `d1b7a4d` |
| 5 | Implement phase 1 | `2350a33` |
| 6 | Implement phase 2 | `9d694e8` |
| 7 | Implement phase 3 | `cd7f7e8` |
| 8 | Implement phase 4 | `126811e` |
| 9 | Implement phase 5 | `8dfa7b5` |
| 10 | Final review | `187fcd9` |
| 11 | Post-review fixes, round 1 | `425d2b7` |
| 12 | Post-review fixes, round 2 | `ce6e028` |
| 13 | Retro | `ac5be2e` |

---

## 0 · The starting spec — `e32e783`

No prompt. The cycle started from a hand-written 49-line spec, preserved at
[`../../presentations/001-gridsweep-spec.md`](../../presentations/001-gridsweep-spec.md).
It never says how you win.

## 1 · Review spec — `3087d07`

```
Use the human-gated-spec-driven-ai-development skill to review-spec for
#file:specs/001-gridsweep-spec.md.
```

Generated `specs/001-gridsweep-questions-01.md` — fifteen questions across five
must-answer topics, the first being the win condition.

## 2 · Answer questions — `9061655`

No prompt. Answers written by hand into the questions file as `> Decision:`
blocks.

## 3 · Fold answers into spec — `8df5722`

```
Use the human-gated-spec-driven-ai-development skill to fold-questions from 001-gridsweep-questions-01.md into 001-gridsweep-spec.md
```

Folded every decision into `specs/001-gridsweep-spec.md`, taking it from 49
lines to 134 (and 150 by the end of the cycle).

## 4 · Generate plan — `d1b7a4d`

```
Use the human-gated-spec-driven-ai-development skill to generate-plan for 001-gridsweep-spec.md
```

Produced `specs/001-gridsweep-plan.md` — five phases. Reviewed and approved by
hand before any code was written.

## 5 · Implement phase 1 — `2350a33`

Dual-load skeleton and board construction.

```
Use the human-gated-spec-driven-ai-development skill to implement-next-phase for 001-gridsweep-plan.md
```

## 6 · Implement phase 2 — `9d694e8`

Reveal, marking, cascade, and end states.

```
Use the human-gated-spec-driven-ai-development skill to implement-next-phase for 001-gridsweep-plan.md
```

## 7 · Implement phase 3 — `cd7f7e8`

Grid rendering and accessibility structure.

```
Use the human-gated-spec-driven-ai-development skill to implement-next-phase for 001-gridsweep-plan.md
```

## 8 · Implement phase 4 — `126811e`

Input, new game, and status wiring.

```
Use the human-gated-spec-driven-ai-development skill to implement-next-phase for 001-gridsweep-plan.md
```

## 9 · Implement phase 5 — `8dfa7b5`

End-state presentation and acceptance sweep.

```
Use the human-gated-spec-driven-ai-development skill to implement-next-phase for 001-gridsweep-plan.md
```

Note that the same prompt runs every phase — the skill advances to the next
incomplete phase on its own and refuses to run ahead.

## 10 · Final review — `187fcd9`

```
Use the human-gated-spec-driven-ai-development skill to final-review for 001-gridsweep-plan.md
```

Created `specs/001-gridsweep-final-review.md`, including a four-item technical
debt register. Findings were triaged by hand — answered inline in the review
file — before any of them were acted on.

## 11 · Post-review fixes, round 1 — `425d2b7`

Notes added to `001-gridsweep-final-review.md` first, then:

```
Use the human-gated-spec-driven-ai-development skill to make a bounded
improvement pass for 001-gridsweep-plan.md covering the Important improvements
and Cleanup opportunities in 001-gridsweep-final-review.md
```

## 12 · Post-review fixes, round 2 — `ce6e028`

The previous improvement pass deferred two debt items by name, so this pass
picked up exactly those.

```
Use the human-gated-spec-driven-ai-development skill to make a bounded
improvement pass for 001-gridsweep-plan.md covering technical debt items 1
and 3 in 001-gridsweep-final-review.md

Item 1 must not add npm packages or break `node --test` where Chrome is absent.
```

This is where `tools/chrome-driver.js` and `test/browser.test.js` came from —
824 lines of headless-Chrome testing built from Node built-ins, because the
"no dependencies" constraint ruled out Playwright.

## 13 · Retro — `ac5be2e`

Wrapping up the cycle. Three turns, all landing in `specs/001-gridsweep-retro.md`.

**Write the retro:**

```
Write a retro of the demo project in specs/001-gridsweep-retro.md .  Include the information on what you suggest above.  Also evaluate if doing things without a package.json and using some standard tools and layout for development was better than doing things a standard way.  I thought the project would be stimpler than it was but we had to make tools and other things a normal "compiled" project wouldn't have.

Additionally I had noticed the following issues captured by a prompt you should not run now but the issues should be included in a retro.
Use the human-gated-spec-driven-ai-development skill in lightweight mode to
review-spec for a new 002 cycle covering two UI changes to Gridsweep: a visible
legend of the keyboard controls, and moving the New game button below the grid.
Treat 001-gridsweep-spec.md as the settled baseline -- these are additions to
it, not corrections of it.
```

**Work out what it cost:**

```
Is there a way to determine how much time claude spent yesterday and today on gridsweep and how many tokens were spent plus their cost if it was paid on the API and not through subscription?
```

**Fold the cost figures back in:**

```
Add the 43% figure to the retro's "by the numbers" section.  Also add a section in the bottom about the time, tokens, and cost.  Note that I was doing this in the background so the time gaps were more about doing other things than working on this project.

Additionally make sure the next step prompt you suggested (below) is covered in the retro:
Use the human-gated-spec-driven-ai-development skill to make a bounded
improvement pass for 001-gridsweep-plan.md fixing the brittle guard test
recorded under Open items in 001-gridsweep-retro.md
```
