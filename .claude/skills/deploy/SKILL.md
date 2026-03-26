---
name: deploy
description: Deploy engine to Google Apps Script via clasp push with pre-flight checks, verification, and rollback guidance.
disable-model-invocation: true
effort: medium
---

# /deploy — Engine Deployment

## Usage
`/deploy` — Push all 153 engine files to Google Apps Script

## Pre-Flight Checks (automated)

Before pushing, verify:

1. **Uncommitted changes** — `git status --porcelain`
   - If dirty: warn which files will deploy but aren't committed
   - Recommend committing first so git history matches deployment

2. **Math.random() scan** — quick grep across phase*/ and utilities/
   ```bash
   grep -rn "Math\.random()" phase*/ utilities/ --include="*.js" | grep -v "^\s*//" | grep -v "^\s*\*" | grep -v "Replaced Math" | grep -v "instead of Math"
   ```
   - Any non-comment hit: STOP. Fix before deploying.

3. **Branch check** — `git branch --show-current`
   - Warn if not on main

4. **Changed files since last deploy**
   ```bash
   git diff --name-only HEAD~1 -- '*.js' | head -20
   ```
   - Show what's different so the user knows what's going out

5. **File count** — `find phase*/ utilities/ lib/ -name "*.js" | wc -l`
   - Should be ~153. If significantly different, something's wrong.

## Deploy

```bash
clasp push
```

Wait for output. Clasp prints every file it pushes.

## Post-Deploy Verification

After clasp push succeeds:

1. **Check clasp status**
   ```bash
   clasp status | tail -20
   ```

2. **Verify file count in output**
   - Count the "Pushed N files" line from clasp output
   - Compare against expected ~153

3. **Quick smoke test** — read a known function from the deployed script
   ```bash
   clasp pull --rootDir /tmp/clasp-verify 2>/dev/null
   grep -l "runCareerEngine_" /tmp/clasp-verify/*.js 2>/dev/null
   rm -rf /tmp/clasp-verify
   ```
   - If the function exists in the pulled version, deployment landed

## Failure Recovery

If clasp push fails:
- **Auth error**: Run `clasp login` manually (`! clasp login`)
- **Quota error**: Wait 60s, retry once
- **File conflict**: Check `.clasp.json` for correct scriptId
- **Partial push**: Re-run `clasp push` — it's idempotent (full replace, not incremental)

## Post-Deploy Checklist

Report to user:
- [ ] Files pushed: N
- [ ] Branch: main/other
- [ ] Uncommitted changes: yes/no
- [ ] Math.random() violations: 0
- [ ] Verification: passed/failed

## Rules

- NEVER deploy without showing the pre-flight to the user first
- NEVER deploy if Math.random() scan finds violations
- Always verify after deploy — don't report success based on push output alone
- The pre-tool-check.sh hook will also fire on `clasp push` — that's expected, not a conflict
