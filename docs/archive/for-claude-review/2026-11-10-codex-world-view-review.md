---
title: Codex world-view adversarial review
created: 2026-11-10
updated: 2026-11-10
type: reference
tags: [citizens, infrastructure, review, active]
sources:
  - docs/for-claude-review/2026-11-10-rb-brief-codex-world-view.md
  - world-view/build.js
  - world-view/template.html
  - world-view/hoods.js
  - world-view/places.js
pointers:
  - scripts/worldViewCheck.js
---

# World-view review — HOLD

Reviewed the working copies of `build.js`, `hoods.js`, `template.html`, `places.js` and README at HEAD `39633e3596f856aefce2e235fca917adbd42debc`, against the local C115 beat dump and C115 citizen snapshot. No edits to world-view. The five in-flight ambient/sound modules are excluded, including the three initially dirty modules. Other concurrent work is untouched. This is a review of what the page claims, not of which events the engine should produce.

The page preserves event text well, but it can assign the wrong home, turn filing metadata into quoted speech, prefer future-stamped reflections, bury a retirement, and call current history earlier history. Those are confirmed failures of the stated promise. The checker requested in Job 2 is a source-integrity gate, not a cure for these rendering/selection defects.

## Findings

### F1 — P1: event neighborhood becomes a false home address

`world-view/build.js:24`, `:31`, `:100`, `:109` group people by the log's neighborhood; `world-view/template.html:822` unconditionally prints **Lives in** that neighborhood. Laila Cortez's C115 event row is Uptown (`output/beats/LifeHistory_Log.jsonl:2636`), while her citizen row and household say West Oakland (`output/simulation_ledger_snapshot.jsonl:32`, `output/beats/Household_Ledger.jsonl:19`). Visiting her says **Lives in Uptown**. There are 37 disagreeing event rows for 14 people in the current dump. Whatever caused the upstream discrepancy, the renderer has no warrant to resolve it by declaring the event location her home. Carry the ledger home separately and label the street as where this week's entry was recorded.

### F2 — P1: filing/grade receipts are quoted as words said to a reporter

`world-view/build.js:50`, `:57`, `:64` admits all nonempty ReflectionExcerpt rows and maps every PRESS row to **to a reporter**. `world-view/template.html:576`, `:811`, `:834` wraps them in quotation marks. Carmen Delaine's current lead is **graded: 4/4 — nothing fell short**, not spoken testimony (`output/beats/Reflection_Intake.jsonl:2395`; her filing receipt is `:2394`). The current cards/visits include 102 `filed:`/`graded:` entries across 26 people. The producer explicitly records newsroom receipts through this same channel (`scripts/cron-desk-run.js:3363`, `scripts/citizenVoice.js:207`, `:279`). Preserve receipt type, distinguish a reflection from direct speech, and do not infer an interlocutor from PRESS alone. DISCORD is likewise a channel, not sufficient evidence that every stored excerpt is verbatim dialogue; current producer code distinguishes private talk reflections from conversation text (`lib/personaProvider.js:314`, `:334`).

### F3 — P1: future-cycle reflections win over the current week's records

`world-view/build.js:57` reads all cycles and `:59`–`:64` sorts descending without a `Cycle <= CYCLE` gate. The C115 page shows C119 as the newest words for all 12 people in `output/beats/Reflection_Intake.jsonl:95`–`:106`, including Jorry Cula (line 95) and Elio Perez (line 103). Those rows have older wall-clock timestamps than many later rows, but the erroneous future cycle wins first. The caption faithfully says 119, which still contradicts the page's C115 temporal scope and README's claimed newest week 114. Reject/quarantine future-stamped input locally; do not repair lived rows or reinterpret their cycle silently.

### F4 — P1: loose turning points never participate in lead selection

`world-view/build.js:33`–`:37` chooses the lead before loose rows are collected at `:96`–`:97`; `:109` merges them into `all` but does not update `x`, `k`, `pr` or `c`. Elle Lilo (POP-00177; snapshot line 129) has **stepped back from professional life**, tag Retirement, at `output/beats/LifeHistory_Log.jsonl:4851`. Her visit's first event is correctly gold, but her lead remains **grabbed coffee from the cart outside the hospital before the morning rush hit**, ordinary-white. Rank the complete week's events before choosing or capping people, while retaining identity and provenance for blank-Name rows.

The C115 vocabulary has 117 primary tags. `Career-Hired`, `Career-Training`, `CareerState` and `Career` fall through to ordinary rank 6; `QoL-…-Down-S` is captured as ordinary rank 9 before the Down test (`build.js:18`–`:20`). The `LifeEvent-Promotion-*` family is not the `Promotion` family: its current text includes workplace texture, so treating every such tag as an actual promotion would also be wrong. Retirement/Promotion/Graduation/PostCareer and explicit move tags are recognized when hooded. No death/birth/hospitalization/arrest/layoff primary tags occurred in the inspected C115 vocabulary; no current death or arrest miscolouring is claimed. A hypothetical unrecognized structural tag would default to ordinary; map actual producer semantics, not words embedded in occupation metadata.

### F5 — P2: a recorded citizen can be reported as having no recorded week

`world-view/build.js:24`, `:97`, `:103` excludes people with only loose rows and drops the excess above 110; `world-view/template.html:792`, `:803` searches only displayed people and replies **Nobody by that name had a week on record**. Fifteen POPIDs have only loose rows. Nine more are cut in West Oakland (119 hooded people, 110 shown), including Denise Carter, whose hooded row is `output/beats/LifeHistory_Log.jsonl:3383` and loose advancement row is `:4685`. The cap is disclosed in README; the search's denial and absence of a visible omitted count are the defect. Keep a search index of recorded identities with an honest unavailable/not-shown state; do not invent a street for locationless people.

### F6 — P2: the business coverage claim silently loses 14 rows; one theater is missed

`world-view/build.js:100`, `:110` only includes exact neighborhood matches from hooded person events. Fourteen of 283 ledger businesses never enter `H.biz`, so `layout`'s warning at `:175` never sees them. Examples: Portside Bio in **Brooklyn Basin** (ledger line 10), Tenth Street Digital in **Old Oakland** (11), Dario's Bar in **Telegraph corridor** (62), ten **City-wide** rows, and Coliseum District Development in **Coliseum** (29). All are listed in the inventory below. Do not arbitrarily map citywide entities or alias-like labels onto a street; report unresolved placement and obtain an explicit mapping where needed. The README claim that every other business takes an ordinary parcel is false as written.

`world-view/build.js:142` recognizes `Theater /` but misses Uptown Playhouse's **Theater Company / Performance Space** (`output/beats/Business_Ledger.jsonl:203`), giving it an ordinary shop parcel. This is a current classifier false negative. The 24 special classifications otherwise have support in their sector/name, canon or the builder's express Baylight ruling; no additional current false positive was confirmed. Ordinary grocery markets and Temple Lounge should not become farmers markets or worship buildings merely because of their names.

### F7 — P2: current-cycle history is labeled “Before this week”

`world-view/build.js:70`–`:71` takes the last six parseable LifeHistory lines without filtering by cycle; `world-view/template.html:835` labels them **Before this week**. 975 displayed entries contain a `Y3C11` line (absolute C115). Vinnie Keane's retirement is both this week's lead and “before this week” (`output/simulation_ledger_snapshot.jsonl:1`). Filter parsed history by absolute cycle or use an accurate neutral heading. The regex also only recognizes `Y…C… — [tag] text` single lines; it does not promise a complete archive.

### F8 — P2: ledger weather reaches an HTML parser

`world-view/template.html:641` concatenates Temp and Type/StreakType into `:644`'s innerHTML. A synthetic weather type `<b>SYNTHETIC_MARKUP</b>` is inserted as markup by the actual `facts()` function in a VM probe. An active HTML payload could run in the page's origin. `build.js:215` escaping `<` secures the inline JSON boundary, not this later DOM sink. Use text nodes for weather. Names, event text, bio, traits and reflection bodies use textContent or canvas text; no equivalent current sink was found for them. The current weather row is plain text; this is an input-path defect, not a claim of a malicious live row.

### F9 — P2: a same-neighborhood hash cannot leave a citizen visit

`world-view/template.html:855` handles a non-person hash only if its neighborhood differs or its offset is nonzero. From `#who-…`, changing to the current `#grand-lake` yields `[cur,0]`, skips `go`/`endVisit`, and leaves the visit panel and held figure active despite the street URL. The actual listener was executed with a synthetic visiting state: zero navigation calls and visiting remains set. Handle the transition out of a visit even when the neighborhood index is unchanged. Different-neighborhood navigation does call `endVisit(true)`; the Back button releases held figures and restores the street hash correctly by source inspection.

### F10 — P2: the slowest devices never trigger the quality fallback

`world-view/template.html:731` counts slow frames only when `raw < 0.25`. Sustained frames of 300 ms never contribute to `slow`. A VM run of the actual condition for 100 such frames (30 seconds, after the startup grace) kept quality at 2. Exclude hidden-tab pauses without excluding sustained low FPS. Also `:208` starts at quality 1 when bloom is unavailable, while `:304` still enables shadows, inconsistent with the documented levels. CPU geometry, nine per-person matrix updates and DOM layout measurements (`:605`–`:628`, `:668`–`:679`) remain at quality 0; the fallback cannot cure every CPU-bound phone case. No phone performance measurement is claimed.

### F11 — P2 before addresses: deterministic layouts are not durable parcel identities

`world-view/build.js:161` derives street length from the current displayed headcount and businesses; `:164` moves reserved places with length; `:171` numbers only unreserved lots and consumes a seeded random stream across both sides; `:176`–`:185` reassigns businesses by candidate spacing, width and current employee counts. Reducing West Oakland's displayed headcount from 110 to 105 changes L from 272 to 261 and changes the geometry of 34 surviving ids: `west-oakland-w12` moves from z=-162.71 to z=-146.75. Adding a business/place or changing widths/gaps/water/seed can renumber or repurpose lots; adding an ordinary business can reassign occupants even where geometry stays fixed. Rebuilding identical inputs is deterministic, but addresses require persisted immutable lot geometry/ids plus a separate business assignment ledger, a version/migration rule, and stable neighborhood keys. README's “stable ids” should explicitly mean identical inputs only until that exists. Special places currently have no parcel id at all (`:190`).

## Other requested checks and limits

- **Age and year:** executed the actual engine files in an isolated Node VM and compared all band edges (12/13, 17/18, 22/23, 35/36, 64/65), unknown/invalid years, 1900/1901/2099/2100 and future births. At C115, SIM_YEAR=2042 and the band rules agree. Positive cycle year edges 52/53 and 104/105 agree. `build.js:44` differs from `simYearFromCycle_` for invalid/nonpositive cycles: 0 produces 2039 instead of the engine's 2040. Treat invalid metadata as an error, not a year. `advanceSimulationCalendar.js:47`, `:182` writes S.simYear using that same formula for its absolute cycle; `simYearOf_` at `:345` prefers an already-set S.simYear, so a mismatched/prepopulated context can differ. The disk snapshots do not prove the live S value. `output/world_state.json`'s simYear=3 is the **ordinal calendar-sheet year**, read by `scripts/buildWorldState.js:100`, not evidence that citizen ages should use 3. No unsupported age correction proposed.
- **Identity:** the page drops POPID at `build.js:109` and drops business ids from `runs` at `:193`. Job 2 must resolve Name + event neighborhood to one log POPID, then require a matching citizen name/row; ambiguity must fail, never choose the first name match. Add POPID and referenced business/household/member ids in a later world-view change. Blank-Name loose events are attached by POPID today, so the brief's strict “every EventText row has that Name” check will intentionally flag those lines; it must not weaken itself to pass this build.
- **Sex/role/bio:** current Gender vocabulary is `male` (532), `female` (492), `m` (1), blank (39). Shown cards omit sex on 36 entries; no current normalization mismatch was found. Prefix `/^m|^f/` acceptance is broader than those values. Role is trimmed from RoleType; bio is copied from CitizenBio (including any stale claims already in that source); traits are parsed from TraitProfile. No new biographical fact is derived. Fame is currently a nonempty cycle stamp, so its truthiness is valid for this dump. Origin is the actual misspelled `OrginCity` column.
- **Relationships:** household Members are JSON arrays in this dump, and displayed names resolve. `build.js:86` silently swallows malformed JSON and drops unresolved members, so later damage could appear as an empty household. `emp` uses EmployerBizId and `runs` uses Key_Personnel POPIDs; blank employer is not invented employment. `spouse` at `:84` copies the trailing display name rather than resolving the ID: Aaliyah Santos holds `POP-00536 Everson Morello` (snapshot line 869), while POP-00536 is Evan Morello (425); ID-only spouse cells (957–958) are omitted. **Spouse is not currently rendered by the template**, so this is a data-contract/checker issue, not a visible spouse claim.
- **Reflection ordering/trim:** numeric Cycle dominates timestamp; ISO strings are compared lexically and legacy `C99` timestamps collapse to empty. Equal timestamp comparisons return -1 rather than 0 (`build.js:63`), effectively reversing tied rows without a durable chronology. Only cycle-level order is supported for legacy ties. trimSaid normalizes whitespace; after 300 characters it prefers a sentence boundary after character 120, otherwise a word boundary plus ellipsis. It cannot restore upstream truncation: `citizenVoice.js:279` already slices at 180, and Vinnie's displayed excerpt ends **firsthan**. Prefix validation proves source fidelity, not a complete thought or spoken setting.
- **Neighborhood drawing:** read every hoods.js entry against the full corresponding INSTITUTIONS paragraph, not only `q`. All 22 phrases and the pergola name are present. Brooklyn's water, Ivy Hill's slope, Downtown's towers, the lake, transit and Baylight have local canon/builder support. No clear real-world import or direct drawing contradiction was confirmed. Height, lighting, density, materials and unlabelled detail remain permitted drawing choices, not measured world statistics. A phrase substring gate alone cannot prove that a future geometry change fits it. The engine must not consume this style table.
- **UI lifecycle:** listeners are installed outside `build` and do not stack on place changes; per-place ticks/meshes are replaced and owned sign textures disposed. Shared textures intentionally survive. Source fields expected by a thin nonempty hood are produced (`biz`, `all`, `lay` arrays); empty whole-city DATA still dereferences H at template `:329`, rather than showing a no-data state. Neighborhoods with no qualifying life rows vanish even if businesses exist. Touch has `touch-action:none` on the scene and pointer cancel/leave resets on the pad. Drag uses one shared pointer state, so simultaneous scene pointers are not isolated; not device-tested. Held household figures are released by endVisit; household grouping can override a key person's business position (`:526`–`:531`). No live-browser claim is made.
- **README gaps:** “self-contained” still needs remote three.js/add-ons/fonts; the README itself discloses the CDN. Its “Not yet: pick-a-citizen” is stale relative to ALLP/startVisit. Its C114 newest-reflection statement is false (F3). Its every-business/stable-id claims need the F6/F11 qualification. H.pop demographic counts are loaded but not rendered. Weather uses current Cycle_Weather and prefers StreakType; WX remains an explicit visual-test override.

## Source wiring and verification

Local wiring: `output/beats/meta.json.cycle` → current log/weather selection; log POPID → citizen snapshot → household/employer/key-personnel/reflections; log neighborhood → STYLE/canon → layout → DATA JSON → cards, finder and visit. Engine reference: `advanceSimulationCalendar_` → `S.simYear` → `simYearOf_` → `deriveLifeState_`; the page independently derives its year from dump cycle. Parcel/business indices are local to each H.biz array.

Ran module loading (no write), full disk inventories, actual engine VM boundary probes, layout perturbation and the isolated template probes described above. Did not load the page's CDN, run Chrome, contact Sheets/Drive/Discord/model services, or fire/deploy an engine. The brief's explicit no-model-API limit takes precedence over the usual engine-wiring command; **no generated wiring card is attached**, only the local source trace above. The inventory subtask was delegated read-only under AGENTS cost discipline.

## Complete business classification and placement inventory

Each source reference below is a line of `output/beats/Business_Ledger.jsonl`. “place” counts as assigned for Job 2; a special place is not incorrectly treated as a missing ordinary parcel. No duplicate assignments or ordinary parcel shortages were found among the 269 admitted rows. 245 ordinary parcels + 24 places = 269 assigned businesses; 14 unplaced. Type is the actual placeType result, not a proposed correction.

| Source line | BIZ_ID | Name | Neighborhood | Sector | Type | Assignment |
|---:|---|---|---|---|---|---|
| 1 | BIZ-00001 | Anthropic | Baylight District | AI Research | ordinary | baylight-district-e04 |
| 2 | BIZ-00002 | DigitalOcean | Baylight District | Cloud Infrastructure | ordinary | baylight-district-e15 |
| 3 | BIZ-00003 | Discord | Baylight District | Community Platform | ordinary | baylight-district-e13 |
| 4 | BIZ-00004 | Moltbook | Baylight District | Agent Communication | ordinary | baylight-district-e06 |
| 5 | BIZ-00005 | Oakland Athletics | Baylight District | Sports Franchise | ordinary | baylight-district-e10 |
| 6 | BIZ-00006 | Baylight District Management | Baylight District | Development | ordinary | baylight-district-e11 |
| 7 | BIZ-00007 | Ridgeline Ventures | Lake Merritt | Venture Capital | ordinary | lake-merritt-e10 |
| 8 | BIZ-00008 | Gridiron Analytics | Temescal | Sports Analytics | ordinary | temescal-w16 |
| 9 | BIZ-00009 | Oakmesh Systems | West Oakland | Civic Tech | ordinary | west-oakland-e11 |
| 10 | BIZ-00010 | Portside Bio | Brooklyn Basin | Biotech | ordinary | UNPLACED |
| 11 | BIZ-00011 | Tenth Street Digital | Old Oakland | Civic Tech | ordinary | UNPLACED |
| 12 | BIZ-00012 | Port of Oakland | Jack London | Port & Logistics | port | place |
| 13 | BIZ-00013 | AC Transit | Downtown | Public Transit | ordinary | downtown-w04 |
| 14 | BIZ-00014 | BART Oakland Division | Downtown | Public Transit | ordinary | downtown-w11 |
| 15 | BIZ-00015 | Oakland Hospital | City-wide | Healthcare | ordinary | UNPLACED |
| 16 | BIZ-00016 | Oakland City Schools | City-wide | Education | ordinary | UNPLACED |
| 17 | BIZ-00017 | City of Oakland | Downtown | Municipal Government | cityhall | place |
| 18 | BIZ-00018 | Bay Tribune | Downtown | Media & Journalism | ordinary | downtown-e15 |
| 19 | BIZ-00019 | EBMUD | Downtown | Utilities | ordinary | downtown-w07 |
| 20 | BIZ-00020 | Baylight Construction Authority | Baylight District | Construction | ordinary | baylight-district-e07 |
| 21 | BIZ-00021 | Oakland Public Library System | City-wide | Public Services | ordinary | UNPLACED |
| 22 | BIZ-00022 | Alameda County Courts | Downtown | Legal & Judicial | ordinary | downtown-e10 |
| 23 | BIZ-00023 | Oakland Fire Department | City-wide | Public Safety | ordinary | UNPLACED |
| 24 | BIZ-00024 | Oakland Police Department | City-wide | Public Safety | ordinary | UNPLACED |
| 25 | BIZ-00025 | Piedmont Avenue Medical Center | Piedmont Ave | Healthcare | ordinary | piedmont-ave-e26 |
| 26 | BIZ-00026 | Fruitvale Community Clinic | Fruitvale | Healthcare | ordinary | fruitvale-e10 |
| 27 | BIZ-00027 | Oakland Parks & Recreation | City-wide | Public Services | ordinary | UNPLACED |
| 28 | BIZ-00028 | West Oakland Community Center | West Oakland | Community Services | ordinary | west-oakland-e13 |
| 29 | BIZ-00029 | Coliseum District Development | Coliseum | Real Estate | ordinary | UNPLACED |
| 30 | BIZ-00030 | Oakland Tech Collective | Uptown | Coworking / Tech Hub | ordinary | uptown-e26 |
| 31 | BIZ-00031 | East Bay Regional Parks | City-wide | Public Services | ordinary | UNPLACED |
| 32 | BIZ-00032 | Estuary Power & Gas | City-wide | Utilities | ordinary | UNPLACED |
| 33 | BIZ-00033 | Jack London Square Markets | Jack London | Retail & Food | ordinary | jack-london-e10 |
| 34 | BIZ-00034 | Oakland Housing Authority | City-wide | Housing & Social Services | ordinary | UNPLACED |
| 35 | BIZ-00035 | Oakland Community College District | City-wide | Education | ordinary | UNPLACED |
| 36 | BIZ-00036 | Blue Lantern Bar | Jack London | Nightlife & Entertainment | ordinary | jack-london-e23 |
| 37 | BIZ-00037 | Temple Lounge | Downtown | Nightlife & Entertainment | ordinary | downtown-e04 |
| 38 | BIZ-00038 | OakTown Social | Temescal | Nightlife & Entertainment | ordinary | temescal-e09 |
| 39 | BIZ-00039 | Pulse District | Uptown | Nightlife & Entertainment | ordinary | uptown-w11 |
| 40 | BIZ-00040 | Merritt Club | Lake Merritt | Nightlife & Entertainment | ordinary | lake-merritt-e05 |
| 41 | BIZ-00041 | Green & Gold Tavern | Jack London | Sports Bar & Dining | ordinary | jack-london-e18 |
| 42 | BIZ-00042 | Dragon Gate Lounge | Chinatown | Nightlife & Entertainment | ordinary | chinatown-w09 |
| 43 | BIZ-00043 | OakHouse | Rockridge | Restaurant & Dining | ordinary | rockridge-e18 |
| 44 | BIZ-00044 | Harborline Grill | Jack London | Restaurant & Dining | ordinary | jack-london-e16 |
| 45 | BIZ-00045 | Fruitvale Diner | Fruitvale | Restaurant & Dining | ordinary | fruitvale-e18 |
| 46 | BIZ-00046 | KONO Kitchen | KONO | Restaurant & Dining | ordinary | kono-w06 |
| 47 | BIZ-00047 | Miso Metro | Downtown | Restaurant & Dining | ordinary | downtown-e11 |
| 48 | BIZ-00048 | West Side Cafe | West Oakland | Restaurant & Dining | ordinary | west-oakland-w14 |
| 49 | BIZ-00049 | Midnight Bistro | Downtown | Restaurant & Dining | ordinary | downtown-e06 |
| 50 | BIZ-00050 | Dockhouse BBQ | Jack London | Restaurant & Dining | ordinary | jack-london-e15 |
| 51 | BIZ-00051 | SpeedyBurger | Downtown | Fast Food & Quick Service | ordinary | downtown-e16 |
| 52 | BIZ-00052 | Civis Systems | West Oakland | Urban Systems Intelligence Firm | ordinary | west-oakland-e03 |
| 53 | BIZ-00053 | Ridgeline Studio | Uptown | Architecture | ordinary | uptown-e14 |
| 54 | BIZ-00054 | Pacific Standard Architecture | Downtown | Architecture | ordinary | downtown-w12 |
| 55 | BIZ-00055 | Estuary Architects | Lake Merritt | Architecture | ordinary | lake-merritt-e07 |
| 56 | BIZ-00056 | Coastline Construction | West Oakland | Construction | ordinary | west-oakland-e09 |
| 57 | BIZ-00057 | Anchor Build | Jack London | Construction | ordinary | jack-london-e08 |
| 58 | BIZ-00058 | Mariner Construction | West Oakland | Construction | ordinary | west-oakland-w10 |
| 59 | BIZ-00059 | Foothill Builders | Fruitvale | Construction | ordinary | fruitvale-w10 |
| 60 | BIZ-00060 | Northgate Construction | West Oakland | Construction | ordinary | west-oakland-w04 |
| 61 | BIZ-00061 | Adams Point United Methodist Church | Adams Point | Faith / Methodist | faith | place |
| 62 | BIZ-00062 | Dario's Bar | Telegraph corridor | Bar / nightlife | ordinary | UNPLACED |
| 63 | BIZ-00063 | Civis Systems Field "The Town" | Baylight District | As Stadium | stadium | place |
| 64 | BIZ-00064 | Art Walk Cafe | Uptown | Cafe / gallery | ordinary | uptown-w23 |
| 65 | BIZ-00066 | Gallery Night Lounge | Uptown | Bar / lounge | ordinary | uptown-e22 |
| 66 | BIZ-00068 | Marigold Cafe | Fruitvale | Cafe / dining | ordinary | fruitvale-e30 |
| 67 | BIZ-00070 | Vance's Vintage | West Oakland | Retail | ordinary | west-oakland-e05 |
| 68 | BIZ-00072 | Mendez Printing | West Oakland | Services | ordinary | west-oakland-e17 |
| 69 | BIZ-00073 | Spooky Spirits Lounge | West Oakland | Hospitality | ordinary | west-oakland-e15 |
| 70 | BIZ-00074 | Oakland Oaks | Baylight District | Sports | arena | place |
| 71 | BIZ-00075 | Romano's | Dimond | Food & Beverage | ordinary | dimond-w16 |
| 72 | BIZ-00076 | Port Grind | Grand Lake | Food & Beverage | ordinary | grand-lake-e09 |
| 73 | BIZ-00077 | Nino's | Laurel | Food & Beverage | ordinary | laurel-e10 |
| 74 | BIZ-00078 | Foothill Baptist Tabernacle | East Oakland | Faith Organization | faith | place |
| 75 | BIZ-00079 | Masjid An-Nur Oakland | East Oakland | Faith Organization | faith | place |
| 76 | BIZ-00080 | Temescal Islamic Center | Temescal | Faith Organization | faith | place |
| 77 | BIZ-00081 | St. Esperanza Parish | Fruitvale | Faith Organization | faith | place |
| 78 | BIZ-00082 | New Covenant Pentecostal Assembly | West Oakland | Faith Organization | faith | place |
| 79 | BIZ-00084 | Lakeshore Unitarian Universalist Fellowship | Lake Merritt | Faith Organization | faith | place |
| 80 | BIZ-00085 | Temple Beth Or | Rockridge | Faith Organization | faith | place |
| 81 | BIZ-00087 | Lake Merritt Mindfulness Sangha | Downtown | Faith Organization | faith | place |
| 82 | BIZ-00088 | Cathedral of the Living Word | Lake Merritt | Faith Organization | faith | place |
| 83 | BIZ-00089 | Atlas Bay Architects | Downtown | Architecture | ordinary | downtown-e12 |
| 84 | BIZ-00090 | Calderon-Nishi | Temescal | Construction | ordinary | temescal-e14 |
| 85 | BIZ-00091 | KONO Hardware | KONO | Retail | ordinary | kono-e18 |
| 86 | BIZ-00092 | B'nai Tikvah Synagogue | Piedmont Ave | Synagogue | faith | place |
| 87 | BIZ-00093 | Telegraph Presbyterian Fellowship | Downtown | Church | faith | place |
| 88 | BIZ-00094 | West Oakland Stabilization Fund | West Oakland | Community Development | ordinary | west-oakland-w16 |
| 89 | BIZ-00095 | Oakland Alternative Response Initiative | Downtown | Public Safety / Crisis Response | ordinary | downtown-w14 |
| 90 | BIZ-00096 | Fruitvale Transit Hub Authority | Fruitvale | Transit & Infrastructure | station | place |
| 91 | BIZ-00097 | Temescal Community Health Center | Temescal | Healthcare | ordinary | temescal-e19 |
| 92 | BIZ-00098 | Oakland Youth Apprenticeship Pipeline | Downtown | Workforce Development | ordinary | downtown-e14 |
| 93 | BIZ-00099 | OakTown Echo | West Oakland | Media & Journalism | ordinary | west-oakland-w08 |
| 94 | BIZ-00100 | Oakland Casino Town | Baylight District | Nightlife & Entertainment | ordinary | baylight-district-e08 |
| 95 | BIZ-00101 | Oakland Entertainment Talent Agency | Downtown | Talent Management | ordinary | downtown-w06 |
| 96 | BIZ-00102 | Presti Accounting | Downtown | Corporate | ordinary | downtown-e08 |
| 97 | BIZ-00103 | Firehouse 29 West Oakland Baseball Academy | West Oakland | Sports | ordinary | west-oakland-w18 |
| 98 | BIZ-00104 | Bubic Burgers | Baylight District | Food & Beverage | ordinary | baylight-district-e17 |
| 99 | BIZ-00105 | Marine Systems | Baylight District | Science | ordinary | baylight-district-e14 |
| 100 | BIZ-00106 | Brie Bouquets | Temescal | Services | ordinary | temescal-w08 |
| 101 | BIZ-00107 | Da Dough | Temescal | Services | ordinary | temescal-e17 |
| 102 | BIZ-00108 | Lakeshore Cafe | Adams Point | Cafe / dining | ordinary | adams-point-w07 |
| 103 | BIZ-00109 | Vernon Street Market | Adams Point | Retail | ordinary | adams-point-w10 |
| 104 | BIZ-00110 | Northshore Dental | Adams Point | Healthcare | ordinary | adams-point-w15 |
| 105 | BIZ-00111 | Lakeside Cycles | Adams Point | Retail | ordinary | adams-point-e15 |
| 106 | BIZ-00112 | Point Press Laundry | Adams Point | Services | ordinary | adams-point-w12 |
| 107 | BIZ-00113 | Quay Coffee | Brooklyn | Cafe / dining | ordinary | brooklyn-e04 |
| 108 | BIZ-00114 | Basin Grocer | Brooklyn | Retail | ordinary | brooklyn-e16 |
| 109 | BIZ-00115 | Basin Athletic Club | Brooklyn | Services | ordinary | brooklyn-e09 |
| 110 | BIZ-00116 | Slip Street Kitchen | Brooklyn | Restaurant & Dining | ordinary | brooklyn-e20 |
| 111 | BIZ-00117 | Brooklyn Pharmacy | Brooklyn | Retail | ordinary | brooklyn-e15 |
| 112 | BIZ-00118 | Estuary Cleaners | Brooklyn | Services | ordinary | brooklyn-e08 |
| 113 | BIZ-00119 | Ninth Street Kitchen | Chinatown | Restaurant & Dining | ordinary | chinatown-e28 |
| 114 | BIZ-00120 | Golden Lotus Market | Chinatown | Retail | ordinary | chinatown-e34 |
| 115 | BIZ-00121 | Jade Thread Tailors | Chinatown | Services | ordinary | chinatown-w26 |
| 116 | BIZ-00122 | Lantern Pharmacy | Chinatown | Retail | ordinary | chinatown-e17 |
| 117 | BIZ-00123 | Heritage Bakehouse | Chinatown | Food & Beverage | ordinary | chinatown-e23 |
| 118 | BIZ-00124 | Sausal Creek Cafe | Dimond | Cafe / dining | ordinary | dimond-w08 |
| 119 | BIZ-00125 | Village Lock and Hardware | Dimond | Retail | ordinary | dimond-w19 |
| 120 | BIZ-00126 | Dimond Pharmacy | Dimond | Retail | ordinary | dimond-e18 |
| 121 | BIZ-00127 | Two Tables Kitchen | Dimond | Restaurant & Dining | ordinary | dimond-w14 |
| 122 | BIZ-00128 | Dimond Cleaners | Dimond | Services | ordinary | dimond-w06 |
| 123 | BIZ-00129 | Eastside Family Market | East Oakland | Retail | ordinary | east-oakland-e12 |
| 124 | BIZ-00130 | Sunrise Cafe | East Oakland | Cafe / dining | ordinary | east-oakland-w08 |
| 125 | BIZ-00131 | Eastside Auto | East Oakland | Services | ordinary | east-oakland-e05 |
| 126 | BIZ-00132 | Foothill Kitchen | East Oakland | Restaurant & Dining | ordinary | east-oakland-w07 |
| 127 | BIZ-00133 | Eastlake Corner Market | Eastlake | Retail | ordinary | eastlake-e07 |
| 128 | BIZ-00134 | Eastlake Kitchen | Eastlake | Restaurant & Dining | ordinary | eastlake-w08 |
| 129 | BIZ-00135 | Eastlake Barbers | Eastlake | Services | ordinary | eastlake-e09 |
| 130 | BIZ-00136 | Parkedge Diner | Eastlake | Restaurant & Dining | ordinary | eastlake-e05 |
| 131 | BIZ-00137 | Eastlake Pharmacy | Eastlake | Retail | ordinary | eastlake-e11 |
| 132 | BIZ-00138 | Eastlake Laundry | Eastlake | Services | ordinary | eastlake-e15 |
| 133 | BIZ-00139 | Hillside Family Market | Glenview | Retail | ordinary | glenview-w11 |
| 134 | BIZ-00140 | Glenview Cafe | Glenview | Cafe / dining | ordinary | glenview-w08 |
| 135 | BIZ-00141 | Hillside Family Dental | Glenview | Healthcare | ordinary | glenview-w05 |
| 136 | BIZ-00142 | Parkridge Cleaners | Glenview | Services | ordinary | glenview-e08 |
| 137 | BIZ-00143 | Slopeview Hardware | Glenview | Retail | ordinary | glenview-e11 |
| 138 | BIZ-00144 | Glenview Kitchen | Glenview | Restaurant & Dining | ordinary | glenview-e05 |
| 139 | BIZ-00145 | Marquee Grocer | Grand Lake | Retail | ordinary | grand-lake-e17 |
| 140 | BIZ-00146 | Intermission Cafe | Grand Lake | Cafe / dining | ordinary | grand-lake-w14 |
| 141 | BIZ-00147 | Grand Lake Books | Grand Lake | Retail | ordinary | grand-lake-e14 |
| 142 | BIZ-00148 | Market Day Kitchen | Grand Lake | Restaurant & Dining | ordinary | grand-lake-w08 |
| 143 | BIZ-00149 | Lakeshore Outfitters | Grand Lake | Retail | ordinary | grand-lake-w06 |
| 144 | BIZ-00150 | Ivy Hill Market | Ivy Hill | Retail | ordinary | ivy-hill-e12 |
| 145 | BIZ-00151 | Ivy Hill Cafe | Ivy Hill | Cafe / dining | ordinary | ivy-hill-w11 |
| 146 | BIZ-00152 | Ivy Cleaners | Ivy Hill | Services | ordinary | ivy-hill-w05 |
| 147 | BIZ-00153 | Ivy Hill Family Dental | Ivy Hill | Healthcare | ordinary | ivy-hill-e06 |
| 148 | BIZ-00154 | Hillcrest Kitchen | Ivy Hill | Restaurant & Dining | ordinary | ivy-hill-w08 |
| 149 | BIZ-00155 | Fold Laundry | Ivy Hill | Services | ordinary | ivy-hill-e09 |
| 150 | BIZ-00156 | Northgate Kitchen | KONO | Restaurant & Dining | ordinary | kono-e07 |
| 151 | BIZ-00157 | Telegraph Press | KONO | Services | ordinary | kono-e05 |
| 152 | BIZ-00158 | The Northgate Bar | KONO | Nightlife & Entertainment | ordinary | kono-e13 |
| 153 | BIZ-00159 | Twentieth Street Gallery | KONO | Retail | ordinary | kono-e15 |
| 154 | BIZ-00160 | Laurel Market | Laurel | Retail | ordinary | laurel-e17 |
| 155 | BIZ-00161 | Schoolgate Cafe | Laurel | Cafe / dining | ordinary | laurel-w06 |
| 156 | BIZ-00162 | Laurel Pharmacy | Laurel | Retail | ordinary | laurel-w13 |
| 157 | BIZ-00163 | MacArthur Kitchen | Laurel | Restaurant & Dining | ordinary | laurel-w08 |
| 158 | BIZ-00164 | Laurel Cleaners | Laurel | Services | ordinary | laurel-e12 |
| 159 | BIZ-00165 | Piedmont Avenue Specialists | Piedmont Ave | Healthcare | ordinary | piedmont-ave-w18 |
| 160 | BIZ-00166 | Piedmont Avenue Clothiers | Piedmont Ave | Retail | ordinary | piedmont-ave-e12 |
| 161 | BIZ-00167 | Piedmont Avenue Pharmacy | Piedmont Ave | Retail | ordinary | piedmont-ave-e15 |
| 162 | BIZ-00168 | Canopy Market | Rockridge | Retail | ordinary | rockridge-e16 |
| 163 | BIZ-00169 | Claremont Table | Rockridge | Restaurant & Dining | ordinary | rockridge-e13 |
| 164 | BIZ-00170 | College Avenue Dental | Rockridge | Healthcare | ordinary | rockridge-e08 |
| 165 | BIZ-00171 | Rockridge Pharmacy | Rockridge | Retail | ordinary | rockridge-e05 |
| 166 | BIZ-00172 | Shift Change Kitchen | San Antonio | Restaurant & Dining | ordinary | san-antonio-e15 |
| 167 | BIZ-00173 | Twelfth Avenue Market | San Antonio | Retail | ordinary | san-antonio-e21 |
| 168 | BIZ-00174 | Sunny Day Laundry | San Antonio | Services | ordinary | san-antonio-w15 |
| 169 | BIZ-00175 | San Antonio Pharmacy | San Antonio | Retail | ordinary | san-antonio-w18 |
| 170 | BIZ-00176 | Park Boulevard Cafe | San Antonio | Cafe / dining | ordinary | san-antonio-e11 |
| 171 | BIZ-00177 | Crew Cut Barbers | San Antonio | Services | ordinary | san-antonio-w21 |
| 172 | BIZ-00178 | First Lamp Club | Uptown | Nightlife & Entertainment | ordinary | uptown-e18 |
| 173 | BIZ-00179 | Night Walk Records | Uptown | Retail | ordinary | uptown-w07 |
| 174 | BIZ-00180 | Kelley Mercantile | Rockridge | Retail | ordinary | rockridge-w10 |
| 175 | BIZ-00181 | Mayday Movers | Piedmont Ave | Services | ordinary | piedmont-ave-w07 |
| 176 | BIZ-00182 | Dillon Clinic | Rockridge | Healthcare | ordinary | rockridge-w07 |
| 177 | BIZ-00183 | Bayline 6 | Jack London | Media & Journalism | ordinary | jack-london-e05 |
| 178 | BIZ-00184 | Oakland 12 | Fruitvale | Media & Journalism | ordinary | fruitvale-e26 |
| 179 | BIZ-00185 | Keane Mercantile | Grand Lake | Retail | ordinary | grand-lake-e11 |
| 180 | BIZ-00186 | Varek Systems | West Oakland | Tech | ordinary | west-oakland-w06 |
| 181 | BIZ-00187 | Prescott Foundry Labs | West Oakland | Tech / Applied Robotics | ordinary | west-oakland-w12 |
| 182 | BIZ-00188 | Mandela Data Works | West Oakland | Tech / Data Infrastructure | ordinary | west-oakland-e21 |
| 183 | BIZ-00189 | Hoover Street Software | West Oakland | Tech / Software | ordinary | west-oakland-e19 |
| 184 | BIZ-00190 | Seventh Street Rail Supply | West Oakland | Industrial Supply / Services | ordinary | west-oakland-e07 |
| 185 | BIZ-00191 | Heinold's First and Last Chance Saloon | Jack London | Bar / Saloon / Historic Landmark | saloon | place |
| 186 | BIZ-00192 | Embarcadero Music Hall | Jack London | Music Venue | ordinary | jack-london-e07 |
| 187 | BIZ-00193 | Loading Dock Studios | Jack London | Design Studio | ordinary | jack-london-e12 |
| 188 | BIZ-00194 | Estuary Oyster House | Jack London | Restaurant & Dining | ordinary | jack-london-e21 |
| 189 | BIZ-00195 | Dockside Comedy Club | Jack London | Comedy Club | ordinary | jack-london-e13 |
| 190 | BIZ-00196 | Warehouse Nine Brewing | Jack London | Brewery | ordinary | jack-london-e24 |
| 191 | BIZ-00197 | The Hold | Jack London | Dance Club / Nightlife & Entertainment | ordinary | jack-london-e26 |
| 192 | BIZ-00198 | Third Street Late Kitchen | Jack London | Late-Night Restaurant & Dining | ordinary | jack-london-e19 |
| 193 | BIZ-00199 | Broadway Mutual Bank | Downtown | Finance & Banking | ordinary | downtown-w10 |
| 194 | BIZ-00200 | Clay Street Law Group | Downtown | Law Firm | ordinary | downtown-w08 |
| 195 | BIZ-00201 | Fourteenth Street Capital | Downtown | Wealth Management / Finance | ordinary | downtown-e18 |
| 196 | BIZ-00202 | Tower Commercial Property | Downtown | Real Estate Finance | ordinary | downtown-e07 |
| 197 | BIZ-00203 | Oakland Asian Cultural Center | Chinatown | Cultural Center / Community / Historic Landmark | cultural | place |
| 198 | BIZ-00204 | Eight Treasures Dim Sum House | Chinatown | Restaurant & Dining | ordinary | chinatown-e12 |
| 199 | BIZ-00205 | Wong Family Seafood & Produce | Chinatown | Wholesale Grocery | ordinary | chinatown-w15 |
| 200 | BIZ-00206 | Lucky Harbor Herbalist & Tea | Chinatown | Herbalist & Tea Shop | ordinary | chinatown-w31 |
| 201 | BIZ-00207 | Harrison Street Chinese School | Chinatown | Education | ordinary | chinatown-w20 |
| 202 | BIZ-00208 | Paramount Theatre | Uptown | Theater / Historic Landmark | theater | place |
| 203 | BIZ-00209 | Uptown Playhouse | Uptown | Theater Company / Performance Space | ordinary | uptown-w19 |
| 204 | BIZ-00210 | Nineteenth Street Gallery | Uptown | Art Gallery | ordinary | uptown-e10 |
| 205 | BIZ-00211 | Telegraph Supper Club | Uptown | Restaurant & Dining | ordinary | uptown-e06 |
| 206 | BIZ-00212 | Neon Alley Cocktails | Uptown | Bar / Lounge | ordinary | uptown-w15 |
| 207 | BIZ-00213 | Fox Theater Oakland | KONO | Theater / Historic Landmark | theater | place |
| 208 | BIZ-00214 | Han River BBQ | KONO | Korean Restaurant | ordinary | kono-w14 |
| 209 | BIZ-00215 | Seoul Corner Market | KONO | Korean Grocery | ordinary | kono-w09 |
| 210 | BIZ-00216 | Telegraph Studio Collective | KONO | Artist Studios | ordinary | kono-w11 |
| 211 | BIZ-00217 | Midnight Norae Karaoke | KONO | Karaoke Bar | ordinary | kono-e10 |
| 212 | BIZ-00218 | Temescal Urgent Care | Temescal | Urgent Care Clinic | ordinary | temescal-w06 |
| 213 | BIZ-00219 | Longfellow Pharmacy | Temescal | Pharmacy / Retail | ordinary | temescal-e06 |
| 214 | BIZ-00220 | North Oakland Home Health | Temescal | Home Health Agency | ordinary | temescal-w11 |
| 215 | BIZ-00221 | Shafter Street Coffee | Temescal | Cafe | ordinary | temescal-e11 |
| 216 | BIZ-00222 | Telegraph Mutual Aid Kitchen | Temescal | Community Kitchen | ordinary | temescal-w14 |
| 217 | BIZ-00223 | College Avenue Medical Group | Rockridge | Medical Specialists | ordinary | rockridge-w15 |
| 218 | BIZ-00224 | Claremont Advisory Partners | Rockridge | Management Consulting | ordinary | rockridge-w13 |
| 219 | BIZ-00225 | Rockridge Wine Merchants | Rockridge | Wine Shop | ordinary | rockridge-w05 |
| 220 | BIZ-00226 | Hillside Preparatory | Rockridge | Private School | ordinary | rockridge-e10 |
| 221 | BIZ-00227 | Piedmont Avenue Bistro | Piedmont Ave | Restaurant & Dining | ordinary | piedmont-ave-w10 |
| 222 | BIZ-00228 | Montclair Patisserie | Piedmont Ave | Bakery / Patisserie | ordinary | piedmont-ave-e09 |
| 223 | BIZ-00229 | Avenue Florist | Piedmont Ave | Florist Shop | ordinary | piedmont-ave-e18 |
| 224 | BIZ-00230 | Glass & Frame Optometry | Piedmont Ave | Optometry Clinic | ordinary | piedmont-ave-w16 |
| 225 | BIZ-00231 | Lakeview Salon | Piedmont Ave | Hair Salon / Services | ordinary | piedmont-ave-e23 |
| 226 | BIZ-00232 | Marguerite's | Piedmont Ave | Women's Boutique | ordinary | piedmont-ave-e06 |
| 227 | BIZ-00233 | Pleasant Valley Menswear | Piedmont Ave | Men's Clothing Store | ordinary | piedmont-ave-w13 |
| 228 | BIZ-00234 | Little Avenue | Piedmont Ave | Children's Boutique | ordinary | piedmont-ave-w21 |
| 229 | BIZ-00235 | Linden Street Jewelers | Piedmont Ave | Jewelry Store | ordinary | piedmont-ave-e20 |
| 230 | BIZ-00236 | Lakeside Rowing Club | Lake Merritt | Private Club | ordinary | lake-merritt-e04 |
| 231 | BIZ-00237 | Grand Avenue Trust & Estate | Lake Merritt | Estate Law | ordinary | lake-merritt-e15 |
| 232 | BIZ-00238 | The Pergola Cafe | Lake Merritt | Cafe | ordinary | lake-merritt-e14 |
| 233 | BIZ-00239 | Lakeshore Market | Lake Merritt | Grocery | ordinary | lake-merritt-e13 |
| 234 | BIZ-00240 | Adams & Daughters Antiques | Lake Merritt | Antiques Shop | ordinary | lake-merritt-e11 |
| 235 | BIZ-00241 | Lakeshore Cigar Club | Lake Merritt | Cigar Lounge | ordinary | lake-merritt-e08 |
| 236 | BIZ-00242 | Grand Avenue Wine Bar | Lake Merritt | Wine Bar | ordinary | lake-merritt-e09 |
| 237 | BIZ-00243 | Perkins Street Taqueria | Adams Point | Restaurant & Dining | ordinary | adams-point-e13 |
| 238 | BIZ-00244 | Point Climbing Gym | Adams Point | Climbing Gym / Services | ordinary | adams-point-e10 |
| 239 | BIZ-00245 | Bellevue Coffee Roasters | Adams Point | Coffee Roaster | ordinary | adams-point-e18 |
| 240 | BIZ-00246 | Lakeside Paws | Adams Point | Veterinary Clinic | ordinary | adams-point-e07 |
| 241 | BIZ-00247 | Lakeshore Grand Theatre | Grand Lake | Movie Theater | theater | place |
| 242 | BIZ-00248 | Grand Lake Saturday Market | Grand Lake | Farmers Market | market | place |
| 243 | BIZ-00249 | Splash Pad Toys | Grand Lake | Toy Store | ordinary | grand-lake-e06 |
| 244 | BIZ-00250 | Lakeshore Creamery | Grand Lake | Ice Cream / Dessert Cafe | ordinary | grand-lake-e19 |
| 245 | BIZ-00251 | Grand Slice | Grand Lake | Pizzeria / Restaurant & Dining | ordinary | grand-lake-w11 |
| 246 | BIZ-00252 | Lakeshore Pho House | Eastlake | Vietnamese Restaurant | ordinary | eastlake-w10 |
| 247 | BIZ-00253 | Eastlake Tap Room | Eastlake | Bar | ordinary | eastlake-w06 |
| 248 | BIZ-00254 | Eastlake Community Credit Union | Eastlake | Credit Union / Finance | ordinary | eastlake-w04 |
| 249 | BIZ-00255 | East Lake Garden Supply | Eastlake | Garden Center / Retail | ordinary | eastlake-e13 |
| 250 | BIZ-00256 | Basin Residential Management | Brooklyn | Property Management / Real Estate | ordinary | brooklyn-e18 |
| 251 | BIZ-00257 | Estuary Pediatrics | Brooklyn | Pediatric Clinic | ordinary | brooklyn-e13 |
| 252 | BIZ-00258 | Shoreline Kayak & Paddle | Brooklyn | Outdoor Rental / Services | ordinary | brooklyn-e06 |
| 253 | BIZ-00259 | Ninth Avenue Bottle Shop | Brooklyn | Wine & Spirits Shop | ordinary | brooklyn-e11 |
| 254 | BIZ-00260 | International Boulevard Staffing | San Antonio | Staffing Agency / Professional Services | ordinary | san-antonio-w11 |
| 255 | BIZ-00261 | Early Shift Childcare | San Antonio | Preschool & Early Education | ordinary | san-antonio-e08 |
| 256 | BIZ-00262 | Panadería La Doce | San Antonio | Bakery | ordinary | san-antonio-w08 |
| 257 | BIZ-00263 | San Antonio Transmission & Tire | San Antonio | Auto Repair / Services | ordinary | san-antonio-e18 |
| 258 | BIZ-00264 | Mercado Fruitvale | Fruitvale | Mexican Grocery | ordinary | fruitvale-e06 |
| 259 | BIZ-00265 | Taquería El Andén | Fruitvale | Taquería / Restaurant | ordinary | fruitvale-w22 |
| 260 | BIZ-00266 | Boutique Reina | Fruitvale | Quinceañera & Formalwear Boutique | ordinary | fruitvale-e14 |
| 261 | BIZ-00267 | Platform Brunch | Fruitvale | Brunch Restaurant | ordinary | fruitvale-w06 |
| 262 | BIZ-00268 | International Cycle Works | Fruitvale | Bike Shop | ordinary | fruitvale-w26 |
| 263 | BIZ-00269 | Taco Fusion | Fruitvale | Fusion Restaurant | ordinary | fruitvale-w18 |
| 264 | BIZ-00270 | Hub Ramen | Fruitvale | Ramen Bar | ordinary | fruitvale-w14 |
| 265 | BIZ-00271 | Masa & Vine | Fruitvale | Small Plates & Natural Wine Bar | ordinary | fruitvale-e22 |
| 266 | BIZ-00272 | Coliseum Way Builders | East Oakland | Construction | ordinary | east-oakland-e06 |
| 267 | BIZ-00273 | Hegenberger Concrete & Steel | East Oakland | Construction Supply | ordinary | east-oakland-e08 |
| 268 | BIZ-00274 | Coliseum Corner Sports Bar | East Oakland | Sports Bar & Grill | ordinary | east-oakland-e09 |
| 269 | BIZ-00275 | Flatlands Soul Kitchen | East Oakland | Restaurant & Dining | ordinary | east-oakland-w04 |
| 270 | BIZ-00276 | Eastside Braids & Barbers | East Oakland | Hair Salon / Services | ordinary | east-oakland-e10 |
| 271 | BIZ-00277 | Stabilization Fund East Oakland Disbursement Office | East Oakland | Community Development | ordinary | east-oakland-w06 |
| 272 | BIZ-00278 | Oakland Coliseum | East Oakland | Stadium / Historic Landmark | coliseum | place |
| 273 | BIZ-00279 | MacArthur Tutoring Center | Laurel | Tutoring | ordinary | laurel-w11 |
| 274 | BIZ-00280 | Maxwell Park Youth League | Laurel | Youth Recreation / Community | ordinary | laurel-e05 |
| 275 | BIZ-00281 | Laurel Music School | Laurel | Music School | ordinary | laurel-e08 |
| 276 | BIZ-00282 | High Street Hardware | Laurel | Hardware Store | ordinary | laurel-w18 |
| 277 | BIZ-00283 | Laurel Family Realty | Laurel | Real Estate | ordinary | laurel-w15 |
| 278 | BIZ-00284 | Oakland City College — Laurel Campus | Laurel | Education | ordinary | laurel-e15 |
| 279 | BIZ-00285 | Fruitvale Avenue Social Club | Dimond | Social Club | ordinary | dimond-e08 |
| 280 | BIZ-00286 | Dimond Billiards | Dimond | Pool Hall & Bar | ordinary | dimond-e16 |
| 281 | BIZ-00287 | Sausal Creek Pawn & Jewelry | Dimond | Pawn & Jewelry Shop | ordinary | dimond-w11 |
| 282 | BIZ-00288 | Old Dimond Butcher | Dimond | Butcher Shop | ordinary | dimond-e10 |
| 283 | BIZ-00289 | Tops n Tassels | Dimond | Gentlemen's Club / Adult Entertainment | ordinary | dimond-e13 |

## Omitted-person inventory

Cap cuts (West Oakland): Dwayne Whitlock (POP-01176, LifeHistory_Log.jsonl:4525); Tariq Mansouri (POP-01182, LifeHistory_Log.jsonl:4534); Everett Maddox (POP-01186, LifeHistory_Log.jsonl:4543); Jace Robinson (POP-00483, LifeHistory_Log.jsonl:3342); Henry Rivas (POP-00024, LifeHistory_Log.jsonl:2619); Denise Carter (POP-00501, LifeHistory_Log.jsonl:3383); Kasumi Norwood (POP-00854, LifeHistory_Log.jsonl:3981); Cristina Norwood (POP-00908, LifeHistory_Log.jsonl:4080); Elena Patel (POP-01030, LifeHistory_Log.jsonl:4229).

Loose-only POPIDs (no qualifying neighborhood row; identity labels below come only from the citizen snapshot):

- POP-00320 — Cee Lee; LifeHistory_Log.jsonl:4678, 4693, 4763
- POP-00505 — Nina Chen; LifeHistory_Log.jsonl:4688
- POP-00004 — Lucia Polito; LifeHistory_Log.jsonl:4699, 4914
- POP-01110 — Amara Osei; LifeHistory_Log.jsonl:4707, 4968
- POP-00749 — Linda Chow; LifeHistory_Log.jsonl:4711
- POP-00051 — Desmond Morton; LifeHistory_Log.jsonl:4718, 4722, 4726
- POP-00806 — Nakia Pena; LifeHistory_Log.jsonl:4720
- POP-00289 — Joesph Allen; LifeHistory_Log.jsonl:4746
- POP-00722 — Daniel Cloak; LifeHistory_Log.jsonl:4904
- POP-00019 — Isley Kelley; LifeHistory_Log.jsonl:4908
- POP-00183 — Toby Lamont; LifeHistory_Log.jsonl:4915
- POP-00640 — Bryce Lee; LifeHistory_Log.jsonl:4942
- POP-00686 — Kaila Jack; LifeHistory_Log.jsonl:4945
- POP-01197 — Rosa Zhou; LifeHistory_Log.jsonl:4976
- POP-00454 — Amanda Hall; LifeHistory_Log.jsonl:5007

## 2026-11-10 (codex) — Job 2 completion and identity finding

### F12 — P2: name-only deep links cannot identify six current people

The checker found three same-name, same-neighborhood pairs in the actual C115 log: Bruce Wright (POP-00965/POP-01085, Downtown, `output/beats/LifeHistory_Log.jsonl:4185`, `:4324`), Victor Baker (POP-01198/POP-01227, Ivy Hill, `:4570`, `:4631`), and Elijah Campbell (POP-00969/POP-01217, Adams Point, `:4190`, `:4612`). They are separate rows in the citizen snapshot (lines 794/912, 1025/1054, 798/1044 respectively). `world-view/build.js:109` discards POPID, `world-view/template.html:658` serializes only the slugged name, and `:849` returns the first matching name. Selecting the second person works through object identity, but reopening their URL selects whichever same-name entry sorts first. Preserve POPID in people and person URLs. Until then the checker refuses these six ambiguous entries rather than guessing from age, job or text.

Job 2 delivered `scripts/worldViewCheck.js` and `scripts/worldViewCheck.test.js`. The checker requires the build in module mode twice, reads local files only, executes the actual engine age/year functions in a VM, compares rendered relationships through source ids, checks all named event lines and quote prefixes/cycles, rejects future reflections, checks canonical phrases independently of canonProblems, and reports duplicate/unplaced businesses and nonunique or changing layouts. It also rejects mismatched snapshot cycles and source changes during the run. Special places count as placements; no aliases or citywide placements are guessed. This does not validate tag priority, direct-speech meaning, history headings, residence captions or browser behavior; those remain findings above.

Validation: `node scripts/worldViewCheck.test.js` passed **18/18** synthetic tests, including file-backed runner cases for independent module builds, invalid/missing JSONL and sources changing during a build. `node --check` passed for both changed scripts. `node --test scripts/worldViewCheck.test.js` also exited zero; the direct run supplied the individual-test receipts. No dependency installs, page generation, browser/CDN, Sheet, deployment or live-cycle checks were performed.

Current-data receipt: `node scripts/worldViewCheck.js` exits **1**, prints no PASS, and reports **173** one-line failures: **140 event-name failures** (the attached source events have blank Name), **12 future reflections**, **1 stale spouse name**, **6 ambiguous person entries**, **14 unplaced businesses**. This is the intended strict result against the current build, not a failed synthetic test suite. The checker does not claim to disambiguate or fully verify the six ambiguous people. Event text is retained by POPID in the page, but the brief additionally requires a matching Name; changing that contract or adding explicit identity provenance belongs in the world-view follow-up.

## 2026-11-11 (codex) — Re-review of 300b3b8c3 and checker contract update

**Verdict: SHIP-WITH-FIXES.** The original current-data failures are repaired or explicitly scoped out, and the updated local checker passes. F1 retains a missing-home fallback defect; two additional edge cases remain below (F13–F14). This verdict covers source and isolated local execution, not browser performance or audio acceptance. The original HOLD and receipts above are historical; this section is the current assessment.

Reviewed commit `300b3b8c3ea3e336e426831b524cbe03d20ac042`, including its committed `life-traffic.js`, `life-nature.js`, `life-water.js`, `life-street.js` and `sound.js` ancestors. All ten reviewed world-view source/README files remained byte-identical during this pass. Local C115 beat/snapshot files were already dirty and were read as the current inputs; they were not changed or treated as committed fixtures.

### Reconciliation of F1–F12

| Finding | Disposition and evidence at this commit |
|---|---|
| F1 — event location as home | **Current-data failure closed; missing-home edge remains.** `build.js:88` exports ledger residence; `template.html:828` uses it and `:832` separates event location. All 1,004 current people have a ledger-matching residence. See the residual case below. |
| F2 — filed/graded receipts as speech | **Closed for the reported receipts.** `build.js:62` excludes those prefixes before reflection selection. No displayed quote has either prefix. This does not prove that every other excerpt is literal speech. |
| F3 — future reflections | **Closed.** `build.js:62` rejects cycles after the page; no selected primary/secondary reflection exceeds C115. |
| F4 — loose retirement buried | **Closed.** `build.js:104` sorts the combined event list and `:105` resets the lead. POP-00177 now leads with “stepped back from professional life.” `:13` ranks Career-Hired with turning points; `:14` distinguishes QoL-Down. |
| F5 — silently omitted people | **Closed on current data.** `build.js:115` adds the loose-only people at ledger home, flagged `noPlace`; `:119` raises CAP to 140; `:124` records overflow. All 1,004 qualifying event POPIDs appear, including all 15 previously loose-only people; `notShown` is empty. The largest street now has **124**, not README's stale 119 (`README.md:90`), but remains below CAP. Finder consumes `notShown` at `template.html:806`. See F14 for a future-input distinction. |
| F6 — missing business placements/theater | **Resolved under the requested placement contract.** `build.js:163` recognizes Theater sectors; Uptown Playhouse is a theater place. `:216–217` explicitly lists the 14 off-map ledger businesses. Current coverage: 244 ordinary assignments + 25 special places + 14 known-unplaced = all 283 businesses. The old inventory above is historical, including Uptown's former assignment. |
| F7 — current history under earlier heading | **Closed.** `build.js:75` admits history only when `(year - 1) * 52 + cycle < CYCLE`. Every emitted history entry is earlier than C115. |
| F8 — weather HTML injection | **Closed at the reported sink.** `template.html:645–647` creates text nodes. Executing `facts()` with a synthetic image/onerror string inserted it as text; an instrumented innerHTML setter was never invoked. |
| F9 — same-neighborhood hash retains visit | **Closed.** `template.html:863` calls `endVisit(false)` for that transition; an isolated listener execution confirmed it. |
| F10 — slow frames cannot downgrade | **Closed in the controller.** `template.html:734` counts 300 ms frames, and `:305` initializes shadow casting from quality. Executing the actual loop with 300 ms frame intervals reached quality 0 and disabled shadows. The newly reviewed water module does not fully follow that downgrade (F13). |
| F11 — durable parcel identity | **Accepted limitation, not implemented durability.** `README.md:28–29` explicitly limits ids to deterministic identical inputs and reserves durable addresses for persisted assignment. The check still tests repeated identical-input layouts only. |
| F12 — same-name links select wrong person | **Closed for generated links.** `build.js:130` preserves POPID; `template.html:661` emits name + digits and `:857` resolves that composite first. Actual `fromHash()` execution selected each of the six previously ambiguous POPIDs correctly. Legacy name-only links still choose the first match, as compatibility behavior. |

### F1 residual — P2: a missing ledger home still becomes an asserted home

`world-view/build.js:88` omits `lives` when the snapshot Neighborhood is blank. `world-view/template.html:828` then falls back to `world.H.name` inside the affirmative “Lives in” sentence. Input: an event with a location, but no ledger residence → output: that event location is asserted as home. A read-only VM run of the actual build with one residence blanked, followed by actual `startVisit()` with inert DOM nodes, reproduced “Lives in Jack London” for that missing-home fixture. No current displayed citizen has this missing field. Omit the residence sentence or say it is unrecorded when `lives` is missing. Ledger equality in the checker cannot certify this UI fallback.

### F13 — P2: a runtime quality downgrade retains the expensive water surface

`world-view/life-water.js:334–344` picks a basic material only when the street is initially built at quality 0. The page instead lowers its live quality without rebuilding (`world-view/template.html:734`). The water tick at `life-water.js:549–551` then only zeros `nL` and `detail`; it leaves `S.sea.material` as the shader. The fragment program still runs all six waves (`:46`), reflection math (`:62–67`), and rain rings when raining (`:53–60`). Input: enter water at quality 2, then degrade to 0 → output: the initial-quality-0 cheap surface is never selected until a later rebuild. That misses `README.md:59`'s expensive-work fallback precisely on a struggling device.

Executed the actual tick closure with inert graphics stand-ins and quality 0: material identity remained the shader, `detail` became 0, and `rain` remained 1. This proves the transition logic, not a measured GPU cost. Swap to and own/dispose a basic material on the transition, or implement an equally cheap shader branch that also skips waves/reflections/rain; exercise 2→1→0 on the same street.

### F14 — P2: a blank event Name is treated as a missing event place

`world-view/build.js:28` requires both Name and Neighborhood for the placed-event path; `:101` sends the complement into `loose`; `:115` unconditionally marks a loose-only person `noPlace`. Name and location are independent fields. Input: valid POPID and ledger name, blank event Name, populated event Neighborhood → output: the person stands at ledger home and the caption says “Nothing in their week names a place” (`world-view/template.html:831`). That caption is false even if home happens to equal the event neighborhood.

Reproduced by running the actual build in a VM with only POP-00177's C115 event Names blanked: source location remained Jack London and output became `noPlace: 1`. No source file was edited. The current snapshot does not exercise this combination. Resolve display name from POPID separately from location, and set `noPlace` only when the week's qualifying events actually lack locations. The updated checker intentionally rejects this false marker while accepting blank-Name event text through POPID.

### Ambient scope and remaining verification limits

Reviewed hook order, supplied kit fields, per-place ownership, dynamic quality checks and sound retirement across all five modules. Traffic precedes street so bus stops are available (`template.html:481`); nature and water run afterward (`:482–483`). Geometry/material disposal is rooted in retired scenes (`:319–323`, `:653`); owned traffic/street textures are marked, and sound stops retired sources before disconnecting their node lists (`sound.js:355–361`). No additional confirmed unbounded resource leak emerged from this source trace.

Two observations are not promoted to proven runtime failures: nature still advances the full bird array before hiding alternate instances at quality 0 (`life-nature.js:387`, `:488`), so its CPU savings need profiling; Coliseum crowd/PA is selected by landmark type (`sound.js:259–265`, `:388–390`) with no game-state input (`template.html:657`), so it is ambient illustration rather than evidence of a current game. README explicitly authorizes landmark-based sound and records generic drawn fittings; this review does not override those drawing choices. No browser, WebGL shader compilation, real-device frame timing, human audio listening or keyboard walk-up was performed.

### Checker delivery and validation

Updated `scripts/worldViewCheck.js` to require exported POPID, bind every displayed event text to that POPID/current cycle, compare `lives` to the citizen snapshot's Neighborhood, and remove the obsolete spouse-name check. Blank event Names pass; wrong POPIDs, altered text and wrong cycles still fail. `noPlace` must describe genuinely locationless events placed at ledger home. Qualifying event POPIDs must be shown or accounted for in `data.notShown`; because that list has names only, ambiguous omitted names fail rather than being guessed.

`data.unplacedBiz` is checked against exact ledger name/neighborhood and the absence of a rendered street. Each valid entry prints `KNOWN-UNPLACED <BIZ_ID>`, not FAIL. Invented, duplicate, already assigned or on-street exemptions fail, and unlisted missing businesses still fail. The count 14 is observed, not a hardcoded bypass. Repeated-layout, metadata, relationship and source-change checks remain.

Validation receipts:

- `node scripts/worldViewCheck.test.js`: **23/23 PASS**, with synthetic POPID collisions, blank Names, residence mismatch, `noPlace`, omitted-person accounting, unplaced-list forgery/duplicates/on-street misuse, and file-backed exit-code/report checks.
- `node --check scripts/worldViewCheck.js` and `node --check scripts/worldViewCheck.test.js`: **PASS**.
- `node scripts/worldViewCheck.js`: **exit 0**, **14 KNOWN-UNPLACED**, no FAIL lines; C115, 22 neighborhoods, 1,004 distinct displayed people. The 173-failure receipt above is superseded by this contract and fold.
- Read-only local VM probes exercised current folded selections, all six POPID links, same-street visit exit, text-only weather, slow-frame downgrade and the residual cases above. They used in-memory input substitutions/inert DOM or graphics stand-ins, not a browser or altered repo fixtures.

No world-view edits, dependency installs, generated page, network/CDN requests, model/API runs, Sheets, canon writes, deployment or live cycles. Engine calendar/life-state wiring remains the direct local VM invocation described in Job 2; no paid wiring-card run was made under the brief's no-model-API boundary.
