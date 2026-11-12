# SLICE — firebrand (Jax Caldera), Cycle 115
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: metric-contradiction · SCORE: 51
LABEL: math-imbalance (medium) | KONO: decay [Sentiment -0.180, HousingPressure +0.500] — Sentiment now -0.02 (12 of 22, city median -0.015); HousingPressure now 0.5 (14 of 22, city median 0) — with no matching active initiative
REF: output/engine_audit_c115.json patterns[5]; evidence: Neighborhood_Map row(s) 19

## CONTRADICTION
A: KONO: decay [Sentiment -0.180, HousingPressure +0.500] — Sentiment now -0.02 (12 of 22, city median -0.015); HousingPressure now 0.5 (14 of 22, city median 0) — with no matching active initiative
A REF: output/engine_audit_c115.json patterns[5]; evidence: Neighborhood_Map row(s) 19
B: No active initiative (or mitigator) owns this break on the record
B REF: output/engine_audit_c115.json patterns[5]; evidence: Neighborhood_Map row(s) 19
FRAME: The map says decay; the program roster does not answer it.

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Dmitri Soto (POP-00276) — role: Container Yard Supervisor; neighborhood: KONO; born: 1994; careerStage: senior; wealth: 5; employerBiz: BIZ-00012; skills: Port & Labor; tier: 4  [stink-handle]
- Jasmine Torres (POP-01111) — role: Founder, Tenth Street Digital; neighborhood: KONO; born: 2010; careerStage: mid-career; wealth: 4; employerBiz: BIZ-00011; skills: Small Business; tier: 3  [stink-handle]
- Dank Abara (POP-00796) — role: Waiter; neighborhood: San Antonio; born: 2000; careerStage: mid-career; wealth: 4; employerBiz: UNTRACKED; skills: Food & Culture; tier: 4  [same-hood-signal]
- Delia Vargas-Ruiz (POP-01054) — role: Transit Hub D3 Intake Liaison; neighborhood: San Antonio; born: 2008; careerStage: early-career; wealth: 4; employerBiz: BIZ-00096; skills: Government & Civic; tier: 4  [same-hood-signal]
- Priya Raghunathan (POP-01214) — role: BART Rail Dispatcher; neighborhood: KONO; born: 1993; careerStage: senior; wealth: 5; employerBiz: BIZ-00014; skills: Transit & Infrastructure; tier: 4  [same-hood-signal]
- Valentina Campbell (POP-01017) — role: Server; neighborhood: Jack London; born: 2024; careerStage: student; wealth: 0; employerBiz: BIZ-00041; skills: Food & Culture; tier: 4  [bond-hop from interview pool]
- Elena Soria Dominguez (POP-00791) — role: Transit Hub Planning Lead; neighborhood: Fruitvale; born: 1999; careerStage: mid-career; wealth: 6; employerBiz: BIZ-00096; skills: Government & Civic; tier: 3  [bond-hop from interview pool]

## BONDS (real edges — color social graph, do not invent)
- Dmitri Soto ↔ Valentina Campbell (professional, neighbor, Jack London)
- Elena Soria Dominguez ↔ Dmitri Soto (alliance, random, cross-neighborhood)
- Dmitri Soto ↔ Talia Finch (professional, neighbor, Jack London)
- JR Rosado ↔ Dank Abara (neighbor, random_encounter)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Spring | Weather: 55°F mild, W 10 mph, clear (frontState CLEAR), humidity 51, visibility 10
HOOD: KONO
TEXTURE:
Retail is busy, events are drawing crowds, and new households are moving into the neighborhood from various parts of the city.
WHO LIVED IT (this hood):
- HH-0115-F013 | solo | head POP-01223 | KONO
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
- output/cron-compare/stink_c115.json
- output/desk_signal_c115.json
- output/world_summary_c115.md
- output/neighborhood_texture_c115.md
- output/engine_audit_c115.json
- output/engine_audit_c115.json patterns[5]; evidence: Neighborhood_Map row(s) 19
- output/engine_audit_c115.json patterns[5]; evidence: Neighborhood_Map row(s) 19
- output/engine_audit_c115.json patterns[5]; evidence: Neighborhood_Map row(s) 19

