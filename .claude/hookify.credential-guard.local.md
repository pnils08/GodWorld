---
name: credential-guard
enabled: true
event: file
action: warn
conditions:
  - field: new_text
    operator: regex_match
    pattern: maravance@godworld|service-account\.json|ANTHROPIC_API_KEY\s*=\s*["']sk-|SUPERMEMORY_API_KEY\s*=\s*["']
---

**Credential or service account reference detected.**

Do not hardcode API keys, service account emails, or credential paths in code files. Use environment variables or the credentials/ directory (which is gitignored).
