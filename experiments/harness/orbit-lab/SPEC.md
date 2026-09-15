# Orbit Lab — build spec (zero decisions)

Build ONE self-contained file: `orbit-lab.html` in the current directory. No external
resources, no frameworks, no build step, no network. Plain ES2020 JavaScript with
`'use strict'`. It must load in Chromium with ZERO console errors and ZERO uncaught
exceptions at 1280x800 and must handle window resize.

Write the file in PARTS to avoid truncation: (1) create the file with the HTML + CSS
shell and empty `<script>` tag; (2) insert the PHYSICS module into the script; (3) insert
the RENDER + UI module. Keep every single tool call under 200 lines. After writing,
read the file back once and confirm every required id and `window.OrbitLab` exist.
Do not stop until the file is complete.

## Layout (exact ids are required)

- `<canvas id="canvas">` full-window, black background (#05070d), top-down view of the
  Solar System with the Sun at the center.
- `<div id="hud">` top-left: title "Orbit Lab", then `<span id="date">` (calendar date),
  `<span id="warp">` (e.g. "10 days/s"), and FPS.
- `<div id="info">` top-right: the selected planet's data (hidden until a planet is clicked).
- `<div id="planner">` bottom-left with `<select id="origin">`, `<select id="dest">`,
  `<button id="plan">Plan transfer</button>`, and `<div id="result">`.
- A one-line help footer listing the keys.
- Style: dark UI panels (rgba(10,14,24,0.85)), 1px border #2a3550, monospace font,
  accent color #7ec8ff, planet label text 12px.

## PHYSICS module

Constants: `AU_KM = 1.496e8`, `GM_SUN = 1.327e11` (km^3/s^2), `DAY_S = 86400`.

Planets array — id, name, color, a (AU), e (eccentricity), T (period, days),
mean longitude at epoch J2000 L0 (degrees), longitude of perihelion w (degrees):

| id | name | color | a | e | T | L0 | w |
|---|---|---|---|---|---|---|---|
| mercury | Mercury | #b5b5b5 | 0.387 | 0.2056 | 87.97 | 252.25 | 77.46 |
| venus | Venus | #e6c98a | 0.723 | 0.0068 | 224.70 | 181.98 | 131.53 |
| earth | Earth | #5aa0ff | 1.000 | 0.0167 | 365.25 | 100.46 | 102.94 |
| mars | Mars | #ff6a3d | 1.524 | 0.0934 | 686.98 | 355.45 | 336.04 |
| jupiter | Jupiter | #e0b07a | 5.203 | 0.0489 | 4332.6 | 34.40 | 14.73 |
| saturn | Saturn | #f2d99a | 9.537 | 0.0565 | 10759 | 49.94 | 92.60 |
| uranus | Uranus | #8fe3e8 | 19.19 | 0.0457 | 30687 | 313.23 | 170.96 |
| neptune | Neptune | #5f7cff | 30.07 | 0.0113 | 60190 | 304.88 | 44.97 |

Position at simulation time `t` (days since J2000):
1. mean anomaly `M = (L0 - w) + 360 * t / T`, in degrees, normalized to [0, 360), then radians.
2. solve Kepler's equation `E - e*sin(E) = M` with Newton iteration, 12 iterations, start `E = M`.
3. true anomaly `nu = 2 * atan2( sqrt(1+e)*sin(E/2), sqrt(1-e)*cos(E/2) )`.
4. distance `r = a * (1 - e*cos(E))` in AU.
5. heliocentric longitude `lon = nu + w(radians)`. x = r*cos(lon), y = r*sin(lon) (AU).
6. orbital speed (km/s) by vis-viva: `v = sqrt( GM_SUN * (2/(r*AU_KM) - 1/(a*AU_KM)) )`.

Hohmann transfer between two planets (circular approximation using their `a`):
`r1 = a1*AU_KM`, `r2 = a2*AU_KM`, `at = (r1+r2)/2`,
`v1 = sqrt(GM/r1)`, `vt1 = sqrt(GM*(2/r1 - 1/at))`, `dv1 = |vt1 - v1|`,
`v2 = sqrt(GM/r2)`, `vt2 = sqrt(GM*(2/r2 - 1/at))`, `dv2 = |v2 - vt2|`,
`dv_total = dv1 + dv2` (km/s), `transfer_days = PI * sqrt(at^3 / GM) / DAY_S`,
`phase_angle_deg = 180 - 360 * transfer_days / T2`, normalized to (-180, 180].
Next launch window: starting from the current sim time, step 1 day at a time up to
20000 days; the window is the first day where `(lon_dest - lon_origin)` in degrees,
normalized to (-180, 180], is within 1.0 degree of `phase_angle_deg`. Return that
day's calendar date and days-from-now (or null if none found).

Expose exactly: `window.OrbitLab = { planets, state, positionAt(id, tDays),
hohmann(originId, destId) }` where `hohmann` returns
`{ dv1_kms, dv2_kms, dv_total_kms, transfer_days, phase_angle_deg, window_date, window_in_days }`
and `state = { simDays, paused, warp }` (live object, not a copy).

## RENDER + UI module

- Screen mapping: `scale = Math.min(W, H) / 900`; radius on screen for distance `d` (AU)
  is `R(d) = (50 + 100 * Math.log(1 + d)) * scale` pixels, angle preserved
  (log-radial so Mercury and Neptune both fit). Sun: 8px yellow disc + soft glow.
- Draw each planet's full orbit path (sample 360 points via positionAt with t across one
  period) as a thin line in the planet's color at 35% alpha. Draw the planet as a disc
  (radius 3–6px, Jupiter largest) with its name label offset to the right.
- Animation loop with `requestAnimationFrame`; `state.simDays += warp * dt` where `dt`
  is real seconds elapsed; `warp` is in sim-days per real second.
- Calendar date: J2000 epoch = 2000-01-01T12:00Z; date = epoch + simDays*86400000 ms,
  displayed as `YYYY-MM-DD`.
- Keys: Space = pause/resume; `1`,`2`,`3`,`4` = warp 1 / 10 / 100 / 1000 days/s;
  `R` = reset simDays to 0. Initial warp = 10, not paused.
- Click on a planet (within 12px of its screen position) → fill `#info` with name, a,
  e, period, current distance from the Sun (AU, 3 decimals), current speed (km/s,
  2 decimals), and highlight it with a ring.
- Planner: both selects list all eight planets (origin default earth, dest default
  mars). Clicking `#plan` calls `hohmann` and fills `#result` with dv1, dv2, total,
  transfer days, phase angle, and the next launch window date + days from now. It also
  draws the transfer half-ellipse (dashed, accent color) from the origin's orbit to the
  destination's orbit and marks launch and arrival points, until a new plan or reset.
- Resize: canvas tracks window size via `resize` listener; DPR-aware.
