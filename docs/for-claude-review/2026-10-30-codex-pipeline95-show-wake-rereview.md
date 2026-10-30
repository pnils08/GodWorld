---
title: pipeline.95 show wake re-review of b551a063
created: 2026-10-30
updated: 2026-10-30
type: reference
tags: [media, undocked, citizens, pages, active]
sources:
  - commit b551a063
pointers:
  - "[[2026-10-30-codex-pipeline95-show-wake-review]] — first review"
  - "[[../plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots]] — section 6.6"
---

# pipeline.95 show wake re-review

**Verdict: HOLD.** The fold settles F1, F5 and the cited F6 leak, and the builder has decided F2's flip boundary. It leaves an ambiguous-error resend that can double a night, lets show docs consume the persona recall limit before filtering, and cannot recover a mark appended behind a malformed owed-journal line. `ON` remains false (`scripts/undockedShowRecord.js:11-14`). This is source inspection only: I ran no tests, model/wiring-card call, network call, or live Cycle.

## Findings

1. **F3 remains — a returned error can mean a landed page.** `pageNights` saves `pending` before the send, but deletes it on every `{error}` and retries the night (`scripts/cron-undocked-run.js:290-301`). `appendReflection_` can return `{error}` after its POST reached the store: `fetch` or `r.json()` can throw while reading the response (`lib/citizenPage.js:165-175,188-190`). The store appends a repeat under the same customId (`lib/citizenPage.js:61-67`). Input: the store accepts synthetic episode `undocked-pop90001-a`, then the client loses its response; `appendReflection_` returns an error. Wrong output: the fold removes the pending receipt, and the next run sends the same episode again, making its page contain the night twice. The new crash-after-send fixture only throws during the second receipt save after a successful stub response (`scripts/cron-undocked-run.test.js:116-127`); its failed-response stub never simulates a landed doc (`:92-99`). A returned error is safe to retry only if it proves the POST was not accepted.

2. **F4 remains in the recall limit — type filtering happens after selection.** `recentPage_(id, 6)` sorts all docs and takes the six newest before fetching them (`lib/citizenPage.js:244-269`); only then does `augment` remove type `show` (`lib/personaProvider.js:442-454`). Input: a pilot has six newer show docs and one older genuine reflection. Wrong output: the six show docs fill the read limit and are discarded, so the prompt has no “Your own memory” reflection even though that reflection exists. With one show doc among the newest six, the sixth genuine reflection is similarly displaced. The type gate fixes false attribution of a returned show doc but does not preserve six reflection candidates.

3. **F7 remains for a malformed journal — an appended mark cannot be read back.** A malformed line makes `owedStateFrom` throw before it can collect any later receipts (`lib/wakePerception.js:1109-1128`), and the wake uses the old state with `held` set (`scripts/citizen-wake.js:273-283`). The fold keeps `showOwed` available for a lottery pilot and journals `shownShow` (`scripts/citizen-wake.js:306-309,329-332,432-439`), but `appendOwedJournal` only checks that the new line occurs in the same file; it does not repair the malformed line (`scripts/citizen-wake.js:61-67`). Input: the journal begins with one malformed line, an unspent C113 pilot is drawn by lottery, and their page lands. Wrong output: a `shown` line for the mark is appended, but every later journal read still throws at the earlier line, so the spend and page key remain invisible; another draw can receipt and append the same flight wake again. Holding the reserved slot does not make this spend durable to the consumer.

## Settled claims and boundaries

- **F1 closed in source.** `showMarkSpent` selects only the newest unspent mark (`lib/wakePerception.js:1098-1102`), and the wake uses that selection (`scripts/citizen-wake.js:329-332`). The new two-Cycle assertions can fail if either the newest selection or the older remaining mark changes (`lib/wakePerception.test.js:672-676`).
- **F2 decided.** The plan explicitly starts the guarantee at the switch-on Cycle and lets C112 backlog lapse (`docs/plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots.md:175-176`). For three eligible pilots with current-Cycle marks, a readable journal, and three later scheduled show wakes, the source orders current marks first and has three slots (`lib/wakePerception.js:1069-1095`; `scripts/citizen-wake.js:307-316`). I found no additional steady-state loss input in that stated case. This is a source conclusion, not a live scheduling proof.
- **F3 partly closed.** A crash after a successful page response leaves `pending`, which `nightsToPage` skips (`scripts/cron-undocked-run.js:266-285,290-305`). Temp plus rename avoids an in-place partial JSON write (`:271-275`). A crash after saving `pending` but before sending can strand a night with no page; the plan expressly accepts a possible missing night (`docs/plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots.md:177`).
- **F5 closed in source.** No archive plus an empty or absent feed systems list stays unknown (`scripts/undockedShowRecord.js:86-99`); the new empty-list assertion checks that distinct case (`scripts/undockedShowRecord.test.js:68-69`). **F6's cited leak closed in source:** the whole captain-log entry is rejected on the cited POPID, episode prefix, date, model, and handoff inputs (`scripts/undockedShowRecord.js:17-21,142-150`); the new assertions have both rejected and accepted examples (`scripts/undockedShowRecord.test.js:73-79`).
- **Switch-off output changes when show docs already exist.** `augment` filters type `show` without consulting `ON` (`lib/personaProvider.js:442-454`; `scripts/undockedShowRecord.js:11-14`). Input: `ON=false` and an existing show doc among the six recent page docs. Output now omits it from persona recall, where the parent included it. With no show docs, this fold makes no persona output change. The new assertions do not exercise persona recall or held-journal recovery; the receipt assertion that no `.tmp` remains after a successful run (`scripts/cron-undocked-run.test.js:132`) can fail, but does not establish crash durability.

**Gate:** resolve the ambiguous page response before the switch is flipped; preserve reflection recall candidates after type filtering; make held-journal spend readable or avoid writing a page whose mark cannot be recovered. No source-only claim here establishes deployment, store state, or a live wake.
