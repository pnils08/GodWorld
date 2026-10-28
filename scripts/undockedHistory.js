'use strict';

// Read only the gate-approved show feed. The current episode is already in
// Nia's Packet; this tool answers questions about earlier nights.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FEED_VERSION = 'UNDOCKED-FEED/1';
const MAX_EVENTS = 12;

function unavailable(reason) { return { text: 'UNDOCKED history unavailable: ' + reason, lines: [] }; }
function exactName(value) { return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

function readHistory(input, currentCycle, root) {
  const now = Number(currentCycle);
  if (!Number.isInteger(now) || now < 1) return unavailable('current Cycle is invalid');
  const before = !input || input.beforeCycle == null ? now : Number(input.beforeCycle);
  if (!Number.isInteger(before) || before < 1 || before > now) {
    return unavailable('beforeCycle must be a whole Cycle at or before the current Cycle');
  }
  const pilot = String(input && input.pilot || '').trim();
  const base = root || ROOT;
  const feedDir = path.join(base, 'output', 'spacemolt-show', 'feed');
  if (!fs.existsSync(feedDir)) return unavailable('approved feed directory is missing');
  const snapshot = path.join(base, 'output', 'simulation_ledger_snapshot.jsonl');
  if (!fs.existsSync(snapshot)) return unavailable('ledger snapshot is missing');
  const people = new Map();
  try {
    for (const line of fs.readFileSync(snapshot, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      if (row.POPID && row.Name) people.set(String(row.POPID), String(row.Name).trim());
    }
  } catch (_) { return unavailable('ledger snapshot could not be parsed'); }

  let names;
  try { names = fs.readdirSync(feedDir); }
  catch (_) { return unavailable('approved feed directory could not be read'); }
  const files = names
    .map(name => ({ name, match: /^c(\d+)\.json$/.exec(name) }))
    .filter(x => x.match && Number(x.match[1]) < before)
    .sort((a, b) => Number(b.match[1]) - Number(a.match[1]));
  const events = [];
  const episodeIds = new Set();
  for (const file of files) {
    const cycle = Number(file.match[1]);
    let pack;
    const filePath = path.join(feedDir, file.name);
    try {
      if (!fs.lstatSync(filePath).isFile()) return unavailable(file.name + ' is not a regular approved feed pack');
      pack = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    catch (_) { return unavailable(file.name + ' could not be parsed'); }
    if (!pack || pack.v !== FEED_VERSION || Number(pack.cycle) !== cycle || !Array.isArray(pack.events)) {
      return unavailable(file.name + ' is not a valid approved feed pack');
    }
    for (const event of pack.events) {
      if (!event || event.v !== FEED_VERSION || Number(event.Cycle) !== cycle ||
          event.EventType !== 'undocked-episode' || !/^POP-\d{5}$/.test(String(event.POPID || '')) ||
          !String(event.EpisodeId || '').trim() || !String(event.Holder || '').trim() ||
          !(event.CreditsDelta == null || (typeof event.CreditsDelta === 'number' && Number.isFinite(event.CreditsDelta))) ||
          !Array.isArray(event.Systems) || !event.Systems.every(s => typeof s === 'string') ||
          typeof event.CombatEvents !== 'number' || !Number.isFinite(event.CombatEvents) ||
          typeof event.MishapCount !== 'number' || !Number.isFinite(event.MishapCount)) {
        return unavailable(file.name + ' has an invalid episode row');
      }
      if (episodeIds.has(event.EpisodeId)) return unavailable('duplicate approved EpisodeId ' + event.EpisodeId);
      episodeIds.add(event.EpisodeId);
      const name = people.get(event.POPID);
      if (!name) return unavailable('approved episode pilot has no ledger row');
      events.push({ cycle, event, name });
    }
  }

  let selected = events;
  if (pilot) {
    const named = events.filter(x => exactName(x.event.Holder) === exactName(pilot) || exactName(x.name) === exactName(pilot));
    const ids = new Set(named.map(x => x.event.POPID));
    if (ids.size > 1) return unavailable('pilot name matches more than one POPID in approved packs');
    selected = ids.size ? events.filter(x => ids.has(x.event.POPID)) : [];
  }
  let end = Math.min(MAX_EVENTS, selected.length);
  if (end < selected.length && selected[end].cycle === selected[end - 1].cycle) {
    const partialCycle = selected[end].cycle;
    while (end > 0 && selected[end - 1].cycle === partialCycle) end--;
  }
  if (!end && selected.length) return unavailable('one Cycle has more episodes than the bounded result can return');
  const shown = selected.slice(0, end);
  const lines = shown.map(({ cycle, event, name }) => {
    const credits = event.CreditsDelta == null ? 'credits unsettled' : 'credits ' + Number(event.CreditsDelta);
    const systems = event.Systems.length ? event.Systems.join(', ') : 'systems unlisted';
    return {
      text: 'C' + cycle + ' UNDOCKED: ' + name + ' — ' + credits +
        '; systems ' + systems + '; combat ' + Number(event.CombatEvents) +
        '; mishaps ' + Number(event.MishapCount) + '.',
      src: 'tool:undocked_history:feed/c' + cycle + '.json#' + event.EpisodeId,
    };
  });
  const scope = pilot ? ' for ' + pilot : '';
  const header = 'Available gate-approved UNDOCKED feed history' + scope + ' before C' + before + ':';
  const next = selected.length > end
    ? '\nEarlier results exist; call again with beforeCycle ' + shown[shown.length - 1].cycle + '.' : '';
  return { text: header + (lines.length ? '\n' + lines.map(x => x.text).join('\n') :
    '\nNo earlier episode found in the available approved packs; this does not prove none ever aired.') + next,
    lines };
}

module.exports = { readHistory, MAX_EVENTS };
