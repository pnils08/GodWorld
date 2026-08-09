#!/usr/bin/env node
/**
 * buildEconomicSlice.js — Grok-owned economic / storefront heat slice (pipeline.52 Task 2)
 *
 * Shared substrate for business desk wakes:
 *   neighborhood rising/cooling + retail vitality + named storefronts when on disk
 *
 * Hard rule: never invent Employee_Count, Key_Personnel, or businesses not in sources.
 * Named businesses come from Business_Ledger snapshot (if present) and/or Evening Texture venues.
 *
 * Sources (disk-first, no Sheets required):
 *   output/world_summary_c{N}.md  — Neighborhood snapshot, What Moved, Engine Review
 *   output/desk_signal_c{N}.json  — lanes.business
 *   output/world_summary ## Evening Texture — restaurants/nightlife as named venues
 *   output/engine83_business_ledger.txt (or business_ledger*.txt) — optional BIZ snapshot
 *
 * Artifacts:
 *   output/slices/c{N}/economic.md
 *   output/cron-compare/economic_slice_c{N}.json
 *
 * Usage:
 *   node scripts/buildEconomicSlice.js --cycle 102
 *   node scripts/buildEconomicSlice.js --cycle 102 --json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ECONOMIC_APPROACH =
  'Economic / storefront approach (business desk pack): open from a named hood trajectory or ' +
  'named business on this pack — rising retail, cooling storefronts, workforce/initiative footprint. ' +
  'Never invent Employee_Count, Key_Personnel, or storefronts not listed. ' +
  'Translate RetailVitality / magnitude into human language (busy counters, empty windows) — do not lead with raw engine decimals. ' +
  'One claim about how the block or the board is moving. Not civic process roundup. Not multi-voice business-desk average.';

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}
function loadText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (_) { return null; }
}

function extractSection(md, headingPrefix) {
  if (!md) return null;
  const re = new RegExp('^##\\s+' + headingPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^\\n]*$', 'mi');
  const m = md.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const next = rest.search(/^##\s+/m);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

function extractSubsection(body, heading) {
  if (!body) return null;
  const re = new RegExp('^###\\s+' + heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'mi');
  const m = body.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = body.slice(start);
  const next = rest.search(/^###\s+/m);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

/** Parse Neighborhood snapshot table → { name, sentiment, retail, events, crime } */
function parseNeighborhoodSnapshot(md) {
  const city = extractSection(md, 'City State') || '';
  // table may live under City State
  const out = [];
  const lines = (city || md || '').split('\n');
  let inTable = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^\| Neighborhood \|/i.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable && /^\|[-| :]+$/.test(line)) continue;
    if (inTable && !line.startsWith('|')) {
      if (out.length) break;
      continue;
    }
    if (!inTable || !line.startsWith('|')) continue;
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 3) continue;
    if (/^Neighborhood$/i.test(cols[0])) continue;
    const name = cols[0];
    const sentiment = parseFloat(cols[1]);
    const retail = parseFloat(cols[2]);
    out.push({
      name,
      sentiment: Number.isFinite(sentiment) ? sentiment : null,
      retail: Number.isFinite(retail) ? retail : null,
      eventAttractiveness: cols[3] != null && cols[3] !== '' ? parseFloat(cols[3]) : null,
      crime: cols[4] != null && cols[4] !== '' ? parseFloat(cols[4]) : null
    });
  }
  return out;
}

/**
 * Parse What Moved trajectory bullets:
 * - NEIGHBORHOOD_RISING | Downtown turning upward: ... | Downtown | mag 5 | targets Downtown
 */
function parseTrajectories(md) {
  const moved = extractSection(md, 'What Moved') || '';
  const traj = extractSubsection(moved, 'trajectory') || '';
  // also accept bare lines under What Moved if subsection missing
  const body = traj || moved;
  const out = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('-')) continue;
    if (!/NEIGHBORHOOD_(RISING|COOLING)/i.test(line)) continue;
    const rising = /NEIGHBORHOOD_RISING/i.test(line);
    const cooling = /NEIGHBORHOOD_COOLING/i.test(line);
    const parts = line.replace(/^-\s*/, '').split('|').map(s => s.trim());
    // kind | prose | hood | mag N | targets ...
    let hood = null;
    let mag = null;
    let prose = '';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (/^NEIGHBORHOOD_/i.test(p)) continue;
      if (/^mag\s+/i.test(p)) {
        const m = p.match(/mag\s+([-\d.]+)/i);
        if (m) mag = Number(m[1]);
        continue;
      }
      if (/^targets\s+/i.test(p)) continue;
      if (!prose && /turning upward|cooling off|retail|storefront|foot traffic/i.test(p)) {
        prose = p;
        continue;
      }
      // hood often a short token after prose
      if (!hood && p && p.length < 40 && !/mag|targets|NEIGHBORHOOD/i.test(p) &&
          !/turning|cooling|retail|storefronts|foot/i.test(p)) {
        hood = p;
      }
    }
    // fallback hood from prose
    if (!hood) {
      const hm = prose.match(/^([^:]+?)\s+(?:turning upward|cooling off)/i);
      if (hm) hood = hm[1].trim();
    }
    if (!hood && parts[2] && parts[2].length < 40) hood = parts[2];
    out.push({
      kind: rising ? 'rising' : cooling ? 'cooling' : 'trajectory',
      hood,
      mag: Number.isFinite(mag) ? mag : null,
      prose: prose || line.replace(/^-\s*/, '').slice(0, 160),
      raw: line
    });
  }
  return out;
}

/** initiative-implementation lines with retail/economic flavor */
function parseInitiativeEconomic(md) {
  const moved = extractSection(md, 'What Moved') || '';
  const sec = extractSubsection(moved, 'initiative-implementation') || '';
  const out = [];
  for (const raw of (sec || '').split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('-')) continue;
    if (!/retail|economic|workforce|stabilization|disbursement|construction|transit|nightlife/i.test(line)) {
      continue;
    }
    const parts = line.replace(/^-\s*/, '').split('|').map(s => s.trim());
    let hood = null;
    let mag = null;
    let prose = parts[1] || parts[0] || line;
    for (const p of parts) {
      if (/^mag\s+/i.test(p)) {
        const m = p.match(/mag\s+([-\d.]+)/i);
        if (m) mag = Number(m[1]);
      }
      if (/^targets\s+/i.test(p)) {
        hood = p.replace(/^targets\s+/i, '').split('|')[0].trim();
      }
    }
    // hood sometimes middle field
    if (!hood && parts[2] && parts[2].length < 40 && !/mag/i.test(parts[2])) hood = parts[2];
    out.push({
      kind: 'initiative-economic',
      hood,
      mag: Number.isFinite(mag) ? mag : null,
      prose: String(prose).slice(0, 200),
      raw: line
    });
  }
  return out;
}

/** Engine review math-imbalance with RetailVitality decay */
function parseRetailDecay(md) {
  const rev = extractSection(md, 'Engine Review Findings') ||
    extractSection(md, 'Engine Review') || '';
  const out = [];
  // **math-imbalance** — Downtown: decay [Sentiment -0.250, RetailVitality -1.04, ...]
  const re = /\*\*math-imbalance\*\*\s*—\s*([^:]+):\s*decay\s*\[([^\]]+)\]/gi;
  let m;
  while ((m = re.exec(rev))) {
    const hood = m[1].trim();
    const body = m[2];
    const retailM = body.match(/RetailVitality\s+([+\-0-9.]+)/i);
    const sentM = body.match(/Sentiment\s+([+\-0-9.]+)/i);
    if (!retailM && !/RetailVitality/i.test(body)) continue;
    out.push({
      kind: 'retail-decay',
      hood,
      retailDelta: retailM ? Number(retailM[1]) : null,
      sentimentDelta: sentM ? Number(sentM[1]) : null,
      evidence: body.slice(0, 160),
      raw: m[0]
    });
  }
  return out;
}

function parseNamedVenuesFromEvening(md) {
  const body = extractSection(md, 'Evening Texture') || (() => {
    if (!md) return null;
    const m = md.match(/^##\s+Evening Texture[^\n]*$/mi);
    if (!m) return null;
    const start = m.index + m[0].length;
    const rest = md.slice(start);
    const next = rest.search(/^##\s+/m);
    return (next < 0 ? rest : rest.slice(0, next)).trim();
  })();
  if (!body) return [];
  const venues = [];
  function grab(label, kind) {
    const re = new RegExp(
      '^-\\s+\\*\\*' + label + ':\\*\\*\\s*(.*)$',
      'mi'
    );
    const m = body.match(re);
    if (!m) return;
    const text = m[1];
    const vre = /\*\*([^*]+)\*\*(?:\s*\(([^)]+)\))?/g;
    let vm;
    while ((vm = vre.exec(text))) {
      venues.push({
        name: vm[1].trim(),
        hood: vm[2] ? vm[2].trim() : null,
        kind,
        source: 'evening-texture'
      });
    }
  }
  grab('Restaurants', 'restaurant');
  grab('Fast food', 'fast-food');
  grab('Nightlife', 'nightlife');
  return venues;
}

/**
 * Parse optional Business_Ledger disk export:
 *   BIZ-00001 | Name | Sector | Hood | Headcount
 * Headcount is snapshot-sourced only — never invent if missing.
 */
function loadBusinessLedger(root) {
  const candidates = [
    path.join(root, 'output', 'engine83_business_ledger.txt'),
    path.join(root, 'output', 'business_ledger.txt'),
    path.join(root, 'output', 'business_ledger_snapshot.txt')
  ];
  // also any business_ledger*.txt
  try {
    for (const f of fs.readdirSync(path.join(root, 'output'))) {
      if (/business.?ledger/i.test(f) && /\.txt$/i.test(f)) {
        candidates.push(path.join(root, 'output', f));
      }
    }
  } catch (_) { /* */ }

  const seen = new Set();
  const businesses = [];
  let sourceFile = null;
  for (const p of candidates) {
    if (seen.has(p)) continue;
    seen.add(p);
    const text = loadText(p);
    if (!text) continue;
    sourceFile = path.relative(root, p);
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 4) continue;
      if (!/^BIZ-/i.test(parts[0]) && !/^[A-Z0-9-]+$/.test(parts[0])) continue;
      const headcountRaw = parts[4];
      let headcount = null;
      if (headcountRaw != null && headcountRaw !== '' && headcountRaw !== '—') {
        const n = Number(String(headcountRaw).replace(/,/g, ''));
        if (Number.isFinite(n)) headcount = n;
      }
      businesses.push({
        bizId: parts[0],
        name: parts[1],
        sector: parts[2] || null,
        hood: parts[3] || null,
        // only when present on snapshot — never invent
        headcount: headcount,
        headcountSource: headcount != null ? sourceFile : null
      });
    }
    if (businesses.length) break;
  }
  return { businesses, sourceFile };
}

function parseBusinessSignals(signal) {
  const lane = (signal && signal.lanes && signal.lanes.business) || [];
  return lane.map(e => ({
    kind: e.kind || 'seed',
    causeType: e.causeType || null,
    label: e.label || '',
    angle: (e.handle && e.handle.angle) || e.label || '',
    hookLine: (e.handle && e.handle.hookLine) || null,
    hood: e.hood || null,
    popids: e.popids || [],
    citizens: (e.handle && e.handle.citizens) || [],
    ref: e.ref || null
  }));
}

function hoodKey(h) {
  return String(h || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function businessesInHood(ledger, hood) {
  if (!hood || !ledger || !ledger.length) return [];
  const k = hoodKey(hood);
  return ledger.filter(b => {
    const bh = hoodKey(b.hood);
    return bh === k || bh.includes(k) || k.includes(bh);
  });
}

function venuesInHood(venues, hood) {
  if (!hood || !venues || !venues.length) return [];
  const k = hoodKey(hood);
  return venues.filter(v => {
    const vh = hoodKey(v.hood);
    return vh === k || vh.includes(k) || k.includes(vh);
  });
}

/**
 * Emit scored economic pulses — named businesses only from ledger/evening.
 */
function emitEconomicPulses(ctx, cycle) {
  const {
    hoods, trajectories, initiatives, decays, venues, ledger, signals
  } = ctx;
  const pulses = [];
  const hoodByName = new Map((hoods || []).map(h => [hoodKey(h.name), h]));

  function add(p) {
    if (!p) return;
    p.cycle = Number(cycle);
    pulses.push(p);
  }

  // Trajectories with optional named businesses in hood
  for (const t of trajectories || []) {
    if (!t.hood) continue;
    const snap = hoodByName.get(hoodKey(t.hood));
    const biz = businessesInHood(ledger, t.hood).slice(0, 4);
    const ven = venuesInHood(venues, t.hood).slice(0, 3);
    const named = biz.map(b => b.name).concat(ven.map(v => v.name));
    const isCool = t.kind === 'cooling';
    const isRise = t.kind === 'rising';
    let score = isCool ? 18 : isRise ? 16 : 10;
    if (t.mag != null) score += Math.min(Math.abs(t.mag), 8);
    if (named.length) score += 6 + Math.min(named.length, 3);
    if (snap && snap.retail != null) {
      // extreme retail ends of the table
      if (snap.retail <= 5.5 && isCool) score += 4;
      if (snap.retail >= 10 && isRise) score += 3;
    }

    add({
      className: isCool ? 'hood-cooling' : isRise ? 'hood-rising' : 'hood-trajectory',
      score,
      label: t.hood + (isCool ? ' cooling' : isRise ? ' rising' : ' trajectory') +
        (named.length ? ' · ' + named.slice(0, 2).join(', ') : ''),
      hood: t.hood,
      mag: t.mag,
      retail: snap ? snap.retail : null,
      sentiment: snap ? snap.sentiment : null,
      namedBusinesses: named,
      businesses: biz,
      venues: ven,
      requiresName: false,
      source: 'world_summary ## What Moved · trajectory',
      angle: (isCool
        ? 'Storefronts quieter in ' + t.hood + ' — foot traffic down'
        : 'Retail turning upward in ' + t.hood + ' — busy counters, people moving in') +
        (named.length ? '; named on pack: ' + named.slice(0, 3).join(', ') : ''),
      hookLine: t.prose || (t.hood + (isCool ? ' is cooling.' : ' is rising.')),
      sceneBits: [
        'HOOD: ' + t.hood,
        isCool ? 'TRAJECTORY: cooling' : 'TRAJECTORY: rising',
        t.mag != null ? 'MAGNITUDE (translate, do not lead): ' + t.mag : null,
        snap && snap.retail != null ? 'RETAIL VITALITY (scene color): ' + snap.retail : null,
        named.length ? 'NAMED BUSINESSES (sources only): ' + named.join('; ') : 'NAMED BUSINESSES: none on disk for this hood — do not invent',
        ...biz.slice(0, 3).map(b =>
          'LEDGER: ' + b.bizId + ' ' + b.name +
          (b.sector ? ' · ' + b.sector : '') +
          (b.headcount != null ? ' · headcount ' + b.headcount + ' (snapshot)' : '')
        ),
        ...ven.slice(0, 2).map(v => 'EVENING VENUE: ' + v.name + ' (' + v.kind + ')')
      ].filter(Boolean)
    });
  }

  // Retail decay from engine review (math-imbalance with RetailVitality)
  for (const d of decays || []) {
    if (!d.hood) continue;
    const biz = businessesInHood(ledger, d.hood).slice(0, 3);
    const ven = venuesInHood(venues, d.hood).slice(0, 2);
    const named = biz.map(b => b.name).concat(ven.map(v => v.name));
    let score = 20;
    if (d.retailDelta != null && d.retailDelta < 0) score += Math.min(Math.abs(d.retailDelta) * 2, 8);
    if (named.length) score += 5;

    add({
      className: 'retail-decay',
      score,
      label: d.hood + ' retail decay' + (named.length ? ' · ' + named[0] : ''),
      hood: d.hood,
      retailDelta: d.retailDelta,
      sentimentDelta: d.sentimentDelta,
      namedBusinesses: named,
      businesses: biz,
      venues: ven,
      source: 'world_summary ## Engine Review · math-imbalance',
      angle: 'Retail vitality decay in ' + d.hood + ' without a matching initiative — ' +
        'what the storefront line feels like' +
        (named.length ? ' near ' + named.slice(0, 2).join(' / ') : ''),
      hookLine: d.hood + ' is losing retail heat on the map' +
        (d.retailDelta != null ? ' (RetailVitality ' + d.retailDelta + ' — translate only).' : '.'),
      sceneBits: [
        'HOOD: ' + d.hood,
        d.retailDelta != null ? 'RETAIL DELTA (do not lead with decimal): ' + d.retailDelta : null,
        named.length ? 'NAMED: ' + named.join('; ') : 'NAMED: none — do not invent storefronts',
        'EVIDENCE: ' + (d.evidence || '').slice(0, 120)
      ].filter(Boolean)
    });
  }

  // Initiative economic footprints
  for (const init of initiatives || []) {
    let score = 12 + (init.mag != null ? Math.min(Math.abs(init.mag) * 3, 6) : 0);
    const biz = init.hood ? businessesInHood(ledger, init.hood).slice(0, 3) : [];
    // Prefer matching initiative name in ledger
    const proseBiz = (ledger || []).filter(b =>
      init.prose && init.prose.toLowerCase().includes(String(b.name).toLowerCase().slice(0, 18))
    ).slice(0, 2);
    const namedBiz = proseBiz.length ? proseBiz : biz;
    const named = namedBiz.map(b => b.name);
    if (named.length) score += 6;

    add({
      className: 'initiative-economic',
      score,
      label: (named[0] || init.hood || 'initiative') + ' · economic footprint',
      hood: init.hood,
      mag: init.mag,
      namedBusinesses: named,
      businesses: namedBiz,
      source: 'world_summary ## What Moved · initiative-implementation',
      angle: init.prose,
      hookLine: init.prose,
      sceneBits: [
        init.hood ? 'HOOD: ' + init.hood : null,
        'INITIATIVE / EFFECT: ' + init.prose,
        named.length ? 'NAMED ORGS (ledger): ' + named.join('; ') : null
      ].filter(Boolean)
    });
  }

  // Named storefront pulses when venue sits in a hot/cool hood
  const trajHoods = new Map((trajectories || []).map(t => [hoodKey(t.hood), t]));
  for (const v of venues || []) {
    if (!v.name) continue;
    const t = v.hood ? trajHoods.get(hoodKey(v.hood)) : null;
    const snap = v.hood ? hoodByName.get(hoodKey(v.hood)) : null;
    let score = 14;
    if (t) score += t.kind === 'cooling' ? 6 : 4;
    if (snap && snap.retail != null && snap.retail <= 6) score += 3;

    add({
      className: 'named-storefront',
      score,
      label: v.name + (v.hood ? ' (' + v.hood + ')' : ''),
      hood: v.hood,
      namedBusinesses: [v.name],
      venues: [v],
      businesses: businessesInHood(ledger, v.hood).filter(b =>
        hoodKey(b.name) === hoodKey(v.name) ||
        String(b.name).toLowerCase().includes(String(v.name).toLowerCase().slice(0, 8))
      ).slice(0, 1),
      requiresName: true,
      named: v.name,
      source: 'world_summary ## Evening Texture + trajectory context',
      angle: 'Named ' + v.kind + ' ' + v.name +
        (v.hood ? ' in ' + v.hood : '') +
        (t ? (t.kind === 'cooling' ? ' against a cooling retail block' : ' on a rising retail block') : ''),
      hookLine: v.name + ' is on the evening board' + (v.hood ? ' in ' + v.hood : '') + '.',
      sceneBits: [
        'VENUE: ' + v.name,
        v.hood ? 'HOOD: ' + v.hood : null,
        'KIND: ' + v.kind,
        t ? 'TRAJECTORY: ' + t.kind : null,
        'Never invent Employee_Count or Key_Personnel for this room.'
      ].filter(Boolean)
    });
  }

  // Business desk_signal anomalies / workforce
  for (const s of signals || []) {
    const isWorkforce = /workforce|employment|labor|ailment|economic|transit|housing/i.test(
      s.angle + ' ' + s.label
    );
    if (!isWorkforce && s.kind !== 'anomaly') continue;
    let score = s.kind === 'anomaly' ? 15 : 10;
    const hood = s.hood ? String(s.hood).split(',')[0].trim() : null;
    const biz = hood ? businessesInHood(ledger, hood).slice(0, 3) : [];
    const named = biz.map(b => b.name);
    if (named.length) score += 4;
    if (/economic ailment|workforce/i.test(s.angle + s.label)) score += 4;

    add({
      className: /workforce|apprenticeship|employment/i.test(s.angle + s.label)
        ? 'workforce-pressure'
        : 'economic-ailment',
      score,
      label: (hood || 'city') + ' · ' + String(s.angle || s.label).slice(0, 80),
      hood,
      namedBusinesses: named,
      businesses: biz,
      popids: s.popids || [],
      citizens: s.citizens || [],
      source: s.ref || 'desk_signal lanes.business',
      angle: s.angle || s.label,
      hookLine: s.hookLine || s.label,
      sceneBits: [
        hood ? 'HOOD: ' + hood : null,
        'SIGNAL: ' + (s.angle || s.label),
        named.length ? 'NAMED (ledger, same hood): ' + named.join('; ') : 'NAMED: none — do not invent businesses',
        (s.citizens || []).length
          ? 'CITIZENS (packet only): ' + s.citizens.slice(0, 3).join('; ')
          : null
      ].filter(Boolean)
    });
  }

  pulses.sort((a, b) => b.score - a.score || String(a.className).localeCompare(b.className));
  return pulses;
}

function buildEconomicSlice(cycle, opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const cyc = Number(cycle);
  const summaryPath = path.join(root, 'output', 'world_summary_c' + cyc + '.md');
  const signalPath = path.join(root, 'output', 'desk_signal_c' + cyc + '.json');
  const summaryMd = o.summaryMd != null ? o.summaryMd : loadText(summaryPath);
  const signal = o.signal != null ? o.signal : loadJson(signalPath);

  const hoods = parseNeighborhoodSnapshot(summaryMd || '');
  const trajectories = parseTrajectories(summaryMd || '');
  const initiatives = parseInitiativeEconomic(summaryMd || '');
  const decays = parseRetailDecay(summaryMd || '');
  const venues = parseNamedVenuesFromEvening(summaryMd || '');
  const { businesses: ledger, sourceFile: ledgerSource } = o.ledger
    ? { businesses: o.ledger, sourceFile: 'opts' }
    : loadBusinessLedger(root);
  const signals = parseBusinessSignals(signal);

  const pulses = emitEconomicPulses({
    hoods, trajectories, initiatives, decays, venues, ledger, signals
  }, cyc);

  if (!pulses.length) {
    return {
      empty: true,
      cycle: cyc,
      kind: 'economic-storefront',
      reason: 'no-economic-signals',
      approach: ECONOMIC_APPROACH
    };
  }

  const top = pulses[0];
  const story = {
    angle: top.angle,
    label: top.label,
    hookLine: top.hookLine,
    hood: top.hood || null,
    pulseClass: top.className,
    namedBusinesses: top.namedBusinesses || [],
    citizens: top.citizens || [],
    popids: top.popids || [],
    ref: top.source || ('economic-slice-c' + cyc),
    cycle: cyc
  };

  return {
    empty: false,
    cycle: cyc,
    kind: 'economic-storefront',
    pulse: {
      className: top.className,
      score: top.score,
      label: top.label,
      hood: top.hood || null,
      namedBusinesses: top.namedBusinesses || [],
      retail: top.retail != null ? top.retail : null,
      retailDelta: top.retailDelta != null ? top.retailDelta : null
    },
    story,
    approach: ECONOMIC_APPROACH,
    prewrite: {
      pulseClass: top.className,
      angle: top.angle,
      hookLine: top.hookLine,
      namedBusinesses: top.namedBusinesses || [],
      anchorFacts: (top.sceneBits || []).slice(0, 8),
      forbidden: [
        'Do not invent Employee_Count',
        'Do not invent Key_Personnel',
        'Do not invent storefronts not on ledger or evening texture',
        'Do not lead with raw RetailVitality decimals — translate to scene'
      ]
    },
    texture: {
      hoodCount: hoods.length,
      rising: trajectories.filter(t => t.kind === 'rising').map(t => t.hood),
      cooling: trajectories.filter(t => t.kind === 'cooling').map(t => t.hood),
      venues: venues.slice(0, 12),
      ledgerCount: ledger.length,
      ledgerSource: ledgerSource,
      topRetail: hoods.slice().sort((a, b) => (b.retail || 0) - (a.retail || 0)).slice(0, 5),
      bottomRetail: hoods.slice().sort((a, b) => (a.retail || 0) - (b.retail || 0)).slice(0, 5)
    },
    signals: {
      businessLaneCount: signals.length,
      sample: signals.slice(0, 5)
    },
    candidates: pulses.slice(0, 12).map(p => ({
      className: p.className,
      score: p.score,
      label: p.label,
      hood: p.hood || null,
      namedBusinesses: p.namedBusinesses || []
    })),
    pulses: pulses.slice(0, 20),
    scene: {
      colorRoom:
        'Storefront light, foot traffic, open/closed shutters. Named places only from ledger or evening texture. ' +
        'Headcount only when snapshot lists it. No invented owners or employee counts.',
      namedOnTop: top.namedBusinesses || []
    },
    pointers: [
      'output/world_summary_c' + cyc + '.md ## What Moved / Neighborhood snapshot',
      'output/desk_signal_c' + cyc + '.json lanes.business',
      ledgerSource || null,
      'docs/plans/2026-08-08-journalist-heat-slice-packs.md Task 2'
    ].filter(Boolean)
  };
}

function formatEconomicSliceMarkdown(slice) {
  if (!slice || slice.empty) {
    return '# SLICE — economic / storefront (EMPTY)\n\n_No economic signals for this cycle._\n';
  }
  const L = [];
  L.push('# SLICE — economic / storefront (business desk pack)');
  L.push('');
  L.push('Cycle **C' + slice.cycle + '** · kind `' + slice.kind + '`');
  L.push('');
  L.push('## TOP PULSE');
  L.push('- **Class:** ' + slice.pulse.className);
  L.push('- **Score:** ' + slice.pulse.score);
  L.push('- **Label:** ' + slice.pulse.label);
  if (slice.pulse.hood) L.push('- **Hood:** ' + slice.pulse.hood);
  if ((slice.pulse.namedBusinesses || []).length) {
    L.push('- **Named businesses:** ' + slice.pulse.namedBusinesses.join('; '));
  }
  L.push('');
  L.push('## PREWRITE');
  L.push('- Angle: ' + slice.prewrite.angle);
  L.push('- Hook: ' + slice.prewrite.hookLine);
  L.push('Anchor facts:');
  for (const a of slice.prewrite.anchorFacts || []) L.push('  - ' + a);
  L.push('Forbidden:');
  for (const f of slice.prewrite.forbidden || []) L.push('  - ' + f);
  L.push('');
  L.push('## APPROACH');
  L.push(slice.approach);
  L.push('');
  L.push('## CITY ECONOMIC TEXTURE');
  if (slice.texture) {
    L.push('**Rising:** ' + (slice.texture.rising || []).join('; '));
    L.push('**Cooling:** ' + (slice.texture.cooling || []).join('; '));
    if (slice.texture.ledgerSource) {
      L.push('**Business ledger:** ' + slice.texture.ledgerCount + ' rows from `' +
        slice.texture.ledgerSource + '`');
    } else {
      L.push('**Business ledger:** none on disk (venues from evening texture only)');
    }
    if ((slice.texture.venues || []).length) {
      L.push('**Evening venues:** ' +
        slice.texture.venues.map(v => v.name + (v.hood ? ' (' + v.hood + ')' : '')).join('; '));
    }
    if ((slice.texture.bottomRetail || []).length) {
      L.push('**Lowest retail vitality:** ' +
        slice.texture.bottomRetail.map(h => h.name + ' ' + h.retail).join('; '));
    }
  }
  L.push('');
  L.push('## BUSINESS LANE SEEDS');
  L.push('count: ' + (slice.signals && slice.signals.businessLaneCount));
  for (const s of (slice.signals && slice.signals.sample) || []) {
    L.push('- ' + String(s.angle || s.label).slice(0, 120));
  }
  L.push('');
  L.push('## SCENE COLOR');
  if (slice.scene && slice.scene.colorRoom) L.push(slice.scene.colorRoom);
  L.push('');
  L.push('## OTHER CANDIDATES');
  for (const c of slice.candidates || []) {
    L.push('- [' + c.score + '] ' + c.className + ' — ' + c.label +
      ((c.namedBusinesses || []).length ? ' · ' + c.namedBusinesses.slice(0, 2).join(', ') : ''));
  }
  L.push('');
  L.push('## POINTERS');
  for (const p of slice.pointers || []) L.push('- ' + p);
  L.push('');
  L.push('_Generated by scripts/buildEconomicSlice.js — no LLM. Never invent employees or storefronts._');
  return L.join('\n') + '\n';
}

function slicePaths(cycle, root) {
  const r = root || ROOT;
  return {
    md: path.join(r, 'output', 'slices', 'c' + cycle, 'economic.md'),
    json: path.join(r, 'output', 'cron-compare', 'economic_slice_c' + cycle + '.json')
  };
}

function writeEconomicSlice(cycle, slice, root) {
  const paths = slicePaths(cycle, root);
  fs.mkdirSync(path.dirname(paths.md), { recursive: true });
  fs.mkdirSync(path.dirname(paths.json), { recursive: true });
  fs.writeFileSync(paths.json, JSON.stringify(slice, null, 2));
  fs.writeFileSync(paths.md, formatEconomicSliceMarkdown(slice));
  return paths;
}

function loadEconomicSlice(cycle, root) {
  const paths = slicePaths(cycle, root);
  const j = loadJson(paths.json);
  if (j && !j.empty) return j;
  const slice = buildEconomicSlice(cycle, { root: root || ROOT });
  if (!slice.empty) writeEconomicSlice(cycle, slice, root);
  return slice.empty ? null : slice;
}

function isBusinessDesk(assign) {
  if (!assign) return false;
  if (String(assign.desk || '').toLowerCase() === 'business') return true;
  if (assign.beatDomain === 'ECONOMIC' || assign.beatDomain === 'GENERAL') {
    // only when already on business desk slot
    return String(assign.desk || '').toLowerCase() === 'business';
  }
  return false;
}

function assignmentFromSlice(slice, assign) {
  if (!slice || slice.empty) return null;
  return {
    desk: 'business',
    name: (assign && assign.name) || 'Business desk',
    popid: (assign && assign.popid) || null,
    beatDomain: (assign && assign.beatDomain) || 'ECONOMIC',
    persona: (assign && assign.persona) || null,
    approach: slice.approach,
    story: slice.story,
    economicSlice: true,
    pulse: slice.pulse,
    prewrite: slice.prewrite
  };
}

function enrichAssignment(assign, cycle, root) {
  if (!isBusinessDesk(assign)) return assign;
  try {
    const slice = loadEconomicSlice(cycle, root);
    if (!slice || slice.empty) return assign;
    const from = assignmentFromSlice(slice, assign);
    return Object.assign({}, assign, {
      approach: from.approach,
      story: from.story || assign.story,
      economicSlice: true,
      pulse: from.pulse,
      prewrite: from.prewrite
    });
  } catch (_) {
    return assign;
  }
}

if (require.main === module) {
  const cycle = arg('--cycle', null) || (() => {
    try {
      return require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ soft: true, noArgv: true });
    } catch (_) { return null; }
  })();
  if (cycle == null) {
    console.error('buildEconomicSlice: pass --cycle N');
    process.exit(1);
  }
  const slice = buildEconomicSlice(cycle);
  const paths = writeEconomicSlice(cycle, slice);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(slice, null, 2));
  } else {
    console.log('economic slice c' + cycle +
      (slice.empty ? ' EMPTY' :
        ' pulse=' + slice.pulse.className +
        ' score=' + slice.pulse.score +
        ' hood=' + (slice.pulse.hood || '—') +
        ' named=' + ((slice.pulse.namedBusinesses || []).length) +
        ' candidates=' + (slice.candidates || []).length));
    if (!slice.empty) {
      console.log('  ' + String(slice.pulse.label).slice(0, 120));
      if ((slice.pulse.namedBusinesses || []).length) {
        console.log('  businesses: ' + slice.pulse.namedBusinesses.slice(0, 4).join(', '));
      }
    }
    console.log('→ ' + path.relative(ROOT, paths.md));
    console.log('→ ' + path.relative(ROOT, paths.json));
  }
}

module.exports = {
  buildEconomicSlice,
  writeEconomicSlice,
  loadEconomicSlice,
  formatEconomicSliceMarkdown,
  assignmentFromSlice,
  enrichAssignment,
  isBusinessDesk,
  slicePaths,
  parseNeighborhoodSnapshot,
  parseTrajectories,
  parseInitiativeEconomic,
  parseRetailDecay,
  parseNamedVenuesFromEvening,
  loadBusinessLedger,
  emitEconomicPulses,
  ECONOMIC_APPROACH
};
