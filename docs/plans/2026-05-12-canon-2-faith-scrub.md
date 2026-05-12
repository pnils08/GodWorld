---
title: Canon.2 Faith-Canon Real-Name Scrub Plan
created: 2026-05-12
updated: 2026-05-12
type: plan
tags: [canon, infrastructure, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §canon.2
  - docs/canon/CANON_RULES.md §Tier 3 (always-block, real individuals) + §Faith & Community write-up history
  - docs/canon/INSTITUTIONS.md §Faith & Community (S195 always-block rule, partial substitutes)
  - docs/media/REAL_NAMES_BLOCKLIST.md §Faith Organizations & Clergy
  - docs/mags-corliss/JOURNAL.md S217 entry (Reeves/Greater Hope flagged "too close to real")
  - SESSION_CONTEXT.md S217 (canon emergency surface, Mara AUDIT_TEMPLATE Tier-3 sub-check shipped)
  - GodWorld MCP lookup_citizen("Robert Jaston") — POP-00758, West Oakland Senior Pastor, BIZ-00028 employer
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout, canon.2 row points here"
  - "[[canon/CANON_RULES]] — three-tier framework, §Faith write-up"
  - "[[canon/INSTITUTIONS]] — substitution table lives here after P1"
  - "[[../media/REAL_NAMES_BLOCKLIST]] — blocklist source-of-truth for the canon filter"
  - "[[index]] — register in same commit"
---

# Canon.2 Faith-Canon Real-Name Scrub Plan

**Goal:** Replace the 16 real-world faith-organization names + their clergy in Faith_Organizations / Business_Ledger / Simulation_Ledger / wd-faith Supermemory cards with fictional canon substitutes, and add a startup-time canon filter to `buildFaithCards.js` so the same contamination can't re-enter.

**Architecture:** Sheets-first scrub (Faith_Organizations 16 rows + Business_Ledger faith-org BIZ cross-walk + Simulation_Ledger faith-leader POPs) cascades through `buildFaithCards.js` to Supermemory `wd-faith`. `REAL_NAMES_BLOCKLIST.md` §Faith becomes the durable source-of-truth the canon filter reads at startup; matches throw hard. bay-tribune left untouched as paper-of-record per S217 user-profile rule; a corrections-forward map in `INSTITUTIONS.md` §Faith maps each shipped real name to its C94+ canon substitute. Closes the S217 canon emergency: all four reviewer lanes missed E93 shipping `Acts Full Gospel Church` + `Bishop Robert Jackson Sr.` by name because the audit pattern trusts `wd-*` lookup hits as canon-valid. Mara AUDIT_TEMPLATE Tier-3 sub-check (shipped S217) is interim audit-side defense until this plan ships.

**Terminal:** research-build (drafts plan + authors substitutes + corrections-forward map) → engine-sheet (export + sheet writes + canon filter + Supermemory rebuild).

**Pointers:**
- Prior work: S195 partial substitution shipped 2 of ~16 rows (Acts Full Gospel → Greater Hope Pentecostal, Bishop Jackson → Bishop Reeves); S217 journal flagged both substitutes as "too close to real."
- Related plan: [[2026-04-27-world-data-unified-ingest-rebuild]] (wd-faith tag scheme, wipe primitive `--wipe-old`)
- Research basis: GodWorld MCP `lookup_citizen("Robert Jaston")` confirms POP-00758 = West Oakland Senior Pastor, BIZ-00028 employer, Anchor archetype, source `faith-leader`. Jaston is canon-forward for the West Oakland slot.

**Acceptance criteria:**

1. All 16 `Faith_Organizations.Organization` values + their `Leader` values are fictional names not matching real Oakland faith institutions; verified by reading the sheet back and grepping the row set against `REAL_NAMES_BLOCKLIST.md` §Faith.
2. `INSTITUTIONS.md` §Faith contains a 16-row substitution table + a corrections-forward map (which prior editions shipped each real name × canon substitute superseding C94+).
3. `buildFaithCards.js --apply` against a planted contaminated row exits non-zero with the offending Organization or Leader named in the error message.
4. `mcp__godworld__lookup_faith_org` for each of the 16 substituted organization names returns the new (fictional) card; old real-name lookups return zero results.
5. bay-tribune Supermemory container untouched — `search_canon "Acts Full Gospel"` still surfaces E93 references unchanged.

---

## Tasks

### Phase 0 — Export the contamination surface [engine-sheet]

#### Task 0.1: Dump Faith_Organizations + cross-walks

- **Files:**
  - `output/faith_canon_export_c93.md` — create
  - `lib/sheets.js` — read-only via `getSheetData`
- **Steps:**
  1. Read `Faith_Organizations` — emit all rows including header. Columns per `scripts/buildFaithCards.js` lines 30-33: Organization / FaithTradition / Neighborhood / Founded / Congregation / Leader / Character / ActiveStatus / LeaderPOPID.
  2. Read `Business_Ledger`. Filter rows whose BizName matches any value in `Faith_Organizations.Organization` OR whose Industry/Category column indicates faith. Emit BIZ-ID + BizName + Neighborhood + cross-reference to Organization.
  3. Read `Simulation_Ledger` for POPs whose Role contains `Pastor`, `Imam`, `Rabbi`, `Reverend`, `Priest`, `Bishop`, or `Faith Leader`, OR whose POPID matches any `Faith_Organizations.LeaderPOPID`. Emit POPID + Name + Role + Neighborhood.
  4. Write all three slices to `output/faith_canon_export_c93.md` under three `##` headings: `## Faith_Organizations`, `## Business_Ledger faith cross-walk`, `## Simulation_Ledger faith-leader POPs`.
- **Verify:** `wc -l output/faith_canon_export_c93.md` → at least 30 lines (16 org rows + cross-walks + headers); `grep -c '| POP-' output/faith_canon_export_c93.md` → at least 16 (one per faith-leader row).
- **Status:** [x] complete (S218 engine-sheet, 2026-05-12). Shipped `scripts/exportFaithCanonC93.js` + `output/faith_canon_export_c93.md` (119 lines, 35 POP-row matches). Findings beyond plan baseline: (1) **0 BIZ entries model faith orgs by name** — Business_Ledger has no faith sector and no name matches; only false-positive keyword hit is `Temple Lounge` (nightlife). (2) **All 17 SL faith-role POPs share `BIZ-00028 / West Oakland Community Center / Community Services` as EmployerBizId** — single shared record, no per-faith-org BIZ; P1 decision needed (leave as-is / create 16 / rename BIZ-00028). (3) **2 FO Leader ↔ SL Name drift rows** — POP-00756 (FO `Fr. Ramon Torres` vs SL `Ramon Terez`, St. Columba) is internal canon drift; POP-00758 (FO `Bishop Robert Jackson Sr.` vs SL `Robert Jaston`, Acts Full Gospel) is the S195 partial-substitution leak — SL was updated to Jaston (canon) but the FO Leader column was never updated. P1 substitution table must overwrite the FO Leader column wholesale, not assume it's already-canon.

---

### Phase 1 — Author canon substitutes [research-build]

#### Task 1.1: Read the P0 export and tabulate

- **Files:**
  - `output/faith_canon_export_c93.md` — read
- **Steps:**
  1. Build the 16-row mental map: `Organization → Tradition → Neighborhood → Leader → LeaderPOPID → linked BIZ-ID`.
  2. Note any leaders whose POPID already maps to a fictional citizen card (e.g., Jaston POP-00758 for West Oakland — pulled from S195 INSTITUTIONS.md note + MCP lookup). Those LeaderPOPIDs survive; only the displayed Name string changes.
  3. Flag any leader rows where the POPID is empty — those need either a new POP allocation or use of an existing unassigned citizen.
- **Verify:** Mental map captured; cross-references between org rows / BIZ rows / POP rows resolved.
- **Status:** [x] complete (S218 research-build, 2026-05-12). Tabulation captured inline in chat; 16 FO rows + 17 SL POPs (1 orphan POP-00734 Father Miguel out-of-scope) cross-referenced. Three structural findings from P0 export (no per-org BIZ entries / shared BIZ-00028 / 2 FO↔SL drift rows + 4 FO↔SL neighborhood drift rows) flagged as out-of-scope for canon.2 in §Out of scope of INSTITUTIONS.md.

#### Task 1.2: Draft substitution table

- **Files:**
  - `docs/canon/INSTITUTIONS.md` §Faith & Community — modify
- **Steps:**
  1. Replace the current §Faith narrative + 2-row legacy table with a section containing:
     - The S195 always-block rule (preserved as-is).
     - A 16-row canon substitution table: `| Real Name (legacy) | Tradition | Neighborhood | Canon Substitute (org) | Canon Substitute (leader) | LeaderPOPID | Notes |`.
     - A short naming-conventions paragraph noting fictional substitutes must not pattern-match real Oakland faith institutions (S217 Greater Hope / Reeves failure mode).
  2. Resolve the Reeves/Jaston split: West Oakland Pentecostal row uses Jaston (POP-00758) as Canon Substitute (leader). Reeves dropped from canon-forward table; added to corrections-forward map (Task 1.4) as bay-tribune-only frozen reference.
- **Verify:** Table has exactly 16 rows; every row has an org substitute + a leader substitute + a LeaderPOPID (existing or to-allocate flagged).
- **Status:** [x] complete (S218 research-build, 2026-05-12). `docs/canon/INSTITUTIONS.md` §Faith & Community replaced — S195 always-block rule preserved, naming-conventions paragraph added (S217 too-close-to-real failure mode named), 16-row substitution table shipped with display-title notes per clergy, POP-00758 Jaston canon-forward preserved, POP-00756 Torres↔Terez SL drift resolved via Solano substitute.

#### Task 1.3: Sync REAL_NAMES_BLOCKLIST.md

- **Files:**
  - `docs/media/REAL_NAMES_BLOCKLIST.md` §Faith Organizations & Clergy — modify
- **Steps:**
  1. Replace the current §Faith block (which has pending placeholders) with the full 16-name blocklist: each row `Real Org Name → Canon Substitute Org` and `Real Clergy Name → Canon Substitute Leader`.
  2. Add a one-line note that `INSTITUTIONS.md` §Faith is the authoritative source; this file is the runtime block-list copy the canon filter reads.
  3. Append the 2 Reeves-era retired substitutes (Greater Hope Pentecostal Church, Bishop Calvin Reeves Sr.) to the blocklist — they also can never be written to wd-faith going forward.
- **Verify:** `grep -c "→" docs/media/REAL_NAMES_BLOCKLIST.md` in §Faith returns at least 32 (16 orgs + 16 leaders).
- **Status:** [x] complete (S218 research-build, 2026-05-12). §Faith Organizations & Clergy block replaced — 16 org substitutions + 16 clergy substitutions + retired-S195-interim block (Greater Hope Pentecostal + Bishop Calvin Reeves Sr.) + historical edition notes preserved. Cross-reference back to INSTITUTIONS.md §Faith as authoritative source.

#### Task 1.4: Mike approves the substitution slate

- **Files:** none — chat approval gate
- **Steps:**
  1. Show Mike the proposed 16-row substitution table inline before commit.
  2. Apply edits per his feedback; revise until approved.
- **Verify:** Approval received in chat.
- **Status:** [x] complete (S218 research-build, 2026-05-12). Mike approved slate as-presented ("yeah this def gets granular over religion and extends beyond like Lake Merrit Catholic Church... ill side with you on best practices here") + sided with framing on the three structural decisions (BIZ-00028 leave-alone, POP-00734 orphan out-of-scope, FO↔SL drift overwrite policy). No forensic web-vet requested.

---

### Phase 2 — Corrections-forward map [research-build]

#### Task 2.1: Extend INSTITUTIONS.md §Faith with corrections-forward table

- **Files:**
  - `docs/canon/INSTITUTIONS.md` §Faith & Community — modify (append to section)
- **Steps:**
  1. Add a `### Corrections Forward` subsection below the substitution table.
  2. Table columns: `| Real Name shipped in canon | Editions | Canon Substitute superseding C94+ | Notes |`.
  3. Populate rows from `REAL_NAMES_BLOCKLIST.md` §Faith historical references (E78, E79, E80, E81, E85, E86, E89, E91, E93 per S195 note + the journal-confirmed E93 specifics). Add a row for Greater Hope Pentecostal + Bishop Calvin Reeves Sr. with Editions=E93 only and `Notes: S195 interim substitute retired S218 — too close to real; bay-tribune frozen reference`.
  4. Add a one-paragraph rule at the bottom: bay-tribune Supermemory + published editions are not retroactively edited; this map is the canonical reconciliation for any future agent that reads back into the bay-tribune archive and encounters a real name.
- **Verify:** Corrections-forward table renders cleanly; every retired real name + the Reeves substitute appears with a superseder.
- **Status:** [x] complete (S218 research-build, 2026-05-12). `INSTITUTIONS.md` §Faith Corrections Forward shipped — 34-row table (16 orgs + 16 clergy + 2 retired S195 interim substitutes), per-edition citations marked "per Mara audit log" with note that specific citations populate as audit logs and reader-side scans surface them. Paper-of-record principle stated explicitly at end of section. §Out of scope subsection added (BIZ-00028 / POP-00734 orphan / FO↔SL neighborhood drift) so engine-sheet sees the boundary of canon.2 cleanly.

#### Task 2.2: Update CANON_RULES.md cross-reference

- **Files:**
  - `docs/canon/CANON_RULES.md` §Read-Time Contamination Check — modify
- **Steps:**
  1. Add one bullet under §Read-Time Contamination Check noting: when a real faith-org or clergy name is found in a bay-tribune source briefing, consult `[[canon/INSTITUTIONS]] §Faith Corrections Forward` for the canon substitute. This is the reusable pattern any future Tier-3 retroactive scrub follows.
- **Verify:** New bullet exists; INSTITUTIONS link resolves.
- **Status:** [x] complete (S218 research-build, 2026-05-12). `CANON_RULES.md` §Read-Time Contamination Check gained a §Corrections-Forward Maps subsection — generalizes the pattern beyond faith (any future Tier-3 retroactive scrub authors a `[[INSTITUTIONS]] §<Domain> Corrections Forward` map). Lists currently-active map as Faith S218.

---

### Phase 3 — Sheet writes [engine-sheet]

#### Task 3.1: Write Faith_Organizations Organization + Leader columns

- **Files:**
  - `Faith_Organizations` sheet via `lib/sheets.js` — write
  - `docs/canon/INSTITUTIONS.md` §Faith table — read (source-of-truth for substitutions)
- **Steps:**
  1. Read the 16-row substitution table from `INSTITUTIONS.md` §Faith.
  2. For each row, write the new Organization value into column A and the new Leader value into column F.
  3. Verify by reading both columns back row-by-row against the table.
- **Verify:** Direct `lib/sheets.js` readback returns the 16 fictional names; no real-name strings remain. Spot-check with `grep "Acts Full Gospel\|Allen Temple\|Cathedral of Christ the Light\|Beth Jacob\|Kehilla\|Masjid Al-Islam\|Lake Merritt UMC\|Temple Sinai\|Shiva Vishnu\|Bishop Robert Jackson\|Bishop Calvin Reeves"` against the live readback → no matches.
- **Status:** [ ] not started

#### Task 3.2: Write Simulation_Ledger faith-leader POP Name + Role

- **Files:**
  - `Simulation_Ledger` sheet via `lib/sheets.js` — write
- **Steps:**
  1. For each `LeaderPOPID` in the substitution table, locate the Simulation_Ledger row by POPID.
  2. Write the new leader Name. Preserve BirthYear, Gender, Neighborhood, Tier — only the Name string changes (and Role if the original Role text contained a real name, e.g., "Pastor of Acts Full Gospel" → "Pastor of [new org]").
  3. For Jaston POP-00758: confirm the existing row already reads `Robert Jaston / Senior Pastor / West Oakland / BIZ-00028` and skip — already canon.
- **Verify:** Readback for each touched POPID returns the new name; rows not in the substitution table are untouched (compare against P0 export).
- **Status:** [ ] not started

#### Task 3.3: Write Business_Ledger faith-org BIZ entries

- **Files:**
  - `Business_Ledger` sheet via `lib/sheets.js` — write
- **Steps:**
  1. For each BIZ-ID identified in the P0 export faith cross-walk, write the new BizName to match the org's canon substitute.
  2. Confirm BIZ-00028 (West Oakland faith org / Jaston employer) reflects the new West Oakland canon-substitute org name.
- **Verify:** Readback of touched BIZ rows returns new BizName values; cross-reference Jaston's employer link still resolves.
- **Status:** [ ] not started

---

### Phase 4 — Canon filter in buildFaithCards.js [engine-sheet]

#### Task 4.1: Write lib/canonBlocklist.js parser

- **Files:**
  - `lib/canonBlocklist.js` — create
  - `docs/media/REAL_NAMES_BLOCKLIST.md` — read at runtime
- **Steps:**
  1. Implement `loadFaithBlocklist()` returning `{ orgs: Set<string>, leaders: Set<string> }` parsed from `REAL_NAMES_BLOCKLIST.md` §Faith.
  2. Parser strategy: read the section, extract every left-hand-side name from `Real Name → Canon Substitute` rows, classify by Organizations vs Clergy heading.
  3. Export a `checkFaithRow(faith)` function that throws `Error('Canon blocklist violation: Organization "X" matches Tier-3 real name')` or the leader equivalent.
- **Verify:** Unit-style test invocation: `node -e "const cb = require('./lib/canonBlocklist'); console.log(cb.loadFaithBlocklist().orgs.size)"` → number ≥ 16.
- **Status:** [ ] not started

#### Task 4.2: Wire filter into buildFaithCards.js startup

- **Files:**
  - `scripts/buildFaithCards.js` — modify
- **Steps:**
  1. In `main()` after loading `Faith_Organizations` rows but before the wipe/write pass, iterate every faith row and call `canonBlocklist.checkFaithRow(faith)`.
  2. If `--dry-run`, log the violation and continue (so dry-runs surface contamination without aborting).
  3. If `--apply`, throw and exit non-zero on first violation — never silently skip.
- **Verify:** `node scripts/buildFaithCards.js --dry-run` against the cleaned sheet exits 0; manually planting `"Acts Full Gospel Church"` into one row of a test fixture causes `--apply` to exit non-zero with the org name in the error message.
- **Status:** [ ] not started

#### Task 4.3: Smoke-test with a planted contaminated fixture

- **Files:**
  - `test/canonBlocklist.test.js` — create (under existing test runner per S217 Phase 5.2)
- **Steps:**
  1. Test 1: `loadFaithBlocklist()` returns non-empty sets.
  2. Test 2: `checkFaithRow({ organization: 'Acts Full Gospel Church', leader: 'Foo' })` throws.
  3. Test 3: `checkFaithRow({ organization: 'New Canon Org', leader: 'New Canon Leader' })` does not throw.
  4. Test 4: `checkFaithRow({ organization: 'New Canon Org', leader: 'Bishop Robert Jackson Sr.' })` throws on leader.
- **Verify:** `npm test` includes the new file; all 4 assertions pass.
- **Status:** [ ] not started

---

### Phase 5 — Supermemory rebuild [engine-sheet]

#### Task 5.1: Wipe + rewrite wd-faith

- **Files:**
  - `scripts/buildFaithCards.js` — invoke
- **Steps:**
  1. Run `node scripts/buildFaithCards.js --apply --wipe-old`.
  2. Confirm the wipe pass finds the legacy real-name cards and deletes them; the write pass produces 16 new cards under the substituted names.
- **Verify:** Run output shows `Written: 16` and `DELETE results: 16 ok / 0 failed` (or matching count if any duplicates were resident). `mcp__godworld__lookup_faith_org` for each new org name returns the new card; lookup for `"Acts Full Gospel"` returns zero results.
- **Status:** [ ] not started

#### Task 5.2: Scoped wipes for affected business / citizen cards

- **Files:**
  - `scripts/buildBusinessCards.js` — invoke with `--name` filter for each affected BIZ
  - `scripts/buildCitizenCards.js` — invoke with `--popid` filter for each affected LeaderPOPID
- **Steps:**
  1. For every BIZ touched in Task 3.3, re-run `buildBusinessCards.js --apply --name "<new BizName>"` so the wd-business card reflects the new org name.
  2. For every LeaderPOPID touched in Task 3.2, re-run `buildCitizenCards.js --apply --popid <POPID>` so the wd-citizens card reflects the new leader name.
  3. Jaston POP-00758: confirm card already canonical, skip unless Role text changed.
- **Verify:** MCP `lookup_business` + `lookup_citizen` against the affected entries return updated names; bay-tribune (separate container) untouched.
- **Status:** [ ] not started

---

## Open questions

(All three pre-write questions resolved by Mike in chat 2026-05-12: Jaston canon-forward / Reeves retired; research-build authors substitutes with Mike approval; corrections-forward table extends INSTITUTIONS.md rather than new doc.)

- [ ] Phase 4 question — does any other build script (`buildBusinessCards`, `buildCitizenCards`, dispatch ingesters) need the same canon filter? Default answer: only `buildFaithCards.js` for now; revisit after one full cycle of the filter running clean. If Phase 5 surfaces real-name leak via a business or citizen card, broaden in a follow-up plan.

---

## Changelog

- 2026-05-12 — Initial draft (S218 research-build). Plan structure approved by Mike in chat; engine-sheet standing by for P0 handoff. Pre-write decisions captured under Open Questions.
- 2026-05-12 — P0 export complete (S218 engine-sheet). `output/faith_canon_export_c93.md` shipped; three measure-twice findings beyond plan baseline (no per-org BIZ entries / shared BIZ-00028 / FO↔SL drift on POP-00756 + POP-00758).
- 2026-05-12 — P1+P2 complete (S218 research-build). 16-row substitution table + 34-row corrections-forward map shipped in `INSTITUTIONS.md` §Faith; 16+16 blocklist in `REAL_NAMES_BLOCKLIST.md`; pattern generalized in `CANON_RULES.md` §Corrections-Forward Maps. Mike approved slate as-presented + sided on three structural decisions (BIZ-00028 leave-alone, POP-00734 orphan out-of-scope, FO↔SL drift overwrite). Engine-sheet handoff: P3 (sheet writes) → P4 (canon filter) → P5 (Supermemory rebuild).
