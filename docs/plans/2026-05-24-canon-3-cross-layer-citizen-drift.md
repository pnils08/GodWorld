---
title: canon.3 — Cross-layer citizen + business canon drift remediation
created: 2026-05-24
updated: 2026-05-24
type: plan
tags: [canon, citizens, active]
sources:
  - "[[../engine/ROLLOUT_PLAN]] §canon.3"
  - "[[../plans/2026-05-22-c94-gap-log-triage]] §3 C7"
  - "[[../adr/0007-cross-layer-canon-authority-precedence]] — companion ADR (this plan implements it)"
  - "[[../plans/2026-05-12-canon-2-faith-scrub]] — corrections-forward map precedent"
  - "output/production_log_edition_c94_sift_gaps.md G-S15 / G-S16 / G-S18 / G-S19 / G-S20"
  - "output/production_log_edition_c94_post_publish_gaps.md G-P32 / G-P34 / G-P38"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — canon.3 row"
  - "[[../adr/0007-cross-layer-canon-authority-precedence]] — authority precedence + lookup precedence rules"
  - "[[../canon/CANON_RULES]] §Corrections-Forward Maps"
  - "[[../canon/INSTITUTIONS]] §Faith Corrections Forward — S218 implementation pattern"
  - "[[index]] — register same commit"
---

# canon.3 — Cross-layer citizen + business canon drift remediation Plan

**Goal:** Close C94 gap-log cluster C7 by shipping ADR-0007 (cross-layer authority precedence) + spec edits enforcing it at /sift Step 5 + /post-publish Step 5-bis + Step 2a Errors-gate + scaffold-time discipline, then handing off engine-sheet for one-time audit script + Sim_Ledger backfills + canonical-name corrections-forward.

**Architecture:** Three canon layers (Simulation_Ledger / bay-tribune wiki / wd-citizens cards) drift independently with no reconciliation contract. C94 surfaced bay-tribune-only citizens (Carmen Solis, Roberto Iglesias) with no Sim_Ledger row → no wd-card → MCP lookup fails → /sift treats as NEW → ingest creates duplicates. ADR-0007 establishes Sim_Ledger as authoritative for structured identity + bay-tribune as authoritative for published canon + wd-citizens as derived view; spec edits enforce bay-tribune lookup before NEW classification + post-Step-5 wd-card rebuild for newly-appended POPIDs (closes one-cycle card lag G-P32); engine-sheet runs one-time audit + per-decision data backfills.

**Terminal:** research-build (this session — T1-T5: ADR + spec edits + memory note) → engine-sheet (handoff — T6-T13: script gate + bay-tribune lookup + audit script + data backfills + verify rebuild)

**Pointers:**
- Parent ROLLOUT row: `canon.3` in [[../engine/ROLLOUT_PLAN]]
- Companion ADR: [[../adr/0007-cross-layer-canon-authority-precedence]]
- Cluster triage: [[../plans/2026-05-22-c94-gap-log-triage]] §3 C7
- Prior pattern: [[../plans/2026-05-12-canon-2-faith-scrub]] (canon.2 S218 corrections-forward map)

**Mike rulings (S230, locked before plan-write):**
- Soria Dominguez canonical name = **Eloise Soria-Dominguez** (wd-card form wins; bay-tribune E93 "Elena" gets corrections-forward map entry per canon.2 S218 pattern)
- Mark Aitken canonical POPID = **POP-00003** (legacy wd-card form wins; truesource POP-00020 → alias doc, not migration)

**Acceptance criteria:**

1. ADR-0007 published at `docs/adr/0007-cross-layer-canon-authority-precedence.md`, registered in `docs/index.md`, referenced by name in /sift Step 5 spec + /post-publish Step 5-bis spec + NEWSROOM_MEMORY §Standing Editorial Conventions scaffold-time discipline note.
2. /sift v2 Step 5 spec includes bay-tribune lookup before NEW classify; canon-layer-drift hits dumped to `output/canon_drift_c<XX>.json`; six-decision triage vocabulary extended with `canon-layer-drift` outcome OR existing `defer-to-supplemental` decision tree covers it.
3. /post-publish gains new Step 5-bis (post-Step-5 popid-range wd-card rebuild) using S223 `--popid-range` flag for newly-appended POPIDs; documented in SKILL.md substep matrix + parallelization notes.
4. /post-publish Step 2a verification gate strengthened: `buildCitizenCards.js` exits non-zero on `Errors > 0`; failure list dumped to `output/citizen_card_failures_c<XX>.json`. Skill text reflects the stricter gate.
5. NEWSROOM_MEMORY §Standing Editorial Conventions gains scaffold-time lookup discipline entry: every citizen reference in production-log scaffolds + NEWSROOM_MEMORY edits gets MCP-verified before write. Closes G-S15 + G-S16 recurrence shape.
6. Engine-sheet (T6-T13) handoff: `buildCitizenCards.js` Errors-gate exit + dump; `ingestPublishedEntities.js` bay-tribune lookup before NEW classify; one-time `scripts/auditCanonDrift.js` finds historical bay-tribune-only citizens missing from Sim_Ledger; per-decision data backfills land (Carmen Solis + Roberto Iglesias Sim_Ledger rows; Soria corrections-forward map entry + bay-tribune E93 reference correction; Aitken alias doc in NEWSROOM_MEMORY + `ingestPublishedEntities` alias map; BIZ-00061 Adams Point UMC + BIZ-00062 Dario's Bar Business_Ledger backfill); verify pass re-runs `buildCitizenCards.js --apply --popid-range` against backfilled POPIDs and confirms wd-cards build clean.

---

## Tasks

### Task 1: Write ADR-0007 + register in index [research-build]

- **Files:**
  - `docs/adr/0007-cross-layer-canon-authority-precedence.md` — create
  - `docs/index.md` — modify (register new ADR)
- **Steps:**
  1. Write ADR per ADR-0006 shape: Status / Date / Deciders / Context / Decision / Alternatives Rejected / Consequences / Reversal Triggers / How to Apply / Changelog.
  2. Context section names five drift modes from C94 cluster C7 (bay-tribune-only citizens / POPID scaffold drift / name canonicalization / POPID aliasing / Step 2a card lag).
  3. Decision section: authority precedence table (Sim_Ledger / bay-tribune / wd-citizens by field class) + lookup precedence (POPID → wd-card → bay-tribune → drift hit) + reconciliation rules.
  4. Mike's S230 rulings (Soria Eloise / Aitken POP-00003) recorded in Changelog.
  5. Add `docs/index.md` entry under `## ADRs` section: title + path + one-line summary.
- **Verify:** `ls -la docs/adr/0007-*.md && grep -n "0007" docs/index.md` → file exists + index entry present.
- **Status:** [x] DONE S230

### Task 2: /sift v2 Step 5 spec edit — bay-tribune lookup before NEW classify [research-build]

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify (Step 5 §Triage — six-decision vocabulary)
- **Steps:**
  1. Locate Step 5 §Triage section (approx line 298 per current SKILL.md).
  2. Add §Cross-layer canon check subsection BEFORE the six-decision triage. Spec: for every candidate naming a citizen by name (not yet POPID-confirmed), run `lookup_citizen(name)` against bay-tribune (`search_canon` MCP) AND `wd-citizens` MCP. Outcomes:
     - **Match in both layers consistent** → proceed to six-decision triage as normal.
     - **Match in wd-citizens, no bay-tribune appearance** → genuinely-new citizen with prior Sim_Ledger row; proceed normal.
     - **Match in bay-tribune, no wd-citizens / no Sim_Ledger** → CANON-LAYER-DRIFT. Append entry to `output/canon_drift_c<XX>.json` with shape `{popid: null, name, bayTribuneHits: [...], suggestedAction: "backfill"}`. Triage decision defaults to `defer-to-supplemental(target=wiki)` until engine-sheet backfills the Sim_Ledger row; the citizen is canon (bay-tribune ruled paper-of-record per ADR-0007) but the structured layer is missing, so don't classify as NEW.
     - **Name match across layers but different POPIDs / different name forms** → use ADR-0007 lookup precedence: Sim_Ledger row by POPID is canonical for structured fields; bay-tribune appearance is canonical for narrative role. Surface disagreement in `canon_drift_c<XX>.json` for engine-sheet reconciliation.
  3. Reference ADR-0007 by name + path in the new subsection.
  4. Update §Closes annotation at end of Step 5 to add G-S18 / G-P38 cross-link.
  5. Update SKILL.md `## What's new in v2.0` section if it surfaces v2 contract changes (Step 5 cross-layer check is a v2.0+ feature; flag as v2.0.1 minor bump in skill frontmatter).
- **Verify:** `grep -n "canon-layer-drift\|ADR-0007\|canon_drift_c" .claude/skills/sift/SKILL.md` → references present.
- **Status:** [x] DONE S230

### Task 3: /post-publish Step 5-bis spec — post-Step-5 popid-range wd-card rebuild [research-build]

- **Files:**
  - `.claude/skills/post-publish/SKILL.md` — modify (insert new Step 5-bis after Step 5; update Parallelization Notes + Per-type substep matrix)
- **Steps:**
  1. Locate Step 5 §Citizen + Business Intake to Sheets section (approx line 208).
  2. After Step 5b (refresh `base_context.json` + desk packets), insert new Step 5-bis:
     ```
     ### Step 5-bis: Build wd-cards for newly-appended POPIDs (edition only)
     
     Purpose: closes G-P32 one-cycle card lag. Step 2a's buildCitizenCards.js
     ran BEFORE Step 5 appended new POPIDs; without this substep, newly-published
     citizens have no wd-card until next cycle's Step 2a.
     
     Reads Step 5 output JSON for `citizens.appended[].popid`. Calls:
       node scripts/buildCitizenCards.js --apply --popid-range POP-XXXXX:POP-YYYYY
     using the min/max of appended POPIDs as the range.
     
     Verification gate: stdout reports `[DONE] ... Errors: 0`; if Errors > 0,
     buildCitizenCards.js exits non-zero (post-T6 engine-sheet patch).
     
     Per ADR-0007 §How to Apply: this substep + Step 2a together enforce that
     every Sim_Ledger row has a wd-card within the same /post-publish run.
     ```
  3. Update §Per-type substep matrix (line 36-ish) to include Step 5-bis for edition type.
  4. Update §Parallelization Notes — Step 5-bis depends on Step 5 completion; runs sequentially after Step 5.
  5. Reference ADR-0007 by name + path in Step 5-bis intro.
- **Verify:** `grep -n "Step 5-bis\|popid-range\|ADR-0007" .claude/skills/post-publish/SKILL.md` → references present in correct sections.
- **Status:** [x] DONE S230

### Task 4: /post-publish Step 2a verification gate strengthening [research-build]

- **Files:**
  - `.claude/skills/post-publish/SKILL.md` — modify (Step 2a verification gate paragraph)
- **Steps:**
  1. Locate Step 2a §Citizen-card Refresh (approx line 125-145).
  2. Update §Verification gate to specify: gate PASSES when (a) stdout reports `Written: N >= 1`, (b) stdout reports `Errors: 0`, AND (c) script exit code is 0. Any of these failing aborts /post-publish at Step 2a with a pointer to engine-sheet diagnosis. If Errors > 0, the script (post-T6) dumps the FAIL list to `output/citizen_card_failures_c<XX>.json`; reference that file by path.
  3. Note: pre-T6 (engine-sheet), the script does NOT exit non-zero on partial failure. Skill text should document the dependency — Step 2a gate is partially load-bearing until T6 ships.
- **Verify:** `grep -n "Errors: 0\|citizen_card_failures" .claude/skills/post-publish/SKILL.md` → strengthened gate present.
- **Status:** [x] DONE S230

### Task 5: NEWSROOM_MEMORY scaffold-time discipline note [research-build]

- **Files:**
  - `docs/mags-corliss/NEWSROOM_MEMORY.md` — modify (add entry to §Standing Editorial Conventions, approx line 8)
- **Steps:**
  1. Locate §Standing Editorial Conventions section (line 8).
  2. Add new sub-entry §Scaffold-time citizen-reference lookup discipline (S230, canon.3):
     ```
     ### Scaffold-time citizen-reference lookup discipline (S230, canon.3 / ADR-0007)
     
     Every citizen reference in production-log scaffolds, NEWSROOM_MEMORY edits,
     and sift slate JSON gets MCP-verified before write. The verification is:
     
     - `lookup_citizen(name)` (MCP) → confirm POPID + canonical spelling
     - `search_canon(name)` (MCP) → confirm prior appearance + narrative role
     
     If a scaffold cites a POPID, verify the POPID-to-name binding via Sim_Ledger
     (the canonical structured layer per ADR-0007). Drifted scaffolds carry
     forward into subsequent cycles' work — G-S15 (Beverly POPID drift carried
     3+ cycles in production-log) and G-S16 (JR Rosado misspelled "Rosada"
     across multiple cycles) both originated as scaffold-time fabrications
     that no one MCP-verified before persisting.
     
     The lookup precedence per ADR-0007: POPID → wd-citizens card → bay-tribune
     search_canon → drift hit. Any disagreement between layers means the
     scaffold is wrong; correct against the precedence rules before writing.
     
     This discipline is the upstream prevention surface for canon-fidelity drift.
     The downstream surfaces (sift Step 5 cross-layer check, post-publish Step 5
     bay-tribune lookup) catch what slips through, but scaffold-time MCP-verify
     prevents the drift from being introduced in the first place.
     ```
  3. No back-link addition needed — NEWSROOM_MEMORY is auto-loaded into media + research-build skill bag at /sift Step 2 ranged-read.
- **Verify:** `grep -n "Scaffold-time citizen-reference\|ADR-0007" docs/mags-corliss/NEWSROOM_MEMORY.md` → entry present.
- **Status:** [x] DONE S230

### Task 6: buildCitizenCards.js — Errors-gate non-zero exit + dump failure list [engine-sheet]

- **Files:**
  - `scripts/buildCitizenCards.js` — modify (main() error handling + final summary)
- **Steps:**
  1. Locate the final `errors` count print at line 708 (`' | Errors: ' + errors`).
  2. After the final summary block, add: if `errors > 0`, write failure list to `output/citizen_card_failures_c<XX>.json` (shape: `{cycle, timestamp, total_attempted, written, errors, failures: [{popid, name, error_message, http_status}]}`); print pointer to the file path; exit with code 1.
  3. Collect failure rows during the write loop (around line 683-684 where `console.error('[FAIL] ...')` fires). Push `{popid, name, error_message: e.message, http_status: e.status || null}` to a `failures` array; persist to the JSON dump file at main() end if `errors > 0`.
  4. Cycle number for filename: read from `CYCLE` env var if set, else from `output/cycle_state.json` if present, else use timestamp.
- **Verify:**
  - `node scripts/buildCitizenCards.js --apply --name "NonexistentCitizen-TestProbe-Errors-Gate" 2>&1 | tail -20` → should exit 1 with pointer to citizen_card_failures_c{cycle}.json.
  - `echo $?` → 1.
  - Inspect dumped file structure matches the documented shape.
- **Status:** [ ] not started — engine-sheet pickup

### Task 7: ingestPublishedEntities.js — bay-tribune lookup before NEW classify [engine-sheet]

- **Files:**
  - `scripts/ingestPublishedEntities.js` — modify (NEW-candidate classification path)
- **Steps:**
  1. Locate the NEW-candidate classification logic (where bay-tribune-unseen names get appended as new POP rows to Sim_Ledger).
  2. Before classifying as NEW, query bay-tribune via existing Supermemory client (or factor a `bayTribuneHasCitizen(name)` helper if not already present) — checks `wd-bay-tribune` container for any document mentioning the citizen by name.
  3. If bay-tribune has the citizen but Sim_Ledger doesn't: classify as `canon-layer-drift`, NOT `new`. Append entry to `output/canon_drift_c<XX>.json` with shape `{popid: null, name, bayTribuneHits: [docIds...], suggestedAction: "backfill", surfacedBy: "post-publish-step-5", cycle}`. Do not append to Sim_Ledger this run; surface in production log for engine-sheet backfill.
  4. Genuine NEW (no bay-tribune hits + no Sim_Ledger row) proceeds with current append behavior.
  5. canon_drift JSON schema: use array-of-objects to allow multiple drift hits per cycle; append-or-create file.
- **Verify:**
  - ~~Dry-run against C94 inputs: Carmen Solis + Roberto Iglesias surface as canon-layer-drift hits~~ — superseded by T9 S232 backfill (Carmen → POP-00953, Roberto → POP-00952 both landed; C94 re-run now produces 0 candidates because all 24 NAMES INDEX entries match Sim_Ledger). Empirical verification used a synthetic C95 fixture instead.
  - Synthetic-fixture empirical verification (S233): three NAMES INDEX rows — Raymond Polk + Paulette Okafor (S229-frozen Bridgeport canon, in editions/E84-E90 not Sim_Ledger) + Synthetia Brandnew (no bay-tribune prior). Partition produced 1 canonNew + 2 canon-drift; `output/canon_drift_c95.json` contained the two with shape per §305 schema lock.
- **Status:** [x] done-pending-archive — S233 engine-sheet

### Task 8: scripts/auditCanonDrift.js — one-time find bay-tribune-only citizens missing from Sim_Ledger [engine-sheet]

- **Files:**
  - `scripts/auditCanonDrift.js` — create
- **Steps:**
  1. New Node script. Inputs: Sim_Ledger (current state) + bay-tribune Supermemory (`wd-bay-tribune` container, all-docs query).
  2. Extract all citizen names mentioned in bay-tribune (regex over published-edition wiki docs for proper-noun + role pattern, OR explicit NAMES INDEX scrape across past edition .txt files in `editions/`).
  3. For each bay-tribune-mentioned name, lookup in Sim_Ledger by name (fuzzy match per `normalizeNameKey()` helper from engine.22 S225).
  4. Emit: `output/canon_drift_audit_<timestamp>.json` listing bay-tribune-mentioned names with no Sim_Ledger match. Shape: `[{name, bay_tribune_doc_ids, first_edition_seen, narrative_role_snippet, suggested_action: "backfill"|"investigate"}]`.
  5. Suggested action heuristic: if name appears in 2+ editions with consistent role/neighborhood → `backfill` (high-confidence). If name appears once with thin context → `investigate` (operator decides per case).
  6. Dry-run mode default; `--emit` flag writes JSON.
- **Verify:**
  - `node scripts/auditCanonDrift.js` (dry-run) → prints count + first 10 entries to stdout.
  - `node scripts/auditCanonDrift.js --emit` → JSON written; Carmen Solis + Roberto Iglesias present in output with E93 cited.
- **Status:** [ ] not started — engine-sheet pickup

### Task 9: Sim_Ledger backfill — Carmen Solis + Roberto Iglesias [engine-sheet, data]

- **Files:**
  - Simulation_Ledger sheet (via `lib/sheets` write helper)
  - `docs/mags-corliss/NEWSROOM_MEMORY.md` — modify (note backfill completion under Active Story Tracking)
- **Steps:**
  1. From T8 audit results, confirm Carmen Solis + Roberto Iglesias + any additional drift hits Mike approves for backfill.
  2. Assign next free POPIDs (read Sim_Ledger max POPID + increment; pre-S230 max is POP-00958 per S222 ingest; verify before write).
  3. Backfill rows. Sourcing for each field per ADR-0007:
     - **Carmen Solis** — bay-tribune E93 narrative: "Mam-language community advocate"; Neighborhood derived from E93 anchor (likely West Oakland or Fruitvale — verify in E93 published text); BirthYear: estimate from narrative cues or default 1975 (50yo cohort) pending finer signal; Employer: unknown / null (set field empty, not fabricated).
     - **Roberto Iglesias** — bay-tribune E93 narrative: "Fruitvale taquería owner, eleven years, member of the Fruitvale Transit Hub Oversight Committee"; Neighborhood: Fruitvale (canon); BirthYear: estimate (eleven years business tenure → 45-55yo cohort, default 1980); Employer: own taquería (create Business_Ledger row if needed, or set employer=null pending biz canonization).
  4. Both rows: Tier 3 (citizen-cohort), Gender field empty by default per ledger convention (gender lives in col AU per pipeline.1 if Mike has resolved it; check at write time).
  5. Write via batch-append-row helper to avoid mid-write ledger corruption.
  6. NEWSROOM_MEMORY note: log backfill under §Active Story Tracking — "Carmen Solis (POP-XXXXX, Mam-language community advocate, E93 backfill, canon.3 S230)" + "Roberto Iglesias (POP-XXXXX, Fruitvale taquería owner, Transit Hub Oversight Committee, E93 backfill, canon.3 S230)".
- **Verify:**
  - `lookup_citizen("Carmen Solis")` returns single canonical match with assigned POPID.
  - `lookup_citizen("Roberto Iglesias")` returns single canonical match.
- **Status:** [ ] not started — engine-sheet pickup (depends on T8 audit results)

### Task 10: Soria Dominguez Elena → Eloise correction-forward [engine-sheet, data]

- **Files:**
  - `docs/canon/INSTITUTIONS.md` — modify (new §Citizens Corrections Forward subsection, mirroring §Faith Corrections Forward pattern)
  - `docs/canon/CANON_RULES.md` — modify (§Corrections-Forward Maps active-maps list — add "Citizens" entry)
  - `docs/mags-corliss/NEWSROOM_MEMORY.md` — modify (Active Story Tracking note + Soria reference normalized to Eloise going forward)
- **Steps:**
  1. Add to `docs/canon/INSTITUTIONS.md` a new section `## Citizens` (if not present) with subsection `### Corrections Forward` mirroring §Faith Corrections Forward shape.
  2. Add row: `| Elena Soria Dominguez | E93 only | Eloise Soria-Dominguez | S230 — bay-tribune E93 published "Elena," wd-card / Sim_Ledger POP-00791 canonical "Eloise"; Mike ruling S230 favors wd-card form. Reporters encountering "Elena" in E93 source briefings substitute to "Eloise Soria-Dominguez" with CONTINUITY NOTE. |`
  3. Update `docs/canon/CANON_RULES.md` §Corrections-Forward Maps active-maps list:
     - Existing line: `- INSTITUTIONS §Faith Corrections Forward (S218) — 16 orgs + 18 clergy names + 2 retired interim substitutes.`
     - Add line: `- [[INSTITUTIONS]] §Citizens Corrections Forward (S230) — 1 entry (Soria Dominguez Elena → Eloise per canon.3 ADR-0007).`
  4. NEWSROOM_MEMORY: add note under §Standing Editorial Conventions → §Scaffold-time discipline pointing at the corrections-forward entry; future Soria references use "Eloise Soria-Dominguez."
  5. **Do NOT edit bay-tribune E93 wiki entry** — paper-of-record principle. The corrections-forward map is the substitution mechanism; bay-tribune stays unchanged.
- **Verify:**
  - `grep -n "Soria-Dominguez" docs/canon/INSTITUTIONS.md docs/canon/CANON_RULES.md` → INSTITUTIONS L352 + CANON_RULES L180 entries present (S233).
  - Sim_Ledger POP-00791 First=`Eloise` / Last=`Soria-Dominguez` verified live S233 — no write needed.
  - **NEWSROOM_MEMORY half CLOSED S234 research-build** — `docs/mags-corliss/NEWSROOM_MEMORY.md` §Standing Editorial Conventions gained new subsection `### Citizens Corrections Forward — Elena Soria Dominguez → Eloise Soria-Dominguez (S230/S233, canon.3 / ADR-0007)` cross-linking [[../../docs/canon/INSTITUTIONS|INSTITUTIONS.md]] §Citizens Corrections Forward + [[../../docs/canon/CANON_RULES|CANON_RULES.md]] §Corrections-Forward Maps + ADR-0007 §Reconciliation rule 1. Reporter / scaffolder guidance carries the normalization rule (Eloise wins forward; bay-tribune E93 stays unchanged per paper-of-record). Sibling-coupled to T11 NEWSROOM_MEMORY half, shipped same commit.
- **Status:** [x] done-pending-archive — S233 (engine-sheet half) + S234 (research-build NEWSROOM_MEMORY half).

### Task 11: Aitken POPID alias doc [engine-sheet, data]

- **Files:**
  - `docs/mags-corliss/NEWSROOM_MEMORY.md` — modify (Standing Editorial Conventions — add POPID alias section)
  - `scripts/ingestPublishedEntities.js` — modify (add POPID alias map at top of file)
- **Steps:**
  1. NEWSROOM_MEMORY §Standing Editorial Conventions: add §POPID Aliases subsection:
     ```
     ### POPID Aliases (S230, canon.3 / ADR-0007)
     
     Some citizens carry multiple POPIDs across canon layers due to legacy
     migrations. Per ADR-0007 rule 4 (POPIDs permanent once assigned),
     aliases are documented here, not migrated. Reporters using either form
     resolve to the canonical POPID via this table.
     
     | Citizen | Canonical POPID | Aliases | Source of Drift |
     |---|---|---|---|
     | Mark Aitken | POP-00003 | POP-00020 (player-truesource) | Legacy ID assignment pre-S94 ledger recovery; truesource layer ingested with new ID. Mike ruling S230: legacy POP-00003 is canonical. |
     ```
  2. ~~`scripts/ingestPublishedEntities.js`: add a top-level `POPID_ALIASES` map: `{ 'POP-00020': 'POP-00003' }`.~~ **PLAN-PREMISE CORRECTION (S233 engine-sheet measure-twice catch):** naive map cannot ship. POP-00020 is NOT a phantom slot — it is actively occupied in Sim_Ledger by Elena Vásquez (live verify S233). Naive alias would silently shim every POP-00020 reference to Aitken, contaminating Elena Vásquez's row on every encounter. **Shipped semantic is name-scoped:** `POPID_ALIASES = { 'POP-00020': { canonicalPopId: 'POP-00003', surfaceNamePattern: /^mark\s+aitken$/i } }` + `resolvePopIdAlias(popId, fullName)` helper. Alias fires only when surface name matches the alias's canonical citizen; Elena Vásquez references at POP-00020 pass through untouched. Wired into `resolveCitizens` at line 403 before `byPopId.get()`; matched array gains `sourcePopId` field when alias fires so downstream consumers can surface the canonical row while preserving the source reference.
  3. Module exports add `POPID_ALIASES` + `resolvePopIdAlias` for downstream scripts to reuse (player-truesource resolver, citizen-card builder).
- **Verify:**
  - `grep -n "POP-00020\|POPID_ALIASES" scripts/ingestPublishedEntities.js` → entries present S233.
  - Empirical fixture run with 4 NAMES INDEX rows (POP-00020|Mark Aitken + POP-00020|Elena Vásquez + POP-00003|Mark Aitken + POP-00777|Made-Up Person) produced: row 1 aliased to POP-00003 (sourcePopId=POP-00020), row 2 kept POP-00020 (NO contamination of Elena Vásquez), row 3 passthrough, row 4 matched POP-00777 with drift warning vs ledger Rico Valdez.
  - **NEWSROOM_MEMORY half CLOSED S234 research-build** — `docs/mags-corliss/NEWSROOM_MEMORY.md` §Standing Editorial Conventions gained new subsection `### POPID Aliases (S230/S233, canon.3 / ADR-0007)` carrying the canonical/aliases table (Mark Aitken | POP-00003 | POP-00020), full documentation of the name-scoped resolution semantic (Elena Vásquez at POP-00020 NOT contaminated), and reporter/scaffolder resolution guidance. Cross-links `scripts/ingestPublishedEntities.js` `POPID_ALIASES` map + ADR-0007 §Rule 4. Sibling-coupled to T10 NEWSROOM_MEMORY half, shipped same commit.
- **Status:** [x] done-pending-archive — S233 (engine-sheet half) + S234 (research-build NEWSROOM_MEMORY half).

### Task 12: Business_Ledger backfill — BIZ-00061 Adams Point UMC + BIZ-00062 Dario's Bar [engine-sheet, data]

- **Files:**
  - Business_Ledger sheet (via `lib/sheets` write helper)
- **Steps:**
  1. Read Business_Ledger max BIZ-ID; confirm pre-S230 max is BIZ-00060 or earlier (was BIZ-00060 per recent prior cycle; verify at write time).
  2. Append two rows:
     - `BIZ-00061 | Adams Point United Methodist Church | Faith / Religious | Adams Point | (other Business_Ledger fields per schema)`
     - `BIZ-00062 | Dario's Bar | Hospitality / Bar | (Neighborhood per E94 narrative — likely Lake Merritt area or wherever Maria Keen's N1 cited; verify in E94 published) | (other fields)`
  3. Sourcing: both businesses appear in E94 BUSINESSES NAMED section (4-entry section that pre-S229 parser silently dropped to 0 — engine.24 parser fixed S229, but C94 ran pre-fix so the data didn't ingest; this task is the manual backfill).
  4. NEWSROOM_MEMORY note: log backfill under §Active Story Tracking — "Adams Point UMC (BIZ-00061, E94 N1 anchor, canon.3 S230 backfill — engine.24 parser closed prospectively)" + "Dario's Bar (BIZ-00062, E94 backfill, canon.3 S230)".
- **Verify:**
  - `lookup_business("Adams Point United Methodist Church")` returns BIZ-00061.
  - `lookup_business("Dario's Bar")` returns BIZ-00062.
- **Status:** [x] engine-sheet half CLOSED S236. **Measure-twice catch pre-write:** plan §T12 step 1 said "Read max BIZ-ID; confirm pre-S230 max is BIZ-00060." Live read found BIZ-00061 + BIZ-00062 ALREADY in Business_Ledger with cols A-D populated — likely landed in S229 engine.24 / S232 backfill cluster, partial. Plan shape shifted from "append 2 rows" to "fill 5 cols × 2 rows = 10 cells (E-I)." Peer-row sector check: Nightlife/Restaurant cluster (BIZ-00036..BIZ-00051, 16 rows) is also sparse on E-I — current state is canonical-for-sector. Mike chose Path A (fill all of E-I with anchored estimates). Filled cells: BIZ-00061 Employee_Count=4, Avg_Salary=$48,000, Annual_Revenue=$350,000, Growth_Rate=1%, Key_Personnel=Rev. Daniel Han (POP-00954 canon-grounded). BIZ-00062 Employee_Count=10, Avg_Salary=$35,000, Annual_Revenue=$950,000, Growth_Rate=2%, Key_Personnel=blank (Dario implied as namesake but not explicit E94 canon). Sheet write via `lib/sheets.updateRowFields` — 10 cells via batchUpdate; verified by re-read. wd-business cards rebuilt via `node scripts/buildBusinessCards.js --apply --biz BIZ-000{61,62}` — 1 written + 0 errors each. MCP cross-check `lookup_business "Adams Point United Methodist Church"` returns BIZ-00061 card with full economic data + Rev. Daniel Han Key_Personnel + E94 appearance text; `lookup_business "Dario's Bar"` returns BIZ-00062 card with full economic data + E94 L3-letter-derived appearance text. Both updatedAt 2026-05-26T03:13Z. Pattern: `feedback_measure-twice-cascading-effects` (live state-read caught plan-premise drift + peer-row sparsity surfaced 3-path editorial fork before write); `feedback_senior-engineer-default` (Path A approved → exact-cell preview surfaced → "Proceed" → ship-then-explain). **NEWSROOM_MEMORY half (step 4 — Active Story Tracking entries) OPEN for research-build pickup** matching T10/T11 cross-terminal closure pattern.

### Task 13: Verify wd-card rebuild on backfilled POPIDs [engine-sheet]

- **Files:**
  - `scripts/buildCitizenCards.js` — invoke
- **Steps:**
  1. After T9 + T11 land, identify newly-assigned POPID range for Carmen Solis + Roberto Iglesias (likely POP-00959 + POP-00960, verify at run time).
  2. Run `node scripts/buildCitizenCards.js --apply --popid-range POP-00959:POP-00960` (or actual range).
  3. Confirm: stdout reports `[DONE] ... Written: 2 | Errors: 0` AND exit code 0 (T6 gate strengthened).
  4. Cross-check via MCP: `lookup_citizen("Carmen Solis")` returns wd-card with appearance summary; `lookup_citizen("Roberto Iglesias")` returns wd-card with appearance summary.
  5. Re-run /sift Step 5 cross-layer check (T2) against an artificial test slate naming Carmen Solis + Roberto Iglesias — should classify as existing-with-prior-appearance, NOT NEW, NOT canon-layer-drift.
- **Verify:**
  - Both citizens resolvable via `lookup_citizen` MCP with non-empty appearance history.
  - `output/canon_drift_c<XX>.json` does not list Carmen or Roberto on subsequent runs.
- **Status:** [x] CLOSED S236 (engine-sheet) — full S232 backfill cohort verified (scope grew vs plan's POP-00959+POP-00960 guess; actual cohort POP-00952..POP-00973 = 22 rows per S232 expansion). Dry-run via `node scripts/buildCitizenCards.js --popid-range POP-00952:POP-00973`: 22 citizens / 18 with appearances / 0 errors. Apply via `--apply --popid-range POP-00952:POP-00973`: Written 18 (PATCH: 5 / POST: 13) / Errors: 0. MCP cross-check `lookup_citizen "Elena Reyes"` returns POP-00972 wd-card (Downtown Waterfront Resident, 1989, 4 appearances) updatedAt 2026-05-25T18:54Z. `lookup_citizen "Delia Fuentes"` returns POP-00973 wd-card (Fruitvale Letter Writer, 1997, 4 appearances incl. E92 Carmen byline + E93 returning-citizen note) updatedAt 2026-05-25T18:54Z. 4 unwritten cards expected (squatter-aligned POPIDs without bay-tribune appearance content yet — they'll fill on subsequent cycles).

---

## Open questions

- [x] `output/canon_drift_c<XX>.json` schema — **LOCKED at T7 first commit (S233 engine-sheet)**. Final shape aligns with `auditCanonDrift` entry keys for cross-consumer consistency (audit emits `canon_drift_audit_<ts>.json` with the same field names): `[{popid: null, name, bay_tribune_doc_ids: string[], first_edition_seen: string, narrative_role_snippet: string, count: number, suggested_action: 'backfill'|'investigate', surfacedBy: 'post-publish-step-5', cycle: number, candidateOrigin: {first, last, middle, description}}]`. `candidateOrigin` is T7-side addition — preserves the resolveCitizens-side parse so engine-sheet backfill scripts can match the exact source candidate without re-parsing the .txt. T2 (research-build) spec text may now reference these field names directly.
- [ ] T9 Carmen + Roberto BirthYear estimates — defaulting to 1975/1980 based on narrative cues. Mike may want to inspect E93 text and ratify before write, OR engine-sheet can write defaults and revisit if a future cycle's coverage surfaces a better signal.
- [ ] T12 Dario's Bar neighborhood — E94 BUSINESSES NAMED section lists it without neighborhood. Need to inspect E94 prose during backfill to assign canonical neighborhood. If unclear, default to operator-decides-from-E94-prose at write time.

---

## Changelog

- 2026-05-24 — Initial draft (S230, research-build). Approved structure-first by Mike before write. 13 tasks across two terminals. Research-build T1-T5 ship same session (this plan + ADR-0007 + spec edits + memory note); engine-sheet T6-T13 pickup when ready (T7 logically blocks future /post-publish runs from regressing the gap; T6 blocks T13 verification gate). Mike rulings locked pre-write: Soria → Eloise Soria-Dominguez; Aitken → POP-00003 canonical with POP-00020 alias.
- 2026-05-24 — T10 + T11 NEWSROOM_MEMORY halves closed (S234, research-build). Two new subsections shipped to `docs/mags-corliss/NEWSROOM_MEMORY.md` §Standing Editorial Conventions: `### POPID Aliases (S230/S233, canon.3 / ADR-0007)` carrying the Aitken canonical/alias table + name-scoped resolution semantic + reporter guidance; `### Citizens Corrections Forward — Elena Soria Dominguez → Eloise Soria-Dominguez (S230/S233, canon.3 / ADR-0007)` carrying the canonical-form decision + corrections-forward cross-links + reporter normalization rule. Both subsections clustered topically with the existing S230 Scaffold-time citizen-reference lookup discipline entry so the canon.3 / ADR-0007 cluster reads as one editorial-convention block. Sibling-coupled — one commit, one file touched (NEWSROOM_MEMORY.md), scope tight per advisor pass. Closes the cross-terminal halves engine-sheet shipped S233 (T10 + T11 engine code/canon-doc layer). Row state stays `in-progress` per T12 (Business_Ledger BIZ-00061+BIZ-00062 backfill) + T13 (verify wd-card rebuild on backfilled POPIDs) still pending engine-sheet.
- 2026-05-25 — T13 closed (S236, engine-sheet). Plan scope (POP-00959+POP-00960 = Carmen+Roberto only) re-derived against live S232 state: actual backfill cohort is POP-00952..POP-00973 (22 rows — T9 grew during execution to absorb POP-00954..POP-00957 squatter alignments + POP-00958..POP-00973 Generic_Citizens/NEW CANON FIGURES migration). Verified end-to-end via `node scripts/buildCitizenCards.js --apply --popid-range POP-00952:POP-00973`: 22 citizens matched / 18 with appearances written (PATCH: 5 update, POST: 13 new) / 0 errors / exit 0. T6 Errors-gate (S232 `d5fae07`) held green. MCP `lookup_citizen` cross-check on Elena Reyes (POP-00972) + Delia Fuentes (POP-00973) returns live wd-cards with full appearance history including E92 + E93 bay-tribune hits and canonical byline attribution; updatedAt 2026-05-25T18:54Z. 4 cohort POPIDs without appearances expected to fill on subsequent cycles. Pattern: `feedback_senior-engineer-default` (Mike's session-open stewardship grant + plan-approved verification step = dry-run-then-apply executed inside engine-sheet scope without per-step gate). Surface during close: wd-cards are a derived projection that re-derive manually after every upstream canon-class write — filed as `engine.27` (auto-invalidation hook on Sim_Ledger row writes, needs-info, engine-sheet) per Mike "I like automation, so something to consider." Cross-link: `docs/engine/ROLLOUT_PLAN.md` §engine.* engine.27. **Status:** canon.3 row → T12 only remaining; T12 needs Mike-go on Business_Ledger sheet write.
- 2026-05-25 — T12 engine-sheet half closed (S236, engine-sheet). Measure-twice live-read surfaced 3 plan-premise corrections vs filed scope (rows already exist sparse / peer-sector convention is also sparse / Path A vs Path B vs Path C editorial-judgment fork). Mike-confirmed Path A; exact-cell preview surfaced inline; "Proceed" → ship-then-explain. Sheet write via `updateRowFields` filled 10 cells (E-I × 2 rows); wd-business cards rebuilt via `buildBusinessCards.js --apply --biz BIZ-000{61,62}` (1 written + 0 errors each); MCP `lookup_business` cross-check confirms both BIZ-00061 + BIZ-00062 live with full economic data + sector-appropriate appearance text, updatedAt 2026-05-26T03:13Z. Same wd-projection-lag pattern as T13 — sheet write didn't propagate to wd-business container until manual rebuild, reinforcing the engine.27 substrate-debt finding (auto-invalidation hook should cover BOTH wd-citizens AND wd-businesses). **NEWSROOM_MEMORY half (T12 step 4) OPEN** for research-build pickup matching T10/T11 cross-terminal pattern: Active Story Tracking entries for Adams Point UMC (BIZ-00061, E94 N1 anchor) + Dario's Bar (BIZ-00062, E94 L3 anchor). canon.3 row stays in-progress until NEWSROOM_MEMORY half lands.
