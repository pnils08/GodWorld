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
              warmth: 'moderate', sociability: 'neutral', family: 'neutral', outabout: 'neutral' },
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
      { tag: 'Reputation', text: 'Quiet authority — relentless about the work, indifferent to the credit.' }
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
  }

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TIER1_ESSENCE: TIER1_ESSENCE };
}
