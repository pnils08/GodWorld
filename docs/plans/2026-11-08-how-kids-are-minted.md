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

## Tasks

| # | Task | Owner | Status |
|---|---|---|---|
| 1 | Read-before: wiring cards for the four cells; every writer read end to end; the three defects each traced to its writer; the counts above on the snapshot | rb | not started |
| 1b | Builder rules the calls the read surfaces (what a birth writes, whose name a child takes, the age floor for a parent, whether the three families' rows are repaired by hand or by an engine pass) | Mike | — |
| 2 | Engine cut per the ruled calls; tests; the truth docs | rb | not started |
| 3 | Sandbox proof on live-synced state; codex review of the candidate; PROD | rb / codex | not started |
| 4 | Live read at the first fire after | rb | not started |

## Acceptance

1. Every path that writes ChildrenIds / ParentIds / NumChildren writes both sides of the link and the household, or writes nothing — proven by unit tests on each writer and a snapshot count of 0 one-way links after the fix lands and the next fire runs.
2. No path mints or links a parent younger than the ruled floor at the child's birth — proven by the writer's guard and a snapshot count.
3. A child's `Last` is written once, by the ruled rule, and no later writer changes it — proven by grep (one writer) and a test.
4. NumChildren equals ChildrenIds length for every living row after the next fire — snapshot count 0 mismatches.

## Open questions

- The Renteria BirthYears (2001 / 2002 → 1983 / 1984 per the duet) and Varek's NumChildren: hand repair on the builder's go, or an engine repair pass over every row the counts find? His call at 1b.

## Changelog

- 2026-11-08 (research-build) — opened on the builder's word at session close; the evidence table read off the snapshot; no code touched.
