#!/usr/bin/env node
require('/root/GodWorld/lib/env');
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: '/root/.config/godworld/credentials/service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});
const s = google.sheets({ version: 'v4', auth });
const sid = process.env.GODWORLD_SHEET_ID;

async function get(range) {
  const r = await s.spreadsheets.values.get({ spreadsheetId: sid, range: range });
  return r.data.values || [];
}

async function run() {
  // World Config
  const wc = await get('World_Config!A1:Z2');
  console.log('=== WORLD_CONFIG ===');
  if (wc.length >= 2) {
    wc[0].forEach(function(h, i) { if (wc[1][i]) console.log('  ' + h + ':', wc[1][i]); });
  }

  // Cycle Packet - last row
  const cpAll = await get('Cycle_Packet!A1:AZ');
  var cpH = cpAll[0];
  var cpLast = cpAll[cpAll.length - 1];
  console.log('\n=== CYCLE_PACKET (latest) ===');
  ['Cycle','Season','Month','Holiday','Population','NewCitizens','Weather','EconomicMood','CivicLoad','DominantDomain'].forEach(function(f) {
    var i = cpH.indexOf(f);
    if (i >= 0 && cpLast[i]) console.log('  ' + f + ':', cpLast[i]);
  });

  // Riley Digest - last row
  var rd = await get('Riley_Digest!A1:Z');
  var rdH = rd[0];
  var rdL = rd[rd.length - 1];
  console.log('\n=== RILEY_DIGEST ===');
  console.log('Cycle:', rdL[rdH.indexOf('Cycle')]);
  var dIdx = -1;
  for (var di = 0; di < rdH.length; di++) {
    if (rdH[di] === 'Digest' || rdH[di] === 'Summary' || rdH[di] === 'Text') { dIdx = di; break; }
  }
  if (dIdx >= 0) console.log((rdL[dIdx] || '').substring(0, 1500));

  // Initiative Tracker
  var it = await get('Initiative_Tracker!A1:Z');
  var itH = it[0];
  console.log('\n=== INITIATIVE_TRACKER ===');
  for (var ii = 1; ii < it.length; ii++) {
    var r = it[ii];
    var id = r[itH.indexOf('InitiativeID')];
    if (!id) continue;
    var name = r[itH.indexOf('Name')] || r[itH.indexOf('InitiativeName')] || '';
    var status = r[itH.indexOf('Status')] || '';
    var phase = r[itH.indexOf('ImplementationPhase')] || '';
    console.log('  ' + id + ': ' + name.substring(0, 50) + ' | ' + status + ' | ' + phase);
  }

  // World Events C86
  var we = await get('WorldEvents_Ledger!A1:Z');
  var weH = we[0];
  var weCycleI = weH.indexOf('Cycle');
  var targetCycle = cpLast[cpH.indexOf('Cycle')];
  var cEvents = we.filter(function(r) { return r[weCycleI] === targetCycle; });
  console.log('\n=== WORLD_EVENTS (C' + targetCycle + '): ' + cEvents.length + ' events ===');
  var sevI = weH.indexOf('Severity');
  var descI = weH.indexOf('Description') >= 0 ? weH.indexOf('Description') : weH.indexOf('Event');
  cEvents.forEach(function(r) { console.log('  [' + (r[sevI] || '?') + '] ' + (r[descI] || '').substring(0, 120)); });

  // Citizen count
  var sl = await get('Simulation_Ledger!A1:A');
  console.log('\n=== CITIZENS: ' + (sl.length - 1) + ' ===');

  // Weather
  var cw = await get('Cycle_Weather!A1:Z');
  var cwH = cw[0];
  var cwL = cw[cw.length - 1];
  console.log('\n=== WEATHER ===');
  cwH.forEach(function(h, i) { if (cwL[i]) console.log('  ' + h + ':', cwL[i]); });

  // Story hooks
  var sh = await get('Story_Hook_Deck!A1:Z');
  var shH = sh[0];
  var shCI = shH.indexOf('Cycle');
  var cHooks = sh.filter(function(r) { return r[shCI] === targetCycle; });
  console.log('\n=== STORY_HOOKS (C' + targetCycle + '): ' + cHooks.length + ' ===');
  var hookI = shH.indexOf('Hook') >= 0 ? shH.indexOf('Hook') : shH.indexOf('Description');
  cHooks.slice(0, 12).forEach(function(r) { console.log('  -', (r[hookI] || '').substring(0, 120)); });

  // Active storylines
  var st = await get('Storyline_Tracker!A1:Z');
  var stH = st[0];
  var stSI = stH.indexOf('Status');
  var actv = st.filter(function(r) { return r[stSI] === 'active'; });
  console.log('\n=== ACTIVE STORYLINES: ' + actv.length + ' ===');
  var hlI = stH.indexOf('Headline') >= 0 ? stH.indexOf('Headline') : stH.indexOf('Description');
  actv.slice(0, 10).forEach(function(r) { console.log('  -', (r[hlI] || '').substring(0, 120)); });

  // Sports feeds
  var oak = await get('Oakland_Sports_Feed!A1:Z');
  var oakH = oak[0];
  var oakL = oak[oak.length - 1];
  console.log('\n=== OAKLAND SPORTS (latest) ===');
  ['Cycle','Team','Record','Streak','SeasonState'].forEach(function(f) {
    var i = oakH.indexOf(f);
    if (i >= 0 && oakL[i]) console.log('  ' + f + ':', oakL[i]);
  });

  var chi = await get('Chicago_Sports_Feed!A1:Z');
  var chiH = chi[0];
  var chiL = chi[chi.length - 1];
  console.log('\n=== CHICAGO SPORTS (latest) ===');
  ['Cycle','Team','Record','Streak','SeasonState'].forEach(function(f) {
    var i = chiH.indexOf(f);
    if (i >= 0 && chiL[i]) console.log('  ' + f + ':', chiL[i]);
  });
}

run().catch(function(e) { console.error(e.message || e); });
