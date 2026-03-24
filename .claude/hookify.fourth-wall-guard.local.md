---
name: fourth-wall-guard
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.claude/agents/
  - field: new_text
    operator: regex_match
    pattern: godworld|GodWorld|simulation|simulator|engine phase|buildDeskPackets|buildDeskFolders|editionIntake|the builder|the user|Mike Paulson is the
---

**Fourth wall breach detected in agent file.**

Agent-facing files must never reference the simulation infrastructure, engine internals, or the builder's identity. Agents are reporters in a real city — they don't know they're in a simulation.

Check what you're writing and remove any system-level references before saving.
