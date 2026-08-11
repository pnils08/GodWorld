# Salary + CareerStage audit — C103 (S365, operator queue item 4)

Source: `output/simulation_ledger_snapshot.jsonl` (cycle 103, 940 rows, 856 active/recovering).
Method: Age = 2041 − BirthYear (never trust derived Age fields). Full JSON: `output/salary_audit_c103.json`.

## Headline: Income is mostly sane — CareerStage is the broken column

### 1. CareerStage enum drift (4 vocabularies + blanks, active citizens)
`senior` 234 | `mid-career` 186 | **`retired` 217** | `student` 61 | `entry-level` 71 | `mid` 61 | `entry` 3 | `early` 6 | `early-career` 1 | blank 16.
Three synonym families (`entry`/`entry-level`, `mid`/`mid-career`, `early`/`early-career`) — different writers used different enums. Downstream readers matching one spelling silently miss the others.

### 2. Stage-vs-role incoherence — 217 active citizens (25%) marked `retired`
61 of them earn >$100K in active roles. Not edge cases — the city's protagonists:
- POP-00034 Avery Santana — **sitting Mayor of Oakland** — `retired`, $180K
- POP-00025 Arturo Ramos — **active A's starting pitcher, in the Cy Young race (C102 sports feed)** — `retired`, age 25, $8.1M
- POP-00115 Dan Perez — active A's hitting coach, `retired`, $2.47M

### 3. Active pro athletes marked `student` (5)
- POP-00533 Travis Coles — A's ace, **$24M salary, leading the Cy Young race** — `student`, age 21
- POP-00053 Kevin Clark — just called up to the majors (C101 story) — `student`, $100K

### 4. Salary-vs-role incoherence (secondary, real)
- AI Safety Researcher (Anthropic): role median **$32,226** across 10 holders, with three at $280–330K. The three look right; the $32K majority is the anomaly for that role.
- POP-01046 Elliot Abraham — **General Manager, Oakland Oaks** (his hiring was a C101 front-office story) — $44,150, CareerStage blank. The S363 known $0 was patched but to a wage nowhere near the role, and the stage is still empty.
- POP-00291 Enzo Walker — Plumber, $208K vs role median $31.9K (26 holders).

### 5. Zero-income working-age with a role: 0
The S363 zero-class is gone from active rows. Not re-broken; don't re-fix.

## Why it matters (causal-input test)
CareerStage is read by promotion/advancement engines (`checkForPromotions.js`, `educationCareerEngine.js`, `runCareerEngine.js`) — a 25-year-old ace marked `retired` is invisible to promotions, and a `student` flag on a $24M starter feeds wrong life-events. Columns must drive fates; these drive wrong ones.

## Fix lane
Plan: `docs/plans/2026-08-11-careerstage-salary-coherence.md` (engine.103 pattern: audit → GodWorld-native derivation → engine fix + direct column write → bench confirm).
