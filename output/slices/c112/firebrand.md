# SLICE — firebrand (Jax Caldera), Cycle 112
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: metric-contradiction · SCORE: 61
LABEL: math-imbalance (high) | KONO: decay [Sentiment -0.310, RetailVitality -0.60, HousingPressure +0.500] — Sentiment now -0.01 (11 of 22, city median -0.025); RetailVitality now 7.88 (13 of 22, city median 8.879999999999999); HousingPressure now 0.5 (13 of 22, city median 0.25) — with no matching active initiative
REF: output/engine_audit_c112.json patterns[6]; evidence: Neighborhood_Map row(s) 19

## CONTRADICTION
A: KONO: decay [Sentiment -0.310, RetailVitality -0.60, HousingPressure +0.500] — Sentiment now -0.01 (11 of 22, city median -0.025); RetailVitality now 7.88 (13 of 22, city median 8.879999999999999); HousingPressure now 0.5 (13 of 22, city median 0.25) — with no matching active initiative
A REF: output/engine_audit_c112.json patterns[6]; evidence: Neighborhood_Map row(s) 19
B: No active initiative (or mitigator) owns this break on the record
B REF: output/engine_audit_c112.json patterns[6]; evidence: Neighborhood_Map row(s) 19
FRAME: The map says decay; the program roster does not answer it.

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Tatiana Flores (POP-00859) — role: HVAC Technician; neighborhood: KONO; born: 2000; careerStage: mid-career; wealth: 8; employerBiz: BIZ-00020; skills: Trades; tier: 4  [stink-handle]
- Makayla Wu (POP-00867) — role: Electrician; neighborhood: KONO; born: 2007; careerStage: mid-career; wealth: 5; employerBiz: UNTRACKED; skills: Trades; tier: 4  [stink-handle]
- Iris Pham (POP-01203) — role: Barista; neighborhood: Baylight District; born: 2018; careerStage: entry-level; wealth: 5; tier: 4  [same-hood-signal]
- Pooja Coleman (POP-01208) — role: Warehouse worker; neighborhood: Baylight District; born: 1975; careerStage: mid-career; wealth: 5; tier: 4  [same-hood-signal]
- Mart Johns (POP-00648) — role: Nurse Aide; neighborhood: KONO; born: 2004; careerStage: mid-career; wealth: 5; employerBiz: BIZ-00015; skills: Tech & Innovation; tier: 3  [same-hood-signal]
- Florencia Shah (POP-00934) — role: Independent Bookstore Owner; neighborhood: KONO; born: 1955; careerStage: retired; wealth: 6; employerBiz: SELF_EMPLOYED; skills: Small Business; tier: 4  [bond-hop from interview pool]

## BONDS (real edges — color social graph, do not invent)
- Florencia Shah ↔ Makayla Wu (friendship, neighbor, KONO)
- Tatiana Flores ↔ Makayla Wu (friendship, neighbor, KONO)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Winter | Weather: 48°F clear, W 8 mph, clear (frontState CLEAR), humidity 51, visibility 10
HOOD: KONO
TEXTURE:
Northgate Kitchen buzzes with diners, and new residents arrive from Adams Point. The Fox Theater anchors the neighborhood’s growing energy, with more people walking Telegraph Avenue.
COLOR ROOM: You may invent one or many bar/street/sensory scenes and Jax's own presence or route through them, so long as the color contradicts no supplied sim fact. A generic bar is persona texture, not a new canon business. Named people must stay on the CITIZENS list or be unnamed. Do not invent a named business or institution. RoleType is immutable — do not reassign careers.

## GAPS (deepen later)
- **EmployerBizId → Business_Ledger name/address** [gap]: RoleType alone; no shop name/street for employer scene color without inventing
- **Cultural_Ledger venues by neighborhood** [gap-on-disk]: Bar/venue canon list not auto-attached to slice — Jax opens in bars; needs hood venue pointer
- **Faith_Ledger / Faith_Organizations by hood** [partial]: Texture file sometimes names congregations; not joined to stink hood systematically
- **LifeHistory_Log raw (beyond Who Lived It digest)** [partial]: Digest is tag-summary; full event prose would deepen street color without inventing people
- **Relationship_Bonds live refresh** [stale-risk]: bond-ledger-live.tsv may lag; bond-hop quality depends on export freshness
- **Neighborhood_Map row metrics on slice** [partial]: Stink label carries some decay numbers; full hood board not embedded as color (avoid jargon in prose)
- **Map hoods with zero Simulation_Ledger residents (e.g. Brooklyn on C102)** [sim-gap]: Audit can flag decay for a hood nobody lives in on the ledger — stink is real, interview pool empty; slice walks to next candidate with residents
- **Citizen pages / DialState** [via-citizenVoice]: Quote stage loads dials; slice does not pre-print dial prose (correct — voice owns it)

## POINTERS
- output/cron-compare/stink_c112.json
- output/desk_signal_c112.json
- output/world_summary_c112.md
- output/neighborhood_texture_c112.md
- output/engine_audit_c112.json
- output/engine_audit_c112.json patterns[6]; evidence: Neighborhood_Map row(s) 19
- output/engine_audit_c112.json patterns[6]; evidence: Neighborhood_Map row(s) 19
- output/engine_audit_c112.json patterns[6]; evidence: Neighborhood_Map row(s) 19

_Generated by scripts/buildJaxSlice.js — no LLM. Not a Mags desk-slice._
