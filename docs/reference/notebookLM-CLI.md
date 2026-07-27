---
title: Gemini Notebook / NotebookLM CLI Operations
created: 2026-07-25
updated: 2026-07-27
type: reference
tags: [infrastructure, media, active]
sources:
  - docs/plans/2026-07-10-notebooklm-bridge-deploy.md
  - docs/plans/2026-07-25-notebooklm-source-search-wiring.md
  - docs/research/2026-07-10-notebooklm-mcp.md
  - config/notebooklm.json
  - scripts/notebooklmCanonSearch.js
  - scripts/notebooklmHeadlessEval.js
  - scripts/priorArcRequirement.js
  - scripts/cron-rhea-gate.js
  - scripts/notebooklmPush.js
  - scripts/notebooklmDailyNews.js
  - .claude/skills/post-publish/SKILL.md (read-only control-plane consumer)
  - https://github.com/jacob-bd/gemini-notebook-mcp-cli
pointers:
  - "[[../plans/2026-07-10-notebooklm-bridge-deploy]] — build history, proofs, and remaining acceptance gate"
  - "[[../plans/2026-07-25-notebooklm-source-search-wiring]] — fail-closed source policy, wrapper, routing, and observability"
  - "[[../research/2026-07-10-notebooklm-mcp]] — adoption research and canon-authority decision"
  - "[[../EDITION_PIPELINE_DEEP_DISPATCH]] — flagship publication path that converges on post-publish"
  - "[[../OPERATIONS]] — general GodWorld operations"
  - "[[../index]] — documentation catalog"
---

# Gemini Notebook / NotebookLM CLI Operations

This is the operator guide for GodWorld's Gemini Notebook integration. The
product and upstream repository now use **Gemini Notebook** in some places and
**NotebookLM** in others; GodWorld keeps the existing `nlm`,
`notebooklm-mcp-cli`, and `notebooklm*` file names so the live scripts and
configuration remain stable.

The integration has three jobs:

1. **Published-narrative canon search** over the permanent `GodWorld` notebook.
2. **Post-publish additions** of Editions and other approved publication
   artifacts to that permanent notebook.
3. A separate **daily newsroom listening brief** in the working
   `GodWorld — Daily Newsroom` notebook.

It uses the builder's existing Gemini subscription through an unofficial
browser-authenticated CLI. It does not use the Google Cloud Gemini API.

## Authority and retrieval position

NotebookLM is the strongest cross-source reader in the stack, but it is not an
independent canon authority and does not promote anything to canon.

| Question or action | First retrieval surface | Why |
|---|---|---|
| Exact current value, POPID, Initiative status, vote, metric, or Sheet field | Current Sheet/file data through deterministic GodWorld lookup | The simulation ledger and related Sheets are world-state authority |
| What the Bay Tribune published about a citizen, institution, promise, or storyline across Editions | Permanent `GodWorld` notebook | Best lane for published-narrative synthesis and source discovery |
| What is developing in today's newsroom | Working `GodWorld — Daily Newsroom` notebook or its generated brief | This notebook deliberately includes staged/sample leads and is **not canon** |
| Whether a NotebookLM synthesis is safe to quote as fact | Open and verify every cited source excerpt | NotebookLM prose can conflate names or inferences even when its citations are useful |
| Write, publish, ingest, or change canon | Never NotebookLM search | Those actions remain behind the normal publication and post-publish gates |

NotebookLM should be invoked on demand for questions that benefit from
cross-Edition reading. It does not belong in the boot sequence and should not
replace cheap exact-row lookup.

The protected `.claude/agents/source-search/SKILL.md` has a bounded
`prior-published-arc` lane. That lane may call only
`scripts/notebooklmCanonSearch.js`; exact-current and cross-file reconciliation
remain on deterministic GodWorld sources. The wrapper is read-only toward
NotebookLM, Sheets, publication artifacts, and canon. Its only local side effect
is a metadata-only retrieval event under `output/`.

## Current installation

GodWorld pins the working installation inside its own virtual environment:

```text
CLI: /root/GodWorld/.venv/nlm/bin/nlm
MCP server: /root/GodWorld/.venv/nlm/bin/notebooklm-mcp
Package: notebooklm-mcp-cli 0.8.5
Profile: default
Configuration: config/notebooklm.json
```

The configuration file owns the permanent and working notebook IDs. Do not
duplicate or hand-edit those IDs in scripts.

The project MCP registration is:

```json
{
  "notebooklm": {
    "command": "/root/GodWorld/.venv/nlm/bin/notebooklm-mcp",
    "args": []
  }
}
```

A new or reconnected agent session is required before MCP tools appear. The CLI
is the stable fallback when a client has not loaded that MCP server.

## Fresh setup

### 1. Create the isolated installation

From `/root/GodWorld`:

```bash
python3 -m venv /root/GodWorld/.venv/nlm
/root/GodWorld/.venv/nlm/bin/python -m pip install "notebooklm-mcp-cli==0.8.5"
/root/GodWorld/.venv/nlm/bin/nlm --version
```

Use the full paths shown in this guide. Do not depend on whichever `nlm` happens
to be on the interactive shell's `PATH`.

### 2. Apply the root-Chrome compatibility patch

The droplet runs the CLI as `root`. Chrome refuses to launch as root unless it
receives `--no-sandbox`. Upstream 0.9.4 still does not add that argument, so
GodWorld currently carries a one-line local installation patch.

Edit:

```text
/root/GodWorld/.venv/nlm/lib/python3.12/site-packages/notebooklm_tools/utils/cdp.py
```

Immediately after the Chrome argument list in `launch_chrome_process`, add:

```python
if hasattr(os, "geteuid") and os.geteuid() == 0:
    args.append("--no-sandbox")
```

Then validate without opening or printing any credential files:

```bash
/root/GodWorld/.venv/nlm/bin/python -m py_compile /root/GodWorld/.venv/nlm/lib/python3.12/site-packages/notebooklm_tools/utils/cdp.py
rg -n -C 3 "no-sandbox" /root/GodWorld/.venv/nlm/lib/python3.12/site-packages/notebooklm_tools/utils/cdp.py
```

This patch lives inside the virtual environment and **will be overwritten by a
package upgrade or reinstall**.

### 3. Authenticate through persistent Chrome

From the Chromebook Linux terminal, open an X11-forwarded SSH session:

```bash
ssh -Y root@<droplet-host>
```

On the droplet:

```bash
echo "$DISPLAY"
/root/GodWorld/.venv/nlm/bin/nlm login
```

Complete Google sign-in in the Chrome window rendered on the Chromebook. Leave
the command running until it reports successful authentication.

The normal login creates a dedicated persistent browser profile. That profile
allows the CLI's background auth replay to refresh rotated tokens without the
old manual cookie-export cycle.

Do not inspect, print, copy, or commit profile/cookie contents.

### 4. Verify every auth lane

```bash
/root/GodWorld/.venv/nlm/bin/nlm login --check
/root/GodWorld/.venv/nlm/bin/nlm notebook list
/root/GodWorld/.venv/nlm/bin/nlm doctor auth-replay --timeout 20
```

The auth-replay diagnosis should pass all available lanes, including saved HTTP
credentials, rotation, and in-page CDP. A successful `login --check` alone does
not prove that scheduled background replay works.

### 5. Verify the MCP registration

Confirm that `.mcp.json` points to the same virtual-environment server shown
above. Restart or reconnect the client, then list notebooks through the MCP
`notebook_list` tool. If MCP is not exposed in that client, use the full-path CLI
commands in this guide.

## Authentication recovery

Use this order when a scheduled job reports `Authentication expired`:

1. Run `nlm login --check`.
2. Run `nlm doctor auth-replay --timeout 20`.
3. If either fails, reconnect from the Chromebook with `ssh -Y` and run normal
   `nlm login`.
4. Re-run both checks and `nlm notebook list`.
5. Reconnect any already-running MCP client, or call its `refresh_auth` tool if
   that tool is already available.
6. Let the normal idempotency rules decide whether the daily job should resume;
   do not use `--force` casually.

Manual cookie-file login is an emergency fallback, not the normal maintenance
path. It authenticates the immediate request but does not provide the same
persistent browser profile for background recovery.

## Canon search

### Bounded query wrapper

Use the policy-enforcing wrapper from the repository root:

```bash
node scripts/notebooklmCanonSearch.js \
  --question "Trace <storyline> across the selected published sources. Cite every factual claim." \
  --source-ids <approved-id1,approved-id2>
```

The wrapper reads the permanent notebook ID from `config/notebooklm.json`,
validates the complete source policy against the current inventory, and passes
an explicit source-ID scope to `nlm notebook query`. It defaults to the reviewed
published set. `--source-class canon-reference` is allowed only for a
builder/orchestrator-authorized origin lookup; `--source-class all` requires an
explicit mixed-class need.

Useful wrapper controls:

```text
--source-ids <id1,id2>        Limit the answer to approved sources
--source-class <class>        published (default), canon-reference, or all
--timeout <30..180>           Bound the query duration
--log-path <output/*.jsonl>   Select a pipeline-owned metadata log
```

Queries persist in the notebook's web chat history. Treat that as an expected
side effect. Do not call `nlm notebook query` directly for the routed
source-search lane; doing so bypasses the reviewed source policy.

### Retrieval observability

Every wrapper attempt appends one event to
`output/retrieval/notebooklm-canon-search.jsonl` unless the owning pipeline
selects another `.jsonl` path inside `output/`. The record contains only:

- lane and source class;
- SHA-256 question hash, never the question;
- selected and used source IDs;
- citation count and duration;
- machine `resultStatus`: `not_run`, `no_result`, `auth_failure`,
  `citation_failure`, or `verified`;
- `reconcileVerdict`: `prior-only` after wrapper verification or `no-result`
  after failure. A consuming orchestrator records any later current-state
  reconciliation separately.

Answer text, excerpts, conversation ID, and raw error output are excluded.
Failure to append the event is itself a non-zero wrapper failure.

### Headless evaluation boundary

`scripts/notebooklmHeadlessEval.js` is a measurement harness, not a production
consumer. With no `--execute` flag it prints a fail-closed plan and makes no
external calls or local writes. An explicitly approved `--execute` run performs
one bounded canon-search query, creates isolated baseline/treatment drafts, and
runs both through the existing Rhea API gate. Its artifacts are `NOT_CANON`;
the harness never stages, publishes, ingests, or writes citizen records.

The default `direct-excerpts` mode measures bounded raw-excerpt injection.
`--retrieval-mode source-search-compact` instead invokes the protected
`source-search` agent, requires its evaluation-local wrapper metadata, caps the
return, validates every UUID/citation/excerpt, and only then permits writer
calls. A NotebookLM source title such as `bay_tribune_e99.pdf` is valid when it
appears with the approved source UUID; an actual path such as
`output/pdfs/...` is a scope escape.

Neither 2026-07-26 paired run justified headless adoption. The raw 15.9k packet
and the later 1,602-character, 3-claim source-search digest were both ignored by
their treatment writers; every baseline and treatment failed Rhea. Do not
schedule this harness or either append-only injection shape. A future
evaluation must bind one verified prior-arc claim into the Brief/PREWRITE
contract rather than append more context.

The 2026-07-27 binding evaluation validated that composition shape.
`--reuse-evaluation <manifest>` reused the prior verified digest without
another retrieval call, and `--bind-claim-index 3` created one validated
`NOT_CANON` requirement shared by the treatment writer and Rhea. The writer
used the required fourteen-corridor fact in the Article body and emitted its
`PRIOR_PUBLISHED` Evidence entry; Rhea accepted the historical fact. Both
drafts still failed unrelated name/canon checks, so this remains an evaluation
contract rather than scheduled integration.

A same-evidence hygiene pair then tested whether deterministic reporter-angle
name redaction plus a strict source prompt cleared those unrelated failures. It
did not. The treatment removed the known invented official and anonymous
bartender, but still relocated a canon person and canon business and misspelled
a name in Evidence. The lane's supplied quote text and POPIDs lacked enough
spatial provenance to prevent that move. Both sides used the required
prior-published fact. This confirms that NotebookLM retrieval and Brief binding
are not the remaining blocker; production needs a deterministic source roster
and output validation. Do not treat `--strict-source-hygiene` as a production
safety gate.

The underlying opt-in flags are evaluation-only:

- writer: `--brief-requirement-file`, accepted only with `--artifact-tag`,
  `--state-file`, and a file inside `output/cron-compare/evaluations/`;
- writer: `--strict-source-hygiene`, accepted only with `--artifact-tag` and
  `--state-file`; evaluation-only and empirically insufficient by itself;
- Rhea: `--evidence-file`, accepted only from that same evaluation directory;
- harness: `--reuse-evaluation` plus `--bind-claim-index`; its optional
  `--strict-source-hygiene` requires both and changes only the treatment lane.

Absent those flags, writer and gate prompts retain their existing behavior.

### MCP query

Direct `notebook_query` remains useful for operator diagnosis, but it is not the
policy-enforced source-search lane and its prose must not enter a Brief or other
canon-facing artifact. Routed published-canon research uses the wrapper.

### Verification contract

A search return is complete only when:

1. The answer is limited to the configured permanent notebook and the
   explicitly approved source class and IDs.
2. Direct fact and inference are separated.
3. Every material claim has a citation.
4. The cited source title and excerpt actually support the prose.
5. Any conflict with current Sheet/file state is reported, with current
   world-state authority winning.
6. No answer text is automatically written into Sheets, publication artifacts,
   or canon ingestion.

The 2026-07-25 live proof returned a cross-Cycle answer with nine citations from
three sources, demonstrating the retrieval strength. It also attributed one
quoted position to the wrong person while the cited excerpt named the correct
person. The citations made the error easy to catch; this is why source
verification is mandatory.

The 2026-07-26 Task 6 proof selected only Editions 98, 100, and 101. All three
were used; 15 citations had 15 matching excerpts. The local trace contained two
metadata-only events: the sandbox-denied first attempt as `no_result` and the
approved retry as `verified`. It contained no question, answer, excerpt,
conversation ID, publication artifact, or canon write.

## Post-publish additions

The permanent notebook receives only approved publication artifacts through
post-publish Step 1c:

```bash
node scripts/notebooklmPush.js --file <published-source> --cycle <N> --audio
```

Use `--audio` for an Edition. The wrapper:

- adds the approved artifact to the permanent notebook;
- captures the new source ID and scopes audio to that source;
- creates the Edition audio overview;
- downloads it to `output/audio/nlm_overview_c<N>.m4a`;
- delivers it through the configured Drive and Discord paths; and
- writes NotebookLM's source-grounded summary to
  `output/nlm_summary_c<N>.md`.

For an approved Dispatch, Supplemental, or Interview, omit `--audio` so scarce
Studio quota remains available for Editions:

```bash
node scripts/notebooklmPush.js --file <published-source> --cycle <N>
```

Do not run either command before the applicable user publication approval. The
wrapper is non-blocking by contract: auth, quota, or upstream API drift produces
a `NOTEBOOKLM ... (non-blocking)` warning so post-publish is not wedged. The
warning must still be recorded and repaired.

Verified 2026-07-25:

- the permanent notebook is reachable and contains 51 sources;
- `C101 — cycle_pulse_edition_101` is present;
- the post-publish skill calls `scripts/notebooklmPush.js` for every publication
  type and reserves audio plus summary capture for Editions; and
- local syntax checks for the wrapper pass.

## Daily newsroom listening brief

The working daily notebook is deliberately separate from the permanent
published notebook. Its output is a listening/research artifact, never an
Edition and never canon.

The daily job:

1. Finds the latest `output/world_summary_c<N>.md`.
2. Collects recent staged and ungated newsroom reports for that same Cycle.
3. Excludes flagged reports from the body.
4. Queries the permanent notebook for cited published continuity.
5. Builds one bounded source with current world state, clearly labeled
   developing reports, and published background.
6. Adds or reuses that bounded source in the working daily notebook.
7. Queries only that source for the written brief.
8. Generates a `default`-length deep-dive audio overview scoped only to that
   source.
9. Delivers the audio through the configured Drive and Discord paths.
10. Records a manifest and output under `output/notebooklm/daily/`.

The 08:00 job is intentionally a next-morning brief. The cron newsroom's write
wake is 18:15, so an eligible staged Article from that wake is about 13 hours
45 minutes old when Daily News collects it—well inside the 36-hour window.
The collector does not read raw writer drafts: only `.staged.md` and
`.sample.md` bodies are eligible, and `.flags.json` records exclude the matching
body.

Daily variation is source-driven:

- a new world summary changes the pack;
- new staged/sample Articles enter after a successful write/gate route;
- older Articles leave the rolling 36-hour window;
- flagged-exclusion membership or finding counts change the pack.

The source version, Cycle, paths, classifications, bodies, and flagged
exclusions all participate in the pack hash. If none changes, the completed job
no-ops instead of inventing novelty. Do not add random prompts or wall-clock
news merely to force a different program.

The live crontab entry is:

```cron
0 8 * * * /usr/bin/node /root/GodWorld/scripts/notebooklmDailyNews.js >> /root/GodWorld/logs/notebooklm-daily-news.log 2>&1
```

The droplet currently runs in `America/Chicago`, so that is 08:00 local time.
Always verify both `date` and `crontab -l` before relying on copied schedule
documentation.

Safe local checks:

```bash
node --check scripts/notebooklmDailyNews.js
node scripts/notebooklmDailyNews.test.js
node scripts/notebooklmDailyNews.js --dry-run
```

The dry run writes only local source-pack/manifest artifacts and does not call
NotebookLM, Drive, Discord, or other external services.

Operational status on 2026-07-25:

- the v1.2 short manual end-to-end run previously completed;
- the first scheduled run correctly degraded and sent a warning when the old
  authentication expired;
- persistent browser login now succeeds;
- `login --check`, notebook listing, and all auth-replay lanes pass;
- the local daily-news test suite passes; and
- the next distinct 08:00 scheduled run is the remaining post-reauth proof.

As of 2026-07-27, v1.3 changes only the audio length from `short` to the CLI's
supported `default` length and advances the source version so an
already-completed v1.2 manifest cannot skip the first v1.3 run. The written
brief, bounded source, 08:00 schedule, Drive delivery, and Discord delivery are
unchanged. The originally attempted `medium` value failed before audio
rendering because the installed CLI accepts only `short`, `default`, or `long`.

**Upstream input incident and repair:** the 2026-07-26 fan-out write created six
desk-only raw drafts while the orchestrator expected reporter-specific paths.
It recorded `0/6` and promoted no Article. The 2026-07-27 repair forwards each
non-persona reporter slug through the writer output namespace; deterministic
filename tests pass. The next scheduled 18:15 write wake is the live proof.
Daily News remains correct to ignore the orphaned raw drafts.

The working notebook currently has two sources. The job deduplicates an
unchanged bounded source by title/hash, but it does not yet implement source
retention or cleanup across distinct daily packs. Monitor the working notebook's
source count as an operational watch item; never delete sources from the
permanent notebook as cleanup.

## Version hold and upgrade policy

### Hold at 0.8.5 for now

Do not accept the interactive `0.8.5 → 0.9.4` upgrade prompt yet.

Reasons:

- 0.8.5 is the version currently authenticated and validated against both
  GodWorld scripts.
- The local root-Chrome `--no-sandbox` patch is inside the installed package and
  an upgrade will remove it.
- Upstream 0.9.4 adds Gemini Notebook rebrand/redirect support, but its current
  `launch_chrome_process` still does not add `--no-sandbox` for root.
- The next distinct scheduled daily run is still the cleanest proof that the new
  persistent profile survives unattended execution.

### Upgrade when

Upgrade in a maintenance window after all of these are true:

1. The next distinct daily scheduled run succeeds after the persistent-profile
   reauthentication.
2. No Edition post-publish or Studio render is in progress.
3. The target release changelog has been read.
4. The current upstream Chrome launcher has been checked for a root-safe fix.
5. The operator is ready to reapply the local patch, reauthenticate, and test
   both scripts in the same window.

The 0.9.3/0.9.4 line is worth adopting when Google migrates this account to
`notebook.google.com` or `notebook.cloud.google.com`, or once the post-reauth
scheduled proof is complete and the maintenance window is available.

### Staged upgrade procedure

This installation is a project virtual environment managed by `pip`, not a
standalone `uv tool`. Upgrade that exact environment:

```bash
/root/GodWorld/.venv/nlm/bin/nlm --version
/root/GodWorld/.venv/nlm/bin/nlm login --check
/root/GodWorld/.venv/nlm/bin/nlm doctor auth-replay --timeout 20
/root/GodWorld/.venv/nlm/bin/python -m pip install --upgrade "notebooklm-mcp-cli==0.9.4"
/root/GodWorld/.venv/nlm/bin/nlm --version
```

Then:

1. Reinspect `notebooklm_tools/utils/cdp.py`.
2. Reapply the root-Chrome patch if upstream still lacks it.
3. Run `py_compile` on that file.
4. Reauthenticate through `ssh -Y` and normal `nlm login` if required.
5. Run `login --check`, `notebook list`, and `doctor auth-replay`.
6. Confirm the CLI contracts used by the scripts:

```bash
/root/GodWorld/.venv/nlm/bin/nlm notebook query --help
/root/GodWorld/.venv/nlm/bin/nlm source add --help
/root/GodWorld/.venv/nlm/bin/nlm audio create --help
/root/GodWorld/.venv/nlm/bin/nlm download audio --help
```

7. Run the local syntax checks and `notebooklmDailyNews.test.js`.
8. Reconnect the MCP client.
9. Use one cited permanent-notebook query as the read-path smoke test.
10. Let the next normal scheduled daily run prove the write/render/delivery path.

Do not test an Edition addition with an unpublished or synthetic artifact in the
permanent notebook.

### Rollback

If compatibility checks fail:

```bash
/root/GodWorld/.venv/nlm/bin/python -m pip install "notebooklm-mcp-cli==0.8.5"
```

Reapply the root-Chrome patch and repeat authentication verification. Do not
delete the CLI-managed profile as part of a normal rollback.

## Failure map

| Symptom | Meaning | Response |
|---|---|---|
| `Authentication expired` | Saved HTTP tokens cannot complete the request | Run the recovery sequence; prefer persistent `nlm login` |
| Chrome will not launch as root | Local `--no-sandbox` patch is absent or was overwritten | Reinspect and reapply the root-Chrome patch |
| MCP server is registered but no tools appear | Client session did not load/reconnect the server | Reconnect the client; use the CLI meanwhile |
| Query returns citations but a name/detail conflicts with the cited excerpt | NotebookLM synthesis error | Use the excerpt, verify against authority, and discard/correct the prose claim |
| Daily job warns but exits zero | Expected non-blocking degrade contract | Repair the bridge and check the manifest/log; do not assume success |
| Same daily pack runs again | Idempotency should reuse/no-op when complete | Inspect its manifest before using `--force` |
| Working daily notebook source count keeps rising | No retention cleanup is implemented | Monitor; design cleanup separately; never apply it to the permanent notebook |
| Google redirects to a new Gemini Notebook host | 0.8.5 may no longer authenticate | Move to the staged 0.9.4+ upgrade procedure |

## Changelog

- 2026-07-25 — Initial operator guide. Captured the persistent X11/Chrome setup,
  root compatibility patch, auth recovery, version hold and staged upgrade,
  permanent canon-search lane, post-publish additions, daily-news flow, live
  verification results, and remaining scheduled-run/source-retention gaps.
- 2026-07-26 — Replaced the stale raw-query/file-only routing description with
  the fail-closed canon-search wrapper and documented its metadata-only Task 6
  retrieval log, controlled result statuses, path boundary, and bounded live
  proof.
- 2026-07-26 — Documented the evaluation-only headless harness and the negative
  Task 7 result. Raw verified-excerpt injection remains unscheduled and
  unadopted.
- 2026-07-26 — Added the fail-closed compact source-search evaluation mode and
  recorded its negative result. Compact append-only injection also remains
  unscheduled and unadopted.
- 2026-07-27 — Added and proved the evaluation-only structured Brief/reviewer
  binding. The historical claim was used and accepted, while production
  scheduling remains blocked by unrelated name/canon failures.
- 2026-07-27 — Documented the controlled strict-source-hygiene follow-up.
  Prompt-only hygiene reduced but did not clear Rhea failures, so a
  deterministic source roster remains required before production adoption.
- 2026-07-27 — Corrected Daily News v1.3 to the CLI-supported `default` audio
  length after the attempted `medium` value failed before rendering. The source
  version remains v1.3 so its partial manifest can resume without duplicating
  the bounded source. The resumed C102 run produced a 19m16s audio file and
  completed Drive + Discord delivery; schedule is unchanged.
- 2026-07-27 — Documented the 08:00/18:15 collection timing, source-driven
  variation/no-op contract, and the live fan-out filename mismatch currently
  preventing raw cron drafts from reaching the staged/sample input directories.
- 2026-07-27 — Recorded the fan-out filename repair. Roster reporter and persona
  output contracts pass offline; the next scheduled write wake is the live
  staging proof.
