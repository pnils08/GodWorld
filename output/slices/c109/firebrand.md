# SLICE — firebrand (Jax Caldera), Cycle 109
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: metric-contradiction · SCORE: 51
LABEL: math-imbalance (medium) | Downtown: decay [Sentiment -0.050, HousingPressure +1.000] — Sentiment now 0.28 (10 of 22, city median 0.28); HousingPressure now 6 (20 of 22, city median 0) — with no matching active initiative
REF: output/engine_audit_c109.json patterns[1]; evidence: Neighborhood_Map row(s) 2

## CONTRADICTION
A: Downtown: decay [Sentiment -0.050, HousingPressure +1.000] — Sentiment now 0.28 (10 of 22, city median 0.28); HousingPressure now 6 (20 of 22, city median 0) — with no matching active initiative
A REF: output/engine_audit_c109.json patterns[1]; evidence: Neighborhood_Map row(s) 2
B: No active initiative (or mitigator) owns this break on the record
B REF: output/engine_audit_c109.json patterns[1]; evidence: Neighborhood_Map row(s) 2
FRAME: The map says decay; the program roster does not answer it.

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Jessie Hess (POP-00212) — role: Barista; neighborhood: Downtown; born: 1977; careerStage: retired; wealth: 8; employerBiz: BIZ-00030; skills: Tech & Innovation; tier: 3  [stink-handle]
- Theo Burkes (POP-00541) — role: Rapper; neighborhood: Downtown; born: 2007; careerStage: mid-career; wealth: 4; employerBiz: SELF_EMPLOYED; skills: Professional; tier: 3  [stink-handle]
- Tao Lee (POP-00764) — role: Community Organizer; neighborhood: Downtown; born: 1986; careerStage: mid-career; wealth: 5; employerBiz: BIZ-00028; skills: Faith & Community; tier: 2  [same-hood-signal]
- Imie Calero (POP-00335) — role: Civil Rights Attorney; neighborhood: Downtown; born: 1982; careerStage: senior; wealth: 8; employerBiz: SELF_EMPLOYED; skills: Professional; tier: 4  [same-hood-signal]
- Derlik Green (POP-00244) — role: Delivery Driver; neighborhood: Downtown; born: 2000; careerStage: mid-career; wealth: 7; employerBiz: UNTRACKED; skills: 2041-Specific; tier: 3  [same-hood-signal]
- Juliet Choi (POP-00857) — role: Security Guard; neighborhood: Downtown; born: 2018; careerStage: entry-level; wealth: 2; employerBiz: BIZ-00021; skills: Government & Civic; tier: 4  [same-hood-signal]
- Santiago Carter (POP-01006) — role: student; neighborhood: Downtown; born: 2035; careerStage: student; wealth: 0; tier: 4  [bond-hop from interview pool]
- Xavier Davis (POP-00362) — role: Housing Authority Inspector; neighborhood: Downtown; born: 1998; careerStage: mid-career; wealth: 5; employerBiz: BIZ-00034; skills: Government & Civic; tier: 4  [bond-hop from interview pool]
- Carlos Presti (POP-00048) — role: Corporate Accountant; neighborhood: Downtown; born: 1995; careerStage: senior; wealth: 6; employerBiz: BIZ-00102; skills: Professional; tier: 4  [bond-hop from interview pool]
- Russell Hayward (POP-00720) — role: Insurance Adjuster; neighborhood: Laurel; born: 1997; careerStage: mid-career; wealth: 5; employerBiz: SELF_EMPLOYED; skills: Professional; tier: 4  [bond-hop from interview pool]
- Timmie Hall (POP-00439) — role: Refugee Resettlement Case Worker; neighborhood: Chinatown; born: 1995; careerStage: senior; wealth: 5; employerBiz: BIZ-00028; skills: Faith & Community; tier: 3  [bond-hop from interview pool]
- Rosario Medina (POP-01053) — role: CBA Compliance Monitor, Fruitvale Transit Hub; neighborhood: Fruitvale; born: 2001; careerStage: mid-career; wealth: 2; employerBiz: BIZ-00096; skills: Government & Civic; tier: 4  [bond-hop from interview pool]

## BONDS (real edges — color social graph, do not invent)
- Santiago Carter ↔ Derlik Green (friendship, neighbor, Downtown)
- Jessie Hess ↔ Xavier Davis (friendship, neighbor, Downtown)
- Carlos Presti ↔ Imie Calero (friendship, neighbor, Downtown)
- Beverly Hayes ↔ Tao Lee (friendship, random, cross-neighborhood)
- Tao Lee ↔ Russell Hayward (rivalry, random, cross-neighborhood)
- Jessie Hess ↔ Timmie Hall (rivalry, random, cross-neighborhood)
- Rosario Medina ↔ Imie Calero (professional, random, cross-neighborhood)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Winter | Weather: 49°F overcast, NW 12 mph, marine (frontState MARINE), humidity 73, visibility 10
HOOD: Downtown
TEXTURE:
A new face joins the Telegraph Presbyterian Fellowship, while the streets hum with the quiet energy of a neighborhood that knows it's in demand. SpeedyBurger's neon glows steady through the evening, and somewhere, someone is packing boxes under pressure.
COLOR ROOM: You may invent one or many bar/street/sensory scenes and Jax's own presence or route through them, so long as the color contradicts no supplied sim fact. A generic bar is persona texture, not a new canon business. Named people must stay on the CITIZENS list or be unnamed. Do not invent a named business or institution. RoleType is immutable — do not reassign careers.

## GAPS (deepen later)
- **EmployerBizId → Business_Ledger name/address** [gap]: RoleType alone; no shop name/street for employer scene color without inventing
- **Cultural_Ledger venues by neighborhood** [gap-on-disk]: Bar/venue canon list not auto-attached to slice — Jax opens in bars; needs hood venue pointer
- **Faith_Ledger / Faith_Organizations by hood** [partial]: Texture file sometimes names congregations; not joined to stink hood systematically
- **LifeHistory_Log raw (beyond Who Lived It digest)** [partial]: Digest is tag-summary; full event prose would deepen street color without inventing people
- **Relationship_Bonds live refresh** [stale-risk]: bond-ledger-live.tsv may lag; bond-hop quality depends on export freshness
- **Neighborhood_Map row metrics on slice** [partial]: Stink label carries some decay numbers; full hood board not embedded as color (avoid engine jargon in prose)
- **Map hoods with zero Simulation_Ledger residents (e.g. Brooklyn on C102)** [sim-gap]: Audit can flag decay for a hood nobody lives in on the ledger — stink is real, interview pool empty; slice walks to next candidate with residents
- **Citizen pages / DialState** [via-citizenVoice]: Quote stage loads dials; slice does not pre-print dial prose (correct — voice owns it)

## POINTERS
- output/cron-compare/stink_c109.json
- output/desk_signal_c109.json
- output/world_summary_c109.md
- output/neighborhood_texture_c109.md
- output/engine_audit_c109.json
- output/engine_audit_c109.json patterns[1]; evidence: Neighborhood_Map row(s) 2
- output/engine_audit_c109.json patterns[1]; evidence: Neighborhood_Map row(s) 2
- output/engine_audit_c109.json patterns[1]; evidence: Neighborhood_Map row(s) 2

_Generated by scripts/buildJaxSlice.js — no LLM. Not a Mags desk-slice._
