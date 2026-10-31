# TASK — agy: canon review of 81 proposed hood event lines

Read-only. Do not edit, commit or push anything, do not touch any sheet, do not write new lines of your own beyond a one-line fix for a line you fail. Write your review to `output/antigravity/2026-10-31-review-ecl-hood-proposals.md`, under ~80 lines.

**Read:** `output/research-build/2026-10-30-ecl-hood-proposals.jsonl` (81 rows; `Text` is the line, `Conditions` says who can draw it, `basis` names the fact it rests on). `docs/canon/INSTITUTIONS.md`. `output/beats/Business_Ledger.jsonl`, `Faith_Organizations.jsonl`, `Community_Programs.jsonl`, `Initiative_Tracker.jsonl`. `output/research-build/2026-10-30-ecl-hood-pack-a.json`, `-b.json` are the fact packs the lines were drafted from.

**The world.** A city simulation on Oakland's map, prosperity-era and self-contained. The real Oakland's people, crime, politics, businesses and reputations do not exist here. Each line becomes something a citizen did or saw that week, and each draws only for citizens of its own hood.

**Fail a line if:**
1. Its `basis` does not hold: the business, program, place or fact is not in the record, or is in another hood.
2. It imports the real Oakland: a reputation, a history, a known problem, a place the record does not carry.
3. It contradicts INSTITUTIONS, or could sit in any hood unchanged when that hood's record offers something truer.
4. It states what the ledger does not hold about the citizen: a move, a job, an enrolment, a membership.
5. It carries a calendar claim that would be false on most weeks (a holiday, a game, a one-off event).
6. It reads as decline, poverty or blight. A down line is an ordinary friction.
7. Its `Conditions` let the wrong citizen draw it: a child, a teen in a bar, a parent of grown children.

**Not your job:** how many lines, which dials, the code, the engine, word-style preferences on a line that is true. No engine-words concerns: there is no such gate.

**Format.** First line: `VERDICT: <n> pass, <n> fail`. Then one entry per failed line only: the hood, the exact `Text`, which rule number, the record it conflicts with (file and the exact row or section), and a one-line fix. Then a section `HOODS MISREAD`, for any hood whose lines as a set miss what INSTITUTIONS says that hood is, or `none`.
