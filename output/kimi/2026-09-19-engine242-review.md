# engine.242 wave — adversarial review (kimi, 2026-09-19)

Read-only. Commits 171c4655 (242a weather/sentiment), 2a3bbc44 (242b retail↔business loop), ff949ab0 (242c QoL composite), eb9d6481 (cards + Civis storyline). Evidence: full diffs, current source, wiring cards (`output/engine-sheet/2026-09-19-wiring-cards-engine242.md`), live Business_Ledger beats dump, bench C108 readouts, live Simulation_Ledger snapshot. Verdicts: **clean / concerns / trick**.

**Process note, fairly stated:** the cards were run after the first cut — the order violation Mike caught — but the cards file documents that edits were held uncommitted until each card was read and its findings fixed (the 242b empty-ledger fix is visible in the commit). I verified: no card line contradicts shipped code. Two card flags were left open ("bench spread check pending," "bench to confirm" on the gates) — this review closes both below.

---

## Per-commit verdicts

### 242a (weather mood ×0.3, season /5 zero-sum, CAT-only full hit) — **CLEAN**

- Does exactly what the ruling demanded. Ordinary weather now ≤ −0.05 (`applyCityDynamics.js:340` + `WEATHER_MOOD_SCALE 0.3`, `:253`); the −0.15 CAT path requires `salient` AND type ∈ {storm, flood_conditions, heat_wave} (`:1109-1113`), and the only writers of `salient: true` are exactly those three (`applyWeatherModel.js:1127/1174/1227`). Phase order is safe (weather :294 before city dynamics :301, both entry points).
- Zero-sum is real in the code, not just the message: −0.05+0.03+0.05−0.03 = 0 (`:212-237`).
- Tests additive-only (+11 lines), and the harness executes lifted function bodies — behavior-level, not source-text.
- One prose contradiction in the commit message: "bench confirms" mid-message vs "Not benched" in the footer. The gate-reachability claim rested on a test; my gate trace below is the missing bench-equivalent.

### 242b (hoodBusinessMomentum → retail factor) — **CONCERNS**

- Wiring is honest and card-faithful: sole writer `applyBusinessDynamics.js:542`, sole reader `hoodBusinessFactor_` (`v3NeighborhoodWriter.js:254-262`), no cross-cycle carry, no double-count (closures excluded from the growth tally, `:433`; closure felt once via closedShare).
- **The clamp binds on live data, and the commit understated it.** Per-hood growth spread on the live ledger: −4.32pp (Ivy Hill) to **+35.19pp (Old Oakland)**. The commit preview claims the top is "+6% (Uptown)" — true only of canon hoods; the +35pp child-area outlier would produce factor ~1.30, clamped to 1.12. The 0.88–1.12 band is not decorative; it fires on real data, and the commit's framing hid that.
- **Phantom keys pollute the city median.** `resolveHoodOrChild_` null → `|| h` (`:425`) keeps `City-wide` (and any unmapped name) as momentum keys — never read by the map writer, but they enter the median the whole band is centered on. If Phase-1 canon seeding ever fails, the `S.canonHoods` guard (`:424`) silently falls back to raw names — same silent-degradation class I flagged in 239b's cluster fallback.
- **Zero new tests** for the new wiring — "touched suites pass" only. For a commit whose own ruling was about trick code, that absence deserves naming.

### 242c (per-hood QoL composite) — **CONCERNS**

- Real composite, real measurables: weights exactly as messaged (safety .30 / work .20 / health .15 / street .15 / housing .10 / mood .10, `updateCrimeMetrics.js:1042`), all six genuinely per-hood on live data. Reader repointing is correct everywhere (see check 4).
- **The "city middle" is miscentered — the best catch of this review.** The composite reuses `crimeMedian_` (`:413-414`), which filters `n > 0` — written for crime levels. Applied to housingPressure (modal live value **0** — ~14/22 hoods at hp=0 on the C108 bench) the median is computed over only the ~8 nonzero hoods, so every zero-pressure hood scores its housing part as *above* the "middle" — a systematic small bonus (≤ +0.018 QoL at weight 0.10) for the modal hood. Same defect on sentiment, where negatives are measured against a median-of-positives. Small magnitude, but it's exactly the pattern to kill: a filter written for one distribution silently flattering another, and the commit's "the city's own middle" language isn't true of what shipped.
- **All-zero measurables silently vanish.** A present-but-zero field drops out of the composite with weights renormalized (`:1069-1078`) — disclosed for missing data, but an all-zero *measured* cycle is not missing data.
- Band 0.05–0.95 is dead range on live data (parts only reach ±0.07) — disclosed as calibration; acceptable, but note it means nothing currently bounds a real excursion.
- Test change 11d (`qualityOfLifeIndex ≤ 0.35` → `safetyIndex ≤ 0.35`) is a **corrected contract, not a weakening** — under the old code the new assertion fails. Verified direction. New 10q tests are behavior-level.

---

## The five hard checks

**1. Trick code / silent degradation.** No trick code — nothing makes the world look fixed while wrong. The degradation list, all disclosed above: 242b phantom-median keys + silent canon fallback; 242c median miscentering + silent all-zero drop; 242a's "bench confirms / Not benched" self-contradiction (prose, not code). Zero unprescribed riders in any diff — the engine.131 sentinel pattern is absent.

**2. The retail↔business ratchet — yes, but weak, bounded, and zero-sum.** The loop is real and positive both legs: retail → `vitMod` (slope 0.15, `applyBusinessDynamics.js:350-351`) → growth (±1pp/cycle clamp, `:368`) → momentum factor (0.01×(g−median), capped ±12%, `v3NeighborhoodWriter.js:254-263`) → retail. Round-trip gain ≈ **0.014/cycle** — a ~70-cycle time constant. It cannot run away: median centering makes the growth→retail leg zero-sum across hoods (a citywide boom moves nobody's factor); the drift clamp, growth clamp [−10,+40], success pressure + 3× disruption at vit ≥ 9.0 (which already bites the C108 leaders — Rockridge 10.0, KONO 9.68, Downtown 9.41), closure shocks, and ±10%/cycle writer noise all dominate the loop's gain. And retail itself carries nothing: every cycle it re-anchors to baseRetail × canon retailMod. The only place divergence can actually accumulate is the business ledger's growth column (toward +40 under sustained good retail) — slow, bounded, and honest. **Verdict: not a trap; no guard needed today. Re-check if the vitMod slope or the ±1pp drift clamp ever moves.**

**3. The ±0.3/±0.4 gates at the new resting level.** Structural fact first: every one of the ~75 gate lines reads **city** sentiment; there are no per-hood sentiment gates, so only the ~0.02 city resting level matters. Verified: all symmetric ±0.3/±0.4 pairs still fire both ways on event cycles (positive side reachable via the eight +0.4/+0.5 holidays and sports +0.35; negative via any single big mover — unemployment −0.32, epidemic −0.30, crime wave −0.28/−0.30). Two exceptions worth a ruling:
   - **The two −0.5 gates are now uncrossable by any single crisis** (`applyShockMonitor.js:220` "severe negative sentiment," `faithEventsEngine.js:401` faith crisis condition): the largest single movers are −0.28…−0.32 and a catastrophe adds only −0.2. They fire only on a stacked multi-crisis. Arguably correct — a −0.5 city mood *should* be a stacked-crisis event — but it's a behavior change no ruling named.
   - **New systematic artifact: `applyShockMonitor.js:219` (Δ ≥ 0.3 "sentiment collapse" shock) now fires the cycle after every +0.4/+0.5 holiday**, when sentiment reverts to ~0.02. The shock monitor will flag a "collapse" on the holiday calendar, forever. Recommend the Δ gate require a minimum level (e.g., drop AND level < 0), or exempt reversion-to-mean.

**4. QoL readers — no live meaning mismatch, one latent canon split.** Every reader checked: crisis seed and unemployment envelope read crime-only `safetyIndex` (correct — crime text on the crime number, and the jobless loop is avoided by design); `qolPoolFor_` speaks the weakest/strongest measurable; bright-spot and city readers read matching numbers; newsroom slices have no QoL readers. **But:** two per-hood "quality of life" numbers now coexist on different surfaces — the in-memory composite (0.05–0.95, drives every citizen voice line, never persisted) and `Crime_Metrics!QolLevel` (5–95, disorder-only, flat ~45 on all 22 hoods, canonized live by engine.241). They share no code path and no reader. The day engine.235 persists crime verdicts and a reporter reads QolLevel, the paper will print a flat 45 while citizens speak a differentiated composite. Not a code collision — a canon split waiting for a reader. Pick one surface or reconcile them before engine.235 lands.

**5. Does each fix what the builder said was broken?**
- 242a: "why would weather outweigh major city events" → **yes.** Ordinary weather ≤ −0.05; only a salient CAT keeps the full hit.
- 242b: "a business loop not felt in its hood is trick code" → **yes, with the concerns above.** The loop now reaches the hood's retail through live ledger growth and closures; the loop itself is bounded (check 2). The clamp-binds and phantom-median issues are calibration honesty, not failure.
- 242c: "broken quality of life when canon, hood and life are measurables" → **mostly.** The composite exists, is genuinely per-hood, and voices speak their cause. The median miscentering means the "canon middle" it measures against is slightly wrong for exactly the modal hood — fix `crimeMedian_`'s `n>0` filter for non-crime fields and this is clean.

## Civis storyline (eb9d6481)

Clean. Header-verified before write, idempotent, dry-run default, read-back after apply. The row (`city-civis-systems-recalibration`, C108, open, desks civic,business) attaches **POP-00789 = Elias Varek, Founder of Civis Systems, West Oakland** — verified against the live ledger snapshot. This also resolves my earlier sparse-row flag: the empty-Neighborhood row 363 was on Storyline_Intake; the current storyline surface is Storyline_Ledger and the row there is well-formed.

## Bottom line

242a clean; 242b and 242c ship the ruled behavior with calibration-honesty concerns, none rising to trick code. The cut-before-card order violated the protocol and was repaired in-process; the cards agree with what shipped. Four items deserve engine-sheet follow-up: the `crimeMedian_` n>0 miscentering (242c), the phantom-key median pollution (242b), the post-holiday "sentiment collapse" shock artifact (242a side-effect), and the composite-vs-QolLevel canon split (242c meets engine.241). The 0.88–1.12 band binding on a +35pp child-area outlier while the commit claimed +6% max is the one place the commit prose materially understated the code — say so in the row changelog when it's fixed.

Ready for the engine.240 pin-fix review when cut.

— kimi, 2026-09-19 (read-only; no commits, no engine edits)
