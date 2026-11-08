# How kids are minted — parents too young, a child's surname moving, a child landing on a citizen who had none

**ROLLOUT:** engine.339 · **Owner:** research-build · **State:** ready (builder 2026-11-08: "high priority issue next session") · **Opened:** 2026-11-08

## Goal

A child on the ledger is a citizen with two real parents the right age, the family's name, and a household he shares with them. Find every path that mints or links a child (the births, the family lottery, the household intake, the drip, any authoring door) and the one that produced each of the three observed shapes below; fix the mechanism, never the rows by hand (CLAUDE.md rule 4 — engine output is the world's truth; a bug is an event).

## Builder's words 2026-11-08 (verbatim; the Claude duet uncovered the first family)

> Isaac and Mei Renteria: 2001 and 2002 become 1983 and 1984, so they were 24 and 23 when Tomas was born. Tomas's 2007 stays, since his age is canon.

> I also noticed that citizens get kids and the kids last name changes, so need to understand this mechanism and that kids aren't being assigned to parents, I noticed it with Elias Varek, he didn't have a kid it seemed like a kid was assigned to him.

The first line is the duet's proposed repair of the parents' BirthYears — an authoring call on live rows, the builder's; this row does not make it. The row finds why the engine wrote parents aged 6 and 5 at a birth, and stops it.

## Read-before — the evidence as it sits (snapshot 2026-11-08, live C114)

| POPID | Name | BirthYear | HouseholdId | SpouseId | ParentIds | ChildrenIds | NumChildren | MaritalStatus |
|---|---|---|---|---|---|---|---|---|
| POP-00744 | Tomas Renteria | 2007 | HH-0084-525 | — | `[]` | — | 0 | single |
| POP-01042 | Isaac Renteria | 2001 | HH-0101-K001 | POP-01043 | — | `["POP-00744"]` | 1 | married |
| POP-01043 | Mei Renteria | 2002 | HH-0101-K001 | POP-01042 | — | `["POP-00744"]` | 1 | married |
| POP-00789 | Elias Varek | 2003 | HH-0106-F026 | — | — | — (blank) | **1** | single |

Three distinct defects, each its own mechanism until the read says otherwise:

1. **Parents younger than their child allows.** Isaac / Mei carry ChildrenIds → Tomas (born 2007) with BirthYears 2001 / 2002. The link is **one-way**: Tomas's ParentIds is empty and his household (HH-0084) is not theirs (HH-0101). So a path minted or linked the parents to an existing child without reading his BirthYear or writing his side. Candidates: the family lottery (engine.304 — links a Generic citizen to a family), the household intake (engine.109), the drip (engine.66), `wireFamilyMatch_` (processAdvancementIntake.js).
2. **A child's surname changes.** The builder saw a kid's last name move after birth / assignment. Candidates: the birth writer (generationalEventsEngine), MaidenName / spouse-name handling at a wedding (engine.302), the household former (`formIntakeHouseholds_`), any writer of `Last`.
3. **A child assigned to a citizen who had none.** Elias Varek: NumChildren 1, ChildrenIds blank, single, no spouse. A counter moved with no link — a birth roll that incremented NumChildren without a child row, or a child row whose ParentIds names him while his ChildrenIds was never written. Candidates: the birth event (`Birth` tag writer), NumChildren writers, `familyLedgerCols_` readers.

Wiring cards first (engine-wiring agent): `ChildrenIds`, `ParentIds`, `NumChildren`, `Last` — writers at both entry points, phase position, write path. Then `grep -rn "NumChildren\|ChildrenIds\|ParentIds" phase* utilities scripts lib` and read every writer end to end. Count on the snapshot: how many children have an empty ParentIds while someone's ChildrenIds names them; how many parents are younger than child − 16; how many citizens have NumChildren > ChildrenIds length.

## Task 1 read — what the code and the sheet say (research-build, 2026-11-08, live C114, sim year 2041)

**Writers of the four cells (wiring card, every phase writer before Phase10-CommitLedger, in-memory on `ctx.ledger.rows`):**

| Writer | File:line | What it writes | Age floor |
|---|---|---|---|
| birth roll → `createChildRow_` | generationalEventsEngine.js:560–604, 1139 | child row (Last = parent's, ParentIds = parent + SpouseId, HouseholdId = parent's); parent + spouse ChildrenIds + NumChildren++ — both sides | parent rolls only at age 26–42 (`AGE_RANGES.BIRTH`) |
| intake mint, no HouseholdKey | processAdvancementIntake.js:1174 | **NumChildren = `profile.NumChildren`, a seeded die** (lib/citizenDerivation.js:353, 35% of a single 30–44 ≥ 1); ChildrenIds untouched | — |
| intake mint with HouseholdKey → `formIntakeHouseholds_` | :1181–1184, 2887 | NumChildren 0 / ChildrenIds `[]`, then the household's own kids both sides | spouse must be adult; no parent–child gap |
| authored queue row MatchType parent/child → `wireFamilyMatch_` | :2990 | both sides + household + hood | **none** — any BirthYear pair |
| family of a dead citizen → `wireFamilyToDeceased_` | :3115 | arriving side only | **none** |
| family lottery → `checkFamilyMatchPromotions_` | :2160–2459 | **no ledger write**: a Generic_Citizens row takes Status `Family`, **Last = the family surname, its own kept in MaidenName** (:2442–2443), FamilyOf, FamilyRole; open child spots = NumChildren − ChildrenIds − linked (:2223) | parent 18–45 years older (`DRIP_PARENT_AGE_MIN/MAX`, :1737) |
| wedding → `marryCitizens_` | bondEngine.js:2410–2427 | joiner's minors move house; resident minors gain the joiner as second parent | none |
| GC spouse mints | bondEngine.js:2598, 2806 | spouse Last = partner's surname, MaidenName = own | wedding window |

No engine writer changes an on-ledger row's `Last`; every `Last` write is on a new row (grep, 8 sites). `NumChildren` is read by the household engine (home-life lines), citizen events, and the wake: `lib/wakePerception.js:34–40` tells a citizen "you have N children" from NumChildren alone when no ChildrenIds / Family row names them.

**Snapshot counts (`output/simulation_ledger_snapshot.jsonl`, 1058 rows):**

| Count | n | Rows |
|---|---|---|
| ChildrenIds names a child whose ParentIds does not name them back (one-way) | 2 | Isaac, Mei Renteria → Tomas |
| ParentIds names a parent whose ChildrenIds does not name the child | 0 | — |
| parent younger than child − 16 | 3 | Isaac (gap 6), Mei (5), Ollie Campbell POP-00642 → Valentina POP-01017 (14) |
| NumChildren > ChildrenIds length | **537** (532 with ChildrenIds empty; 0 the other way) | the seeded ledger's off-camera counts; Varek is one |
| linked child in a different household from a living parent | 3 | Tomas ×2; Mags POP-00005 → POP-00595 (born 2016, an adult) |
| child's Last ≠ a parent's Last | 1 | Maya Torres-Dillon → Rick Dillon (the mother's hyphen, authored; father Dillon) |
| engine-born children (`[Birth]` line), surname drift from the birth line | 6 / 0 | — |
| youth rows with no ParentIds | 1 | POP-01026 Coen Carr |
| Generic_Citizens rows Status `Family` | 16 (10 child, 6 spouse) | gaps 18–34; three at exactly 18 |

**Defect 3 → Varek, traced.** POP-00789 carries NumChildren 1 from a die at his mint (first snapshot, C103: NC 1, no household, no ChildrenIds; which door minted him is not recorded — no intake row survives, the ledger has no CreatedAt, his LifeHistory is compressed; the intake door's profile die at :1174 is the live writer of that shape, and the seeded ledger's counts are the same shape). The family lottery read that as one open child spot and at a later fire drew background citizen **Guadalupe Lee (BY 2022) → renamed Guadalupe Varek**, Status Family, FamilyOf POP-00789, FamilyRole child. Elias (BY 2003) was 19 at her birth — inside the lottery's 18-year floor. The wake now tells him his child is Guadalupe Varek. The same chain is open on every one of the 532 rows (13 Tier 1, 38 Tier 2, 101 Tier 3, 380 Tier 4; 101 with no household; the snapshot cannot split seed rows from later arrivals — no CreatedAt, compressed histories): a count is a spot the lottery fills. The ledger's seeded NumChildren (S248 "off-sample kids") and engine.57 P6 ("births create people") were never reconciled — the count is still the spot count. Two of the builder's rulings meet here: top-tier entities are authored, not pool-drawn (2026-09-08), and the lottery weights Tier 1 at ×10 (engine.304, 2026-10-19) — a Tier 1 with an open count is the citizen most likely to be handed a pool-drawn child, and Varek was.

**Defect 2 → the surname, traced.** The one place a child's name changes is the lottery's rename of the drawn background citizen (:2442, by design, engine.304 D1 — "the family surname, its own kept as MaidenName"), later carried onto the ledger by the emergence door. On the ledger itself: 0 minors renamed, 0 birth-line drift. What the builder saw is the lottery's rename (Lee → Varek).

**Defect 1 → Renteria, traced to a retired script, not a live engine path.** `scripts/migrations/engine57_kids_backfill.js` (header "SANDBOX ONLY"; commit `44fd75052` S319 2026-07-15: "Applied on SANDBOX 0714 … Tomas Renteria + Yuna Ramas dripped full parent pairs (POP-01042..45)"; `97bfdcaa2` S320: "2 live families, dripped at go-live") minted the `HH-0101-K001` household (the `-K` id is the script's alone; the engine mints `-F`/`-I`/`-M`), Isaac + Mei with Last = the kid's, ChildrenIds = [Tomas], NC 1, married to each other, the Family_Relationships row C101 Child1 Tomas, and wrote Tomas's ParentIds + HouseholdId (lines 174, 300). Its minor test was `2041 − BirthYear < 16` and its parent pick `kidAge + 20…42`, so Tomas's BirthYear then read ≥ 2026. Today Tomas reads BirthYear 2007, ParentIds `[]`, HouseholdId HH-0084-525 (the C84 seed household) — the sister family from the same run, **Yuna Ramas POP-00999 / POP-01044–45 (HH-0101-K002), is intact on both sides**, so Tomas's row alone was rewritten between C101 and the first snapshot (C103, 2026-08-11). No commit or script in that window writes those three cells; the rewrite is not in git. The C111 gap log's G-EC74 reversed the direction (it is ChildrenIds → Tomas, not ParentIds). Campbell (gap 14): the same script's S320 link pass (same-surname adult in the kid's household → parent, no age test; commit `97bfdcaa2`, "44 kids linked" on live). Both are history; the script has no caller and runs only by hand.

**Live engine gaps the read leaves (acceptance 1–2):** `wireFamilyMatch_`, `wireFamilyToDeceased_` and the step-parent write carry no parent-age floor; the intake die still writes NumChildren on a row with no kids; the lottery's floor is 18.

## Tasks

| # | Task | Owner | Status |
|---|---|---|---|
| 1 | Read-before: wiring cards for the four cells; every writer read end to end; the three defects each traced to its writer; the counts above on the snapshot | rb | **done 2026-11-08** (§Task 1 read) |
| 1b | Builder rules the calls the read surfaces (what a birth writes, whose name a child takes, the age floor for a parent, whether the three families' rows are repaired by hand or by an engine pass) | Mike | — |
| 2 | Engine cut per the ruled calls; tests; the truth docs | rb | not started |
| 3 | Sandbox proof on live-synced state; codex review of the candidate; PROD | rb / codex | not started |
| 4 | Live read at the first fire after | rb | not started |

## Acceptance

1. Every path that writes ChildrenIds / ParentIds / NumChildren writes both sides of the link and the household, or writes nothing — proven by unit tests on each writer and a snapshot count of 0 one-way links after the fix lands and the next fire runs.
2. No path mints or links a parent younger than the ruled floor at the child's birth — proven by the writer's guard and a snapshot count.
3. A child's `Last` is written once, by the ruled rule, and no later writer changes it — proven by grep (one writer) and a test.
4. NumChildren equals ChildrenIds length for every living row after the next fire — snapshot count 0 mismatches.

## The calls for 1b (the read's output — each is a sim judgment)

1. **Does a die write children on an arriving citizen?** The seeded ledger's off-camera counts are the stated design (an empty relational field is design) and the lottery realizing them is engine.304 as ruled — not on the table. The narrow call: the intake door still rolls NumChildren for an authored arrival with no household row (:1174), and the lottery treats that roll as a real child to find. Keep the die, or an authored arrival has the children the author gave them (0 unless the queue row says otherwise). Second, whether a Tier 1's open count should draw from the pool at all (the two rulings above).
2. **The parent-age floor at a link.** The lottery allows 18; births roll at 26–42; the authored doors allow anything. One floor for every door, and its number.
3. **A drawn family member's surname.** The lottery renames the background citizen to the family's surname and keeps the birth name in MaidenName (engine.304 D1). Keep, or a child keeps their own name.
4. **The three families on the sheet.** Renteria: the duet's premise (Tomas's 2007 is canon, so the parents are wrong) runs the other way in the record — Isaac and Mei were generated for a Tomas who then read as a child, and his row was corrected afterward; so either (a) age the parents to 1983 / 1984 and write Tomas's side of the link, keeping a casting that only existed because of a bad BirthYear, or (b) unlink them (clear their ChildrenIds / NumChildren, the Family_Relationships Child1) and leave a childless Tier 4 couple in Fruitvale. Campbell (Ollie 2010 → Valentina 2024, gap 14): re-age or unlink the same way. Varek: the count, and whether Guadalupe stays his. Hand repair on the builder's go, or an engine repair pass over every row the counts find.

## Open questions

- Who rewrote Tomas's row (BirthYear, ParentIds, HouseholdId) between C101 and C103 — not in git; the sheet's version history is the only record.
- MaidenName is empty on all 1058 ledger rows. Consistent with no renamed Family row having reached the ledger yet (all 16 still sit in the pool, Status Family); the emergence door's MaidenName carry (:1198) is unproven on live until one does.
- A split of the 532 by door (seed vs. later arrival) needs a source the snapshot lacks (no CreatedAt; compressed histories).

## Changelog

- 2026-11-08 (research-build) — opened on the builder's word at session close; the evidence table read off the snapshot; no code touched.
- 2026-11-08 (research-build, S642) — Task 1 read done; the three defects traced to their writers (§Task 1 read); four calls written for 1b. No code touched.
- 2026-11-08 (research-build, S642) — advisor fold: call 1 narrowed to the intake die, call 4 gains the unlink option, Varek's mint door marked unrecorded, two open questions added.
