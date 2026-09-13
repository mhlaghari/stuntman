# Floor Board Assets — Attribution

Pixel Dubai Floor world sprites and logo for `skills/floor/board`.

## Sources (verbatim copies, no raster edits)

- `vexel-laghari.webp` ← `/Users/mhlaghari/Documents/New project/avatar-rig/codex-pet-run/expressive/final/spritesheet-expressive-v3.webp`
- `vexel-claude.webp` ← `/Users/mhlaghari/Documents/New project/avatar-rig/codex-pet-run/expressive/skins/claude-red/spritesheet.webp`
- `vexel-codex.webp` ← `/Users/mhlaghari/Documents/New project/avatar-rig/codex-pet-run/expressive/skins/codex/spritesheet.webp`
- `vexel-gemini.webp` ← `/Users/mhlaghari/Documents/New project/avatar-rig/codex-pet-run/expressive/skins/gemini/spritesheet.webp`
- `vexel-deepseek.webp` ← `/Users/mhlaghari/Documents/New project/avatar-rig/codex-pet-run/expressive/skins/deepseek/spritesheet.webp`
- `laghari-labs-logo.png` ← user-provided clipboard PNG `laghari-labs-logo.png` (1774×887, red field, cream pixel `LAGHARI LABS` + lightning bolts, 2:1) — verbatim, `object-fit:contain`

Skins are hue/emblem variants of the base atlas; base and all skins share the same grid.

## Atlas Dimensions

- Size: **1536×2288** px
- Grid: **8 columns × 11 rows**
- Cell: **192×208** px

Validated against `validation-extended.json` and `validation-v3.json` (atlas_size 1536×2288).

## Row Layout

| Row | Name | Frames |
|-----|------|--------|
| 0 | idle | 7 |
| 1 | walking right | 8 |
| 2 | walking left | 8 |
| 3 | rock horns (rock-headbang / waving) | 4 |
| 4 | guitar jump (jumping) | 5 |
| 5 | rage (failed) | 8 |
| 6 | guitar riff (guitar-headbang / waiting) | 6 |
| 7 | running | 6 |
| 8 | victory (siuu / review) | 6 |
| 9 | look direction 0–157.5° (8-way) | 8 |
| 10 | look direction 180–337.5° (8-way) | 8 |

Walking counts verified from `/Users/mhlaghari/Documents/New project/avatar-rig/codex-pet-run/final/spritesheet-extended.json` via `final/validation-extended.json` cells (rows 1 and 2 each have 8 used cells).

Rows 9–10 hold 16 look directions (neutral frame at row 0 col 6).

## Notes

- All `.webp` spritesheets are used with `image-rendering: pixelated` and `steps()` animation over columns.
- Do not raster-edit; replace by re-copying from sources above.
