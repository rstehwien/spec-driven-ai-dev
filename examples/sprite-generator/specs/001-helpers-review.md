# 001 Helpers Code Review

Review target: deterministic helper scripts and associated tests, checked against [001-helpers-spec.md](001-helpers-spec.md), [001-helpers-plan.md](001-helpers-plan.md), [docs/rpgmaker-graphics.md](../docs/rpgmaker-graphics.md), and [docs/rpgmaker-generation-process.md](../docs/rpgmaker-generation-process.md).

Review date: 2026-05-02

Resolution update: 2026-05-02

- Finding 1 resolved: `cli.load_assemble_config` now requires one `cells` entry for every grid position and tests reject omitted cells.
- Finding 2 resolved: sheet validation now emits `BLOCK_EMPTY_FRAME` for empty cells, including all-empty sheets.
- Finding 3 resolved: `validate_asset.py` now supports `--config` for sheet geometry and cell names.
- Finding 4 resolved: sheet validation now emits sheet-level `padding_px`, per-cell `padding_px` inside `frame_bounds`, and honors config validation options for transparent corners, key residue max, and optional no-edge-touch checks.
- Finding 5 resolved for the reviewed multi-output/write-after-output paths: multi-output split/extract helpers clean up successful writes after later write failures; `normalize_image.py` and `assemble_spritesheet.py` remove final outputs on IO/debug write failures.
- Finding 6 resolved: the typo in the normalize-image anchoring test name was fixed.

## Findings

### 1. Incomplete assembly configs can silently produce valid-looking sheets with blank cells

Severity: High

The assembly config schema says `cells` is "one entry per cell" ([001-helpers-spec.md](001-helpers-spec.md), Assembly config YAML schema), but `load_assemble_config` only checks that `cells` is non-empty, unique, and in bounds. It never requires exactly `rows * cols` entries or full grid coverage ([scripts/cli.py](../scripts/cli.py:219)). `assemble_spritesheet.py` then pastes only the referenced cells ([scripts/assemble_spritesheet.py](../scripts/assemble_spritesheet.py:270)), while `validate_sheet_image` reports the missing cell's `alpha_bounds: null` without blocking ([scripts/validate.py](../scripts/validate.py:397)).

Impact: a typo or omitted config row can ship a spritesheet with transparent animation cells and exit `0`. This violates the spec's sheet schema and the process requirement that scripts validate empty frames.

Evidence: a throwaway `damage_sheet` config with only 2 of 3 cells assembled with exit code `0`; the report had no blocking issues and frame 3 was `alpha_bounds: null`.

Recommended fix: make `load_assemble_config` require full grid coverage (`len(cells) == rows * cols` and every `(row, col)` present), or have `assemble_spritesheet.py` emit `BLOCK_MISSING_OUTPUT` / `BLOCK_EMPTY_FRAME` for unmapped cells before writing.

Missing test: add an assembly test for a config that omits a required cell and assert exit `1`, no sheet written.

### 2. Sheet validation does not block empty required cells

Severity: High

`validate_sheet_image` records `alpha_bounds: null` for empty cells but does not append `BLOCK_EMPTY_FRAME` ([scripts/validate.py](../scripts/validate.py:402)). As a result, `validate_asset.py` accepts an entirely transparent `damage_sheet` as OK ([scripts/validate_asset.py](../scripts/validate_asset.py:185)).

Impact: `validate_asset.py` can certify a final RPG Maker sheet with missing poses. This conflicts with the process doc's validation requirements for empty frames ([docs/rpgmaker-generation-process.md](../docs/rpgmaker-generation-process.md)) and the spec's stable `BLOCK_EMPTY_FRAME` code ([001-helpers-spec.md](001-helpers-spec.md)).

Evidence: a throwaway fully transparent `144x48` `damage_sheet` validated with exit code `0`; the report had three `frame_bounds` entries with `alpha_bounds: null` and no blocking issues.

Recommended fix: in `validate_sheet_image`, emit `BLOCK_EMPTY_FRAME` for each required cell whose `alpha_bounds` is `None`, with row/col/name context. Then add tests for one empty cell and an all-empty sheet.

### 3. `validate_asset.py` does not implement the spec's sheet `--config` input

Severity: Medium

The spec says `validate_asset.py` accepts `--config`, "optional YAML for sheets, identical to `assemble_spritesheet.py`'s config" ([001-helpers-spec.md](001-helpers-spec.md)). The current CLI exposes `--final-size`, `--frame-size`, and `--grid`, but no `--config` option ([scripts/validate_asset.py](../scripts/validate_asset.py:66)).

Impact: standalone validation can drift from assembly configs, especially for non-standard sheets or future optional `frame.size` derivation. This also means `assemble_spritesheet.py` is not quite using the same standalone configuration path that the spec describes.

Recommended fix: add `--config` to `validate_asset.py`, load it with `cli.load_assemble_config`, and use its `asset_type`, `output.size`, `frame.size`, `grid`, and cell names for sheet validation. Keep explicit CLI geometry overrides only if the spec is updated to define precedence.

Missing test: validate an assembled sheet using only `--config` plus `--input`, and assert the report's `frame_bounds` names match config cells.

### 4. Sheet validation leaves `padding_px` null and ignores config validation expectations

Severity: Medium

The report schema shows `padding_px` as a canonical field, and the assembly config includes `validation.expect_transparent_corners`, `expect_no_edge_touch`, and `expect_key_residue_max` ([001-helpers-spec.md](001-helpers-spec.md)). For sheets, `validate_sheet_image` initializes `padding_px` to `None` and never calculates per-cell or sheet padding ([scripts/validate.py](../scripts/validate.py:348)). It also always warns on opaque corners and residue instead of honoring configurable validation expectations ([scripts/validate.py](../scripts/validate.py:416)).

Impact: assembled sheets are not validated "through the same checks `validate_asset.py` would perform" in the richer sense described by the YAML schema, and consumers lose useful padding data for each cell. This is lower risk than the empty-cell bug, but it leaves part of the schema decorative rather than enforced.

Recommended fix: either implement the `validation:` config block, or simplify the spec/configs to match the implemented behavior. If implemented, decide whether `padding_px` for sheets should be sheet-level, per-cell in `frame_bounds`, or a summary.

### 5. Non-zero IO exits can leave partial outputs behind

Severity: Medium

The common exit-code contract says exit code `3` means unrecoverable IO error and "No partial output left behind" ([001-helpers-spec.md](001-helpers-spec.md)). Several scripts write outputs incrementally and return `EXIT_IO_ERROR` immediately if a later write fails, without cleanup. Examples: `extract_frames.py` may leave earlier frames if saving frame 2 fails ([scripts/extract_frames.py](../scripts/extract_frames.py:245)); `split_multi_character.py` and `split_animation_strip.py` have the same pattern ([scripts/split_multi_character.py](../scripts/split_multi_character.py:153), [scripts/split_animation_strip.py](../scripts/split_animation_strip.py:133)). `normalize_image.py` can also fail writing debug output after writing the normalized PNG because `_save_debug` is outside the `try` block ([scripts/normalize_image.py](../scripts/normalize_image.py:244)).

Impact: failed runs can leave stale or partial artifacts that look usable in later phases, contrary to the deterministic helper contract.

Recommended fix: write multi-output scripts into a temporary directory or collect paths and clean them up on failure. Treat optional debug-output failures consistently, either as non-fatal warnings or as IO errors with cleanup.

Missing test: simulate a write failure after the first output and assert no output files remain.

### 6. A test name typo makes the anchoring coverage harder to search

Severity: Low

`test_offset_source_rebanchored_via_alpha_bounds` has a typo in "reanchored" ([tests/test_normalize_image.py](../tests/test_normalize_image.py:366)). The test itself is useful and should stay; the typo only hurts discoverability.

## Positive Coverage Notes

- The full test suite passes after remediation: `96 passed in 1.25s`.
- The fixture generator has strong determinism coverage and guards against drifted fixtures accidentally becoming exact-key fixtures ([tests/test_fixtures.py](../tests/test_fixtures.py:32)).
- The chroma-key extraction path is well covered for exact, uneven, offset, tight-gap, noisy-key, too-few, and extra-frame strips ([tests/test_extract_frames.py](../tests/test_extract_frames.py:90)).
- The end-to-end extract -> normalize tests cover realistic placement drift and the worst-case AI-style strip ([tests/test_pipeline_end_to_end.py](../tests/test_pipeline_end_to_end.py:183)).
- The Phase 6 grid helpers have good byte-identity round-trip tests, including real RPG Maker references ([tests/test_reference_chain_round_trip.py](../tests/test_reference_chain_round_trip.py:61)).

## Verification Performed

- Read the spec, plan, linked RPG Maker graphics/process docs, README, scripts, configs, and test modules.
- Ran the full suite before remediation with `.venv/bin/python -m pytest`; result: `90 passed`.
- Ran the full suite after remediation with `.venv/bin/python -m pytest`; result: `96 passed`.
- Ran throwaway reproductions in a temp directory for missing assembly cells and empty sheet validation; both confirmed the high-severity findings above.
