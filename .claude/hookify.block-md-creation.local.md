---
name: block-md-creation
enabled: true
event: file
conditions:
  - field: tool_name
    operator: regex_match
    pattern: ^Write$
  - field: file_path
    operator: regex_match
    pattern: \.md$
action: warn
---

📇 **New MD allowed — now REGISTER it in `docs/index.md`, same turn.**

Mike loosened this gate directly on 2026-07-28 (S341), superseding the S296 "zero MDs without approval" rule: *"You can loosen the Md gate they just need to be indexed so we have a record of them all so we can eventually build a system to clean out the never used ones by reviewing the use each month."*

Approval is no longer the bar. **Indexing is.** A doc nobody can find is worse than no doc — and an unregistered doc is invisible to the monthly cleanup Mike is building toward.

- Add the entry to `docs/index.md` in the **same turn** as the write. Not later.
- Link it from at least one existing doc and link out to at least one — inbound-link count is what `/md-audit` uses to separate load-bearing docs from orphan-candidates.
- Editing an existing MD is unaffected; this fires on new-file `Write` only.

Still worth a beat before you create one: is this a genuinely new doc, or a section belonging in a doc that already exists? The corpus is ~489 active MDs and the failure mode is a new file beside a working one (`feedback_fix-dont-add`).
