---
name: disk-rotate
description: Per-target retention + cleanup for noisy folders (claude-mem logs, bun cache, uv cache, old claude installer versions, session JSONLs, plugin marketplaces). Companion to /disk-audit (which is read-only). Dry-run by default; destructive only with explicit --apply --target X. Each target has a verification gate. Never schedules itself.
version: "1.1"
updated: 2026-05-06
tags: [architecture, infrastructure, active]
effort: medium
disable-model-invocation: true
---

# /disk-rotate — Per-Target Retention + Cleanup

## Usage

```bash
# Dry-run (default) — list candidates per target with policy + estimated recovery
/disk-rotate

# Per-target dry-run — focus on one bucket
/disk-rotate --target claude-mem-logs
/disk-rotate --target bun-cache
/disk-rotate --target uv-cache
/disk-rotate --target claude-versions
/disk-rotate --target session-jsonls
/disk-rotate --target plugin-cache

# Per-target destructive — explicit --apply per target, never global
/disk-rotate --target bun-cache --apply
```

**No global `--apply --all` flag exists by design.** Mike approves each target separately.

## Targets + retention policy

| Target | Policy | Verification gate (must pass before --apply) | Recovery |
|---|---|---|---|
| `claude-mem-logs` | Delete logs >2 days old | Sample 3 dates from each log → query mcp-search; require ≥1 observation per date | ~250 MB |
| `bun-cache` | Wipe `.bun/install/cache` (canonical: `bun pm cache rm`) | Confirm no process has `.bun/install/cache` open via lsof | ~900 MB |
| `uv-cache` | `uv cache prune --force` (lock blocks indefinitely on persistent MCP daemons) | None — chroma-mcp + claude-batch-mcp holders are expected, not a blocker | unknown; most cache is in-use install paths for persistent MCPs (~fixed cost) |
| `claude-versions` | Keep current (symlink target) + previous; remove older | `readlink /root/.local/bin/claude` → exclude active; `lsof` confirm older not in use | ~250 MB per old version |
| `session-jsonls` | Delete `.claude/projects/*.jsonl` files >30 days old | List candidates; require Mike eyeball before --apply | ~500 MB |
| `plugin-cache` | `.claude/plugins/cache/` + `.claude/plugins/marketplaces/` stale entries (>14 days) | List per-plugin; require Mike approval | ~500 MB |
| `claude-debug` | `.claude/debug/` + `.claude/cache/changelog.md` if >30 days | None — pure debug ephemera | ~few MB |
| `pm2-logs` | Truncate (not delete) `/root/.pm2/logs/*.log` >10 MB | None — pm2 keeps writing to truncated files | ~few MB rolling |

## Verification gates (universal — always run, regardless of target)

1. **Disk free check** — print `df -h /root` before AND after; if free space change is unexpected (less than 50% of estimate, or NEGATIVE), abort and report.
2. **lsof open-file check** — for any target involving file deletion, run `lsof` on candidate paths first; abort if anything has them open.
3. **Process-still-alive check** — for verifications that depend on background processes (claude-mem worker for `claude-mem-logs`, MCP servers for `uv-cache`), confirm the worker pid is alive AND idle (not mid-write to its destination DB).
4. **AUDITS.md row** — every `--apply` run appends a row to `docs/AUDITS.md` Run history table.

## Pattern — what each target does in --apply mode

### `claude-mem-logs`
1. List all `.claude-mem/logs/claude-mem-*.log` files; group by named date.
2. For each log named for date D where D ≤ today − 2:
   - Query mcp-search for ≥1 observation dated D.
   - If found → safe to delete; print path + size.
   - If not found → **skip** this log + warn ("autodream may not have processed; will retry next run").
3. Print combined recovery estimate. **Wait for explicit Mike confirmation in chat before `rm`.**
4. `rm` confirmed-safe logs.
5. Append AUDITS.md row.

### `bun-cache`
1. `lsof +D /root/.bun/install/cache` → must be empty.
2. Confirm `bun` binary at `/root/.bun/bin/bun` (not in cache path).
3. Run `bun pm cache rm`.
4. Append AUDITS.md row.

### `uv-cache`

**Persistent-MCP framing (S204 lesson):** chroma-mcp + claude-batch-mcp are long-lived MCP daemons. Claude Code spawns them at session start and they immediately re-attach to the uv cache. "Fresh session boot" does NOT release them. Plain `uv cache prune` blocks indefinitely on the cache lock these daemons hold. The 1.1 GB cache is the fixed cost of running these MCPs — most of it is reachable, in-use install paths, NOT prunable.

1. `lsof +D /root/.cache/uv` → list holders for the record. chroma-mcp + claude-batch-mcp expected; this is NOT a blocker.
2. Run `uv cache prune --force` (override the cache-lock wait; still safe with active processes — only removes unreachable objects).
3. Verify recovery via `du -sh /root/.cache/uv` before/after; expect modest delta (KB-MB range, not GB).
4. If recovery <10 MB: don't re-run until tools are uninstalled. The cache is fixed cost.
5. Append AUDITS.md row.

### `claude-versions`
1. `readlink -f /root/.local/bin/claude` → resolve current.
2. List all `/root/.local/share/claude/versions/*` files.
3. Sort by version semver; keep the active version + the previous 1; mark older for delete.
4. `lsof` each candidate; abort if anything has them open.
5. Print delete list with sizes. **Wait for explicit Mike confirmation.**
6. `rm` confirmed list.
7. Append AUDITS.md row.

### `session-jsonls`
1. List `.claude/projects/-root-GodWorld/*.jsonl` files.
2. Group by mtime; mark files >30 days old.
3. Print candidate list (path + size + age + first-line preview).
4. **Wait for explicit Mike eyeball + confirmation.** These contain session transcripts; the destructive call belongs to Mike, not the verification gate.
5. `rm` confirmed list.
6. Append AUDITS.md row.

### `plugin-cache`
1. List `.claude/plugins/cache/*/` + `.claude/plugins/marketplaces/*/` directories.
2. Mark dirs whose mtime is >14 days as stale.
3. **Wait for Mike confirmation per dir** (or accept blanket "delete all marked" with explicit `--blanket-stale`).
4. `rm -rf` confirmed dirs.
5. Append AUDITS.md row.

### `claude-debug`
1. `rm /root/.claude/debug/*` if mtime >30d.
2. Append AUDITS.md row. Lower-ceremony than other targets — debug files are pure ephemera.

### `pm2-logs`
1. For each log under `/root/.pm2/logs/*.log` larger than 10 MB:
   - `truncate -s 0 <path>` (pm2 holds an open fd; truncating preserves the fd while clearing content).
2. Append AUDITS.md row.

## What it does NOT do

- Does **not** schedule itself. Always manually invoked.
- Does **not** auto-delete anything in dry-run mode (the default).
- Does **not** touch:
  - `.claude-mem/chroma/` (the vector DB itself — back up before ANY destructive action)
  - `.claude-mem/claude-mem.db` (the digested observations DB)
  - `GodWorld/` working tree (use git commands for that)
  - `.git/` directories anywhere
  - System paths (`/usr`, `/var`, `/opt`, `/etc`)
  - Backups (`/root/GodWorld/backups/` — managed by `scripts/backup.sh` rotation)

## Companion skills

- **`/disk-audit`** — read-only inventory + classification + report. Run this FIRST to identify candidates; then `/disk-rotate --target X` against the surfaced bucket.
- **`/md-audit`** — existence-staleness for `.md` files. Sometimes surfaces orphan markdown that becomes a `/disk-rotate` target.
- **`/health`** — lightweight check; will print disk-pressure signal if >85%.

## Plan + acceptance

Plan file: this skill is the operationalization of the S203 cleanup pattern that recovered ~1.2 GB by running canonical commands manually (`bun pm cache rm`, manual `rm` of stale logs + claude versions). The skill encodes those gates so future runs are deterministic + Mike-supervised.

Future extensions (not built):
- `--target playwright-binaries` / `--target puppeteer-binaries` (~1 GB combined) — requires audit of which MCPs use them; if MCP is uninstalled, browser binary is dead weight.
- `--target node-modules-stale` — for GodWorld project deps not touched in N days, surface for manual `bun install --clean` cycle.
- `--target chroma-checkpoint` — copy `.claude-mem/chroma/` to `/tmp/<DATE>/` before any chroma-touching destructive action elsewhere.

## Tracking

Every `--apply` run appends a row to `docs/AUDITS.md` Run history. That table is the single index of cleanup actions across all audit skills.
