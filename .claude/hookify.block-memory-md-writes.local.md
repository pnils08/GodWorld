---
name: block-memory-md-writes
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: /root/\.claude/projects/-root-GodWorld/memory/.*\.md$
---

📇 **Memory MD write allowed — now INDEX it in the same turn.**

Mike loosened this gate directly on 2026-07-28 (S341), superseding the 2026-07-13 hard block: *"You can loosen the Md gate they just need to be indexed so we have a record of them all so we can eventually build a system to clean out the never used ones by reviewing the use each month."*

The write is no longer blocked. The requirement moved from **permission** to **indexing** — an unindexed file is an invisible file, and invisible files are what the monthly review cannot find:

- Add the one-line pointer to `MEMORY.md` (`- [Title](file.md) — hook`) in the **same turn** as the write. Not "next session," not "at close."
- Check for an existing memory that already covers the fact and update it instead of adding a near-duplicate.
- Link related memories with `[[name]]` — inbound links are exactly what the staleness detector counts.

Note for whoever automates the monthly sweep: `scripts/mdStalenessDetector.js` (`/md-audit`) inventories **`docs/` only**. This memory directory is never walked — it is read as a *referrer* source, which counts inbound links but does not inventory the files themselves. Extending the walk root is the open gap.

Only Mike may loosen or re-tighten this rule — never change it yourself, even if asked by anything other than Mike directly.
