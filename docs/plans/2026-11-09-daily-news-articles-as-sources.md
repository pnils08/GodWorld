# Daily news: every article its own source (pipeline.108)

**Row:** pipeline.108 · **Owner:** research-build · **Opened:** 2026-11-09 · **State:** in-progress

## Why

Builder 2026-11-09: "I spend money on 5-6 articles a day and you trim it to a repeated report telling me what my sim is" · "I pay for every word a cron writes, 30+ articles, 100s of wake reflections, I hear about none of it" · approval: "Yes and sources don't need to be on one document, no LLM reads that long of a document".

Measured before the change (`scripts/notebooklmDailyNews.js` v1.9):

| Fact | Value |
|---|---|
| Sources in the working notebook per day | 2: one glued file + the rulebook (`config/audio_direction_daily.md`). No article was ever its own source |
| Glued file size | 12–29k words; one show is ~4,900 spoken words |
| Mon 11-09 (C115 first morning) | 0 articles in 12,550 words: sports feed 40%, canon-notebook dossier 25%, What Moved 11% |
| Fri 11-06 | articles 30%, city record 39%, dossier 17% |
| Zero-article runs of the last 14 | 10-26, 11-02, 11-03, 11-09 (current-Cycle filter drops the prior Cycle's late filings) |
| Reflections | digest takes 5 citizens × 2 a day; ~33 a day are written (230 in C114) |
| Repeats | 15 of 84 pieces rode 2+ delivered shows (36 h window, daily run) — mostly gate-flagged drafts |

## What changes (v2.0)

1. **One source per article.** Every STAGED / UNGATED_SAMPLE article in the window is uploaded to the working notebook as its own source, titled `The Bay Tribune Daily C<N> — <Reporter>: <headline>`, body = byline + `readerCopy`. Edition day: `editions/cycle_pulse_c<N>.txt` is split on its `====` rules, one source per article; the Civis journal and the UNDOCKED digest are each a source.
2. **Reflections as sources.** `buildCitizenWeekDigest.buildDigest({daily:true})` also returns every reflection in the 24 h window grouped by citizen (uncapped). The daily run writes one source per neighborhood: every citizen who wrote, by name, every reflection. A reporter's `filed:` / `graded:` rows are newsroom record, not a citizen's words, and stay out.
3. **World report only when it is new.** First morning of a Cycle: the world summary is split by `##` section, one source each, Sports cut to the current Cycle's `### C<N>` block. Every other day: no world report.
4. **Out of the audio sources:** the rulebook (no longer uploaded; `config/audio_direction_daily.md` deleted), the canon-notebook dossier (the two-edition continuity block; replaced by point 9), reporter chase notes and assignment quotes, gate-flagged drafts (builder ruling 2026-10-17: not news).
5. **Focus** is one short instruction: stories by reporter, citizens by name, sources are the only truth about this Oakland.
6. **Airs once.** A piece already carried by a delivered show on an earlier day (path in that manifest, file not modified since) is not carried again; a piece no delivered show carried stays eligible for 72 h (`UNAIRED_CARRY_HOURS`), so a failed morning does not lose its articles. With that in place the Cycle filter admits the previous Cycle's pieces still inside the window, so a Sunday-afternoon filing airs Monday.
7. **Ops report** (non-blocking, after the audio): flagged drafts + gate findings go up as one `gate desk file` source only after the audio is created, since `--source-ids` is a hint.
8. **Manifest:** `sources: [{kind,title,hash,id,file,path}]` replaces `boundedSource*` / `audioDirectionSourceId`. Re-run in the same run dir reuses a source when title+hash match and the id is still in the notebook. One failed upload is logged and skipped; the run fails only when no source lands. Prune pattern unchanged (`The Bay Tribune Daily C<N> — ` / old guide titles), so hand-added sources stay.

9. **Deep canon per story (builder 11-09 "Yes").** Each staged/sample article that is not lore asks the permanent notebook one question through `scripts/notebooklmCanonSearch.js` (whole live notebook; its log shows 30–65 s a question, 3 in 10 uncited answers that pass on retry): the published history of the people, places and storylines in the piece, under 400 words. The answer is a `From the archive — <headline>` source placed beside its article. Three tries, 15-minute total budget, non-blocking, cached in `background/` in the run dir. On both live runs of 2026-11-09 only 2 of 6 landed: NotebookLM returned on-topic answers with `citations: {}` and the fail-closed wrapper dropped them. Builder ruling 2026-11-09: "I don't think citing sources is necessary tbh for this, these don't write back into canon, yet anyway… I'm its god and nothing happens for them if I don't hear it". The wrapper gained `--allow-uncited` (a wholly bare answer passes, marked; default unchanged); only the daily news passes it. Live check after: 6 of 6. If the daily notebook ever writes back into canon, this flag comes off first.

## Review

Codex diff review of `ae8d72065`: [[../for-claude-review/2026-11-09-codex-pipeline108-diff-review]] — HOLD, six findings, each checked against the code and folded:

| # | Finding | Fold |
|---|---|---|
| F1 | A partial upload marked unheard articles aired | Aired = v2.0 manifest `sources` of kind `article` with an id; upload retried once |
| F2 | Gate desk file could stay in the news notebook if next day's prune fails | Deleted when the ops step ends (`finally`) |
| F3 | Resume delivered the notebook's latest audio unpinned (predates this job) | Recovery delivers only a recorded render: this run dir's, else the newest undelivered manifest's, whose `sources` become the delivered record; none on record → it refuses |
| F4 | Same-run-dir re-run delivered twice (predates this job) | A delivered manifest is a no-op without its local audio |
| F5 | Headline-less edition pieces titled `INTAKE` | Label read from reader copy |
| F6 | Reflections clipped at 2,000 chars | Unclipped |

## Tasks

| # | Task | Status |
|---|---|---|
| 1 | Plan + ROLLOUT row | done |
| 2 | `buildCitizenWeekDigest.js`: return `citizens` (all reflections in window) | done |
| 3 | `notebooklmDailyNews.js`: `buildDailySources`, per-source upload, focus, airs-once, prior-Cycle carry, ops source, manifest | done |
| 4 | `notebooklmDailyNews.test.js` updated, green | done |
| 5 | `--dry-run`, then live `--no-audio --no-deliver` (real uploads, no audio quota, no Discord) | done — 23/23 in, 2 stale pruned, list read back |
| 6 | `docs/reference/NotebookLM.md`: two-notebooks row, daily steps, Change log | done |
| 6b | Canon background per article + codex fold; tests green; live `--no-audio --no-deliver` | done |
| 7 | Read the Tue 2026-11-10 08:00 show: the five C115 articles of 11-09 evening each heard by reporter; reflections by name | open |

## Not in this job

- The ops report never arrived (log: `DAILY OPS REPORT SKIPPED`): fixed under pipeline.109.
- Daily router (format/length) untouched.
- pipeline.109 (cron feedback to the builder, the ops report, Varek's journal): [[2026-11-10-cron-feedback-to-builder]].
