# civic/c113-autonomy-baseline — frozen C113 civic evidence (civic.46, Task A1 freeze half)

Saved local evidence from the C113 civic week, copied 2026-10-31 at HEAD `a24c9bfc`. Not a live Sheet read. `manifest.json` carries each file's source path and sha256 and the sha256 of the nine civic source files at the freeze, so a later run can tell "the fixture changed" from "the code changed".

| File | What it shows |
|---|---|
| `MAYOR-01_c113.json` | mayor pack: 12 board IDs, board text clipped at 600 chars partway through INIT-005 (research F5) |
| `COUNCIL-D2_c113.json`, `civic-office-council-d2_2026-10-28.json` | D2 pack and wake: answer accepted, propose rejected as the second consequential move, numberMoved "2" (F3, F10) |
| `COUNCIL-D9_c113.json`, `civic-office-council-d9_2026-10-29.json` | D9 pack `empty: true`, "no due action on this seat this cycle"; wake makes no move (F1) |
| `civic-office-mayor_2026-10-26.json` | mayor wake: answer only; says an event is scheduled — that answer is not an event write (F4, F10) |
| `close_c113.json`, `fold_c113.json`, `moves_c112.jsonl` | close applied=true; fold of five work records and one D4 proposal; applied outcomes |
| `council_d2_c113.json` | D2 Sunday hearing: YES on INIT-008, empty trackerUpdates; the engine ballot is a separate roll (F9) |
| `parade-c111-from-world-summary-c113.md` | the A's parade: a **C111** sports editorial note carried in the C113 summary — historical awareness, not a C113 event (F11) |

Not retained: the exact serialized prompt. The weekday runner builds it at call time and the saved wake keeps statement and moves only. Capturing it is a runner change (Task A2).

`scripts/civicAutonomyBaseline.test.js` checks the hashes and the facts above. Synthetic scenarios, when added, go in a sibling folder and say so in their name.
