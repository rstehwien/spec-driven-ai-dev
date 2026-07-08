# 008 - Questions 01

This is the first clarification pass on [008-artifacts-reorg-spec.md](008-artifacts-reorg-spec.md). Two groups of questions:

- **Section A** carries forward the spec's existing 8 Open Questions verbatim. Each has the spec's "My read" recommendation as a default to confirm or override.
- **Section B** is new — derived from a code reconnaissance against the live ThePuppetMaster artifacts layout, the actual scripts that write to those paths, and the documentation footprint (per the developer's review-time directive that documentation needs an explicit assessment).

Per the workflow: answer each question inline as `> Decision: ...` (folded into spec) or `> Question: ...` (kept for the next round). Then run `fold-questions for 008-artifacts-reorg-questions-01.md`.

---

## Section A — Spec's existing open questions

### A1. Within-asset filename convention — keep `<charname>_<asset>_source.png` or rename to `source.png`?

Files checked: `characters/ThePuppetMaster/artifacts/face/ThePuppetMaster_face_source.png`, `damage_poses/ThePuppetMaster_damage_source.png`, `character_reference/ThePuppetMaster_reference_source.png`, all `source_strips/ThePuppetMaster_<key>_source.png`. Today every source carries the `<charname>_<asset>` prefix even though the path already encodes both.

Spec's read: rename to `source.png`. Asset directories become character-agnostic — moving the `face/` directory between characters would just work.

> Decision: rename to `source.png`

### A2. `normalized/` vs `normalized.png` for Pattern A (single-image assets)

Spec's read: use `normalized.png` at the asset root for Pattern A; use `normalized/` directory for Patterns B and C.

> Decision: use `normalized.png` at the asset root for Pattern A; use `normalized/` directory for Patterns B and C.

### A3. `previews/` for `character_reference`?

Files checked: today `character_reference` has only the source PNG + `frames/view_<n>.png`; no preview gif. damage_poses has a 3-frame degradation but no current gif.

Spec's read: drop `previews/` for character_reference (4 static views don't animate); keep for damage_poses + character_movement + sideview_battler.

> Decision: drop `previews/` for character_reference its not an animation.  keep for damage_poses + character_movement + sideview_battler.

### A4. `attempts/` directory — drop the convention entirely?

Files checked: `face/attempts/` has 2 files, `sideview_battler/attempts/` has 5 files (mostly placeholders + pre-regen snapshots). No other asset has it. Top-level placeholders gone.

Spec's read: drop entirely; if an attempt rejects, move it to `<asset>/rejected/` instead. `attempts/` adds a state without semantics.

> Decision: drop entirely; if an attempt rejects, move it to `<asset>/rejected/` instead. `attempts/` adds a state without semantics.

### A5. `rejected/` and `needs-regeneration/` — confirm per-asset placement?

Spec's read: per-asset (`<asset>/rejected/`, `<asset>/needs-regeneration/`). Per-asset scoping matches the granularity an author flags at.

> Decision: Move to places like `characters/<name>/artifacts/face/rejected/` and `characters/<name>/artifacts/face/needs-regeneration/`

### A6. `reports/<key>_<step>.json` naming inside Pattern C — drop redundant prefix?

Files checked: today's `reports/sideview_evade_extract.json`, `reports/movement_left_0_normalize.json`, `reports/sideview_battler_assemble.json`, etc. Inside `character_movement/reports/` the `movement_` prefix would be redundant; inside `sideview_battler/reports/` the `sideview_` prefix would be redundant.

Spec's read: drop the redundant prefix. So `down_0_normalize.json` not `movement_down_0_normalize.json`; `evade_extract.json` not `sideview_evade_extract.json`; `assemble.json` not `sideview_battler_assemble.json`.

> Decision: drop the redundant prefix

Follow-on: should this rule apply to **frame filenames** too? Today `damage_poses/frames/damage_pose_0.png` carries the `damage_pose_` prefix; under the rule it would become `0.png` (or stay as `damage_pose_0.png` for human readability). `character_movement/frames/down_0.png` already drops the `movement_` prefix so it's consistent. `character_reference/frames/view_0.png` already drops the `character_reference_` prefix.

> Decision: For damge_pose_0.png we can drop the redundant damage_pose prefix

### A7. Migrator partial-migration support?

Spec's read: yes. Take a `--character` flag; default to migrating every directory under `characters/`.

> Decision: We can migrate all of them once and be done.  There are only 3 characters and Smoke was just part of a smoke test and not fully generated.  Smoke could  be removed.  There are no characters on other machines or anything.

### A8. Docs / agent-skill update — owned by 008's plan, or a separate doc-cleanup spec?

Spec's read: 008 owns it — the layout change is meaningless if docs still describe the old shape. (See B7 below for the actual scope.)

> Decision: Just remove the agent skill.  It had a great deal of trouble generating assets and would get stuck all the time.  We are moving to a script driven one first for speed of development and then a UI one.  One of the things to look out for in the script and UI generation is being unable to slice up an otherwise good image into frames because the chromakey drift was too high and the tolerance too low.

---

## Section B — Reconnaissance findings (new)

### B1. Spec claims `scripts/cli.py` has `output_path_for(asset, …)` helpers — but no such helpers exist

Files checked: `grep -n "def output_path\|def artifact_path\|def report_path\|def debug_path" scripts/`. Returns nothing. The Affected files table at line 190 of the spec (`scripts/cli.py | Helper functions (output_path_for(asset, …)) update if any.`) is wrong — every script today builds artifact paths inline. Phase 5 in "What's next" ("shared output-path helpers consolidated") is actually a NEW work item: invent and consolidate path-builder helpers, not edit existing ones.

> Decision: confirm — Phase 5 of the plan creates new helpers in either `scripts/cli.py` or a new `scripts/artifact_paths.py` module, and the spec's Affected files table is rewritten to reflect that?
> Decision: Go with 2: Introduce shared helpers (Phase 5 in the spec's "What's next"). Create new functions like artifact_paths.source_for(asset), artifact_paths.normalized_for(asset, frame=None), artifact_paths.report_for(asset, step), etc. — one module owns all path conventions; every script imports the helpers. Bigger initial diff but DRY going forward.

### B2. `new_character.py`'s ARTIFACT_SUBFOLDERS list needs significant rewrite

Files checked: [scripts/new_character.py:69-86](../scripts/new_character.py#L69-L86) creates 22 hard-coded artifact subdirectories. Pre-008 they include `face/source/`, `face/normalized/`, `picture/source/`, etc. — but the live ThePuppetMaster doesn't actually use those subdirs (its `face/` dir has the source PNG directly, no `source/` subdir). It also creates top-level `rejected/`, `needs-regeneration/`, `debug/`, `reports/`, `prompts/` which 008 deletes.

Post-008 the bootstrap should follow the per-007-Phase-08 "empty optional dirs not created until they have content" rule. So new_character.py creates only the per-asset directories themselves (`face/`, `picture/`, `enemy/`, `character_reference/`, `damage_poses/`, `character_movement/`, `sideview_battler/`) — no nested `source/`, `normalized/`, `frames/`, `attempts/`, `rejected/`, etc. until the pipeline writes content.

> Decision: confirm — the bootstrap creates only the 7 per-asset directories (no nested subdirs until populated by the pipeline)?
> Decision: We can create the directories when needed

### B3. Cross-cutting `prompts/_report.json` rename

Files checked: today `render_all_prompts.py` writes `<character>/artifacts/prompts/_report.json`. The spec's top-level layout says `render_all_prompts.json` lives at `artifacts/`. So the report renames AND moves up one level. The spec doesn't explicitly call out this rename.

> Decision: confirm — `prompts/_report.json` renames to `artifacts/render_all_prompts.json`?
> Decision: use `artifacts/render_all_prompts.json`

### B4. Migrator filename-parsing rules need pinning

Files checked: `characters/ThePuppetMaster/artifacts/reports/` contains 47 files with mixed naming conventions. Examples:

- `face_validate.json` → `face/reports/validate.json` (drop asset prefix)
- `damage_pose_2_normalize.json` → `damage_poses/reports/2_normalize.json` (drop "damage_pose_" since asset is "damage_poses"; keep "2" as the frame index)
- `sideview_battler_assemble.json` → `sideview_battler/reports/assemble.json` (drop full asset prefix)
- `sideview_evade_extract.json` → `sideview_battler/reports/evade_extract.json` (the "sideview_" prefix means "sideview_battler"; "evade" is the motion key)
- `sideview_chanting_standby_0_normalize.json` → `sideview_battler/reports/chanting_standby_0_normalize.json`
- `movement_left_0_bounds.png` (debug/) → `character_movement/debug/left_0_bounds.png`

The migrator needs an inference table to map each prefix style to an asset. Today's prefixes:
- `face_*` / `picture_*` / `enemy_*` → that asset
- `damage_pose_*` (singular) → `damage_poses/` (plural)
- `sideview_<motion>_*` and `sideview_battler_*` → `sideview_battler/`
- `movement_<direction>_*` → `character_movement/`
- `<charname>_reference_*` (or `_reference_*`) → `character_reference/`

> Decision: MOOT per the migration-scope decision (one-off Python script). The simplified script handles only known source-PNG paths (face/<name>_face_source.png, picture/<name>_picture_source.png, enemy/<name>_enemy_source.png, character_reference/<name>_reference_source.png, damage_poses/<name>_damage_source.png, character_movement/source_strips/<name>_<dir>_source.png, sideview_battler/source_strips/<name>_sv_<motion>_source.png) — no inference table needed. Derived artifacts (reports, debug, frames, normalized) get deleted and regenerated by the pipeline.

### B5. spritesheet config files at `configs/spritesheets/<asset>.yaml`

Files checked: 008 spec lists `configs/spritesheets/*.yaml` as Affected with the note "Update any input/output path references." The live configs likely reference normalized-frame input paths and assembled-output paths.

> Decision: yes audit the configs. Phase 3/4 of the plan inspects each spritesheet config and updates any hard-coded paths referencing the old layout (e.g., `artifacts/character_movement/normalized/<key>_<i>.png` paths probably stay as-is since that subdir is preserved in 008).

### B6. Test fixture path references

Files checked: `tests/test_rpgmaker_character_skill.py` and `tests/test_rpgmaker_reference_round_trip.py` both reference artifact paths. Plus `tests/results/` carries dozens of pre-baked report fixtures with the old path conventions inside their JSON.

Per A8, the agent skill is being deleted entirely, so `tests/test_rpgmaker_character_skill.py` (which exercises that skill) gets deleted along with it. B6 simplifies to "rewrite `test_rpgmaker_reference_round_trip.py` only + regenerate `tests/results/` fixtures".

> Decision: rewrite `test_rpgmaker_reference_round_trip.py` for the new paths and regenerate `tests/results/` fixtures (integration outputs, safe to regenerate). Delete `test_rpgmaker_character_skill.py` as part of the agent-skill removal.

### B7. Documentation scope is bigger than the spec implies (per developer's review-time directive)

Files checked: 53 grep hits on artifact-path patterns across docs and agent skills. Specifically:

- [docs/rpgmaker-generation-process.md](../docs/rpgmaker-generation-process.md) (358 lines) — full layout section at lines 39-65 and ~5 scattered path references throughout (lines 74, 238, 240, plus the per-process sections at "Standalone Image Process", "Spritesheet Process", "Full Character Pack Process").
- [.agents/skills/rpgmaker-character/references/commands.md](../.agents/skills/rpgmaker-character/references/commands.md) (197 lines) — every CLI invocation has hardcoded paths (the Bootstrap section, the `cp <generated> ...` block at lines ~50, every section after).
- [.agents/skills/rpgmaker-character/references/workflow.md](../.agents/skills/rpgmaker-character/references/workflow.md) — likely path references in step-by-step workflow.
- [.agents/skills/rpgmaker-character/references/review.md](../.agents/skills/rpgmaker-character/references/review.md) — likely review-time path references.
- [docs/rpgmaker-graphics.md](../docs/rpgmaker-graphics.md), [docs/rpgmaker-phases.md](../docs/rpgmaker-phases.md) — light touch.

The spec's Affected files table mentions only two of these (`docs/rpgmaker-generation-process.md` and `.agents/skills/rpgmaker-character/references/commands.md`). Plan needs an explicit doc-rewrite phase covering all five files plus a final grep-sweep step to catch stragglers.

Per A8 the entire `.agents/skills/rpgmaker-character/` directory gets deleted, so the three agent-skill doc files are removed (not edited). The remaining doc-rewrite scope is the 3 files under `docs/`.

> Decision: confirmed. Plan's docs phase covers (a) `rm -rf .agents/skills/rpgmaker-character/` (drops 3 files); (b) rewriting `docs/rpgmaker-generation-process.md` (full layout section + 5 scattered refs), `docs/rpgmaker-graphics.md` (light touch), `docs/rpgmaker-phases.md` (light touch); (c) a final `grep -rn "artifacts/\|reports/\|debug/\|prompts/\|frames/\|normalized/\|source_strips/" docs/` sweep to confirm no stragglers reference the old layout.

### B8. Migrator git-mv batching

Spec mentions the migrator uses `git mv` if available so history follows. Worth pinning the batching: each migrator run should produce ONE commit containing all moves so `git log --follow` and `git blame` work cleanly across the rename. (Or: leave moves as workdir changes and let the human commit them in one go — same end state.)

> Decision: MOOT per the migration-scope decision. The simplified one-off script uses `git mv` to stage moves; the human commits them in one batch alongside the schema-aware code changes for that phase. No `--reverse` flag (the script is disposable and small enough to read before running).

### B9. The migration report path

Spec proposes the migrator writes its report to `artifacts/_migration_008.json`. After 008 the artifacts directory carries cross-cutting reports like `manifest_validation.json` and `render_all_prompts.json`. The `_migration_008.json` prefix-with-underscore convention sits oddly next to those.

> Decision: MOOT per the migration-scope decision. The simplified one-off script doesn't emit a migration report — its output is the moves themselves (visible via `git status` after the script runs). Disposable script, no audit trail needed beyond the eventual commit.

### B10. spec's `## Why` example mentions `face/<charname>_face_source.png` as the today path — but `<charname>_<asset>_source.png` is the actual today shape

Minor accuracy: the spec's worked example at lines 22-29 shows `face/<charname>_face_source.png`. That's correct (live: `ThePuppetMaster_face_source.png`). Calling out for clarity, not for change.

> Decision: no decision needed; flagged for accuracy only.

---

## Suggested fold-questions next prompt

Once the inline `> Decision:` answers are added:

```
Use the human-gated-spec-driven-ai-development skill to fold-questions for 008-artifacts-reorg-questions-01.md
```
