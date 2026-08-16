---
title: Writer-Fixed, Artifact-Persists — Silent Partial-Failure Audit
created: 2026-08-16
updated: 2026-08-16
type: plan
tags: [governance, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md engine.110 — buildCulturalCards.js --wipe-old exits 0 on partial delete failure (78 ok/14 failed), stacking Supermemory card versions for months (CUL-66EDE7C6 held 3 dated cards)
  - docs/plans/2026-08-15-civic-edge-truth-migration.md §11.3a — ensure* helpers stop producing a new row but never delete the stale one they're replacing
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout, governance.48"
  - "[[../index]]"
---

# Writer-Fixed, Artifact-Persists — Silent Partial-Failure Audit

**Goal:** Find every writer/sync script in the repo that can report success while a stale or duplicate artifact survives, and give each confirmed instance its own rollout row.

**Architecture:** Two independent findings the same night (engine.110, civic.20 §11.3a) share one shape: a script's "replace the old thing" step fails or is skipped, the script's overall exit code doesn't reflect that, and every downstream caller has therefore always seen success. This is a class, not a coincidence — worth one audit pass across `scripts/` rather than waiting to catch instance three and four by accident. Not a code-fix plan itself; the fix per instance belongs to whichever terminal owns that script (engine-sheet for most sheet/card writers).

**Terminal:** research-build (audit + rollout filing) → engine-sheet (per-finding fixes, substrate-routine)

**Pointers:**
- Prior work: engine.110 (`docs/engine/ROLLOUT_PLAN.md`), civic.20 §11.3a (`docs/plans/2026-08-15-civic-edge-truth-migration.md`)
- Related: `scripts/buildCulturalCards.js` (confirmed instance)

**Acceptance criteria:**
1. Every script under `scripts/` matching a write-replace pattern (`--wipe`, `ensure*`, `upsert`, `sync`, `mint` with a "delete old" step) has been read for: does a partial failure on the delete/replace side change the process exit code?
2. Each confirmed instance gets its own `engine.*` or `pipeline.*` rollout row, tagged to the owning terminal, independent of this audit row.
3. This plan closes with either a standing lint/check script that catches the pattern going forward, or a documented decision that per-instance fixes are sufficient and no standing check is warranted.

---

## Tasks

### Task 1: Enumerate candidate writer scripts — DONE (engine-sheet, S376)

- **Files:** `scripts/**/*.js` — read only
- **Steps:**
  1. `grep -rln -- '--wipe\|wipeOld\|deleteOld\|upsert\|ensureLedger\|ensure[A-Z]' scripts/` to build the candidate list
  2. For each hit, check whether the script's delete/replace step's failure path is caught, logged-and-continued, or thrown
- **Verify:** a list of scripts with a yes/no on "partial failure changes exit code"
- **Status:** [x] DONE S376 (engine-sheet). 38 grep candidates narrowed to 8 real instances; see §Findings.

### Task 2: File one rollout row per confirmed instance

- **Files:** `docs/engine/ROLLOUT_PLAN.md` — modify
- **Steps:**
  1. For every script confirmed to swallow a partial failure, add a one-line pointer row (`engine.*` or `pipeline.*`, tagged to owning terminal) — do not inline the finding, point to this file's §Findings
  2. Log the finding under a `## Findings` section added to this file as Task 1 completes
- **Verify:** `grep -c "^| engine\.\|^| pipeline\." docs/engine/ROLLOUT_PLAN.md` count increases by exactly the number of confirmed instances
- **Status:** [x] DONE S376 (engine-sheet) — filed as 3 grouped rows (engine.111, engine.112, governance.49), not 7 per-instance rows. Deviation and its reasoning logged under §Open questions for research-build to re-split if wanted.

### Task 3: Decide on a standing check

- **Steps:**
  1. If 3+ instances confirmed: design a lightweight audit script (`scripts/auditWriterExitCodes.js` or similar) that greps for the pattern and flags scripts with no exit-code guard — file as its own `governance.*` build row, does not get built inline in this plan
  2. If 0–2 instances confirmed: document that finding here and close the plan without a standing check
- **Verify:** this plan's `## Findings` section states the decision and why
- **Status:** [x] DONE S376 (engine-sheet) — 7 confirmed on Half B, 4 on Half A, well past the threshold. Standing check filed as governance.49; not built inline, per this task's own instruction.

---

## Findings

Audit run S376 (engine-sheet). The `grep` in Task 1 returned 38 files; most are
noise (`ensureSheet_` helpers, the word `upsert` in a comment). The class needs
two things together, so that is the narrowing rule applied here:

> **a delete-or-replace call against an external store, PLUS an aggregate
> success/failure counter whose failure side does not reach the exit code.**

That excludes read-only auditors, sheet-append writers with no delete step, and
`ensure*` helpers that only ever create. Under the rule, 8 scripts are in the
class — all against Supermemory. Three candidates the plan's own sources pointed
at (`sweepCanonIngest.js`, `ingestPublishedEntities.js`,
`reconcileRheaDisposition.js`) were checked and have **zero** delete/replace
sites: clean negatives, not in the class.

The class has **two independent halves**, and conflating them mis-files the rows:

**Half A — write errors never gate the exit code.** 4 of 6 card builders.

| Script | PATCH-if-exists | write-errors gate | verdict |
|---|---|---|---|
| `buildCitizenCards.js` | yes (S223) | yes — L1110 `if (errors > 0)` … `exit(1)` (canon.3 T6) | fixed |
| `buildCulturalCards.js` | yes (engine.110, S376) | yes — S376 | fixed this session |
| `buildBusinessCards.js` | **no** | **no** — `errors` logged at L431 only | open |
| `buildFaithCards.js` | **no** | **no** — L560 | open |
| `buildNeighborhoodCards.js` | **no** | **no** — L631 | open |
| `buildInitiativeCards.js` | **no** | **no** — L497 | open |

POST-only writes are the *cause*, not a side issue: without PATCH-if-exists every
rebuild that the wipe fails to clear adds a version. That is how `wd-cultural`
reached 95 docs for 46 figures (38 figures multi-carded, April-28 cards surviving
every wipe since April). The other four projections have the identical shape and
have never been censused.

**Half B — DELETE failures never gate the exit code.** 7 of 8, including the two
scripts already hardened on Half A.

| Script | delete-failure handling | gates exit? |
|---|---|---|
| `buildCulturalCards.js` | classified (404 = already-gone), itemised with status, aborts before writes | **yes — S376** |
| `buildCitizenCards.js` L462 | `failed++`, logs first 5 with `last_status` | no |
| `ingestPlayerTrueSource.js` L482 | `failed++`, logs first 5 with `last_status` | no |
| `buildBusinessCards.js` L261 | `failed++`, status discarded | no |
| `buildFaithCards.js` L279 | `failed++`, status discarded | no |
| `buildNeighborhoodCards.js` L257 | `failed++`, status discarded | no |
| `buildInitiativeCards.js` L247 | `failed++`, status discarded | no |
| `dedupWdCitizens.js` L150 | `failed++`, status discarded | no |

`dedupWdCitizens.js` is the sharpest case: the script whose entire job is removing
duplicates can leave them in place and still report success.

Where the status code is discarded entirely, a failure is not just ungated but
**undiagnosable** — engine.110's "14 failed" could not be explained months later
because nothing recorded whether they were 404 (benign — doc already gone), 429,
or 5xx. Any fix should classify before it gates; gating hard on a 404 would turn
a benign condition into a stop.

### Census — all six wd-* projections (S376, read-only, engine.111 greenlit by research-build)

The Half-A table above said the other four projections "have never been censused."
They have now. Counts are docs vs unique metadata key per `containerTag`:

| projection | docs | keys | surplus | multi-carded | oldest dup |
|---|---|---|---|---|---|
| `wd-cultural` | 95 | 46 | 49 | 38 of 46 | 2026-04-28 |
| `wd-citizens` | 940 | 940 | **0** | 0 of 940 | — |
| `wd-business` | 435 | 99 | **336** | 91 of 99 | 2026-04-28 |
| `wd-faith` | 17 | 16 | 1 | 1 of 16 | 2026-05-12 |
| `wd-neighborhood` | 17 | 17 | 0 | 0 | — |
| `wd-initiative` | 6 | 6 | 0 | 0 | — |

**Total surplus across the card layer: 386 docs.**

`wd-business` is 4.39 docs per business and more than twice as degraded as the
projection that triggered this audit — 91 of 99 businesses multi-carded, stacking
since 2026-04-28, the same window as cultural. `lookup_business` has been reading
that layer the whole time. Escalated to research-build at discovery per their
hour-one instruction, not held for session close.

**`wd-citizens` is the control group and it settles the causation.** 940 docs for
940 POPIDs, ratio exactly 1.00, zero surplus — on the largest projection by an
order of magnitude. That is S223's PATCH-if-exists plus the `dedupWdCitizens`
cleanup holding at scale. So duplicate stacking is not a property of the
Supermemory write path; it is specifically what happens without PATCH.

The three clean small projections are clean because they **rarely rebuild**, not
because they are safe — identical POST-only code, less traffic. `wd-faith` has
already produced its first duplicate. Treat them as preventative work, not as
evidence the pattern is optional.

### Root cause of the volume — the daemon retry loop, not manual wipes

The census numbers track rebuild *frequency*, not anything about the four
projections' code, which is identical. `wdCardsDaemon.js` explains the volume:

- `runBuilder` (L184-199) has always treated a builder as failed on
  `/Errors:\s*[1-9]/` **in stdout**, independent of exit code. So the daemon was
  already detecting write errors before any of the exit-code gates existed.
- On failure it does not commit that chunk's row hashes, and re-dispatches the
  same IDs next tick (`dispatchProjection`, L205+ — deliberate partial-progress
  drain, the S252 storm fix).
- Pre-fix the builders were POST-only. So **every retry tick wrote a fresh
  duplicate document for every ID in the failing chunk.** One stuck ID in a
  20-ID chunk added ~20 surplus docs per tick.

That is the accumulation engine, and it explains the census ordering exactly:
`wd-business` (chunked dispatch, highest rebuild traffic) worst at 4.39x,
`wd-cultural` next at 2.07x, and the three low-traffic projections clean. It also
means the surplus was never mostly about `--wipe-old` failing during occasional
manual runs — that was the symptom that surfaced it, not the volume driver.

**This makes PATCH-if-exists load-bearing rather than tidy, and it means the two
halves of the fix had to ship together.** An exit-code gate *without* PATCH would
have made things worse: more accurate failure signalling → more daemon retries →
more duplicate POSTs per retry. With PATCH, a retry is idempotent — it refreshes
the existing document instead of adding one. Any future work on Half B should
check the same interaction before adding a gate to a POST-only writer.

### governance.49 first run — 4 new instances, canon-ingestion writers (S376, kimi)

`scripts/auditWriterExitCodes.js` shipped (`eac179de`) with ratcheted report +
`--gate` modes. First run found 4 instances beyond the original 8, all
canon-ingestion writers: `ingestCivicWiki.js`, `ingestEdition.js` (the Saturday
canon door), `ingestEditionWiki.js`, `supermemory-ingest.js`.

Verified in `ingestEdition.js`: `errors++` increments per failed section,
prints in the `[DONE] Success: N, Errors: N` summary, and nothing after the
loop checks it — no `process.exit(1)` on `errors > 0`. A partial edition-ingest
failure (some sections fail to POST to Supermemory) reports success. A
published edition can be silently missing sections from canon with no signal
anywhere in the chain. Filed as **engine.113**.

The 4 engine.111 card builders verified gated tonight and dropped from the
ratchet. `dedupWdCitizens.js` had a detection blind spot — its DELETE call
shape didn't match the detector's pattern — fixed same commit.

**A third sub-class exists and is NOT counted here.** civic.20 §11.3a's `ensure*`
finding is about **sheet rows**, not Supermemory documents — different store,
different failure mode (no HTTP status, no delete API), different owner. Folding
it into the counts above would overstate a single mechanical fix. It needs its own
audit pass against `phase*/` engine code, which this sweep did not cover.

**Decision on Task 3: a standing check is warranted.** 7 confirmed on Half B and 4
on Half A is far past the 3+ threshold, and every instance is the same six lines
of shape — a counter incremented in a loop, printed in a summary, never read
again. That is mechanically greppable. Filed as its own build row rather than
built inline, per this plan's own instruction.

---

## Open questions

- [x] **Row granularity — RATIFIED grouped (2026-08-16, research-build).** Keeping
  engine.111 / engine.112 / governance.49 as filed, not re-splitting to 7. Half A
  is one design ported across 4 files; Half B is one guard applied across 7 —
  each half is one job with a repeated shape, not 4 or 7 independent jobs. S286
  (ROLLOUT is an index, one line per job) argues for the grouped form here; the
  per-script tables above carry the detail a re-split would have needed anyway.
- [x] **Census the other four projections — GREENLIT inside engine.111 (2026-08-16,
  research-build).** Read-only, cheap, and it decides the row's real scope before
  any write touches business/faith/neighborhood/initiative cards — run it before
  the port, not after. `wd-cultural` sat at 2× true size for 4 months with
  nothing flagging it; if any of the other four show the same shape, that's a
  live retrieval-integrity problem, not a backlog item — escalate immediately
  (hour-one, with the count) rather than folding it quietly into engine.111's scope.

---

## Changelog

- 2026-08-16 — Initial draft, filed off a cross-lane message from engine-sheet (S375, research-build) naming the pattern after engine.110 and civic.20 §11.3a surfaced it twice in one night.
- 2026-08-16 — Tasks 1–3 executed (S376, engine-sheet). §Findings added; 38 candidates → 8 instances in two halves; rows engine.111 / engine.112 / governance.49 filed.
- 2026-08-16 — §Census added (S376, engine-sheet). All six projections counted: 386 surplus docs, wd-business worst at 4.39x. wd-citizens 1.00 proves PATCH is the cause.
- 2026-08-16 — Root cause traced to the wdCardsDaemon retry loop over POST-only writers (S376, engine-sheet). Gate-without-PATCH would have made it worse; the two halves had to ship together.
- 2026-08-16 — Both open questions resolved (S375, research-build): grouped rows ratified, census greenlit inside engine.111. governance.48 swept to ROLLOUT_ARCHIVE — this plan stays open, engine.111/112/governance.49 still point here.
- 2026-08-16 (kimi) — **governance.49 SHIPPED** (`eac179de`): `scripts/auditWriterExitCodes.js`, report + `--gate` modes. Mechanical shape per §Findings: delete/replace signal + loop-incremented failure counter + no exit-gate conditioned on it; secondary warning for discarded failure status (the undiagnosable-404 class). Self-test against the audit's 8 instances: the 4 engine.111 card builders matched the ratchet as already-gated (verified tonight, dropped); buildCitizenCards/ingestPlayerTrueSource/dedupWdCitizens correctly flagged (dedup required adding the `smRequest('DELETE', …)` call-shape to the detector). **4 NEW instances beyond the audit set, all canon-ingestion writers (Half-A-shaped):** `ingestCivicWiki.js`, `ingestEdition.js` — the Saturday canon door — `ingestEditionWiki.js`, `supermemory-ingest.js`. Ratcheted as "pending rb row filing." Integration recommendation (wire `--gate` into npm test or pre-commit) left to research-build/engine-sheet — gated config, not the kimi lane.
