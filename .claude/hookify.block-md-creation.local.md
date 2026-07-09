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

MD creation flagged — zero new .md files without Mike's explicit approval in the current conversation (Mike-direct, S296). Edits to existing MDs via the Edit tool are separate; confirm before writing a new one.
