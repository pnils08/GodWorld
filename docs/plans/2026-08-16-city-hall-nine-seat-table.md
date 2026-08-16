---
title: City-hall nine-seat table Plan
created: 2026-08-16
updated: 2026-08-16
type: plan
tags: [civic, architecture, draft]
sources:
  - docs/research/2026-08-16-sunday-city-hall-invite.md — D+B ruling (Mike-direct 2026-08-16)
  - docs/research/2026-08-14-civic-process-install.md — Sunday = expression; Mon–Thu = absorb
  - docs/plans/2026-07-28-civic-cron-city-hall.md — civic.15 chain; --apply stays theirs
  - docs/plans/2026-08-15-civic-office-lived-packets.md — civic.17 packs + week block
  - docs/mara-vance/INITIATIVE_TRACKER_CONTRACT.md — 28-col INIT schema this ledger must not clone
  - .claude/rules/civic.md — vote math, IND not a bloc, recovering = ABSENT
  - scripts/cron-civic-run.js — runDirective / runPrep / runDecide / runVoices / runProjects / runClose
  - scripts/civic-office-map.json — 9 COUNCIL-D* rows still share 3 faction agentDirs
  - scripts/assembleDecisions.js — primary-voice concatenation this plan retires as the stamp
pointers:
  - "[[engine/ROLLOUT_PLAN]] — civic.24"
  - "[[../research/2026-08-16-sunday-city-hall-invite]] — research basis"
  - "[[../research/2026-08-14-civic-process-install]] — parent week"
  - "[[2026-07-28-civic-cron-city-hall]] — civic.15; this plan does not flip --apply"
  - "[[2026-08-15-civic-office-lived-packets]] — weekday pack + Sunday week block stay"
  - "[[index]] — registered same change"
---

# City-hall nine-seat table Plan

**Goal:** Sunday city-hall is a nine-seat hearing: each district speaks as itself, faction-aware; the Mayor opens the floor then gavels last; the room writes a City Hall Ledger row-set and only the gavel may stamp Initiative_Tracker.

**Architecture:** Split the three faction `agentDir`s. Each `COUNCIL-D1`…`D9` gets its own Sunday (and weekday) voice keyed by `officeId`. Shared council RULES/SKILL plus nine thin IDENTITY files — cheaper than nine full agent clones, and the existing faction IDENTITY files cannot be reused as-is because they are bloc microphones (Ashford speaks for CRC). Replace single `runDecide` with `runMayorOpen` (agenda, no `trackerUpdates`) → parallel nine-seat hearing → `runMayorGavel` (only political stamp) → Layer 3 projects → Clerk. New disk ledger `output/cron-civic/city-hall-ledger_c{N}.json`; sheet tab is engine-sheet after a dry Sunday, not this plan's first commit. civic.15 `--apply` stays off.

**Terminal:** research-build owns the plan. grok/kimi: `scripts/` + `docs/`. Claude lands `.claude/agents/**` (control plane). engine-sheet: sheet tab + any live write, after disk contract is dry.

**Pointers:**
- Prior work: civic.15 chain, civic.16 wiki, civic.17 week-carry
- Related: civic.18 / civic.21 / civic.23 (hood map + feeder + character; timing only)
- Research basis: [[../research/2026-08-16-sunday-city-hall-invite]]

**Acceptance criteria:**
1. A dry Sunday produces nine district voice JSONs (`council_d7_c{N}.json` etc.) plus mayor-open and mayor-gavel files. No faction-agent JSON speaks for a district.
2. `city-hall-ledger_c{N}.json` has one hearing row per seated speaker and one gavel row. Initiative_Tracker dry-run (`applyTrackerUpdates.js` without `--apply`) shows `trackerUpdates` only from the gavel file.
3. Every vote/tally in that run names all 9 seats (YES / NO / ABSENT). Recovering seats are ABSENT and statement-only. Vega and Tran never share a statement.
4. civic.15 `--apply` is still absent from crontab. This plan does not write the live Initiative_Tracker sheet.

---

## 1. What the nine district voices need

**Call (cheaper path):** do **not** clone the three faction agent trees nine times, and do **not** point nine seats at the existing faction IDENTITY/RULES. Those files are the collapse: CRC IDENTITY is “you are the faction, spokesperson Ashford.” Reusing it would make Chen speak as Ashford’s bloc.

Build instead:

| Layer | What | Why cheaper |
|---|---|---|
| Shared | `.claude/agents/civic-office-council-seat/RULES.md` + `SKILL.md` + `LENS.md` | One Sunday contract, one vote-math rule, one “you do not speak for your caucus” line |
| Per seat | `.claude/agents/civic-office-council-d{N}/IDENTITY.md` only | Name, POPID, district, hoods, faction, traits, one paragraph of voice. CRC/OPP/IND IDENTITY already contain these sections — **split them out**, do not invent new people |
| Map | `scripts/civic-office-map.json` | Each `COUNCIL-D*` `agentDir` becomes `civic-office-council-d{N}`. `model` stays the row’s current faction-family model (qwen / deepseek / kimi). No new bake-off |
| Pack | already on disk | `output/cron-civic/packs/COUNCIL-D{N}_c{N}.json` from civic.17. Sunday packet **points** at it (existing week block) |
| Wiki | civic.16 | Wall keys on POPID. Once weekday rota wakes `officeId` not faction dir, each seat accumulates its own week |

**What each IDENTITY must contain (and nothing else):**
- Holder, POPID, officeId, district, faction, title (Council President on Vega only)
- Turf hoods (from `lib/districtMap.js` / map, not invented)
- Seat status: `active` | `recovering` | `vacant` — **read from Civic_Office_Ledger at write time**, do not copy the C103 packet (that file marked Crane ACTIVE; civic.md still documents recovering)
- Voice paragraph + trait table **lifted from the current faction IDENTITY member section**
- Explicit: “You are D{N}. You do not issue the caucus line. You may agree with a faction peer; you may not speak their quote.”

**What the shared RULES must contain:**
- Sunday JSON contract (same `statements[]` shape as today)
- Hearing rows may set `disposition` / quote / actionAsked. They may **not** emit `trackerUpdates.ImplementationPhase`. That is gavel-only
- Vote math: list all 9, recovering = ABSENT, majority on active seats
- IND: Vega and Tran are separate people. No “independents decided”
- No invented citizens, shops, votes, or sheet numbers
- Canon: Mayor she/her; OPP / CRC / IND names as locked

**What stays out of this plan:**
- New voices for the ~24 `agentDir: null` staff
- DA still “only if relevant” (existing SKILL)
- Deleting the three faction dirs on day one — Sunday and weekday **stop calling them**. Retire the files in a later Claude-owned commit so control-plane delete is not mixed into the first script land

**Weekday must move with Sunday.** `datawakeRota` / `--office` today key `agentDir` and `BLOC_SPOKESPERSON_DISTRICT`. If that stays, eight of nine Sunday seats arrive with an empty personal wiki. Task 4 switches the rota to `officeId` (nine council seats in the LRU, plus existing cabinet). Faction routing as a *microphone* ends because Mike named D. Faction as *identity* stays (section 4).

---

## 2. Mayor-last gavel — where it sits in `runChain`

B was first **and** last. The ruling’s load-bearing sentence is that the stamp is her gavel, not `assembleDecisions` picking a primary voice.

Replace `runDecide` with two stages. New chain:

```
directive
  → prep          (packets for 9 districts + invited cabinet + projects; week block stays)
  → mayor-open    (NEW: agenda / what’s on the floor. trackerUpdates forbidden. Fatal if she fails)
  → hearing       (NEW name for Layer 2: 9 districts + Montez/Okoro/DA-if-relevant, Promise.all)
  → mayor-gavel   (NEW: reads hearing transcript + her open. Only political trackerUpdates writer)
  → projects      (Layer 3, still touch-gated, after the frame is locked)
  → close         (Clerk → assemble from gavel → applyTrackerUpdates dry → civic.15 gate)
```

`runChain` stage list becomes:
`runDirective, runPrep, runMayorOpen, runHearing, runMayorGavel, runProjects, runClose`.

**mayor-open packet:** current mayor pending-decisions minus any “you decide the phase now.” Output: `output/civic-voice/mayor_open_c{N}.json`. Injected into every hearing packet as `## MAYOR'S AGENDA THIS CYCLE` (not `## MAYOR'S DECISIONS`).

**hearing:** each district user prompt = own packet + week wall + pack pointer/lever + agenda + Sunday JSON. They hear the Mayor’s *ask*, not her stamp. They do not hear each other (still parallel). A second round-table pass is **out of v1** — D is who sits, not a multi-turn debate. Cost: +6 council calls vs today’s 3 faction mics; accepted with D.

**mayor-gavel:** user prompt = her packet + full hearing transcript (9 quotes + dispositions, lint-cleaned) + known INITs. Output: `output/civic-voice/mayor_gavel_c{N}.json`. This file is the only Layer-1/2 input `assembleDecisions.js` may treat as `trackerUpdates` primary. Hearing JSONs are minutes, not stamps.

**projects:** unchanged trigger (a statement touched their INIT), but they read the **gavel** as the locked frame, not the hearing.

**close / assemble:** change priority list in `scripts/assembleDecisions.js` so “Mayor” means `mayor_gavel` only. Concatenated MilestoneNotes from nine hearing files is a defect, not a feature. S344 primary-only normalize becomes unnecessary if hearing files cannot carry ImplementationPhase.

**Crontab:** still `--stage=chain` with no `--apply`. C103 `close_c103.json` remains a clean-exit guard; this chain first proves on the next fired cycle, not by un-closing C103.

civic.md “Mayor speaks first” stays true (open). Clerk stays last. “Factions cannot react before Mayor has positioned” becomes “districts cannot react before the agenda exists.” They *can* speak before the gavel — that is the hearing.

---

## 3. City Hall Ledger schema (distinct from Initiative_Tracker)

Initiative_Tracker (28 cols) is the **program**: INIT id, phase, budget, LeadFaction, MayoralAction, neighborhoods. It does not record who sat, who said no, or who asked for an audit on a week-lever that is not an INIT.

Civic_Office_Ledger is the **roster**: who holds the seat, approval, status. It is not minutes.

City Hall Ledger is the **room**. Disk-first (wipe lesson): `output/cron-civic/city-hall-ledger_c{N}.json`. Sheet tab `City_Hall_Ledger` is engine-sheet after one clean dry Sunday. No Gregorian dates in the in-world fields.

```json
{
  "cycle": 104,
  "v": "CITYHALL/1",
  "hearing": [
    {
      "officeId": "COUNCIL-D7",
      "popid": "POP-00504",
      "holder": "Warren Ashford",
      "district": "D7",
      "faction": "CRC",
      "seatStatus": "active",
      "disposition": "statement",
      "initiativeId": null,
      "lever": "stand with KONO or leave it",
      "quote": "",
      "actionAsked": "",
      "voiceFile": "output/civic-voice/council_d7_c104.json"
    }
  ],
  "votes": [
    {
      "initiativeId": "INIT-005",
      "seats": [
        { "officeId": "COUNCIL-D7", "disposition": "NO" }
      ]
    }
  ],
  "gavel": {
    "officeId": "MAYOR-01",
    "popid": "POP-00034",
    "holder": "Avery Santana",
    "dispositions": [
      { "initiativeId": "INIT-005", "mayoralAction": "signed", "note": "" }
    ],
    "voiceFile": "output/civic-voice/mayor_gavel_c104.json"
  }
}
```

**Column contract** (sheet, when es adds it — one row per hearing line, plus vote lines, plus gavel lines):

| Column | Meaning | Not on Initiative_Tracker because |
|---|---|---|
| `Cycle` | In-world cycle | Tracker rows are per-INIT, not per-meeting |
| `RecordType` | `hearing` / `vote` / `gavel` | Tracker has no meeting grain |
| `OfficeId` | `COUNCIL-D7` / `MAYOR-01` / … | Tracker has no speaker |
| `PopId` | `POP-00504` | |
| `Holder` | Canon name | |
| `District` | `D7` or `citywide` | |
| `Faction` | `OPP` / `CRC` / `IND` / `STAFF` | Tracker `LeadFaction` is program ownership, not who spoke |
| `SeatStatus` | `active` / `recovering` / `vacant` | |
| `Disposition` | `YES` / `NO` / `ABSENT` / `statement` / `tabled` / `no-action` | Tracker `Outcome` is the INIT’s vote result, not the seat |
| `InitiativeID` | nullable | Week levers may have no INIT |
| `Lever` | pack `task.goal` | Not a tracker field |
| `Quote` | one pull-quote | Lives in civic-voice today; ledger makes it queryable |
| `ActionAsked` | what they want done | |
| `MayoralAction` | gavel rows only; same vocab as tracker col 20 | Copied onto the INIT by apply, not stored only here |
| `VoiceFile` | repo-relative path | |
| `Source` | `cron-civic-run` | |

**Writers:** `runHearing` appends `hearing` (+ `vote` if the packet had a vote-ready INIT). `runMayorGavel` writes `gavel` and is the only caller allowed to queue Initiative_Tracker `MayoralAction` / `ImplementationPhase` via existing `applyTrackerUpdates` after civic.15 gate. Hearing rows never call apply.

**Do not:** add Sponsor/ProposedBy onto Initiative_Tracker in this plan (civic.20 noted those columns are missing). If a district authors a new INIT, that is a later civic.20 task. This ledger records the ask; it does not mint INIT ids.

---

## 4. Faction-aware after the collapse

Faction is a **field on the person**, not an agent that speaks.

| Signal | Where it lives now | Where it lives after |
|---|---|---|
| Caucus membership | `civic-office-map.json` `faction` on each COUNCIL-D* row (already) | Unchanged |
| Microphone | `agentDir` shared + `BLOC_SPOKESPERSON_DISTRICT` | Gone. Each row has `civic-office-council-d{N}` |
| Model family | Same model copied onto every seat in the caucus | Keep it. Friction stays OPP≠CRC≠IND≠Mayor without nine bake-offs |
| Voice tone | Faction IDENTITY (“you are the CRC”) | Shared RULES: short OPP / CRC / IND tone table from civic.md. IDENTITY is the person |
| Vote math | 3 JSON files, whip inferred | 9 dispositions on the ledger; 4–3–2 is counted, not performed |
| IND | One `civic-office-ind-swing` agent | Two people. The “IND is not a bloc” rule becomes true at the mic |
| Mara directive addressee | First map row per shared dir (Carter / Crane / Tran) | The actual holder of that officeId |
| Weekday wiki | Spokesperson POPID only | Each seat’s POPID |

Prep packets stop using the “CRC bloc (Crane, Ashford, Chen)” header for a single file. Each district packet is that seat’s turf + that seat’s week. A shared roster block (all 9 statuses) still appears on every packet so vote math is whip-read off THIS, not memory.

---

## Tasks

### Task 1: Seat inventory (no new people)

- **Files:** `scripts/civic-office-map.json` — read; Civic_Office_Ledger snapshot in `output/engine_audit_c{N}.json` — read; `.claude/agents/civic-office-{opp,crc,ind}-*/IDENTITY.md` — read
- **Steps:**
  1. Table of 9 seats: officeId, holder, popid, faction, model, hoods, live `Status`.
  2. Mark recovering/vacant from the ledger, not from C103 packets.
  3. List which IDENTITY paragraphs split to which seat.
- **Verify:** 9 rows, 0 invented POPIDs, Crane/anyone recovering named ABSENT for vote math.
- **Status:** [ ] open
- **Lane:** grok or rb (read-only)

### Task 2: Shared council RULES/SKILL/LENS

- **Files:** `.claude/agents/civic-office-council-seat/{RULES,SKILL,LENS}.md` — create
- **Steps:**
  1. Sunday contract + gavel-only `trackerUpdates` + 9-seat vote math + IND-not-a-bloc + tone table.
  2. SKILL boot reads shared RULES then the seat IDENTITY.
- **Verify:** no holder names except as examples; lint-free of engine words.
- **Status:** [ ] open
- **Lane:** Claude (control plane)

### Task 3: Nine thin IDENTITY files

- **Files:** `.claude/agents/civic-office-council-d{1-9}/IDENTITY.md` — create
- **Steps:**
  1. Split existing faction IDENTITY member sections. No new biography.
  2. Vega IDENTITY names Council President. Crane IDENTITY is written-statement-only if ledger says recovering.
- **Verify:** each file has one POPID that matches the map; `rg "you are the (CRC|OPP) faction"` is empty in the nine files.
- **Status:** [ ] open
- **Lane:** Claude (control plane)

### Task 4: Map + weekday rota key `officeId`

- **Files:** `scripts/civic-office-map.json` — modify; `scripts/cron-civic-run.js` `datawakeRota` / `--office` / `BLOC_SPOKESPERSON_DISTRICT` — modify; `scripts/officeWall.js` resolveHolder — modify; `scripts/buildCivicOfficeSlice.js` — read (already keys officeId)
- **Steps:**
  1. Point each COUNCIL-D* `agentDir` at `civic-office-council-d{N}`.
  2. LRU weekday rota over nine officeIds (+ existing cabinet dirs). Drop spokesperson remap.
  3. `--office COUNCIL-D7` and `--office civic-office-council-d7` both resolve.
- **Verify:** `node scripts/cron-civic-run.js --stage=datawake --office COUNCIL-D7 --date <weekday> --cycle {N} --dry-run` logs Ashford / D7, not “CRC faction.”
- **Status:** [ ] open
- **Lane:** grok/kimi (`scripts/`); map is not control plane

### Task 5: Prep writes nine district packets

- **Files:** `scripts/cron-civic-run.js` `runPrep` — modify
- **Steps:**
  1. Stop assigning topics only to `FACTION_AGENT[seat.faction]`. Assign to that seat’s agentDir.
  2. Packet filename: `civic-office-council-d{N}_pending_decisions_c{N}.md`.
  3. Keep civic.17 week block + pack pointer (`COUNCIL-D{N}_c{N}.json`).
  4. Directive match on the new agentDir / officeId, not the old bloc dir.
- **Verify:** `node --check scripts/cron-civic-run.js`; a unit test that a D7-only hood HIGH does not open a D6 packet.
- **Status:** [ ] open
- **Lane:** grok/kimi

### Task 6: `runMayorOpen` + `runHearing` + `runMayorGavel`

- **Files:** `scripts/cron-civic-run.js` — modify; `scripts/cron-civic-run.js` tests — create/extend
- **Steps:**
  1. Implement the three stages as specified in §2. Wire `runChain`.
  2. Hearing `Promise.all` over the nine + invited cabinet.
  3. Gavel prompt includes the hearing transcript. Hearing schema rejects `ImplementationPhase`.
- **Verify:** unit test: hearing JSON with `trackerUpdates.ImplementationPhase` fails validate; gavel JSON with a legal phase passes. No model call in the test.
- **Status:** [ ] open
- **Lane:** grok/kimi

### Task 7: City Hall Ledger writer (disk)

- **Files:** `scripts/cityHallLedger.js` — create; `scripts/cityHallLedger.test.js` — create; `runHearing` / `runMayorGavel` — call it
- **Steps:**
  1. Emit `output/cron-civic/city-hall-ledger_c{N}.json` to the §3 contract.
  2. Votes list all 9 seats. Recovering = ABSENT.
- **Verify:** `node scripts/cityHallLedger.test.js` PASS with synthetic names only.
- **Status:** [ ] open
- **Lane:** grok/kimi

### Task 8: assembleDecisions reads gavel only

- **Files:** `scripts/assembleDecisions.js` — modify
- **Steps:**
  1. Primary voice for trackerUpdates = `mayor_gavel_c{N}.json`.
  2. Hearing files may attach quotes to the decisions artifact as minutes, never as ImplementationPhase.
- **Verify:** fixture with nine hearing phases + one gavel phase → assembled file has the gavel phase only.
- **Status:** [ ] open
- **Lane:** grok/kimi

### Task 9: One attended dry Sunday, then stop

- **Files:** output under `output/cron-civic/` + `output/civic-voice/` only
- **Steps:**
  1. After a new cycle fire (not C103 un-close): `--stage=chain` **without** `--apply`.
  2. Show rb/Mike: 9 hearing files, gavel file, ledger JSON, assemble dry-run.
- **Verify:** acceptance criteria 1–4. No sheet write.
- **Status:** [ ] blocked on Tasks 1–8 + a new engine cycle
- **Lane:** attended (grok or es)

### Task 10: Sheet tab (gated)

- **Files:** engine ensure-script + `docs/mara-vance/` or ledger contract — only after Task 9
- **Steps:**
  1. engine-sheet adds `City_Hall_Ledger` from the disk contract.
  2. Replay rule: clasp is code-only; sheet create is dry-run → apply → read-back.
- **Verify:** sandbox row count matches the dry JSON; live not touched until named.
- **Status:** [ ] blocked on Task 9
- **Lane:** engine-sheet

---

## Open questions

- [x] Nine IDENTITY clones vs shared RULES + thin IDENTITY — **shared + thin** (§1).
- [x] Mayor first, last, or both — **both** (§2). Open = agenda. Gavel = stamp.
- [x] Who may write Initiative_Tracker from Sunday — **gavel only**. civic.15 `--apply` still the sheet switch.
- [ ] Live Crane (and any other) `Status` on Civic_Office_Ledger — Task 1 reads it. Do not lock recovering vs active from C103 packets.
- [ ] Whether faction agent dirs are deleted after Sunday stops calling them — not this plan’s first land. Files stay; callers stop.

---

## Changelog

- 2026-08-16 (grok) — Draft for civic.24. D+B: nine seats, Mayor open+gavel, City Hall Ledger disk contract, faction as field not microphone. No code.
