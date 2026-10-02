---
title: Kimi adversarial review — pipeline.68 sourcing modes + Civis Systems Journal
created: 2026-10-01
updated: 2026-10-01
type: reference
tags: [media, citizens, draft]
sources:
  - docs/plans/2026-09-07-beat-slices-from-sheets-plan.md
  - docs/for-claude-review/2026-10-01-codex-sourcing-modes-build-done.md
  - docs/canon/INSTITUTIONS.md
pointers:
  - "[[plans/2026-09-07-beat-slices-from-sheets-plan]] — owning build spec"
  - "[[for-claude-review/2026-10-01-codex-sourcing-modes-build-done]] — the build under review"
---

# Kimi review — pipeline.68 (worktree `/root/GodWorld-pipeline68`, branch `pipeline68-sourcing-modes`)

Reviewed all six commits `main..HEAD` (`e240bf0a`, `08438404`, `51a01354`, `9a0d3423`, `65c8a5f3`, `c875e9b2`). Per-commit stats match codex's DONE file; the extra paths in a bare `git diff main..HEAD --stat` are main-side drift shown by the two-dot diff, not branch content. All 12 targeted suites re-run by me locally: PASS. One of the three approved paid dry-runs spent; both model routes failed deterministically, and per the brief I recorded the errors and stopped rather than burn attempts 2–3. Review brief deleted on pickup per the inbox convention.

## Hunt 4 + 7 — the dry-run and the model route (findings first, they gate the rest)

**F1 — FIX. Reasoner route is dead as coded: OpenRouter rejects the model id itself.**
Dry-run #1 (2026-10-01, `--cycle 109 --dry-run --input-root=/root/GodWorld`), verbatim stderr:
`Civis reasoner failed or returned invalid output: reasoner: deepseek/deepseek-reasoner is not a valid model ID`
Not the key's 403 history (`docs/research/2026-09-15-kimi-civic-lane.md:70-75`) — an invalid-model-ID rejection at `scripts/civisJournal.js:13,179`. The primary route never reaches the network in a billable sense.

**F2 — FIX. The Sonnet fallback is on the wrong rail — dead by construction in the live environment.**
Same dry-run, verbatim stderr:
`Civis Sonnet fallback failed: 400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."},"request_id":"req_011CfcgCFNYSvWSDxv8bzrq5"}; skipping C109`
`callSonnet` (`scripts/civisJournal.js:183-190`) builds `new Anthropic({ apiKey: ANTHROPIC_API_KEY })` — the direct API, which holds no credits. The plan named "the production SDK Sonnet 5.5 route (research.28)" as the fallback; research.28's production route is the Anthropic SDK against **OpenRouter's** baseURL with the OpenRouter key (`scripts/cron-saturday-run.js:643-653`, `NARRATOR_PROVIDER` default `openrouter`, proven 2026-10-01 on the C108 digest per `docs/research/2026-10-01-model-fit-open-character-results.md:114`). As built, both routes fail in the live environment by construction, so every Cycle skips. The model id form `claude-sonnet-5-5` matches `anthropicSlug`'s direct-API rewrite (`cron-saturday-run.js:640-642`), so the id itself is plausible — the rail is the bug.

**F3 — verified OK. "Skip the Cycle, write nothing" is what the code does.**
The real dry-run printed `{"skipped":"model-failure"}` after two loud stderr lines and wrote nothing (no `output/civis-journal/`, no page write). I additionally exercised the both-fail path offline with stubbed reasoner/sonnet/page against a synthetic fixture: result `{skipped:'model-failure'}`, two stderr lines, zero artifacts, `appendReflection_` never reached. Exit code on skip is 0 — see F5.

**F4 — FIX. No test covers the both-fail path.**
`scripts/civisJournal.test.js:81-85` covers reasoner-fail + sonnet-success only. The both-fail skip — the path the live environment is on today — has no assertion. My offline stub confirms the behavior; the suite should pin it.

**F5 — NOTE. A skip exits 0.** `scripts/civisJournal.js:285-286` sets no `process.exitCode` on `skipped`; the DONE file already warns "command exit alone does not prove a journal entry." A distinct non-zero code (or a marker line the run-cycle step greps) would make the es wiring mechanical instead of conventional.

**F6 — NOTE. `max_tokens: 3500` on the reasoner** (`civisJournal.js:174`). The orBatch lesson is reasoning consuming the budget and billing anyway (`docs/research/2026-09-21-batch-cost-and-model-variety.md:105,154`); on this route that degrades to a parse failure → fallback. Acceptable once F1/F2 land; size it for reasoning + answer.

**F7 — BLOCKED (review coverage, not a code defect). Zero journal entries exist to judge.**
One of three approved dry-runs spent; both routes failed with the F1/F2 errors; the brief says record the error text and stop. No staged `output/civis-journal/civis_journal_c*.md` exists anywhere. The entry-level blanket judgement (decimals, dial names, severity words, POPIDs, tab names, detector ids, non-Civis engine words, invented Civis history, off-dump names, Oaks/Paulson frequency, forward-move count) **must be re-run against real entries after F1/F2 are fixed.** What I could judge pre-model, I did: the translation table (`civisJournal.js:39-52`) renders every C109 audit pattern type with no decimal, dial name, severity, POPID, tab name or detector id; initiative names enter only via `f.Name` (Tier-1 canon); `affectedEntities.citizens` (which carry POPIDs in the audit JSON) never reach the prompt; `loadFrame` throws on any audit/beats/previousCycle mismatch and on a finding target absent from the current dump (`civisJournal.js:103-105,122-124`). Civis history/products/hires/contracts: none invented by the writer — the prompt forbids unsupplied company acts and the names set is dump-derived plus the five seeded canon names.

## Hunt 5 — the node assertion has a proven hole (FIX)

**F8 — FIX. I constructed blanket-violating prose that passes `assertEntry` with zero failures.**
Verified against the real function (446 words, `ok: true`, no failures):
> "…The ledger reads Fruitvale like a wound the city keeps reopening, and I intend to snapshot its drift before the next phase begins, because a dial that drains without answering is a system failing the people it measures.…"

*ledger*, *snapshot*, *phase*, *dial*, *drains* — every one on the brief's forbidden engine-vocabulary list — sail through. A second variant, "It was a medium reading in Temescal" (severity word as a rating), also passes. The holes, by regex: `civisJournal.js:134` (`POPID|POP-|BIZ-|INIT-|AUD-|DialState|severity|detector|worksheet|spreadsheet|sheet|tab|JSON`) omits *engine, ledger, dial, drain, write-back, snapshot, phase, cycle*; `:137` catches only the enumerated CamelCase dial names plus a generic CamelCase pattern, so a lowercase dial word like *integrity* passes; nothing checks *medium/low/high* as ratings. Related: the Oaks/Paulson guard counts **lines** (`:140-141`), so two mentions on one line pass. The assertion is the only automated gate on this prose (Rhea's decimal scan is retired and the journal never goes through Rhea) — it needs the vocabulary list before the first live entry ships.

## Hunt 2 — cross-pool leak (one real construction bug)

**F9 — FIX. `CIVIC_EMPLOYERS` never matches OUSD or OPD; OARI has no business row.**
`newsroomSourcing.js:12` tests `/\b(?:BART|AC Transit|OARI|OUSD|OPD|Hospital)\b/i` against the Business_Ledger **Name**. Live names: `Oakland Unified School District` (BIZ-00016), `Oakland Police Department` (BIZ-00024) — neither contains "OUSD"/"OPD"; no OARI row exists in the dump. Only `AC Transit` (BIZ-00013), `BART Oakland Division` (BIZ-00014) and `Oakland Hospital` (BIZ-00015) can ever produce city-worker candidates. Rachel Torres (`offices`; OPD and OARI are her beat) can never draw a city worker — tier-1 statements or silence, every cycle, silently. The plan's pool is "(BART, AC Transit, OARI, OUSD, OPD, the hospital)". Join on a BIZ_ID allowlist, not a name regex.

**F10 — FIX. The beats reads have no freshness guard and fail silently empty.**
`rows()`/`ledgerRows()` (`newsroomSourcing.js:18-30`) wrap reads in try/catch → `[]`, and `buildPool` never checks `output/beats/meta.json` cycle for the `named`/`workplace`/`offices` modes. Consequences: (a) a stale dump (dumpBeatTabs didn't run for the Cycle) admits stale roster/office rows stamped as current evidence; (b) a missing or unreadable core tab (Employment_Roster, Business_Ledger) is indistinguishable from an empty join — the seat files quoteless with no loud error, exactly the silent-fallback class the S434 dump doctrine ("missing dump throws naming `dumpBeatTabs.js <cycle>`") removed. `street()` does check snapshot meta cycle (`:206-207`); the other three modes need the equivalent, and a missing core tab should throw, not read as `[]`.

**F11 — NOTE. `named()` still subtracts by why-prefix denylist.** `newsroomSourcing.js:66-67` rejects `same-hood|ledger-resident|city-resident|bond-hop` whys but admits any other slice-row why — the Angela "educator on the ledger in Rockridge — none in KONO" bystander pattern would still pass under a novel label. Mitigated: admission is otherwise positive (the typed slice row itself must name POPID+name), and every `named`-mode seat's slice names story subjects. Residual, construction-possible.

**F12 — NOTE. W1 plan targets outside the pool are dropped silently.** `cron-desk-run.js:496-501` filters `angleRead.plan.targets` to `packetCandidates` with no log line; the out-of-pool throw at `:466` is unreachable from this path. Fail-safe direction (the model cannot inject a target), invisible when it fires.

**Where `candidateRows` is still reachable:** only the `!PACKET_ACTIVE` legacy branch (`cron-desk-run.js:437`); all 25 registry packages are `packetContract: "v2"`, so the production path never touches it. `buildAnglePacket`'s `modeCandidates === undefined` fallback (`livedExperiencePacket.js:394`) is unreachable from cron-desk-run (candidates always passed, empty array included). The rest-cap waiver cannot fill an empty packet pool — `rested[]` only fills when `!PACKET_ACTIVE` (`:457`). **W2 subset enforcement is real:** pool candidate must echo in the W1 packet with matching pop + sourceKind + JSON-equal evidence (`:434-441`), `office-record` rows are excluded from W2 asks (`:450`), and an out-of-pool W2 target throws (`:466`). No path to a borrowed quote found. A `why` string confers no admission anywhere — it rides into the W2 packet as basis colour only (`livedExperiencePacket.js:740`).

## Hunt 3 — `office-record` through the gates (clean, two notes)

**F13 — verified OK.** Full trace: `officeSources` joins statements by exact initiative id or exact topic (`newsroomSourcing.js:127-135`), reads only exact-cycle files (`_c{N}.json` filename filter **and** `doc.cycle === cycle`, `:112-117`), copies `s.quote` only — **`fullStatement` is never read** (confirmed against the live file shape, `output/civic-voice/transit_hub_c109.json`) — and resolves the holder against an active `Civic_Office_Ledger` row. runReport re-verifies every record against the file and throws on mismatch (`cron-desk-run.js:2472-2476`); runWrite re-checks pool membership + verify + quote presence (`:2588-2597`); W3 emits the quote as `sourceKind: 'office-record'` with `factIds: []` — it never becomes an `approvedFact` (`livedExperiencePacketV2.js:306-321`); Rhea re-verifies against the live file at `packet.cycle` and blocks high on any mismatch (`cron-rhea-gate.js:511-525,538-540`). A forged quote, a prior-cycle file, or a stale holder fails loud at three independent points. Office silence is logged (`cron-desk-run.js:2483-2485`) and stamped into the packet.

**F14 — NOTE. Rhea's packet-load catch downgrades the provenance gate to a warning.** `cron-rhea-gate.js:527`: any exception inside the try — including a disk error inside `verifyOfficeRecord` — becomes `log.warn('intake packet load failed (backing check skipped)')`. Pre-existing shape, but the new office check inherits it.

**F15 — NOTE. A canon name-form collision is queued up.** Live civic-voice speakers use the ledger form — `output/civic-voice/transit_hub_c109.json` says "Elena Soria Dominguez"; the canon map rules "Eloise Soria-Dominguez" (`docs/canon/INSTITUTIONS.md:420`). If the writer substitutes per canon, Rhea's backing check fails the quote (loud block); if it doesn't, the E93 form reaches print. The first `offices` cycle that draws transit_hub hits this.

## Hunt 1 — remaining silent-fallback inventory

Beyond F10/F14: `readJson` catch→null (`newsroomSourcing.js:15-16`) makes a corrupt `simulation_ledger_snapshot.meta.json` read as an empty street pool (silent quoteless — same class as F10, folded there). `officeSources` readdirSync catch→[] (`:114-116`) is acceptably covered by the logged office-silence line. deliver-articles' absent journal logs `Civis Journal absent; skipping` (`deliver-articles.js:146`) — loud. **Everything else added in this diff fails loud**: `buildPool` throws on unknown mode; `collectQuoteAsks` throws when the sourcing pool is absent under PACKET_ACTIVE; runReport/runWrite throw on office-record mismatch; `loadFrame`/`beatDeltas` throw on cycle mismatch; a missing Varek agent file throws ENOENT before any write (`civisJournal.js:199-201`). `RECORDS_PIECE` (`cron-desk-writer.js:797`, untouched by the branch) still reads the enum correctly — `records` seats unchanged, quoteless `offices` pieces take the ordinary prose route with `officeSilence` visible in the injected state packet.

## Hunt 6 — replay and double-write (clean)

**F17 — verified OK.** Key `POP-00789:C{cycle}:journal` is stored in the staged JSON and in page metadata `extra.replayKey`. A same-cycle rerun with both artifacts present returns `already-recorded` **before** loadFrame or any model call (`civisJournal.js:229-233`; the test proves the model is not called, `civisJournal.test.js:90-93`). The page write uses customId `cp-POP-00789-c{cycle}-journal`, and `lib/citizenPage.js:57-66` is idempotent per (popId, cycle, daypart) — a page-success/file-failure retry reuses the same customId, so no page duplicate. A half-written pair (json without md) falls through to a full regenerate: page write stays a no-op, but a fresh model call is spent (trivial). The ordinary voiced-slot wake writes one of the five dayparts, never `journal` (`scripts/citizen-wake.js:374-375`), and `citizen-wake.js` is untouched by the branch — no collision, his home wake is unchanged.

## Hunt 8 — the three late edges

**F18 — NOTE (`9a0d3423`). A Saturday delivery can attach a journal from a different Cycle than the Pulse.** `latestJournal` picks the highest complete `.md`+`.json` pair with no cycle match and no age bound (`deliver-articles.js:82-88,144-151`): if C110's journal skips, C109's rides the C111 Pulse. That is the approved "latest complete pair" semantics, but there is no guard against a weeks-old journal. Half-written pairs are excluded; double-post is blocked by the filename delivery receipt; absent journal logs a skip. Two minors: the `.json` is checked for existence, not validity (codex's own test uses `{}`); a same-cycle artifact overwrite after delivery never re-delivers (state keyed on filename).

**F19 — verified OK (`65c8a5f3`).** What leaves the machine: exactly the full text of `IDENTITY.md`, `LENS.md`, `RULES.md` from `.claude/agents/citizen-voice-elias-varek/`, placed in the system prompt to OpenRouter and (fallback) Anthropic — rb approved this edge explicitly. A missing file throws ENOENT before any write or model call — loud. Note the dry-run reads the **main tree's** unamended LENS/RULES ("no engine language"); the prompt's precedence line ("the journal contract above governs") covers the conflict until es lands the amendments.

**F20 — verified OK (`c875e9b2`).** Delta strings interpolate only labels + `rose`/`fell` (`civisJournal.js:72-94`) — no raw number can ride out; a mismatched previous dump throws (`:57-59`, test-pinned). Trivial: `Crime_Metrics` hood names are not in the allowed-names set (loadFrame reads Neighborhood_Demographics/Civic_Office_Ledger/Initiative_Tracker/Business_Ledger only) — a model echoing a crime-only hood fails the assertion; fail-safe direction.

## Verdict

Build A (sourcing modes) is mechanically sound: pools are positive-join, frozen, evidence-carrying; W2 ⊆ W1 is enforced with a throw; no borrowed-quote path exists; the legacy fallback is production-unreachable. Build B's writer fails safe and loud on every failure I could construct — the two live failures today are route configuration, not mechanism. Nothing found rises to BLOCK: no canon contamination, no silent quote borrow, no half-written external state.

**SHIP-WITH-FIXES:**

1. **F1** — reasoner model id: `deepseek/deepseek-reasoner` is rejected by OpenRouter as invalid; seat a current reasoner id (or another OpenRouter route) before the first live journal run.
2. **F2** — move the Sonnet fallback onto the research.28 rail (Anthropic SDK → OpenRouter baseURL + OpenRouter key), or accept a fallback that is credit-dead by construction.
3. **F8** — extend `assertEntry` with the engine-vocabulary list (engine, ledger, dial, drain, write-back, snapshot, phase, cycle-as-system) and severity-rating words (medium/low/high) before any live entry ships; the assertion is the journal's only automated gate.
4. **F9** — replace the `CIVIC_EMPLOYERS` name regex with a BIZ_ID allowlist (BIZ-00013/00014/00015/00016/00024 + OARI's row when one exists); Rachel's city-worker pool is empty by construction today.
5. **F10** — check `output/beats/meta.json` cycle in `buildPool` for named/workplace/offices, and throw (not `[]`) on a missing core tab.
6. **F4** — pin the both-fail skip in `civisJournal.test.js`.

After 1–2 land, the deferred entry-level blanket judgement (F7) must run against real entries — that review is owed, not waived.

## Correction — 2026-10-01 (kimi)

F19's last sentence is wrong as written: es's LENS/RULES amendments had already landed on `main` (`52f9219c`, before the dry-run), so dry-run #1 sent the **amended** agent files — the "reads the instrument / authority is to publish" frame, not the old citizen "no engine language" version. The precedence line in the prompt is belt-and-suspenders, not load-bearing. No other finding is affected; the egress set (F19) and the run's inputs are unchanged.
