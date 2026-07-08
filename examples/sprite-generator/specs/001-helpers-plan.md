# 001 — Deterministic Helper Scripts Implementation Plan

This plan turns [001-helpers-spec.md](001-helpers-spec.md) into an ordered, checklist-driven build. It mirrors Phases 0–6 of [docs/rpgmaker-phases.md](../docs/rpgmaker-phases.md) and inherits its scripts-first principle: every deterministic script is built and tested against synthetic fixtures before any AI-generated image enters the pipeline.

Phases 7–10 of the phases doc (manifest/checklist bootstrap, prompt templates, AI smoke runs, full character pack) are out of scope here and will be handled by later numbered specs.

## How To Use This Plan

- Work one phase at a time, top to bottom. A phase is "done" only when every checklist item under it is checked **and** its exit criteria pass.
- Each task either edits a file in [001-helpers-spec.md](001-helpers-spec.md)'s "Project Layout" or runs a test. If a task seems to require a file not in the spec, update the spec first.
- Tests are red/green TDD: write a failing test that pins behavior described in the spec, then make it pass. Do not skip the failing-test step.
- When a check fails or surprises you, stop and update the spec or add an Open Question rather than papering over it in code.
- Do not start a later phase before the earlier phase's exit criteria pass. Phases are deliberately gated.

## Status Legend

- `[ ]` — not started
- `[~]` — in progress
- `[x]` — done and verified
- `[!]` — blocked; reference an Open Question or a note below the checklist

## Phase 0 — Foundations

Goal: a clean clone can install dependencies, run `pytest`, and see a placeholder test pass.

Tasks:

- [x] Pin Python version (target: `3.11+`) and document `python -m venv .venv` + activate + `pip install -r requirements.txt` in `README.md` under a new "Helpers Setup" section. Keep the existing Legacy Image Utilities section intact.
- [x] Add `pytest` to `requirements.txt`. Keep `Pillow`. Add `PyYAML` (needed for Phase 5's config loader).
- [x] Create `scripts/__init__.py`, `scripts/cli.py`, `scripts/chroma.py`, `scripts/alpha.py`, `scripts/images.py` as empty/stub modules with docstrings matching the spec's "Shared Utilities" section.
- [x] Create `tests/__init__.py`, `tests/conftest.py`, and `tests/test_smoke.py` with a single placeholder test that asserts `True`.
- [x] Implement the common CLI conventions (key color, sizes, exit codes) in `scripts/cli.py`. Include the size and key-color parsers; leave the per-script argument parsers for later phases.
- [x] Add the `.gitignore` entries from the spec's `.gitignore Additions` section.
- [x] Run `pytest` and confirm the placeholder test passes.

Exit criteria:

- `python -m venv .venv && .venv/bin/python -m pip install -r requirements.txt && .venv/bin/python -m pytest` succeeds on a clean clone.
- `python -c "from scripts import cli, chroma, alpha, images"` imports without error.
- `git status` is clean except for the intentional changes above.

## Phase 1 — Synthetic Fixture Generator

Goal: every later phase has reproducible test inputs without touching an AI model.

Tasks:

- [x] Implement `scripts/fixtures.py` with the CLI from the spec ("Synthetic Fixture Generator").
- [x] Build the deterministic primitives (flat polygon, oval, ring) that fixtures are composed from. Subjects are not anti-aliased except inside `single_edge_bleed.png`. Backgrounds are exact key for the exact-key fixtures and seeded-drifted for the drifted fixtures.
- [x] Generate every fixture listed in the spec's required-coverage list:
  - Exact-key, centered subjects: `single_small.png`, `single_medium.png`, `single_large.png`, `strip_even_3.png`, `strip_two_frames.png`, `strip_four_frames.png`, `strip_tight_gaps.png`, `single_donut.png`, `single_medium_lime.png`, `single_medium_cyan.png`.
  - Exact-key with subject-placement drift: `strip_uneven_3.png` (modest per-frame jitter), `strip_offset_3.png` (strong per-frame drift), `single_offset.png` (single subject off-center and lifted, fully visible with key border on every edge).
  - Source pre-flight rejection: `single_clipped_top.png`, `strip_clipped_top.png` (subject extends past the top edge of the canvas).
  - Background-drifted / AI-realistic: `single_edge_bleed.png`, `single_drifted_key.png`, `strip_noisy_key.png`.
- [x] Commit fixtures under `tests/fixtures/images/` (the image fixtures live alongside `tests/fixtures/manifests/` for the manifest YAML fixtures). Spot-check sizes: each ≤ 50 KB, with `strip_noisy_key.png` allowed up to 150 KB. (Largest is `strip_noisy_key.png` at ~12 KB; total fixture set is 68 KB.)
- [x] Add `tests/test_fixtures.py` that:
  - Re-runs the fixture generator into a temp directory.
  - Asserts byte-for-byte equality against the checked-in copies (determinism gate).
  - Includes a sanity check that `single_drifted_key.png` and `strip_noisy_key.png` actually contain near-key pixels — i.e. zero pixels equal the exact key but a high fraction are within `±40` of it. This guards against silently regenerating exact-key fixtures under the drifted names.
- [x] Wire `tests/conftest.py` so any fixture missing on disk is regenerated on test session start; an existing fixture is never overwritten.

Exit criteria:

- `python -m scripts.fixtures --output tests/fixtures/images/` is a no-op (no diff) when run after a clean checkout.
- `pytest tests/test_fixtures.py` passes.

## Phase 2 — `extract_frames.py`

Goal: split any 3-frame keyed strip into 3 frames without losing subject content.

Tasks:

- [x] Implement `chroma.subject_touches_edge` for the source pre-flight check.
- [x] Implement column-wise key-pixel ratio detection in `scripts/chroma.py` (`column_key_ratios`). Tolerance-aware, so noisy AI backgrounds still produce clean ratios.
- [x] Implement `scripts/extract_frames.py` per the spec, including the source pre-flight that runs before any column-wise detection. Uses `scripts/cli.py` for arg parsing.
- [x] Tests in `tests/test_extract_frames.py`:
  - Happy path on `strip_even_3.png` and `strip_uneven_3.png` — 3 output frames, expected names, non-empty alpha bounds for each.
  - `strip_offset_3.png` — still 3 output frames, each containing the expected subject; this proves gap detection works when subjects are not centered in their cells and not bottom-anchored.
  - `strip_clipped_top.png` — exit code `1`, report contains `BLOCK_SUBJECT_CLIPPED` with the offending edge in `context`, no output frames written. Pins that pre-flight runs before any extraction work.
  - `strip_tight_gaps.png` — still 3 frames; subject pixels are not cut.
  - `strip_noisy_key.png` at the default `--key-tolerance` — still detects 3 frames at the expected gap centers, proving column-wise detection uses tolerance and not exact-key equality.
  - `strip_two_frames.png` — exit code `1`, report contains `BLOCK_TOO_FEW_FRAMES`, no output frames written.
  - `strip_four_frames.png` — exit code `0`, 3 output frames, report includes `WARN_EXTRA_FRAMES` with `count: 1`.
  - Determinism: rerun produces identical bytes.

Exit criteria:

- All `test_extract_frames.py` tests pass.
- Manual run on `strip_uneven_3.png` produces visibly correct frames (eyeball check).

## Phase 3 — `normalize_image.py`

Goal: one keyed source → one normalized, transparent, correctly-sized, anchored, padded PNG.

Tasks:

- [x] Implement `scripts/chroma.remove_key` with despill, plus `scripts/chroma.count_key_residue` (used by normalize_image's output validation pass and later by validate_asset.py).
- [x] Implement `scripts/alpha.alpha_bounds`, `edge_touch`, `padding_per_edge`.
- [x] Implement `scripts/images.place_on_canvas` and `scale_to_fit` using Pillow `LANCZOS`. `scale_to_fit` is anchor-aware so bottom-center can use the bottom row.
- [x] Implement `scripts/normalize_image.py` per the spec, including the source pre-flight check (step 2 of the pipeline) and the asset-type → anchor/padding table.
- [x] Tests in `tests/test_normalize_image.py`:
  - Single-subject fixtures normalized for `movement_frame` (48×48, bottom-center) — final size exact, transparent corners, no edge touch on top/left/right, no key residue.
  - Same for `face` (144×144, center).
  - `single_edge_bleed.png` — despill removes residue; `key_residue_count` is `0`.
  - `single_drifted_key.png` at default tolerance — background is fully removed even though no pixel matches the exact magenta RGB; `key_residue_count` is `0`. With `--key-tolerance 0` removal does nothing, the resulting output is fully opaque, and validation blocks (`BLOCK_EDGE_TOUCH` on every padded edge), pinning the tolerance contract.
  - `single_donut.png` — interior key is removed; output has interior alpha hole preserved.
  - `single_medium_lime.png` and `single_medium_cyan.png` with matching `--key-color` — each exits clean. With wrong `--key-color`, the source pre-flight blocks first because every edge looks non-key; the test pins `BLOCK_SUBJECT_CLIPPED` rather than the originally-guessed `BLOCK_EMPTY_FRAME`.
  - Anchor smoke test: `bottom-center` puts the subject's bottom alpha bound at canvas bottom; `center` does not.
  - `single_offset.png` normalized for `movement_frame` — even though the source places the subject in the upper-left quadrant, the normalized output has the subject's bottom alpha bound at the canvas bottom and is horizontally centered within `±1` px.
  - `single_clipped_top.png` normalized for `movement_frame` — exit code `1`, report contains `BLOCK_SUBJECT_CLIPPED` with `top` in `context.edges`, no normalized output written.

Exit criteria:

- All `test_normalize_image.py` tests pass.
- Normalized outputs from at least one Phase 1 fixture pass every alpha/dimension/anchor/padding check listed in the spec.

## Phase 4 — Validation Report Format And `validate_asset.py`

Goal: a single canonical JSON report shape, emitted by every script that validates anything.

Tasks:

- [x] Implement the report data class / schema in a new `scripts/report.py` with helpers to construct, serialize, and validate the JSON shape from the spec.
- [x] Add `scripts/validate.py` with the shared `ASSET_DEFAULTS` table plus `validate_frame_image` / `validate_sheet_image` so `normalize_image.py`, `validate_asset.py`, and the future `assemble_spritesheet.py` all share one validation pass.
- [x] Refactor `extract_frames.py` and `normalize_image.py` to write reports through `scripts/report.py` so the schema is never duplicated.
- [x] Implement `scripts/validate_asset.py`:
  - For frame-level asset types: re-run the dimension / alpha / padding / residue checks and emit a report.
  - For sheet-level asset types: run grid-aware checks (`frame_bounds` per cell, consistent frame size, transparent corners on the sheet) using `ASSET_DEFAULTS` defaults overridable via `--final-size` / `--frame-size` / `--grid`. (YAML `--config` deferred to Phase 5 alongside `assemble_spritesheet.py`.)
- [x] Tests in `tests/test_validate_asset.py`:
  - One passing test per asset type using a known-good synthetic output (10 cases — every frame and sheet type).
  - One failing test per blocking code: `BLOCK_WRONG_DIMENSIONS`, `BLOCK_MISSING_ALPHA`, `BLOCK_EMPTY_FRAME`, `BLOCK_EDGE_TOUCH`, `BLOCK_MISSING_OUTPUT` via `validate_asset`; `BLOCK_SUBJECT_CLIPPED` and `BLOCK_TOO_FEW_FRAMES` already covered by the Phase 2/3 negative tests.
  - One test per warning code: `WARN_NON_TRANSPARENT_CORNER`, `WARN_KEY_RESIDUE`, `WARN_SUBJECT_SIZE_OUT_OF_BAND`, `WARN_INCONSISTENT_FRAME_BOUNDS` via `validate_asset`; `WARN_EXTRA_FRAMES` via re-validating `extract_frames`'s report.
  - Schema-conformance test: every JSON report any helper script wrote into `tests/results/` during the suite run is re-checked against `report.validate_report_shape`. This is the cross-script gate that proves all tools share one schema.

Exit criteria:

- Every blocking and warning code in the spec is exercised by at least one passing and one failing test.
- `extract_frames.py` and `normalize_image.py` emit reports that conform to the same schema.

## Phase 5 — `assemble_spritesheet.py`

Goal: assemble normalized frames into final RPG Maker-ready spritesheets, fully config-driven.

Tasks:

- [x] Add a YAML loader to `scripts/cli.py` (`load_assemble_config(path)`) that validates the schema from the spec — required top-level keys, well-formed `output.size` / `frame.size` / `grid`, non-empty `cells` with unique in-bounds positions.
- [x] Implement `scripts/assemble_spritesheet.py` per the spec. Pre-flight every cell against the frames dir (missing or wrongly-sized frames block before the sheet is written); on success, run the shared `validate.validate_sheet_image` pass and merge into one canonical report.
- [x] Author the three reference configs:
  - `configs/spritesheets/character_movement.yaml` — 4×3 grid, 48×48, frame ids `down_0..up_2`.
  - `configs/spritesheets/damage_poses.yaml` — 1×3 grid, 48×48, frame ids `damage_pose_0..2`.
  - `configs/spritesheets/sideview_battler.yaml` — 6×9 grid, 64×64, all 54 frame ids in row-major order from [docs/rpgmaker-graphics.md](../docs/rpgmaker-graphics.md) "Side-View Battler Spritesheet".
- [x] Tests in `tests/test_assemble_spritesheet.py`:
  - Synthetic frames sized to each config's `frame.size` are written into a temp `frames-dir`; each reference config assembles to the canonical sheet dimensions (144×192 / 144×48 / 576×384) and the report's per-cell `frame_bounds` carries the frame names from the config. The Phase 4 schema-conformance gate also re-validates the resulting reports.
  - Missing-frame test → `BLOCK_MISSING_OUTPUT`, exit 1, no sheet written.
  - Wrong-frame-size test → `BLOCK_WRONG_DIMENSIONS`, exit 1.

Exit criteria:

- All three reference sheet types assemble end-to-end from synthetic data and pass Phase 4 validation without manual intervention.

## Phase 6 — Reference Helpers

Goal: three grid-aligned reference helpers, one per stage of the multi → single → animations → frames decomposition chain, plus an animation-preview helper. Out of the critical generation path. All three extractors are pure grid math — they must never call chroma removal or normalization. See spec section "Two kinds of frame extraction" and "Three-stage decomposition chain" for the contracts these inherit.

Tasks:

- [x] Add an `animations` field to each sheet entry in `validate.ASSET_DEFAULTS` (`movement_sheet` → `["down", "left", "right", "up"]`; `damage_sheet` → `["damage_pose"]`; `sv_battler_sheet` → the 18-name row-major list from the spec). Assert in test that for every sheet type `len(animations) * 3 == rows * cols`.
- [x] **Stage 1.** Implement `scripts/split_multi_character.py`:
  - Inputs: `--input`, `--rows`, `--cols`, `--output-dir`, `--prefix-dollar`/`--no-prefix-dollar`, optional `--report-output`.
  - Reject with `BLOCK_WRONG_DIMENSIONS` (no output written) when `width % cols` or `height % rows` is nonzero.
  - Otherwise crop `cw × ch` cells row-major and save as `<prefix><stem>_<n>.png` with `n` 1-indexed top-left first.
  - Emit a canonical report (`asset_type: "split_multi_character"`).
- [x] **Stage 2.** Implement `scripts/split_sheet_animations.py`:
  - Inputs: `--input`, `--asset-type` (sheet types only), `--output-dir`, optional `--report-output`.
  - Look up grid + animation names from `validate.ASSET_DEFAULTS`.
  - Reject with `BLOCK_WRONG_DIMENSIONS` (no output written) when sheet dimensions aren't evenly divisible by the grid.
  - For each animation `(i, name)`, save the 3-cell strip from `sheet_row = i // animations_per_row`, `col_start = (i % animations_per_row) * 3` as `<name>.png`.
  - Emit a canonical report (`asset_type` matches the input asset type).
- [x] **Stage 3.** Implement `scripts/split_animation_strip.py`:
  - Inputs: `--input`, `--prefix`, `--output-dir`, `--frames` (default `3`), optional `--report-output`.
  - Reject with `BLOCK_WRONG_DIMENSIONS` (no output written) when `width % frames != 0`.
  - Slice into `frames` equal-width cells; save as `<prefix>_<f>.png`.
  - Emit a canonical report (`asset_type: "split_animation_strip"`).
- [x] Implement `scripts/preview_animation.py` per the spec. Default cycle `pingpong`.
- [x] Tests in `tests/test_split_multi_character.py`:
  - 4×2 split of a hand-built sheet produces 8 outputs in row-major order with names `$<stem>_1.png`..`$<stem>_8.png`; without `$` flag, no `$` prefix.
  - Width-not-divisible / height-not-divisible inputs block with `BLOCK_WRONG_DIMENSIONS`, no outputs written.
  - **Round-trip identity:** stitch 8 distinct cell PNGs into a 4×2 sheet, split, and assert each output equals the corresponding source cell byte-for-byte.
- [x] Tests in `tests/test_split_sheet_animations.py`:
  - For each of `movement_sheet`, `damage_sheet`, `sv_battler_sheet`: assemble a sheet from synthetic frames (reuse Phase 5 infra), run stage 2, assert exactly one strip per animation in `ASSET_DEFAULTS[asset_type]["animations"]` and each strip is byte-identical to the corresponding 3-cell slice of the source sheet.
  - Sheet dimensions not divisible by the asset type's grid → `BLOCK_WRONG_DIMENSIONS`, no outputs written.
- [x] Tests in `tests/test_split_animation_strip.py`:
  - Default 3-frame split: a 144×48 strip yields three 48×48 frames named `<prefix>_0.png` / `_1.png` / `_2.png`, each byte-identical to its column.
  - `--frames 5` splits a 250-wide strip into five 50-wide frames.
  - Width-not-divisible-by-frames → `BLOCK_WRONG_DIMENSIONS`, no outputs written.
- [x] **Full-chain round-trip test** in `tests/test_reference_chain_round_trip.py`:
  - For each of the three sheet asset types: assemble a synthetic sheet → stage 2 (sheet → animation strips) → stage 3 (each strip → frames) → reassemble via `assemble_spritesheet.py`. Assert the final sheet is byte-identical to the original. This is the strongest possible proof that the grid math is lossless across the whole chain.
- [x] **Reference-config consistency test** in `tests/test_assemble_spritesheet.py`:
  - For every entry in `validate.SHEET_TYPES`, expand `ASSET_DEFAULTS[asset_type]["animations"]` row-major over the asset's grid (3 frames per animation, `animations_per_row = cols // 3`) into the canonical `[(row, col, frame_name), ...]` list and assert it equals the corresponding YAML config's `cells` list. Catches silent drift between `ASSET_DEFAULTS.animations` and the hand-authored `configs/spritesheets/*.yaml` ordering — without this gate, the two could diverge and round-trips would silently produce subtly-wrong sheets.
- [x] **Real RPG Maker round-trip tests** in `tests/test_rpgmaker_reference_round_trip.py` (uses real assets from `shared/style_reference/raw/rpgmaker/`):
  - `characters/Actor1.png` and `characters/Damage1.png` (each 576×384, 4×2 of single-character sheets): run stage 1 with `--rows 2 --cols 4`, hand-stitch the 8 outputs back into a 576×384 canvas (no multi-character assembler exists, and we don't need one), compare RGBA pixels to the original.
  - `sv_actors/Actor1_1.png` (576×384 sv_battler_sheet shape): run stage 2 (asset_type=`sv_battler_sheet`), stage 3 on each of the 18 strips, then assemble via `configs/spritesheets/sideview_battler.yaml`. Compare RGBA pixels to the original.
  - One stage-1 cell of `Actor1.png` taken as a single 144×192 movement_sheet: run stages 2+3, assemble via `configs/spritesheets/character_movement.yaml`, compare RGBA pixels.
  - All comparisons happen in RGBA pixel space (both sides loaded via `Image.convert("RGBA")` so source palette modes vs. our RGBA output don't cause spurious diffs). If any of these fail, the grid math has drifted and Phase 6 is not done.
- [x] Tests in `tests/test_preview_animation.py`:
  - GIF generated from Phase 1 strip fixtures has the expected frame count for `forward` and `pingpong` and re-opens cleanly via Pillow.
- [x] Smoke-run all three split scripts against a real reference under `shared/style_reference/raw/rpgmaker/` and visually confirm outputs land in the configured destination, never in `characters/`. (Subsumed by `test_rpgmaker_reference_round_trip.py`, which runs all three scripts against `Actor1.png`, `Damage1.png`, and `sv_actors/Actor1_1.png`; outputs land under `tests/results/test_real_*/` for inspection.)

Exit criteria:

- All Phase 6 tests pass.
- Synthetic full-chain round-trip is byte-identical on each of the three sheet asset types.
- Real-world RGBA round-trip on `Actor1.png`, `Damage1.png`, and `sv_actors/Actor1_1.png` produces pixel-identical output. This is the strongest "everything is wired up correctly" gate available before AI generation enters the loop.
- `validate.ASSET_DEFAULTS` animation order and `configs/spritesheets/*.yaml` `cells` lists are pinned consistent by the reference-config consistency test.
- All Phase 6 reports pass `report.validate_report_shape` (cross-script schema gate from Phase 4).
- No Phase 6 helper writes into a character folder under `characters/<Name>/`.

## Cross-Cutting Tasks

These run alongside the phases above; check them off as the relevant phase lands.

- [x] Document each script's `--help` output by running it from a clean clone and pasting the output into a `scripts/README.md`. ([scripts/README.md](../scripts/README.md) covers all nine CLI scripts plus common conventions.)
- [x] After Phase 5 completes, update the top-level [README.md](../README.md) "Current Direction" section to point at this spec and plan instead of the old workflow description. (Also added a "Running the helpers on a real keyed source" hand-off section that walks through extract → normalize → assemble → validate end-to-end.)
- [x] **Post-Phase-5 follow-up (OQ-7).** `frame.size` is now optional in `configs/spritesheets/*.yaml` and in `cli.load_assemble_config`: derived as `output.size // grid` when omitted, with consistency validation when both are provided. Tests in [`tests/test_assemble_spritesheet.py`](../tests/test_assemble_spritesheet.py) pin both the derive path and the rejection of inconsistent explicit sizes.
- [x] After every phase, run `pytest` from the repo root and confirm the full suite is green; do not let earlier phases regress. (Held throughout Phases 0–6; current run: 85/85.)

## Risk And Rollback Notes

- **Pillow version drift.** ~~Pin~~ **Pinned** `Pillow` to a known-good major version in `requirements.txt` (`Pillow>=12.0,<13.0`) now that Phase 3's despill is stable. Re-pinning to a future major version is cheaper than chasing a subtle resampling change after the fact.
- **Fixture churn.** Once committed, fixtures are part of the test contract. Renaming or regenerating a fixture is a test-breaking change; do it deliberately, in its own commit.
- **Old scripts.** `scripts/_old/` stays as reference. Do not import from it. Do not delete it from this plan; a future spec may decide to delete or migrate it.
- **Anchor surprises.** The Side-View Battler default anchor is `center`. Phase 9 (in a later spec) may move it to `bottom-center` after a real AI strip is reviewed; that change updates the spec and the `sideview_battler.yaml` config in the same commit.

## Definition Of Done For Spec 001

All of the following are true:

- Phases 0–6 checklists are fully `[x]`.
- A clean clone runs `pytest` green.
- `python -m scripts.fixtures --output tests/fixtures/images/` is a no-op.
- Every script in the spec's "Project Layout" exists, has a `--help`, and is importable.
- Every blocking and warning code in the spec is exercised by tests.
- The `Open Questions` section of [001-helpers-spec.md](001-helpers-spec.md) has been revisited; resolved questions are folded into the spec and unresolved ones are tagged with the future spec that will address them.
- A short hand-off note has been added to [README.md](../README.md) describing how to run the helpers on a real keyed source.
