# Story Template — the one growing document per cron story

Task 2.5.3 of [[../../plans/2026-07-20-headless-newsroom-pipeline]] (Mike-direct S344).
Uniformity rule: scripts and searches work only if what each wake completes is
UNIFORM — every reporter, every desk, same artifact shape. `cron-desk-run.js`
materializes this template as `output/cron-compare/<stem>story.md`: wake 1
opens it, wakes 2–3 append in order. The doc is the per-story audit trail the
Saturday compile reads.

| Section | Wake | Written by | Content |
|---|---|---|---|
| §1 ASSIGNMENT | 1 | script (deterministic, from the fanout entry) | Assigned angle + hook + affected citizens + source ref + desk approach (`scripts/desk-approach-map.json`). Open-beat marker when the seed pool was exhausted. |
| §2 THE REPORTER'S PLAN | 1 | reporter (citizenVoice, their own words) | How they chase the assigned angle today — what to verify, who to talk to. Personas keep their authored smells-off stance instead. |
| §3 INTERVIEWS | 2 | script (real citizenVoice quotes) | The assignment's affected citizens first (Task 2.5.4), lane popids as fallback. No quotes landed → an explicit do-not-invent marker. |
| §4 THE ARTICLE | 3 | script | Draft path + disposition + Rhea verdict. The article itself is the draft file; the Packet keeps load-bearing canon facts immutable and declares any persona-authorized texture. |
| §5 INTAKE (in the draft) | 3 | backend in Packet mode; reporter otherwise; gate resolves IDs | `## INTAKE` block ending every draft, beside the self-score footer: `NAMES:`/`BIZ:`/`STORYLINE:`/`HOOD:`/`CLAIM:` lines per pipeline.45 Phase 1 ([[../../plans/2026-08-04-newsroom-canon-flow]]). |

**The lived-experience doctrine carried by every wake** ([[../../adr/0017-typed-lived-experience-packets]],
which narrows the S344 color doctrine): facts from the record — names, ages,
roles, neighborhoods, numbers, and events — are load-bearing and immutable.
Interpretation, intention, cadence, and sensory prose remain the reporter's
creative space. A new named person, business, institution, relationship, public
event, official act, vote, date, count, or causal claim is structured world
state: it must be Packet-backed or remain an unpublished `LEAD`. A journalist
package may explicitly authorize generic rooms, streets, reporter presence, and
role-only anonymous voices as lived texture when they carry no canon assertion.
Private subjective memory may shape feeling but does not become press evidence
merely because a citizen says it to a reporter.

Under LEP/1, LEP/2, and the first live Jax package, this Markdown file is the human audit rendering. The
canonical machine handoff is JSON in the fixed sequence `actor → task → signal →
exposure → known claims → limits → output`; see
[[../../plans/2026-08-09-three-wake-lived-packet-pilot]].

**All 2.5.3 mechanics live (S347):** §2b canon research — the script gathers the
floor (edition grep + world-summary slices + evidence ref), the model selects
≥3 facts through the bounded tool loop, and a deterministic validator enforces
count / resolving refs / ≥2 sources / ≥1 pre-cycle deep thread (script-fallback
on double failure, never blocks the wake). Wire pulse — staged filings prepend
one line under `## Newsroom wire` in `production_log_c{XX}.md`; wake 3 reads it
(don't re-report). Self-scoring footer — the `<!-- SELF-SCORE: … -->` comment,
checked deterministically into `wake.json` (`footerPresent`); the Saturday
compile scores against it. Wake-1 validated facts also ride into the Rhea gate
(`--canon-facts`) as verified prior coverage — cited history is not a
current-cycle contradiction.

**INTAKE block (pipeline.45 Phase 1):** every wake-3 draft ends with a
`## INTAKE` section (then the self-score footer). Strict line grammar —
`NAMES: <name> | <quoted-source|subject|mentioned>`, `BIZ: <name> | <role>`,
`STORYLINE: <slug> | <advanced|opened|closed|referenced>`, `HOOD: <name>`,
`CLAIM: <load-bearing fact> | <source ref>`. The MODEL never writes POP/BIZ
ids (they are withheld from the writer state — prose-leak class, first 2.5.2
live run); the GATE parses via `lib/articleIntake.js`, resolves name→id
deterministically from its own records, and writes the enriched object into
the `.staged.json` sidecar as `intake:`. Downstream (Saturday sheets ingest,
per-article Supermemory tags, EIC claim audit) reads the sidecar, never
re-parses prose. Spec: [[../../plans/2026-08-04-newsroom-canon-flow]] §Phase 1.
