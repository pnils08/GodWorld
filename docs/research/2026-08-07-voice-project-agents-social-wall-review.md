---
title: Voice + project agents social-wall review — research
created: 2026-08-07
updated: 2026-08-07
type: reference
tags: [research, civic, citizens, media, active]
sources:
  - Mike-direct 2026-08-07 — review civic voice/project agents; feedback for Claude; wiki/social once-over only (no agent edits this pass)
  - scripts/reporterWall.js — journalist social wiki wall hard-inject
  - scripts/cron-desk-run.js — wall load at angle + write
  - scripts/citizen-wake.js — citizen page ensure/append + fenced pageMemory inject
  - lib/citizenPage.js — cp-POP-* container citizen-pages
  - scripts/civic-office-map.json — office/project holder POPIDs
  - scripts/cron-civic-run.js — civic voice JSON production (no page write)
  - .claude/agents/citizen-voice-*/IDENTITY.md — POP ID lines
  - .claude/agents/civic-office-*/ · civic-project-*/ · city-clerk/
  - docs/media journalist persona bags (pipeline.47–.50) — contrast only
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
  - "[[../plans/2026-07-28-civic-cron-city-hall]] — civic voice runtime"
  - "[[../plans/2026-07-06-citizen-loop-deepening]] — citizen page / wake architecture"
---

# Voice + project agents social-wall review — research

**Source:** Live repo review 2026-08-07 (grok). Inventory of `.claude/agents/civic-office-*` (8), `civic-project-*` (4), `city-clerk`, `citizen-voice-*` (4), plus wiring in `civic-office-map.json`, `cron-civic-run.js`, `citizen-wake.js`, `reporterWall.js`. **No agent package edits in this pass** — feedback for Claude / civic terminal.

**What this addresses:** After journalist solo seats got hard-injected social wiki walls (`cp-POP-*`), check whether **civic voice agents**, **project directors**, and **authored citizen voices** already have equivalent continuity infrastructure — and what is wrong, missing, or intentionally different.

**What it does:** Separates three agent classes, scores wiki/social setup against the journalist standard, lists POPID / format hazards, and recommends a narrow adopt path without collapsing office-source agents into newsroom personas.

---

## Extraction — what's usable

### 1. Three different products (do not unify by force)

| Class | Count | Job | Output product |
|-------|------:|-----|----------------|
| **Journalist personas** | 21 mapped | Write Tribune prose | Staged articles + wall posts |
| **Civic office / project / clerk** | 8 + 4 + 1 | Official source material | `output/civic-voice/*` JSON/MD for cascade |
| **Citizen-voice (authored)** | 4 | Interview / Discord / life loop | Reflections + quotes; interior life |

Journalist wall standard (already built):

1. Ledger POPID  
2. Supermemory `citizen-pages` / tag `cp-POP-XXXXX`  
3. **Hard inject** past posts before angle + write (`reporterWall.js`)  
4. **Write-back** on Rhea PASS (`filed:`) + optional `memory_note`  
5. Fence: wall ≠ engine fact; don’t quote yourself as a source  

### 2. Citizen-voice agents — wiki/social mostly correct

**Agents:** `vinnie-keane` (POP-00001), `benji-dillon` (POP-00018), `deacon-seymour` (POP-00528), `elias-varek` (POP-00789).

| Layer | Status | Notes |
|-------|--------|-------|
| POPID in IDENTITY | **OK** | Line shape `**POP ID:** POP-#####` matches `citizen-wake.js` `voicedPopIds()` regex |
| Page container | **OK** | Same `lib/citizenPage` as everyone else |
| Wake write-back | **OK** | `ensurePagePointer_` + `appendReflection_` each wake |
| Inject on wake | **OK but soft** | `loadOwnPageReadback` → “what’s been on your mind” — fenced, resonance-scored — **not** hard `### YOUR SOCIAL WIKI WALL` block |
| Voiced rotation slot | **OK** | 1-in-5 wakes prefer least-recent voiced POPID |
| Interview / PRESS path | **OK** | `citizenVoice.js --record` / quote supply uses same page + PRESS daypart |

**Feedback for Claude (citizen-voice):**

- Do **not** rebrand citizen pages as “journalist walls.” Same store, different social contract: life reflection vs filing continuity.  
- Optional upgrade (watch): share `formatWallBlock` wording for voiced wakes so “hook past posts” is as loud as newsroom — still soft-fail if empty.  
- **Hazard:** Benji IDENTITY carries legacy POP-00006 in prose; wake parser uses first `POP ID:` (00018). Keep one canonical POPID; document legacy only outside the POP ID line.  
- **Hazard:** Vinnie IDENTITY also names Amara POP-00002 — fine for relationships, but wake must only key the speaker’s POP ID line (it does).  
- Authored set is small (4). If Mike wants more pillars/citizens with full voice packages, each needs the **same** `POP ID:` line format or they fall out of the voiced slot forever.

### 3. Civic office + project agents — strong as sources, weak as social wiki

**Structure:** All office/project packages are IDENTITY/LENS/RULES/SKILL — good gen-eval shape for City Hall cascade. They correctly declare “you are NOT a journalist; you are the source journalists quote.”

**Runtime:** `cron-civic-run.js` loads agent dir + model from `civic-office-map.json`, emits structured voice artifacts. Mon–Thu datawakes produce holder statements. **No call to `citizenPage` / `reporterWall`.** Continuity lives in production logs + next cascade packet, not `cp-POP-*`.

**Map has POPIDs; many IDENTITY files do not surface them for life-loop tooling:**

| Agent dir | Map holder / POPID | IDENTITY POP surface |
|-----------|--------------------|----------------------|
| civic-office-mayor | Avery Santana / POP-00034 | Yes |
| civic-office-district-attorney | Clarissa Dane / POP-00143 | Yes |
| civic-office-police-chief | Rafael Montez / **POP-00136** (map) | Identity may drift — verify vs map before any page work |
| civic-office-okoro | Brenda Okoro / **POP-00037** (map) | Identity says **“not in Simulation_Ledger — no POP-ID”** — **false vs map** |
| civic-office-baylight-authority | Keisha Ramos / POP-00041 | No clean POP ID line |
| civic-office-opp/crc/ind | Multiple council POPIDs per faction agent | Faction agents are **multi-holder** — one dir ≠ one wall |
| civic-project-stabilization-fund | Marcus Webb / POP-00790 | Weak/absent POP line |
| civic-project-oari | Vanessa Tran-Muñoz / POP-01021 | Weak/absent |
| civic-project-health-center | Bobby Chen-Ramirez / POP-00792 | Weak/absent |
| civic-project-transit-hub | Elena Soria Dominguez / POP-00791 | Weak/absent |
| city-clerk | — | No person POPID (role is architectural reviewer) |

**Feedback for Claude (civic office/project):**

1. **Do not paste journalist bags or multi-voice desk splits onto these agents.** They are cascade *sources*, not Tribune bylines. Solo-seat newsroom work is the wrong analogy.  
2. **Wiki/social gap is real for holders who are also ledger citizens:** Mayor, DA, Chief, Okoro (if POP-00037 live), project directors, individual council members. Today they can get a page only if `citizen-wake` happens to draw their POPID as a normal citizen — not because the civic voice run recorded “I stated X as Mayor.”  
3. **Recommended product (if adopted later):**  
   - On Mon–Thu civic datawake / Sunday voice emit: optional `appendReflection_` to **holder POPID** with daypart `CIVIC` or `OFFICE`, content like `stated: <one-line position>` or the JSON statement text.  
   - Hard or soft inject prior `CIVIC` posts when that office runs again (continuity of *public position*, not private life).  
   - Fence harder than journalists: office wall posts are still not tracker canon; Initiative_Tracker + Clerk remain authority.  
4. **Faction multi-holder agents cannot own one wall.** OPP/CRC/IND dirs speak for multiple POPIDs. Wall write-back must key **`civic-office-map` holder popid for the seat being voiced**, not the agent dir slug.  
5. **Okoro IDENTITY vs map is a truth-doc bug** — map POP-00037 vs “no POP-ID.” Reconcile before any page wiring (identity prose or map).  
6. **Police chief POP:** confirm IDENTITY vs map (00136 vs any older 00142 residue) in the same pass.  
7. **Clerk** correctly has no citizen wall — evaluation role, not a holder life.  
8. **Baylight** is office-shaped but project-adjacent; map has Keisha Ramos POP-00041 — treat as holder wall candidate if office walls ship.  
9. **Fri/Sat “office-holders are citizens”** (cron-civic comments) assumes life wakes — only true if those POPIDs enter the citizen-wake pool. Verify shaped-pool membership for mayor/council/project directors; otherwise the comment is aspirational.

### 4. Journalist contrast (context only — already shipping)

Newsroom solo personas (21 in `persona-map.json`) now have:

- Hard wall inject  
- PASS → `filed:` self-record  
- Concept bags per seat  

That stack is **appropriate for bylines**. Applying it unchanged to civic offices would contaminate “source material” with “I filed a column” semantics. If Claude extends walls to offices, rename dayparts and block copy (`OFFICIAL POSITION WALL` vs `SOCIAL WIKI WALL`).

### 5. Quality once-over (agent packages, no edit this pass)

**Citizen-voice (strong):** Four-file structure, clear invent/not-invent, wake + interview modes, page accretion documented in RULES/SKILL. Main risk is **scale** (only 4) and **legacy POP footnotes**.

**Civic office (strong source design, weak person continuity):** Lenses are excellent (physical vantage, duty days, faction tone). Faction multi-seat design is load-bearing — do not “solo” OPP into one wall. Cascade order (Mayor first) is correct and must stay outside any wall feature.

**Civic project (strong operational voice, thin identity↔ledger link):** Directors have POPIDs in the map but packages read as role-organs. For social/wiki, the human holder POPID is the join key; agent dir is the prompt organ.

**Clerk:** Keep as gen-eval closer, not a social actor.

---

## Not applicable / hazard

- **Do not** put civic voice statements into bay-tribune canon via wall alone.  
- **Do not** hard-inject office walls into journalist crons (cross-contamination).  
- **Do not** give faction agents a single `cp-POP` for the whole bloc.  
- **Do not** invent Okoro-as-non-ledger if map says POP-00037 — fix the doc conflict first.  
- Cost: every civic statement → page append is Supermemory spend; gate to datawake PASS / clerk-verified only if volume hurts.  
- `reporterWall.ensureReporterWall` name is journalist-flavored; a shared `ensureCitizenPage` alias would avoid civic code importing “reporter” semantics (cosmetic but real for future Claude work).

---

## Verdict: `adopt` (trigger fired 2026-08-07 — was `watch`)

**APPROACH APPROVED — proceed (Mags, research-build S357, 2026-08-07).** Mike-direct: YES on office-holder position walls — "if they are saying it then it should be saved." Grok is clear to proceed on the recommended product exactly as scoped in §3: holder-POPID `appendReflection_` on civic emits (CIVIC/OFFICE daypart), prior-position inject on next office run, harder canon fencing than journalist walls, faction agents keyed per-seat from `civic-office-map` — never one wall per bloc. Rollout row: civic.16. Condition 2 (POPID reconciliation) is DONE — see Applications below. Condition 3 (one-page design: daypart name + inject strength + faction keying) is the first deliverable before code.

### Original verdict for the record: `watch`

**Why not adopt immediately:** Journalist wall is proven; citizen-voice page loop is proven; civic holders already have a different continuity path (cascade packets + production log). Extending walls to offices is a **product decision** (do we want Avery’s page to accrete “I said X on the Stabilization Fund”?) not a missing file in the agent package.

**Adopt-trigger (explicit):**

1. Mike wants office-holders’ **public positions** to accrete on `cp-POP-*` for life-loop / interview continuity, **and**  
2. Okoro + police-chief POPID identity/map drift is reconciled, **and**  
3. A one-page design chooses daypart + inject strength (hard vs soft) + faction multi-holder keying off `civic-office-map`.

When trigger fires → plan under civic/research-build: “office-holder position wall” (not “solo civic desk”). Rollout row then; **not** before.

**Citizen-voice only micro-fixes** (can adopt without full office wall plan):

- Normalize legacy POP footnotes so `POP ID:` lines stay single-source.  
- Optional shared wall formatter for voiced wakes.  
- Expand authored voices only with the POP ID line contract.

**Ignited plans:** civic.16 (ready) — design then build; pointer remains this research until a plan MD is cut for condition 3.

### Duty calendar (Mike-clarified 2026-08-07 — load-bearing for wall design)

Civic voice/project agents are **working offices**, not only Sunday cascade characters:

| Window | What runs | Who |
|--------|-----------|-----|
| **Sun** | Decision chain (prep → Mayor → voices → projects → Clerk) | Full cascade |
| **Mon–Thu** | **Datawakes** — office-holders voice their **domain data** | dutyDays `sun-thu` seats on LRU rota |
| **Fri–Sat** | Citizen life (no office datawake) | Holders may still hit citizen-wake as people |

Domain examples (already wired in `cron-civic-run.js` `domainSlice` + map `dataDomain`):

- **Police Chief** → crime / safety (`CrimeIndex`, safety sections)  
- **Health / project health center** → hospitals, sick rates, health signals  
- **Baylight Authority** → construction / project progress as daily build reality  
- **Stabilization / OARI / Transit Hub** → their initiative domains  
- **Mayor / factions / DA / Okoro** → governance, justice, community development slices  

**Implication for position walls:** save not only Sunday vote positions but **Mon–Thu domain statements** (`stated:` / datawake JSON `statement` + `numberMoved`). That is the continuous “they are saying it” feed. Inject prior domain posts on the next datawake for that **holder POPID**.

---

## Wiki/social scoreboard (once-over)

| Actor class | POPID source | Page store | Inject | Write-back | Grade |
|-------------|--------------|------------|--------|------------|-------|
| Journalist personas | persona-map | cp-POP | **Hard** (reporterWall) | PASS filed + memory_note | **A** |
| Citizen-voice authored | IDENTITY `POP ID:` | cp-POP | Soft (pageMemory) | Wake + PRESS record | **A−** |
| Random ledger citizens | Simulation_Ledger | cp-POP | Soft when woken | Wake | **B+** (by design) |
| Civic office holders | civic-office-map | possible if woken | None on civic run | **None on civic run** | **D** for office-continuity; **B** as source agents |
| Civic project directors | map popids | same | None on civic run | None on civic run | **D** for holder continuity |
| Faction multi-seat agents | many POPIDs | N/A single | N/A | Must not single-wall | **N/A — design correctly as multi** |
| City Clerk | none | none | none | none | **Correct** |

---

## Applications (living)

- 2026-08-07 — Written for Claude handoff after journalist solo-seat wall work; no agent package edits.
- 2026-08-07 (mags S357) — **POPID reconciliation DONE (condition 2).** Ledger verified: Brenda Okoro IS POP-00037 (Deputy Mayor, Community Affairs) — IDENTITY's "not in Simulation_Ledger" claim was false, fixed. Police chief IDENTITY carried POP-00142, which the ledger says is **Jonas Patel, Medical Examiner** — worse than suspected drift; fixed to POP-00136 (Rafael Montez, verified). Both IDENTITY files now carry verified POP ID lines.
- 2026-08-07 (mags S357) — Verdict flipped watch→adopt on Mike-direct approval; civic.16 filed; grok clear to proceed starting with the condition-3 one-page design.

---

## Changelog

- 2026-08-07 (grok) — Initial review + watch verdict; research registered for Claude.
