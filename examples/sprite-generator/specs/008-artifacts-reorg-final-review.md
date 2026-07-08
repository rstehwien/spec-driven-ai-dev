# 008 - Final Review

Independent final-review pass on the completed [008-artifacts-reorg-plan.md](008-artifacts-reorg-plan.md) (all 8 phases `[x]`'d) measured against [008-artifacts-reorg-spec.md](008-artifacts-reorg-spec.md) and the SOLID / DRY / YAGNI / KISS / separation-of-concerns / coupling-and-cohesion / testability heuristics.

**TL;DR:** the implementation matches the spec almost exactly. Eight commits land on `main`; `pytest tests/` is green at 659 passed; the asset-first layout is live for both in-flight characters. One spec-acceptance gate was not exercised in Phase 08 (full E2E run including `generate_image` / `normalize_image` / `extract_frames` / `assemble_spritesheet` / `validate_asset`); it is gated on API costs and on 009's orchestrator and I recommend deferring it to 009 explicitly. No must-fix code-quality issues. Two should-fix nits and a handful of optional cleanups.

## Scope reviewed

- [scripts/artifact_paths.py](../scripts/artifact_paths.py) (NEW, Phase 01)
- [scripts/render_all_prompts.py](../scripts/render_all_prompts.py) (rewritten, Phase 03)
- [scripts/validate_manifest.py](../scripts/validate_manifest.py) (help-text touch, Phase 03)
- [scripts/new_character.py](../scripts/new_character.py) (bootstrap shrink, Phase 01)
- [tests/test_artifact_paths.py](../tests/test_artifact_paths.py) (NEW, Phase 01) — 83 tests
- [tests/test_render_all_prompts.py](../tests/test_render_all_prompts.py) (rewritten, Phase 03) — 16 tests
- [tests/test_assemble_spritesheet.py](../tests/test_assemble_spritesheet.py) + [tests/test_reference_chain_round_trip.py](../tests/test_reference_chain_round_trip.py) (Phase 04 bridges)
- [tests/test_validate_asset.py](../tests/test_validate_asset.py) (Phase 04 expectation update)
- [configs/spritesheets/damage_poses.yaml](../configs/spritesheets/damage_poses.yaml) (Phase 04 frame rename)
- [docs/rpgmaker-generation-process.md](../docs/rpgmaker-generation-process.md), [docs/rpgmaker-graphics.md](../docs/rpgmaker-graphics.md), [docs/rpgmaker-phases.md](../docs/rpgmaker-phases.md) (Phase 06 rewrites)
- [specs/010-ui-character-generation-spec.md](010-ui-character-generation-spec.md) line 16 (Phase 07 dead-link redirect)
- Live trees: `characters/ThePuppetMaster/artifacts/`, `characters/GreenFairyDragon/artifacts/`

## Spec acceptance vs implementation

| Spec acceptance gate | Verified? |
|---|---|
| Per-asset source PNGs at `<asset>/source.png` (or `<asset>/source_strips/<key>_source.png` for Pattern C) | ✅ Phase 02 migrator + spot-check |
| Top-level `prompts/`, `reports/`, `debug/`, `rejected/`, `needs-regeneration/`, `attempts/` removed | ✅ Phase 02 migrator + Phase 08 spot-check |
| `characters/Smoke/` removed entirely | ✅ Phase 02 |
| `.agents/skills/rpgmaker-character/` removed entirely + matching test removed | ✅ Phase 05 (test) + Phase 07 (skill) |
| `pytest tests/` green | ✅ 659 passed |
| End-to-end regen (bootstrap → render → generate → normalize → assemble → validate) produces new layout natively | ⚠️ **partial** — only `render_all_prompts` was exercised in Phase 08; downstream steps gated on image-gen API costs + 009's orchestrator. See Should-fix #1 below. |
| `find characters/<name>/artifacts/face -type f` shows everything in one tree | ✅ Phase 08 spot-check |
| `rm -rf` of one asset dir loses only that asset (manually verifiable, not gated) | ✅ Implicitly verified by tree shape |
| `tar czf face_pack.tgz <face dir>/` produces self-contained bundle | ✅ Phase 08 spot-check |
| `scripts/artifact_paths.py` exists and every artifact-path build site imports it | ✅ Phase 03 grep clean (only `render_all_prompts.py` had inline paths to remove; other 8 pipeline scripts take CLI args) |
| 3 docs files describe the new layout; final docs grep clean | ✅ except one out-of-scope hit at [docs/questions.md:184](../docs/questions.md#L184) (historical Q&A blockquote) |
| `scripts/migrate_artifacts.py` deleted from repo | ✅ Phase 02 |

## Findings

### Must-fix

**None.** No correctness issues, no broken acceptance gates, no test regressions.

### Should-fix

#### S1. End-to-end pipeline gate not exercised (spec acceptance)

The spec promises:
> A character regenerated end-to-end (bootstrap → render prompts → generate images → normalize → assemble → validate) produces the new layout natively without invoking the migrator.

Phase 08 only exercised the `render_all_prompts` step. The `generate_image` → `normalize_image` → `extract_frames` → `assemble_spritesheet` → `validate_asset` chain wasn't run against the new paths, so we have unit-test confidence in the helpers but no live proof of the chain against the asset-first layout.

This is gated by two things:
- Image-gen API calls cost money and the user has historically asked to control when they happen.
- The script-level orchestrator that knows how to thread per-asset paths through these CLI tools is the explicit subject of [009-script-character-generation-spec.md](009-script-character-generation-spec.md).

**Recommendation:** acknowledge the gap explicitly in the plan's status row (already noted inline in Phase 08 evidence — make it explicit at the top of the plan's Final Acceptance section), and roll the E2E proof into 009's first phase, where it falls naturally.

**Why:** anyone reading the plan today will see "Final Acceptance: complete" without realizing that gate is on credit. Better to surface it.

> Decision: will wait until the next spec to create the script to regenerate the images

#### S2. Pattern C key-set fan-out duplicates knowledge

[scripts/render_all_prompts.py:74-79](../scripts/render_all_prompts.py#L74-L79):

```python
if asset == "character_movement":
    for d in manifest.MOVEMENT_DIRECTIONS:
        items.append((asset, d))
elif asset == "sideview_battler":
    for m in manifest.SV_BATTLER_MOTIONS:
        items.append((asset, m))
else:
    items.append((asset, None))
```

The asset-name strings duplicate `artifact_paths.PATTERN_C_ASSETS` and the asset → key-set mapping is ad-hoc. A future Pattern C asset (or just the rename of one of these two) would need touching here, in `manifest.py`'s constant lists, and in the pose defaults — three sites instead of one.

**Recommendation:** add a small map in `manifest.py` like `KEYS_BY_ASSET = {"character_movement": MOVEMENT_DIRECTIONS, "sideview_battler": SV_BATTLER_MOTIONS}`, then collapse the conditional to:

```python
keys = manifest.KEYS_BY_ASSET.get(asset)
if keys is not None:
    items.extend((asset, k) for k in keys)
else:
    items.append((asset, None))
```

This also generalizes cleanly when 010's UI needs to enumerate per-asset keys for pickers. Out of strict 008 scope but cheap.

> Decision: Implement recommendation

### Optional improvements

#### O1. `damage_sheet` test bridges in Phase 04 are local hackery

[tests/test_assemble_spritesheet.py:_expand_animations_to_cells](../tests/test_assemble_spritesheet.py) and [tests/test_reference_chain_round_trip.py:test_full_chain_round_trip_byte_identical](../tests/test_reference_chain_round_trip.py) both special-case `asset_type == "damage_sheet"` to bridge the gap between A6's bare-numeric cell names and `split_animation_strip --prefix`'s underscore-based filenames.

The clean long-term fix is to extend `split_animation_strip` to accept `--name-pattern '{i}.png'` (or treat empty `--prefix ""` as "no prefix"), so the round-trip tests don't need an asset-specific rename step. That would also let 009's orchestrator drive `extract_frames` + `split_animation_strip` with one consistent name-pattern across all Pattern B assets.

Defer to 009 or a later cleanup; not load-bearing for 008.

> Decision: fix the hackery now with the clean fix above

#### O2. `artifact_paths.py` helpers have asymmetric usage today

13 of 14 public helpers in `artifact_paths.py` have only test coverage at the moment; only `prompt_for`, `asset_dir`, `render_all_prompts_report`, and the pattern-membership constants have production callers (all in `render_all_prompts.py`). The other 8 pipeline scripts take their paths via CLI args, leaving path resolution to the future 009 orchestrator.

This is **intentional spec-driven preparation** (per spec B1: "Create `scripts/artifact_paths.py` as a NEW module ... every other script imports from this module"), so it's not gold-plating. But the 13 helpers exist on credit until 009 lands.

**Recommendation:** no action; just be aware that 009's orchestrator must actually exercise these helpers to redeem the YAGNI tension. If 009 ends up not using a helper, delete it then.

> Decision: No action

#### O3. `Path()` coercion redundancy

Every helper in `artifact_paths.py` does `Path(character_dir) / ...` even when the caller passes a `Path` (which is the type hint). The coercion is harmless and protects against `str` callers, but if the type contract is `Path`, the coercion is dead defensive code.

Either tighten the type and drop the coercion, or document the dual-type contract. Cosmetic.

> Decision: Looking at the actual code, only 4 helpers do the coercion (asset_dir, manifest_validation_report, render_all_prompts_report, package_summary); the other 10 helpers route through asset_dir, so they inherit the coercion transitively. Every production callsite passes a Path (CLI argparse uses type=Path; tests use Path("characters/TestWizard")).

Concrete recommendation: drop the Path(...) coercion in those 4 helpers. The type hint is already Path and no caller passes a str, so the coercion is dead defensive code. Replace Path(character_dir) / "artifacts" / asset with just character_dir / "artifacts" / asset.

This is a tiny, low-risk cleanup (4 line edits, no test changes needed) — let me know if you want me to make it.

#### O4. `report_path` recorded inside the report itself

[scripts/render_all_prompts.py:_build_report](../scripts/render_all_prompts.py) writes the absolute `report_path` into the report payload. If the report is ever copied / symlinked / archived, the recorded path becomes stale relative to its actual location. The pre-008 code recorded `output_dir` for the same purpose; both share the same drawback.

Low-impact; consumers that care can recompute via `artifact_paths.render_all_prompts_report(character_dir)`. Worth reconsidering when 010's UI builds its own report viewer.

> Decision: defer

#### O5. Pre-008 leftover empty subdirs survived 6 phases before Phase 08 cleaned them

Phase 02's migrator deleted obsolete top-level dirs (`prompts/`, `reports/`, …) but didn't notice that the per-asset bootstrap from before 008 had also created `face/source/`, `face/normalized/`, `enemy/source/`, etc. Those empty dirs survived until Phase 08's `find -empty -delete` cleanup.

**Why this matters as a retro note:** if a future migrator-style script touches the artifacts tree, it should `find -empty -delete` at the end as a final pass. Cheap insurance against the same drift.

> Decision: defer

## Architecture pulse-check

- **SOLID** — `artifact_paths.py` has one clear reason to change (the layout convention itself); helpers raise `ValueError` rather than silently producing wrong paths, which fits SRP and the open/closed sense of "extending behavior is a new helper, not a flag." ✅
- **DRY** — single source of truth for path conventions across patterns; pattern membership computed from `manifest.py` constants rather than re-listed. The S2 finding above is the only remaining duplication. ✅
- **YAGNI** — see O2; the helper surface is wider than current callers, but the spec mandates it. ⚠️ acceptable
- **KISS** — every helper is a pure path-builder, ~5 lines each; CLI tools stayed CLI tools; no clever abstractions emerged. ✅
- **Separation of concerns** — path conventions cleanly separated from script behavior; the orchestrator/UI surface (009/010) will compose helpers without inheriting validation. ✅
- **Coupling/cohesion** — `artifact_paths` depends on `manifest` for asset membership (justified — manifest is the canonical asset-set definition); no circular deps. ✅
- **Testability** — 83 helper tests pin every helper × every pattern; 16 batch-render tests pin the per-asset write paths and the cross-cutting report location. ✅

## Recommended follow-ups (in priority order)

1. **Add a one-line note** to the plan's Final Acceptance section that acknowledges S1 (E2E coverage deferred to 009).
2. **Open a 009-prep ticket** (or fold into 009's planning input) for: (a) fix S2's duplicated Pattern C knowledge as part of orchestrator design, (b) tackle O1's test-bridge hackery via `split_animation_strip --name-pattern`, (c) consume `artifact_paths` helpers across the full pipeline (closes O2).
3. **Push the 4 unpushed commits** when ready (`5793d99`, `5b2fa6e`, `caa9e53`, plus the about-to-be-made Phase 08 plan-evidence commit).
4. **Optional:** tackle the tiny cosmetic items (O3, O4) opportunistically. Don't gate 009 on them.

## Sign-off recommendation

Ship 008 as-is. The implementation matches the spec, all unit + integration tests pass, the live trees are correct, and the should-fix items are either deferred-to-009 by design (S1) or scope-creep nits (S2). No reason to re-open the spec.

## Resolution (bounded improvement cycle)

After review the user accepted S1 / S2 / O1 / O3 and deferred O2 / O4 / O5. The following changes shipped as a bounded improvement cycle on top of the approved 008 plan (no spec or plan revisions; only code, test, and docs touch-ups):

- **S1 — deferred-to-009 note**: added a `### Deferred` section to [008-artifacts-reorg-plan.md §Final Acceptance](008-artifacts-reorg-plan.md) calling out the E2E gate as intentionally deferred to 009's first phase, with a back-link to this review.
- **S2 — `KEYS_BY_ASSET` map**: added `manifest.MULTI_MOTION_KEYS: Dict[str, tuple]` mapping each Pattern C asset to its ordered key tuple. `render_all_prompts._expand_work_items` now does `keys = manifest.MULTI_MOTION_KEYS.get(asset)` instead of branching on hard-coded asset names. A future Pattern C asset is now a one-line edit.
- **O1 — `split_animation_strip --name-pattern`**: added a `--name-pattern` flag to `scripts/split_animation_strip.py` (defaulting to `'{prefix}_{i}.png'` to preserve backward compatibility). The round-trip test for `damage_sheet` now passes `--name-pattern '{i}.png'` to produce A6-compliant filenames directly, replacing the post-split rename hack. Two new tests in [tests/test_split_animation_strip.py](../tests/test_split_animation_strip.py) pin the new flag's behavior (bare-numeric output and zero-padded format-spec output).
- **O3 — `Path()` coercion dropped**: removed defensive `Path(character_dir)` calls from `asset_dir`, `manifest_validation_report`, `render_all_prompts_report`, and `package_summary` in [scripts/artifact_paths.py](../scripts/artifact_paths.py). The type hint already promises `Path`; the coercion was dead code.
- **O2 / O4 / O5 — deferred**: `artifact_paths.py`'s wider helper surface stays as spec-mandated preparation for 009; `report_path` recorded inside the report payload stays as-is until 010's UI builds a report viewer; the empty-leftover-dir cleanup process note stays as a retro observation for future migrators.

**Verification after improvement cycle**: `pytest tests/` reports **661 passed / 0 failed** (was 659 baseline; +2 from the new `--name-pattern` tests).
