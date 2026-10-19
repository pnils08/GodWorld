// Reset SANDBOX 1004 from the frozen BASELINE-1004-C112 copy (engine.214 plan §PROD wave procedure step 2).
// Titles and IDs are asserted BEFORE syncSandboxFromLive.js loads (codex recheck 2026-10-19 #1).
// usage: node resetFromBaseline.js [--apply]
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA', BASE_TITLE = 'BASELINE-1004-C112b';   // C112 + the Advancement_Intake1!L3 hood spelling (bench-side, live replay pending)
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const REAL_LIVE = process.env.GODWORLD_SHEET_ID;
(async () => {
  if (!REAL_LIVE || REAL_LIVE === BASE || REAL_LIVE === BENCH || BASE === BENCH) throw new Error('REFUSED: id collision');
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const api = google.sheets({ version: 'v4', auth });
  const t = async id => (await api.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title' })).data.properties.title;
  const [tb, td, tl] = await Promise.all([t(BASE), t(BENCH), t(REAL_LIVE)]);
  console.log(`source ${BASE.slice(0, 6)}… "${tb}" | dest ${BENCH.slice(0, 6)}… "${td}" | live (not touched) "${tl}"`);
  if (tb !== BASE_TITLE) throw new Error('REFUSED: source title is not ' + BASE_TITLE);
  if (td !== BENCH_TITLE) throw new Error('REFUSED: dest title is not ' + BENCH_TITLE);
  if (tl === BENCH_TITLE || tl === BASE_TITLE) throw new Error('REFUSED: live title collides');
  process.env.GODWORLD_SHEET_ID = BASE;                          // after lib/env — the sync module captures it at load
  process.argv = [process.argv[0], 'syncSandboxFromLive.js', BENCH].concat(process.argv.includes('--apply') ? ['--apply'] : []);
  require('/root/GodWorld/scripts/syncSandboxFromLive.js');      // lib/env is cached: no dotenv re-override
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
