# TASK — agy: review codex's A1 persona-facts delivery (civic autonomy, civic.47)

Read-only. Do not edit, commit or push anything, do not touch any sheet. Write your review to `output/antigravity/2026-11-01-review-civic-a1-persona-facts.md`, under ~120 lines.

**Read.** The brief codex worked from: `output/codex/TASK-2026-11-01-civic-a1-persona-facts.md`. Its delivery: `docs/for-claude-review/2026-11-01-codex-civic-a1-persona-facts.md` (per-seat disposition tables, the A2 field list) and the proposed files under `output/codex/civic-a1/<agent-dir>/{IDENTITY,LENS,RULES}.md`. The current live files they would replace: `.claude/agents/civic-office-mayor/`, `civic-office-council-seat/`, `civic-office-council-d1` … `d9/`, `civic-office-police-chief/` (read-only for you). How the civic cron assembles a persona: `scripts/cron-civic-run.js:1238-1300` (which files it loads, and the output contract it supplies itself). Truth for facts: `output/beats/Civic_Office_Ledger.jsonl`, `output/beats/Initiative_Tracker.jsonl`, `output/beats/Community_Programs.jsonl`, `lib/districtMap.js`.

**The world.** A city simulation on Oakland's map, prosperity-era and self-contained; the real Oakland does not exist here. The personas are read by a model each time a seat wakes. The job codex was given: take every fact that changes week to week out of the persona and name the brief component that supplies it; remove premises the builder's rulings make false (no housing problem, no crisis story, no real-world Oakland, no builder references, the engine does not pre-assign a task); keep personality, ambitions, relationships, politics, voice, and past commitments as dated history. A facts pass, not a rewrite of character.

**Fail an item if:**
1. A disposition row's evidence does not hold: the export row or map line cited does not say what the row claims, or the quoted current line is not at that location.
2. A fact was refreshed instead of removed (a new number or current state written into a persona).
3. Something removed is not a changing fact and not covered by a ruling: character, voice, a relationship, a dated past commitment, or an operating instruction the seat still needs. Check the stated reason: a reason that does not fit the span it is pasted on is a fail.
4. A proposed file carries text a model should not be reading as its character: build labels, task ids, plan references, pack-internal names that the runner's own prompt does not already use, placeholders.
5. A new file would change what the runner loads for a seat (see `readPersonaDir`), and the delivery does not say so or the file adds nothing the shared files do not already say.
6. A real-Oakland import, a builder or session reference, a crisis premise, a housing-problem premise, or a pre-assigned task survives in a proposed file.
7. The A2 field list names a source tab or column that does not exist in the exports, or marks as a GAP something a named export already carries.

**Not your job:** word-style preferences on a line that is true, how A2 should be built, the code, the engine. There is no engine-words gate.

**Format.** First line: `VERDICT: <n> pass, <n> fail` over the 36 files plus the disposition doc. Then one entry per failed item only: the seat and file, the exact line or row, the rule number, the record it conflicts with (file and row or line), and a one-line fix. Then a section `PER FILE`: for each of the 36 proposed files one word, LAND or HOLD, with a clause. Then `A2 FIELDS`: any row of the field list that fails rule 7. Nothing else.
