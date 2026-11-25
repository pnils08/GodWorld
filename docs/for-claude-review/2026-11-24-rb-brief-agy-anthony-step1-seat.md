# Brief for agy — adversarial review: Anthony Raines, step 1 (his seat file)

**From:** research-build · **Date:** 2026-11-24 · **Your output:** `output/antigravity/2026-11-24-review-anthony-step1-seat.md` · read-only on code and docs. Nothing here is live: the seat file is not wired to his wake yet (no `seatFile` on his package).

## What this step is

Anthony Raines (POP-00017, the A's data-driven beat) moves to the seat-file mold (`docs/plans/2026-11-21-reporters-wake-as-themselves.md` — read §The mold, §The sports seats). One seat file replaces six sources of who he is and how he works. The builder's words for this seat are quoted verbatim in §The sports seats: remove the puppeting, tighten the instructions, **do not lose his tools and stat methods to fit a mold**, and his canon is deeper than any other seat's.

## The file under review

`.claude/agents/anthony-raines/SEAT.md` (commit `1089fcbf4`).

## What it replaces — read all of these

- `.claude/agents/anthony-raines/IDENTITY.md`, `LENS.md`, `RULES.md`, `SKILL.md`
- `docs/media/ANTHONY_ANALYSIS_BAG.md` (his ten methods, the field map, derived rates, the piece recipe)
- `docs/media/voices/anthony.md` (Essence + exemplar)
- His sheet bio (CitizenBio, Simulation_Ledger row 17 — read it via `output/simulation_ledger_snapshot.jsonl` or the sheet)
- His canon interview: `archive/non-articles/profiles/Anthony_The_Game_That_Built_the_Analyst.txt`
- His package: `scripts/newsroom-wake-packages.json` → `anthony-raines` (reviewProfile, canonBlockers, textureConditions)
- Five finished seat files for the mold: `.claude/agents/{carmen-delaine,maria-keen,sharon-okafor,luis-navarro,celeste-tran}/SEAT.md`

## Attack these

1. **Loss.** Anything of his craft in the six sources that the seat file drops and that the builder said to keep: a method, a sourcing rule, a voice trait, a boundary (third person; no fan "we"; not Hal's elegy; not P Slayer's heat), the derived-rate habit, a canon blocker that is not otherwise enforced by his package. Name the source line and whether it matters.
2. **Puppeting left in.** Any line in the seat file that tells him what to write, which story to pick, what to conclude or how to open — versus a job line or a method (builder 2026-11-24: "job lines are fine, telling them what to say is puppeting").
3. **Canon conflicts.** Any line in the seat file that disagrees with his canon interview, his sheet bio or his row (BirthYear, OrginCity "Berkeley, California"). Builder rulings: former AA A's prospect; the interview is him speaking; no relation to Mike Paulson; where he lives comes from the sheet, never the bio.
4. **Tools that do not exist as written.** Each tool named in the seat file against the code: `dossier_read`, `canon_recall`, `canon_search`, `sheet_read` (is `As_Player_Data` readable by a seat today — `SHEET_READ_ALLOWLIST` in `scripts/cron-desk-writer.js`?), `citizen_lookup`, `ask_worker` with office `GRIDIRON` (`scripts/workerAsk.js`), `memory_recall`. Say which are not reachable from a seat-file wake today (`scripts/cron-desk-run.js` seatMorningPlan, `cron-desk-writer.js` TEST_SEAT toolset) — steps 3–4 wire them; list what they must wire.
5. **Duplication against the mold.** Lines the seat file repeats that the wake already supplies elsewhere (reporterIdentity sheet line, the Packet), or that the reviewer/gate already enforces.

Each finding: file:line, what is wrong, severity (high / medium / low). Verify every claim against the files before you write it. Do not propose a different goal or design; review what is written against what it replaces.
