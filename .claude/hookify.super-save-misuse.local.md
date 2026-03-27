---
name: super-save-misuse
enabled: true
event: bash
pattern: super-save|super_save
action: warn
---

WARNING: /super-save writes to the bay-tribune container (agent-facing canon). Session work, bug notes, architecture decisions, and engine internals must go to the mags container via /save-to-mags or direct API call. bay-tribune is for published editions and world canon ONLY. If agents see system internals, they stop writing journalism. See docs/SUPERMEMORY.md.
