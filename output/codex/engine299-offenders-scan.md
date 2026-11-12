---
title: engine.299 Task 2 — offender scan patch
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, citizens, research]
sources:
  - docs/for-claude-review/2026-10-18-engine299-task2-offender-scan-impl-TASK.md
  - docs/plans/2026-10-18-event-engines-move-dials.md
pointers:
  - engine299-offenders-scan.patch
---

# Ready to apply — patch delivery, no commit

Patch: `output/codex/engine299-offenders-scan.patch`. It changes only `scripts/deadBranchScan.js` and adds `scripts/deadBranchScan.offenders.test.js`. The shared script was not edited. No commit, push, Sheet write, deployment, fire, cron, model or canon operation was performed.

Built in a fresh archive of f709fe4d. HEAD advanced concurrently to **286088a4cde6521781c9d089a024c02d256e4a90**; the intervening commits changed documentation/control-plane/deployment artifacts, not the scanned engine sources, resolver or target script. The patch passed `git apply --check` against that HEAD and was applied and tested in a second fresh archive. Existing dirty work was preserved.

## Behavior

- `node scripts/deadBranchScan.js --offenders` reads live LifeHistory_Log, defaults to its highest Cycle, and writes `output/engine299/offenders.json` with a short stdout summary. `--cycle=<n>` selects one Cycle; `--sheet-id=<id>` selects the bench log. ECL is deliberately read from **live even for the bench report**, per the task.
- Each scanned row uses EventTag's first pipe-delimited component (the primary cell tag) and EventText with the existing `nudgesForEvent_(tag, 1, text)`. No alternate dial map, history retagging or older-Cycle count. Structural `{}` tags are counted too; there is no silent exemption. `inert.share` is a fraction of `scannedLines`.
- JSON has the requested shape plus `scannedLines`. Invalid/missing headers, invalid Cycles, an absent selected Cycle or failed reads produce `incomplete: true`, null inert measurements, an error and `acceptanceEmpty: false`. Reporting still exits 0. A report-write failure is printed rather than treated as clean acceptance.
- Source traversal covers JavaScript in `phase*/`, `utilities/`, `lib/`, excluding tests, output, node_modules and symlinks. The existing ESLint dependency's **espree tokenizer** separates strings, template fragments and comments; no dependency was installed or package file changed. Comment hits point to the matching line, not the block's first line.
- Code-site candidates cover the named emitters and additional writers identified through the selected log. Literal known/logged tags, tag assignments and inline stamped tags are resolved and reported with file:line. Object keys, including historical DIAL_MAP definitions, are excluded.
- Premise matching uses the requested expression without `decline`. Life-verb candidates scan prose strings in the selected emitter files, excluding the six named owner engines, plus active live ECL text. Comments are reported under premise separately from strings; life-verb comments and single-word metadata are not treated as pool prose.
- The in-file allowlist annotates settled hits with a reason. It includes buildContractSeeds ordering comments, enforcement spillover, Elena's exact held line, the two displacementmove tag locations, authored essence Promotion tags, and the explicit ex-logistics register line. Hal's decline note does not match. Allowed entries remain visible. Acceptance requires zero inert rows and zero unallowed premise/life-verb hits.

## Attribution and heuristic limits

The actual LifeHistory_Log header is **Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle**: it contains no source-engine field. Exact source-engine counts cannot be recovered from this table alone. The implementation honors SourceEngine/Engine if supplied; otherwise it labels a unique exact prose-literal match among candidate writers as **`inferred:<file>`**. Ambiguous, dynamic or unmatched text is **`unknown:no unique source evidence`**. These labels are pointers, not proven provenance. A matching literal can be reused indirectly by another emitter.

The source list is intentionally heuristic, not a control-flow or pool-eligibility proof. It can include read-side tag literals or non-pool prose within a selected writer, and miss computed/concatenated tags, indirect helper writers, escaped-word spellings or words split across template fragments. It does not join ECL Conditions to prove that a matched row fires. ECL Active=yes controls inclusion. Review the reported candidates before changing code; the selected-Cycle ledger count is the measure.

The log tag can differ from the cell tag in older emitters (for example Micro-Event versus a more specific cell kind). This report measures the requested **LifeHistory_Log** resolver result; it does not claim a cell-by-cell Phase 9 replay. No missing provenance or malformed input is represented as measured zero.

## Validation

- `node scripts/deadBranchScan.offenders.test.js` — PASS in the build archive and independently applied verification archive. Synthetic fixtures cover current versus older Cycle, graded/context tags, structural inert tags, exact resolver use, source labels, strings/comments, settled allowances, active ECL rows, decline exclusion, owner exclusion, acceptance, malformed/missing data, and nested template/regex tokenization.
- `node --check` — clean for both patch files. All **197** source files tokenized successfully.
- **Scan 4 unchanged:** compared the original and patched no-flag entry points on identical frozen Sheet/source fixtures. They produce byte-identical stdout, including never-fire/always-true sections. `diff -u /tmp/engine299-scan4-before.stdout /tmp/engine299-scan4-after.stdout` is empty. The existing Scan 4 body is retained; only entry-point dispatch/loading is moved. This is a deterministic compatibility comparison, not two independently timed live reads.
- `git apply --check output/codex/engine299-offenders-scan.patch` — clean. Fresh-archive apply and targeted test passed. No full-suite claim; validation is scoped to this report mode and preservation of Scan 4.

## First real runs

Read-only runs completed using the final patched script in `/tmp/engine299-offenders-work`; output was written there, not applied to the shared tree. Sandbox DNS initially failed; the authorized Sheet reads succeeded with network access. No credentials were printed.

Bench command: `node scripts/deadBranchScan.js --offenders --sheet-id=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA --cycle=112`.
Live command: `node scripts/deadBranchScan.js --offenders` (no sheet override; highest Cycle resolved to **111**).

| Measurement | Bench 1004 C112 | Live C111 |
|---|---:|---:|
| generatedAt (UTC, engineering metadata) | 2026-10-18T10:25:44.303Z | 2026-10-18T10:25:49.321Z |
| Scanned log lines | 2,349 | 2,771 |
| Inert lines | **82** | **2,348** |
| Share | **3.4908%** | **84.7348%** |
| Code-site candidates | 137 | 143 |
| Premise hits / allowed | 66 / 6 | 66 / 6 |
| Premise comments / strings | 44 / 22 | 44 / 22 |
| Active live ECL premise hits | 0 | 0 |
| Life-verb hits / allowed | 20 / 16 | 20 / 16 |
| acceptanceEmpty | false | false |

Top five inert tags (ties sorted by label):

| Bench tag | Count | Live tag | Count |
|---|---:|---|---:|
| Micro-Event | 25 | Neighborhood | 704 |
| Neighborhood | 15 | Daily | 435 |
| MEDIA-Event | 13 | Civic Perception | 324 |
| Advancement | 6 | Personal | 254 |
| CIVIC-Event | 6 | PrevEvening | 182 |

Top five source buckets; **all named engine buckets below are inferred, not ledger-recorded**:

| Bench source bucket | Count | Live source bucket | Count |
|---|---:|---|---:|
| unknown: no unique source evidence | 28 | unknown: no unique source evidence | 1,582 |
| inferred: generateGenericCitizenMicroEvent.js | 18 | inferred: generateCitizensEvents.js | 702 |
| inferred: generateMediaModeEvents.js | 13 | inferred: generateGenericCitizenMicroEvent.js | 19 |
| inferred: runYouthEngine.js | 7 | inferred: runYouthEngine.js | 14 |
| inferred: generateCivicModeEvents.js | 6 | inferred: generateMediaModeEvents.js | 12 |

The four unallowed life-verb hits are active live ECL rows **576, 631, 757, 764** (laid-off servers, wedding-speech reference, promotion, layoff). A lexical hit is a review pointer, not a verdict that a row invents a life event. The register line and 15 authored essence Promotion tags remain visible as the 16 allowed hits.

Receipts: `/tmp/engine299-offenders-bench.json`, `/tmp/engine299-offenders-live.json`. The scratch tool's canonical `output/engine299/offenders.json` currently contains the live report; each invocation replaces that file. The durable first-run measurements are recorded above. Bench @44 is the builder-supplied deployment identity; these reads verified C112 log contents, not Apps Script deployment binding. Current live code deployment does not retroactively change the C111 log.

**Delivery complete:** patch and report exist; patch applies cleanly. Remaining work is the owning lane's review/application and interpretation of reported candidates, not a commit or live mutation from this task.
