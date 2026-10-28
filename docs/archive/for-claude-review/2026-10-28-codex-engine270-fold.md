---
title: codex review — engine.270 six-gate fold
created: 2026-10-28
updated: 2026-10-28
type: review
tags: [review, engine, newsroom]
sources:
  - commit range 2086e0d8..2d9ab924
  - docs/archive/for-claude-review/2026-10-28-codex-engine270-review1-build.md
  - docs/plans/2026-09-28-storylines-keyed-to-engine-events.md §Reviews reconciled
pointers:
  - "[[../plans/2026-09-28-storylines-keyed-to-engine-events]] — fold claims to reconcile"
---

# codex review — engine.270 six-gate fold

**Target:** `git diff 2086e0d8..2d9ab924`, judged only against findings 1–6 in the archived codex review. The plan's §Reviews reconciled table (`docs/plans/2026-09-28-storylines-keyed-to-engine-events.md:273-286`) is the set of claims under test.

**Result:** **HOLD** the first unattended attach `--apply` pass (Sat 2026-10-31 16:00). Gates 3 and 4 remain incomplete. Gates 1, 2, 5, and 6 pass at the source level. No Sheets, network, model, live Cycle, or Node test run was performed; this is a read-only diff and local-artifact review. The new tests were inspected, not executed.

## Findings

1. **HOLD — gate 3, a changed sidecar can retain an obsolete hood match.** `attachStorylines` makes the join from the sidecar's `intake.hoods` plus the Article reader copy (`scripts/cron-saturday-run.js:827-843`). `commitAttaches` re-reads the sidecar, but its checks cover status, Cycle, Article location and bytes, INTAKE presence, and newly assigned storylines; it never compares the current `intake.hoods` with the hoods used to make the hit, nor does it bind the whole sidecar preimage before `renameSync` (`scripts/cron-saturday-run.js:850-892`). Counterexample: the initial match is `Fruitvale` + a printed Fruitvale Transit Hub name; another sidecar writer changes only `intake.hoods` to `Temescal` before `commitAttaches`. Article bytes and the Rhea Article hash stay identical, so the stale `INIT-003` hit is still committed and `stepSignals` counts an attach that fails the ruled hood condition. No such concurrent change was observed in local files; this is the uncovered code path. The plan's “a changed sidecar is skipped by name” claim is too broad (`docs/plans/2026-09-28-storylines-keyed-to-engine-events.md:269,281`). Gate: compare the match inputs or a sidecar revision before replacement, and fail or recompute on mismatch; cover a hood-only sidecar change in the on-disk test.

2. **HOLD — gate 4, the strict loader accepts a missing registry's valid-array shape.** `loadStorylineRegistryStrict` rejects absent/unparseable JSON and a non-array, but accepts `storylineRegistry: []`, an array of unusable entries, or a signal whose `meta.cycle` differs from the requested Cycle (`scripts/cron-saturday-run.js:798-808`). `emitDeskSignal` can produce an empty array when its Initiative_Tracker snapshot is missing and no crisis arc qualifies; it records that condition only in `meta.notes` (`scripts/buildWorldSummary.js:1180-1183,1346-1355,1377-1391`). With `[]`, `stepAttach` returns success with zero hits (`scripts/cron-saturday-run.js:897-910`), the full chain runs `stepSignals` (`:1734-1737`), and that step merely warns before a possible statusless `Storyline_Ledger` merge (`:914-944`). This is the same silent undercount/status path as the original gate, for a reachable upstream-input failure. The new test asserts only that a *missing file* throws (`scripts/cronSaturdayRun.test.js:253-257`). Gate: validate Cycle identity and a usable registry, treating an empty registry caused by a missing source as unavailable; keep step 6b held on that failure. A genuinely empty world needs its own explicit valid-empty case.

## Six-gate disposition

| Original gate | Round-two verdict | Source evidence |
|---|---|---|
| 1. Same initiative name attaches two stage IDs | **SHIP** for the named C113 collision: among matched stages, only the unique open stage is emitted; two open or no open stages emit none. The added fixture includes the C113 INIT-010 pair. Closed crisis linger remains the ruled one-Cycle ending path. | `scripts/cron-saturday-run.js:829-845`; `scripts/cronSaturdayRun.test.js:217-252`; `scripts/buildWorldSummary.js:858-861` |
| 2. Attach-error recovery replays already merged counts | **SHIP** for this failure path: `attachErr` is set before publish and suppresses `stepSignals`; the recovery attach then signals can make its first merge. The underlying direct `--step signals --apply` operation remains additive and is not newly made idempotent. | `scripts/cron-saturday-run.js:1680-1740,704-735` |
| 3. Sidecar write safety | **HOLD** per finding 1. Temp + rename and readback repair the direct truncation risk, and Article-byte, status, Cycle, and assignment checks exist; the hood match is not revalidated. | `scripts/cron-saturday-run.js:850-892`; `scripts/cronSaturdayRun.test.js:270-322` |
| 4. Missing/malformed registry fails loud | **HOLD** per finding 2. File/JSON/array-type checks exist; empty or unusable arrays and a foreign Cycle remain accepted. | `scripts/cron-saturday-run.js:798-808,897-910,914-944` |
| 5. Name only in INTAKE must not attach | **SHIP**: matcher uses `readerCopy`, and the new negative fixture puts the name only after `## INTAKE`. | `scripts/cron-saturday-run.js:829`; `scripts/cronSaturdayRun.test.js:236-252` |
| 6. Initiative stage age needs a true start | **SHIP**: both current and closed initiative stages get `startCycle: null`, `age: null`, `firstSeen: true`; crisis age still comes from `CycleCreated`. The ledger writer's first-observed `FirstCycle` remains separate. | `scripts/buildWorldSummary.js:831-846,888-930`; `scripts/buildWorldSummary.test.js:786-807`; `scripts/cron-saturday-run.js:719-758` |

## Temp-file reader check and evidence boundary

The proposed `.<sidecar>.attach-tmp` has a leading dot and ends in `.attach-tmp` (`scripts/cron-saturday-run.js:884-886`). It does **not** match the anchored `STAGED_SIDECAR_RE` (`lib/articleIntake.js:249-255`), the `.staged.json` index/Mags filters (`scripts/buildArticleIndex.js:373-376`; `lib/mags.js:865-868`), the `.staged.md` article readers (`scripts/reconcileRheaDisposition.js:98-106`; `scripts/notebooklmDailyNews.js:177-189`; `scripts/deliver-articles.js:103-112`), or the staged matcher used by `preSaturdayCoverageSweep`, `newsroom-fanout`, `cron-desk-run` daily filings, and the NotebookLM router (`scripts/preSaturdayCoverageSweep.js:93-97`; `scripts/newsroom-fanout.js:103-110`; `scripts/cron-desk-run.js:2575-2578`; `scripts/notebooklmDailyRouter.js:192-195`). The desk's separate unfiltered `requireUnspentArtifact` scan requires `f.startsWith(stem)`, which the leading dot defeats (`scripts/cron-desk-run.js:242-254`). Thus the temp-file reader claim holds for the traced readers. A failed temp write can leave a hidden file, but it cannot enter these staged-article reads.

The plan's replay boundary needs a factual correction, separate from the six gates: C108 currently has **21 staged sidecars and 24 staged Article files**, while `desk_signal_c108.json` has no `storylineRegistry` key. C105–C107 have no staged files here. C108 cannot replay the implemented attach against a same-Cycle registry, but “C105–C108 have no staged articles” is false (`docs/plans/2026-09-28-storylines-keyed-to-engine-events.md:269,285`; `output/cron-compare/staged/civic_c108_freelance-firebrand_packet-v2_anthropic-claude-sonnet-5.staged.md`). Counts are from a read-only local file inventory, not a Sheet or canon readback.

## Disposition

For engine-sheet: reconcile findings 1–2 with a source change or counterevidence before Sat 2026-10-31 16:00. If fixed, demonstrate a hood-only sidecar mutation between match and commit, an empty registry caused by missing Initiative_Tracker input, a foreign-Cycle signal, and the existing partial-attach retry with exact ledger deltas. This review does not authorize a live run, Sheet write, or deployment.

**Reconciled in:** `[[../plans/2026-09-28-storylines-keyed-to-engine-events]]` §Reviews reconciled — pending engine-sheet action.

## Changelog

- 2026-10-28 (codex) — Filed read-only six-gate fold review; HOLD gates 3 and 4.

## Citation correction — 2026-10-28 (codex)

- In the six-gate table, gate 5's `readerCopy(entry.text)` pointer is `scripts/cron-saturday-run.js:831` (not `:829`). In the temp-file check, the filename construction is `scripts/cron-saturday-run.js:882` and the write/rename/readback is `:883-886`.
