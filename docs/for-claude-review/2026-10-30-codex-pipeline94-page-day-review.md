---
title: pipeline.94 page-day review of f2a94b34
created: 2026-10-30
updated: 2026-10-30
type: reference
tags: [media, citizens, wakes, active]
sources:
  - output/codex/TASK-2026-10-30-pipeline94-page-day.md
  - commit f2a94b34
pointers:
  - "[[../plans/2026-10-29-owed-responses]] — pipeline.94 build"
---

# pipeline.94 page-day diff review

**Verdict: HOLD on flipping `PAGE_DAY_KEY` to true.** The weekday separates two same-daypart wakes on different weekdays of a normal Cycle, and the inspected reader paths accept the new ID. It does not give each wake a separate page when the same daypart is rerun on the same Central weekday. The plan names only a Cycle longer than a week as the remaining collision, but the ordinary repeat input is enough.

## Finding

1. **HOLD — a same-day rerun still merges two wakes, and the later words can disappear from the local page index.** `scripts/citizen-wake.js:20-22,44-48` permits a forced citizen; `lib/wakePerception.js:864-885` also repeats the same rotation draw for the same Cycle, daypart, Central date, and unchanged pool. The proposed page key is only citizen, Cycle, daypart, weekday (`lib/citizenPage.js:133-135`; `scripts/citizen-wake.js:261-262,411-415`). Input: run C113 morning for one citizen twice on Thursday, either by rerunning the cron or forcing that citizen. Both POSTs use `cp-POP-xxxxx-c113-morning-thu`; under the store behavior documented by this commit, the second reflection appends into the first document. If the first document was already indexed, `scripts/scanCitizenPages.js:238,246,259-264` skips that `docId` on the next dump, so Lives still takes the first 240 characters (`scripts/buildLivesSlice.js:131-138,424`) and Voices still sees the old indexed content (`scripts/buildVoicesSlice.js:90-103,160-181`). If an unspent owed event reaches the second wake, the first journal entry makes `pageTaken` true; `scripts/citizen-wake.js:406-415` writes the event-bearing reflection but puts no event ID in the second receipt. The event remains owed even though the page now contains the words. The weekday key therefore handles different weekdays, not every second wake in one Cycle. A repeat within one day is a collision even when the Cycle lasts exactly one week.

   The new same-weekday fixture (`lib/wakePerception.test.js:611-630`) already demonstrates the merge and empty second receipt, but calls its input “a Cycle longer than a week.” It supplies October 29 and October 30 while forcing `thu` for both; `pageDayOf` would return `fri` for October 30 (`lib/citizenPage.js:69-73`). That stub is useful for key equality, but its date/weekday pair cannot prove that the only real collision needs an eight-day Cycle. An explicit same-date rerun fixture and a decision about whether a rerun should append or be idempotent are needed before the switch.

## Checked paths and transition

- **Reader admission: SHIP for the new ID shape.** `scripts/scanCitizenPages.js:52-78` splits `morning-thu` and `morning-thu-tension` into `day=thu` and the existing `slot` grammar. Lives and Voices filter that normalized `slot` (`scripts/buildLivesSlice.js:75,135`; `scripts/buildVoicesSlice.js:38,90,160`). Pulse reads the admitted index rows and carries the full ID as provenance (`scripts/buildPulseSlice.js:101,161,215`). Letter citation accepts letters and hyphens and resolves the exact ID (`scripts/checkLetterEligibility.js:133,153-167`). Rhea resolves the exact source ID (`scripts/cron-rhea-gate.js:395-409`); newsroom sourcing and packet evidence pass it through (`scripts/newsroomSourcing.js:341-371`; `scripts/livedExperiencePacket.js:756-759`); article contamination extracts the POPID prefix (`scripts/articleContamination.js:136-141`); the desk's grade suffix check concerns graded reporter posts (`scripts/cron-desk-run.js:1508-1520`). I found no weekday-specific rejection in these paths. The scanner's no-refresh behavior above remains a reader limit for any appended document.
- **Cycle boundary: SHIP for the observed schedule, with a source limit.** The log shows C111 Sunday night then C112 Monday morning, and C112 Sunday night then C113 Monday morning (`logs/citizen-wake.log:32,47,347,362`). `scripts/citizen-wake.js:238` resolves the Cycle from the local world summary through `lib/getCurrentCycle.js:35-45,64-102`, while `pageDayOf` uses the Central weekday (`lib/citizenPage.js:69-73`). Those observations support seven distinct weekdays in the observed Cycles; they do not prevent a same-date repeat, an explicit `--cycle`, or a delayed fire.
- **Mid-Cycle switch: no new false receipt found from the format change alone.** With `PAGE_DAY_KEY=false`, both the page and journal omit the weekday; after a new process starts with it true, both include the weekday (`scripts/citizen-wake.js:262,406,411-415`; `lib/wakePerception.js:1085-1088`). `owedStateFrom` keeps the old page key and spent IDs but does not rewrite them (`lib/wakePerception.js:1064-1082`). Thus an old-format `shown` line still points to the old page, while a later new-format wake can write and receipt its own new page. An old `pending` line after an uncertain page failure can still count an event spent without a confirmed page (`lib/wakePerception.js:1059-1063,1079-1080,1099-1106`); that is the existing pending-write policy, not a new weekday mismatch. The local owed journal was absent, so this transition is source analysis, not a live-journal reconciliation.

## Evidence and gate

Offline runs: `node scripts/scanCitizenPages.test.js` passed; `node lib/citizenPage.test.js` passed 49/49; `node lib/wakePerception.test.js` passed 181/182, with only the pre-existing `snippet capped at 180` failure (`lib/wakePerception.test.js:454`). The new wakePerception store stub appends on a taken ID (`lib/wakePerception.test.js:597-600,611-617`), matching the commit's stated rule, but it constructs the page ID separately from `appendReflection_`; the citizenPage fetch stub checks ID shape, not service behavior (`lib/citizenPage.test.js:66-79`). The local index contains 2,203 rows, 330 with the append separator; that snapshot supports the historical merge observation, not a live service guarantee. No live wake, Sheet, model, store, scanner dump, or wiring-card call was made; the task forbids network calls, which overrides the usual wiring-card instruction.

**Gate:** keep `PAGE_DAY_KEY=false` until the owner settles the same-day rerun contract and proves, with a feasible same-date fixture, that a second wake either gets its own visible indexed page and correct owed receipt or is prevented before page and receipt writes. PRESS and work page merging remains outside this build.
