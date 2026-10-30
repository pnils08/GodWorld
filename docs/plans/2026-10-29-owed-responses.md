---
title: Owed responses — a listed event hitting a named citizen reserves that citizen a wake
created: 2026-10-29
updated: 2026-10-30
type: plan
tags: [media, citizens, wakes, draft]
sources:
  - output/cron-compare/culture_c113_tamsin-pruitt_packet-v2_angle.json (C113 Lives slice — 4 mood lines, 0 milestone events)
  - output/world_summary_c113.md ## Chaos Events (4 chaos cars named citizens)
  - lib/wakePerception.js:847 (wake draw weight 1 + 2·eventMag) · utilities/citizenDialMap.js nudgesForEvent_
  - scripts/citizen-wake.js:200 (voiceOnce — deepseek-v4-flash, reasoning off, 260 tokens, no tools; 3 wakes/day)
  - scripts/buildLivesSlice.js (LIFE_TAGS — stance lines no longer lead, 253cdde4)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.93"
  - "[[2026-10-11-media-extension]] — pipeline.73, the slice layer this feeds"
---

# Owed responses

**Problem (builder 2026-10-29).** Tamsin (Lives) covers citizens living events; other desks cover the event with a quote. A citizen the event hit often has no recorded response, so the Lives slice has nothing true to carry. C113: 4 chaos cars hit named citizens (train signal failure, medical hold on board, parking ticket, mail delivery); each left one line (Friction/Setback tag) and no wake. 0 of 4 woke. Wake draw is weight 1 + 2·eventMag over 1,039 citizens at 3 wakes/day: Friction ×5, Setback ×11 against ×1 — a better chance, still a small one.

**Direction (builder, 2026-10-29).** Events we want canon depth on record a response: chaos cars, casino or UNDOCKED win over a stake, a hospital stay of N cycles, a citizen in the judicial system for an offense type.

## Design (not built)

1. A listed event hitting a named citizen marks them *owed* a wake.
2. Each cycle reserves R wakes for owed citizens, most severe first; the rest stay the normal weighted draw.
3. An owed mark lapses after M cycles unreached.

## Builder's rulings (2026-10-29)

Thresholds, from measured rates (chaos: 11 cycles of world_summary; casino: 164 settled wagers C107–C113; hospital: 3 stays; court ledger empty):

| Event | Owes a response | Expected / cycle |
|---|---|---|
| Chaos car | the engine's `severity: 'high'` citizen outcomes (arrested, medical_emergency, workplace_accident, substance_intervention, deescalated, mail_theft_reported) | ~0.7 |
| Casino / UNDOCKED | wager over 1,000, or winnings over 500 (builder, second pass: not a 500 stake) | ~0.5 (3 wagers ≥1,000 and 2 net wins ≥500 in C107–C113) |
| Hospital stay | any admission | ~0.4 |
| Court case | any detention, any offense | ~0.2 |

- **Reserved wakes R = 6** a cycle (builder raised it from 3; agreed), most severe first. At ~2 owed a cycle on these bars, R=6 is headroom plus room for absorbed tickets.
- **Expiry M = 2 cycles.**
- **Absorption (builder):** a cycle where no high-severity event fired lets the low-severity citizen-hit chaos events (tickets, warnings, delays) take the reserved wakes, severity then recency. Read as: zero severe events → low ones absorbed (builder: "how you set it is fine"). Leftover-slots-every-cycle would be a one-line change.
- Casino volume tripled C107→C113 (12→40 settled); revisit the 1,000 wager bar in ~5 cycles. The engine rates a train held for a medical emergency low; it is not in the high class.

Build not started. Wake selection is `lib/` (engine substrate): bench proof, review, PROD.

## What the citizen is shown (builder, 2026-10-29)

Owed changes who wakes, never what the citizen is told. No line says "you owe a response." The event or the draw wakes them; they see their own life, the city and the events, and speak freely, which makes them interviewable. They may not reflect on the event; that is theirs to decide. Guardrails and commands shape the LLM call; the citizen gets it as their life. The dials give the voice a structured personality and must move with events and wakes.

Read against the code (2026-10-29): `buildVoicePrompts` (`scripts/citizen-wake.js:146`) already shows only life — LifeHistory tail, arc, lived line, health, family, bonds, paper, hood texture — and the user turn is a provocation latched to a real signal. Temperament + trajectory come from DialState (`dials.disposition(c.cur)`); the TraitProfile column is read only for journalist matching (`lib/wakePerception.js:444`), not in the wake prompt. Dial loop exists: LifeHistory tag → `nudgesForEvent_` at the cycle; wake affect → Reflection_Intake (applied=no) → `nudgesForReflection_` at the next cycle. Build check: each owed class (chaos, casino, hospital, court) must reach the owed citizen's perception, or the wake has nothing to reflect on.

## Build (2026-10-29, research-build)

Derived each wake from the record that proves the event; owed receipts live only in the owed journal `logs/citizen-wake-owed.jsonl` (the shared wake state file holds none).

| Piece | Where | What |
|---|---|---|
| Owed list | `lib/wakePerception.js` `owedFrom` | Chaos_Cars `TargetScope=citizen`, severity read from `utilities/chaosCarsConfig.js` by vehicle+outcome (derived set = the ruled six; test pins it); Casino_Ledger settled-win/loss with `Stake > 1000` or `Payout − Stake > 500` (void-gate, void-house, open never owe — nothing settled); Hospital_Ledger `AdmitCycle`; Judicial_Ledger `ArrestCycle` (a civil case with no arrest never owes). Window: the event's Cycle and the next (`OWED_WINDOW = 2`) |
| Tiers | `owedCandidates` | Tier 1 = the ruled classes. Tier 2 = low chaos citizen hits, eligible only from a Cycle in which no tier 1 fired (absorption per Cycle). Order: tier, the citizen's own `eventMag` (the engine's dial-nudge magnitude — no hand severity table), newest, id. One place per citizen; an owed citizen outside the wake pool is logged, never dropped silently |
| Draw | `selectWakeCitizen` | forced → owed (while `owedWakes[cycle] < R`) → the weighted lottery |
| What the citizen sees | `lifeTailOf` + `owedShownSet` | The event's own LifeHistory line occurrence (stamp + exact chaos text, or the status-split casino / arrest line) is pinned in the five-line life block; each event needs its own occurrence. No new words, no instruction. Hospital = the lived admission line (`livedFor` prefer). No pin = `lifeTailPlain`, the old block (1,053/1,053 live rows identical) |
| Spend | `owedPageStep` + `owedStateFrom`, journal `logs/citizen-wake-owed.jsonl` | Every owed-on live wake: `pending` (read back) before the page, `shown` after it lands; a page error adds nothing (pending stands). Receipts = the events shown; an `owed` slot counts one reserved wake; only the window's Cycles are read. A page key (citizen + Cycle + daypart) already journaled receipts nothing. The shared wake state holds no owed data |
| Concurrency | `acquireFileLock` + `wakeAdmission` | A live owed-on wake holds `logs/citizen-wake-owed.jsonl.lock` from before the journal read to exit; an overlapping live wake does not run. Dry runs take no lock and write nothing |
| Gate | `OWED_RESERVE = 6` | The crons run this working tree, so R was held at 0 through review; PROD 2026-10-30 = `OWED_RESERVE = 6` + its test line. `--owed-reserve=N` is the replay override (0 turns it off) |

**Bench (C113 live, read-only, 2026-10-29):** 6 owed — tier 1 from C112: POP-00121 (mail theft), POP-00646 (UNDOCKED win, net 733); tier 2 absorbed from C113 (no severe event fired): POP-00494 (parking ticket), POP-01160, POP-00518 (train delays), POP-00787 (document delivered). Every event line found and in the block. Full `--dry-run --owed-reserve=6`: slot `owed`, POP-00121, the theft line in perception, no instruction; he reflected on two friends, not the theft (the rule working). Unit: Test O in `lib/wakePerception.test.js`, 30 asserts. Not proven until a live fire: marks forming at C114 and lapsing at C116.

**Codex HOLD fold (review `docs/for-claude-review/2026-10-29-codex-pipeline93-owed-diff-review.md`, all six verified against the code):** F1 a hospital mark is shown only by its own admission as the lived line (`livedFor` prefer); F2 casino pins split by settled status, so a win never stands in for a loss (two same-status slips in one Cycle write one identical line — the record cannot tell them apart); F3 a Judicial `SourceSystem=reconcile` row is bookkeeping, skipped out loud; F4 + all kinds: only events whose evidence is in the final perception are receipted (`owedShown`), the rest stay owed, and an event with nothing in the record to show is never reserved (`unshowable`, logged); F5 one read per tab (`allSettled`), a failed tab or missing column is logged by name and the others still owe; F6 receipts aged on every owed-on wake, and read back after `saveState` (`OWED STATE NOT SAVED` on a miss, as the lived spend). Remaining limits: a tab failing every wake for two Cycles loses its marks (logged each wake); a state write that fails is loud, not retried.

**Codex re-review HOLD fold (`docs/for-claude-review/2026-10-29-codex-pipeline93-owed-rereview.md`, four findings, all verified):** R1 `owedShownSet` — each event claims its own line occurrence (exact chaos text first, then patterns), and a second same-pattern pin takes the next matching line; R2 `owedFrom` returns `unknownTabs` (unread, or missing columns) and absorption holds while any listed class (casino, hospital, court) is unknown; R3 `SourceSystem` is a required Judicial_Ledger column (live header has it); R4 receipts moved out of the shared wake state into `logs/citizen-wake-owed.jsonl`, two-phase per wake — `pending` appended and read back before the page append (a failed pending stops the wake: no page, so no double wake), then `shown`, or `failed` when the page does not land; `owedStateFrom` reads only the window's Cycles (nothing to age); an unreadable journal holds owed for that wake, loudly. Zero-reserve path never reads or writes the journal. **Stated ceilings:** the casino writer's line carries no WagerId, so two same-status slips in one Cycle are matched by count, not identity (writing the stake into the line would be an engine row, not this build); a `pending` line with neither `shown` nor `failed` (the page step crashed, or two writes failed back to back) counts as spent and is logged unconfirmed.

**Codex round 3 HOLD fold (`docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round3.md`, three findings, all verified):** F1 `lifeTailOf` pins line occurrences (indices), so two identical same-status lines both survive and both events are shown (no match → `lifeTailPlain`, the old block exactly); F2 no `failed` status — a page error may hide a landed page, so `pending` stands and the event counts as reached; F3 a live owed-on wake takes `logs/citizen-wake-owed.jsonl.lock` (`acquireFileLock`, the same link lock `withFileLock` uses, now shared) before it reads the journal and holds it to exit; an overlapping live wake runs without the owed slot. The page boundary is `owedPageStep` over injected I/O, unit-tested for pending-not-saved (no page), page error (pending stands), landed (pending, shown), shown-not-saved, and off (journal untouched). **Ceilings, unchanged:** casino count-not-identity; an unconfirmed `pending` is a possible missed wake, never a doubled one.

**Codex round 4 HOLD fold (`docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round4.md`, one finding, verified):** only citizen-wake writes the morning/midday/night/evening page keys (every other page writer has its own daypart: work, CIVIC, journal, exchange, deskwork, DISCORD, PRESS), so the only collider is another citizen-wake run. Concurrent: the lock loser no longer runs at all (`wakeAdmission` → skip), so no page can land under the owed wake's key while it holds the lock. Sequential (a later run of the same citizen + daypart): every owed-on wake is journaled, and a page key already in the journal receipts nothing for the later run (its write would duplicate the earlier page). Residual: a same-daypart page written before the reserve turns on is not in the journal — the flip day only.

**Codex round 5 HOLD fold (`docs/for-claude-review/2026-10-29-codex-pipeline93-owed-round5.md`, two findings, verified):** the journal's page occupancy is now the page key itself — `owedPageKey(POPID, Cycle, daypart)`, the same three parts `citizenPage.appendReflection_` builds its customId from, with no date — carried on every journal line (`page`), so a second morning in one Cycle sees the first morning's page; tested with two dates in one Cycle against a first-write-wins store. Build intro sentence corrected. Claim narrowed: the crons' page writers use their own dayparts; `scripts/magsPageAppend.js` (Mags's page only, operator-run) accepts any daypart. Surfaced, not this build: a citizen woken twice at one daypart in one Cycle writes one page doc twice (pipeline.94).

**Review closed, PROD (2026-10-30):** round 6 cancelled under the round cap (one review + one re-review, then the seat decides). Rounds 1–2 caught what changes what a citizen lives (wrong citizen reserved, an event receipted that was never in the perception); rounds 3–5 hardened conditions the cron schedule does not produce (overlapping runs, a crash between two writes, a second same-daypart wake in one Cycle) — worst case one missed wake. The round-5 fold is unit-tested (suite 177/178, the 1 = infrastructure.13). Flip-Cycle residual checked: none of the six C113 owed citizens has a non-dry wake in `logs/citizen-wake.log` this Cycle, so no pre-flip page can sit under their keys. Live proof open: marks form from the C114 fire (Sun 2026-11-01), C112 marks lapse at C114, C113 marks at C115 (window 2).

Known, not this build: `--dry-run` appends to `logs/citizen-wake-offered.jsonl` (keyed `pop|cycle|daypart`; replay used `evening`, which no cron runs).

## pipeline.94 — the wake page keyed by weekday (2026-10-30, research-build)

**The store's duplicate rule (read 2026-10-30).** Supermemory docs: "same customId = same document"; a resend is processed as an update. In this store that means append: a write under a taken customId lands in that doc as `old\n\n---\n\nnew` — no second doc, no refusal. Measured in `output/citizen_pages/index.jsonl` (C113 dump): 328 of 2,167 page docs carry it; wake dayparts 22 of ~460 (morning 2, midday 7, night 4, evening 6, afternoon 3), PRESS 176 of 752, work 9 of 59. So the round-5 premise (first write wins) was wrong; the effect is a merged doc — Lives shows its first 240 characters (the older words), Voices marks the doc id covered and never surfaces the later reflection, and the later write's metadata stands for both.

**Build.** `appendReflection_` takes `day` — the in-world weekday (`pageDayOf`, Central, `sun`..`sat`) — after the daypart, before any key: `cp-POP-x-c113-morning-thu`, `…-morning-thu-tension`. A Cycle is one week, and the wake's Cycle flips between Sunday night and Monday morning (`logs/citizen-wake.log`, C111→C113), so daypart + weekday is one wake. A weekday, not a calendar date: the customId reaches models (Rhea's review context, slice source lines, letter cites — `checkLetterEligibility` reads `[A-Za-z-]+` after the Cycle, so a date would also break letters). `scanCitizenPages` splits the weekday off into `day`; `slot` keeps the daypart grammar every reader matches. The owed journal's page key carries the same weekday (`owedPageKey`). Own-words family usage is keyed on daypart + key, so a weekday-keyed reflection still records. A malformed day is refused before any write. Switch `PAGE_DAY_KEY` in `scripts/citizen-wake.js`, held off through review (the crons run this tree), on 2026-10-30.

**The rerun contract (codex review F1, `docs/for-claude-review/2026-10-30-codex-pipeline94-page-day-review.md`, verified).** One page doc per wake slot — citizen, Cycle, daypart, weekday. A second run of a slot is that wake again, not a new one: a same-day rerun (an operator rerun, or `--pop` forcing a citizen who already woke that daypart today) or a Cycle longer than a week (a missed fire brings a weekday round twice). It lands in the slot's doc (the store appends) and receipts nothing, so an owed event it showed stays owed — eligible for another wake only until its window ends (re-review F1: a rerun in a window's last wakes can leave the event lapsed, unreceipted). The cron schedule runs each slot once. Ceilings: the appended words reach the page store but not the local index once that doc is indexed (`scanCitizenPages` fetches a doc id once — every appended doc, PRESS included); docs already merged stay as written.

**Proof.** Unit: `lib/citizenPage.test.js` (key shape, refusal, Central weekday at the UTC boundary, own words), `scripts/scanCitizenPages.test.js` (split, rejects a date or a misplaced weekday), `lib/wakePerception.test.js` — through the real `appendReflection_` and `pageDayOf` against an append store: Thursday then Friday = two docs, the event spent; a same-day rerun and a Thursday a week later = one appended doc, nothing spent, the event still owed. Live scanner run on the new admission: 3,073 listed, 36 new admitted, no old doc's admission changed. A live double same-daypart wake is rare (0 in the 36 live wakes on disk), so the unit tests carry it.

Surfaced, not this build: PRESS and work pages merge the same way (one doc per citizen per Cycle) — pipeline.96 below.

## pipeline.96 — interview, work-shift and exchange pages keyed per event (2026-10-30, research-build)

Builder 2026-10-30: "if the interviews and work shifts are all appending to the same memory entry and it's causing issues we should change it."

**It causes issues (measured 2026-10-30).** Local index (`output/citizen_pages/index.jsonl`): PRESS 178 of 768 docs merged, those 178 holding 783 answers; PRESS-tension 80 of 364; work 9 of 62; CONVO 11 of 131. That count is a floor — the scanner fetches a doc id once (`scanCitizenPages.js` dump: `existing.has(docId)`), so an answer appended after the first fetch never shows. The cron logs show it directly: `<- PRESS doc <id>` lines in `logs/{newsroom-fanout,pre-saturday-sweep,undocked-weekly,ines-weekend}.log` name 28 docs written 2+ times — 72 answers; the index holds 30 of them, 21 lost on indexed docs, 6 docs never indexed. What each reader loses on a merged doc:
- the newsroom (Pulse, letters pool, newsroom sourcing, Rhea's page lines — all read the index): every answer appended after the fetch.
- the citizen's own memory (`loadOwnPageReadback` → `recentPage_`, 15 newest docs by `createdAt`, each cut at 320 chars): the first answer only, dated by the first write — a citizen interviewed four times in a Cycle remembers one.
- Lives (work slot, first 240 chars) and Voices (work + CONVO, docId marked covered): the first shift or exchange only.

**Build.** One page doc per event:
- **PRESS** (`scripts/citizenVoice.js`, switch `PAGE_EVENT_KEY`): `day` (the weekday, pipeline.94) + `ref` — `pageRefOf(ask)`, six letters a–p from a sha1 of what was asked: `cp-POP-x-c113-PRESS-thu-kfbmdp`, its tension lines `…-PRESS-thu-kfbmdp-tension`. A weekday alone is not enough — one citizen takes several interviews a day (up to 5 on one doc). Letters only, like the weekday: the id reaches models and a letter cite matches `[A-Za-z-]+` (`checkLetterEligibility.js` PAGE_CITE_RE). A "filed:" line's ask carries its headline cut at 100 characters (`cron-desk-run.js` self-record), so each filing whose headline differs in those 100 is its own doc — 55 of 55 logged filings distinct (codex review F2). A "graded:" line keeps its own key (pipeline.77/79) and gets no day/ref; the scanner does not admit it either way.
- **work** (`scripts/cron-work-wake.js`, switch `PAGE_DAY_KEY`): `day` only — the shift fires Tue and Thu, so weekday separates a Cycle's two.
- **CONVO / INTERVIEW / DEBATE** (`scripts/citizen-exchange.js`, switch `PAGE_DAY_KEY`): `day` only. Folded because the exchange's INTERVIEW format is an interview and all three formats share the one write (`recordParticipant`). The exchange's once-a-day guard (`state.lastRunDate`) counts UTC dates (`today()`); the cron fires 17:00 Chicago, the same UTC date, so scheduled exchanges are 24h apart on distinct weekdays. A manual evening run past UTC midnight is the rerun class — it appends (codex review F1). Aligning `today()` to Chicago is not this build: it also seeds the interview pick and names the exchange file. DEBATE pages were never admitted by the scanner (its allowlist has no DEBATE), before or after this switch (codex review F3).
- `lib/citizenPage.js`: `ref` rides after the day, before any key, only with a day; a malformed ref is refused before any write. Own-words family usage still tests daypart + key, so a day/ref-keyed answer still records. `scripts/scanCitizenPages.js` splits `ref` off with the weekday; `slot` stays the daypart grammar, rows carry `day` and `ref`.

Switches held off through codex review — every one of these runs on a cron against this tree (`citizenVoice` on every desk run) — on 2026-10-30.

**The rerun contract (stated up front, pipeline.94's).** An interview is citizen, Cycle, weekday, ask: the same ask rerun the same day lands in its own doc again (the store appends), never a second doc. An ask whose text differs on the rerun (a regenerated packet) is a second interview — a second doc. A shift or an exchange is citizen, Cycle, weekday; a same-day rerun appends. None of the three writes the owed journal, so nothing is receipted either way.

**Ceilings.** Docs already merged stay as written. A doc appended after it was indexed still never refreshes in the index — now only on a rerun. A heavily interviewed citizen's 15 memory candidates fill with more interview docs than before (each answer is now its own candidate); the scorer still picks 3.

**Proof.** `lib/citizenPage.test.js`: ref shape and sha1→letters, refusal (no day, bad letters), day-then-ref-then-key, own words with day + ref; through an append store, three asks one Thursday = three docs and the rerun ask appends into its own; every PRESS, work and CONVO id the writer builds is admitted by the real scanner with the slot back to `PRESS` / `PRESS-tension-resolved` / `work` / `CONVO-tension`. Live asks: `pageRefOf` over every recorded ask on disk (`output/cron-compare/*asks.json`, 108 files, 380 recorded asks) — 0 repeated refs for one citizen within a run, 0 for one citizen on one Chicago day across runs (a floor: an asks file is overwritten per stem). `scripts/scanCitizenPages.test.js`: the split, and rejects a ref with no day, outside a–p, not six letters, or after the key. Page-reader suites green (articleContamination, beatSlices, buildLivesSlice, buildVoicesSlice, checkLetterEligibility, cronRheaPersonaGate, livedExperiencePacket, newsroomSourcing, wakeHealthPerception, cron-work-wake); wakePerception 182/183, the known snippet-cap failure.

**Review closed (codex HOLD, `docs/for-claude-review/2026-10-30-codex-pipeline96-page-event-key-review.md`, each verified).** F1 (UTC guard vs Chicago weekday) and F2 (two filings sharing a 100-character headline) need inputs the schedule does not produce — the stop test: neither changes what a citizen lives under the crons; both stated above. F3 (DEBATE not admitted) is pre-existing and was a plan error, corrected above. No code changed, so no re-review; the seat decided SHIP, switches on 2026-10-30.

Surfaced, not this build: a citizen's debate words never reach the newsroom corpus (the scanner allowlist has no DEBATE).

## Measured volume (C113)

4 chaos cars on citizens, 2 casino losses, 0 open hospital stays (3 rows, all discharged), 0 judicial rows → ~6–8 owed per cycle against ~21 wakes.

## Cost note

A wake is one call: deepseek-v4-flash-0731 via OpenRouter, reasoning off, 260 max tokens, no tools. OpenRouter has no batch tier; the Anthropic Batch API (50%) covers Claude models only. Batching these wakes saves little and adds a wait; not pursued. Desk writers on Claude models are where batch cost is worth measuring (separate question).

## Other desks (survey, read 2026-10-29)

Chaos Events read by: CivicOffice, CivicDomain, Jax, Transit. Hospital_Ledger: Health, Neighborhood, Lives. Judicial_Ledger: CivicDomain, Neighborhood, Safety. Casino_Ledger: Economic, Lives. Citizen pages/reflections: CivicOffice, Lives, Pulse, PSlayer, Voices. Lives reads no chaos events. Each desk that covers an event gains a recorded response once this lands; which desks carry it is a per-slice call after the build.

## Process

Wake selection is `lib/` — engine substrate: bench proof on the candidate, review, then PROD. Row opened on the builder's word 2026-10-29.

## Changelog

- 2026-10-30 (research-build) — pipeline.96 LIVE: codex HOLD (3) verified — F1/F2 off-schedule inputs, F3 pre-existing; plan claims corrected, live asks checked (380, 0 repeated refs). `PAGE_EVENT_KEY` + both `PAGE_DAY_KEY` on. Row done-pending-archive.
- 2026-10-30 (research-build) — pipeline.96 built (§pipeline.96, builder's word 2026-10-30): interview pages keyed by weekday + ask, work-shift and exchange pages by weekday, scanner splits both off; switches held off for codex.
- 2026-10-30 (research-build) — pipeline.94 LIVE: codex re-review SHIP-WITH-FIXES, its one fix (the plan promised a later wake past the window) folded; `PAGE_DAY_KEY` on. Row done-pending-archive; live proof at the next wake's page id.
- 2026-10-30 (research-build) — pipeline.94 codex HOLD (1) folded: rerun contract stated (a slot's second run is that wake — appended, nothing receipted); fixtures run through the real writer, same-day rerun added. Re-review sent (round 2 of 2).
- 2026-10-30 (research-build) — pipeline.94 built (§pipeline.94): the store appends under a taken page id; wake page keyed by weekday, scanner splits it off, owed page key matches; switch held off for codex.
- 2026-10-30 (research-build) — PROD: `OWED_RESERVE = 6`; round 6 cancelled under the round cap (§Build "Review closed"). Row done-pending-archive; live proof at the C114 fire.
- 2026-10-29 (research-build) — Codex round 5 HOLD (2) folded: page occupancy keyed by citizen + Cycle + daypart (no date), two-date test; Build intro trued; pipeline.94 filed. Round 6 sent.
- 2026-10-29 (research-build) — Codex round 4 HOLD (1) folded: the lock loser does not run; every owed-on wake journaled; a taken page key receipts nothing; Build table trued (journal, not shared state). Round 5 sent.
- 2026-10-29 (research-build) — Codex round 3 HOLD (3) folded: occurrence pins, no `failed` status, owed lock across live wakes, `owedPageStep` tested. Replay unchanged. Round 4 sent.
- 2026-10-29 (research-build) — Codex re-review HOLD (4) folded: per-occurrence shown matching, absorption held on an unread listed tab, SourceSystem required, two-phase owed journal. Replay unchanged (6 owed, all shown). Round 3 sent.
- 2026-10-29 (research-build) — Codex HOLD (6 findings) folded: shown-only receipts, admission-preferred lived line, status-split casino pins, reconcile rows skipped, per-tab reads, ageing + read-back. C113 replay unchanged (6 owed, all shown). Re-review sent.
- 2026-10-29 (research-build) — Built (§Build): owed list, per-Cycle absorption, owed slot, pinned event line, receipts; reserve held at 0 pending codex review. C113 live replay: 6 owed, all lines in perception.
- 2026-10-29 (research-build) — Builder: owed picks who wakes, the citizen is never told it owes a response (§What the citizen is shown). Proof plan: overnight dry replay of the owed draw on C113 hits, no writes; mark formation/expiry across cycles waits for the C114 fire.
- 2026-10-29 (research-build) — Builder ruled thresholds (casino: wager over 1,000, winnings over 500), R=6, M=2, absorption as set; row ready, build not started.
- 2026-10-29 (research-build) — Plan opened from the Tamsin C113 flag (stance lines quoted as speech; slice fed moods on a thin day). Slice side shipped same day: 7c5f390a, b26a4184, cf0e995f, bd1f0c28, 253cdde4.
