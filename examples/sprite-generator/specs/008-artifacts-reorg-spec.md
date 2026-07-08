# 008 - Artifacts Reorg Spec

This spec flips the per-character artifacts layout from cross-cutting top-level directories (`prompts/`, `reports/`, `debug/`, `face/`, `picture/`, `enemy/`, `character_reference/`, `character_movement/`, `damage_poses/`, `sideview_battler/`) to an asset-first layout where every artifact for a given asset lives under that asset's directory (`face/prompt.md`, `face/source.png`, `face/normalized.png`, `face/reports/`, `face/debug/`, …).

The motivating user-experience problem: inspecting a single asset today requires bouncing between 4-6 separate top-level directories. After 008 it's one directory.

This is the third of five sibling cleanup specs ([006](006-prompt-cleanup-spec.md) → [007](007-asset-consolidation-spec.md) → 008 → [009](009-script-character-generation-spec.md) → [010](010-ui-character-generation-spec.md)).

Open questions resolved by [008-artifacts-reorg-questions-01.md](008-artifacts-reorg-questions-01.md) (kept as history); decisions folded into the body below.

## Source Of Truth

- [006-prompt-cleanup-spec.md §Sibling specs](006-prompt-cleanup-spec.md) — points to this spec as the artifacts-layout follow-on.
- [characters/ThePuppetMaster/artifacts/](../characters/ThePuppetMaster/artifacts/) — the live example layout that drives the audit.
- The various scripts under [scripts/](../scripts/) that build artifact paths inline today (no shared helpers exist; 008 introduces them — see Affected files).
- [docs/rpgmaker-generation-process.md](../docs/rpgmaker-generation-process.md) — documents the current layout authors expect.
- ~~[.agents/skills/rpgmaker-character/](../.agents/skills/rpgmaker-character/)~~ — the agent skill is being deleted entirely as part of 008 (per A8 below: the skill struggled to generate assets reliably and the project is moving to script-driven 009 then UI-driven 010).

## Why

Every artifact for the `face` asset on a typical character lives in **6 separate places** today:

| Artifact | Location |
|---|---|
| Rendered prompt | `prompts/face.md` |
| AI-generated source PNG | `face/<charname>_face_source.png` |
| Normalized output | `face/normalized/...` |
| Normalize report | `reports/face_normalize.json` |
| Validate report | `reports/face_validate.json` |
| Bounds debug overlay | `debug/face_bounds.png` |

Multiply by 7 assets × multiple frames per asset and an author trying to debug or review one asset spends most of their time bouncing across the directory tree. The cross-cutting `prompts/`, `reports/`, `debug/` directories also make selective deletion painful (regenerating one asset requires touching 4 dirs).

## Goal

After 008, every per-asset artifact lives under `characters/<name>/artifacts/<asset>/` with a predictable shape. Cross-cutting reports stay at the top level. Asset directories are independently deletable, packageable, and inspectable.

## Non-Goals

- Changing what artifacts get generated (no new outputs, no removed outputs — only relocations).
- Changing image content or generation logic (006 / 007 / 009 territories).
- Backward compatibility with the existing layout. Per the project's clean-break stance, existing characters get migrated by a one-shot script.
- Renaming individual files within an asset's directory (e.g., `<charname>_face_source.png` doesn't get renamed to just `source.png` — but it could; see Open Questions).

## Schema

### Top-level layout

```
characters/<name>/artifacts/
├── manifest_validation.json       ← cross-cutting (validator output)
├── render_all_prompts.json        ← cross-cutting (renamed from prompts/_report.json per B3)
├── package_summary.md             ← cross-cutting (final pack review report)
│
├── character_reference/           ← asset-first per-asset directory
├── face/
├── picture/
├── enemy/
├── character_movement/
├── damage_poses/
└── sideview_battler/
```

Cross-cutting reports (`manifest_validation.json`, `render_all_prompts.json`, `package_summary.md`) keep their top-level placement because they describe the pack-level state, not a single asset. Per B3, `render_all_prompts.json` is the new home of the report previously written to `prompts/_report.json` (the `prompts/` directory itself is gone — its contents moved into per-asset `prompt.md` files for Patterns A/B and `<asset>/prompts/<key>.md` for Pattern C).

### Per-asset directory shape — three patterns

Each asset directory follows one of three patterns based on asset shape:

#### Pattern A: Single-image (face, picture, enemy)

```
<asset>/
├── prompt.md                      ← rendered prompt
├── source.png                     ← AI-generated source (chroma-keyed)
├── normalized.png                 ← normalized RGBA output (root-level file, not a dir)
├── reports/
│   ├── normalize.json
│   └── validate.json
├── debug/
│   └── bounds.png                 ← optional alpha-bounds preview
├── rejected/                      ← rejected variants (per-asset bin)
└── needs-regeneration/            ← author flag (per-asset bin)
```

Empty optional directories (`rejected/`, `needs-regeneration/`, `debug/`) are not created until they have content. The `attempts/` directory from the pre-008 layout is **dropped entirely** (per A4 / Decisions Resolved); rejected attempts go into `rejected/` instead.

#### Pattern B: Single-strip multi-frame (character_reference, damage_poses)

```
<asset>/
├── prompt.md
├── source.png                     ← single strip containing N frames
├── frames/                        ← extracted N frames from source.png
│   ├── view_0.png … view_3.png    (character_reference; convention stays)
│   └── 0.png … 2.png              (damage_poses; redundant prefix dropped per A6)
├── normalized/                    ← normalized N frames; one per frame
├── reports/
│   ├── extract.json
│   ├── normalize_<i>.json
│   ├── assemble.json
│   └── validate.json
├── debug/
│   ├── bounds_<i>.png
│   └── grid.png
├── previews/                      ← damage_poses ONLY; gif of the 3-frame degradation
│   └── damage_poses.gif
├── rejected/, needs-regeneration/
```

`character_reference` does NOT carry a `previews/` directory (per A3 — 4 static views don't animate). `damage_poses` keeps `previews/` for its 3-frame degradation gif.

#### Pattern C: Multi-key multi-strip (character_movement, sideview_battler)

```
<asset>/
├── prompts/
│   ├── <key>.md                   ← one prompt per direction/motion
├── source_strips/
│   ├── <key>_source.png           ← one source strip per direction/motion
├── frames/
│   ├── <key>_<i>.png              ← extracted frames (3 per key)
├── normalized/
│   ├── <key>_<i>.png
├── reports/
│   ├── <key>_extract.json         ← redundant `movement_` / `sideview_` prefix dropped
│   ├── <key>_<i>_normalize.json   ← per A6: e.g. `down_0_normalize.json`, not `movement_down_0_normalize.json`
│   ├── assemble.json              ← drops both the `<key>_` and the asset prefix when whole-sheet scoped
│   └── validate.json
├── debug/
│   ├── <key>_<i>_bounds.png
│   └── grid.png
├── previews/
│   └── <key>.gif
├── rejected/, needs-regeneration/
```

`<key>` is a direction (`down`, `left`, `right`, `up`) for character_movement and a motion (`thrust`, `swing`, … 18 total) for sideview_battler. The `attempts/` directory is dropped from Pattern C as well.

### Within-asset filename convention

All filenames inside the asset directory use **short, asset-relative names**, not character-prefixed names (per A1). Today's `<charname>_<asset>_source.png` becomes just `source.png` because the asset directory's path already disambiguates by character. The character name lives in the path, not in the filename.

This applies uniformly to source files, normalized outputs, frame indices, reports, and debug overlays. Per A6 the same rule extends to redundant *asset* prefixes inside the asset's own subdirs (e.g. `damage_poses/frames/0.png` not `damage_poses/frames/damage_pose_0.png`; `character_movement/reports/down_0_normalize.json` not `character_movement/reports/movement_down_0_normalize.json`).

### Cross-cutting reports — what stays top-level

| Report | Why it stays cross-cutting |
|---|---|
| `manifest_validation.json` | Validates the entire manifest, not a single asset. |
| `render_all_prompts.json` | Summarizes a multi-asset render-all run. |
| `package_summary.md` | Pack-level human review report (built by `scripts/package_character.py`). |

If a future report is asset-scoped (e.g., a single-asset normalize report), it lives under that asset's `reports/` directory.

## Migration

Scoped tightly per [008-artifacts-reorg-questions-01.md](008-artifacts-reorg-questions-01.md) — there are only 3 in-flight characters and the precious data is a small set of source PNGs (everything else under `artifacts/` is derived and regeneratable by the pipeline).

A short, **disposable** [scripts/migrate_artifacts.py](../scripts/migrate_artifacts.py) (created by 008's plan, deleted after use):

1. Walks `characters/<name>/artifacts/` for the known source-PNG paths only:
   - `face/<name>_face_source.png` → `face/source.png`
   - `picture/<name>_picture_source.png` → `picture/source.png`
   - `enemy/<name>_enemy_source.png` → `enemy/source.png`
   - `character_reference/<name>_reference_source.png` → `character_reference/source.png`
   - `damage_poses/<name>_damage_source.png` → `damage_poses/source.png`
   - `character_movement/source_strips/<name>_<dir>_source.png` → `character_movement/source_strips/<dir>_source.png` (or just `<dir>.png` per A1)
   - `sideview_battler/source_strips/<name>_sv_<motion>_source.png` → `sideview_battler/source_strips/<motion>_source.png`
2. Uses `git mv` to stage moves so blame follows the rename.
3. Removes the obsolete top-level `prompts/`, `reports/`, `debug/`, `rejected/`, `needs-regeneration/`, `attempts/` directories. Their contents are **derived and disposable** — no preservation attempt:
   - Rendered prompts under `prompts/*.md` and `prompts/_report.json` get deleted; the pipeline regenerates them via `render_all_prompts.py` against the current manifest and post-006 templates. The regenerated prompts are objectively better content (006's prompt cleanup landed after these were last rendered).
   - Reports under `reports/` get deleted; the validators / normalizers / extractors regenerate them on the next pipeline run.
   - Debug overlays under `debug/` get deleted; `normalize_image.py` and friends regenerate them when called with the relevant flags.
   - `rejected/` and `needs-regeneration/` are author-set bins; they're empty across all in-flight characters today, so no content to lose.
4. Skips `Smoke` (per A7 the user opted to remove that character entirely; the script emits a notice rather than touching it).

The human commits the resulting workdir changes in one batch alongside the spec / code changes for the migration phase. **No inference table** (only known source-PNG paths are touched), **no idempotency check** (script is run once and then deleted), **no `--reverse` flag** (the script is small enough to read before running).

Deleted derived artifacts get rebuilt by re-running the pipeline (`render_all_prompts` + `normalize_image` + `extract_frames` + `assemble_spritesheet` + `validate_asset`) which under 008 writes natively to the new layout.

## Decisions Folded In

These are the upstream framing decisions that 008 inherits. The 18 newly-resolved questions are tabulated separately under [Decisions Resolved](#decisions-resolved) further down.

| Decision | Source | Where it lands |
|---|---|---|
| Asset-first layout, per-asset directories | [006-prompt-cleanup-spec.md §Per-Character Artifacts Reorg](006-prompt-cleanup-spec.md) | Top-level layout above |
| Three patterns based on asset shape | 006 audit | Pattern A/B/C above |
| Cross-cutting reports stay top-level | 006 audit | `manifest_validation.json`, `render_all_prompts.json`, `package_summary.md` |
| Empty subdirs not created until needed | 006 audit | `rejected/`, `needs-regeneration/`, `debug/`, `previews/` only appear when populated. `attempts/` is dropped entirely (per A4) |
| Disposable one-shot migrator (not in-flight dual-support) | inherited project stance + tightly scoped per A7 | `scripts/migrate_artifacts.py`; deleted after use |

## Affected files

| File | Change |
|---|---|
| [scripts/artifact_paths.py](../scripts/artifact_paths.py) | **NEW** (per B1) — owns every per-asset path convention. Functions like `source_for(asset)`, `normalized_for(asset, frame=None)`, `frames_dir(asset)`, `report_for(asset, step)`, `debug_for(asset, name)`, `prompt_for(asset, key=None)`. Every other script imports from this module rather than building paths inline. |
| [scripts/render_prompt.py](../scripts/render_prompt.py) | Output path resolves via `artifact_paths.prompt_for(asset, key)` to `artifacts/<asset>/prompt.md` (Pattern A/B) or `artifacts/<asset>/prompts/<key>.md` (Pattern C). |
| [scripts/render_all_prompts.py](../scripts/render_all_prompts.py) | Same path resolution; cross-cutting `_report.json` renamed and relocated to `artifacts/render_all_prompts.json` (per B3). |
| [scripts/normalize_image.py](../scripts/normalize_image.py) | Output and report paths via `artifact_paths`. Single-image assets write `<asset>/normalized.png` (Pattern A); multi-frame assets write under `<asset>/normalized/`. |
| [scripts/extract_frames.py](../scripts/extract_frames.py) | Output via `artifact_paths.frames_dir(asset)`; per A6 redundant prefixes dropped from frame filenames where applicable (e.g. `damage_poses/frames/0.png` not `damage_pose_0.png`). |
| [scripts/preview_animation.py](../scripts/preview_animation.py) | Output via `artifact_paths.preview_for(asset, key)`. Skip emission for `character_reference` (per A3). |
| [scripts/assemble_spritesheet.py](../scripts/assemble_spritesheet.py) | Reads from `artifact_paths.normalized_for(asset, frame=...)`; writes the assembled sheet to the canonical character-root path (unchanged) and the assemble report under `<asset>/reports/assemble.json`. |
| [scripts/validate_asset.py](../scripts/validate_asset.py) | Walks `artifact_paths.asset_dir(asset)` for the asset's outputs. |
| [scripts/validate_manifest.py](../scripts/validate_manifest.py) | Cross-cutting report relocated to `artifacts/manifest_validation.json` (top-level). |
| [scripts/new_character.py](../scripts/new_character.py) | Bootstrap creates only the 7 per-asset top-level dirs (per B2); nested subdirs (`source/`, `normalized/`, `frames/`, `reports/`, `debug/`, `rejected/`, `needs-regeneration/`, `previews/`) created on demand by the pipeline. |
| [scripts/package_character.py](../scripts/package_character.py) | Walks the asset-first layout to assemble the pack zip. |
| [scripts/migrate_artifacts.py](../scripts/migrate_artifacts.py) | **NEW** — disposable one-off Python script (per A7 + Migration section); ~80 lines; deleted after use. Touches only known source-PNG paths; no inference table; no `--character` flag. |
| [configs/spritesheets/*.yaml](../configs/spritesheets/) | Audit per B5: most paths reference `artifacts/<asset>/normalized/<key>_<i>.png` which is preserved in 008. Update any references that don't match the new layout. |
| [docs/rpgmaker-generation-process.md](../docs/rpgmaker-generation-process.md) | Re-document the layout (full layout section + ~5 scattered path references). |
| [docs/rpgmaker-graphics.md](../docs/rpgmaker-graphics.md), [docs/rpgmaker-phases.md](../docs/rpgmaker-phases.md) | Light touch — per B7 grep sweep at end of docs phase. |
| `.agents/skills/rpgmaker-character/` | **DELETED** (per A8) — the skill struggled to generate assets reliably and the project is moving to script-driven 009 then UI-driven 010. Removes commands.md, workflow.md, review.md, plus the surrounding directory. |
| `tests/test_rpgmaker_character_skill.py` | **DELETED** along with the agent skill (per B6). |
| `tests/test_rpgmaker_reference_round_trip.py` | Rewrite path expectations for the new layout (per B6). |
| `tests/results/` | Regenerate the integration-output fixtures (safe — they're not hand-crafted goldens). |
| `characters/ThePuppetMaster/artifacts/`, `characters/GreenFairyDragon/artifacts/` | Migrated by the disposable `migrate_artifacts.py` script. |
| `characters/Smoke/` | **DELETED** (per A7 — partial smoke-test character, not worth migrating). |

## Acceptance

- After running `migrate_artifacts.py` on ThePuppetMaster + GreenFairyDragon, every per-asset source PNG lives under `characters/<name>/artifacts/<asset>/source.png` (or `<asset>/source_strips/<key>_source.png` for Pattern C). The cross-cutting `prompts/`, `reports/`, `debug/`, `rejected/`, `needs-regeneration/`, `attempts/` top-level directories are gone.
- `characters/Smoke/` is removed entirely.
- `.agents/skills/rpgmaker-character/` is removed entirely; `tests/test_rpgmaker_character_skill.py` is removed alongside.
- `pytest tests/` is green on the full suite.
- A character regenerated end-to-end (bootstrap → render prompts → generate images → normalize → assemble → validate) produces the new layout natively without invoking the migrator.
- The user can `find characters/ThePuppetMaster/artifacts/face -type f` and see every face artifact in one tree.
- The user can `rm -rf characters/ThePuppetMaster/artifacts/face/` and lose only the face asset's outputs without touching anything else.
- A `tar czf face_pack.tgz characters/ThePuppetMaster/artifacts/face/` produces a self-contained asset bundle suitable for sharing or external review.
- `scripts/artifact_paths.py` exists and every artifact-path build site in `scripts/` imports from it (no inline path concatenation remains).
- [docs/rpgmaker-generation-process.md](../docs/rpgmaker-generation-process.md), [docs/rpgmaker-graphics.md](../docs/rpgmaker-graphics.md), and [docs/rpgmaker-phases.md](../docs/rpgmaker-phases.md) describe the new layout. Final `grep -rn "artifacts/\|reports/\|debug/\|prompts/\|frames/\|normalized/\|source_strips/" docs/` shows no references to the old layout.
- After 008 ships, `scripts/migrate_artifacts.py` is deleted from the repo (the script was disposable; once all 3 in-flight characters are migrated, it has no future job).

## Decisions Resolved

All 18 open questions from [008-artifacts-reorg-questions-01.md](008-artifacts-reorg-questions-01.md) have been resolved by the user (annotations dated 2026-05-09); the choices are folded into the spec body above.

| # | Question | Decision | Notes |
|---|---|---|---|
| A1 | Within-asset filename convention | **Rename to `source.png`** | Path encodes the character; filenames stay short and asset-relative. |
| A2 | `normalized/` vs `normalized.png` | `normalized.png` (root) for Pattern A; `normalized/` (dir) for Patterns B and C | |
| A3 | `previews/` for `character_reference`? | **Drop** for `character_reference` | 4 static views don't animate. Keep `previews/` for damage_poses + character_movement + sideview_battler. |
| A4 | `attempts/` directory? | **Drop entirely** | Rejected attempts go to `<asset>/rejected/` instead. |
| A5 | `rejected/` / `needs-regeneration/` placement? | **Per-asset** under `<asset>/rejected/` and `<asset>/needs-regeneration/` | Matches the granularity an author flags at. |
| A6 | Drop redundant prefixes inside Pattern C reports / Pattern B frames? | **Drop the redundant prefix** | `down_0_normalize.json` not `movement_down_0_normalize.json`; `damage_poses/frames/0.png` not `damage_pose_0.png`. |
| A7 | Migrator partial-migration support? | Migrate all 3 once; **delete `Smoke` entirely** | Smoke was a partial smoke-test character, not worth migrating. No `--character` flag (script is one-shot). |
| A8 | Docs / agent-skill update scope? | **Delete `.agents/skills/rpgmaker-character/` entirely**; rewrite the 3 `docs/` files | Agent skill struggled to generate assets reliably; project moves to script-driven 009 then UI-driven 010. **Future watch-out** for 009/010: chroma-key drift can push otherwise-good images past the slicing tolerance — keep the tolerance generous or add per-image tuning. |
| B1 | Spec's claim of existing `output_path_for(...)` helpers | **Create `scripts/artifact_paths.py`** as a NEW module | Owns every per-asset path convention; every other script imports. |
| B2 | `new_character.py` ARTIFACT_SUBFOLDERS rewrite? | Bootstrap creates only the 7 per-asset top-level dirs | Nested subdirs created on demand by the pipeline. |
| B3 | `prompts/_report.json` rename? | Rename to `artifacts/render_all_prompts.json` | Cross-cutting, top-level. |
| B4 | Migrator filename inference table? | MOOT — disposable script handles only known source-PNG paths | No inference, no fragile parsing. |
| B5 | Spritesheet config audit? | Yes, audit `configs/spritesheets/*.yaml` | Most paths reference `<asset>/normalized/` which is preserved; light touch expected. |
| B6 | Test fixture rewrites? | Delete `test_rpgmaker_character_skill.py` (with skill); rewrite `test_rpgmaker_reference_round_trip.py`; regenerate `tests/results/` | |
| B7 | Documentation scope (per developer's review-time directive) | 3 `docs/` files rewritten; `.agents/skills/rpgmaker-character/` deleted; final grep sweep | |
| B8 | Migrator git-mv batching? | MOOT — script uses `git mv`; human commits in one batch | |
| B9 | Migration report path? | MOOT — disposable script writes no report | `git status` after the script run is the audit. |
| B10 | Spec example accuracy | No change — flagged for review only | |

## What's next

The 18 open questions are resolved (see Decisions Resolved above). Spec is ready for plan generation.

1. **Plan** — file `008-artifacts-reorg-plan.md` with phased apply steps:
   - **Phase 01 — Path helpers + bootstrap.** Create `scripts/artifact_paths.py` (one module owning all per-asset path conventions). Rewrite `scripts/new_character.py` to create only the 7 per-asset top-level dirs. Add tests for the helpers.
   - **Phase 02 — Disposable migrator.** Write `scripts/migrate_artifacts.py` (~80 lines, source-PNG paths only). Run against ThePuppetMaster + GreenFairyDragon; delete `characters/Smoke/`. The migrator deletes itself at the end of this phase.
   - **Phase 03 — Read-side scripts.** Update every script's path-build sites to import from `artifact_paths`. Affects `render_prompt.py`, `render_all_prompts.py`, `normalize_image.py`, `extract_frames.py`, `preview_animation.py`, `assemble_spritesheet.py`, `validate_asset.py`, `validate_manifest.py`, `package_character.py`. Cross-cutting `_report.json` → `artifacts/render_all_prompts.json` move happens here.
   - **Phase 04 — Spritesheet configs.** Audit `configs/spritesheets/*.yaml` for stale paths.
   - **Phase 05 — Tests.** Delete `tests/test_rpgmaker_character_skill.py`; rewrite `tests/test_rpgmaker_reference_round_trip.py`; regenerate `tests/results/`.
   - **Phase 06 — Docs.** Rewrite `docs/rpgmaker-generation-process.md` (full layout section + scattered refs); light touch on `docs/rpgmaker-graphics.md` and `docs/rpgmaker-phases.md`. Final `grep -rn` sweep.
   - **Phase 07 — Agent skill removal.** `rm -rf .agents/skills/rpgmaker-character/`. Confirm no script or doc references remain.
   - **Phase 08 — Smoke render.** Re-render ThePuppetMaster + GreenFairyDragon prompt artifacts under the new layout; spot-check the asset-first tree.
2. **Execute** the plan.
3. **Review** and roll into 009 (script-driven character generation).
