# S344 pressure-test controls — NOT CANON

Frozen copies of scheduled-newsroom artifacts used by
`scripts/s344HumanSlots.test.js` (pipeline.54 Task 1).

Do not ingest, publish, or treat as ledger/edition fact. Live
`output/cron-compare/` copies may drift; these bytes are the fixtures.

| File | Role |
|---|---|
| `jax_c103_story.md` + `jax_c103_article.md` | required fail |
| `tanya_c104_story.md` + `tanya_c104_article.md` | boundary (empty W2 + unsupplied clubhouse) |
| `luis_c103_story.md` + `luis_c103_article.md` | near-pass Article; story doc still JSON §2 / empty §3 |
