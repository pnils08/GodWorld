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

10. **Weekend (builder 11-10).** "No day should duplicate the same source when there is so many crons producing content"; weekends run UNDOCKED and the citizen-coverage pair, and "whenever a day is light more cron citizen coverage fill the voice". The daily run no longer carries the edition or a staged piece the Saturday run printed in it (`edition_published_c<N>.json` `selected`); edition day carries the Civis journal (kept out of the canon notebook for now, builder 11-10: "see what he writes") and what is new. This replaces point 1's edition split and the 2026-10-18 edition-day fold; re-review R4 no longer applies. The day's citizen conversation from `citizen-exchange.js` (`output/exchanges/`, 67 on disk, only speaker excerpts ever aired) rides once as its own source. **Weekly show:** the rulebook `config/audio_direction_weekly.md` is deleted and no guide is uploaded into the permanent notebook; one short focus with no word about what the world is (4th wall: that notebook is canon); the edition stays one source (builder: "Leave as is"). Not proven until the Sat 11-14 16:00 run. Known edge: a printed piece is skipped by the daily even if the Saturday audio itself failed to render.

11. **First show read (Tue 11-10 08:00, builder):** "same crap, 'data is detached from the sim', instructions read back to me, living hell the city". The run did what was built (24 sources in, 6 of 6 backgrounds, ops report delivered). Two causes. (a) Mine: the focus sentences and the framing lines inside the archive / reflection / conversation sources are text for the hosts, and hosts repeat it — all removed; focus is the show's name. (b) Upstream: the show now relays the articles, and the civic and business pieces are written about the record itself ("The Record Names Two Households", "the Rows Do Not Say Why", "What no row can name", "I don't know who decided"), each closing on what is unknown. That is the reporters' brief (`cron-desk-run.js`: "End on ONE unanswered question"), not this script. Needs the builder's call and its own row.

12. **Task 7 read of the same show against its 24 sources (research-build, 2026-11-11).** Transcript `output/notebooklm/daily/c115/68f51dde275b/transcript.txt`, 20:15, 3,927 words; sources in the run's `sources/`.

    | Asked | Found |
    |---|---|
    | Five C115 articles of 11-09, each by reporter | All five reporters named. Told at length: Delaine (fund, 01:29–05:22), Mezran (Chinatown, 05:22–08:25), Velez (Marine Systems, 08:25–10:46), Shimizu (transit, 14:45–17:22). Pruitt's "The Lives of C115" got about 45 seconds: Keane and Lilo of its 15 people; Salcedo's promotion, Ramiro's and Lewis's moves, the two households into West Oakland, the UNDOCKED stakes and the rest unheard |
    | The two carried pieces | Sorensen's Voices (C114): all three citizens heard. The Ellis lore piece: about two minutes, its writer (Raines) named at the open and credited with Sorensen for the 127 wins and seventh title, which are in the archive backgrounds and the lore piece, not in Voices |
    | Reflections by name | 17 citizens in ten neighborhood sources; 15 named on air (not Salcedo, not Ramiro). Heard from their own source lines: Corliss, Nwosu, Brown, Vinnie Keane (whole entries), Caldera, Ramos, Lee (the 180). Adeyemi, Cartier, Mehta, Soria Dominguez and Lilo were heard through the articles that quote them (Lilo's 4:30 alarm is in Pruitt's piece, past where her line was cut); Amara Keane through the conversation source; Linas named without her words; Seymour named as a patient, his quote in Mezran's piece unheard |
    | Were the reflections whole (F6 "Unclipped") | **No.** 15 of the 19 lines were 180 characters, cut mid-word ("The bakery knows whos"). Not this script's clip: `citizenVoice.js:279` and `citizen-exchange.js:198` write `slice(0, 180)` to the tab; the whole text is on the citizen's page. Fixed, Task 8 |
    | Said on air, not in any source | "$6.9 million … vanished into thin air" (the article: one $400,000 tranche, $81,188 of it named, "may therefore have gone to businesses"; the archive background carries Webb's 79 households); "the ambulances aren't coming", "a completely unrecorded shadow economy of care", Nwosu "knows her official data is a fiction" (her page says none of it; Mezran's piece says the plumber's account "is not a finding about the 129"); "fired two people" (Velez: no reason on the record; Linas: "I don't know the full story of why the other two left"); Soria Dominguez and Cartier "completely dismiss the stacking theory" (neither does; Cartier names the vote and the game himself); the smoke-detector and rebar comparisons; the close, "does the publication of a clean official ledger actually hurt the city" |
    | Read back from a framing line | 01:11 "We're using the archive strictly for background, not as today's news" (the archive source's "Earlier coverage, not today's news."); 00:52 "diary style pages" (the reflection source's intro). Both lines were removed 11-10 (point 11a); the Wed 11-11 run's sources carry neither |
    | Where the one theme came from | Record-words (ledger, record, tracker, row, sheet, census, metrics) per piece: Shimizu 27, Delaine 22, Velez 14, Mezran 13, Pruitt 13, Raines 2, Sorensen 0. Five of the six archive backgrounds end on a shortfall sentence (not the Lives one). The reporters' side is pipeline.111's (its plan opens on this transcript). Point 11b's `cron-desk-run.js` quote left that file in `1a294729d`; the write packet's `output.rule` still reads "… one Packet quote, unanswered question" (C115 gap log G-EC47) |

    Not checked: how names were pronounced (the transcript is speech-to-text); why Mags Corliss's entry ends mid-sentence in the source (her tab row, 902 characters).

## Review

Task 8: an agy review of the diff was requested 2026-11-11 (brief `output/antigravity/2026-11-11-brief-pipeline108-whole-words.md`) ; its file, if it lands, reviews the code now in effect and is checked finding by finding before any fold.

**Builder 2026-11-11, on the daily show, verbatim:** "Daily News sucks cause you don't understand how to use agents, you keep telling notebook what to say and it doesn't work, I choose 3 files inn the weekly notebook, give it no instructions, and it's perfect, stop telling agents what to write" · "Give it sources not direction". What the daily run still says to NotebookLM, read from `notebooklmDailyNews.js` the same night: the audio `--focus` (the show's name); the written brief's question (`dailyPrompt`: "led by the newsroom's own reports, told by reporter … Leave out … Close with what the newsroom should watch next", plus the first-morning and edition-day clauses); the per-article archive question (`backgroundQuestion`, three paragraphs of rules, its answer uploaded as a source); the ops report question; the router's choice of format and length. The weekly run sends a `--focus` too (`notebooklmPush.js`, the edition's name). A removal of the two focus lines and the archive question was started that night and put back unbuilt on the same word (nothing approved). Nothing here was changed until his word.

**2026-11-12 00:40, built on "Rule 1, no caps" and "do whatever you think I want":** no `--focus` on the daily or the weekly audio; the per-article archive question is not asked (point 9 off; the function is kept, uncalled); `citizenVoice.js` and `citizen-exchange.js` write the citizen's whole words to the tab (the 180 cut removed at its source). Left as is: the written brief's question, the ops report question, the router. Tests green, dry run through `run()`. Read: Thu 11-12 08:00 daily, Sat 11-14 weekly.

**2026-11-12 01:00, archive question back on (builder: "So no canon ???"):** point 9 is in effect again, unchanged. Cutting it removed the only canon the daily show has. Open: canon as sources (the past published pieces about a story's people, uploaded as they were printed) in place of an answer written to a question; not built, no row.

Codex diff review of `ae8d72065`: [[../for-claude-review/2026-11-09-codex-pipeline108-diff-review]] — HOLD, six findings, each checked against the code and folded:

| # | Finding | Fold |
|---|---|---|
| F1 | A partial upload marked unheard articles aired | Aired = v2.0 manifest `sources` of kind `article` with an id; upload retried once |
| F2 | Gate desk file could stay in the news notebook if next day's prune fails | Deleted when the ops step ends (`finally`) |
| F3 | Resume delivered the notebook's latest audio unpinned (predates this job) | Recovery delivers only a recorded render: this run dir's, else the newest undelivered manifest's, whose `sources` become the delivered record; none on record → it refuses |
| F4 | Same-run-dir re-run delivered twice (predates this job) | A delivered manifest is a no-op without its local audio |
| F5 | Headline-less edition pieces titled `INTAKE` | Label read from reader copy |
| F6 | Reflections clipped at 2,000 chars | Unclipped |

Codex re-review of the fold and the later commits: [[../for-claude-review/2026-11-10-codex-pipeline108-109-rereview]] — HOLD, six findings, reproduced by codex through `run()` with stubs. Last round (TERMINAL.md §Review 4); settled in place:

| # | Finding | Settled |
|---|---|---|
| R1 | A gate desk file left behind could still be in the notebook when the show is made | The notebook is listed after the prune; a remaining gate desk file is deleted, and if it cannot be the run stops: no show is made with held drafts in reach |
| R2 | A retry in the same run dir replaced the sources of an older recorded render | Each render carries its own receipt (`manifest.audioSources`, written with `audioArtifactId`); airs-once and recovery read that |
| R3 | Cross-run recovery relabeled old audio and could send it twice | Recovery labels the show with the Cycle it was made for, writes `recoveredInto` on the origin manifest, and is a no-op on a run already delivered unless `--force` |
| R4 | A failed edition-piece upload, or a whole unaired edition, is not carried to the next day | **Recorded, not fixed.** The edition is collected only while its file is inside the 36 h window on edition day; pieces share one path. It is canon and airs in the weekly show regardless. A per-piece carry is its own change |
| R5 | Boot said "ops report delivered" when it was only downloaded | `manifest.opsReportDelivered` is set from Discord's answer; the digest says delivered / made, not sent / not produced |
| R6 | A later successful journal left a "no entry passed" receipt | A clean pass closes the earlier failed file, and the digest ignores a failed file for a week that has a journal |

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
| 6c | Weekend: weekly rulebook out + focus; edition out of the daily; citizen conversation in | done — read the Sat 11-14 weekly and Sun 11-15 daily |
| 7 | Read the Tue 2026-11-10 08:00 show: the five C115 articles of 11-09 evening each heard by reporter; reflections by name | done 2026-11-11 — point 12: five of five named, four told, Lives 2 of 15 people; reflections by name but 15 of 19 lines cut at 180 |
| 8 | Citizens' words whole in the daily show: `wholeReflections` in `notebooklmDailyNews.js` (the page's entry from `output/citizen_pages/index.jsonl` in place of the tab's 180 characters; a speaker in the carried conversation not repeated; POP-00005's page not opened), `kind` from `buildCitizenWeekDigest.js`, test | **in effect** since 2026-11-12 00:20 (builder: "I already approved rhe 180'thing"; the plan's point 2 is "every reflection … uncapped"). Built `8153ec134`, taken out `a7b7892f1` on a misread of "Didn't approved anything" (builder: "I didn't approved reverts either"), put back byte-for-byte. Tests green; replay on the live tab: Tue window 13 of 13 answers whole, Wed 7 of 7 cut ones. First show on it: Thu 11-12 08:00 — read the `Citizens' own words:` line in the log. Limit: a morning the 06:15 page refresh fails leaves that day's answers at 180, counted in that line |

## Not in this job

- The ops report never arrived (log: `DAILY OPS REPORT SKIPPED`): fixed under pipeline.109.
- Daily router (format/length) untouched.
- pipeline.109 (cron feedback to the builder, the ops report, Varek's journal): [[2026-11-10-cron-feedback-to-builder]].
