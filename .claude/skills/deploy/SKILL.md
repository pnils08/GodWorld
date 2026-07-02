---
name: deploy
description: Deploy engine to Google Apps Script via clasp push with pre-flight checks, verification, and rollback guidance.
version: "2.0"
updated: 2026-07-02
tags: [engine, active]
disable-model-invocation: true
effort: medium
---

# /deploy — Engine Deployment

> **Skill bag:** senior software engineer deploying to production. The checklist below is *what* that skill executes; the bag adds caution defaults — verify before declaring success, name what's dirty if pushing from a dirty tree, treat clasp as production push because it is.

> **Authority (S282, Mike-direct):** deploys are the engine-sheet terminal's function across all terminals. No per-push ask; S250 attribution discipline binds (one unverified change in flight at a time). Other agents propose, don't deploy.

## Usage

```bash
CLAUDE_CTL=1 npx clasp push
```

**The deploy gate (S282):** `push` / `deploy` / `redeploy` / `undeploy` / `delete` are blocked unless `CLAUDE_CTL=1` is set — same opt-in pattern as the `.githooks/pre-commit` control-plane gate (S274). Gate source: `.githooks/clasp-gate.sh`, installed over `node_modules/.bin/clasp` by `.githooks/install-clasp-gate.sh`; `package.json postinstall` re-arms it after every `npm install`. The real binary sits at `node_modules/.bin/clasp-real` (used internally by the gate; also the ungated path for `pull` in scratch dirs). It is a speed bump for agents, not a security barrier.

**Push surface (verified S282):** ~164 engine `.js` files (`phase*/` + `utilities/`, minus `**/*.test.js`) + `appsscript.json` ≈ **166 remote files**. `lib/` and `scripts/` are claspignored — loop-side Node work never deploys. A legacy `graphify-out/graph.html` may linger remotely until the next contentful push purges it (claspignored S282).

## clasp 3.x behaviors (verified S282 — the skill's old 1.x/2.x notes were wrong)

- `clasp pull` has **no `--rootDir`**. To pull live code without touching the repo: make a scratch dir, `cp .clasp.json` into it, run `node_modules/.bin/clasp-real pull` from there.
- `clasp push` **skips silently when content-identical** ("Script is already up to date"). A `.claspignore` change alone does not push — removals purge only on the next contentful push. `-f` forces the *manifest* only.
- `clasp status` (= `show-file-status`) lists tracked files — it is **not** the push set and not a delta. The push output's `└─` list is the authoritative pushed set.
- Push is a full replace: remote files absent from the push set are deleted.

## Pre-Flight Checks

1. **Empirical deploy delta** — know exactly what this push changes. Full-replace means live-vs-HEAD is the only honest diff:
   ```bash
   mkdir -p <scratch>/clasp-live && cp .clasp.json <scratch>/clasp-live/
   (cd <scratch>/clasp-live && /root/GodWorld/node_modules/.bin/clasp-real pull)
   # diff every pulled *.js against the repo copy; list CHANGED / LIVE-ONLY / NEW
   ```
   The changed-file list is the payload. Confirm it matches what you believe is queued (git log on those files). One logical change-set per push (S250 attribution).

2. **Uncommitted changes** — `git status --porcelain`. Clasp reads the working tree, not HEAD: anything dirty in `phase*/`/`utilities/` WILL deploy. Dirty claspignored paths (docs/, .claude/, lib/, scripts/) are fine — name them anyway.

3. **Math.random() scan** —
   ```bash
   grep -rn "Math\.random()" phase*/ utilities/ --include="*.js" | grep -v "^\s*//"
   ```
   Remaining hits must be confirmed comment-only by eye (changelog comments mentioning past fixes are normal). Any live call site: STOP.

4. **Branch** — `git branch --show-current` should be main.

5. **File count sanity** — `find phase*/ utilities/ -name "*.js" ! -name "*.test.js" | wc -l` ≈ 164. A big swing means something structural moved; investigate before pushing.

## Deploy

```bash
CLAUDE_CTL=1 npx clasp push
```

Clasp prints every pushed file. Count the `└─` lines (~166).

## Post-Deploy Verification

Never report success from push output alone:

1. **Pull-back byte verify** — re-pull live into the scratch dir and `diff` each payload file against the repo copy. `live == HEAD` on every payload file, byte-identical, or the deploy did not land.
2. **No test files live** — `find <scratch>/clasp-live -name "*.test.js"` must be 0 (a pushed test harness crashes the engine at load: `require is not defined` — the C98 incident).

## Bookkeeping (mandatory)

- **SESSION_CONTEXT smoke-test note** — the deploy is unverified until a cycle runs on it. Update `NEXT[engine-sheet]` with what deployed + "smoke-test pending at C{N} run" (or "smoke-tested at run-{N}"). This is the terminal's hard rule; there is **no automatic deploy log** — the `.claude/hooks/pre-tool-check.sh` / `post-deploy-check.sh` files exist on disk but are NOT registered in settings (verified S282), so `deploy-log.txt` does not auto-stamp. The SESSION_CONTEXT note and the commit message ARE the record.
- **Commit the record** — SESSION_CONTEXT / control-plane commits need the git gate opt-in: `CLAUDE_CTL=1 git commit ...`.

## Failure Recovery

- **Gate block**: expected without `CLAUDE_CTL=1` — that is the gate working, not an error.
- **"Script is already up to date"**: nothing content-changed in the push set. If you expected a change, your edit is in a claspignored path — check `.claspignore`.
- **Auth error**: `npx clasp login` (interactive: have Mike run `! npx clasp login`).
- **Quota error**: wait 60s, retry once.
- **Partial push**: re-run — push is idempotent (full replace).
- **Rollback**: `git checkout` the prior commit of the payload files, `CLAUDE_CTL=1 npx clasp push`, then restore the working tree. Live always mirrors some committed state — never hand-edit in the Apps Script editor.

## Post-Deploy Checklist (report to user)

- [ ] Payload: which files, from which commits (empirical delta, not assumption)
- [ ] Files pushed: N (~166)
- [ ] Pull-back verify: live == HEAD on payload, 0 test files live
- [ ] SESSION_CONTEXT smoke-test note written
- [ ] Branch main; dirty files named (deployable vs claspignored)
