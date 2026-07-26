---
title: Gemini Notebook / NotebookLM CLI Operations
created: 2026-07-25
updated: 2026-07-25
type: reference
tags: [infrastructure, media, active]
sources:
  - docs/plans/2026-07-10-notebooklm-bridge-deploy.md
  - docs/research/2026-07-10-notebooklm-mcp.md
  - config/notebooklm.json
  - scripts/notebooklmPush.js
  - scripts/notebooklmDailyNews.js
  - .claude/skills/post-publish/SKILL.md (read-only control-plane consumer)
  - https://github.com/jacob-bd/gemini-notebook-mcp-cli
pointers:
  - "[[../plans/2026-07-10-notebooklm-bridge-deploy]] — build history, proofs, and remaining acceptance gate"
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

The existing `.claude/agents/source-search/SKILL.md` is currently a file-only
retrieval agent. NotebookLM is registered in `.mcp.json`, but automatic routing
from that protected agent to NotebookLM has **not** been added. Until a
separately approved control-plane change does that, an orchestrator or operator
must choose the NotebookLM lane explicitly.

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

### CLI query

Read the permanent notebook ID from `config/notebooklm.json`, then run:

```bash
/root/GodWorld/.venv/nlm/bin/nlm notebook query <permanent-notebook-id> "Using only the published sources in this notebook, trace <storyline>. Separate direct published fact from inference, identify conflicts or missing evidence, and cite the source title for every major claim." --json --timeout 180
```

Useful query controls:

```text
--source-ids <id1,id2>        Limit the answer to known sources
--conversation-id <id>       Ask a follow-up in the same conversation
--json                       Preserve sources_used, citations, and references
--timeout 180                Allow a complex cross-source answer to finish
```

Queries persist in the notebook's web chat history. Treat that as an expected
side effect.

### MCP query

When the server is loaded, use `notebook_query` against the permanent notebook.
Ask for the same fact/inference separation and source-title citations. Use
`source_list` to resolve cited source IDs when needed.

### Verification contract

A search return is complete only when:

1. The answer is limited to the permanent published notebook.
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
8. Generates a `short` deep-dive audio overview scoped only to that source.
9. Delivers the audio through the configured Drive and Discord paths.
10. Records a manifest and output under `output/notebooklm/daily/`.

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

- the v1.2 manual end-to-end run previously completed;
- the first scheduled run correctly degraded and sent a warning when the old
  authentication expired;
- persistent browser login now succeeds;
- `login --check`, notebook listing, and all auth-replay lanes pass;
- the local daily-news test suite passes; and
- the next distinct 08:00 scheduled run is the remaining post-reauth proof.

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
