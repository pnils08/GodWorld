# Citizen Selection Criteria

**Read this when selecting citizens for stories in /sift Step 4. Updated after each cycle based on what worked.**

Last Updated: S170 (C92)

---

## What a Citizen Is

Citizens are persistent people with canon histories. They have jobs, neighborhoods, ages, families, opinions, and published quotes. When a reporter writes about Beverly Hayes, every future reference to Beverly Hayes must be consistent with what was already published. Citizens are not props. Their appearances become canon.

## How to Find Citizens

**Canon hierarchy (S170 — locked after C92 Civis/Civic confusion).** Sheets are primary canon. Everything else is derivative.

1. **Sheets are primary.** Simulation_Ledger is canon for citizens. Business_Ledger is canon for businesses. Civic_Office_Ledger is canon for officials. Initiative_Tracker is canon for programs. When these disagree with anything else, the sheet wins.
2. **`lookup_citizen(name)` and `search_world(...)` are the primary derivative layer** and what desks should use in practice — they read the sheets. Fast enough, structured enough, token-cheap. Use these.
3. **Bay-tribune (`search_canon`) is the storyline canon** — what the Tribune has *published* about someone. Treat it as authoritative for character history, published quotes, prior arcs. But if an edition claim disagrees with the ledger (wrong age, wrong neighborhood), the sheet wins and the edition has drifted.
4. **World-data cards and civic-voice JSONs are derivatives** that can drift from the sheet. Do not trust them alone for a canon fact. Verify against the sheet when a claim matters.
5. **A's players — `get_roster("as")` is mandatory.** Reads truesource for contracts, quirks, positions, birth years, stats. `lookup_citizen` doesn't return roster-level detail. Any sports story involving A's players uses this.

Searching 20-30 citizens per edition is normal. Don't ration lookups.

**Editorial-fix rule (S170).** When an article needs a citizen swap during review (wrong age, wrong neighborhood, professional-athlete misuse, name-reuse flag), run a FRESH `search_world` query with the specific role/neighborhood/age constraints. Do NOT reach back into the already-verified-pool for a replacement — that pool was filtered for other stories and will produce another "same 10 citizens every article" outcome. Fresh query, fresh voice.

**Professional athletes are not general-citizen voices.** A's players (and any pro athlete) only appear in SPORTS coverage or in stories where the athlete's role is the point. Do not use Vladimir Gonzalez, Darrin Davis, etc. as a Fruitvale bus driver / West Oakland resident / general citizen quote in civic / business / accountability / city-life pieces. C92 caught one: Vladimir Gonzalez was used as a Fruitvale transit-hub voice in Carmen's Transit piece. Swapped to Delia Fuentes (school bus driver, Fruitvale, canon E86). Rule added.

## What's Canon vs What's Agent Color

### Canon (immutable — never change these)
- Name, POP-ID, age, birth year
- Neighborhood (where they live)
- Role/occupation
- Tier
- Gender (on the ledger)
- Family relationships
- Published quotes and actions from previous editions
- Physical details already published (if someone was described with a limp in E88, they have a limp forever)

### Agent Color (reporters can add — becomes canon once published)
- How they enter a scene (walking, sitting, leaning against something)
- Sensory details not yet established (voice quality, clothing, mannerisms)
- Emotional state in the moment (worried, relieved, angry)
- Opinions on current events (must be consistent with their role and neighborhood)
- Where exactly they are within their neighborhood (a specific cafe, corner, park bench)

### Never Invent
- A new job or career change (engine handles this)
- Moving to a different neighborhood (engine handles this)
- Family members not in the ledger
- Age that contradicts birth year
- Gender that contradicts the ledger
- Quotes from previous editions that didn't happen

## When to Use Known Citizens vs New Ones

### Bring Back a Known Citizen When
- They have an active arc (Beverly Hayes + Stabilization Fund, Darius Clark + delayed payment)
- Their neighborhood is the setting and they've appeared before in that context
- Continuity serves the story — a reader who remembers them from E90 gets a deeper experience
- They were promised a follow-up (explicitly or implicitly in previous coverage)

### Surface a New Citizen When
- The story is in a neighborhood with no established characters
- The edition needs demographic balance (check Notes to Self for coverage gap tracking)
- A fresh perspective is needed — a new voice who hasn't been quoted on this topic
- The story touches a population underrepresented in canon (youth, seniors, immigrants, LGBTQ+)

### Freshness Scoring
- Citizens with 0 appearances are FRESH — good candidates for new stories
- Citizens with 5+ appearances across editions are ESTABLISHED — use for arc continuity
- Citizens who appeared last edition should generally rest this edition unless their arc demands it
- Check `lookup_citizen` canon history for appearance count

## How Many Citizens Per Story

- **Front page / feature:** 2-4 named citizens. Enough to feel populated, not so many nobody lands.
- **Sports:** Players are citizens. 3-5 per piece is normal.
- **Civic:** 1-2 officials (from voice outputs) + 1-2 residents who feel the decision
- **Culture / city life:** 1-2 named citizens grounding the scene
- **Letters:** Each letter IS a citizen. 3-4 letters per edition.
- **Accountability:** 1-2 officials being questioned + 1 citizen affected

## Tier Behavior

- **Tier 1 (protected):** Major characters. Family members, key officials, franchise players. Never delete. Handle with full canon awareness.
- **Tier 2:** Significant recurring characters. Appear across multiple editions. Full MCP lookup every time.
- **Tier 3:** Supporting characters. Appeared 1-3 times. MCP lookup to verify basics.
- **Tier 4 (generic):** Background citizens from Generic_Citizens pool. Can emerge to Tier 3 through edition appearances.

## Gender

Gender is now on the Simulation_Ledger. Read it from MCP or sheets API. Do not assume from names. Do not omit from briefs.

Every angle brief must include gender for every citizen listed.

## Name Collision (known issue)

The citizen generator produced many duplicate first names — roughly 30 Xaviers, and 10-15 other first names with similar repetition across 800+ citizens. Until the ledger is cleaned up in a separate session, handle this defensively:

- Always use FULL NAME + POP-ID in briefs, never first name only
- When looking up a citizen, verify POP-ID matches — don't assume the first search result is correct
- If a reporter writes "Xavier" without a last name, that's a hallucination risk — flag it in review

## Evolving This File

After each edition:
1. Did any citizen get misrepresented? What was wrong — role, neighborhood, gender, history?
2. Did freshness balance work? Too many returning characters? Too many unknowns?
3. Did any reporter invent details that contradicted canon? What was the source of the error?
4. Update this file with findings.

---

## Changelog

_Updated by `/post-publish` Step 10 after each edition. What changed and why._

- S144: starter version created. Name collision warning added. No cycle data yet.
- S170 (C92): canon hierarchy locked — sheets are primary, everything else derivative. Added editorial-fix rule (fresh `search_world` query, never reach into verified pool) after Ernesto Quintero age conflict triggered Marcus Wright reuse which Mike flagged as "same 10 citizens every article." Added professional-athletes-are-not-general-citizens rule after Vladimir Gonzalez was used as a Fruitvale bus driver / transit voice in Carmen's Transit piece; swapped to Delia Fuentes. Fresh voices introduced this cycle: Marcus Carter POP-00319, Nikolai Fuentes POP-00717, DeShawn Mitchell POP-00708, Lorenzo Nguyen POP-00314, Gloria Hutchins POP-00727. Citizen drift flags sent to engine-repair: Darrin Davis world-data card says "Oakland native" but canon is Ohio; Varek age inconsistency between briefs and canon; Civis Systems / Civic Systems confusion from voice JSONs — sheet (Business_Ledger BIZ-00052) is Civis Systems.
- **S241 (C95): 0 new POPIDs landed; 29 returning citizens matched + 5 cultural-only logged + 2 canon-layer-drift (Vanessa Tran-Munoz + Sarah Huang, bay-tribune known, deferred to engine-sheet backfill). Carmen Delaine at 2-cap (FP1+C1), Maria Keen at 2-cap (CU1+CU2 — Mike-E93 fatigue-cure deployed). C96 sports-beat canon-corrections forward (NOT prose-edited backward per ADR-0007):** Travis Coles age 21 (canon 22) + ERA verification needed; Henry Rivas 28 (canon 30); Isley Kelley 37 (canon 34); Mark Aitken contract framed "locked through 2043" (canon FA 2042); Martin Richards 29 from Fruitvale (canon 31); Hector Quintero POP-00050 split 23/PA-born vs 24/West-Oakland-raised; Mike Mesa POP-00081 needs BirthYear backfill 2011→2019 (currently ledger says 22yo but BirthYear math = 30). Civis Systems Field is the A's BASEBALL stadium (Mike-canon S240); Jax O1 conflated with Oaks NBA arena — NEW CANON entry CUT pre-ingest. Philly Rodriguez letter CUT pre-ingest (sift gave retail-worker/West-Oakland frame; canon POP-00027 is casino-manager/Temescal). **New rule (sift Step 5 sports-beat brief-lock):** roster-file cross-check on age/birthplace/contract for any returning A's player, world_summary cross-check on ERA/AVG. Multi-layer review miss (sift + write + Mara + EIC) means failure was structural — adding a single roster-check step at sift brief-lock is the upstream defense. **Verifier vs ingest count mismatch (small G-P):** verifyNamesIndexParse counted 36 source rows; ingestPublishedEntities matched 29 citizens + 5 cultural + 2 drift = 36 accounted for but counted under different buckets. Verifier gate threw FAIL on the mismatch though both numbers are correct. Verifier needs to read all parser buckets (matched + cultural + drift), not just matched. Cosmetic, not a publish blocker.
- **S222-S223 (C94): 6 new POPIDs landed; 3 quietly-NEW were layer-drift catches; Business_Ledger silent-zero parse-fail on 4-row BUSINESSES NAMED.** Sim_Ledger appended POP-00955 Keisha Morris (counselor, West Oakland), POP-00956 Miguel Santos (restaurant owner, Fruitvale), POP-00957 David Okonkwo (retired insurance adjuster, Lake Merritt) — explicit NEW letter writers, substituted by letters-desk LENS rest-cycle rule when sift brief was wrong. PLUS POP-00952 Roberto Iglesias (Fruitvale taquería owner / Transit Hub Oversight Committee), POP-00953 Carmen Solis (Mam-language community advocate, Fruitvale), POP-00954 Rev. Han (Adams Point UMC pastor) — these were quietly-NEW because bay-tribune wiki held canon for them but Sim_Ledger didn't. **New rule (G-P38): cross-layer drift between bay-tribune wiki and Simulation_Ledger is real. When Step 1a wiki finds N returning citizens but Step 5 Sim_Ledger ingest classifies M of them as new candidates, the diff = layer-drift catches. Step 5 should query bay-tribune before defaulting to "append as new" — risks duplicate Sim_Ledger rows under name variants (Rev. Han vs Rev. Daniel Han).** Beverly Hayes POP-00772 reconciled (was wrongly tagged POP-00576 in prior cycle drift — caught S222 G-S15). **Citizens INDEX format hybrid:** strict T1 rows (POP-NNNNN | Name | Role) + free-form rows (Name — Description (NEW)) both parsed correctly. **Carry forward C95:** wd-citizens has silent 19% gap from G-P34 (85 of 445 writes 401-failed); Mara audits and `lookup_citizen` queries may return stale data for no-appearance-cohort citizens — cross-check `lookup_citizen` results against Simulation_Ledger directly when canon-critical. **Business_Ledger BLOCKING gap (G-P37):** E94 BUSINESSES NAMED section listed 4 entries (BIZ-00028 West Oakland Community Center, BIZ-00052 Civis Systems, NEW Adams Point UMC, NEW Dario's Bar) — ingestPublishedEntities.js parsed 0 businesses. Adams Point UMC + Dario's Bar dropped from Business_Ledger silently. Same shape as S188 KONO silent-zero pattern. **Skill verification gate is blind to BUSINESSES NAMED parse health — only checks NAMES INDEX count.** Future sift queries for Adams Point church or Telegraph nightlife will return empty from Business_Ledger though they're in bay-tribune wiki. **The C95 sift will see these institutions as if they don't exist on the engine side; manual Business_Ledger append needed before any C95 piece relies on them.** Layer-drift carry-forward from S195 C93 (Vivienne Torres / Diane Foster / Thomas Webb / Atlas Bay Architects / Greater Hope Pentecostal / Bishop Calvin Reeves Sr.) — status unknown this cycle; may have been backfilled or still pending; check Sim_Ledger + Business_Ledger before assuming.
- **S256 (C97): DUPLICATE-MINT REGRESSION + letters containment + invented-anchor catch. Citizen accuracy was the cycle's gate.** 28 returning citizens matched; 6 new businesses landed clean (BIZ-00063→00068); 1 canon-drift held correctly (Elena Soria Dominguez, Transit Hub Planning Lead — freeform, no POP-ID, bay-tribune-known → engine-sheet backfill). **BUT POP-01021 wrongly minted for Dr. Vanessa Tran-Muñoz, who already holds POP-00781** (she was correctly handled as canon-drift in C95 per the S241 entry above — this is a regression). Root cause: NAMES INDEX freeform truncation "Dr. Vanessa Tran-Muñoz" → "Dr. Tran-Muñoz" broke both the Sim_Ledger match and the canon-drift detector, so she fell through to append where structurally-identical Elena was held. Duplicate is contained — Step 1a matched her as returning (0 new wiki record), Step 5-bis wrote no card — only one inert pending Sim_Ledger row exists. **Engine-sheet: merge POP-01021 → POP-00781, delete the duplicate row; normalize honorific+middle-name truncation in the canon-drift matcher so freeform project-director names (Vanessa, Elena) resolve to existing POP-IDs.** **Letters containment (sharpest catch):** first slate named a Tier-1 codex-protected entity the newsroom must never write (POP-00004 Lucia Polito), a too-recently-used citizen, and role/age drift — scrapped + rebuilt with 3 fresh verified writers (Soto POP-00590 / Rivera POP-00617 / Okafor POP-00530), each checked for codex-flag + recent-use + age-from-BirthYear + role/neighborhood. **Front-page anchor invented** (Rosario Vidal, no lookup match) → de-named to anonymous Fruitvale altar-keeper, removed from footer; no fabricated citizen enters the ledger. **Clergy verify-before-cut held:** Father Ramon Solano (POP-00756) + Bishop Antoine Vermeer (POP-00755) flagged unplaceable but confirmed real at their own institutions → POP-ID-linked, not cut. **Roster fixed vs roster-of-record:** Keane outfielder→DH (POP-00001), Davis DH→LF (POP-00021; story is his move TO DH, position-of-record LF). **New rule: freeform NAMES INDEX rows for project directors must carry their POP-ID at the brief/compile stage** — the truncation-to-duplicate failure only happens on bare-name freeform entries. Skill-check formal pass skipped (Arbiter A 0.856 PROCEED; criteria updated from direct evidence). Evidence: intake_published_entities_c97_e97.json + canon_drift_c97.json + production_log_c97.md letters-containment + reviewer-lane sections + post-publish gap log.
- **S195 (C93): MCP citizen verification stack BROKEN; new-citizen intake structurally silenced; faith-org real-name contamination flagged + new canon rule.** Evidence: sift G-S7+S8+S10+S12 — `lookup_citizen` world-data + `search_world` citizens + `get_roster` + `queryLedger.js` env all failed for entire /sift; bay-tribune fallback held for returning citizens (Patricia Nolan POP-00729, Beverly Hayes POP-00576, Marcus Carter POP-00319, Lorenzo Nguyen POP-00314, Gloria Hutchins POP-00727, Carmen Mesa POP-00081, Ernesto Quintero POP-00050) — but **NO working verification path existed for fresh citizens this cycle**. Three new citizens introduced (Vivienne Torres LVN Temescal, Diane Foster occupational therapist Temescal, Thomas Webb retired city planner Lake Merritt) plus Atlas Bay Architects (substitute for Perkins&Will per S185) plus Greater Hope Pentecostal Church + Bishop Calvin Reeves Sr. (substitute for Acts Full Gospel + Bishop Robert Jackson Sr. per Mara C93 audit) — **all silently dropped from intake** because /post-publish G-P8: E93 .txt has CITIZEN USAGE LOG instead of NAMES INDEX, ingestPublishedEntities.js parsed 0 citizens / 0 businesses (false "pure-atmosphere artifact" success). New canon rule hardened: **NO real churches, NO real pastors, NO real religious-leader names** — `docs/canon/INSTITUTIONS.md` §Faith & Community + `docs/media/REAL_NAMES_BLOCKLIST.md`. Faith_Organizations ledger contamination is system-wide (17 real-named entries); Mike taking wholesale ledger cleanup as separate workstream; the C93 substitutes are interim placeholders. Returning-citizen rotation (Patricia Nolan / Beverly Hayes / Lorenzo Nguyen / Gloria Hutchins / Carmen Mesa) read as same-10-citizens failure mode (S170 recurrence) — sift Step 4 must bias new POPID introduction toward neighborhood pieces. **Carry forward to C94:** Vivienne Torres + Diane Foster + Thomas Webb need pending Sim_Ledger rows backfilled; Atlas Bay Architects needs Business_Ledger row; Greater Hope Pentecostal Church + Bishop Calvin Reeves Sr. flagged for Mike's faith-org cleanup pass.
- **S264 (C98): 27 returning matched, 0 new appended, 1 canon-drift held correctly.** Wilson Shepard (Oaks head coach) named in the edition, bay-tribune-known but not yet in Simulation_Ledger → correctly partitioned as canon-layer-drift, NOT appended, deferred to engine-sheet backfill (same clean handling as Elena Soria Dominguez S256 / Vanessa Tran-Muñoz S241). **NEW CATCH — real-world institution name seeded in a brief body (Rhea CRITICAL):** the apprenticeship brief seeded *McClymonds* — a real Oakland high school, Tier-2 status-TBD, never canonized — dropped at Rhea r0, kept the West Oakland origin, re-sealed r1 PASS 1.0. **New rule: canon-check institution/school/park/venue/firm names anywhere in a brief body, same reflex as the front-page anchor name.** A real place the engine never stated is the same leak as an invented citizen. Anna Baker POP-00471 (Port trade-union rep) retirement ran clean; Quintero POP-00050 league HR leader at 24. Evidence: intake_published_entities_c98_e98.json + canon_drift_c98.json + rhea_report_c98.json.
- **S265 (C99): 26 returning matched, 0 new appended, 5 canon-drift held correctly; two name-integrity catches at the read — one false-positive bar, one invented letter-writer.** Canon-drift partitioned clean to engine-sheet backfill (Elliot Abraham, Herbert Jones, Rosario Medina, Delia Vargas-Ruiz, Jerome Pittman — all bay-tribune-known, no Sim_Ledger row; same handling as Wilson Shepard S264 / Elena S256). 1 business matched (BIZ-00052 Civis Systems), no silent-zero. **Catch 1 — REAL reporter wrongly phantom-barred (G-W1):** Elliot Graye (POP-00012), an actual newsroom reporter, was flagged as a phantom byline to bar — a *false positive* (boot note traces it to `checkLetterEligibility.js` greping exclusion-line POPIDs → false-positive HALT). The anchor/name-verify reflex usually catches invented names; this is the inverse failure (a real name wrongly cut), and it argues the eligibility grep needs to distinguish an exclusion-list mention from an actual phantom. **Catch 2 — letters-desk invented a citizen AND falsely certified it ledger-backed (G-W3):** David Kim (L3) was fabricated and self-attested as canon → L3 cut. Recurrence of the C94 G-W39 / C97 letters-eligibility gap; reinforces that letters candidates need codex-flag + rest-cycle + ledger verification BEFORE the slate locks, and a desk's own "ledger-backed" certification is not trustworthy without an independent check. **Name correction:** Transit Hub planning lead canonicalized to **Eloise Soria-Dominguez POP-00791** (Rhea CRITICAL-1; prior cycles drifted on "Elena Soria Dominguez"). **Roster-of-record held under Rhea pressure:** Davis kept Left Fielder (POP-00021) over Rhea CRITICAL-2's DH push — ledger role is LF; Vinnie Keane POP-00001 is the DH; the story is Davis's *move to* DH, not his position of record. Skill-check skipped (Arbiter A 0.866; criteria from direct evidence). Evidence: intake_published_entities_c99_e99.json + canon_drift_c99.json + production_log_c99.md §/write-edition.
- **S271 (C100): 19 returning matched, 0 new appended, 2 canon-drift held correctly; 1 new business appended clean.** Canon-drift partitioned to engine-sheet backfill — Maria Conteras + Maya Cordova, both bay-tribune-known with no Sim_Ledger row (same clean handling as Wilson Shepard S264 / the five C99 names). 1 business appended verified 1/1: Calderon-Nishi (BIZ-00069, construction contractor, Temescal) — no silent-zero. **New canon clean:** Elio Perez (POP-00201) promoted to crew lead on Baylight Phase II structural framing — flagged in NEW CANON, consistent with his E98 Baylight-worker framing, no drift. **Roster-of-record watch (gap-log item, not a publish blocker):** the Step 1a wiki tagged both Vinnie Keane (POP-00001) AND Darrin Davis (POP-00021) as "designated hitter" in the same edition — Keane is the DH-of-record; Davis's ledger role is LF and the C99 story was his *move to* DH. The edition cleared Rhea/Mara/Arbiter, so this is a wiki-attribution note for next cycle's roster cross-check, not a re-open of a sealed edition. **Forward thread (Mara spotlight):** Maya Cordova (POP-pending) introduced running the Telegraph Presbyterian job-training workshop — "the ones who stay" is her thread; carry her when a citizen returns to that door. Skill-check skipped (Arbiter A 0.925; criteria from direct evidence). Evidence: intake_published_entities_c100_e100.json + canon_drift_c100.json + mara_audit_c100.md §Canon Audit.
