// One-off compile for C97. Reads reporter articles, strips emitted headers/bylines,
// emits canonical edition per EDITION_FORMAT_TEMPLATE + lib/editionParser contract.
const fs = require('fs');
const R = '/root/GodWorld';

function body(path) {
  let lines = fs.readFileSync(path, 'utf8').split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^#\s+/.test(lines[i]) && !/^##/.test(lines[i])) i++;      // drop "# headline"
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^\*\*By\s+/.test(lines[i])) i++;                            // drop "**By ...**"
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^-{3,}$/.test(lines[i].trim())) i++;                        // drop leading "---"
  while (i < lines.length && lines[i].trim() === '') i++;
  return lines.slice(i).join('\n').trim();
}

// slot -> {file, reporter byline, headline}
const A = {
  FP1: { f: 'output/reporters/carmen-delaine/articles/c97_FP1.md', by: 'By Carmen Delaine | Bay Tribune Civic Affairs', h: 'Two Came Due at Once: A Festival City Answers Its Own Calls' },
  C1:  { f: 'output/reporters/sgt-rachel-torres/articles/c97_C1.md', by: 'By Sgt. Rachel Torres | Bay Tribune Public Safety', h: 'Citywide Means Citywide: OARI Begins Answering Every District' },
  C2:  { f: 'output/reporters/trevor-shimizu/articles/c97_C2.md', by: 'By Trevor Shimizu | Bay Tribune Transit & Infrastructure', h: 'Ground Breaks in Fruitvale: The Transit Hub Enters Construction' },
  C3:  { f: 'output/reporters/luis-navarro/articles/c97_C3.md', by: 'By Luis Navarro | Bay Tribune Civic Affairs', h: "West Oakland Gets Safer as the Apprenticeship Bill It's Waiting On Heads to a Vote" },
  Q1:  { f: 'output/quick-takes/c97_QT1.md', by: 'By Sgt. Rachel Torres | Bay Tribune Public Safety', h: 'A Modest Uptick Downtown — Watched, Not Feared' },
  Q3:  { f: 'output/quick-takes/c97_QT3.md', by: 'By Dr. Lila Mezran | Bay Tribune Health Desk', h: 'Nearly One in Ten: Fall Illness Holds Steady' },
  N1:  { f: 'output/reporters/kai-marston/articles/c97_CU1.md', by: 'By Kai Marston | Bay Tribune Culture', h: 'First Friday Meets the Day of the Dead: An Art Walk Through a City at Its Warmest' },
  N2:  { f: 'output/reporters/maria-keen/articles/c97_CU2.md', by: 'By Maria Keen | Bay Tribune Culture', h: "The Season the Congregations Carried — and the Shortstop in a Deacon's Robes" },
  N3:  { f: 'output/quick-takes/c97_QT2.md', by: 'By Mason Ortega | Bay Tribune Culture', h: 'Marigolds and Gallery Light: The City Out Walking' },
  B1:  { f: 'output/reporters/jordan-velez/articles/c97_B1.md', by: 'By Jordan Velez | Bay Tribune Business', h: "Paulson Walks the Baylight Site: 'What I See Will Rival What's Across the Bay'" },
  S1:  { f: 'output/reporters/anthony/articles/c97_S1.md', by: 'By Anthony Raines | Bay Tribune Sports', h: "The Crowded Corner: Davis Returns and Paulson's Roster Math Gets Hard" },
  S2:  { f: 'output/reporters/p-slayer/articles/c97_S2.md', by: 'By P Slayer | Bay Tribune Sports', h: "Six Straight and a Debut: The A's Pull Away as Morton Arrives" },
};

function block(slot) {
  const a = A[slot];
  return `### ${a.h}\n\n${a.by}\n\n---\n\n${body(R + '/' + a.f)}\n`;
}

// Editor's Desk (Mags)
const ED_H = 'The City Answered Itself';
const ED = `### ${ED_H}

By Margaret Corliss | Editor-in-Chief

Two things the city had been building for years came due in the same cycle, and the temptation is to lead with them. Resist it. The real story is the one underneath: Oakland at its warmest mood in memory, ten neighborhoods rising on their own, people moving in rather than out, Fruitvale lit corner to corner for Día de los Muertos and a First Friday at once. That is the ground. The news grows out of it.

So read the front page for the festival, and read the two civic landings as what they are — a city that built something finally getting to use it. OARI's crews answer crisis calls in all nine districts now; Torres has how the work gets split with the badge. The Fruitvale Transit Hub broke ground; Shimizu has what the community agreement holds. Navarro asks the harder question in West Oakland — why a neighborhood already getting safer needed a mayoral push to get its apprenticeship bill a vote.

The congregations carried the season. The ballclub kept winning. Read it all.

— M.C.
`;

// Letters — pull the three locked letters from the verified file
function letters() {
  const txt = fs.readFileSync(R + '/output/letters/c97_letters.md', 'utf8');
  const want = {
    'Reggie Soto':   'Re: The Transit Hub Groundbreaking',
    'Eleanor Rivera':'Re: West Oakland and the Apprenticeship Bill',
    'Lena Okafor':   'Re: The Festival City',
  };
  const order = ['Reggie Soto', 'Eleanor Rivera', 'Lena Okafor'];
  const parts = txt.split(/^## /m).slice(1);
  const map = {};
  for (const p of parts) {
    const nl = p.indexOf('\n');
    const name = p.slice(0, nl).trim();
    if (!want[name]) continue;
    const rest = p.slice(nl + 1).trim();
    map[name] = rest; // prose + "-- Name, age, Neighborhood"
  }
  return order.map(n => `### ${want[n]}\n\n${map[n]}\n`).join('\n');
}

const SEC = '-'.repeat(60);
const FR = '='.repeat(60);

const NAMES_INDEX = `POP-00527 | Mike Paulson | General Manager, Oakland A's
POP-00789 | Elias Varek | Founder, Civis Systems; owner, Oakland Oaks
POP-00050 | Ernesto Quintero | Designated Hitter, Oakland A's
POP-00501 | Denise Carter | City Council, District 1
POP-00590 | Reggie Soto | Auto body shop owner, Fruitvale
POP-00617 | Eleanor Rivera | BART Station Manager, West Oakland
POP-00530 | Lena Okafor | Daycare Director, Fruitvale
Avery Santana — Mayor of Oakland
Rafael Montez — Chief, Oakland Police Department
Dr. Vanessa Tran-Muñoz — Director, Oakland Alternative Response Initiative
Elena Soria Dominguez — Planning Lead, Fruitvale Transit Hub Phase II
Janae Rivers — City Council, District 5
Rose Delgado — City Council, District 3
Warren Ashford — City Council, District 7
Nina Chen — City Council, District 8
Ramon Vega — City Council President, District 4
Leonard Tran — City Council, District 2
Terrence Mobley — City Council, District 9
Elliott Crane — City Council, District 6
Isley Kelley — Oakland A's shortstop; guest deacon, Foothill Baptist Tabernacle
Mark Aitken — Oakland A's first baseman
Darrin Davis — Oakland A's left fielder
Desmond Morton — Oakland A's left fielder (major-league debut)
Martin Richards — Oakland A's third baseman
Bryan Franco — Oakland A's shortstop
Vinnie Keane — Oakland A's designated hitter
POP-00756 | Father Ramon Solano | Pastor, St. Esperanza Parish, Fruitvale
POP-00755 | Bishop Antoine Vermeer | Bishop, Cathedral of the Living Word, Lake Merritt
Dr. Ophelia Brenner — Senior Pastor, Foothill Baptist Tabernacle
Enzo Walker — West Oakland tradesman`;

const BUSINESSES = `BIZ-00052 | Civis Systems | Urban systems intelligence | West Oakland
NEW | Civis Systems Field | Ballpark (under construction) | Jack London
NEW | Art Walk Cafe | Cafe / gallery | Uptown
NEW | Dragon Gate | Bar / lounge | Chinatown
NEW | Gallery Night Lounge | Bar / lounge | Uptown
NEW | Blue Lantern | Bar / lounge | Jack London
NEW | Marigold Cafe | Cafe / dining | Fruitvale`;

const TABLE = `| Slot | Section | Reporter | Headline |
|------|---------|----------|----------|
| FP1 | FRONT PAGE | Carmen Delaine | ${A.FP1.h} |
| ED | EDITOR'S DESK | Margaret Corliss | ${ED_H} |
| C1 | CIVIC | Sgt. Rachel Torres | ${A.C1.h} |
| C2 | CIVIC | Trevor Shimizu | ${A.C2.h} |
| C3 | CIVIC | Luis Navarro | ${A.C3.h} |
| Q1 | CIVIC | Sgt. Rachel Torres | ${A.Q1.h} |
| Q3 | CIVIC | Dr. Lila Mezran | ${A.Q3.h} |
| N1 | CULTURE | Kai Marston | ${A.N1.h} |
| N2 | CULTURE | Maria Keen | ${A.N2.h} |
| N3 | CULTURE | Mason Ortega | ${A.N3.h} |
| B1 | BUSINESS | Jordan Velez | ${A.B1.h} |
| S1 | SPORTS | Anthony Raines | ${A.S1.h} |
| S2 | SPORTS | P Slayer | ${A.S2.h} |
| L1 | LETTERS | Reggie Soto | Re: The Transit Hub Groundbreaking |
| L2 | LETTERS | Eleanor Rivera | Re: West Oakland and the Apprenticeship Bill |
| L3 | LETTERS | Lena Okafor | Re: The Festival City |`;

const USAGE = `CIVIC / GOVERNMENT
- Avery Santana (Mayor) — took OARI citywide; directed the youth apprenticeship bill to a floor vote (FP1, C1, C3)
- Rafael Montez (OPD Chief) — set the OPD/OARI division of labor; named the downtown uptick plainly (C1, Q1)
- Dr. Vanessa Tran-Muñoz (OARI Director) — reported the first citywide cycle + public-reporting standard (C1)
- Elena Soria Dominguez (Transit Hub Planning Lead) — reported the build entering construction (C2)
- Denise Carter (POP-00501, D1) — spoke for a safer West Oakland and the apprenticeship work (C3)
- Janae Rivers (D5) — carried the apprenticeship bill to the floor for OPP (C3)
- Rose Delgado (D3) — held the CBA terms firm at the groundbreaking (C2)
- Ramon Vega (D4, President), Leonard Tran (D2), Warren Ashford (D7), Nina Chen (D8) — recorded on the OARI rollout and reporting standard (C1)

SPORTS
- Ernesto Quintero (POP-00050) — MLB home run leader; the corner-roster knot (S1, S2)
- Isley Kelley — A's shortstop, MLB average leader; guest deacon at Foothill Baptist (CU2, S1, S2)
- Mark Aitken, Darrin Davis, Martin Richards, Bryan Franco, Desmond Morton, Vinnie Keane — A's roster, the crowded corner + the sweeps + Morton's debut (S1, S2)
- Mike Paulson (POP-00527) — A's GM; toured the Baylight site (B1, S1)

BUSINESS / OWNERSHIP
- Elias Varek (POP-00789) — founder of Civis Systems, anchoring the Baylight District (B1)

CULTURE
- An unnamed Fruitvale altar-keeper anchors the front page as anonymous vox-pop — no canon citizen created (FP1)
- Father Ramon Solano (St. Esperanza), Bishop Antoine Vermeer (Cathedral of the Living Word), Dr. Ophelia Brenner (Foothill Baptist) — the congregations carrying the season; all confirmed canon faith leaders at their own institutions (CU2)

LETTERS WRITERS
- Reggie Soto (POP-00590, 47, Fruitvale, auto body shop owner) — L1 on the Transit Hub groundbreaking + local hire
- Eleanor Rivera (POP-00617, 45, West Oakland, BART station manager) — L2 on a safer West Oakland + the apprenticeship bill
- Lena Okafor (POP-00530, 39, Fruitvale, daycare director) — L3 on the festival city at its warmest

(NEW CANON THIS CYCLE)
- Enzo Walker — citizen, West Oakland tradesman, promoted journeyman (POP-pending)
- Civis Systems Field — ballpark under construction, Jack London / Baylight District (BIZ-pending)`;

const STORYLINES = `- **The Festival City (FP1 — NEW SPINE)** — Oakland at its warmest mood in cycles; ten neighborhoods rising, migration accelerating, Fruitvale leading.
- **OARI Goes Live Citywide (C1 — RECURRING)** — INIT-002 moved from pilot evaluation to citywide dispatch across all nine districts; public-reporting standard attached; Vega's reservation lifted.
- **Fruitvale Transit Hub (C2 — RECURRING)** — INIT-003 broke ground; CBA (local hire, Mam-language access, apprenticeships) binding before permit; regional submission pending.
- **The Apprenticeship Bill (C3 — RECURRING)** — INIT-007 headed to a floor vote after four cycles stalled; West Oakland safer in parallel.
- **Baylight District (B1 — RECURRING)** — $2.1B development advancing; stadium foundation set, Civis Systems anchoring; new ballpark opens next season.
- **The Crowded Corner (S1 — NEW)** — the A's 46-12 success jammed the corner positions; Davis to DH, Quintero breakout, Richards/Aitken/Kelley free agents.
- **The Dream Season (S2 — RECURRING)** — six straight wins, sweeps of the Phillies and Royals, Morton's debut; Quintero/Kelley MVP race.`;

const COMING = `- **OARI's first citywide numbers** — whether the six-minute response and rare escalations hold under full-city volume next cycle.
- **The apprenticeship floor vote** — how the council votes once Rivers brings INIT-007 to the floor.
- **The trade deadline** — how Paulson resolves the corner jam with the deadline roughly six weeks out.`;

const out = [
`${FR}
THE CYCLE PULSE — EDITION 97
Bay Tribune | Cycle 97 | Y2C45 | Fall
Weather: Clear and mild, the galleries open | City Mood: The warmest in cycles — festive and reflective
${FR}`,
`${SEC}\nFRONT PAGE\n${SEC}\n\n${block('FP1')}`,
`${SEC}\nEDITOR'S DESK\n${SEC}\n\n${ED}`,
`${SEC}\nCIVIC\n${SEC}\n\n${block('C1')}\n${block('C2')}\n${block('C3')}\n${block('Q1')}\n${block('Q3')}`,
`${SEC}\nCULTURE\n${SEC}\n\n${block('N1')}\n${block('N2')}\n${block('N3')}`,
`${SEC}\nBUSINESS\n${SEC}\n\n${block('B1')}`,
`${SEC}\nSPORTS\n${SEC}\n\n${block('S1')}\n${block('S2')}`,
`${SEC}\nLETTERS\n${SEC}\n\n${letters()}`,
`${SEC}\nNAMES INDEX\n${SEC}\n\n${NAMES_INDEX}`,
`${SEC}\nBUSINESSES NAMED\n${SEC}\n\n${BUSINESSES}`,
`${SEC}\nARTICLE TABLE\n${SEC}\n\n${TABLE}`,
`${SEC}\nCITIZEN USAGE LOG\n${SEC}\n\n${USAGE}`,
`${SEC}\nSTORYLINES UPDATED\n${SEC}\n\n${STORYLINES}`,
`${SEC}\nCOMING NEXT EDITION\n${SEC}\n\n${COMING}`,
`${SEC}\nEND EDITION\n${SEC}`,
].join('\n\n');

fs.writeFileSync(R + '/editions/cycle_pulse_edition_97.txt', out + '\n');
console.log('wrote editions/cycle_pulse_edition_97.txt', out.length, 'chars');
