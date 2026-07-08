# 001 — Deterministic Helper Scripts Spec

This spec defines the deterministic helper-script layer of the RPG Maker sprite generator. It is the first numbered spec under the new process and is the source of truth for *what* the helper scripts must do. The build order and exit criteria for these scripts live in [001-helpers-plan.md](001-helpers-plan.md).

The two upstream source-of-truth documents this spec is built on are:

- [docs/rpgmaker-graphics.md](../docs/rpgmaker-graphics.md) — what the final assets are.
- [docs/rpgmaker-generation-process.md](../docs/rpgmaker-generation-process.md) — how characters are produced end-to-end.

The phased build order this spec is paired with is:

- [docs/rpgmaker-phases.md](../docs/rpgmaker-phases.md) — Phases 0–6 are in scope here. Phases 7–10 (manifest, prompt templates, AI smoke runs, full character pack) are explicitly out of scope and will be covered by later specs.

If anything below conflicts with the two upstream docs, those docs win and this spec must be updated.

## Scope

In scope:

- The deterministic, scripts-first processing pipeline that turns approved AI-generated chroma-key source images into RPG Maker MZ-ready PNGs.
- A synthetic chroma-key fixture generator that lets every script be developed and tested before any AI image enters the pipeline.
- A machine-readable validation report format used by every script.
- Optional helpers that improve human review and reference-building (`preview_animation.py`, `extract_rpgmaker_reference.py`).

Out of scope (deferred to later numbered specs):

- Final `character-spec.yaml` manifest schema, `checklist.md` template, and `new_character.py` bootstrap (Phase 7).
- Modular prompt templates and prompt rendering (Phase 8).
- End-to-end AI smoke runs and the first full character pack (Phases 9–10).
- Any RPG Maker MZ project import or packaging step.

Out of scope permanently:

- Detection of body parts (feet, eyes, head). Anchoring is alpha-bounds based and configured per asset type (see [docs/rpgmaker-generation-process.md](../docs/rpgmaker-generation-process.md) "Anchoring Rules").
- Editing or repainting the artwork itself. Scripts only crop, key-out, scale, anchor, pad, validate, and assemble.

## Guiding Principles

1. **Scripts-first.** Every deterministic script must work end-to-end on synthetic fixtures before it is run against a single AI-generated image.
2. **Determinism.** Same input + same flags + same key color = byte-identical output. No time-based filenames, no implicit current-working-directory behavior. Any randomness used inside fixture generation is seeded.
3. **Tolerant of AI key drift.** AI-generated chroma-key backgrounds are never exact. Pixels claimed by the model to be `#ff00ff` routinely arrive as `#fa05f7`, with per-pixel jitter, JPEG-like blocking, and anti-aliased subject edges. Every script that consumes keyed input must therefore work in terms of *key color ± tolerance*, not exact RGB equality, and the test fixtures must include drifted, jittered, and edge-bled cases — not only synthetic exact-key cases.
4. **Separation from creative work.** These scripts never call an image model, never embed prompt text, never decide if a frame "looks right." Human approval gates live in the process doc, not in code.
5. **Reuse over duplication.** Chroma-key removal, alpha-bounds, padding, and CLI argument parsing live in a shared utilities module so each script is thin.
6. **Configurability over hard-coding.** Key color, anchor, target size, and grid layout are passed in. Defaults match [docs/rpgmaker-graphics.md](../docs/rpgmaker-graphics.md) but never override an explicit flag.
7. **Old scripts are reference only.** `scripts/_old/` informs design but no module under `scripts/_old/` is imported by new code.

## Project Layout

The helper layer adds the following structure under the repo root. Existing `_old/` folders are not touched.

```text
sprite-generator/
  scripts/
    __init__.py
    cli.py                       # shared CLI argument helpers and exit codes
    chroma.py                    # chroma-key removal, despill, key-residue counting
    alpha.py                     # alpha-bounds, padding measurement, edge-touch checks
    images.py                    # IO, anchoring, scaling, padding helpers
    fixtures.py                  # synthetic fixture generation
    extract_frames.py            # Phase 2
    normalize_image.py           # Phase 3
    validate_asset.py            # Phase 4
    assemble_spritesheet.py      # Phase 5
    preview_animation.py         # Phase 6
    extract_rpgmaker_reference.py# Phase 6
  tests/
    __init__.py
    conftest.py                  # fixture generation hooks for pytest
    test_extract_frames.py
    test_normalize_image.py
    test_validate_asset.py
    test_assemble_spritesheet.py
    test_preview_animation.py
    test_fixtures.py
    fixtures/                    # checked-in synthetic PNGs (small)
  configs/
    spritesheets/
      character_movement.yaml
      damage_poses.yaml
      sideview_battler.yaml
```

`scripts/__init__.py` exists so `scripts/` is importable as a package by tests. None of the helper scripts read files relative to `__file__`; all paths are CLI arguments.

## Common CLI Conventions

Every helper script accepts these flags where they apply, with consistent names and behavior:

| Flag | Type | Applies to | Behavior |
| --- | --- | --- | --- |
| `--key-color` | `magenta` \| `lime` \| `cyan` \| `#rrggbb` | scripts that consume keyed input | Names map to the priority table in [docs/rpgmaker-graphics.md](../docs/rpgmaker-graphics.md) ("Transparency And Keyed Sources"). Hex form is exact match. No auto-detection. |
| `--key-tolerance` | int 0–64 | scripts that consume keyed input | Maximum per-channel distance from key color for a pixel to be considered "key". Default `40`, chosen from Phase 9 smoke-run evidence to absorb typical AI background drift and JPEG-like artifacts. Lower it (down to `0`) only when running against an exact synthetic key; raise it for unusually drifted sources. |
| `--despill` / `--no-despill` | flag | chroma-removing scripts | Suppress key-color bleed on subject edges. Default on. |
| `--report-output` | path | every script that produces a validation report | Path to write the JSON validation report. Optional except where noted. |
| `--debug-output` | path or dir | every script | Where to write debug overlays/contact sheets. If a directory, the script chooses well-known filenames. |
| `--anchor` | `bottom-center` \| `center` | normalization | Override the configured anchor. Default depends on asset type. |
| `--final-size` | `WxH` | normalization, assembly | Final pixel dimensions. |
| `--frame-size` | `WxH` | extraction, normalization, assembly | Per-cell pixel dimensions. |
| `--padding` | int | normalization | Minimum transparent padding on non-anchor edges. Default `1`. |
| `--config` | path | `assemble_spritesheet.py` | YAML config (see schema below). |

Exit codes:

| Code | Meaning |
| --- | --- |
| `0` | Success. Validation report (if any) contains zero blocking failures. |
| `1` | Blocking validation failure. Output may have been written; report describes what failed. |
| `2` | Usage / argument error (missing required path, unknown key color, malformed YAML). No output written. |
| `3` | Unrecoverable IO error (cannot read input, cannot write output). No partial output left behind. |

Scripts must never write output files when they exit non-zero unless explicitly described in the per-script section below.

Logging: scripts write a one-line human-readable summary to stdout on success and a structured error to stderr on failure. Detailed information lives in the JSON report, not in stdout.

## Shared Utilities

These modules live under `scripts/` and are imported by every helper script. They are the single source of truth for the corresponding behavior.

### `scripts/chroma.py`

- `remove_key(img, key_rgb, tolerance, despill=True) -> Image`: returns an `RGBA` image with key-color pixels set to alpha 0 and despilled at the boundary.
- `count_key_residue(img, key_rgb, tolerance) -> int`: counts pixels still close to the key color in a transparent image (used by validation).
- `subject_touches_edge(img, key_rgb, tolerance) -> dict[str, bool]`: for each of the four edges of `img`, returns `True` if any pixel on that edge is outside the key tolerance band. Used by source pre-flight in `extract_frames.py` and `normalize_image.py` (see "Source Pre-flight" below). The check operates on the still-keyed source image, so it does not require chroma removal first.
- `column_key_ratios(img, key_rgb, tolerance) -> list[float]`: per-column fraction of pixels within `tolerance` of `key_rgb`. Used by `extract_frames.py` to find inter-frame gaps without depending on exact-key equality.
- Despill is implemented as channel suppression on edge pixels where alpha is partial; algorithm details may be informed by `scripts/_old/remove_chroma_key.py` and `scripts/_old/clean_transparent_edges.py` but the implementation is written fresh.

### `scripts/alpha.py`

- `alpha_bounds(img) -> (left, top, right, bottom) | None`: tightest bounding rectangle of non-zero alpha pixels. Returns `None` for fully-transparent input.
- `edge_touch(img) -> {"left": bool, "right": bool, "top": bool, "bottom": bool}`: whether any opaque-enough pixel touches each edge.
- `padding_per_edge(img) -> {"left": int, "right": int, "top": int, "bottom": int}`: pixel distance from each edge to the nearest opaque-enough pixel.
- "Opaque-enough" threshold is `alpha >= 8` (configurable constant, not a CLI flag).

### `scripts/images.py`

- `place_on_canvas(img, canvas_size, anchor) -> Image`: pastes a cropped subject onto a transparent canvas of `canvas_size` using `bottom-center` or `center` anchoring.
- `scale_to_fit(img, target_size, anchor, padding) -> Image`: scales an `RGBA` image so it fits inside `target_size`, leaving at least `padding` px on every non-anchor edge (`top`, `left`, `right` for `bottom-center`; all four for `center`). Preserves aspect ratio. Uses Pillow `LANCZOS`.
- All scaling is done before final canvas placement so anchoring math is exact.

### `scripts/cli.py`

- Argument parsers for every common flag listed above.
- `parse_size("WxH") -> (int, int)`.
- `resolve_key_color(name_or_hex) -> (r, g, b)`.
- Exit-code helpers so individual scripts cannot accidentally exit `0` after writing a failing report.

## Source Pre-flight

Every helper script that consumes a keyed source image runs the same pre-flight check before any other work: the four edges of the source canvas must lie entirely within `--key-tolerance` of the configured key color. If any edge has a non-key pixel, the subject extended to or off the canvas during AI generation, the result cannot be recovered, and the script must reject the source with `BLOCK_SUBJECT_CLIPPED` and exit code `1` *before* writing extracted frames or normalized output.

The check uses `chroma.subject_touches_edge` (no chroma removal required) so it can also reject a clipped strip cheaply in `extract_frames.py`. `normalize_image.py` runs the equivalent check on its single-image input. The check is unconditional: even asset types whose final output may intentionally fill the canvas (`picture`, `enemy`) still require a key border in the *source* so alpha bounds can be computed honestly.

`BLOCK_SUBJECT_CLIPPED` is distinct from `BLOCK_EDGE_TOUCH`: the former says the AI input was clipped, the latter says a normalized output's subject reaches a forbidden edge. Both can fire on the same character but they describe different problems.

## Synthetic Fixture Generator (Phase 1)

`scripts/fixtures.py` is both an importable module and a CLI entry point. It exists so every other script has reproducible test inputs before any AI image is generated.

The fixture set deliberately covers two categories of input: **exact-key fixtures** (every background pixel is exactly the configured key color) and **drifted-key fixtures** that mimic real AI output (uniform near-key drift, per-pixel jitter, and anti-aliased subject edges). Scripts that handle keyed input must pass against both categories.

Orthogonal to background realism, the fixture set also covers **subject-placement realism**. Real AI strips do not put the character neatly centered horizontally and neatly bottom-anchored in every frame; pose variation alone produces per-frame horizontal and vertical drift. Scripts must therefore not rely on subjects being centered or bottom-anchored in the source image — the alpha-bounds pipeline does that work after the fact.

CLI:

```text
python -m scripts.fixtures --output tests/fixtures/images/ [--seed 0]
```

Required fixture coverage (each emitted as a deterministic PNG):

Exact-key fixtures:

- Single subject on a flat keyed background:
  - `single_small.png`, `single_medium.png`, `single_large.png` at `64x64`, `256x256`, `512x512`.
- 3-frame horizontal strips with even spacing:
  - `strip_even_3.png` at `808x256` (three `256x256` frames + 20px gaps), magenta key.
- 3-frame strips with uneven spacing, asymmetric subject sizes, and per-frame placement jitter:
  - `strip_uneven_3.png` — gap widths and subject widths differ across frames, and each subject is shifted horizontally and vertically away from cell-center to mimic pose-driven placement drift.
- 3-frame strip with strong subject-placement drift on a clean background, used to confirm scripts do not rely on centered or bottom-anchored subjects:
  - `strip_offset_3.png` — same 808×256 outer shape as `strip_even_3.png`. Frame subjects are placed in the lower-left, upper-right, and floating-mid regions of their cells respectively. Frame extraction must still recover three frames; downstream normalization must still produce a correctly anchored output.
- Single subject placed off-center and lifted off the bottom of the canvas, fully visible with a clear key border on every edge, used to confirm `normalize_image.py` honors alpha bounds rather than source coordinates:
  - `single_offset.png` — subject in the upper-left quadrant of a `256x256` magenta canvas with a multi-pixel key border on every edge.
- Source pre-flight rejection cases — single image and strip variants where the AI clipped the subject so it extends to or off the canvas edge:
  - `single_clipped_top.png` — `256x256` magenta canvas with the head extending past the top edge. Same off-center placement as `single_offset.png` but lifted further so the top of the head is cut off.
  - `strip_clipped_top.png` — same `808x256` outer shape as `strip_even_3.png`, with one frame's subject extending past the top of the strip while the other two frames are cleanly placed.
- Strips with too few frames:
  - `strip_two_frames.png` (negative case for `extract_frames.py`).
- Strips with extra frames:
  - `strip_four_frames.png` (extra-frame case).
- Strips where neighboring frames nearly touch:
  - `strip_tight_gaps.png`.
- Interior chromakey areas (donut-shaped subject):
  - `single_donut.png` — opaque ring with a key-color hole in the middle.
- Color variants (same shape as `single_medium.png`) in lime green and cyan:
  - `single_medium_lime.png`, `single_medium_cyan.png`.

Drifted / AI-realistic fixtures:

- Subtle keyed edge bleed (anti-aliased gradient 1–4 px wide at subject boundary) for despill tests:
  - `single_edge_bleed.png`.
- Uniform near-key background where every pixel drifts by the same offset (e.g. `#f508f7` instead of `#ff00ff`) so per-pixel `RGB == key` checks fail but tolerance-based checks still match:
  - `single_drifted_key.png`.
- Block-jittered key background where every background pixel sits within `key ± 8` per channel but no pixel equals the exact key. Drift is applied in small (8×8 px) blocks so the fixture compresses well; this is also a closer model of JPEG-style chroma quantization than pure per-pixel noise. Used to stress-test column-wise gap detection and key-residue counts:
  - `strip_noisy_key.png` — same `808x256` shape as `strip_even_3.png`.
- Worst-case-but-still-recoverable AI strip combining every realistic failure mode at once: per-frame distinct subject colours (red / blue / green so a resulting GIF reads cleanly), varied subject sizes (25% / 40% / 30% of cell width), strong horizontal and vertical placement drift per cell (including a frame floating well above the bottom), and a block-jittered (no-exact-key) chroma background. Subjects stay clear of cell boundaries so column-wise gap detection still finds 3 frames at default tolerance. Used by the extract → normalize → preview pipeline test in `tests/test_pipeline_end_to_end.py`:
  - `strip_ai_worst_case.png` — same `808x256` outer shape; cells `[240, 280, 240]` with `[24, 24]` gaps.

Each drifted fixture should still be cleanly recoverable at the default `--key-tolerance` of `40`; their purpose is to catch regressions where a script accidentally relies on exact `RGB == key` comparisons.

Determinism rules:

- Subjects are flat-color polygons, ovals, and rings; subject pixels are never anti-aliased except in `single_edge_bleed.png`, where edge bleed is the explicit purpose.
- Background jitter and other randomness are seeded from `--seed`; the same seed produces byte-identical PNGs across runs.
- Fixtures are small enough to commit (target < 50 KB each, with `strip_noisy_key.png` allowed up to 150 KB because per-pixel jitter compresses poorly).
- Fixture filenames and contents are stable; renaming a fixture is a breaking change for tests.

Exit criteria for the fixture generator (also used by tests): re-running the script never modifies a checked-in fixture.

## `extract_frames.py` (Phase 2)

Goal: split a 3-frame horizontal chroma-key strip into 3 individual frame PNGs without losing subject content.

Inputs:

- `--input`: path to the keyed strip.
- `--output-dir`: directory where extracted frames are written.
- `--name-pattern`: e.g. `down_{i}.png` or `{prefix}_{i}.png`. `{i}` is `0..2`.
- `--key-color`, `--key-tolerance`.
- `--report-output` (optional).

Algorithm:

1. Load image, normalize to `RGBA`.
2. **Source pre-flight.** Run `chroma.subject_touches_edge`. If any edge is touched, emit `BLOCK_SUBJECT_CLIPPED` and exit `1` without writing any output frames.
3. Compute `chroma.column_key_ratios` — per-column fraction of pixels within key tolerance.
4. Identify contiguous runs where the ratio exceeds a threshold (default `0.95`); these are gap candidates. Edge gaps (runs that touch column `0` or column `width - 1`) are discarded so they cannot be mistaken for inter-frame splits.
5. Choose split points at the centers of the leftmost interior gaps to produce exactly 3 output frames covering the leftmost 3 cells:
   - With exactly 2 interior gaps: split at both gap centers; the third frame extends to the right edge of the strip.
   - With more than 2 interior gaps: split at the first 2 gap centers and use the 3rd gap center as the right-hand edge of frame 2, discarding all later cells.
6. Emit 3 frames as `RGBA` PNGs (still keyed — chroma-key removal is `normalize_image.py`'s job).

Frame counts:

- Fewer than 3 detectable frames → exit code `1` and the report records a `BLOCK_TOO_FEW_FRAMES` failure. No output frames are written.
- Exactly 3 → success.
- More than 3 → take the first 3, exit `0`, report includes a `WARN_EXTRA_FRAMES` warning with the discarded count.

Frame naming: follows the patterns in [docs/rpgmaker-graphics.md](../docs/rpgmaker-graphics.md) "General Naming Rules". Numeric prefixes (`00_`, `01_`, …) are produced by passing `--name-pattern '{idx:02d}_{prefix}_{i}.png'`.

Tests use every Phase 1 strip fixture, including the negative cases.

## `normalize_image.py` (Phase 3)

Goal: turn one keyed source image into a final-ready transparent PNG that is correctly sized, anchored, and padded.

Inputs:

- `--input`: keyed source image (full image or a single extracted frame).
- `--output`: final transparent PNG.
- `--asset-type`: `movement_frame` | `damage_frame` | `sv_battler_frame` | `face` | `picture` | `enemy` | `reference_split`. Drives anchor and padding defaults.
- `--final-size`: e.g. `48x48`.
- `--key-color`, `--key-tolerance`, `--despill` / `--no-despill`.
- `--anchor` (overrides the asset-type default).
- `--padding` (overrides default `1`).
- `--report-output` (optional).
- `--debug-output` (optional, alpha-bounds overlay PNG).

Pipeline:

1. Load `RGBA`.
2. **Source pre-flight.** Run `chroma.subject_touches_edge` against the keyed input. If any edge is touched, emit `BLOCK_SUBJECT_CLIPPED` and exit `1` without writing the normalized output.
3. Remove chroma-key using `chroma.remove_key`.
4. Compute alpha bounds; reject (`BLOCK_EMPTY_FRAME`) if bounds is `None`.
5. Crop to alpha bounds.
6. Scale subject to fit `final-size` minus padding on non-anchor edges, preserving aspect ratio.
7. Place onto a transparent canvas of `final-size` using the configured anchor.
8. Run validation against the asset-type's expected rules and emit the report.

Anchor defaults (matches [docs/rpgmaker-generation-process.md](../docs/rpgmaker-generation-process.md) "Anchoring Rules"):

| Asset Type | Anchor | Padding Edges |
| --- | --- | --- |
| `movement_frame` | `bottom-center` | left, right, top |
| `damage_frame` | `bottom-center` | left, right, top |
| `sv_battler_frame` | `bottom-center` | left, right, top |
| `face` | `center` | all |
| `picture` | `center` | all |
| `enemy` | `center` | all |
| `reference_split` | `center` | all (canvas size confirmed in Phase 9) |

Validation rules emitted per normalized output:

- Final dimensions match `--final-size` exactly.
- Image has an alpha channel and at least one fully-transparent corner.
- Subject does not touch any padded edge.
- No remaining key-color pixels above a small residue threshold.

Tests cover every keyed Phase 1 fixture, including subtle edge-bleed and interior-key (donut) cases.

## `validate_asset.py` (Phase 4)

Goal: produce a machine-readable validation report for any normalized image or final spritesheet, independent of the script that produced it.

Inputs:

- `--input`: PNG to validate.
- `--asset-type`: same enum as `normalize_image.py`, plus `movement_sheet`, `damage_sheet`, `sv_battler_sheet` for assembled outputs.
- `--config`: optional YAML for sheets, identical to `assemble_spritesheet.py`'s config (so validation can run standalone on a sheet).
- `--report-output`: required.
- `--key-color`, `--key-tolerance`: required for residue checks.

### Validation report schema

The schema below is the canonical contract. Every script that writes a report must produce JSON conforming to it.

```json
{
  "schema_version": "1.0.0",
  "asset_type": "movement_frame",
  "source_path": "artifacts/character_movement/frames/down_0.png",
  "output_path": "artifacts/character_movement/normalized/down_0.png",
  "dimensions": { "width": 48, "height": 48 },
  "frame_size": { "width": 48, "height": 48 },
  "grid": { "rows": 1, "cols": 1 },
  "alpha": {
    "has_alpha_channel": true,
    "transparent_corners": { "tl": true, "tr": true, "bl": true, "br": true }
  },
  "padding_px": { "left": 4, "right": 4, "top": 6, "bottom": 0 },
  "key_residue_count": 0,
  "frame_bounds": [
    {
      "name": "down_0",
      "row": 0,
      "col": 0,
      "alpha_bounds": { "left": 12, "top": 8, "right": 36, "bottom": 48 }
    }
  ],
  "blocking": [
    { "code": "BLOCK_EDGE_TOUCH", "message": "Subject touches top edge", "context": { "edge": "top" } }
  ],
  "warnings": [
    { "code": "WARN_KEY_RESIDUE", "message": "12 residual key pixels detected", "context": { "count": 12 } }
  ]
}
```

Sheet asset reports add a per-cell `padding_px` block to each `frame_bounds` entry alongside `alpha_bounds`, so consumers can inspect padding around every cell's subject without re-cropping the sheet. The top-level `padding_px` for sheets describes the sheet canvas itself.

Required fields are present in every report; fields that do not apply to the asset type are emitted as `null` rather than omitted, so downstream consumers can rely on the shape.

Stable codes (initial set; new codes are added to this spec, never invented in code):

Blocking:

- `BLOCK_WRONG_DIMENSIONS`
- `BLOCK_MISSING_ALPHA`
- `BLOCK_EMPTY_FRAME`
- `BLOCK_TOO_FEW_FRAMES`
- `BLOCK_EDGE_TOUCH`
- `BLOCK_SUBJECT_CLIPPED`
- `BLOCK_MISSING_OUTPUT`
- `BLOCK_UNMAPPED_FRAMES` — emitted by `assemble_spritesheet.py` only when `--strict-frame-names` is set and `--frames-dir` contains PNG files that aren't referenced by any cell in the config.

Warnings:

- `WARN_NON_TRANSPARENT_CORNER`
- `WARN_KEY_RESIDUE`
- `WARN_INCONSISTENT_FRAME_BOUNDS`
- `WARN_SUBJECT_SIZE_OUT_OF_BAND`
- `WARN_EXTRA_FRAMES`

Tests: synthetic correct outputs and intentionally broken outputs (wrong size, missing alpha, empty frame, edge-touching subject, residual key pixels, mismatched grid in a sheet).

## `assemble_spritesheet.py` (Phase 5)

Goal: assemble normalized frames into an RPG Maker-ready spritesheet, driven entirely by a YAML config.

Inputs:

- `--config`: YAML config (schema below).
- `--frames-dir`: directory containing normalized frames named per the config.
- `--output`: final sheet PNG.
- `--strict-frame-names` / `--no-strict-frame-names` (default off): when on, fail with `BLOCK_UNMAPPED_FRAMES` if `--frames-dir` contains any PNG files that aren't referenced by a cell in the config. Useful for catching typos when authoring new configs; off by default so an overlapping or shared frames dir doesn't break unrelated assemblies.
- `--report-output` (optional).
- `--debug-output` (optional, sheet with grid overlay).

### Assembly config YAML schema

```yaml
schema_version: "1.0.0"
asset_type: movement_sheet      # movement_sheet | damage_sheet | sv_battler_sheet
output:
  path: $CharacterName.png      # relative to caller's CWD; CLI --output overrides
  size: { width: 144, height: 192 }
frame:                          # OPTIONAL — derived from output.size // grid when omitted.
  size: { width: 48, height: 48 }
grid:
  rows: 4
  cols: 3
cells:                          # row-major; one entry per cell
  - { row: 0, col: 0, frame: down_0 }
  - { row: 0, col: 1, frame: down_1 }
  - { row: 0, col: 2, frame: down_2 }
  # ...
validation:
  expect_transparent_corners: true
  expect_no_edge_touch: true
  expect_key_residue_max: 0
```

The `frame:` block is **optional** (resolved per OQ-7). When omitted, `cli.load_assemble_config` derives `frame.size` as `(output.size.width // grid.cols, output.size.height // grid.rows)`. When both `frame.size` and `output.size + grid` are provided, the loader validates that `frame.size * grid == output.size` and rejects configs whose values disagree. The three reference configs ship with explicit `frame.size` for self-documentation; new non-standard configs may omit it.

Three reference configs ship under `configs/spritesheets/`, each verified by tests:

| Config | Asset | Final size | Frame size | Grid |
| --- | --- | --- | --- | --- |
| `character_movement.yaml` | Character Movement Spritesheet | `144x192` | `48x48` | 4 × 3 |
| `damage_poses.yaml` | Damage Poses | `144x48` | `48x48` | 1 × 3 |
| `sideview_battler.yaml` | Side-View Battler | `576x384` | `64x64` | 6 × 9 |

The Side-View Battler config maps all 54 frame ids in the row-major order from [docs/rpgmaker-graphics.md](../docs/rpgmaker-graphics.md) "Side-View Battler Spritesheet". Frame ids in the config must match filenames written by `normalize_image.py` exactly.

Behavior:

- Config that doesn't cover every grid position → usage error (exit 2). `cli.load_assemble_config` rejects configs missing any `(row, col)`; an incomplete `cells` list cannot ship a sheet with a blank required cell.
- Missing frame file → `BLOCK_MISSING_OUTPUT`, exit 1, no sheet written.
- Wrong frame size → `BLOCK_WRONG_DIMENSIONS`, exit 1.
- After assembly, the script runs the full sheet through the same checks `validate_asset.py` would perform and emits a single report. Validation runs **before** the PNG is written: any blocking issue (e.g. `BLOCK_EMPTY_FRAME` from a cell whose source was fully transparent) leaves no sheet on disk so a final-looking PNG never sits next to a failing report.
- The optional `validation:` block in the YAML is honored when present: `expect_transparent_corners` (default `true`), `expect_no_edge_touch` (default `false`; when `true`, per-cell edge touches block with `BLOCK_EDGE_TOUCH`), and `expect_key_residue_max` (default `0`; residue counts above the limit warn with `WARN_KEY_RESIDUE`).

Tests assemble each spritesheet type from Phase 3 normalized fixtures and confirm the result passes Phase 4 validation.

## Reference Helpers (Phase 6)

These are not on the critical path for the character generation pipeline. They exist for two reasons: producing animated previews during human review, and converting RPG Maker's official multi-actor reference sheets into the per-character format the rest of the pipeline expects.

### Two kinds of frame extraction

This project has two extractors and they serve fundamentally different inputs. The distinction is load-bearing — please don't conflate them in code.

| | `extract_frames.py` (Phase 2) | Phase 6 grid extractors |
| --- | --- | --- |
| Input | AI-generated 3-frame strip | Final-quality, grid-aligned sheet |
| Background | Chroma-key | Already transparent (or any mode) |
| Frame boundaries | Inferred from column-wise key ratios | Pure division: `width // cols`, `height // rows` |
| Output frame size | Variable per frame | Identical for every cell |
| Downstream | Requires `normalize_image.py` to scale + anchor + pad | None — frames are already final |
| Round-trip | Lossy by design (normalization re-anchors) | Lossless — disassemble + reassemble = byte-identical |

The Phase 6 extractors must never call chroma removal or normalization. Their contract is "if dimensions are evenly divisible by the requested grid, output the cells exactly; otherwise reject."

### Three-stage decomposition chain

RPG Maker assets compose at three granularities, and a reference helper exists for each stage. Each stage is a self-contained grid operation that can be invoked independently — you can stop at any stage, or enter the chain partway through.

| Stage | Input | Operation | Output | Knowledge required |
| --- | --- | --- | --- | --- |
| 1 | Multi-actor sheet (`Actor1.png`-style) | Split N×M character grid | One single-actor sheet per cell | Character grid only (no asset type) |
| 2 | Single-actor spritesheet | Split into per-animation 3-frame strips | One strip per animation | Asset type → animation grid |
| 3 | 3-frame animation strip | Split into individual frames | Three named frame PNGs | Just an animation-name prefix |

The corresponding scripts are `split_multi_character.py` (stage 1), `split_sheet_animations.py` (stage 2), and `split_animation_strip.py` (stage 3). All three are pure grid math — none of them call chroma removal or normalization.

All three are reference-only by policy. Their outputs are style and pose references for prompts; they must never be used as new character source assets. The scripts inherit this rule from `docs/rpgmaker-graphics.md` and `docs/rpgmaker-generation-process.md` — the docs make the rule, the scripts just respect it.

### `split_multi_character.py`

Goal: split a multi-actor sheet (or face/picture/enemy bank) into N×M individual asset PNGs. Pure grid math; no knowledge of what's inside each cell.

Inputs:

- `--input`: path to the multi-actor PNG.
- `--rows`: number of cells down (e.g. `2` for `Actor1.png`).
- `--cols`: number of cells across (e.g. `4` for `Actor1.png`).
- `--output-dir`: destination directory.
- `--prefix-dollar` / `--no-prefix-dollar`: whether outputs use the RPG Maker `$<stem>_<n>.png` form (default for character spritesheet inputs) or `<stem>_<n>.png` (faces, pictures, enemies don't use `$`).
- `--report-output` (optional).

Algorithm:

1. Load image; preserve mode (RGBA stays RGBA; an RGB-keyed bank stays RGB).
2. If `width % cols != 0` or `height % rows != 0`, emit `BLOCK_WRONG_DIMENSIONS` and exit `1` without writing anything.
3. Compute `cw = width // cols`, `ch = height // rows`.
4. For each cell in row-major order, with `n = row * cols + col + 1`:
   - Crop `(col*cw, row*ch, (col+1)*cw, (row+1)*ch)`.
   - Save as `<prefix><stem>_<n>.png` where `<stem>` is the input filename without extension and `<prefix>` is `$` or empty per the flag.
5. Emit a canonical report with `asset_type: "split_multi_character"`, `grid: {rows, cols}`, and one `frame_bounds` entry per output (each entry's `alpha_bounds` is `null` since this script doesn't analyse cell contents).

Notes:

- The script never interprets a cell's contents. A 4×2 character sheet, a 4×2 face bank, and a 4×2 picture bank all decompose the same way; the caller decides what to do next.
- Because everything is exact division, repeated split/restitch cycles produce byte-identical pixels.

### `split_sheet_animations.py`

Goal: take a single-character spritesheet (a final RPG Maker asset, or the assembled output of `assemble_spritesheet.py`) and split it into per-animation 3-frame strips. The asset type tells the script how the animations are laid out on the sheet.

Inputs:

- `--input`: single-character sheet PNG.
- `--asset-type`: `movement_sheet | damage_sheet | sv_battler_sheet`.
- `--output-dir`: destination directory.
- `--report-output` (optional).

Algorithm (pure grid math):

1. Load image; preserve mode.
2. Look up the asset type's `grid (rows, cols)` and ordered `animations` list from `validate.ASSET_DEFAULTS` (see "Asset-type animation maps" below). Verify `rows * cols == len(animations) * 3`.
3. If `width % cols != 0` or `height % rows != 0`, emit `BLOCK_WRONG_DIMENSIONS` and exit `1` without writing anything.
4. Compute `cw = width // cols`, `ch = height // rows`. Each animation occupies 3 consecutive cells horizontally; let `animations_per_row = cols // 3`.
5. For each animation `name` at index `i`:
   - `sheet_row = i // animations_per_row`
   - `col_start = (i % animations_per_row) * 3`
   - Crop the 3-cell strip `(col_start * cw, sheet_row * ch)` × `((col_start + 3) * cw, (sheet_row + 1) * ch)`.
   - Save as `<output-dir>/<name>.png` (e.g. `down.png`, `step_forward.png`).
6. Emit a canonical report with `asset_type: <input asset_type>`, `frame_bounds` listing every output strip with its `(row, col)` slot in the original sheet.

Notes:

- Each output strip has dimensions `(3 * cw) × ch` and is itself ready for `split_animation_strip.py`.
- Round-trip with `assemble_spritesheet.py` works at this stage too: a single-character sheet can be decomposed via this script and the resulting strips can be re-cut into individual frames by stage 3 before reassembly.

### `split_animation_strip.py`

Goal: split a 3-frame animation strip into three individual frame PNGs by pure grid math. The grid-aligned counterpart of Phase 2's chroma-key-driven `extract_frames.py`. Lossless.

Inputs:

- `--input`: 3-frame strip PNG (typical input is one of `split_sheet_animations.py`'s outputs).
- `--prefix`: filename stem for outputs, e.g. `down` produces `down_0.png`, `down_1.png`, `down_2.png`.
- `--output-dir`: destination directory.
- `--frames` (default `3`): number of equal-width frames to slice the strip into. The default of 3 matches every animation in this project's asset types.
- `--report-output` (optional).

Algorithm:

1. Load image; preserve mode.
2. If `width % frames != 0`, emit `BLOCK_WRONG_DIMENSIONS` and exit `1` without writing anything.
3. Compute `fw = width // frames`. For each `f in 0..frames-1`, crop `(f * fw, 0, (f + 1) * fw, height)` and save as `<output-dir>/<prefix>_<f>.png`.
4. Emit a canonical report with `asset_type: "split_animation_strip"`, one `frame_bounds` entry per output frame.

Notes:

- This script does not look at pixel content. It does not know whether the input is keyed or transparent, only that the width must be evenly divisible.
- The output of `split_animation_strip.py` is byte-identical to the corresponding cells of any sheet stage 2 came from — pasting the frames back side-by-side reproduces the strip exactly.

### Asset-type animation maps

`validate.ASSET_DEFAULTS` gains an `animations` field for each sheet type, listed in row-major order so animation index `i` maps cleanly to sheet position via `(i // animations_per_row, (i % animations_per_row) * 3)`:

- `movement_sheet` — `["down", "left", "right", "up"]` (4 animations × 3 frames over a 4×3 grid; 1 animation per row).
- `damage_sheet` — `["damage_pose"]` (1 animation × 3 frames over a 1×3 grid).
- `sv_battler_sheet` — 18 animations × 3 frames over a 6×9 grid (3 animations per row), in this order:
  - Row 0: `step_forward`, `thrust`, `escape`
  - Row 1: `normal_standby`, `swing`, `victory`
  - Row 2: `chanting_standby`, `missile`, `near_death`
  - Row 3: `guard`, `general_skill`, `status_ailment`
  - Row 4: `damage`, `magic`, `sleep`
  - Row 5: `evade`, `item`, `dead`

These are the same names that appear in `configs/spritesheets/sideview_battler.yaml`'s `cells` list, so a sheet round-trips cleanly between `assemble_spritesheet.py` and the stage 2 + 3 extractors.

### `preview_animation.py`

- Inputs: 3 frame PNGs (or a directory and a name pattern), `--output preview.gif`, `--frame-rate` (default 4 fps), `--cycle` (`forward` | `pingpong`, default `pingpong` to match `*_0 -> *_1 -> *_2 -> *_1`).
- Output: animated GIF preserving alpha as a flat configurable background color (default `#00000000` if the encoder supports it, otherwise `#888`).
- Tests: GIF preview from Phase 1 strip fixtures.

## Test Strategy

- Test framework: `pytest`. Add to `requirements.txt` alongside `Pillow`. (Phase 0 deliverable from the phases doc.)
- `tests/conftest.py` ensures fixtures are present before any test runs, regenerating them only if they are absent (never overwriting a checked-in fixture).
- Each script has its own test module exercising:
  - Happy path on at least two fixture sizes/shapes.
  - Every blocking code listed in this spec, with a fixture or constructed input that triggers it.
  - At least one warning code per script that emits warnings.
- No test reaches the network. No test depends on AI-generated images.
- Determinism is asserted by hashing outputs in the happy-path tests.

## `.gitignore` Additions

The phases doc lists these entries as a Phase 0 deliverable. They are reproduced here as part of the spec contract; the plan tracks the actual file edit.

```gitignore
characters/*/artifacts/rejected/
characters/*/artifacts/needs-regeneration/
characters/*/artifacts/debug/
characters/*/artifacts/reports/
characters/*/artifacts/**/source/
characters/*/artifacts/**/source_strips/
characters/*/artifacts/**/frames/
characters/*/artifacts/**/normalized/
```

## Open Questions

Resolutions are appended inline; resolved questions are kept here as a chronicle of decisions, not as outstanding work.

### Resolved

- **OQ-1 (Phase 1) — RESOLVED:** Final PNG palette mode for fixtures — `RGBA` only, or include some `RGB` fixtures to exercise mode normalization in `chroma.remove_key`?
  - Decision: closed as resolved. The real-data round-trip on `Actor1.png` / `Damage1.png` (both mode `P`) in [tests/test_rpgmaker_reference_round_trip.py](../tests/test_rpgmaker_reference_round_trip.py) already exercises non-RGBA inputs end-to-end.
- **OQ-2 (Phase 3) — RESOLVED:** Should `--padding` accept per-edge overrides (`--padding-top`, `--padding-bottom`, …), or is a single integer enough for every asset type covered here?
  - Decision: closed as not needed. A single int has covered every asset type in scope. Reopen if a real character ever needs asymmetric padding.
- **OQ-3 (Phase 4) — RESOLVED:** Validation reports per spritesheet currently include `frame_bounds` with one entry per cell. For very large sheets (Side-View Battler, 54 cells) does this stay readable, or should it be summarized?
  - Decision: keep the full per-cell list. File-size impact is negligible (sv_battler reports are < 25 KB).
- **OQ-4 (Phase 5) — RESOLVED:** Do we need a `--strict-frame-names` mode that errors when extra frame files exist beyond what the config maps, or is "ignore unmapped frames" sufficient?
  - Decision: add the flag, default off. Implementation lives in `assemble_spritesheet.py`; emits the new `BLOCK_UNMAPPED_FRAMES` blocking code (added to the stable code set below) when extras are found.
- **OQ-5 (Phase 6) — RESOLVED:** Should `preview_animation.py` support arbitrary cycle strings (e.g. `0,1,2,1,0`) or stay limited to `forward` / `pingpong`?
  - Decision: closed. The two standard cycles cover every animation type in this project; custom cycles are easy to add later if a non-standard need arises.
- **OQ-7 (Post-Phase-5 follow-up) — RESOLVED:** `assemble_spritesheet.py`'s YAML config currently requires both `output.size` and `frame.size`, even though one is mathematically determined by the other and `grid`. Make `frame.size` optional (derived as `output.size // grid` when omitted) so non-standard sheets need fewer fields and the rows/cols philosophy is uniform across the toolchain. Validate consistency when both are provided.
  - Decision: implemented. `frame:` is optional in the YAML; `cli.load_assemble_config` derives `frame.size` from `output.size // grid` when missing and validates `frame.size * grid == output.size` when both are provided. The three reference configs keep their explicit `frame.size` for self-documentation; new non-standard configs may omit it.

### Deferred

- **OQ-6 (Phase 9 / future spec):** Final canvas size and padding for the four split files of the Character Reference are deferred to the first end-to-end AI run; this spec only fixes that the split outputs use the `reference_split` asset type and `center` anchor.

Resolution of an open question lands as an edit to this spec, not as a comment in code.

## Non-Goals (restated for clarity)

- This spec does not define the `character-spec.yaml` manifest, the `checklist.md`, or the prompt templates. Those are upcoming numbered specs.
- This spec does not commit to a specific RPG Maker MZ project layout or import path. Final assets land at the character folder root; packaging is out of scope.
- This spec does not define a GUI or a long-running service. Every helper is a one-shot CLI process.
