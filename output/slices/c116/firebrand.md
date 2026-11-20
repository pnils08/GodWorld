# SLICE — firebrand (Jax Caldera), Cycle 116
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: metric-contradiction · SCORE: 51
LABEL: math-imbalance (medium) | KONO: decay [RetailVitality -1.06, HousingPressure +1.000] — RetailVitality now 8.68 (12 of 22, city median 9.21); HousingPressure now 1.5 (15 of 22, city median 0); Sentiment now 0.05 (15 of 22, city median 0.06) — with no matching active initiative
REF: output/engine_audit_c116.json patterns[2]; evidence: Neighborhood_Map row(s) 19

## CONTRADICTION
A: KONO: decay [RetailVitality -1.06, HousingPressure +1.000] — RetailVitality now 8.68 (12 of 22, city median 9.21); HousingPressure now 1.5 (15 of 22, city median 0); Sentiment now 0.05 (15 of 22, city median 0.06) — with no matching active initiative
A REF: output/engine_audit_c116.json patterns[2]; evidence: Neighborhood_Map row(s) 19
B: No active initiative (or mitigator) owns this break on the record
B REF: output/engine_audit_c116.json patterns[2]; evidence: Neighborhood_Map row(s) 19
FRAME: The map says decay; the program roster does not answer it.

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Michael Corliss (POP-00596) — role: Photographer; neighborhood: KONO; born: 2019; careerStage: entry-level; wealth: 2; employerBiz: BIZ-00018; skills: Creative & Arts; tier: 3  [stink-handle]
- Celeste Moon (POP-01061) — role: singer; neighborhood: KONO; born: 1988; careerStage: entry-level; wealth: 0; employerBiz: SELF_EMPLOYED; skills: Creative & Arts; tier: 3  [stink-handle]
- Jasmine Torres (POP-01111) — role: Founder, Tenth Street Digital; neighborhood: KONO; born: 2010; careerStage: mid-career; wealth: 4; employerBiz: BIZ-00011; skills: Small Business; tier: 3  [stink-handle]
- Dmitri Soto (POP-00276) — role: Container Yard Supervisor; neighborhood: KONO; born: 1994; careerStage: senior; wealth: 5; employerBiz: BIZ-00012; skills: Port & Labor; tier: 3  [same-hood-signal]
- Mesi Westin (POP-00650) — role: Dishwasher; neighborhood: KONO; born: 2011; careerStage: mid-career; wealth: 3; employerBiz: BIZ-00050; skills: The Vulnerable; tier: 3  [same-hood-signal]
- Valentina Campbell (POP-01017) — role: Server; neighborhood: Jack London; born: 2024; careerStage: student; wealth: 0; employerBiz: BIZ-00041; skills: Food & Culture; tier: 4  [bond-hop from interview pool]
- Elena Soria Dominguez (POP-00791) — role: Transit Hub Planning Lead; neighborhood: Fruitvale; born: 1999; careerStage: mid-career; wealth: 6; employerBiz: BIZ-00096; skills: Government & Civic; tier: 3  [bond-hop from interview pool]
- Emiko Zhang (POP-00935) — role: Home Health Aide; neighborhood: Jack London; born: 1984; careerStage: senior; wealth: 7; employerBiz: BIZ-00015; skills: Healthcare; tier: 4  [bond-hop from interview pool]
- Anna Baker (POP-00471) — role: Trade Union Representative; neighborhood: Jack London; born: 1967; careerStage: retired; wealth: 8; employerBiz: BIZ-00012; skills: Port & Labor; tier: 4  [bond-hop from interview pool]

## EARLIER COVERAGE OF THESE CITIZENS (from the Tribune index; context, not a requirement)
- Celeste Moon (POP-01061)
  - yours, C106: Downtown, Overcast, Nobody's Name on It  [editions/cycle_pulse_c106.txt]
- Dmitri Soto (POP-00276)
  - yours, C115: Who Owns KONO's Rent Pressure When Everyone on Telegraph Says Business Is Good?  [editions/cycle_pulse_c115.txt]

## BONDS (real edges — color social graph, do not invent)
- Dmitri Soto ↔ Valentina Campbell (friendship, neighbor, Jack London)
- Elena Soria Dominguez ↔ Dmitri Soto (alliance, random, cross-neighborhood)
- Dmitri Soto ↔ Talia Finch (professional, neighbor, Jack London)
- Emiko Zhang ↔ Mesi Westin (friendship, neighbor, Jack London)
- Anna Baker ↔ Mesi Westin (friendship, neighbor, Jack London)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Spring | Weather: 54°F mild, W 8 mph, clear (frontState CLEAR), humidity 53, visibility 10
HOOD: KONO
TEXTURE:
The lingering smell of smoke reminds everyone of the recent blaze, though life on the block seems to carry on as usual. A newcomer from Jack London has settled in.
WHO LIVED IT (this hood):
- HH-0116-F007 | solo | head POP-00889 | KONO
CHAOS (touching hood):
- | fire_engine | major_blaze_contained | neighborhood KONO | Sentiment | -0.06 | FALSE |
- - fire_engine → KONO: Smoke over the rooftops — a blaze contained, but the block smells it for days.
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
- output/cron-compare/stink_c116.json
- output/desk_signal_c116.json
- output/world_summary_c116.md
- output/neighborhood_texture_c116.md
- output/engine_audit_c116.json
- output/engine_audit_c116.json patterns[2]; evidence: Neighborhood_Map row(s) 19
- output/engine_audit_c116.json patterns[2]; evidence: Neighborhood_Map row(s) 19
- output/engine_audit_c116.json patterns[2]; evidence: Neighborhood_Map row(s) 19

