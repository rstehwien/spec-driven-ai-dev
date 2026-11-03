# Todo

## Review the size rules changed on 2026-11-03

- [ ] Review the uncommitted change to the size rules in `SKILL.md`, `references/stage-templates.md`, `templates/specs/`, and `tools/spec-lint.py`:
  - The word count is now prose only. Tables and fenced code don't count.
  - The budget is a target; the hard ceiling is the gate. Between the two, an artifact is fine if the extra length is requirements.
  - A requirement is never squeezed into terser wording, or stripped of a qualifier, just to hit the number.

  Why: in Cybergyre's spec 001, folding real new requirements (YouTube delivery, captions, the head's shape) pushed the spec past 1,000 words. Fitting it back cost one qualifier ("timing-preserving") and made one requirement hard to read. Under the new count that spec is 872 prose words.

## Decide whether phase reviews and retros earn their keep

`~/src/runegrain/specs` after the full-spec runs (counted on 2026-11-03):

| Artifact | Files | Words |
| --- | --- | --- |
| spec | 8 | 7,902 |
| plan | 6 | 15,041 |
| questions | 20 | 19,857 |
| review (phase and final) | 55 | 54,025 |
| retro | 50 | 11,585 |

That's 141 files. Reviews and retros are 105 of them, and the reviews alone are about seven times the size of the specs.

**What the reviews do:** they record 310 findings. 234 are fixed, 44 deferred, 13 won't-fix, and 19 still open, and 21 reviews raised a new questions set. That's real work being caught. The median phase review is about 670 words, and the longest is 2,634.

**What the retros do:** most have the same six sections: what changed, checklist updates, known issues, risks discovered, recommended next step, and approval state. "What changed" repeats git, "checklist updates" repeats the plan, and "approval state" is process state. The median retro is about 200 words. Only 7 of the 50 have a "what went well" section, the one part no other file holds.

- [ ] Read three phase reviews. Were the findings worth having? Did any of them arrive too late to matter?
- [x] Retros are dropped (decided 2026-11-03). The phase review gains Deviations and Lessons sections, a lesson that should change every run goes to the project's agent instructions, and the retro template is deleted. Uncommitted: `SKILL.md`, `references/stage-templates.md`, `templates/specs/`, `README.md`, `comparison.md`. `examples/`, `presentations/`, and `loops/` still mention retros as records of past runs; `loops/gauntlet-integration-handoff.md` plans to read Tier 3 retros as evidence.
- [ ] Decide whether per-phase reviews become one findings ledger per spec (option 3 below).

Options considered, roughly from least to most change (option 1 and the retro half of option 4 are now done):

1. **Merge the retro into the review.** One file per phase, with a short "Lessons" section at the end for anything worth carrying forward; the rest of the retro is already in git or the plan. This halves the file count.
2. **Keep reviews only for phases that need them.** `implement-spec` writes an evidence block into the plan for each phase (tests run, results). A separate review file appears only when there are findings, or when the developer asks for `review-phase`.
3. **One findings ledger per spec** (`NNN-findings.md`) instead of one review per phase. Each finding is a row with its marker, the phase that raised it, and where it was fixed. That makes "what's still open?" a single file to read.
4. **Drop retros entirely**, and send real lessons to `AGENTS.md`, where they change the next run's behavior.

My opinion: options 1 and 3 together. The review findings clearly pay for themselves, and a single ledger keeps them without dozens of files. The retros mostly restate other files, and the lessons in them belong in the agent instructions, where they get used.

- [ ] Decide what happens to runegrain's 50 existing retros (leave them as history, or move any real lessons into its `AGENTS.md` and delete the rest), and, if the ledger wins, its 55 reviews.
