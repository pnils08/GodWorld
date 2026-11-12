# SLICE — firebrand (Jax Caldera), Cycle 113
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: metric-contradiction · SCORE: 61
LABEL: math-imbalance (high) | Chinatown: decay [Sentiment -0.050, RetailVitality -2.07, HousingPressure +1.000] — Sentiment now -0.06 (20 of 22, city median 0.03); RetailVitality now 7.78 (9 of 22, city median 7.165); HousingPressure now 1.5 (14 of 22, city median 0) — with no matching active initiative
REF: output/engine_audit_c113.json patterns[6]; evidence: Neighborhood_Map row(s) 12

## CONTRADICTION
A: Chinatown: decay [Sentiment -0.050, RetailVitality -2.07, HousingPressure +1.000] — Sentiment now -0.06 (20 of 22, city median 0.03); RetailVitality now 7.78 (9 of 22, city median 7.165); HousingPressure now 1.5 (14 of 22, city median 0) — with no matching active initiative
A REF: output/engine_audit_c113.json patterns[6]; evidence: Neighborhood_Map row(s) 12
B: No active initiative (or mitigator) owns this break on the record
B REF: output/engine_audit_c113.json patterns[6]; evidence: Neighborhood_Map row(s) 12
FRAME: The map says decay; the program roster does not answer it.

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Timmie Hall (POP-00439) — role: Refugee Resettlement Case Worker; neighborhood: Chinatown; born: 1995; careerStage: senior; wealth: 5; employerBiz: BIZ-00028; skills: Faith & Community; tier: 3  [stink-handle]
- Mei Chen (POP-00635) — role: Gallery Owner/Curator; neighborhood: Chinatown; born: 1994; careerStage: senior; wealth: 5; employerBiz: SELF_EMPLOYED; skills: Government & Civic; tier: 3  [stink-handle]
- Liliana Salazar (POP-01128) — role: EV mechanic; neighborhood: Glenview; born: 1968; careerStage: mid-career; wealth: 5; tier: 4  [same-hood-signal]
- Wren Choi (POP-01137) — role: Youth mentor; neighborhood: Glenview; born: 1999; careerStage: mid-career; wealth: 4; tier: 4  [same-hood-signal]
- Solveig Anand (POP-01194) — role: School Nurse; neighborhood: Glenview; born: 2006; careerStage: mid-career; wealth: 6; employerBiz: BIZ-00016; skills: Healthcare; tier: 4  [same-hood-signal]
- Iris Pham (POP-01203) — role: Barista; neighborhood: Baylight District; born: 2018; careerStage: entry-level; wealth: 5; tier: 4  [same-hood-signal]
- Pooja Coleman (POP-01208) — role: Warehouse worker; neighborhood: Baylight District; born: 1975; careerStage: mid-career; wealth: 5; tier: 4  [same-hood-signal]
- Jessie Hess (POP-00212) — role: Barista; neighborhood: Downtown; born: 1977; careerStage: retired; wealth: 8; employerBiz: BIZ-00176; skills: Tech & Innovation; tier: 3  [bond-hop from interview pool]
- Farah Lindqvist (POP-00257) — role: City Building Inspector; neighborhood: Downtown; born: 1994; careerStage: senior; wealth: 6; employerBiz: BIZ-00017; skills: Government & Civic; tier: 4  [bond-hop from interview pool]

## BONDS (real edges — color social graph, do not invent)
- Jessie Hess ↔ Timmie Hall (rivalry, random, cross-neighborhood)
- Wren Choi ↔ Farah Lindqvist (neighbor, random_encounter)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Winter | Weather: 58°F clear, W 8 mph, clear (frontState CLEAR), humidity 56, visibility 10
HOOD: Chinatown
TEXTURE:
A medical team rushes to an emergency on the sidewalk, drawing a small crowd. The usual lunch spot is suddenly closed, with a notice taped to the door.
CHAOS (touching hood):
- | ambulance | medical_emergency | neighborhood Chinatown | Sentiment | -0.07 | FALSE |
- - ambulance → Chinatown: Lights and sirens at the curb — a medical emergency the neighbors will retell.
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
- output/cron-compare/stink_c113.json
- output/desk_signal_c113.json
- output/world_summary_c113.md
- output/neighborhood_texture_c113.md
- output/engine_audit_c113.json
- output/engine_audit_c113.json patterns[6]; evidence: Neighborhood_Map row(s) 12
- output/engine_audit_c113.json patterns[6]; evidence: Neighborhood_Map row(s) 12
- output/engine_audit_c113.json patterns[6]; evidence: Neighborhood_Map row(s) 12

