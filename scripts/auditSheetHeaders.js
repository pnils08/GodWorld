/**
 * ============================================================================
 * SHEET HEADER ALIGNMENT AUDIT (Session 44)
 * ============================================================================
 *
 * Compares canonical writer schemas against actual Google Sheet headers.
 * Reports misalignments, missing columns, and extra columns.
 *
 * Usage:
 *   node scripts/auditSheetHeaders.js
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// CANONICAL WRITER SCHEMAS
// ════════════════════════════════════════════════════════════════════════════
// Source: each writer's header array definition in its respective file.
// Only the columns the WRITER outputs (positional append).

const SCHEMAS = {
  'Event_Arc_Ledger': {
    file: 'v3LedgerWriter.js',
    version: 'v3.3',
    writerCols: [
      'Timestamp','Cycle','ArcId','Type','Phase','Tension','Neighborhood',
      'DomainTag','Summary','CitizenCount','CycleCreated','CycleResolved',
      'ArcAge','Holiday','HolidayPriority','FirstFriday','CreationDay',
      'SportsSeason','CalendarTrigger'
    ]
  },
  'WorldEvents_V3_Ledger': {
    file: 'recordWorldEventsv3.js',
    version: 'v3.5',
    writerCols: [
      'Timestamp','Cycle','EventDescription','EventType','Domain','Severity',
      'Neighborhood'
      // Cols H-AC are deprecated (empty strings) — 22 dead columns
    ],
    totalPositions: 29  // writer outputs 29 values but only 7 are active
  },
  'Story_Seed_Deck': {
    file: 'saveV3Seeds.js',
    version: 'v3.4',
    writerCols: [
      'Timestamp','Cycle','SeedID','SeedType','Domain','Neighborhood',
      'Priority','SeedText'
    ]
  },
  'Story_Hook_Deck': {
    file: 'v3StoryHookWriter.js',
    version: 'v3.4',
    writerCols: [
      'Timestamp','Cycle','HookID','HookType','Domain','Neighborhood',
      'Priority','HookText','LinkedArcID','SuggestedDesks'
    ]
  },
  'Texture_Trigger_Log': {
    file: 'v3TextureWriter.js',
    version: 'v3.5',
    writerCols: [
      'Timestamp','Cycle','Domain','Neighborhood','TextureKey','Reason',
      'Intensity'
    ]
  },
  'Neighborhood_Map': {
    file: 'v3NeighborhoodWriter.js',
    version: 'v3.5',
    writerCols: [
      'Timestamp','Cycle','Neighborhood','NightlifeProfile','NoiseIndex',
      'CrimeIndex','RetailVitality','EventAttractiveness','Sentiment',
      'DemographicMarker','Holiday','HolidayPriority','FirstFriday',
      'CreationDay','SportsSeason'
    ]
  },
  'Domain_Tracker': {
    file: 'v3DomainWriter.js',
    version: 'v3.4',
    writerCols: [
      'Timestamp','Cycle','CIVIC','CRIME','TRANSIT','ECONOMIC','EDUCATION',
      'HEALTH','WEATHER','COMMUNITY','NIGHTLIFE','HOUSING','CULTURE',
      'SPORTS','BUSINESS','SAFETY','INFRASTRUCTURE','GENERAL','FESTIVAL',
      'HOLIDAY','ARTS','ENVIRONMENT','TECHNOLOGY','DominantDomain',
      'TotalEvents','Holiday','HolidayPriority','FirstFriday','CreationDay',
      'SportsSeason','Notes'
    ]
  },
  'Chicago_Feed': {
    file: 'v3ChicagoWriter.js',
    version: 'v2.5',
    writerCols: [
      'Timestamp','Cycle','GodWorldYear','CycleOfYear','SimMonth',
      'CycleInMonth','Season','Holiday','WeatherType','Temperature',
      'WeatherImpact','WeatherMood','ComfortIndex','Sentiment',
      'EconomicMood','BullsSeason','Events','Sports','TravelNotes',
      'Correlation','CitizenCount','CitizenSample'
    ]
  },
  'Cycle_Weather': {
    file: 'recordCycleWeather.js',
    version: 'v1.2',
    writerCols: [
      'CycleID','Type','Temp','Impact','Advisory','Comfort','Mood',
      'Alerts','Streak','StreakType','Timestamp'
    ]
  },
  'Media_Ledger': {
    file: 'recordMediaLedger.js',
    version: 'v3.2',
    writerCols: [
      'Timestamp','Cycle','Journalist','NameUsed','FameCategory',
      'CulturalDomain','FameScore','TrendTrajectory','MediaSpread',
      'CityTier','Neighborhood','StorySeedCount','CycleWeight',
      'CycleWeightReason','ChaosEvents','NightlifeVolume','Sentiment',
      'CivicLoad','ShockFlag','PatternFlag','EconomicMood','WeatherType',
      'WeatherMood','MediaIntensity','ActiveArcs'
    ]
  },
  'Press_Drafts': {
    file: 'pressDraftWriter.js',
    version: 'v1.4',
    writerCols: [
      'Timestamp','Cycle','Reporter','StoryType','SignalSource',
      'SummaryPrompt','DraftText','Status',
      '','','','','','',  // I-N deprecated (empty strings)
      'LinkedCitizen','CitizenArchetype','CitizenTone',
      'CitizenNeighborhood','LinkedStoryline','StorylineType'
    ]
  },
  'Cycle_Packet': {
    file: 'buildCyclePacket.js',
    version: 'v3.7',
    writerCols: ['Timestamp','Cycle','PacketText']
  },
  'Handoff_Output': {
    file: 'compileHandoff.js',
    version: 'v1.0',
    writerCols: ['Timestamp','Cycle','HandoffText']
  }
};


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   Sheet Header Alignment Audit                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`Connected: ${conn.title}\n`);

  const results = [];
  const sheetNames = Object.keys(SCHEMAS);

  for (const sheetName of sheetNames) {
    const schema = SCHEMAS[sheetName];
    const expected = schema.writerCols;

    let data;
    try {
      data = await sheets.getSheetData(sheetName);
    } catch (e) {
      results.push({ sheet: sheetName, status: 'NOT_FOUND', issues: ['Sheet does not exist'] });
      continue;
    }

    if (!data || data.length === 0) {
      results.push({ sheet: sheetName, status: 'EMPTY', issues: ['Sheet is empty'] });
      continue;
    }

    const actual = data[0];
    const issues = [];

    // Compare writer positions
    const checkLen = schema.totalPositions || expected.length;
    for (let i = 0; i < Math.min(checkLen, actual.length); i++) {
      if (i < expected.length) {
        const exp = expected[i];
        const act = actual[i] || '(empty)';
        if (exp === '') continue;  // skip deprecated positions
        if (exp !== act) {
          issues.push(`Col ${i}: "${act}" should be "${exp}"`);
        }
      }
    }

    // Check if sheet has fewer columns than writer expects
    if (actual.length < checkLen) {
      issues.push(`Sheet has ${actual.length} cols, writer outputs ${checkLen}`);
    }

    // Note extra columns beyond writer zone
    const extras = actual.length - checkLen;
    const extraInfo = extras > 0
      ? `+${extras} extra: ${actual.slice(checkLen).join(', ')}`
      : '';

    results.push({
      sheet: sheetName,
      file: schema.file,
      version: schema.version,
      writerCols: expected.length,
      sheetCols: actual.length,
      status: issues.length === 0 ? 'OK' : 'MISALIGNED',
      issues,
      extraInfo,
      rows: data.length - 1
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // REPORT
  // ──────────────────────────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let okCount = 0;
  let badCount = 0;

  for (const r of results) {
    const icon = r.status === 'OK' ? '✓' : r.status === 'NOT_FOUND' ? '?' : '✗';
    console.log(`${icon} ${r.sheet} (${r.file || '?'} ${r.version || ''})`);
    console.log(`  Writer: ${r.writerCols || '?'} cols | Sheet: ${r.sheetCols || '?'} cols | Rows: ${r.rows || 0}`);

    if (r.extraInfo) {
      console.log(`  ${r.extraInfo}`);
    }

    if (r.issues.length > 0) {
      badCount++;
      for (const issue of r.issues) {
        console.log(`  ⚠  ${issue}`);
      }
    } else {
      okCount++;
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`SUMMARY: ${okCount} aligned, ${badCount} misaligned, ${results.length} total`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
