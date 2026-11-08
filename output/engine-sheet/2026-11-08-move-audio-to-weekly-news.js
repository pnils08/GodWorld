#!/usr/bin/env node
'use strict';
// pipeline.104 (builder 2026-11-08 "yes do both"): the Saturday audio overviews C108–C114 landed in
// 1_The_Cycle_Pulse/Y-003 while driveDest pointed at 'edition'; move them to Weekly_News, where the
// audio went through C107. A move, not a copy: each file is checked to be in Y-003 under its expected
// name first, then re-parented; nothing is deleted.
//   node output/engine-sheet/2026-11-08-move-audio-to-weekly-news.js           dry run
//   node output/engine-sheet/2026-11-08-move-audio-to-weekly-news.js --apply   move
require('/root/GodWorld/lib/env');
const { google } = require('googleapis');

const APPLY = process.argv.includes('--apply');
const Y003 = '1k8OEMFO90zppxelySqUZCWZ4G5amfkW9';
const WEEKLY_NEWS = '1J1HhuRUWOHECNYierjX0iygknmn5CJHU';
const FILES = {
  'nlm_overview_c108.m4a': '1p7-GH2iq2fqMuQOGbFQXjTCEc2kuanis',
  'nlm_overview_c109.m4a': '1Ydx_gwDfzIIv1LalROEt3mnc-c-KfCqp',
  'nlm_overview_c110.m4a': '1uqproSZCsZkbSdeoSoa30Qu04YTuxqci',
  'nlm_overview_c111.m4a': '12v2VJxKyGpfruk8QGQvgAbpUBI4K9CTf',
  'nlm_overview_c112.m4a': '1v5dGF3hlxAS7zdBpaT1_GRQZ95p9-KUa',
  'nlm_overview_c113.m4a': '1Xtt3xOhXaXYLZWEhpzZUXTWtKqC1J8S4',
  'nlm_overview_c114.m4a': '1soEH8zb8Zrni6DGXx8cJNiXnPA0INlug',
};

async function main() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth });
  for (const [name, id] of Object.entries(FILES)) {
    const f = (await drive.files.get({ fileId: id, fields: 'id,name,parents,trashed' })).data;
    if (f.name !== name || f.trashed || !(f.parents || []).includes(Y003)) {
      console.log('SKIP ' + name + ': name ' + f.name + ', parents ' + (f.parents || []).join(',') + (f.trashed ? ', trashed' : ''));
      continue;
    }
    if (!APPLY) { console.log('(dry run) would move ' + name + ' Y-003 -> Weekly_News'); continue; }
    const moved = (await drive.files.update({ fileId: id, addParents: WEEKLY_NEWS, removeParents: Y003, fields: 'id,name,parents' })).data;
    console.log((moved.parents.includes(WEEKLY_NEWS) && !moved.parents.includes(Y003) ? 'moved ' : 'CHECK ') + name + ' -> ' + moved.parents.join(','));
  }
}

main().catch((e) => { console.error('Fatal: ' + e.message); process.exit(1); });
