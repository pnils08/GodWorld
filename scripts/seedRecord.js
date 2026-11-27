'use strict';
/**
 * scripts/seedRecord.js — the engine's story seeds lead a reporter's record (pipeline.118; builder 2026-11-27: "They go
 * to their slice like I told you when we started"; the seed contract, docs/research/2026-07-05-mike-seed-contract.md:
 * "here's what happened and to whom, search canon to support and write an article … provide the exact citizens,
 * neighborhoods, businesses effected by the story seed (aka engine event)").
 *
 * The engine writes Story_Seed_Deck inside the Cycle (phase07 buildContractSeeds). Since 2026-11-21 the seat-file
 * records carried none of it. leadWithSeeds(slice, seat, rows, profiles, kit) puts the seat's seeds for the Cycle
 * first in its facts — what happened, where, to whom (each citizen's own line), the businesses — and those citizens
 * first among the people it can go to. The row directs nothing: no angle, no hook, no voice. The seat's own record
 * rides behind, whole.
 */
const VERSION = 'SEEDS-1';
const MAX_SEEDS = 10;

// Which seeds are a seat's. desk: the seed's Desk; domain: its Domain; why: words in what happened (never the business
// list — that is the hood's businesses, not the event). A seed can go to more than one seat.
const ROUTES = {
  'business-desk': { desk: /^business$/i },
  'carmen-delaine': { desk: /^civic$/i, why: /initiative|fund\b|council|vote|is (?:operational|stalled|dispatch-live|construction-active|disbursement-active|design-phase|legislation-filed)|coverage/i },
  'luis-navarro': { desk: /^civic$/i, why: /stalled|sitting|blocked|has not|overdue|capped/i },
  'rachel-torres': { domain: /^SAFETY$/i, why: /\bOARI\b|arrest|crime|police|without cuffs|crisis ended/i },
  'trevor-shimizu': { why: /transit|traffic|gridlock|ridership|\bBART\b|station|I-880|snarl/i },
  'lila-mezran': { why: /health|clinic|hospital|illness|\bsick\b|\bflu\b|dental|medical/i },
  'angela-reyes': { why: /school|youth|apprentice|student|tutoring|classroom/i },
  'noah-tan': { why: /weather|storm|\bheat\b|\brain\b|air quality|smoke|flood|fog/i },
  'elliot-graye': { why: /congregation|church|temple|masjid|parish|\bfaith\b|vigil|grief gathering|pantry|interfaith|assistance fund|prayer|seniors lunch/i },
  'kai-marston': { why: /gallery|theatre|theater|playhouse|\barts?\b|mural|concert|festival|cultural center/i },
  'mason-ortega': { why: /restaurant|kitchen|bistro|\bcafe\b|tavern|taproom|tap room|\bfood\b|bakery|market/i },
  'sharon-okafor': { why: /spotted at|block party|nightlife|\bclub\b|lounge|party/i },
  'celeste-tran': { why: /keeps saying the name|spotlight moved|Tier \d|watched|trending/i },
  'maria-keen': { desk: /^culture$/i, why: /moved from|married|household|planning to leave|block party|briefing|market|residents/i }
};

// A cause fragment that is the engine's arithmetic, not something that happened.
const ARITHMETIC = /×|clamped|sentimentWeight|^carryover:|\(0, capped\)|^[a-zA-Z/]+ [+-]?\d*\.\d+$/;

function clean(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
function happened(row) { return clean(row.Why).split(/\s*\|\s*/).map(clean).filter((p) => p && !ARITHMETIC.test(p)); }

function seedsForSeat(slug, rows, cycle) {
  const route = ROUTES[slug];
  if (!route) return [];
  const out = [];
  for (const r of rows || []) {
    if (Number(r.Cycle) !== Number(cycle)) continue;
    const parts = happened(r);
    if (!parts.length) continue;
    const text = parts.join(' | ');
    const deskOk = route.desk ? route.desk.test(clean(r.Desk)) : true;
    const hit = (route.domain && route.domain.test(clean(r.Domain))) || (route.why && route.why.test(text)) || (!route.why && !route.domain && route.desk);
    if (!deskOk || !hit) continue;
    out.push({ row: r, parts });
  }
  out.sort((a, b) => (/^major$/i.test(clean(a.row.Class)) ? 0 : 1) - (/^major$/i.test(clean(b.row.Class)) ? 0 : 1));
  return out.slice(0, MAX_SEEDS);
}

function seedText(s) {
  const r = s.row;
  const hood = clean(r.Neighborhood);
  const who = clean(r.CitizenEvents).split(/\s*\|\s*/).map(clean).filter(Boolean);
  const biz = clean(r.Businesses).split(/\s*;\s*/).map((b) => b.replace(/^BIZ-\d+\s+/i, '').trim()).filter(Boolean);
  return (hood && !/^citywide$/i.test(hood) ? hood + ': ' : '') + s.parts.join('. ').replace(/\.\.$/, '.') +
    (who.length ? ' — Citizens on this seed: ' + who.join('; ') : '') + (biz.length ? ' — Businesses there: ' + biz.join(', ') : '');
}

function leadWithSeeds(slice, seat, rows, profiles, K) {
  if (!slice || slice.empty || !ROUTES[seat.slug]) return slice;
  const seeds = seedsForSeat(seat.slug, rows, slice.cycle);
  slice.seedsVersion = VERSION;
  slice.seeds = seeds.map((s) => s.row.SeedID || null);
  if (!seeds.length) return slice;
  const lead = seeds.map((s) => ({ text: seedText(s), src: 'Story_Seed_Deck ' + (s.row.SeedID || '') + ' C' + slice.cycle }));
  const facts = lead.concat(slice.facts || []);
  slice.facts = facts;
  slice.prewrite.anchorFacts = facts.map((f) => f.text);
  slice.prewrite.evidence = facts;
  if (slice.prewrite.factCap) slice.prewrite.factCap = Number(slice.prewrite.factCap) + lead.length;
  // the seeds' own citizens first among the people the seat can go to, each with what they lived
  const people = [];
  for (const s of seeds) {
    const ids = clean(s.row.Citizens).split(/\s*;\s*/).map((t) => (t.match(/^(POP-\d+)/i) || [])[1]).filter(Boolean);
    const evs = clean(s.row.CitizenEvents).split(/\s*\|\s*/).map(clean);
    ids.forEach((id, i) => {
      const popid = id.toUpperCase();
      if (popid === seat.popid || K.isMediaStaff(profiles, popid) || people.some((p) => p.popid === popid)) return;
      const why = evs[i] || s.parts[0];
      const p = K.personFromProfile(profiles, popid, why, clean(s.row.Neighborhood) || null);
      if (p) { p.profile = p.profile + ' — ' + why; people.push(p); }
    });
  }
  const rest = (slice.citizens || []).filter((c) => !people.some((p) => p.popid === c.popid));
  slice.citizens = people.concat(rest);
  if (slice.prewrite.peopleCap) slice.prewrite.peopleCap = Math.max(Number(slice.prewrite.peopleCap), Math.min(people.length + 8, 30));
  return slice;
}

module.exports = { VERSION, ROUTES, leadWithSeeds, seedsForSeat, seedText, happened };
