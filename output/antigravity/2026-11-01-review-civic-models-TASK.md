# TASK — agy: review the civic seat model swap (one commit)

Read-only. Do not edit, commit or push. Write your review to `output/antigravity/2026-11-01-review-civic-models.md`, under ~50 lines.

**Read.** `git show HEAD -- scripts/civic-office-map.json scripts/cron-civic-run.js scripts/cron-civic-week-carry.test.js` (the diff), then `scripts/cron-civic-run.js:880-1000` (modelFamily, the Sunday --model default and the friction rule), `:1405-1430` (fallback chain), `:1700-1760` (batch eligibility), `:1500-1512` (officeModel). The builder's rule: each seat family stays distinct (not everything on Claude); the Sunday hearing's batch route is only for models in BATCH_PROFILES.

**Fail an item if:** (1) a seat's new model id is not one OpenRouter serves (list: `https://openrouter.ai/api/v1/models` is not reachable for you — judge from `scripts/cron-civic-run.js` comments and the commit message's probe claim; flag anything you cannot verify as UNVERIFIED, not FAIL); (2) two seats that were on different families now share one, or the mayor's family equals the Sunday default's (friction rule) or equals a fallback's family (the chain would skip it); (3) a code path still names an old id as a default where the map no longer uses it; (4) a test asserts an old id; (5) the batch route would be handed a model that is not in BATCH_PROFILES.

**Format.** First line `VERDICT: <n> pass, <n> fail`. Then one entry per failed item (file:line, rule number, one-line fix). Nothing else.
