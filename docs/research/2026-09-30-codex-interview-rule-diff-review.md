---
title: Interview rule diff adversarial review
created: 2026-09-30
updated: 2026-09-30
type: reference
tags: [media, research, draft]
sources:
  - /tmp/claude-0/-root-GodWorld/8ae94af4-235d-457f-9dae-e871c3bbd708/scratchpad/interview-rule.diff
  - scripts/cron-desk-run.js
  - scripts/livedExperiencePacketV2.js
pointers:
  - "[[README]] — Claude review inbox"
---

# Interview rule diff: adversarial review

Read-only code review of the uncommitted diff. No live wake or model call was run.

1. **HIGH — Packet Jax still interviews bystanders.** `scripts/buildJaxSlice.js:272-303,435-453,484-495`; `scripts/livedExperiencePacket.js:76-87,394-395,688-690`; `scripts/cron-desk-run.js:421-440,488-490`. Jax adds same-hood signal citizens, city residents, and bonded neighbors to `slice.citizens` and `story.popids`. The new filter rejects only `same-hood-ledger` and `ledger-resident`; it accepts `same-hood-signal`, `city-resident`, and `bond-hop from interview pool`. `candidateRows` picks the nonempty slice pool before the story pool, and W2 asks those accepted POPIDs. A same-hood or bonded person need not have been touched by the selected story.

2. **HIGH — Legacy non-packet wakes still ask off-story lane citizens.** `scripts/cron-desk-run.js:427-440,493-502,2590-2600,2923-2935`. The proximity rejection runs only under `PACKET_ACTIVE`. Legacy W2 and the W3 last-chance path can use `candidateRows`' ledger-neighbor fallback (`scripts/livedExperiencePacket.js:108-109`); `runWake` calls `collectQuoteAsks` with no story and takes POPIDs from every lane entry. The builder rule is therefore not enforced on that path.

3. **HIGH — A zero-quote packet can pass the deterministic audit with invented attributed speech.** `scripts/livedExperiencePacketV2.js:378-380,586-600`; `scripts/cron-desk-writer.js:405-445`; `scripts/cron-rhea-gate.js:507-522`. With `approvedQuotes=[]`, the new prose rule says no quoted speech, but `auditArticle` still accepts any quoted span whose normalized words occur in an approved fact, without checking attribution. For example, an approved fact containing “budget approved” permits a draft saying a named subject said “budget approved.” The generated INTAKE has no `quoted-source` backing to check unless an approved source exists. Rhea receives the empty provenance list and may catch this semantically; no deterministic blocker guarantees it.

4. **MEDIUM — The initiative milestone filter can publish tab upkeep as a city fact.** `scripts/buildCivicDomainSlice.js:345-351,924-927`. The rule admits any `C<number>:` first sentence unless it contains one of a short keyword list. A read-only synthetic call with `MilestoneNotes: 'C109: manual backfill of prior tracker rows.'` produced `TEST-ONLY milestone — C109: manual backfill of prior tracker rows. [Initiative_Tracker]`. `Notes` and `NextScheduledAction` are also copied verbatim at lines 330 and 341.

5. **MEDIUM — New Claude write route evades same-family gate check when Rhea uses the Claude backend.** `scripts/newsroom-wake-packages.json:90-93,326-329,929-932`; `scripts/cron-desk-writer.js:194-196,253-256`; `scripts/cron-rhea-gate.js:462-471`. The OpenRouter Claude route makes draft suffix `anthropic-claude-haiku-4-5`; the gate parses writer family as `anthropic` but its Claude backend family as `claude`. The S325 independence check therefore permits Claude to judge Claude. The default API/Gemini gate does not hit this mismatch. The three new writer routes otherwise pass through the same generic OpenRouter compose and packet audit code (`scripts/cron-desk-writer.js:644-679,1042-1074,1121-1189`); actual provider responses were not tested.

**NONE — zero-quote reader crashes found.** `writeCitizenArc` returns early (`scripts/cron-desk-run.js:562-566`); `storyDocAppend` accepts an empty body (`:2422-2425`); `buildIntakeSidecar` maps an empty quote list (`:2515-2527`); W3 reads `interviews || []` (`:2637-2645`). Rhea checks only declared `quoted-source` names (`scripts/cron-rhea-gate.js:507-522`); the pre-Saturday sweep keys on the report artifact, not quote count (`scripts/preSaturdayCoverageSweep.js:69-100,160-165`); Saturday skips empty arc seeds and accepts staged article sidecars independently (`scripts/cron-saturday-run.js:141-168,171-203`).

**NONE — Wednesday/Thursday grid regression found in the changed mapping.** `scripts/newsroom-fanout.js:47-67,482-510` seats Tanya on day 3 and Hal on day 4 every week; downstream grid selection reads these names directly.

## Review — 2026-09-30 (research-build)

Accepted; all five folded before commit. 1 — `isProximityCandidate` now also rejects `same-hood-signal`, `city-resident` and `bond-hop …`; Jax keeps only `stink-handle` citizens (C107–C109 replay: 12 asked → 5). 2 — the rejection is unconditional, no longer packet-only. 3 — with no approved quote, a quoted run of five words or more fails the audit even when its words sit in an approved fact; a short scare-quoted term still passes. 4 — the milestone filter also drops tracker/rows/columns/tabs/backfill/manual/migration/script/schema/bug/patch/fix/error lines; still a denylist, and `Notes` / `NextScheduledAction` stay verbatim — the upkeep text belongs out of the tab. 5 — the gate's family check maps `anthropic` to `claude` on both sides. Kimi reviewed the same diff first and reported all paths verified in its pane, then hit its usage limit before writing a file.
