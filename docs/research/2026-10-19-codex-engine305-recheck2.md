---
title: Engine.305 Cut A final PROD recheck
created: 2026-10-19
updated: 2026-10-19
type: reference
tags: [engine, citizens, draft]
sources:
  - phase05-citizens/generateCitizensEvents.js
  - utilities/neighborhoodPulseMap.js
  - output/engine-sheet/2026-10-19-e305-receipt.js
  - output/engine-sheet/2026-10-19-e305-receipt-A-c113.json
  - output/engine-sheet/2026-10-19-e305-receipt-B-c113.json
pointers:
  - "[[plans/2026-10-10-engine-214-mood-per-hood]] — Step 8a Cut A"
---

# Engine.305 Cut A — final PROD recheck

**Verdict: SHIP for the proposed PROD stage 14.** Commit `ff54259b` closes the like-for-like bench evidence gap in my previous `engine305-recheck.md`. The candidate remains stage 13 plus exactly `phase05-citizens/generateCitizensEvents.js` and `utilities/neighborhoodPulseMap.js` at `ea777cae`; the stage 13/14 manifests change only those two hashes (`output/engine-sheet/stage13-e304.sha256:49,149`; `stage14-e305.sha256:49,149`). Current source hashes match stage 14, and neither production file changed after `ea777cae`. This is a review verdict on the deployable candidate, not a claim that PROD has been pushed or fired C113.

## Gap closure and limits

1. **Same Cycle lines — closed.** The A re-fire reset from the same C112 baseline, restored stage 13 byte for byte, and completed C113 PASS in 184 s (`output/engine-sheet/2026-10-19-e305-legA2.sh:9-20`; `2026-10-19-e305-legA2.log:1-17`). Its raw result reports 531 persisted intents with no persistence errors and 131 phases (`output/engine-sheet/benchfire-raw/e305A2-c113.json:1-8`, `:76-80`); the benchfire record has no new Engine_Errors and leaves live at C112 (`output/engine-sheet/2026-10-19-benchfires.jsonl:91`). One reader takes Cycle 113 rows and sorts `POPID`, `EventTag`, `EventText` for both legs (`output/engine-sheet/2026-10-19-e305-receipt.js:22-26`, `:42-45`). Both receipts report 2,300 lines and the same canonical hash `d83857fd755752be...` (`2026-10-19-e305-receipt-A-c113.json:1-5`; `2026-10-19-e305-receipt-B-c113.json:1-5`). I independently compared the two committed `.lines.tsv` files byte for byte: equal, 2,300 lines each. The TSV files have a final newline; their raw-file SHA differs from the reader's hash of `lines.join('\n')`, as the reader specifies. The new A saved Sentiment also equals the original A on all 22 hoods (`2026-10-19-e305-receipt-A-c113.json:6-29`; `2026-10-19-e305-A-c113.json:4-27`). Thus the earlier 46-versus-651 readback mismatch was a reader-definition artifact, not evidence of a changed event set.

2. **Pulse sign and event-count implication — closed with an explicit estimate limit.** The receipt replays each citizen's first logged generator row through the real pulse map under old and new kinds (`output/engine-sheet/2026-10-19-e305-receipt.js:27-41`). Across its 22 hood estimates, old sentiment totals 271, new 165, and 53 first-draw Neighborhood-Down rows account exactly for the −106 difference; each hood satisfies `new = old − 2 × Neighborhood-Down`, and A/B estimate objects are equal. For example, Fruitvale is 29→13 on eight Down rows, Uptown 30→8 on 11, and Lake Merritt 24→8 on eight (`2026-10-19-e305-receipt-A-c113.json:49-65`, `:85-89`; B at the same lines). The estimated pulsing-event count is 351 in either leg. This is **not a direct runtime `S.neighborhoodPulse` capture**: the reader notes that if admission dropped a citizen's first draw, the next logged row can be mistaken for the pulse row (`2026-10-19-e305-receipt.js:1-5`, `:28-30`). The estimate cannot establish the absolute live accumulator values. That limitation does not change the stage decision: admission precedes both the write and the one `ev === 0` pulse call (`phase05-citizens/generateCitizensEvents.js:3563-3575`, `:3648-3652`, `:3664-3676`, `:3681-3690`); the only stage-14 call change substitutes `pulseKindForLine_(lineKind, primaryTag)`. For a written Neighborhood Down line, the pulse map changes sentiment +1 to −1, while either map entry is nonempty and `recordPulse_` increments `events` once (`utilities/neighborhoodPulseMap.js:28-33`, `:122-149`). No new draw or second pulse call exists. Equal written lines, this source boundary, and the saved map direction jointly support unchanged event volume and the intended sign change; they do not require treating the estimate as measured accumulator state.

3. **Saved effect and PROD preflight — closed for candidate review.** The paired saved Sentiment is lower in 15 hoods by 0.01–0.07, unchanged in seven, with all five zero-Down-estimate hoods unchanged (`output/engine-sheet/2026-10-19-e305-receipt-A-c113.json:6-29`, `:109-119`, `:127-137`, `:151-155`; `2026-10-19-e305-receipt-B-c113.json:6-29`). Four hoods with Down estimates remain unchanged after the writer's volume normalization, cap, and rounding (`phase08-v3-chicago/v3NeighborhoodWriter.js:278-286`, `:524-530`); the saved outcome is consistent with that contract. Commit `ff54259b` reports a clean PROD dry run, though it does not commit its stdout. The push script freshly compares the PROD pull to stage 13 and the built tree to the benched stage-14 manifest before its dry-run exit (`output/engine-sheet/2026-10-19-push-e305-prod.sh:16-27`), and requires a post-push pullback match (`:31-37`). Those checks must pass when engine-sheet performs the authorized deployment; this review did not run the script or touch PROD.

**Validation by Codex:** local artifact comparison and receipt arithmetic only. The prior recheck ran `node scripts/testNeighborhoodLoop.js` (35/35); no production code changed since. No bench fire, Sheet read, or deployment performed in this review.

**2026-10-19 correction:** In finding 3, **two** hoods with Down *first-draw estimates* remain unchanged (West Oakland and Eastlake), not four. The four figure counted hoods with any written Down line, including lines that the receipt does not estimate as a first-draw pulse. The five zero-Down-estimate hoods are unchanged as stated (`2026-10-19-e305-receipt-A-c113.json:109-119`, `:127-137`, `:151-161`; B at the same lines). The SHIP verdict is unchanged.
