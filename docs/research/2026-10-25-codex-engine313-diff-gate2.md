---
title: engine.313 candidate diff gate 2
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, media, reference]
sources:
  - docs/research/2026-10-25-engine313-diff-gate2-TASK.md
  - commit 3b2de7c5
  - output/engine-sheet/2026-10-25-e313-bench-G2.log
pointers:
  - "[[2026-10-24-codex-engine313-diff-gate]]"
---

# engine.313 — candidate diff gate 2

**Final gate: SHIP for the specified engine.313 candidate to engine-sheet's landing gate.** F2, F3, F4, tests, and the saved G2 bench evidence pass the bounded checks below. This is a source and saved-receipt review, not an independent Sheet read, PROD deployment, or live-Cycle result. I made no engine, Sheet, bench, deployment, cron, or commit change.

## F2 — SHIP

The registrar resolves the exact-name/POPID target before classification (`phase07-evening-media/culturalLedger.js:220-277`). On the POPID path, it takes FameCategory and CulturalDomain from that row, falling back to classification of that row's RoleType when those cells are blank (`:293-304`). First Friday's Arts bonus reads that `fam` (`:353-360`), the UPDATE uses the selected `targetIdx` for FameScore and all queued cells (`:482-535`), and the summary reports the selected row's category/domain (`:568-581`). It does not refresh those category/domain cells on a POPID match (`:506-513`).

The synthetic dynasty-80/artist-40 First Friday case returns the artist's CUL-ID, queues FameScore **40→49** (+5 registration, +4 Arts), reports `artist` / `Arts`, and queues no category rewrite (`scripts/sportsWeekCity.test.js:561-568`). The real `buildEveningFamous_` bridge test passes the dynasty role word yet reaches that artist row with the same 49 score and no append (`:570-597`). Exact-name precedence and its existing category refresh remain outside this F2 repair (`culturalLedger.js:257-260`, `:510-513`).

## F3 — SHIP

`popOf` now accepts only a trimmed, case-normalized full `POP-` plus five digits (`output/engine-sheet/2026-10-22-e297-check.js:57-65`). New personal rows are compared with baseline and earlier new personal rows; dynasty/Institution rows are excluded on both sides, and a duplicate HOLD names the new and prior CUL-IDs (`:66-82`). The fixture exercises both dynasty directions, blank/malformed links, a baseline duplicate, and two new aliases sharing one POPID (`output/engine-sheet/2026-10-25-e313-receipt.test.js:35-49`). All **13/13** fixture assertions passed locally, including F4's checks (`:51-76`).

## F4 — SHIP for the G2 window; bounded causal inference

The receipt reads the current Cycle's `Riley_Digest.FamousPeople`, locates each baseline personal row whose label differs from its living citizen's spelling, and compares retained Name/CUL-ID, exact LastSeenCycle, and MediaCount delta with the number of citizen-name sightings (`output/engine-sheet/2026-10-22-e297-check.js:99-133`). A same-Cycle row-label sighting is explicitly not bound; a missing prior-Cycle receipt HOLDs; `--final` counts bindings across the window (`:106-110`, `:126-138`). The bench runner calls `--e313` after every fire and `--final` at C116 (`output/engine-sheet/2026-10-25-e313-bench.sh:50-56`).

I checked the competing writers. `registerCulturalEntity_` is the only inspected engine writer that increments an **existing row's** MediaCount (`phase07-evening-media/culturalLedger.js:434-476`, `:490-504`). The other registrar caller, advancement intake, checks the POPID/name link first and does not register an already linked row (`phase05-citizens/processAdvancementIntake.js:1247-1277`). The evening caller registers every selected name and puts those same names into `S.famousPeople` (`phase07-evening-media/buildEveningFamous.js:536-556`), which the digest writes to FamousPeople (`phase01-config/godWorldEngine2.js:2001-2002`). The dynasty writer only appends an institution with MediaCount 0 (`phase05-citizens/generationalWealthEngine.js:3408-3422`); the cultural helpers and other Cultural_Ledger readers/writers inspected affect fame, trend, spread, tier, or UniverseLinks, not this existing-row count (`phase07-evening-media/updateTrendTrajectory.js:36-50`; `scripts/integrateCelebrities.js:369-398`). Thus, in this staged engine with an already linked personal row, there is no other normal path to a one-count increment on that row while the row label is absent from the Cycle's famous list. The receipt plus source path is causal evidence for this bounded run, although it is not a per-call registrar trace and cannot exclude out-of-band Sheet edits.

There is a reusable-receipt hardening gap: the prior file is accepted for its `e313state` without checking its verdict, label, Cycle, or candidate identity, and missing/non-numeric MediaCount is coerced to zero (`2026-10-22-e297-check.js:107-110`, `:118-130`). That does not change this G2 finding: C113–C116 receipts all say PASS with the expected Cycle/label, and Dante's stored prior and current counts are numeric **8→9**. Future use on a different window should require typed prior state and a matching PASS receipt before claiming the same proof.

## Tests — SHIP

`node scripts/sportsWeekCity.test.js` passed **86/86**. The two-spelling tests assert one registry entry, every queued cell's row, one intent set, +2 MediaCount, and one helper set (`scripts/sportsWeekCity.test.js:497-505`); the shared-label and preloaded score/dynasty cases assert distinct target rows and helper targets (`:508-559`). The First Friday and real-bridge checks are at `:561-597`. `node output/engine-sheet/2026-10-25-e313-receipt.test.js` passed **13/13**. `node --check` passed on the registrar, both receipt scripts, and the sports test; `git diff --check 3b2de7c5^ 3b2de7c5` passed for the reviewed files. The fixture test's first run was blocked by this shell sandbox's child-process `EPERM`; the authorized rerun completed with 13/13. These local checks do not substitute for a live Cycle.

## Bench G2 — SHIP as saved sandbox evidence

The G2 log records a bench deployment and pull-back of **167 JS files** matching its manifest, followed by four fire/receipt PASS pairs and restoration of the stage-23 bench code (`output/engine-sheet/2026-10-25-e313-bench-G2.log:1-9`, `:42-121`, `:123-129`). The two manifests differ only at `phase07-evening-media/culturalLedger.js` (`output/engine-sheet/stage23-e313-G2.sha256:90`; `output/engine-sheet/stage21-e297-F2.sha256:90`); its G2 hash equals `git show 3b2de7c5:phase07-evening-media/culturalLedger.js`. The saved receipts each say PASS for C113–C116, with C115 Dante state MediaCount 8/LastSeenCycle 84 and C116 state MediaCount 9/LastSeenCycle 116, retaining `CUL-CEF9BF70` / `Muralist Dante Reyes` (`output/engine-sheet/2026-10-22-e297-check-G2-c115.json`; `...-G2-c116.json:124-159`). The older e297 F1 receipt instead minted `CUL-B5A3A5B0` / `Dante Reyes` at C116 (`output/engine-sheet/2026-10-22-e297-check-F1-c116.json:109-115`). This is a sandbox comparison from saved artifacts, not a PROD or live-state claim.

2026-10-25 correction (codex): The F4 paragraph's phrase “living citizen's spelling” is too broad for the receipt implementation: `nameByPop` includes all Simulation_Ledger rows (`output/engine-sheet/2026-10-22-e297-check.js:100-101`). The G2 Dante sighting and the evening caller's live-citizen selection support this specific binding; the receipt alone does not filter the F4 candidate set by Status.
