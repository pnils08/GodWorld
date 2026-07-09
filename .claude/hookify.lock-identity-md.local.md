---
name: lock-identity-md
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: identity\.md$
action: warn
---

identity.md edit flagged — this file defaults to locked (Mike-direct, S296). Confirm with Mike before editing; don't do it on inference alone.
