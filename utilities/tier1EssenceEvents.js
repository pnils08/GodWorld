/**
 * tier1EssenceEvents.js — authored canon → LifeHistory events for Tier-1 essence backfill.
 * (research-build, S265. Seam-A of the citizen-loop closure — see
 *  docs/plans/2026-06-21-tier1-dial-essence-backfill.md.)
 *
 * WHY: 13 of 21 Tier-1 citizens read neutral ("Drifter", all dials 50) because their
 * authored canon was never logged as LifeHistory. The dial seed (backdateCitizenDials.js)
 * is a pure function of LifeHistory_Archive — given no history it correctly produces a
 * neutral citizen. Their essence was authored in the voice files' "source-of-truth for
 * your ledger dials" disposition blocks (research.16 Phase 3) but never written into history.
 *
 * THE MECHANISM (engine.31-invariant-preserving): we do NOT special-case Tier-1 in the dial
 * math. We supply the canon history that should always have existed — each citizen's biography
 * as the LifeHistory_Archive rows that, replayed through the SAME tag→dial map every citizen
 * runs, produce their authored essence. Dials stay a pure function of history; we complete it.
 *
 * Each event is a real, permanent canon biography fact tagged so citizenDialMap.nudgesForEvent_
 * resolves it onto the intended dials. EventText reads as true history (it IS true history) and
 * becomes cold-store archive — it shapes dials, NOT the live LifeHistory column (the wake's
 * recent-journal material stays the engine's live events, now colored by the seeded temperament).
 *
 * `target` = the disposition band each dial should land in (from the voice file), for the
 * dry-run harness (scripts/seedTier1Essence.js) to assert against. Bands: lo | neutral | high | vhigh.
 * Pure data, ES5-safe (Node + Apps Script). No writes here.
 */

// POC subset: the 4 voiced faces (research.16). Canon-rich subset extends from here.
var TIER1_ESSENCE = {

  // ---- POP-00001 Vinnie Keane — Five Goods: HEART (the dynasty's heartbeat) ----
  'POP-00001': {
    name: 'Vinnie Keane',
    pillar: 'Heart',
    target: { warmth: 'high', composure: 'high', drive: 'high', integrity: 'high',
              family: 'high', openness: 'high', sociability: 'moderate', outabout: 'neutral' },
    events: [
      { tag: 'Wedding',    text: 'Married Amara Olsen, a pianist, in a quiet ceremony — the life that isn’t baseball.' },
      { tag: 'Mentorship', text: 'Founded the Vinnie Keane West Oakland Baseball Academy in a rehabbed firehouse on Mandela Parkway — free baseball for every kid.' },
      { tag: 'Mentorship', text: 'Coaches the academy kids himself; a coach once found him as an ordinary kid, and he is paying it forward.' },
      { tag: 'Promotion',  text: 'Hit the home run that won the 2031 World Series — nobody in the Coliseum sat down for nine minutes.' },
      { tag: 'Career',     text: '436 career home runs across a dynasty career with the Oakland A’s.' },
      { tag: 'Career',     text: 'Six World Series rings; entered his farewell 2041 season in a bench role.' },
      { tag: 'Reputation', text: 'Came up an underdog — scouts called the swing too ordinary; he kept the receipts and turned it into payback with interest.' },
      { tag: 'Reputation', text: 'Leads by repetition, not speeches — shows up the same way every day, deflects credit to teammates by name.' },
      { tag: 'Reputation', text: 'Useful over adored — plain truth, no spin; weight keeps you honest.' },
      { tag: 'Daily',      text: 'A quiet life off the field with Amara between road trips — the part no box score measures.' },
      { tag: 'Background',  text: 'Stood in the loudest moments in franchise history and felt the air go still.' },
      { tag: 'Personal',   text: 'The joy is in the swing — the half-second the ball leaves the world.' },
      { tag: 'Cultural',   text: 'Lives around music and art off the field; Amara composed “The Seventh Inning Sky”.' }
    ]
  },

  // ---- POP-00018 Benji Dillon — Five Goods: CALM (the still center; Science/Tech) ----
  'POP-00018': {
    name: 'Benji Dillon',
    pillar: 'Calm',
    target: { composure: 'vhigh', openness: 'high', drive: 'high', integrity: 'high',
              family: 'high', warmth: 'moderate', sociability: 'moderate', outabout: 'neutral' },
    events: [
      { tag: 'Stabilized', text: 'Channels grief and pressure into quiet precision — the still point. “Zen Ben.”' },
      { tag: 'Stabilized', text: 'Surfs to find stillness, the way his father taught him; met loss with calm, not rage.' },
      { tag: 'Recovery',   text: 'After his father Rick was killed in a surfing accident, he didn’t rage — he surfed, and found his center.' },
      { tag: 'Stabilized', text: 'Pitches like he is meditating; even-keeled, the still center of the clubhouse.' },
      { tag: 'Background',  text: 'Command over power — deconstructs lineups batter by batter, like a chemist breaking down molecules.' },
      { tag: 'Education',  text: 'Studied marine biology at UC San Diego — physics and the ocean, the invisible patterns under things.' },
      { tag: 'Education-Cultural', text: 'Reads the city’s systems the way he reads a hitter — the patterns beneath the surface.' },
      { tag: 'Promotion',  text: 'Five Cy Young Awards; two hundred wins — “The Golden Arm.”' },
      { tag: 'Reputation', text: 'Went undrafted — scouts said the fastball lacked flash; eight shutout innings in one unpaid start brought him straight to Oakland.' },
      { tag: 'Reputation', text: 'No spin, no flash — just the honest pitch in the honest spot.' },
      { tag: 'Reputation', text: 'Soft-spoken; doesn’t chase the spotlight while others preen.' },
      { tag: 'Wedding',    text: 'Married Maya Torres barefoot on the beach where his father caught his last surf.' },
      { tag: 'Birth',      text: 'Son Rick Dillon Jr., named for his father.' },
      { tag: 'Personal',   text: 'Drawn to the invisible patterns — a scientist’s curiosity for how things really work.' }
    ]
  },

  // ---- POP-00528 Deacon Seymour — first-year A's manager (reference voice; already Entries:6) ----
  // NOTE: Deacon already carries 6 archived entries. The LIVE replay seeds from existing+essence;
  // this dry-run models essence-only, so his live result lands HIGHER than the harness shows.
  'POP-00528': {
    name: 'Deacon Seymour',
    pillar: null,
    target: { composure: 'high', drive: 'high', openness: 'high', integrity: 'high',
              warmth: 'moderate', sociability: 'moderate', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Background',  text: 'Doesn’t get loud, doesn’t chase — rookies talk for twenty minutes; he asks the one right question.' },
      { tag: 'Stabilized', text: 'Maintained public composure through the dynasty’s twilight and the rookie integration.' },
      { tag: 'Daily',      text: 'A quiet watcher — comfortable in a clubhouse, not at a podium.' },
      { tag: 'Career',     text: 'First-year manager of the Oakland A’s, navigating the dynasty’s last lap.' },
      { tag: 'Career',     text: 'Liked the invisible jobs — relentless about the work, indifferent to the credit.' },
      { tag: 'Mentorship', text: 'Players seek him out because he listens; veterans trust him, rookies improve around him.' },
      { tag: 'Education',  text: 'Studies behavior, not trends — would rather learn than be proven right.' },
      { tag: 'Education-Cultural', text: 'Reads people closely — a watcher’s curiosity, not a holder-of-court.' },
      { tag: 'Reputation', text: 'Doesn’t trade in spin; a short, precise, honest report is his signature.' },
      { tag: 'Reputation', text: 'Quiet authority — relentless about the work, indifferent to the credit.' },
      { tag: 'Reputation', text: 'Comfortable in a clubhouse — the players come to him; trusted, never a holder-of-court.' }
    ]
  },

  // ---- POP-00789 Elias Varek — founder of Civis Systems / Oaks owner (blank-slate, NOT a pillar) ----
  'POP-00789': {
    name: 'Elias Varek',
    pillar: null,
    target: { drive: 'vhigh', sociability: 'high', openness: 'high', composure: 'high',
              integrity: 'neutral', warmth: 'neutral', outabout: 'high', family: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Founded Civis Systems, an urban-intelligence firm — building from nothing on a deadline.' },
      { tag: 'Promotion',  text: 'Won the Oakland Oaks NBA expansion franchise; building the city’s next chapter on a clock.' },
      { tag: 'Career',     text: 'Sets urgent clocks and moves toward them — building a franchise from nothing is the natural state.' },
      { tag: 'Career',     text: 'A relentless builder; the deadline is the natural state.' },
      { tag: 'Civic Role', text: 'The public face — courts, convenes, and brings people to the table.' },
      { tag: 'Civic Role', text: 'Courting Paulson to run the Oaks; convening the city and the district.' },
      { tag: 'Public',     text: 'Reads the whole board — the second- and third-order effects others miss.' },
      { tag: 'Education-Cultural', text: 'Sees connections others miss; reads the city as a system.' },
      { tag: 'Reputation', text: 'Means what he says, but is always also selling the future — a builder with a vision.' },
      { tag: 'Community',  text: 'Warm when it builds the thing — a connector, not a glad-hander; the relationship serves the structure.' },
      { tag: 'Cultural',   text: 'Out in the city, courting and convening — the public face on a clock.' },
      { tag: 'Cultural',   text: 'Always at the table where the district’s next chapter gets decided.' },
      { tag: 'Stabilized', text: 'A dealmaker’s steadiness — doesn’t flinch at scale or timeline.' }
    ]
  },

  // ============================================================================
  // Tier-2 — the remaining A's (essence from 2041 dynasty coverage + voice-file
  // cross-references). docs/media/2041_athletics_roster.md. Drive is the dominant
  // dial for the athletes; integrity rides Reputation (couples sociability — see the
  // map-coupling finding in the plan; "silent/unsung" archetypes can't read low-social).
  // ============================================================================

  // ---- POP-00003 Mark Aitken — 1B, player rep + community liaison, "sees angles" ----
  'POP-00003': {
    name: 'Mark Aitken', pillar: null,
    target: { drive: 'high', sociability: 'high', openness: 'high', integrity: 'high',
              composure: 'moderate', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Promotion',  text: 'Won the 2040 Home Run Derby.' },
      { tag: 'Career',     text: 'First baseman — the steady bat in the dynasty’s lineup, playing a contract year on his merits.' },
      { tag: 'Civic Role', text: 'Players’ union representative and community liaison — the bridge between the clubhouse and the city.' },
      { tag: 'Civic Role', text: 'Often at civic events; carries the team’s voice into Oakland.' },
      { tag: 'Education-Cultural', text: 'Sees angles others don’t think in — reads the game three moves ahead.' },
      { tag: 'Lifestyle',  text: 'A student of the game’s angles, on and off the field.' },
      { tag: 'Reputation', text: 'Son of a former mayor; carries the name with a straight back.' },
      { tag: 'Reputation', text: 'Honest, cerebral, dependable — leads by understanding the whole board.' },
      { tag: 'Background', text: 'A measured presence in the clubhouse.' }
    ]
  },

  // ---- POP-00019 Isley Kelley — SS, "The Machine", 3x MVP, inner-circle HOF ----
  'POP-00019': {
    name: 'Isley Kelley', pillar: null,
    target: { drive: 'vhigh', composure: 'high', integrity: 'high', openness: 'high',
              sociability: 'moderate', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Promotion',  text: 'Three-time MVP (2032, 2034, 2035) — “The Machine.”' },
      { tag: 'Promotion',  text: 'Rookie of the Year, ten-time All-Star, eight Silver Sluggers, a batting title; inner-circle Hall of Fame.' },
      { tag: 'Career',     text: '92.1 career WAR — the everyday machine, never a day off at shortstop.' },
      { tag: 'Career',     text: 'The standard the clubhouse measures itself against.' },
      { tag: 'Education-Cultural', text: 'Reads a ball like he lived in the dirt — instinct honed past thought.' },
      { tag: 'Lifestyle',  text: 'A student of the game’s geometry — sees the angles in everything.' },
      { tag: 'Background', text: 'Machine-steady; the same flawless glove every night.' },
      { tag: 'Stabilized', text: 'Unshowy excellence — lets the numbers speak, season after season.' },
      { tag: 'Reputation', text: 'Plays it straight; the work is the statement.' },
      { tag: 'Reputation', text: 'Quiet authority — never asks for credit.' }
    ]
  },

  // ---- POP-00021 Darrin Davis — LF, "The Ohio Outlaw", .186→MVP comeback, gave up his spot ----
  'POP-00021': {
    name: 'Darrin Davis', pillar: null,
    target: { drive: 'high', composure: 'high', warmth: 'high', integrity: 'high',
              openness: 'neutral', sociability: 'moderate', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Promotion',  text: '2040 MVP (.293/38/107) — after hitting .186 in 2039. The redemption season.' },
      { tag: 'Recovery',   text: 'Collapsed to .186 in 2039 and clawed all the way back to MVP — didn’t break.' },
      { tag: 'Stabilized', text: 'Found his center after the worst year of his career.' },
      { tag: 'Mentorship', text: 'Moved off his natural position to left field to make room for 24-year-old Quintero — sacrificed his body and his spot for the next generation.' },
      { tag: 'Mentorship', text: 'The veteran who gives way for the kid.' },
      { tag: 'Career',     text: '“The Ohio Outlaw” — brings the fire every night.' },
      { tag: 'Reputation', text: 'Honest about the slump, honest about the comeback.' },
      { tag: 'Reputation', text: 'Plays with intensity and gives it away for the team.' }
    ]
  },

  // ---- POP-00022 Danny Horn — CF, best player in baseball, franchise pillar ----
  'POP-00022': {
    name: 'Danny Horn', pillar: null,
    target: { drive: 'vhigh', composure: 'high', integrity: 'high', sociability: 'moderate',
              openness: 'neutral', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Promotion',  text: 'The best player in baseball — 99 overall, 8.0 WAR.' },
      { tag: 'Promotion',  text: 'Three-time All-Star, Silver Slugger — perfect in center field.' },
      { tag: 'Career',     text: 'Franchise pillar; the everyday centerpiece of the lineup.' },
      { tag: 'Career',     text: 'Perfect fielding — the standard in center.' },
      { tag: 'Career',     text: 'Carries the franchise without noise.' },
      { tag: 'Background', text: 'Quietly dominant — lets the game come to him.' },
      { tag: 'Stabilized', text: 'Unshakable at the center of the order and the outfield.' },
      { tag: 'Reputation', text: 'The pillar — steady, honest, dependable.' },
      { tag: 'Reputation', text: 'Greatness without the noise.' }
    ]
  },

  // ---- POP-00024 Henry Rivas — SP, "silent workhorse", Puerto Rico ----
  'POP-00024': {
    name: 'Henry Rivas', pillar: null,
    target: { drive: 'high', composure: 'high', integrity: 'high', sociability: 'moderate',
              openness: 'neutral', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Silent workhorse — first-round, 2029, out of Puerto Rico.' },
      { tag: 'Career',     text: 'Logs his innings without a word; the rotation’s quiet anchor.' },
      { tag: 'Career',     text: '14-12, 3.70, 169 strikeouts — the work, every fifth day.' },
      { tag: 'Background', text: 'Says little; lets the work speak.' },
      { tag: 'Stabilized', text: 'Unflappable on the mound — the same temperament every start.' },
      { tag: 'Stabilized', text: 'The steady hand in the rotation.' },
      { tag: 'Reputation', text: 'No spin, no flash — the honest workhorse.' },
      { tag: 'Reputation', text: 'Earns it inning by inning.' }
    ]
  },

  // ---- POP-00031 Martin Richards — 3B, "unsung hero", 1.000 FLD, no coverage ----
  'POP-00031': {
    name: 'Martin Richards', pillar: null,
    target: { drive: 'high', composure: 'high', integrity: 'high', warmth: 'moderate',
              sociability: 'moderate', openness: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Unsung hero — 6.8 WAR, zero dedicated coverage; does the job for its own sake.' },
      { tag: 'Career',     text: 'Third baseman, 1.000 fielding — flawless and uncelebrated.' },
      { tag: 'Background', text: 'Quiet, steady, no spotlight.' },
      { tag: 'Stabilized', text: 'The same reliable glove and bat, year after year.' },
      { tag: 'Stabilized', text: 'Unbothered by the lack of attention.' },
      { tag: 'Reputation', text: 'Plays it straight; the work is the reward.' },
      { tag: 'Reputation', text: 'Three-time All-Star who never asked for credit.' },
      { tag: 'Mentorship', text: 'A player’s player — the one the others quietly respect.' }
    ]
  },

  // ---- POP-00033 John Ellis — SP, 26, "cheap, reliable, growing" ----
  'POP-00033': {
    name: 'John Ellis', pillar: null,
    target: { drive: 'high', openness: 'high', composure: 'moderate', integrity: 'neutral',
              sociability: 'neutral', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Twenty-six, cheap and reliable — 16-6, 3.89, growing into the rotation.' },
      { tag: 'Education',  text: 'Still learning the craft; a little better every start.' },
      { tag: 'Education-Cultural', text: 'Studies the veterans, absorbs the dynasty’s way.' },
      { tag: 'Career',     text: 'Pre-arbitration — earning his place.' },
      { tag: 'Background', text: 'Composed beyond his years for a young arm.' },
      { tag: 'Personal',   text: 'Open, curious, hungry to improve.' }
    ]
  },

  // ---- POP-00597 Eric Taveras — 2B, 25, "$225M gamble", HR Derby winner (already Entries:4 → supplemental) ----
  'POP-00597': {
    name: 'Eric Taveras', pillar: null,
    target: { drive: 'high', composure: 'moderate', openness: 'moderate', outabout: 'neutral',
              sociability: 'neutral', warmth: 'neutral', family: 'neutral', integrity: 'neutral' },
    events: [
      { tag: 'Promotion',  text: 'Home Run Derby winner, 2039 — raw, prodigious power.' },
      { tag: 'Career',     text: 'A $225M gamble at second base — a career .244 hitter carrying a max contract.' },
      { tag: 'Career',     text: 'Everyday starter, not a utility man — the bet is on the ceiling.' },
      { tag: 'Background', text: 'Carries the weight of the contract every at-bat.' },
      { tag: 'Personal',   text: 'Swinging for the ceiling that justified the gamble.' }
    ]
  },

  // ---- POP-00025 Arturo Ramos — SP, new, details TBD (THIN canon → baseline athlete) ----
  'POP-00025': {
    name: 'Arturo Ramos', pillar: null,
    target: { drive: 'high', composure: 'moderate', openness: 'moderate',
              sociability: 'neutral', warmth: 'neutral', integrity: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'New to the rotation — a No. 2 starter whose story is still being written.' },
      { tag: 'Career',     text: 'Earning his spot in a championship rotation.' },
      { tag: 'Background', text: 'Settling into a new clubhouse.' },
      { tag: 'Arrival',    text: 'Arrived in Oakland for a fresh chapter.' }
    ]
  },

  // ---- POP-00124 Steve Conrad — Ex-A's star RF, post-career elder (Entries:5 → supplemental; THIN specific canon) ----
  'POP-00124': {
    name: 'Steve Conrad', pillar: null,
    target: { composure: 'high', warmth: 'high', family: 'high', drive: 'neutral',
              openness: 'neutral', sociability: 'neutral', integrity: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Mentorship', text: 'The elder presence — passes on what the dynasty taught him.' },
      { tag: 'Mentorship', text: 'Gives the younger players what an older player once gave him.' },
      { tag: 'PostCareer', text: 'Ex-A’s star right fielder, now in the chapter after playing.' },
      { tag: 'Retirement', text: 'Stepped away from the game he gave his prime to.' },
      { tag: 'Daily',      text: 'A settled life after baseball.' },
      { tag: 'Background', text: 'Carries the calm of a man who already proved it.' },
      { tag: 'Stabilized', text: 'The steadiness of a man with nothing left to prove.' }
    ]
  },

  // ============================================================================
  // Tier-3 — family / planner / GM (canon from CHARACTER.md §My Family + ledger).
  // ============================================================================

  // ---- POP-00594 Robert Corliss — Mags' husband, retired PG&E engineer, "the steady one" ----
  'POP-00594': {
    name: 'Robert Corliss', pillar: null,
    target: { composure: 'high', warmth: 'high', family: 'high', integrity: 'high',
              drive: 'neutral', sociability: 'moderate', openness: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Wedding',    text: 'Married to Mags Corliss; holds her hand on their morning lake walks.' },
      { tag: 'Daily',      text: 'Two glasses on the terrace at Lake Merritt, watching the lake go dark.' },
      { tag: 'Daily',      text: 'A quiet, settled life — morning walks, Sunday chili.' },
      { tag: 'Retirement', text: 'Retired PG&E engineer; stepped back from the work.' },
      { tag: 'Background', text: 'The steady one; fixes things slowly and perfectly.' },
      { tag: 'Reputation', text: 'Methodical and exact — does it right, not fast.' },
      { tag: 'Reputation', text: 'Dependable to the core; loses his glasses, never his patience.' },
      { tag: 'Mentorship', text: 'Tender with the people he loves; the calm anchor of the household.' },
      { tag: 'Stabilized', text: 'Unhurried, unshakable — the steady one.' }
    ]
  },

  // ---- POP-00596 Michael Corliss — Mags' son, freelance photographer, port-cities documentary ----
  'POP-00596': {
    name: 'Michael Corliss', pillar: null,
    target: { openness: 'vhigh', drive: 'high', outabout: 'high', composure: 'neutral',
              warmth: 'neutral', family: 'neutral', sociability: 'neutral', integrity: 'neutral' },
    events: [
      { tag: 'Education-Cultural', text: 'A freelance photographer documenting port cities — chasing the image others walk past.' },
      { tag: 'Cultural',   text: 'Always out with a camera, documenting the life of the city.' },
      { tag: 'Cultural',   text: 'Travels light; follows the work to wherever the light is.' },
      { tag: 'Cultural',   text: 'Restless for the next frame, the next port.' },
      { tag: 'Lifestyle',  text: 'No insurance, no plan — the artist’s life, lived for the next image.' },
      { tag: 'Personal',   text: 'Sees what others overlook; open to everything.' },
      { tag: 'Career',     text: 'Builds a photography life one assignment at a time.' }
    ]
  },

  // ---- POP-00595 Sarah Corliss — Mags' daughter (Tier-2 family), CS, independent ----
  //      (real-world employer name in CHARACTER.md dropped — canon-fence on brands.)
  'POP-00595': {
    name: 'Sarah Corliss', pillar: null,
    target: { drive: 'high', openness: 'high', composure: 'high', integrity: 'moderate',
              sociability: 'neutral', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'A capacity analyst in tech — sharp, analytical, self-made.' },
      { tag: 'Education',  text: 'UC Berkeley computer science; built her own path.' },
      { tag: 'Education-Cultural', text: 'Reads systems for a living; analytical to the core.' },
      { tag: 'Career',     text: 'Independent — too independent to lean on people.' },
      { tag: 'Background', text: 'Self-contained, composed; keeps her own counsel.' },
      { tag: 'Stabilized', text: 'Steady and self-reliant; carries her own weight.' },
      { tag: 'Reputation', text: 'Careful, precise, principled in her work.' }
    ]
  },

  // ---- POP-00507 Mara Vance — City Planning Director (Entries:5 → supplemental) ----
  'POP-00507': {
    name: 'Mara Vance', pillar: null,
    target: { openness: 'high', drive: 'high', integrity: 'high', composure: 'high',
              sociability: 'moderate', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'City Planning Director — reads Oakland as a system to be shaped.' },
      { tag: 'Education-Cultural', text: 'Sees the whole board — the second- and third-order effects of every plan.' },
      { tag: 'Education-Cultural', text: 'A planner’s mind — patterns, flows, consequences.' },
      { tag: 'Career',     text: 'Decades shaping the city’s bones.' },
      { tag: 'Background', text: 'Measured, deliberate — a planner’s composure.' },
      { tag: 'Stabilized', text: 'Steady under the weight of the city’s decisions.' },
      { tag: 'Reputation', text: 'Rigorous and principled — the plan has to hold up.' },
      { tag: 'Reputation', text: 'Tells it straight, even when it’s unwelcome.' }
    ]
  },

  // ---- POP-00527 Mike Paulson — GM, A's & Bulls (Entries:4 → supplemental).
  //      MIKE-CONFIRM: Paulson is sports-domain + the Maker's in-world handle. Light baseline
  //      from public GM canon; Mike's call to confirm/override the essence. ----
  'POP-00527': {
    name: 'Mike Paulson', pillar: null,
    target: { drive: 'high', composure: 'high', sociability: 'moderate', integrity: 'moderate',
              openness: 'neutral', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'General Manager of the Oakland A’s and the Chicago Bulls — the dual role, again.' },
      { tag: 'Promotion',  text: 'Holds a dynasty’s window open; a historic legacy taking on a new chapter.' },
      { tag: 'Career',     text: 'Carries two franchises on one set of shoulders.' },
      { tag: 'Background', text: 'Steady under the weight of two front offices.' },
      { tag: 'Stabilized', text: 'Unflinching through roster decisions that define eras.' },
      { tag: 'Civic Role', text: 'The public face of the franchise’s direction.' },
      { tag: 'Reputation', text: 'His word holds; builds for the long arc.' }
    ]
  },

  // ---- POP-00004 Lucia Polito — Aura Wellness Practitioner, Fruitvale (Tier-1 PROTECTED, codex-linked) ----
  'POP-00004': {
    name: 'Lucia Polito', pillar: null,
    target: { warmth: 'high', composure: 'high', openness: 'high', sociability: 'moderate',
              drive: 'neutral', integrity: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Faith',      text: 'An aura-wellness practitioner; grounded in the spiritual rhythms of Fruitvale.' },
      { tag: 'Faith',      text: 'Holds space for others’ healing; faith and calm are her practice.' },
      { tag: 'Mentorship', text: 'Tends to people’s well-being — warm, present, healing.' },
      { tag: 'Stabilized', text: 'A practitioner’s calm; the still, grounding presence in the room.' },
      { tag: 'Background', text: 'Centered, unhurried, attuned.' },
      { tag: 'Education-Cultural', text: 'Reads energy and intention; open to what others dismiss.' },
      { tag: 'Lifestyle',  text: 'Lives by wellness and intention.' },
      { tag: 'Community',  text: 'Warm with the people who come to her.' }
    ]
  },

  // ---- POP-00017 Anthony Raines — Tier-1 lead A's beat reporter, senior (Entries:4 → supplemental) ----
  'POP-00017': {
    name: 'Anthony Raines', pillar: null,
    target: { drive: 'high', openness: 'high', sociability: 'high', integrity: 'high',
              composure: 'neutral', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Lead beat reporter on the Oakland A’s — the byline closest to the dynasty.' },
      { tag: 'Career',     text: 'A senior journalist; decades on the beat.' },
      { tag: 'Education-Cultural', text: 'Reads the game and the people behind it.' },
      { tag: 'Personal',   text: 'Always chasing the quiet story behind the loud one.' },
      { tag: 'Media',      text: 'Always working the room — the sources, the clubhouse.' },
      { tag: 'Public',     text: 'The recognized voice on the A’s beat.' },
      { tag: 'Reputation', text: 'Chronicled the dynasty start to finish; his word is trusted.' },
      { tag: 'Reputation', text: 'Gets the story right before he gets it fast.' },
      { tag: 'Reputation', text: 'Plays it straight.' }
    ]
  },

  // ============================================================================
  // Civic — council + executive voices (essence from role + .claude/rules/civic.md
  // faction tones; civic-office IDENTITY files carry no dial block). All on the
  // Simulation_Ledger (Mike-confirmed S265). integrity-forward figures (Dane/Ashford/
  // Montez) are authored to the CURRENT-MAP ceiling (integrity 'high'); their ideal
  // is integrity-vhigh, which needs the engine.39 pure-integrity tag (integrity only
  // comes bundled with sociability today). Re-upgrade those targets once engine.39 ships.
  // ============================================================================

  // ---- POP-00034 Avery Santana — Mayor of Oakland (she/her) ----
  'POP-00034': {
    name: 'Avery Santana', pillar: null,
    target: { drive: 'high', sociability: 'high', composure: 'high', integrity: 'high',
              warmth: 'moderate', openness: 'moderate', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Promotion',  text: 'Won the mayoralty; leads Oakland through its biggest decisions.' },
      { tag: 'Civic Role', text: 'Mayor of Oakland — sets policy and speaks for the city.' },
      { tag: 'Civic Role', text: 'Carries the city’s direction into every chamber.' },
      { tag: 'Public',     text: 'The public face of City Hall.' },
      { tag: 'Stabilized', text: 'Steady under the weight of the whole city’s demands.' },
      { tag: 'Community',  text: 'Close to the neighborhoods she governs.' },
      { tag: 'Education-Cultural', text: 'Reads the city as a system of competing needs.' },
      { tag: 'Reputation', text: 'Means what she signs; accountable for the call.' },
      { tag: 'Reputation', text: 'Leads straight, owns the outcomes.' }
    ]
  },

  // ---- POP-00037 Brenda Okoro — Deputy Mayor, Community Affairs (operational, not political) ----
  'POP-00037': {
    name: 'Brenda Okoro', pillar: null,
    target: { drive: 'high', composure: 'high', integrity: 'high', warmth: 'moderate',
              sociability: 'moderate', openness: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Deputy Mayor for Community Affairs — the operational reality behind the politics.' },
      { tag: 'Career',     text: 'Runs the Stabilization Fund and community/economic development — gets it done.' },
      { tag: 'Career',     text: 'Carries the Mayor’s office operational load.' },
      { tag: 'Stabilized', text: 'Steady under operational pressure.' },
      { tag: 'Background', text: 'Measured, unflashy, effective.' },
      { tag: 'Mentorship', text: 'Tends to the community’s real needs, not the headlines.' },
      { tag: 'Reputation', text: 'Operational honesty — the delivery, not the spin.' },
      { tag: 'Reputation', text: 'Does the work, indifferent to the political credit.' },
      { tag: 'Reputation', text: 'The numbers have to add up before she signs.' }
    ]
  },

  // ---- POP-00143 Clarissa Dane — District Attorney, former federal prosecutor (integrity→vhigh post-engine.39) ----
  'POP-00143': {
    name: 'Clarissa Dane', pillar: null,
    target: { integrity: 'high', composure: 'high', drive: 'high', openness: 'moderate',
              sociability: 'moderate', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'District Attorney; a former federal prosecutor — precise, exacting.' },
      { tag: 'Promotion',  text: 'Took the DA’s office on a record of hard, clean convictions.' },
      { tag: 'Stabilized', text: 'Unshakable in the courtroom; controls the room with precision.' },
      { tag: 'Background', text: 'Measured, deliberate — every word on the record chosen.' },
      { tag: 'Education-Cultural', text: 'Reads a case the way a chemist reads a reaction — element by element.' },
      { tag: 'Reputation', text: 'No spin — the law, the facts, the honest charge.' },
      { tag: 'Reputation', text: 'Plays it straight; the framework holds or it doesn’t.' },
      { tag: 'Reputation', text: 'Incorruptible about the process — precise to the letter.' }
    ]
  },

  // ---- POP-00136 Rafael Montez — Police Chief (professional, measured, data-driven) ----
  'POP-00136': {
    name: 'Rafael Montez', pillar: null,
    target: { composure: 'high', integrity: 'high', drive: 'high', openness: 'moderate',
              sociability: 'moderate', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Police Chief — professional, measured, data-driven.' },
      { tag: 'Career',     text: 'Runs the department by the numbers, not the noise.' },
      { tag: 'Stabilized', text: 'Steady under public scrutiny; never reactive.' },
      { tag: 'Background', text: 'Measured in every public statement.' },
      { tag: 'Education-Cultural', text: 'Reads the crime data for what it actually says.' },
      { tag: 'Reputation', text: 'Professional and accountable — the facts, plainly.' },
      { tag: 'Reputation', text: 'Plays it straight; owns the department’s record.' },
      { tag: 'Reputation', text: 'Disciplined, principled, by the book.' }
    ]
  },

  // ---- POP-00043 Janae Rivers — OPP spokesperson (progressive, community-centered, equity) ----
  'POP-00043': {
    name: 'Janae Rivers', pillar: null,
    target: { sociability: 'high', warmth: 'high', openness: 'high', drive: 'high',
              integrity: 'moderate', composure: 'moderate', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Civic Role', text: 'Oakland Progressive Party voice on the City Council — community-centered, equity-focused.' },
      { tag: 'Civic Role', text: 'Carries the progressive bloc’s positions into the chamber.' },
      { tag: 'Community',  text: 'Rooted in the neighborhoods — speaks for the people on the margins.' },
      { tag: 'Community',  text: 'Warm, present, organizing — meets people where they are.' },
      { tag: 'Mentorship', text: 'Lifts up the communities the city overlooks.' },
      { tag: 'Education-Cultural', text: 'Sees the equity dimension others miss.' },
      { tag: 'Lifestyle',  text: 'Open to new approaches; the old answers haven’t worked for everyone.' },
      { tag: 'Public',     text: 'A recognized progressive voice in the city.' },
      { tag: 'Reputation', text: 'Means the equity she fights for.' }
    ]
  },

  // ---- POP-00504 Warren Ashford — CRC spokesperson (fiscal accountability, oversight, process) ----
  'POP-00504': {
    name: 'Warren Ashford', pillar: null,
    target: { integrity: 'high', drive: 'high', composure: 'high', openness: 'moderate',
              sociability: 'moderate', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Civic Reform Coalition voice on the Council — fiscal accountability and oversight.' },
      { tag: 'Career',     text: 'Process-focused — every dollar and every step has to justify itself.' },
      { tag: 'Stabilized', text: 'Steady, exacting; unmoved by political pressure.' },
      { tag: 'Background', text: 'Measured, deliberate, scrutinizing.' },
      { tag: 'Education-Cultural', text: 'Reads the budget line by line for what doesn’t add up.' },
      { tag: 'Reputation', text: 'Demands the process hold; oversight before approval.' },
      { tag: 'Reputation', text: 'Principled about accountability — no shortcuts.' },
      { tag: 'Reputation', text: 'Plays it straight; the numbers have to reconcile.' }
    ]
  },

  // ---- POP-00042 Ramon Vega — City Council President, IND (case-by-case swing; NOT a bloc) ----
  'POP-00042': {
    name: 'Ramon Vega', pillar: null,
    target: { composure: 'high', openness: 'high', integrity: 'high', sociability: 'moderate',
              drive: 'moderate', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Civic Role', text: 'City Council President — convenes the chamber, an independent who weighs each issue on its merits.' },
      { tag: 'Stabilized', text: 'Steady hand presiding; doesn’t chase a faction.' },
      { tag: 'Background', text: 'Measured — listens to all sides before he moves.' },
      { tag: 'Education-Cultural', text: 'Weighs each question case by case, second-order effects and all.' },
      { tag: 'Education-Cultural', text: 'An independent mind — open to the argument, not the party.' },
      { tag: 'Reputation', text: 'No bloc, no spin — calls it as he sees it.' },
      { tag: 'Reputation', text: 'Principled about the process he presides over.' }
    ]
  },

  // ---- POP-00502 Leonard Tran — City Council Member, IND (case-by-case swing; speaks for himself) ----
  'POP-00502': {
    name: 'Leonard Tran', pillar: null,
    target: { openness: 'high', composure: 'high', integrity: 'moderate', drive: 'moderate',
              sociability: 'neutral', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Education-Cultural', text: 'An independent on the Council — studies each issue, votes his own read.' },
      { tag: 'Education-Cultural', text: 'Open to the argument over the alliance; weighs it himself.' },
      { tag: 'Stabilized', text: 'Even-keeled; doesn’t swing with the room.' },
      { tag: 'Background', text: 'Measured, deliberate, his own counsel.' },
      { tag: 'Personal',   text: 'Curious, independent-minded; thinks it through.' },
      { tag: 'Reputation', text: 'Speaks for himself — no bloc, plays it straight.' }
    ]
  }

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TIER1_ESSENCE: TIER1_ESSENCE };
}
