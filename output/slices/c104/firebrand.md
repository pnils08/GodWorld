# SLICE — firebrand (Jax Caldera), Cycle 104
JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat

## STINK
CLASS: metric-contradiction · SCORE: 61
LABEL: math-imbalance (high) | Grand Lake: decay [Sentiment -0.070, RetailVitality -5.03, HousingPressure +0.500] with no matching active initiative
REF: output/engine_audit_c104.json patterns[5]; evidence: Neighborhood_Map row(s) 10

## CONTRADICTION
A: Grand Lake: decay [Sentiment -0.070, RetailVitality -5.03, HousingPressure +0.500] with no matching active initiative
A REF: output/engine_audit_c104.json patterns[5]; evidence: Neighborhood_Map row(s) 10
B: No active initiative (or mitigator) owns this break on the record
B REF: output/engine_audit_c104.json patterns[5]; evidence: Neighborhood_Map row(s) 10
FRAME: The map says decay; the program roster does not answer it.

## APPROACH
Firebrand approach (sim stink-audit): do NOT open from the official timeline. Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. Write into the contradiction. Name who must answer. End on the unanswered question. Scene color is yours (weather, street, bar), including your own route through one or many bars, so long as it contradicts nothing on this slice. Do not invent a named business or institution that the sim has not supplied. Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.

## CITIZENS (interview / name pool — RoleType immutable)
- Amara Keane (POP-00002) — role: Pianist, Philanthropist; neighborhood: Grand Lake; born: 2010; careerStage: mid-career; wealth: 6; employerBiz: SELF_EMPLOYED; skills: Professional; tier: 3  [stink-handle]
- Funmi Shah (POP-00802) — role: Glazier; neighborhood: KONO; born: 1974; careerStage: retired; wealth: 7; employerBiz: BIZ-00020; skills: Construction & Baylight; tier: 4  [same-hood-signal]
- Sahana Joshi (POP-00808) — role: Elevator Mechanic; neighborhood: KONO; born: 2010; careerStage: mid; wealth: 4; employerBiz: BIZ-00020; skills: Trades; tier: 4  [same-hood-signal]
- Celeste Moon (POP-01061) — role: singer; neighborhood: KONO; born: 1988; wealth: 0; tier: 3  [same-hood-signal]
- Nguyet Mukherjee (POP-00909) — role: Plumber; neighborhood: KONO; born: 2004; careerStage: mid; wealth: 6; employerBiz: UNTRACKED; skills: Trades; tier: 4  [bond-hop from interview pool]
- Hector Campbell (POP-00641) — role: Taxi Driver; neighborhood: Rockridge; born: 1995; careerStage: mid-career; wealth: 5; employerBiz: BIZ-00016; skills: Education; tier: 3  [bond-hop from interview pool]
- Amal Nair (POP-00815) — role: Physical Therapist; neighborhood: KONO; born: 1993; careerStage: mid; wealth: 7; employerBiz: BIZ-00015; skills: Healthcare; tier: 4  [bond-hop from interview pool]

## BONDS (real edges — color social graph, do not invent)
- Vinnie Keane ↔ Amara Keane (family, household, Rockridge)
- Sahana Joshi ↔ Nguyet Mukherjee (friendship, neighbor, KONO)
- Amara Keane ↔ Hector Campbell (friendship, neighbor, Rockridge)
- Amal Nair ↔ Funmi Shah (friendship, neighbor, KONO)

## SCENE COLOR (data you cannot see as pure metrics — write into this room)
WEATHER: Season: Winter | Weather: 48°F rain, SW 18 mph, rain (frontState RAIN), humidity 86, visibility 6
HOOD: Grand Lake
TEXTURE: _(none for hood — quiet week or missing neighborhood_texture file)_
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
- output/cron-compare/stink_c104.json
- output/desk_signal_c104.json
- output/world_summary_c104.md
- output/neighborhood_texture_c104.md
- output/engine_audit_c104.json
- output/engine_audit_c104.json patterns[5]; evidence: Neighborhood_Map row(s) 10
- output/engine_audit_c104.json patterns[5]; evidence: Neighborhood_Map row(s) 10
- output/engine_audit_c104.json patterns[5]; evidence: Neighborhood_Map row(s) 10

_Generated by scripts/buildJaxSlice.js — no LLM. Not a Mags desk-slice._
