'use strict';
/**
 * scripts/gridiron.js — Gridiron Analytics, Oakland's sports data house (pipeline.111; builder 2026-11-24: "this is who
 * gridiron analytics is , we will officially make them the buisness that is the handling out Oakland sports data …
 * each data agent has a specific responsibility and return to the orchestrator to present to the sports media cron").
 *
 * One front door, five analysts. A question comes in; code reads which record it is about (route) and hands it to the
 * analyst who answers for that record. The analyst wakes on the worker template (scripts/workerWake.js buildWake) as
 * the citizen they are: their ledger line, their memory, their own record in front of them, the house's other four
 * records a read away (record_read), and the worker tools (sheet_read, citizen_lookup, canon_recall, memory_recall).
 * A question no record covers gets no analyst and no model call.
 *
 * Records (built here from output/gridiron/cards.json — scripts/gridironCards.js — and the sheets):
 *   GIA-HITTING   Dawson Nguyen, Sports Analytics Lead — the A's hitters: hand, splits, plate skills, seasons
 *   GIA-PITCHING  Wesley Clark, Sports Analytics Lead — the A's pitchers: role, stamina, pitches, seasons; the pitching staff
 *   GIA-ROSTER    Daniel Yoon, Co-Founder — the A's roster and money: contracts by year, options, service, the staff's pay, the budget
 *   GIA-OAKS      Jade Soy, Data Analyst — the Oaks: the roster tab and the season on the sports feed
 *   GIA-RECORD    Christine Nakamura, Co-Founder — what the Tribune has printed on Oakland sports
 * Ariana Reyes (also at Gridiron) holds a Tribune seat and is not one of the five.
 *
 * Season rule (builder 2026-11-24): 2041 is the last completed season; 2042 is the season ahead. Season lines are by
 * year; age, overall, contract and roster status are as of now.
 *
 *   route(question) -> { officeId, why } | { officeId: null, why }
 *   ask({ question, asker: { name, beat }, cycle }) -> { officeId, popid, name, title, text, finish, records, toolReads }
 *   ASK_TOOL — the tool a reporter is shown
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CARDS = path.join(ROOT, 'output', 'gridiron', 'cards.json');
const MODEL = 'deepseek/deepseek-v4.1-flash-1017';   // the city workers' model (civic-office-map.json)

const HOUSE = 'Gridiron Analytics';
const ANALYSTS = [
  { officeId: 'GIA-HITTING', popid: 'POP-00347', title: 'Sports Analytics Lead, Gridiron Analytics',
    job: 'You lead the hitting analysis at Gridiron Analytics, Oakland\'s sports data house. Your job is to answer for the A\'s hitters — each hitter\'s hand and how he hits right- and left-handed pitching, his plate skills, speed and glove, his seasons, and where he fits in a lineup — when the Tribune or anyone in the game asks.' },
  { officeId: 'GIA-PITCHING', popid: 'POP-00461', title: 'Sports Analytics Lead, Gridiron Analytics',
    job: 'You lead the pitching analysis at Gridiron Analytics, Oakland\'s sports data house. Your job is to answer for the A\'s pitchers — each arm\'s role, stamina, pitches and command, his seasons, and how the rotation and the bullpen line up — when the Tribune or anyone in the game asks.' },
  { officeId: 'GIA-ROSTER', popid: 'POP-01107', title: 'Co-Founder, Gridiron Analytics',
    job: 'You co-founded Gridiron Analytics, Oakland\'s sports data house. Your job is to answer for the A\'s roster and its money — every player\'s contract year by year, his options and service time, who is on the 40-man and who is in Las Vegas, the coaches\' pay and terms, the budget, and what a player is worth in a trade — when the Tribune or anyone in the game asks.' },
  { officeId: 'GIA-OAKS', popid: 'POP-00434', title: 'Data Analyst, Gridiron Analytics',
    job: 'You are a data analyst at Gridiron Analytics, Oakland\'s sports data house, and the Oaks are yours. Your job is to answer for the Oaks\' record — the roster and each player\'s numbers, and the season as it has gone game by game — when the Tribune or anyone in the game asks.' },
  { officeId: 'GIA-RECORD', popid: 'POP-01108', title: 'Co-Founder, Gridiron Analytics',
    job: 'You co-founded Gridiron Analytics, Oakland\'s sports data house, and you keep its library. Your job is to answer for what the Tribune has printed on Oakland sports — who wrote what, in which Cycle, and what it said — when the Tribune or anyone in the game asks.' },
];
const byOffice = (id) => ANALYSTS.find((a) => a.officeId === id) || null;

// ---- the records ----
function loadCards() {
  try { return JSON.parse(fs.readFileSync(CARDS, 'utf8')); } catch (e) { return null; }
}
const fmt3 = (v) => (typeof v === 'number' && v < 1 && v > 0 ? v.toFixed(3).replace(/^0/, '') : String(v));
const levelOf = (p) => {
  const t = String(p.team || '') + ' ' + String((p.roster || {}).Level || '');
  if (p.status === 'inactive') return 'gone';
  if (/AAA|Aviators/i.test(t) || /^NO$/i.test(String((p.roster || {})['On Active Roster'] || ''))) return 'AAA';
  return 'MLB';
};
const ATTR_WORDS = { 'CON R': 'contact vs RHP', 'CON L': 'contact vs LHP', 'POW R': 'power vs RHP', 'POW L': 'power vs LHP', VIS: 'vision', DISC: 'discipline',
  CLT: 'clutch', BUNT: 'bunting', DBUNT: 'drag bunting', DUR: 'durability', FLD: 'fielding', ARM: 'arm', ACC: 'arm accuracy', REAC: 'reaction', SPD: 'speed',
  STEAL: 'stealing', 'BR AGG': 'baserunning aggression', BLK: 'blocking', STA: 'stamina', 'H/9': 'hits allowed', 'K/9': 'strikeouts', 'BB/9': 'walks',
  'HR/9': 'home runs allowed', PCLT: 'clutch', CTRL: 'control', VEL: 'velocity', BRK: 'break' };
const changes = (p) => {
  const c = Object.entries(p.attributeChange || {});
  return c.length ? 'Ratings moved since last season: ' + c.map(([k, v]) => (ATTR_WORDS[k] || k) + ' ' + (v > 0 ? '+' : '') + v).join(', ') : '';
};
const profileBits = (p) => {
  const f = p.profile || {};
  return [p.position + (f['Secondary Position'] && !/^none$/i.test(f['Secondary Position']) ? ' (also ' + f['Secondary Position'] + ')' : ''),
    'bats ' + (f.Bats || '?') + ', throws ' + (f.Throws || '?'), 'age ' + f.Age, 'overall ' + f.Overall + (p.trend ? ' (trending ' + p.trend + ')' : ''),
    'potential ' + f.Potential].join(', ');
};
const nameOf = (p) => p.name + (p.popid ? ' (' + p.popid + ')' : '');

function hitterLine(p) {
  const a = p.attributes || {};
  const seasons = (p.seasons || []).filter((s) => Number(s.G) > 0).slice(0, 3).map((s) => {
    const adv = (p.advanced || []).find((x) => x.YEAR === s.YEAR && x.TEAM === s.TEAM) || {};
    return s.YEAR + ' ' + s.TEAM + ': ' + s.G + ' G, ' + [s.AVG, s.OBP, s.SLG].map(fmt3).join('/') + ', ' + s.HR + ' HR, ' + s.RBI + ' RBI, ' + s.SB + ' SB, ' + s.BB + ' BB, ' + s.SO + ' SO' + (adv.WAR != null ? ', ' + adv.WAR + ' WAR' : '');
  });
  return '- ' + nameOf(p) + ' — ' + profileBits(p) + '. Ratings: contact vs RHP ' + a['CON R'] + ', vs LHP ' + a['CON L'] + '; power vs RHP ' + a['POW R'] + ', vs LHP ' + a['POW L'] +
    '; vision ' + a.VIS + ', discipline ' + a.DISC + ', clutch ' + a.CLT + ', speed ' + a.SPD + ', stealing ' + a.STEAL + ', fielding ' + a.FLD + ', arm ' + a.ARM + ', durability ' + a.DUR + '.' +
    (changes(p) ? ' ' + changes(p) + '.' : '') + (p.profile && p.profile['Hitter Tendency'] ? ' Hits to: ' + String(p.profile['Hitter Tendency']).toLowerCase() + '.' : '') +
    (p.quirks.length ? ' Quirks: ' + p.quirks.join('; ') + '.' : '') +
    (seasons.length ? ' Seasons: ' + seasons.join('; ') + '.' : ' No major-league seasons.');
}
function pitcherLine(p) {
  const a = p.attributes || {};
  const seasons = (p.seasons || []).filter((s) => Number(s.G) > 0).slice(0, 3).map((s) => {
    const adv = (p.advanced || []).find((x) => x.YEAR === s.YEAR && x.TEAM === s.TEAM) || {};
    return s.YEAR + ' ' + s.TEAM + ': ' + s.G + ' G, ' + s.GS + ' GS, ' + s.W + '-' + s.L + ', ' + s.SV + ' SV, ' + s.IP + ' IP, ' + s.ERA + ' ERA, ' + s.SO + ' SO, ' + s.BB + ' BB' +
      (adv.WHIP != null ? ', ' + adv.WHIP + ' WHIP, ' + adv.FIP + ' FIP, ' + adv.WAR + ' WAR' : '');
  });
  return '- ' + nameOf(p) + ' — ' + profileBits(p) + '. Pitches: ' + (p.pitches.length ? p.pitches.join(', ') : 'not on record') + '. Ratings: stamina ' + a.STA + ', hits allowed ' + a['H/9'] + ', strikeouts ' + a['K/9'] +
    ', walks ' + a['BB/9'] + ', home runs allowed ' + a['HR/9'] + ', clutch ' + a.PCLT + ', control ' + a.CTRL + ', velocity ' + a.VEL + ', break ' + a.BRK + '.' +
    (changes(p) ? ' ' + changes(p) + '.' : '') + (p.quirks.length ? ' Quirks: ' + p.quirks.join('; ') + '.' : '') +
    (seasons.length ? ' Seasons: ' + seasons.join('; ') + '.' : ' No major-league seasons.');
}
const RATING_NOTE = 'Ratings run 0-100; higher is better on every one (a pitcher\'s "walks" or "home runs allowed" rating is high when he allows few). Season lines are by year; 2041 is the last completed season and 2042 is the season ahead. Age, overall and potential are as of now.';

function hittingRecord(cards) {
  const ps = cards.teams.As.players.filter((p) => p.kind === 'batter');
  const at = (lvl) => ps.filter((p) => levelOf(p) === lvl).map(hitterLine);
  return [RATING_NOTE, '', 'The A\'s hitters in the majors:', ...at('MLB'), '', 'In Las Vegas (AAA):', ...at('AAA'), '',
    'Gone: ' + ps.filter((p) => levelOf(p) === 'gone').map((p) => p.name + ' — ' + (p.notes.join('; ') || 'no longer with the club')).join(' | ')].join('\n');
}
function staffLines(cards, roles) {
  const st = (cards.teams.As.staff || { staff: [] }).staff.filter((s) => !roles || roles.test(s.role));
  return st.map((s) => '- ' + s.Name + ', ' + s.role.toLowerCase() + ': ' + s.YearsLeft + ' year(s) left, ' + s.Salary + (Object.keys(s.boosts).length ? '; lifts ' + Object.entries(s.boosts).map(([k, v]) => k + ' ' + v).join(', ') : ''));
}
function pitchingRecord(cards) {
  const ps = cards.teams.As.players.filter((p) => p.kind === 'pitcher');
  const at = (lvl) => ps.filter((p) => levelOf(p) === lvl).map(pitcherLine);
  return [RATING_NOTE, '', 'The A\'s pitchers in the majors:', ...at('MLB'), '', 'In Las Vegas (AAA):', ...(at('AAA').length ? at('AAA') : ['- none on record']), '',
    'Gone: ' + ps.filter((p) => levelOf(p) === 'gone').map((p) => p.name + ' — ' + (p.notes.join('; ') || 'no longer with the club')).join(' | '), '',
    'The staff who work the arms:', ...staffLines(cards, /MANAGER|PITCHING|FARM/)].join('\n');
}
function rosterRecord(cards) {
  const ps = cards.teams.As.players;
  const line = (p) => {
    const r = p.roster || {}, f = p.profile || {};
    const played = new Set((p.seasons || []).filter((x) => Number(x.G) > 0).map((x) => x.YEAR + x.TEAM));
    const last = (p.advanced || []).find((x) => played.has(x.YEAR + x.TEAM)) || {};
    const opt = String(r['Minor League Option'] || r['Minor League Options'] || '');
    const om = opt.match(/(\d)\s*\/\s*(\d)\s*used/i);
    const options = om ? 'minor-league options used ' + om[1] + ' of ' + om[2] + ' (' + (Number(om[2]) - Number(om[1])) + ' left)' : (opt ? 'minor-league options: ' + opt : '');
    const contract = Object.entries(p.contract || {}).map(([y, v]) => y + ' ' + v).join(', ');
    return '- ' + nameOf(p) + ' — ' + p.position + ', age ' + f.Age + ', overall ' + f.Overall + ', potential ' + f.Potential + ', ' + levelOf(p) +
      (f['MLB Service'] != null ? ', service ' + f['MLB Service'] : '') + '. Contract: ' + (contract || 'not on record') +
      (r['On 40-Man Roster'] ? '. 40-man: ' + r['On 40-Man Roster'] : '') + (options ? ', ' + options : '') +
      (r['Contract Option'] && !/^none$/i.test(r['Contract Option']) ? ', option ' + r['Contract Option'] : '') +
      (last.WAR != null ? '. Last season ' + last.YEAR + ': ' + last.WAR + ' WAR' : '') + (p.awards.length ? '. Awards: ' + p.awards.join('; ') : '') + (p.notes.length ? '. ' + p.notes.join('; ') : '') + '.';
  };
  const st = cards.teams.As.staff || { money: {} };
  return ['Contracts are by year; 2042 is the season ahead. Service is years.service-days in the majors.', '',
    'Majors:', ...ps.filter((p) => levelOf(p) === 'MLB').map(line), '', 'Las Vegas (AAA):', ...ps.filter((p) => levelOf(p) === 'AAA').map(line), '',
    'Gone:', ...ps.filter((p) => levelOf(p) === 'gone').map(line), '', 'The staff (' + (st.season || '2042') + '):', ...staffLines(cards), '',
    'The money: ' + Object.entries(st.money || {}).map(([k, v]) => k.toLowerCase() + ' ' + v).join('; ')].join('\n');
}

async function oaksRecord(deps) {
  const sheets = (deps && deps.sheets) || require('../lib/sheets');
  const out = [];
  try {
    const rows = await sheets.getSheetAsObjects('Oaks_Roster');
    const cols = rows.length ? Object.keys(rows[0]) : [];
    out.push('The Oaks roster (' + cols.join(', ') + '):', ...rows.filter((r) => r.First || r.Last).map((r) => '- ' + cols.map((c) => String(r[c] == null ? '' : r[c]).trim()).join(' | ')));
  } catch (e) { out.push('(the Oaks roster could not be read: ' + e.message + ')'); }
  try {
    const feed = require('../lib/feedPrivacy').publicFeedRows(await sheets.getSheetAsObjects('Oakland_Sports_Feed')).filter((r) => /oaks/i.test(String(r.TeamsUsed || '')));
    out.push('', 'The Oaks on the sports feed, newest first (Cycle | type | what happened | stats | record):',
      ...feed.reverse().map((r) => '- C' + r.Cycle + ' | ' + r.EventType + ' | ' + String(r.Notes || '').trim() + (r.Stats ? ' | ' + String(r.Stats).trim() : '') + (r['Team Record'] ? ' | ' + r['Team Record'] : '')));
  } catch (e) { out.push('(the sports feed could not be read: ' + e.message + ')'); }
  return out.join('\n');
}

// The A's on the sports feed: what has happened, week by week — every analyst's to read (builder 2026-11-24: "if the feed
// is cheaper to pull in this way is should be added … gridiron purpose to to serve the media with its data").
async function asFeedRecord(deps) {
  const sheets = (deps && deps.sheets) || require('../lib/sheets');
  try {
    const feed = require('../lib/feedPrivacy').publicFeedRows(await sheets.getSheetAsObjects('Oakland_Sports_Feed')).filter((r) => /\bA['’]s\b|athletics/i.test(String(r.TeamsUsed || '')));
    return ['The A\'s on the sports feed, newest first (Cycle | season | type | who | what happened | stats | record):',
      ...feed.reverse().map((r) => '- C' + r.Cycle + ' | ' + (r.SeasonType || '') + ' | ' + r.EventType + ' | ' + String(r.NamesUsed || '').trim() + ' | ' + String(r.Notes || '').replace(/\s+/g, ' ').trim() +
        (r.Stats ? ' | ' + String(r.Stats).trim() : '') + (r['Team Record'] ? ' | ' + r['Team Record'] : ''))].join('\n');
  } catch (e) { return '(the sports feed could not be read: ' + e.message + ')'; }
}

const SPORTS_DESK = /sport|oaks|a.s beat|bulls|fan col|fan voice|long view|historian|dynasty|undocked|analytics|sideline|beat report/i;
function printedRecord(window) {
  let rows = [];
  try { rows = fs.readFileSync(path.join(ROOT, 'archive', 'ARTICLE_INDEX.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)); } catch (e) { return '(the archive index could not be read: ' + e.message + ')'; }
  const sports = rows.filter((r) => SPORTS_DESK.test(String(r.desk || '')) && !/chicago|skyline|bulls/i.test(String(r.desk || '')));
  const withC = sports.filter((r) => r.cycle != null).sort((a, b) => b.cycle - a.cycle);
  const newest = withC.length ? withC[0].cycle : null;
  const shown = window && newest != null ? withC.filter((r) => r.cycle > newest - window * 4) : withC.concat(sports.filter((r) => r.cycle == null));
  return ['What the Tribune has printed on Oakland sports, newest first (Cycle | headline | byline | desk). The words of a piece are a canon_recall away.',
    ...shown.map((r) => '- ' + (r.cycle != null ? 'C' + r.cycle : 'before the Cycles') + ' | ' + String(r.title || '').replace(/\s+/g, ' ').slice(0, 140) + ' | ' + (r.bylineName || r.byline || '?') + ' | ' + r.desk)].join('\n');
}

const FEED_TITLE = 'The A\'s on the sports feed';
const RECORD_TITLES = { 'GIA-HITTING': 'The A\'s hitters', 'GIA-PITCHING': 'The A\'s pitchers', 'GIA-ROSTER': 'The A\'s roster and money', 'GIA-OAKS': 'The Oaks', 'GIA-RECORD': 'What the Tribune has printed' };
async function recordOf(officeId, cards, ctx) {
  if (officeId === 'GIA-HITTING') return hittingRecord(cards);
  if (officeId === 'GIA-PITCHING') return pitchingRecord(cards);
  if (officeId === 'GIA-ROSTER') return rosterRecord(cards);
  if (officeId === 'GIA-OAKS') return oaksRecord(ctx && ctx.deps);
  if (officeId === 'GIA-RECORD') return printedRecord(ctx && ctx.window);
  throw new Error('no record for ' + officeId);
}

// ---- the router: which record a question is about. Code, no model. ----
const WORDS = {
  'GIA-RECORD': /\b(printed|published|wrote|written|article|column|piece|headline|byline|tribune (said|ran|wrote)|covered|coverage|what did .* say)\b/i,
  'GIA-ROSTER': /\b(contract|salary|salaries|paid|payroll|budget|money|trade|trades|traded|trade bait|deal|free agen\w*|arbitration|arb|options?|service time|40-man|waivers?|extension|re-?sign\w*|worth|value|cost|coach(es|ing)? (pay|contract))\b/i,
  'GIA-PITCHING': /\b(ace|aces|rotation|starts|start(?:s|ing)? (?:on|friday|saturday|sunday|monday|tuesday|wednesday|thursday|tonight|game)|starter|starters|starting pitcher|bullpen|closer|reliever|relief|setup|pitch(er|ers|ing)?|arm|arms|innings|era|fip|whip|strikeouts?|stamina|velocity|fastball|slider|curve\w*|changeup)\b/i,
  'GIA-HITTING': /\b(lineup|batting order|lead ?-?off|clean-?up|platoon|hitter|hitters|hitting|bat|bats|batting|lefties|righties|left-handed|right-handed|splits?|on-base|obp|slugging|ops|home runs?|homers?|steals?|stolen|defen[cs]e|glove|catcher|shortstop|outfield\w*|infield\w*|dh)\b/i,
  'GIA-OAKS': /\b(oaks|nba|basketball|points|rebounds|assists|starting five|bench|minutes|three-point|3-point|playoff seeding)\b/i,
};
function route(question, cards) {
  const q = String(question || '');
  const hits = Object.keys(WORDS).filter((k) => WORDS[k].test(q));
  // a name on the A's cards points at its record (a pitcher at pitching, a hitter at hitting), unless the question is about money or print
  const c = cards || loadCards();
  const named = c ? c.teams.As.players.filter((p) => p.name && new RegExp('\\b' + p.name.split(' ').slice(-1)[0] + '\\b', 'i').test(q)) : [];
  for (const first of ['GIA-RECORD', 'GIA-ROSTER', 'GIA-OAKS']) if (hits.includes(first)) return { officeId: first, why: 'the question is about ' + RECORD_TITLES[first].toLowerCase() };
  if (named.length) {
    const kind = named[0].kind;
    return { officeId: kind === 'pitcher' ? 'GIA-PITCHING' : 'GIA-HITTING', why: 'names ' + named.map((p) => p.name).join(', ') };
  }
  if (hits.includes('GIA-PITCHING')) return { officeId: 'GIA-PITCHING', why: 'the question is about pitching' };
  if (hits.includes('GIA-HITTING')) return { officeId: 'GIA-HITTING', why: 'the question is about hitting' };
  return { officeId: null, why: 'no Gridiron record covers it' };
}

// ---- the wake: the worker template, with Gridiron's analysts registered on it ----
function register(cards) {
  const W = require('./workerWake');
  for (const a of ANALYSTS) {
    W.JOBS[a.officeId] = a.job;
    W.FILLS[a.officeId] = { key: RECORD_TITLES[a.officeId], levers: [],
      build: async (cycle, ctx) => ({ blocks: [{ title: RECORD_TITLES[a.officeId], text: await recordOf(a.officeId, cards, ctx) }], key: RECORD_TITLES[a.officeId] }) };
  }
  return { offices: ANALYSTS.map((a) => ({ officeId: a.officeId, title: a.title, popid: a.popid, answersOnly: true, model: MODEL })) };
}

async function buildAsk({ officeId, question, asker, cycle, date }) {
  const cards = loadCards();
  if (!cards) throw new Error('no Gridiron record on disk: run node scripts/gridironCards.js');
  const W = require('./workerWake');
  const officeMap = register(cards);
  const askerLine = String(asker && asker.name || 'A reporter') + (asker && asker.outlet ? ', ' + asker.outlet : ', Bay Tribune') + (asker && asker.beat ? ' (' + asker.beat + ')' : '');
  const w = await W.buildWake({ officeId, cycle: Number(cycle), officeMap, question, askerLine, date: date || new Date().toISOString().slice(0, 10) });
  // the house's other records, a read away
  for (const a of ANALYSTS) if (a.officeId !== officeId) w.records[RECORD_TITLES[a.officeId]] = await recordOf(a.officeId, cards, {});
  w.records[FEED_TITLE] = await asFeedRecord();
  return { w, W };
}

async function ask({ question, asker, cycle, date, officeId: forced, dryRun }) {
  const q = String(question || '').trim();
  if (!q) return { officeId: null, text: 'ask a question', finish: 'no-question' };
  const r = forced ? { officeId: forced, why: 'asked for by office' } : route(q);
  if (!r.officeId) return { officeId: null, route: r, text: HOUSE + ' does not hold a record on that.', finish: 'no-record' };
  const who = byOffice(r.officeId);
  const { w, W } = await buildAsk({ officeId: r.officeId, question: q, asker, cycle, date });
  if (dryRun) return { officeId: r.officeId, route: r, popid: who.popid, system: w.system, user: w.user, records: w.records };
  const dw = require('./cron-desk-writer');
  const toolset = W.toolsFor(r.officeId, { records: w.records }).filter((t) => !/_set$/.test(t.function.name));
  const base = W.toolExecutor({ popid: who.popid, cycle: Number(cycle), stage: { patrol: [] }, records: w.records, dw });
  const toolReads = [];
  const exec = async (name, input) => { const out = await base(name, input); toolReads.push({ name, input, out: String(out || '') }); return out; };
  const res = await dw.openRouterToolLoop({ model: MODEL, system: w.system, user: w.user, toolset, exec,
    maxToolCalls: 6, timeoutMs: 150000, answerLateToolCalls: 'No more reads for this question. Answer now, in words, from what you have read.', maxTokens: 2400, body: { reasoning: { enabled: false } } });
  const name = String((w.system.match(/^You are ([^,.]+)/) || [])[1] || '').trim();
  const text = String(res.text || '').trim();
  const finish = require('./workerAsk').TOOL_MARKUP.test(text) ? 'tool-markup' : (res.finishReason || null);
  return { officeId: r.officeId, route: r, popid: who.popid, name, title: who.title, text, finish,
    records: w.records, user: w.user, toolReads };
}

const ASK_TOOL = { type: 'function', function: { name: 'ask_gridiron',
  description: 'Ask ' + HOUSE + ', Oakland\'s sports data house, a question about the A\'s or the Oaks — a hitter, a pitcher, the lineup or the rotation, a contract or a trade, the Oaks\' numbers, or what the Tribune has printed. The analyst who answers for that record answers from it, in their own words, and you may quote them.',
  parameters: { type: 'object', properties: { question: { type: 'string', description: 'your question, as you would put it to them' } }, required: ['question'] } } };

module.exports = { ANALYSTS, route, ask, buildAsk, recordOf, loadCards, ASK_TOOL, RECORD_TITLES };
