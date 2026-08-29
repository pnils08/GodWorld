# Media cron proposed fixes (C104 week of 2026-08-24)

Offer to Claude. Line numbers as of 2026-08-27 on `main` (includes `84be69b4`, BART not pushed).

Doctrine wall: `docs/ENGINE_CRON_LOOP.md` §4.7 — a gate may fail only for (1) fabricated speech, (2) direct contradiction of recorded state, (3) fourth-wall “simulation” and kin. Format trivia is not on that list.

Not in this list (guesses already rejected): invented presence, banning “cycle,” dropping `corrections-needed` from Saturday, restricting storylines to curated articles.

---

## 1. Stop using s344 slot fails as `skipRhea`

**Problem.** Almost every civic/sports write this week got `flags.json` with `"summary": "no rhea verdict"`. Rhea never ran. The digest then printed “gate: no verdict.”

**File / function / line**

- `scripts/cron-desk-run.js` — `runWrite`
  - L2466: `isSummaryArticle(draftText)` → `shape`
  - L2467–2473: `s344ArticleGate.evaluate(...)` → `s344Gate`
  - L2478: `articleContamination.scanFile(...)`
  - L2483–2484: logs `s344 article gate: ...`
  - **L2489:** `const skipRhea = contamination.fail || (PACKET_ACTIVE && (shape.fail || s344Gate.fail));`
  - L2492: `else if (!skipRhea)` — Rhea only if that is false

**Change.** `skipRhea` only on doctrine hits: fabricated speech, recorded-state contradiction, “simulation” / raw POPID, leftover repair chrome. Slot misses (`lede-misses-assignment`, `missing-unanswered-question`, `intake-misses-assignment`, `missing-packet-quote`) log only. They do not flag and they do not block Rhea.

---

## 2. Drop or demote the four slot checks

**Problem.** Those slot misses *are* the trivia: missing `?`, lede/CLAIM not copying the assignment string, italic Packet quotes.

**File / function / line**

- `scripts/livedArticleShape.js`
  - L41: `packetQuoteLanded`
  - L52: `s344Slots`
  - L62: `lede-misses-assignment` (lede must share a ≥5-letter assignment token)
  - L66: `missing-packet-quote` if `packetQuoteLanded` is false
  - L71: `missing-unanswered-question` if last two grafs have no `?`
  - L76: `isSummaryArticle` (also OR’d into `skipRhea` via `shape.fail`)
- `scripts/s344ArticleGate.js`
  - L12: `assignmentBind`
  - L20: `lede-misses-assignment` again
  - L29: `intake-misses-assignment` (INTAKE `CLAIM:` must share those tokens)
  - L31–33: faith-vs-transit swap (keep)
  - L38: `evaluate` (composes slots + contamination + bind)
- Tests that pin the trivia:
  - `scripts/cronDeskStoryTemplate.test.js` L88 (`intake-misses-assignment` on Luis)

**Change.**

- `missing-unanswered-question`: a question in the last two grafs, with or without `?` — or delete the check.
- `lede-misses-assignment` / `intake-misses-assignment`: delete token-overlap. Keep only L31–33 faith-vs-transit.
- `missing-packet-quote`: italics / INTAKE still count as a landed span; do not fail the wake.

---

## 3. Keep (and stage-fail) the real contamination

**Problem.** POPIDs in Jordan’s body, Angela’s “Here’s the corrected education section…”, Trevor’s “the engine audit shows” are not trivia.

**File / function / line**

- `scripts/cron-rhea-gate.js` L628 — `popid-leak` (`raw POPID(s) in prose`). **Keep.**
- `scripts/cron-desk-writer.js`
  - L361: `stripRepairChrome`
  - L1163: applied to the repair-pass unfenced draft
  - Test: `scripts/cron-desk-writer.test.js` L11, L54
- `scripts/articleContamination.js`
  - L49: `BLIGHT` / `decay-narrative` (Lila Mon). Leave until named otherwise.
  - `scan` / `scanFile` — add a frame-break regex for `the engine audit` (Trevor). Cycle/packet stay legal trade words per §4.7.
- Test: `scripts/articleContamination.test.js`

**Change.** Keep POPID fail. Extend `stripRepairChrome` for Angela’s opener. Add engine-audit frame-break. Blight stays until said otherwise.

---

## 4. Jax W1: bad target pop must not kill the angle wake

**Problem.** 2026-08-25: Jax `invalid W1 output: target must use a supplied pop with question+basis` → no `angle.json` → report and write cascade.

**File / function / line**

- `scripts/livedExperiencePacket.js`
  - L455: `validateAngleOutput`
  - L468: `errs.push('target must use a supplied pop with question+basis')` — this throws the whole W1 at L472
- Re-export: `scripts/livedExperiencePacketV2.js` (`validateAngleOutput: v1.validateAngleOutput`)
- Test: `scripts/livedExperiencePacket.test.js` currently expects throw on `MADE-UP` pop

**Change.** Drop illegal targets (empty `targets[]`) and continue. Flip the test: plan passes, `targets` empty.

---

## 5. Empty W2 stays fail-closed

**Problem.** None. Simon Mon 2026-08-24 is the intended behavior.

**File / function / line**

- `scripts/cron-desk-run.js`
  - L517: `assertPublishableQuotesStrict`
  - L523: `assertPublishableQuotes` (no-op unless `PACKET_ACTIVE`)
  - L2288: W2 after interviews land
  - L2370: W3, Packet-active, before last-chance interview
- Test: `scripts/cronDeskStoryTemplate.test.js` L19–21

**Change.** None. Zero publishable answers = do not open W3. That is not a missing `?`.

---

## 6. Hal slice vs historian carve-out (Claude / sports)

**Problem.** Hal now writes (W1 chase lands) but live story chrome still says era echo is only legal if the Packet names the legend. Packet will not contain 1973.

**File / function / line**

- Live chrome (generated, shows the stale instruction): `output/cron-compare/sports_c104_hal-richmond_packet-v2_story.md` §1 DESK APPROACH (~L8): era echo only when the Packet supplies the historical name.
- `scripts/cron-desk-writer.js` L843–849 — `HAL STANCE`: “Present fact first (packet-true), then era echo… Historical baseball echo… the Packet will not contain 1973.” Writer kickoff is already retuned.
- `scripts/newsroom-wake-packages.json` — `hal-richmond` `reviewProfile` (already retuned for archive echo).
- Whoever owns the **sports slice builder** that still emits “only when the Packet supplies it” into §1 — that line has to match the historian carve-out.

**Change.** Sports lane. Do not edit sports bags from this offer unless the builder names that cut.

---

## Suggested land order

1 then 2 change what Saturday can print. 3 is the actual contamination wall. 4 unblocks Jax. 5 stay. 6 to Claude/sports.
