---
title: pipeline.80 Saturday reader review
created: 2026-10-16
updated: 2026-10-16
type: reference
tags: [media, citizens, draft]
sources:
  - docs/for-claude-review/2026-10-16-pipeline80-saturday-readers-TASK.md
  - docs/plans/2026-10-11-media-extension.md
  - scripts/cron-saturday-run.js
  - scripts/cron-desk-run.js
pointers:
  - "[[../plans/2026-10-11-media-extension]] — pipeline.80 owner"
---

# Verdict: FIX before Saturday consumes floor entries

Read-only source review; only this requested report was written. No scripts, tests, checker invocation, model calls, Sheets reads, cron, or canon runs. Existing dirty/untracked work was left intact. Counts below are manual source/body reconstruction, not executed `checkText` output or proof of Saturday admission. Registration is left to the receiving Claude seat under the inbox contract and the explicit one-file scope.

| Hunt | Gate | Result |
|---|---|---|
| 1. Usage rows | SHIP, bounded | Null POPIDs are skipped; unique resolved floor mentions get one row on ordinary sequential ingestion/rerun. |
| 2. Deterministic audit | FIX, high | An ambiguous floor entry hard-fails the entire filing. Bruce Wright supplies a concrete C111 case. |
| 3. Crossovers / narration | FIX, high; cap not justified by C111 | Two crossings before and after; existing whole-set narration admits rejected/unaudited evidence and unresolved identities. |
| 4. Other readers / score | FIX, medium | Names-count ranking rewards the indexing floor as much as a quoted source; tags and storyline roles otherwise behave as intended. |

## 1. Usage writer: SHIP for the specified entry shape

`scripts/cron-saturday-run.js:93` maps `mentioned` to `mentioned`; `:356–366` skips every falsy POPID at `:363`. Therefore `{popid:null, ambiguous:true, floor:true}` produces **zero** usage rows, not a name-only row. `floor` is not a usage type. No wrong-person write through this route was found for the stated shape.

`scripts/cron-desk-run.js:2753–2773` deduplicates floor additions by case-insensitive name, preserves existing model entries, and adds each missing name once. Saturday persists `CitizenName`, `UsageType`, and filing stem as `Context` (`scripts/cron-saturday-run.js:446–464`); an unchanged sequential rerun finds that same triple and skips it. POPID is not persisted by that switch (`:451–460`), so preserving the upstream null-ID skip matters.

Limits: this is not atomic exactly-once proof. The writer does not add pending keys to `existing`, and concurrent writers can read the same prior sheet. Existing duplicate model names are not repaired by the floor. Missing `Context` is not a hard header error (`:445–447`), so replay protection assumes the normal schema. Citation classification also runs before dedup (`:436–450`), repeating paid work even on a row-skipping rerun. None is a new duplicate introduced by the floor's unique entry shape.

The TASK's downstream premise needs precision: `phase05-citizens/processAdvancementIntake.js:297–302` splits a name; `:1227–1235` aggregates citations by normalized name. It does not choose a citizen there. The tier consumer explicitly skips duplicate ledger name keys (`:1293–1309`). These are additional bounds, not grounds to weaken Saturday's POPID guard.

## 2. Audit / canon door: FIX

The promised re-check is **`auditOne`**, `scripts/cron-saturday-run.js:794–806`. At `:801`, any missing POPID becomes `nameFails`, regardless of `floor` or `ambiguous`. At `:846–849`, even an otherwise accurate model verdict is overridden to `canon-violation`. Curation rejects the filing (`:997`); sweep/sheets/signals exclude it (`:317–322`). Publication assembles the selected stems (`:1095–1100`). This is a filing-wide rejection, not merely withheld credit.

Concrete counterfactual: `output/cron-compare/staged/business_c111_business-desk_packet-v2_anthropic-claude-opus-5-5.staged.md:23` prints Bruce Wright; its sidecar lists only four other names (`.staged.json:13–34`). `output/simulation_ledger_snapshot.jsonl:795` and `:914` contain Active Bruce Wright rows with distinct POPIDs, POP-00965 and POP-01085. `scripts/canon-name-check.js:283–309` resolves that name as null/ambiguous; `scripts/cron-desk-run.js:2767–2772` admits it to the floor. Saturday would then reject the business filing at `:801`. C111 is not backfilled, so this is evidence of the mechanism, not a claim that the existing C111 filing has already failed it.

Resolved floor entries pass when the live profile exists and its name matches. “Never turns away” is still too strong: the floor uses a snapshot; Saturday reads the live Simulation_Ledger (`scripts/cron-saturday-run.js:747–764`). A removed/renamed citizen can fail `:803–805`. The current profile loader also preserves raw name whitespace, unlike the floor's normalization.

**Smallest change:** in `auditOne`, handle `floor === true && ambiguous === true && !popid` as a separate, live-name-verified unresolved identity. If the normalized name exists in the authoritative profiles, do not classify the missing ID itself as citizen-bending; keep it ineligible for usage credit. Give the model an explicit ambiguous-identity note and the matching alternatives, without attributing one person's biography to another. An unknown floor name and mismatched claimed ID must retain the hard failure. Merely skipping the deterministic branch is insufficient: `:815–818` currently drops the ambiguous name from ground truth while `:832` still sends it in the claim register. Add focused ambiguous-known / unknown / mismatched-ID audit cases when implementation is authorized.

## 3. C111 crossover census and prompt: FIX eligibility, no demonstrated need for a cap

Scope: the **21 C111 sidecars and the bodies they point to** in `output/cron-compare/staged/`, not every loose Markdown file there. The census does not run `loadStagedSet` proof/hash checks (`scripts/cron-saturday-run.js:195–243`) or predict an EIC verdict. Current standings supply board candidates (`:941–944`); they are a current snapshot, not a frozen C111 board.

Candidates come from every INTAKE plus the board; presence already includes body matches (`:946–964`). A newly indexed name is not necessarily a newly detected crossing. Full-name inspection across the 21 bodies yields:

| Crossing | Without floor | With landed floor | Evidence in staged bodies |
|---|---|---|---|
| Eric Taveras | sports + undocked; 2 pieces | Same | `sports_c111_anthony-raines_packet-v2_anthropic-claude-haiku-5-5.staged.md:7`; `undocked_c111_nia-rook_packet-v2_x-ai-grok-4-3.staged-2316.md:1` |
| Briar Soto | business + undocked; 2 pieces | Same | `business_c111_business-desk_packet-v2_anthropic-claude-opus-5-5.staged.md:27`; `undocked_c111_nia-rook_packet-v2_x-ai-grok-4-3.staged-2317.md:1` |
| Total | 2 citizens, 2 prompt bullets | 2 citizens, 2 prompt bullets | Eric is already a board candidate (`output/spacemolt-show/standings.json:7–8`); Briar already has an INTAKE entry (`…staged-2317.json:16–18`). |

Each of those four filings gets +2 crossover points before and after; all other filings get zero. Clarissa's two appearances and Rosario's two appearances remain solely undocked; multiple sports pieces remain one sports system. All added business names other than Briar appear in no other system in this set. Thus the floor does **not** expand this C111 crossover block or bonus. This is the detector-only counterfactual: with the current audit defect, business would instead be rejected.

The bonus is uncapped `2*n` (`scripts/cron-saturday-run.js:968–971`), but grade leads sorting (`:1000–1003`). The block is also uncapped (`:973–979`); the 3600 tokens at `:1070–1073` bound model output, not that input block. C111 does not establish a need for an arbitrary per-filing or per-block cap. More importantly, a cap would not fix evidence eligibility.

**FIX:** crossovers are computed from the whole staged set at `:994`, **before** audit filtering at `:997`. Narration forwards all those crossings (`:1068–1073`) while providing article material only for selected stems (`:1061–1065`). A rejected or unaudited filing can therefore supply the second “system” for a confident one-life instruction. The floor expands the candidates exposed to this existing seam. `:947–959` also uses unresolved name keys and body-only matches, so an ambiguous name can conflate different citizens across desks or coexist with a POPID-keyed duplicate.

**Smallest change:** compute ranking crossovers from the audited, non-violation eligible set; exclude unresolved identities from person-level crossover candidates. For narration, restrict crossing pieces to selected eligible stems and recompute the two-system condition, or explicitly supply the cleared unselected evidence before narrating it. Preserve the complete diagnostic set separately if desired. Do not solve this by simply slicing the first N crossings.

## 4. Other readers and the separate names-count score: FIX

The literal `intake.names` search across `scripts/` finds the Saturday readers above, the floor/pilot writers, and test references. Reader outcomes:

- **SHIP — Supermemory association:** `scripts/cron-saturday-run.js:262–287` includes every non-null POPID in article metadata without role distinctions. It does not claim they were quoted; tags are publication container, journalist, Cycle, and desk. Null/ambiguous floor IDs are omitted. No direct citizen-page write is in this path; citizen pages use a separate container and `cp-` tags (`lib/citizenPage.js:32–46`).
- **SHIP — storyline membership:** `scripts/cron-saturday-run.js:516–520` explicitly excludes `mentioned`, so added floor mentions do not become quoted/subject storyline citizens.
- **SHIP — usage context:** `:364`, `:455–459` retain `mentioned` as the usage type and the filing stem as context. The same citation-light classifier runs for all non-byline rows (`:439–443`); floor mentions increase calls, but are not relabeled quoted sources.
- **FIX — curation score:** `:908–916` counts every name at 0.5, including ambiguous floor mentions. This is **curation**, not the EIC accuracy scorecard. It silently makes automatic indexing affect editorial selection independently of the crossover bonus.

Manual reconstruction of the landed floor (checker candidate rules at `scripts/canon-name-check.js:227–267`, then byline/Active/existing-name guards at `scripts/cron-desk-run.js:2751–2773`):

| C111 filing(s) | Existing names | Floor additions | Resulting names |
|---|---:|---:|---:|
| Business / Jordan | 4 | 13 | 17 |
| Carmen; Noah | 4; 0 | 3; 1 | 7; 1 |
| Luis; Lila; Trevor; Rachel; Jax | 4; 4; 4; 0; 0 | 0 each | unchanged |
| Culture / Elliot Graye | 3 | 1 | 4 |
| Anthony; Hal; Marbury | 0; 0; 0 | 7; 5; 3 | 7; 5; 3 |
| Selena; Talia; Tanya | 0; 2; 3 | 2; 1; 1 | 2; 3; 4 |
| Simon; P Slayer | 1; 3 | 0 each | unchanged |
| Nia plain; 2316; 2317; 2320 | 0; 0; 1; 0 | 1; 1; 1; 2 | 1; 1; 2; 2 |
| **Total: 21 filings** | **33** | **42** | **75** |

Reproduction anchors: each sidecar's names array begins at `:13` or `:14`; additions appear in Carmen body `:7`, Noah `:1`, Graye `:15`, Anthony `:3,7,13`, Hal `:3,11,13,27`, Marbury `:3,44,46`, Selena `:3,13`, Talia `:9`, Tanya `:1`, and the Nia body passages cited above (`plain:1`, `2317:5`, `2320:1,5`). These are static counts; production proof admission and live identity changes remain unverified.

Business's 18 visible canon names include byline Jordan (`business…staged.md:3`); the actual floor excludes him. The 13 additions at `:23,27` include ambiguous Bruce. Thus the TASK's +14 / plan's raw checker census is not the landed addition count. Across this current set, the five excluded author names (Jordan, Lila, Trevor, Talia, Jax) likewise explain 47 raw missing names versus 42 floor additions. The aggregate names component rises **16.5 → 37.5**; business alone rises **2 → 8.5** (+6.5), exceeding two storyline moves (+6). The crossover component stays unchanged. These are score components, not a predicted published selection.

**Smallest scoring change:** exclude automatic mention-only entries from the names-count term, e.g. count entries other than `floor === true && role === 'mentioned'`. Preserve model roles and the later weekly-pilot promotion: `scripts/cron-desk-run.js:2789–2793` can change a floor entry to `subject` while retaining `floor:true`. A blanket `!floor` test would wrongly suppress that existing subject signal. If indexing breadth is intended to change selection, obtain that explicit scoring decision instead of asserting “Saturday untouched.”

Gate remains FIX for the audit and reader changes above. No runtime, deployment, live-Sheet, or published-result claim is made by this review.
