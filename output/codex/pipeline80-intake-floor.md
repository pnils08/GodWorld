---
title: pipeline.80 INTAKE names floor patch delivery
created: 2026-10-16
updated: 2026-10-16
type: reference
tags: [media, testing]
sources:
  - docs/for-claude-review/2026-10-16-pipeline80-intake-floor-impl-TASK.md
  - docs/plans/2026-10-11-media-extension.md
pointers:
  - pipeline80-intake-floor.patch
---

# pipeline.80 patch delivery

Delivered `pipeline80-intake-floor.patch`, a git-format patch against HEAD `0d713168f9a22cbe8674578d2c8831ff25880305`. It changes only `scripts/cron-desk-run.js` and `scripts/cronDeskFilings.test.js`: 95 insertions, 1 deletion. The shared checkout's tracked files were not edited; implementation and tests ran in temporary HEAD archives. Only the two TASK-named deliverables were written in the repository. Registration changes are excluded by the builder's explicit two-file scope; the existing TASK and plan name these artifacts.

The exported helper adds `mentioned` entries with `floor: true`, resolves IDs through the existing checker, preserves existing roles/IDs, excludes the byline, and logs additions once per valid intake. Missing intake remains unchanged. The exact prompt sentence is added. Weekly pilot credit still runs afterward and can promote a floor entry to `subject`. No cron, model, Sheet, canon, deployment, backfill, commit, or push was run.

## Four hunts

References marked HEAD refer to the base commit; references marked patched refer to source after applying the delivered patch.

1. **Sidecar sites — TASK premise corrected.** HEAD `scripts/cron-desk-run.js:3095` is the only call to `buildIntakeSidecar`. The helper is wired immediately after it at patched `scripts/cron-desk-run.js:3131`, before the weekly pilot injection. Contrary to the TASK's parenthetical, HEAD `scripts/cron-desk-run.js:3340` does write a staged sidecar (`:3343`), but that object has no `intake` field and never calls `buildIntakeSidecar`. This second path remains unchanged; no additional intake path was invented. This is a factual correction to the task premise, not a claim that all staged sidecars now carry intake.
2. **Three-word names / two-word windows.** HEAD `scripts/canon-name-check.js:253` tries two-word windows only when the full candidate does not match. The floor performs the required exact `body.includes(r.name)` re-check at patched `scripts/cron-desk-run.js:2765`. The real checker tests at patched `scripts/cronDeskFilings.test.js:138` demonstrate a normalized double-space window that verifies but fails that guard, and a contiguous two-word name inside a three-word candidate that survives. An exact full three-word canon hit takes priority in the existing checker; this patch does not expand its extraction coverage. The body is split with existing `checkBody` (HEAD `scripts/cron-desk-run.js:1420`), excluding INTAKE, code fences and HTML comments.
3. **Title-stripped bylines.** HEAD `scripts/canon-name-check.js:203` includes `Sgt` among title words, and `:207` strips titles. The helper uses `checkText(author).verified` plus the literal author name for exclusion (patched `scripts/cron-desk-run.js:2748`). The synthetic `Sgt. Testc Author` regression at patched `scripts/cronDeskFilings.test.js:118` passes, for both object and string bylines. No new title vocabulary is introduced.
4. **Archived / non-Active citizens.** HEAD `scripts/canon-name-check.js:65` unions archive rows into canon recognition without a status filter. The floor separately reads the local ledger snapshot and admits only `Status === 'Active'` rows (patched `scripts/cron-desk-run.js:2755`), checking both name eligibility and resolved ID eligibility at `:2765`. Retired, missing-status and archive-only deceased fixtures are excluded at patched `scripts/cronDeskFilings.test.js:134`; the following assertion confirms the real checker still verifies non-Active names. This follows the requested default: historical canon recognition alone does not grant current floor credit. Shared names keep the resolver's null ID and ambiguity marker; an Active matching name is required, and an inactive identity is never selected to disambiguate it.

## Validation

Fresh HEAD archive: `/tmp/pipeline80-k4noGD-verify`. Applied the actual delivered patch, not a separately edited copy. No dependencies installed. `NODE_PATH` points to existing dependencies; the environment loader reads `/dev/null` rather than credentials. Synthetic rows are intercepted in memory inside the test and the filesystem function/module cache are restored in `finally`.

```sh
git apply --whitespace=error --check /root/GodWorld/output/codex/pipeline80-intake-floor.patch
git apply --whitespace=error /root/GodWorld/output/codex/pipeline80-intake-floor.patch
node --check scripts/cron-desk-run.js
node --check scripts/cronDeskFilings.test.js
export GODWORLD_ENV_FILE=/dev/null NODE_PATH=/root/GodWorld/node_modules
node scripts/cronDeskFilings.test.js && node scripts/buildNiaSlice.test.js
```

Patch checks, application and syntax checks succeeded without output. Both test processes exited 0: 28 passed / 0 failed, then `buildNiaSlice: ok`. The tests exercise local functions and snapshot fixtures; they do not prove a production filing or Saturday ingestion. A missing/unreadable or malformed ledger snapshot throws from the floor rather than silently treating status as Active. No live failure-path run was performed.

The shared checkout was already dirty, including `phase05-citizens/generateCitizensEvents.js`, `scripts/contentLedgerCompose.test.js` and many output artifacts; it was five commits ahead of origin/main. Those changes were not included in the patch. The two patch-target scripts were clean at inspection. Concurrent work advanced HEAD to `ebd0091a8ba54de3b32a1e23c63f505eb6a5769a` during delivery. Both patch targets and `scripts/buildNiaSlice.test.js` are identical between the initial and final HEAD; the delivered patch also passes `git apply --whitespace=error --check` against final HEAD. The shared target scripts remain unmodified.

Complete fresh-archive test output follows.

```text
◇ injected env (0) from ../../dev/null // tip: ⌘ multiple files { path: ['.env.local', '.env'] }
Test 1: yesterdaysFilings picks yesterday + same desk only
  ok   exactly 1 filing (today + other-desk excluded)
  ok   headline extracted
  ok   byline carried
  ok   INTAKE block included, self-score stripped
  ok   excerpt capped
  ok   excerpt excludes INTAKE
Test 2: yesterdaysFilings — wrong cycle excluded, missing desk empty
  ok   cycle filter
  ok   unknown desk empty
Test 3: buildIntakeSidecar enrichment
  ok   names enriched from packet quotes
  ok   hoods flat strings
  ok   claims carried
  ok   ledger fallback resolution
  ok   no INTAKE → null
Test 4: printed citizen floor (synthetic snapshot)
[run] 2026-10-16T07:46:49.042Z intake floor: +2 printed citizens — Testa Alpha, Testb Beta
  ok   empty NAMES gains exactly two mentioned citizens with ids
  ok   title-stripped byline excluded
[run] 2026-10-16T07:46:49.043Z intake floor: +1 printed citizens — Testb Beta
  ok   case-insensitive existing role and id untouched
  ok   no INTAKE remains null
  ok   missing names array unchanged
  ok   floor then pilot credit becomes subject
[run] 2026-10-16T07:46:49.044Z intake floor: +1 printed citizens — Testd Shared
  ok   ambiguous name retains null id and marker
[run] 2026-10-16T07:46:49.045Z intake floor: +0 printed citizens — 
  ok   non-Active, archived, comments, code and INTAKE-only names excluded
  ok   checker really verifies non-Active and archive names
  ok   checker window can normalize non-contiguous whitespace
[run] 2026-10-16T07:46:49.046Z intake floor: +0 printed citizens — 
  ok   whole-name includes recheck rejects normalized window
[run] 2026-10-16T07:46:49.047Z intake floor: +1 printed citizens — Testh Window
  ok   contiguous name inside three-word candidate survives
[run] 2026-10-16T07:46:49.048Z intake floor: +0 printed citizens — 
  ok   exact casing recheck rejects case-only checker match
[run] 2026-10-16T07:46:49.048Z intake floor: +0 printed citizens — 
  ok   repeat injection adds no duplicate
  ok   fixture cleanup complete

28 passed, 0 failed
  ok  leader is rank 1 regardless of row order
  ok  null standings -> null leader
  ok  empty rows -> null leader
  ok  note names leader + rank + cycles + streak
  ok  no leader -> empty note
  ok  slice builds
  ok  standings key present
  ok  sidecar -> leader named in angle
  ok  no raw POPID leaks into a lane label when the ledger has a name
  ok  no raw POPID leaks into a lane angle
  ok  no raw POPID leaks into lane citizens
  ok  weekly slice not empty when feed has events
  ok  weekly slice rosters both pilots
  ok  weekly slice resolves pilot name from ledger
  ok  weekly slice aggregates credits across episodes (40 + -100 = -60)
  ok  weekly slice counts episodes per pilot
  ok  weekly slice marks a null-credits episode as windowed, not zero
  ok  weekly story carries every pilot popid
  ok  weekly story ref is namespaced away from real EpisodeIds
  ok  no feed pack -> empty weekly slice
  ok  a filed weekly digest does not rebuild for the same cycle
◇ injected env (0) from ../../dev/null // tip: ⌘ suppress logs { quiet: true }
  ok  existing quoted-source role upgraded to subject for a printed pilot
  ok  a pilot never named in the article body is NOT added (index only what prints)
  ok  a printed pilot absent from the model INTAKE is still added as subject
  ok  career lines: only rows naming the pilot, inside the 6-cycle window
  ok  career lines: newest first
  ok  career lines: only the sentences that name the pilot
  ok  career lines: C101 is outside the window
  ok  career lines: unknown pilot -> []
  ok  career lines: no name -> []
  ok  career lines: season label, never a cycle number prefix
  ok  career lines: "in c111" shorthand stripped, cycle talk otherwise untouched
  ok  career lines: rating / TrueSource sentences dropped
  ok  who line: name — RoleType. career sentences
  ok  who facts: one ledger role fact + one fact per career line, each naming the pilot
  ok  who line: no role, no career -> just the name
  ok  citizenInfoFor carries roleType from the snapshot
  ok  weekly c111: every pilot carries who + career
  ok  weekly c111: the angle says who is in the chair and stays under the Packet 500-char cap
  ok  weekly c111: per-pilot numbers and careers ride as story.facts
  ok  weekly c111: Eric Taveras reads as the A's second baseman with his MVP
buildNiaSlice: ok
```
