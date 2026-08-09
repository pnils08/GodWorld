# Saturday Pipeline — Verified Findings & Proposed Work (S362)

**Status:** PLAN ONLY. No work started. No work permitted until vetted.
**Author lane:** research-build
**Date:** 2026-08-09

---

## Standing constraint governing this plan (Mike-direct, 2026-08-09)

1. No Claude work proceeds without a written plan.
2. Every claim in that plan must carry its verification — the command run and the output returned.
3. The plan must be vetted by all terminals.
4. Claude may not push work unless **kimi or codex** approves it.

This document exists to satisfy (1) and (2). It is not approved. Nothing below is actioned.

Why the rule exists: in the S362 session this lane asserted several things as fact that were
inference — most damagingly that the scorecard "will print 100% again next week regardless,"
which is false (see §Corrections). The rule is a response to that, and it is correct.

---

## §1 Verified findings

Each row: the claim, the command that establishes it, and the output. Nothing here is
inferred. Anything I could not establish by reading is in §2, not here.

### F1 — The Saturday run fired on schedule and died at step 3

Command: `cat logs/saturday-run.log`

```
Saturday run — c102 [APPLY]
--- step 1: EIC accuracy audit ---
  accurate           business_c102_dana-reeve_deepseek-deepseek-chat
  accurate           business_c102_jordan-velez_deepseek-deepseek-chat
accuracy 100% → output/eic_scorecard_c102.md (AT BAR)
--- step 2: curation ---
2 selected of 2 staged (0 canon-violation excluded) → output/edition_curation_c102.json
--- step 3: narration (Mags) ---
[saturday] Fatal: 400 {"type":"error","error":{"type":"invalid_request_error",
"message":"Your credit balance is too low to access the Anthropic API..."}}
```

File mtime: `Aug 8 16:00`. Crontab entry: `0 16 * * 6 ... cron-saturday-run.js --apply`.
The schedule is not broken. The run is not broken. **The Anthropic account is out of credits.**
Steps 3 and onward never executed.

### F2 — `cycle_pulse_c102` was never written

Command: `ls output/ | grep -ci "cycle_pulse_c102"` → `0`

Direct consequence of F1. Not a separate defect.

### F3 — The scorecard graded 2 articles, both stale

Command: `ls -la --time-style=full-iso output/cron-compare/staged/`

```
business_c102_dana-reeve_deepseek-deepseek-chat.staged.json    2026-08-01 03:03
business_c102_jordan-velez_deepseek-deepseek-chat.staged.json  2026-07-29 18:18
```

Both predate the Aug 3–7 working week. Both business desk, both DeepSeek. The scorecard's
`total: 2` and `accuracyPct: 100` are computed entirely from these two files.

### F4 — Nothing anywhere clears `staged/`

Command: `grep -rnE "staged.*(unlink|rmSync|renameSync)|(unlink|rmSync|renameSync).*staged" scripts/*.js | grep -v test`

Output: **no matches, repo-wide.**

Sidecars written to `output/cron-compare/staged/` are never removed, archived, or renamed by
any script in the repo.

### F5 — The re-grading persists for as long as the cycle number holds

Command: `sed -n '84p' scripts/cron-saturday-run.js`

```js
if (String(side.cycle) !== String(cycle)) continue;
```

`loadStagedSet` filters by **cycle**, not by week. So while the canonical cycle remains 102,
every Saturday run re-reads and re-grades the same two Jul-29/Aug-1 articles. When the cycle
advances to 103 they fall out of the filter on their own. This is the precise scope — it is
not "forever," and it is not self-correcting within a cycle.

### F6 — The gate rejected 100% of last week's output

Command: `zcat -f logs/newsroom-fanout.log.1.gz | grep -oE '"disposition": "[a-z]+"' | sort | uniq -c`

```
     30 "disposition": "flagged"
```

Log covers `2026-08-03` through `2026-08-07` (verified via `grep -oE '^\[run\] [0-9-]{10}' | sort -u`).
**30 articles written, 30 flagged, 0 staged.** `output/cron-compare/flagged/` holds 89 files.

### F7 — Rhea's flag accuracy — **DISPUTED, NOT ESTABLISHED**

> Mike, 2026-08-09: "90% of rhea blocks are false also."
>
> This finding was originally written as "Rhea is functioning." That was not verified — it
> read Rhea's own rejection summaries and treated the auditor's word as ground truth, which
> is the same error as the rest of §2. Downgraded.

Two flags were spot-checked against the ledger after the challenge:

| Rhea's flag | Ledger check | Result |
|---|---|---|
| "invented citizen Roberta Chen-Ramirez" | `lookup_citizen` → **Bobby** Chen-Ramirez, POP-00792, Health Center Project Director | flag correct — writer invented a "Roberta" variant |
| "District 9 seat misattributed to retired Marcus Osei instead of Terrence Mobley" | `get_council_member D9` → Terrence Mobley, OPP, **active** (truesource cycle 103) | flag correct |

**These two do not settle the question and must not be read as if they do.** n=2 out of 89
flagged articles, and both were hand-picked by me from the summaries that read most concrete —
textbook selection bias. A 90%-false rate is entirely compatible with two correct flags.

**Unresolved.** Proposed as W4 below.

### F7-orig — the rejection summaries (retained as raw material, not as a verdict)

Rejection summaries pulled from the same log:

- "inclusion of invented citizen Roberta Chen-Ramirez"
- "invented citizen (Cy Newell), a raw engine decimal leak (2.95)"
- "misattributing the District 9 council seat to retired Marcus Osei instead of Terrence Mobley"
- "completely hallucinates an ALCS postseason elimination when the regular season is still active"
- "Jose Johnson's occupation contradicts his ledger profile (Warehouse Worker vs. pastry chef)"

What these establish: the *shape* of Rhea's objections. Whether each is true is F7, unresolved.

### F8 — The Hal slice is uncommitted

Commands:
```
git status --porcelain -- scripts/buildHalSlice.js   → ?? scripts/buildHalSlice.js
git show HEAD:scripts/cron-desk-run.js | grep -c buildHalSlice   → 0
```

Per-slice tracking state in HEAD:

| slice | state |
|---|---|
| buildJaxSlice.js | tracked |
| buildPSlayerSlice.js | tracked |
| buildAnthonySlice.js | tracked |
| buildEveningSlice.js | tracked |
| buildEconomicSlice.js | tracked |
| **buildHalSlice.js** | **UNTRACKED** |

The `require` at `cron-desk-run.js:474` exists in the working tree only. Owner is grok's lane —
this is a report, not a claim on the work.

### F9 — C102 article volume on disk

Command: `find output -iname "*c102*" -name "*.md" | ... | sort | uniq -c`

```
  29 business    81 civic    35 culture    34 sports
```

179 desk articles exist for C102 across all sources. The scorecard sees 2 of them, because it
reads only `staged/`.

---

## §2 Corrections — claims I made this session that were NOT verified

Recorded so the next session does not inherit them as fact.

| Claim I made | Status | What is actually true |
|---|---|---|
| "The scorecard will print 100% again next week regardless" | **FALSE** | `stepAudit` bails on an empty set at `cron-saturday-run.js:512` (`if (!set.length) ... return { audited: 0 }`). With nothing staged it writes no scorecard at all. |
| "The bug is the denominator" | **WRONG DIAGNOSIS** | The denominator is honest about what it measures. The defect is F4 — stale sidecars are never swept, so the same two articles are re-graded. |
| "The Hal slice landed" | **FALSE** | F8 — untracked, never committed. |
| "Rhea don't work" (accepted from the complaint, then tested) | **FALSE** | F7 — Rhea is the working component. |

I asked for approval twice on a fix aimed at the wrong mechanism. That is the failure this
plan is gated behind.

---

## §3 Proposed work — none of this is started

Each item names its owner, its blast radius, and what would falsify it. All require the §0
vetting gate plus kimi-or-codex sign-off before a line is written.

### W1 — Sweep `staged/` after a successful Saturday compile
**Defect:** F4 + F5. **File:** `scripts/cron-saturday-run.js`, one function.
**Change:** after the compile step succeeds, move consumed sidecars to an archive path rather
than leaving them in `staged/`.
**Blast radius:** the Saturday audit input set; nothing reads `staged/` outside the Saturday
run and `newsroom-fanout.stagedTally` (needs confirming before any edit — **UNVERIFIED**).
**Falsifier:** if `stagedTally` drives the weekly budget cap off `staged/` contents, sweeping
resets the cap and the writers over-produce. Must be checked first.
**Sequencing note:** this only matters when articles actually reach `staged/`. Given F6, it is
downstream of the real problem and should not go first.

### W2 — Surface a dead Saturday run
**Defect:** F1 — a fatal at step 3 produced no alert. Mike learned about it from a chat argument.
**Change:** non-zero exit path writes a marker, or the existing digest reads the log tail.
**Blast radius:** logging/notification only.
**Falsifier:** if `newsroom-digest.js` already reports run failures and simply didn't fire, this
is a no-op — **UNVERIFIED**, must read that script first.

### W4 — Measure Rhea's false-block rate
**Defect:** F7 — unresolved, and it is the highest-stakes unknown in the chain. If Mike's 90%
figure is right, the gate is destroying good work and the 30/30 rejection (F6) is the gate's
fault, not the writer's — which inverts W3 entirely.
**Method:** sample flagged articles from `output/cron-compare/flagged/` (n≥20, randomly drawn,
not summary-picked), resolve every flagged claim against the ledger via `lookup_citizen` /
`get_council_member` / `queryLedger.js`, report true-flag vs false-flag counts per flag class.
Read-only. No engine or gate change proposed until the number exists.
**Falsifier:** none needed — this produces a number rather than asserting one. That is the point.
**Priority:** first. W1, W2 and W3's premise all sit downstream of this answer.

### W3 — Not mine (**conditional on W4**)
The 30/30 rejection rate (F6) is a writer-model problem: DeepSeek is inventing citizens on every
desk. grok's heat-slice packs (`pipeline.52`) are the in-flight fix for exactly this and five of
six are committed. **No research-build work is proposed here.** Duplicating it would be the
build-beside-the-broken-thing pattern.

---

## §4 Blocking, and not a code problem

The Anthropic account is out of credits (F1). Every Claude-side step of the Saturday run is
dead until that is resolved. No plan below the line changes that.

---

## §5 Vetting record

| Terminal / lane | Reviewed | Verdict | Date |
|---|---|---|---|
| media | ☐ | | |
| civic | ☐ | | |
| engine-sheet | ☐ | | |
| kimi | ☐ | | |
| codex | ☐ | | |
| grok (F8 is their lane) | ☐ | | |

Push authority per Mike-direct 2026-08-09: **kimi or codex must approve before any of §3 is
pushed.** research-build does not self-clear.

---

Related: [`docs/index.md`](../index.md) · gate mechanics in `scripts/cron-saturday-run.js` ·
slice packs in `docs/plans/2026-08-08-journalist-heat-slice-packs.md`

---

## Changelog

- 2026-08-09 — Plan created (research-build, S362). F1–F9 verified; §2 corrections table for
  in-session unverified claims.
- 2026-08-09 — F7 downgraded from "Rhea is functioning" to **DISPUTED** after Mike-direct
  "90% of rhea blocks are false." Two spot-checks came back flag-correct but n=2 with
  selection bias settles nothing. Added **W4** (measure the false-block rate, read-only,
  n≥20 random) and made W3's premise conditional on it.
