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
  },

  // ============================================================================
  // Civic — project directors (accountable program-director archetype: deadline-driven,
  // data-grounded, "these are not projections". Essence from canon statements/bios via
  // lookup_citizen. integrity authored to the 'high' ceiling — vhigh wants engine.39.
  // ============================================================================

  // ---- POP-01021 Vanessa Tran-Muñoz — OARI Program Director ($12.5M crisis-response) ----
  'POP-01021': {
    name: 'Vanessa Tran-Muñoz', pillar: null,
    target: { drive: 'high', integrity: 'high', composure: 'high', warmth: 'moderate',
              openness: 'moderate', sociability: 'moderate', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Program Director of OARI — the $12.5M civilian crisis-response program.' },
      { tag: 'Promotion',  text: 'Built the crisis-response program from a mobile pilot into a citywide deployment.' },
      { tag: 'Education',  text: 'DrPH and an MSW; ran a crisis pilot before Oakland recruited her.' },
      { tag: 'Stabilized', text: 'Steady under council scrutiny — never reactive.' },
      { tag: 'Education-Cultural', text: 'Reads the call-type data district by district.' },
      { tag: 'Mentorship', text: 'Crisis-care at the core — meets people on their worst day.' },
      { tag: 'Reputation', text: 'These are not projections — what the program has already diverted.' },
      { tag: 'Reputation', text: 'Puts the real benchmark on the record, accountable for it.' },
      { tag: 'Reputation', text: 'Plays it straight; the data has to hold.' }
    ]
  },

  // ---- POP-00790 Marcus Webb — OEWD / West Oakland Stabilization Fund Director ----
  //      (distinct from the cultural-card novelist "Marcus Webb" CUL-72BD508A; this is the citizen row.)
  'POP-00790': {
    name: 'Marcus Webb', pillar: null,
    target: { drive: 'high', integrity: 'high', composure: 'high', openness: 'moderate',
              sociability: 'moderate', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Director of the West Oakland Stabilization Fund (OEWD) — accountable on the disbursement schedule.' },
      { tag: 'Career',     text: 'Gets the checks to the households; outcome over optics.' },
      { tag: 'Stabilized', text: 'Steady operator; clear on the timeline even under pressure.' },
      { tag: 'Background', text: 'Measured, deliberate — the foundation before the structure.' },
      { tag: 'Education-Cultural', text: 'Reads the disbursement-to-impact chain in cycles, not slogans.' },
      { tag: 'Reputation', text: 'A family stays housed because the Fund moved — accountable for that.' },
      { tag: 'Reputation', text: 'Operationalizes the position; no spin, just delivery.' },
      { tag: 'Reputation', text: 'Plays it straight; the numbers and the timeline hold.' }
    ]
  },

  // ---- POP-00791 Eloise Soria-Dominguez — Fruitvale Transit Hub Planning Lead ----
  //      NAME DRIFT (C98 RB-2 / C99 G-S5): ledger row = "Eloise Soria-Dominguez"; canonical/agent
  //      pinned name = "Elena Soria Dominguez". Keyed by POPID; engine-sheet reconcile at write.
  'POP-00791': {
    name: 'Eloise Soria-Dominguez', pillar: null,
    target: { drive: 'high', integrity: 'high', composure: 'high', openness: 'moderate',
              sociability: 'moderate', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Planning Lead for the $230M Fruitvale Transit Hub Phase II.' },
      { tag: 'Career',     text: 'Maps every step from a young person without a trade to a paid apprentice on the project.' },
      { tag: 'Promotion',  text: 'Got the Community Benefits Agreement signed — not pending, executed.' },
      { tag: 'Stabilized', text: 'Precise and unflappable through the visioning and the gates.' },
      { tag: 'Background', text: 'Measured — describes every step on the record.' },
      { tag: 'Education-Cultural', text: 'Reads the anti-displacement and workforce mechanics end to end.' },
      { tag: 'Reputation', text: 'The terms Councilmember Delgado held firm on are the terms in the document — not value-engineered.' },
      { tag: 'Reputation', text: 'Accountable to the public tracker, monthly, by name.' },
      { tag: 'Reputation', text: 'Plays it straight; signed means signed.' }
    ]
  },

  // ---- POP-00792 Bobby Chen-Ramirez — Health Center Project Director ($45M Temescal) ----
  'POP-00792': {
    name: 'Bobby Chen-Ramirez', pillar: null,
    target: { drive: 'high', integrity: 'high', composure: 'high', warmth: 'moderate',
              openness: 'moderate', sociability: 'moderate', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Project Director of the $45M Temescal Community Health Center.' },
      { tag: 'Career',     text: 'Architect selection, site due diligence, HCAI licensing — carries the build.' },
      { tag: 'Stabilized', text: 'Steady through the long permitting and construction runway.' },
      { tag: 'Background', text: 'Methodical — the milestones in order, none skipped.' },
      { tag: 'Education-Cultural', text: 'Reads the licensing and construction systems precisely.' },
      { tag: 'Mentorship', text: 'Builds for the community’s health — the people who’ll walk in the door.' },
      { tag: 'Reputation', text: 'Accountable for the public dollars and the timeline.' },
      { tag: 'Reputation', text: 'Plays it straight; the project has to be real, not announced.' }
    ]
  },

  // ---- POP-00041 Keisha Ramos — Director, Baylight Redevelopment Authority ($2.1B district) ----
  'POP-00041': {
    name: 'Keisha Ramos', pillar: null,
    target: { drive: 'high', integrity: 'high', composure: 'high', openness: 'moderate',
              sociability: 'moderate', warmth: 'neutral', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Director of the Baylight Redevelopment Authority — the $2.1B district build.' },
      { tag: 'Promotion',  text: 'Carries a multibillion-dollar redevelopment from milestone to milestone.' },
      { tag: 'Career',     text: 'TIF reports, workforce agreements, deliverable filings — the whole apparatus.' },
      { tag: 'Stabilized', text: 'Unflinching at the scale of it; doesn’t blink at the numbers.' },
      { tag: 'Background', text: 'Measured, exact — every gate documented.' },
      { tag: 'Education-Cultural', text: 'Reads the financing and construction board several moves ahead.' },
      { tag: 'Reputation', text: 'Accountable for the public stake in a private-scale build.' },
      { tag: 'Reputation', text: 'Plays it straight; the deliverables are filed or they aren’t.' }
    ]
  },

  // ============================================================================
  // Media — Bay Tribune reporters (essence from docs/media/voices/<name>.md +
  // the dj-hartley agent + ledger cards). Authored from voice files, not dial
  // blocks (the reporter voices predate research.16's disposition format), so the
  // QA rule maps each voice's stated character to its dominant dials. The
  // integrity/sociability coupling (engine.39) keeps the adversarial/solitary
  // voices (Jax) at sociability-neutral rather than low — the seed can't drive a
  // dial below neutral from ordinary events. Anthony Raines POP-00017 authored
  // above with the core Tier-1.
  // ============================================================================

  // ---- POP-00007 Hal Richmond — Senior Sports Historian (reverent, elegiac, long-view) ----
  'POP-00007': {
    name: 'Hal Richmond', pillar: null,
    target: { drive: 'high', openness: 'high', composure: 'high', sociability: 'high',
              integrity: 'moderate', warmth: 'moderate', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Forty years covering Oakland baseball — witnessed every championship since the seventies.' },
      { tag: 'Career',     text: 'Built the Richmond Archive Collection, the Tribune’s most prestigious series.' },
      { tag: 'Career',     text: 'The senior historian — the long-view byline on every dynasty retrospective.' },
      { tag: 'Education-Cultural', text: 'Reads each era against the last — places every player in the long river of Oakland baseball history.' },
      { tag: 'Education-Cultural', text: 'Transforms numbers into philosophy — OPS-plus and WAR as the new language of an old game.' },
      { tag: 'Education-Cultural', text: 'Literary and allusive — connects present players to the historical ghosts he covered.' },
      { tag: 'Stabilized', text: 'Reverent even about decline; a measured, elegiac calm on the page.' },
      { tag: 'Stabilized', text: 'The quiet road after parade days — at peace with time passing.' },
      { tag: 'Background', text: 'Knows the rhythm of the seasons the way sailors learn tides.' },
      { tag: 'Media',      text: 'The recognized voice of Oakland baseball history.' },
      { tag: 'Public',     text: 'Pulls readers in with “you” — the narrator of the city’s baseball memory.' },
      { tag: 'Reputation', text: 'His word on the dynasty is trusted; the keeper of the record.' },
      { tag: 'Reputation', text: 'Gets the history right; never trades reverence for a hot take.' }
    ]
  },

  // ---- POP-00008 P Slayer — Fan Columnist (raw, philosophical, confrontational, "we") ----
  'POP-00008': {
    name: 'P Slayer', pillar: null,
    target: { drive: 'high', sociability: 'high', openness: 'high', outabout: 'moderate',
              composure: 'neutral', warmth: 'moderate', integrity: 'moderate', family: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Fan columnist for the Tribune sports page — the emotional pulse of Oakland baseball.' },
      { tag: 'Career',     text: 'Grew up in the Coliseum bleachers; started on the message boards and never left.' },
      { tag: 'Education-Cultural', text: 'A master’s in comparative literature from Cal — a Melville thesis under the bleacher rawness.' },
      { tag: 'Education-Cultural', text: 'Builds from reaction to philosophy — starts in the gut, ends in meaning.' },
      { tag: 'Education-Cultural', text: 'Metaphors drawn from Oakland life, not sports cliché — the rawness is craft.' },
      { tag: 'Community',  text: 'Speaks for the fans — “we” always, never neutral; the game is personal here.' },
      { tag: 'Public',     text: 'The confrontational voice of the bleachers; names the counter-argument and dismantles it.' },
      { tag: 'Media',      text: 'References his colleagues by name — Anthony for the metrics, Hal for the history.' },
      { tag: 'Reputation', text: 'Takes it personally and owns every word; corrected his own column in public when he was wrong.' },
      { tag: 'Team',       text: 'Lives in the stands and the bars where the games actually get felt.' },
      { tag: 'Personal',   text: 'Confessional and confrontational by turns — the heat is the point.' }
    ]
  },

  // ---- POP-00012 Elliot Graye — Ethics & Faith Journalist (driven Striver, principled) ----
  'POP-00012': {
    name: 'Elliot Graye', pillar: null,
    target: { drive: 'high', openness: 'high', integrity: 'high', composure: 'high',
              warmth: 'moderate', sociability: 'moderate', family: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'The Ethics and Faith byline at the Tribune — covers the moral questions under the news.' },
      { tag: 'Career',     text: 'A driven Striver; chases the harder, deeper story.' },
      { tag: 'Career',     text: 'Mid-career and relentless about the work.' },
      { tag: 'Education-Cultural', text: 'Reads the ethical dimension others skip — the principle beneath the policy.' },
      { tag: 'Education-Cultural', text: 'Moves easily across the city’s faiths and the questions they raise.' },
      { tag: 'Faith',      text: 'Grounded in the city’s faith communities; covers them with respect.' },
      { tag: 'Faith',      text: 'A steady, contemplative presence on the ethics beat.' },
      { tag: 'Stabilized', text: 'Measured and even — weighs the moral question before he writes it.' },
      { tag: 'Reputation', text: 'Principled to the letter; the ethics writer has to live the ethics.' },
      { tag: 'Reputation', text: 'Holds the line on fairness; names the hard truth plainly.' },
      { tag: 'Reputation', text: 'Trusted to get the moral framing right.' },
      { tag: 'Personal',   text: 'Curious about the questions that don’t have clean answers.' },
      { tag: 'Background', text: 'Deliberate and unhurried in his judgments.' }
    ]
  },

  // ---- POP-00011 Carmen Delaine — Civic Ledger (data journalist, systems, follows the money) ----
  'POP-00011': {
    name: 'Carmen Delaine', pillar: null,
    target: { drive: 'high', openness: 'high', integrity: 'high', composure: 'high',
              sociability: 'high', family: 'moderate', warmth: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Eleven years covering Oakland City Council — outlasted every member but Vega.' },
      { tag: 'Career',     text: 'A data journalist who sees the city as interconnected systems.' },
      { tag: 'Education-Cultural', text: 'Tracks voting patterns over years; remembers who said what in old committee hearings.' },
      { tag: 'Education-Cultural', text: 'Pairs every statistic with a named human impact.' },
      { tag: 'Education-Cultural', text: 'Reads the whole municipal system — service health, infrastructure, the money trail.' },
      { tag: 'Stabilized', text: 'Patient, not cynical; skeptical of timelines, steady across years.' },
      { tag: 'Stabilized', text: 'Steady through eleven years of council churn.' },
      { tag: 'Background', text: 'Precise and unhurried — built on sourced facts, never vague.' },
      { tag: 'Reputation', text: 'Follows the money, not the press release; the extraction question is hers.' },
      { tag: 'Reputation', text: 'Tracks the record honestly across a decade of votes.' },
      { tag: 'Reputation', text: 'Trusted to get the vote math and the timeline exactly right.' },
      { tag: 'Media',      text: 'The recognized civic-affairs byline at the Tribune.' },
      { tag: 'Public',     text: 'A fixture in the council chamber and the record.' },
      { tag: 'Household',  text: 'Partnered, raising three children in Chinatown.' }
    ]
  },

  // ---- POP-00013 Maria Keen — Cultural Liaison (intimate community witness, First Friday) ----
  'POP-00013': {
    name: 'Maria Keen', pillar: null,
    target: { warmth: 'high', openness: 'high', sociability: 'high', outabout: 'high',
              composure: 'moderate', drive: 'moderate', integrity: 'neutral', family: 'neutral' },
    events: [
      { tag: 'Community',  text: 'Grew up in Fruitvale; has lived in seven Oakland neighborhoods over forty years.' },
      { tag: 'Community',  text: 'Knows the shopkeepers by name, remembers their children’s birthdays.' },
      { tag: 'Mentorship', text: 'Celebrates the invisible work — night watchers, janitors, kitchen hands.' },
      { tag: 'Mentorship', text: 'Holds the community close; writes its people with tenderness.' },
      { tag: 'Cultural',   text: 'First Friday is her territory — out in the art walk every month.' },
      { tag: 'Cultural',   text: 'Always in the scene, never above it — light, hands, sounds.' },
      { tag: 'Cultural',   text: 'Out in the neighborhoods at all hours, a witness to the city’s nights.' },
      { tag: 'FirstFriday', text: 'The First Friday art walk is her beat — she works it block by block.' },
      { tag: 'Education-Cultural', text: 'Finds beauty in complicated moments — the policy felt at street level.' },
      { tag: 'Public',     text: 'A familiar face across the city’s blocks.' },
      { tag: 'Background', text: 'Even-keeled, present, unhurried.' }
    ]
  },

  // ---- POP-00153 Jordan Velez — Economics & Labor (West Oakland, follows the money, five sources) ----
  'POP-00153': {
    name: 'Jordan Velez', pillar: null,
    target: { drive: 'high', sociability: 'high', openness: 'high', integrity: 'high',
              family: 'moderate', composure: 'neutral', warmth: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'Covers economics and labor because he grew up inside it — West Oakland, father on the docks thirty years.' },
      { tag: 'Career',     text: 'Interviews five sources minimum for every feature; the work is in the legwork.' },
      { tag: 'Education-Cultural', text: 'Connects national economic forces to Oakland street-level impact.' },
      { tag: 'Education-Cultural', text: 'Translates the metrics into what they mean for rent, hiring, the commute.' },
      { tag: 'Community',  text: 'Plays slow-pitch softball with the port union workers; rooted in the corridor.' },
      { tag: 'Public',     text: 'Names ages, neighborhoods, occupations — never a generic “business owner.”' },
      { tag: 'Media',      text: 'The economics and labor byline; sources the small-business owners directly.' },
      { tag: 'Reputation', text: 'Follows the money — asks who gets the first contract, every time.' },
      { tag: 'Reputation', text: 'Skeptical of the word “development”; tests the claim against the street.' },
      { tag: 'Reputation', text: 'Trusted to get the dollar figure and the human cost right.' },
      { tag: 'Household',  text: 'A father of four; the economy is never abstract to him.' },
      { tag: 'Personal',   text: 'Curious about how the whole economic loop turns.' }
    ]
  },

  // ---- POP-00636 Luis Navarro — Investigations / Managing Editor (records requests, persistent, fair) ----
  'POP-00636': {
    name: 'Luis Navarro', pillar: null,
    target: { drive: 'high', integrity: 'high', composure: 'high', sociability: 'moderate',
              openness: 'moderate', family: 'neutral', warmth: 'neutral', outabout: 'neutral' },
    events: [
      { tag: 'Career',     text: 'A former wire reporter who joined the Tribune for deeper investigative work.' },
      { tag: 'Career',     text: 'Managing Editor as well as a reporter — files the public-records requests himself.' },
      { tag: 'Career',     text: 'Senior investigations byline; counts the days until officials answer.' },
      { tag: 'Stabilized', text: 'Methodical and patient — “here is what we know, here is what we don’t.”' },
      { tag: 'Stabilized', text: 'Applies steady pressure; three weeks of “no comment” doesn’t move him off the story.' },
      { tag: 'Reputation', text: 'Won’t publish speculation without documentation; attributes everything by name.' },
      { tag: 'Reputation', text: 'Persistent and fair — documents, never guesses.' },
      { tag: 'Reputation', text: 'Trusted to separate the confirmed fact from the open question.' },
      { tag: 'Education-Cultural', text: 'Reads the documents for what they actually say.' },
      { tag: 'Background', text: 'Measured, exact, unflappable under stonewalling.' }
    ]
  },

  // ---- POP-00015 DeShawn "DJ" Hartley — Senior Photographer (the eye; sees the light, not the headline) ----
  //      The dj-hartley agent ("POP ID: to be assigned") IS this ledger row — P Slayer/Heinold's,
  //      Bay Tribune photographer, family-minded all reconcile. Agent traits mapped to the 8 dials.
  'POP-00015': {
    name: 'DeShawn Hartley', pillar: null,
    target: { openness: 'high', outabout: 'high', warmth: 'moderate', family: 'moderate',
              composure: 'moderate', drive: 'moderate', sociability: 'neutral', integrity: 'neutral' },
    events: [
      { tag: 'Education-Cultural', text: 'Thirty years shooting Oakland — sees the light, not the headline.' },
      { tag: 'Education-Cultural', text: 'Still thinks in film: every frame costs something, so make it count.' },
      { tag: 'Education-Cultural', text: 'Finds the human moment in the crowd — the photo you didn’t know you needed.' },
      { tag: 'Cultural',   text: 'Shoots every A’s home game; six championship parades on his record.' },
      { tag: 'Cultural',   text: 'Knows the Coliseum at midnight after the confetti and the waterfront at six a.m.' },
      { tag: 'Cultural',   text: 'Works from the bar stool, the dugout steps, the street corner.' },
      { tag: 'PrevEvening', text: 'Out shooting the city’s nights, the light no one else waited for.' },
      { tag: 'Household',  text: 'Family-minded; Jack London Square is home.' },
      { tag: 'Background', text: 'A steady eye; thirty years of making the frame count.' },
      { tag: 'Mentorship', text: 'Leads a small photo team; loyal to the people he shoots with.' }
    ]
  },

  // ---- POP-00799 Jax Caldera — Freelance Accountability Columnist (flamethrower, hidden Berkeley MUP) ----
  //      Tier-2, on the roster. Adversarial/solitary -> sociability NEUTRAL (the seed can't drive it
  //      below neutral, and integrity's Reputation coupling adds sociability; engine.39 would let a
  //      pure-integrity tag read him sharper). Mags's flamethrower-on-call.
  'POP-00799': {
    name: 'Jax Caldera', pillar: null,
    target: { drive: 'high', openness: 'high', integrity: 'high', outabout: 'high',
              composure: 'neutral', sociability: 'neutral', warmth: 'neutral', family: 'neutral' },
    events: [
      { tag: 'Career',     text: 'A freelance accountability columnist — shows up only when something stinks, files one hot piece, walks away.' },
      { tag: 'Career',     text: 'Blacklisted from every Bay Area alt-weekly for being too mean to sacred cows; Mags calls him for the question nobody else will ask.' },
      { tag: 'Education-Cultural', text: 'A hidden master’s in urban planning from Berkeley — the precision in his questions gives him away.' },
      { tag: 'Education-Cultural', text: 'Reads the city’s plans and budgets line by line for what doesn’t add up.' },
      { tag: 'Education-Cultural', text: 'Sees the irregularity others walk past; names it or doesn’t file.' },
      { tag: 'Cultural',   text: 'Opens in a bar, a laundromat, a BART car — out in the city where the story actually lives.' },
      { tag: 'Cultural',   text: 'Couch-surfing from Jingletown to Bushrod; always out, never at a desk.' },
      { tag: 'PrevEvening', text: 'Files from the bar stool at Eli’s Mile High, last night’s city still on him.' },
      { tag: 'FirstFriday', text: 'Out in the city’s nights, watching who shows and who doesn’t.' },
      { tag: 'Reputation', text: 'His facts check out; accountability is the whole point.' },
      { tag: 'Resisted',   text: 'Names the irregularity or doesn’t file — no weasel words, no “sources suggest” hedge.' },
      { tag: 'Resisted',   text: 'Won’t make an unqualified accusation; holds to the question or the attributed claim, nothing looser.' }
    ]
  }

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TIER1_ESSENCE: TIER1_ESSENCE };
}
