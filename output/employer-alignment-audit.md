# Employer alignment — judged list (2026-10-01, research-build)

Method: every linked citizen grouped by employer and job title, judged by hand on the grouped view; the Haiku pass that preceded this flagged 2 of 585 and was discarded. Targets prefer a fitting tracked business in the citizen's own hood, then SELF_EMPLOYED/UNTRACKED per `data/employer_mapping.json`.

Mechanism: `classifyMintSector_` (phase05-citizens/processAdvancementIntake.js:1435) buckets a role into four coarse groups and hashes the mint into any business in that bucket with headcount room — a Plumber lands at the Police Department. Structural fix = engine.278; this list is the one-time restore target.

| Metric | Count |
|---|---|
| Citizens | 963 |
| Linked (tracked employer) | 585 |
| Moved by hand this session (departments + four relinks) | 10 |
| MISMATCH | 60 |
| NOTE | 5 |

| POPID | Name | T | Role | Hood | Employer | Verdict | Suggested | Reason |
|---|---|---|---|---|---|---|---|---|
| POP-00230 | Jett Walker | 4 | Plumber | Rockridge | BIZ-00001 Anthropic | MISMATCH | BIZ-00090 Calderon-Nishi (no hood match) | trade at a non-construction employer |
| POP-00866 | Yadira Rao | 4 | Plumber | Chinatown | BIZ-00001 Anthropic | MISMATCH | BIZ-00058 Mariner Construction (no hood match) | trade at a non-construction employer |
| POP-00732 | Deon Whitfield | 4 | Community Organizer | West Oakland | BIZ-00009 Oakmesh Systems | MISMATCH | BIZ-00028 West Oakland Community Center | West Oakland Community Center |
| POP-00275 | Elijah Roberts | 4 | Construction laborer | West Oakland | BIZ-00009 Oakmesh Systems | MISMATCH | BIZ-00060 Northgate Construction | trade at a non-construction employer |
| POP-00926 | Briar Soto | 4 | Electrician | Jack London | BIZ-00009 Oakmesh Systems | MISMATCH | BIZ-00057 Anchor Build | trade at a non-construction employer |
| POP-00648 | Mart Johns | 3 | Nurse Aide | Adams Point | BIZ-00009 Oakmesh Systems | MISMATCH | BIZ-00015 Oakland Hospital | care role at a non-healthcare employer — Oakland Hospital |
| POP-00291 | Enzo Walker | 4 | Plumber | Lake Merritt | BIZ-00009 Oakmesh Systems | MISMATCH | BIZ-00056 Coastline Construction (no hood match) | trade at a non-construction employer |
| POP-00634 | Dame Reed | 4 | Artist/Muralist | Jack London | BIZ-00012 Port of Oakland | MISMATCH | SELF_EMPLOYED  | creative — self-employed per mapping |
| POP-00643 | Guadalupe Lupe | 3 | Bartender | Jack London | BIZ-00012 Port of Oakland | MISMATCH | BIZ-00041 Green & Gold Tavern | bar role at a non-bar employer |
| POP-00205 | Travis Golin | 4 | Construction laborer | Jack London | BIZ-00012 Port of Oakland | MISMATCH | BIZ-00057 Anchor Build | trade at a non-construction employer |
| POP-00252 | Hector Leech | 4 | Dishwasher | Jack London | BIZ-00012 Port of Oakland | MISMATCH | BIZ-00041 Green & Gold Tavern | kitchen role at a non-dining employer |
| POP-00908 | Cristina Norwood | 4 | Electrician | Rockridge | BIZ-00012 Port of Oakland | MISMATCH | BIZ-00090 Calderon-Nishi (no hood match) | trade at a non-construction employer |
| POP-00273 | Trenton Nawan | 3 | Server | Jack London | BIZ-00012 Port of Oakland | MISMATCH | BIZ-00041 Green & Gold Tavern | kitchen role at a non-dining employer |
| POP-00250 | Ty Yule | 4 | Taxi driver | Jack London | BIZ-00012 Port of Oakland | MISMATCH | SELF_EMPLOYED  | driver — self-employed per mapping |
| POP-00265 | Matty Lipo | 4 | Dishwasher | Lake Merritt | BIZ-00017 City of Oakland | MISMATCH | BIZ-00043 OakHouse (no hood match) | kitchen role at a non-dining employer |
| POP-00647 | Ronald Silk | 4 | Electrician | Chinatown | BIZ-00017 City of Oakland | MISMATCH | BIZ-00090 Calderon-Nishi (no hood match) | trade at a non-construction employer |
| POP-00635 | Mei Chen | 3 | Gallery Owner/Curator | Chinatown | BIZ-00017 City of Oakland | MISMATCH | SELF_EMPLOYED  | owner — self-employed per mapping |
| POP-00646 | Tiro Worso | 4 | Mover | Piedmont Ave | BIZ-00017 City of Oakland | MISMATCH | BIZ-00181 Mayday Movers | Mayday Movers (Services) |
| POP-00640 | Bryce Lee | 4 | Retail worker | Temescal | BIZ-00017 City of Oakland | MISMATCH | BIZ-00129 Eastside Family Market (no hood match) | retail role at a non-retail employer |
| POP-00723 | Ronald Wough | 4 | Taxi Driver | Downtown | BIZ-00017 City of Oakland | MISMATCH | SELF_EMPLOYED  | driver — self-employed per mapping |
| POP-00716 | Omarion Farah | 4 | Cab Driver | Chinatown | BIZ-00019 EBMUD | MISMATCH | SELF_EMPLOYED  | driver — self-employed per mapping |
| POP-00794 | Irene Fay | 3 | Barista | West Oakland | BIZ-00020 Baylight Construction Authority | MISMATCH | BIZ-00130 Sunrise Cafe (no hood match) | cafe role at a non-cafe employer |
| POP-00200 | Evan Lewis | 4 | Bus driver | Laurel | BIZ-00020 Baylight Construction Authority | MISMATCH | BIZ-00013 AC Transit | AC Transit |
| POP-00256 | Brady Lopez | 4 | Dishwasher | Piedmont Ave | BIZ-00020 Baylight Construction Authority | MISMATCH | BIZ-00064 Art Walk Cafe (no hood match) | kitchen role at a non-dining employer |
| POP-00520 | Derwin Train | 3 | Grocery Store Owner | Chinatown | BIZ-00020 Baylight Construction Authority | MISMATCH | SELF_EMPLOYED  | owner — self-employed per mapping |
| POP-00706 | Rosa Ochoa | 3 | Library Worker | Laurel | BIZ-00020 Baylight Construction Authority | MISMATCH | BIZ-00021 Oakland Public Library System | Oakland Public Library System |
| POP-00223 | Rafael Brannie | 4 | Mover | Piedmont Ave | BIZ-00020 Baylight Construction Authority | MISMATCH | BIZ-00181 Mayday Movers | Mayday Movers (Services) |
| POP-00199 | Mateo Allen | 4 | Nurse aide | Laurel | BIZ-00020 Baylight Construction Authority | MISMATCH | BIZ-00015 Oakland Hospital | care role at a non-healthcare employer — Oakland Hospital |
| POP-00296 | Den Blue | 4 | Nurse aide | Piedmont Ave | BIZ-00020 Baylight Construction Authority | MISMATCH | BIZ-00015 Oakland Hospital | care role at a non-healthcare employer — Oakland Hospital |
| POP-00202 | Marky Beal | 4 | Retail worker | West Oakland | BIZ-00020 Baylight Construction Authority | MISMATCH | BIZ-00070 Vance's Vintage | retail role at a non-retail employer |
| POP-00204 | Orlando Phillips | 4 | Retail worker | Laurel | BIZ-00020 Baylight Construction Authority | MISMATCH | BIZ-00160 Laurel Market | retail role at a non-retail employer |
| POP-00232 | Jori Clame | 4 | Server | Laurel | BIZ-00020 Baylight Construction Authority | MISMATCH | BIZ-00161 Schoolgate Cafe | kitchen role at a non-dining employer |
| POP-00225 | Andre Turner | 3 | Line cook | Downtown | BIZ-00022 Alameda County Courts | MISMATCH | BIZ-00047 Miso Metro | kitchen role at a non-dining employer |
| POP-00957 | David Okonkwo | 4 | Retired Insurance Adjuster | Lake Merritt | BIZ-00022 Alameda County Courts | MISMATCH | UNTRACKED  | retired — no employer |
| POP-00786 | Colin Phillips | 4 | Bakery Worker | Laurel | BIZ-00025 Kaiser Permanente Oakland | MISMATCH | BIZ-00077 Nino's | bakery — a food employer in hood |
| POP-00294 | Miguel Joson | 4 | Plumber | Chinatown | BIZ-00026 Fruitvale Community Clinic | MISMATCH | BIZ-00059 Foothill Builders (no hood match) | trade at a non-construction employer |
| POP-00207 | Owen Tower | 4 | Taxi driver | Fruitvale | BIZ-00026 Fruitvale Community Clinic | MISMATCH | SELF_EMPLOYED  | driver — self-employed per mapping |
| POP-00748 | Vince Okoye | 4 | Software engineer | Lake Merritt | BIZ-00027 Oakland Parks & Recreation | MISMATCH | BIZ-00030 Oakland Tech Collective | Oakland Tech Collective |
| POP-00722 | Daniel Cloak | 3 | Bakery Worker | West Oakland | BIZ-00028 West Oakland Community Center | MISMATCH | BIZ-00076 Port Grind (no hood match) | bakery — a food employer in hood |
| POP-00521 | Jude Hess | 3 | Electrician | West Oakland | BIZ-00028 West Oakland Community Center | MISMATCH | BIZ-00060 Northgate Construction | trade at a non-construction employer |
| POP-00576 | Beth Hayes | 3 | Landscaper | West Oakland | BIZ-00028 West Oakland Community Center | MISMATCH | BIZ-00027 Oakland Parks & Recreation | Oakland Parks & Recreation |
| POP-00517 | Shai Diaz | 3 | Mover | Fruitvale | BIZ-00028 West Oakland Community Center | MISMATCH | BIZ-00181 Mayday Movers | Mayday Movers (Services) |
| POP-01003 | Jabari Jack | 4 | Nurse Aide | Uptown | BIZ-00028 West Oakland Community Center | MISMATCH | BIZ-00015 Oakland Hospital | care role at a non-healthcare employer — Oakland Hospital |
| POP-00727 | Gloria Hutchins | 4 | Retired School Bus Driver | West Oakland | BIZ-00028 West Oakland Community Center | MISMATCH | UNTRACKED  | retired — no employer |
| POP-01033 | Cedric Nakamura | 4 | Retail clerk | Uptown | BIZ-00029 Coliseum District Development | MISMATCH | BIZ-00179 Night Walk Records | retail role at a non-retail employer |
| POP-00542 | Nina Rines | 4 | Actress | Lake Merritt | BIZ-00030 Oakland Tech Collective | MISMATCH | BIZ-00101 Oakland Entertainment Talent Ageny | Oakland Entertainment Talent Agency |
| POP-00212 | Jessie Hess | 3 | Barista | Downtown | BIZ-00030 Oakland Tech Collective | MISMATCH | BIZ-00176 Park Boulevard Cafe (no hood match) | cafe role at a non-cafe employer |
| POP-00240 | Daley Hill | 4 | Painter | Downtown | BIZ-00030 Oakland Tech Collective | MISMATCH | SELF_EMPLOYED  | creative — self-employed per mapping |
| POP-00293 | Malot Bielo | 4 | Warehouse worker | Lake Merritt | BIZ-00030 Oakland Tech Collective | MISMATCH | BIZ-00012 Port of Oakland | Port of Oakland |
| POP-00519 | Wei Thomas | 3 | Acupuncturist | Chinatown | BIZ-00034 Oakland Housing Authority | MISMATCH | SELF_EMPLOYED  | practitioner — self-employed |
| POP-00214 | Jacquez Tearn | 4 | Dishwasher | Chinatown | BIZ-00034 Oakland Housing Authority | MISMATCH | BIZ-00123 Heritage Bakehouse | kitchen role at a non-dining employer |
| POP-00650 | Mesi Westin | 3 | Dishwasher | Jack London | BIZ-00034 Oakland Housing Authority | MISMATCH | BIZ-00050 Dockhouse BBQ | kitchen role at a non-dining employer |
| POP-00632 | Rico Valez | 4 | Musician | Fruitvale | BIZ-00034 Oakland Housing Authority | MISMATCH | SELF_EMPLOYED  | creative — self-employed per mapping |
| POP-00735 | Carla Edmonds | 4 | retired teacher | West Oakland | BIZ-00034 Oakland Housing Authority | MISMATCH | UNTRACKED  | retired — no employer |
| POP-01010 | Minh Raimon | 4 | Carpenter Apprentice | Brooklyn | BIZ-00048 West Side Cafe | MISMATCH | BIZ-00058 Mariner Construction (no hood match) | trade at a non-construction employer |
| POP-00851 | Maeve Pillai | 4 | Plumber | Chinatown | BIZ-00052 Civis Systems | MISMATCH | BIZ-00058 Mariner Construction (no hood match) | trade at a non-construction employer |
| POP-01063 | Alma Vasquez | 3 | sculptor | Laurel | BIZ-00054 Pacific Standard Architecture | MISMATCH | SELF_EMPLOYED  | creative — self-employed per mapping |
| POP-01061 | Celeste Moon | 3 | singer | KONO | BIZ-00089 Atlas Bay Architects | MISMATCH | SELF_EMPLOYED  | creative — self-employed per mapping |
| POP-01017 | Valentina Campbell | 4 | Server | Jack London | BIZ-00093 Telegraph Presbyterian Fellowship | MISMATCH | BIZ-00041 Green & Gold Tavern | kitchen role at a non-dining employer |
| POP-00168 | Ariana Lee | 4 | Biotech Lab Assistant | Piedmont Ave | BIZ-00097 Temescal Community Health Center | MISMATCH | BIZ-00010 Portside Bio | Portside Bio |
| POP-00201 | Elio Perez | 1 | Server | Rockridge | BIZ-00020 Baylight Construction Authority | NOTE | BIZ-00169 Claremont Table | kitchen role at a non-dining employer — Tier 1, builder call |
| POP-00540 | Jade Orion | 2 | Musician | Lake Merritt | BIZ-00027 Oakland Parks & Recreation | NOTE | SELF_EMPLOYED  | creative — self-employed per mapping — Tier 2, builder call |
| POP-00288 | Marcus Wright | 2 | Server | West Oakland | BIZ-00030 Oakland Tech Collective | NOTE | BIZ-00048 West Side Cafe | kitchen role at a non-dining employer — Tier 2, builder call |
| POP-01056 | Theo Banks | 2 | rapper | Uptown | BIZ-00053 Ridgeline Studio | NOTE | SELF_EMPLOYED  | creative — self-employed per mapping — Tier 2, builder call |
| POP-00037 | Brenda Okoro | 2 | Deputy Mayor (Community Affairs) | Rockridge | BIZ-00095 Oakland Alternative Response Initiative | NOTE | BIZ-00017 City of Oakland | City of Oakland (NOTE: deputy mayor at OARI) — Tier 2, builder call |
