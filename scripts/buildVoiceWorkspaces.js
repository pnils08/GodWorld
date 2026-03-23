#!/usr/bin/env node
/**
 * buildVoiceWorkspaces.js v2.0
 *
 * Populates per-agent workspace folders for civic voice agents.
 * Each agent gets: base context, previous statements, mayor statements (for non-mayor),
 * initiative data, briefing, and domain-specific engine data (v2.0).
 *
 * v2.0: Domain briefings — routes v3.9 engine data to each agent by role.
 *       Crime to police chief, displacement to OPP, fiscal to CRC, etc.
 *
 * Run AFTER: buildDeskPackets.js (needs base_context.json + civic desk packet)
 * Run BEFORE: launching civic voice agents.
 *
 * Usage: node scripts/buildVoiceWorkspaces.js [cycleNumber] [--clean]
 */

const fs = require('fs');
const path = require('path');

const CYCLE = parseInt(process.argv[2]) || 87;
const CLEAN = process.argv.includes('--clean');

const ROOT = path.resolve(__dirname, '..');
const WORKSPACE_DIR = path.join(ROOT, 'output/civic-voice-workspace');
const PACKETS_DIR = path.join(ROOT, 'output/desk-packets');
const VOICE_DIR = path.join(ROOT, 'output/civic-voice');
const INIT_PACKETS_DIR = path.join(ROOT, 'output/initiative-packets');
const MARA_DIR = path.join(ROOT, 'output');

const AGENTS = [
  {
    name: 'civic-office-mayor', shortName: 'mayor', voiceFile: 'mayor',
    domain: {
      label: 'Mayor Avery Santana',
      crime: 'summary', civicLoad: true, neighborhoodEconomies: true,
      migration: true, transit: 'summary', cityEvents: true,
      hookDomains: ['CIVIC', 'INFRASTRUCTURE', 'GOVERNMENT', 'HOUSING']
    }
  },
  {
    name: 'civic-office-opp-faction', shortName: 'opp_faction', voiceFile: 'opp_faction',
    domain: {
      label: 'OPP Faction — Janae Rivers',
      civicLoad: true, neighborhoodEconomies: 'struggling',
      migration: true, demographicShifts: true,
      hookDomains: ['HEALTH', 'COMMUNITY', 'CIVIC', 'HOUSING']
    }
  },
  {
    name: 'civic-office-crc-faction', shortName: 'crc_faction', voiceFile: 'crc_faction',
    domain: {
      label: 'CRC Faction — Warren Ashford',
      civicLoad: true, neighborhoodEconomies: true,
      transit: true,
      hookDomains: ['ECONOMIC', 'RETAIL', 'LABOR', 'INFRASTRUCTURE']
    }
  },
  {
    name: 'civic-office-ind-swing', shortName: 'ind_swing', voiceFile: 'ind_swing',
    domain: {
      label: 'Independents — Ramon Vega (D4), Leonard Tran (D2)',
      crime: 'summary', civicLoad: true, neighborhoodEconomies: true,
      migration: true, transit: true,
      hookDomains: null
    }
  },
  {
    name: 'civic-office-police-chief', shortName: 'police_chief', voiceFile: 'police_chief',
    domain: {
      label: 'Police Chief Rafael Montez',
      crime: 'full', eveningSafety: true,
      hookDomains: ['CRIME', 'SAFETY', 'HEALTH']
    }
  },
  {
    name: 'civic-office-baylight-authority', shortName: 'baylight_authority', voiceFile: 'baylight_authority',
    domain: {
      label: 'Baylight Authority Director Keisha Ramos',
      neighborhoodEconomies: ['Jack London', 'Downtown'],
      cityEvents: true, eveningCity: true,
      hookDomains: ['ECONOMIC', 'LABOR', 'INFRASTRUCTURE', 'NIGHTLIFE']
    }
  },
  {
    name: 'civic-office-district-attorney', shortName: 'district_attorney', voiceFile: 'district_attorney',
    domain: {
      label: 'District Attorney Clarissa Dane',
      crime: 'full', civicLoad: true,
      hookDomains: ['CRIME', 'SAFETY']
    }
  }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

function readIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  return null;
}

function readJsonIfExists(filePath) {
  const content = readIfExists(filePath);
  if (content) {
    try { return JSON.parse(content); }
    catch (e) { return null; }
  }
  return null;
}

// ─── SECTION FORMATTERS ─────────────────────────────────

function filterHooksByDomain(hooks, domainList) {
  if (!hooks || hooks.length === 0) return [];
  if (!domainList) return hooks;
  return hooks.filter(function(hook) {
    var m = hook.match(/\(([A-Z_]+)\)/);
    if (!m) return true;
    return domainList.indexOf(m[1]) !== -1;
  });
}

function formatCrimeSnapshot(data, variant) {
  if (!data || typeof data !== 'object') return '';
  var md = '## Crime Snapshot\n';
  md += '| Metric | Value |\n|--------|-------|\n';
  if (data.property !== undefined) md += '| Property Crime | ' + data.property + ' |\n';
  if (data.violent !== undefined) md += '| Violent Crime | ' + data.violent + ' |\n';
  if (data.incidents !== undefined) md += '| Total Incidents | ' + data.incidents + ' |\n';
  if (variant === 'full') {
    if (data.responseTime) md += '| Response Time | ' + data.responseTime + ' |\n';
    if (data.clearanceRate !== undefined) md += '| Clearance Rate | ' + data.clearanceRate + '% |\n';
    if (data.hotspots) md += '| Hotspots | ' + data.hotspots + ' |\n';
    if (data.patrolStrategy) md += '| Patrol Strategy | ' + data.patrolStrategy + ' |\n';
  }
  return md + '\n';
}

function formatCivicLoad(data) {
  if (!data || typeof data !== 'object') return '';
  var md = '## Civic Load\n';
  if (data.level) md += '- **Level:** ' + data.level + '\n';
  if (data.score !== undefined) md += '- **Score:** ' + data.score + '\n';
  if (data.factors) md += '- **Factors:** ' + data.factors + '\n';
  if (data.storyHooks && data.storyHooks.length > 0) {
    md += '- **Service Pressure Signals:**\n';
    for (var i = 0; i < data.storyHooks.length; i++) {
      md += '  - ' + data.storyHooks[i] + '\n';
    }
  }
  return md + '\n';
}

function formatNeighborhoodEconomies(data, filter) {
  if (!data || typeof data !== 'object') return '';
  var hoods = Object.keys(data);
  if (hoods.length === 0) return '';

  if (Array.isArray(filter)) {
    hoods = hoods.filter(function(h) {
      return filter.some(function(f) { return h.toLowerCase().indexOf(f.toLowerCase()) !== -1; });
    });
  } else if (filter === 'struggling') {
    hoods = hoods.filter(function(h) {
      var val = (data[h] || '').toLowerCase();
      return val.indexOf('struggling') !== -1 || val.indexOf('declining') !== -1 ||
             val.indexOf('stressed') !== -1 || val.indexOf('weak') !== -1;
    });
  }

  if (hoods.length === 0) return '';
  var md = '## Neighborhood Economies\n';
  for (var i = 0; i < hoods.length; i++) {
    md += '- **' + hoods[i] + ':** ' + data[hoods[i]] + '\n';
  }
  return md + '\n';
}

function formatMigration(data) {
  if (!data || typeof data !== 'object') return '';
  var md = '## Migration\n';
  if (data.netDrift !== undefined) md += '- **Net Drift:** ' + data.netDrift + '\n';
  if (data.inflow) md += '- **Inflow:** ' + data.inflow + '\n';
  if (data.outflow) md += '- **Outflow:** ' + data.outflow + '\n';
  if (data.summary) md += '- **Summary:** ' + data.summary + '\n';
  if (data.byNeighborhood && Object.keys(data.byNeighborhood).length > 0) {
    md += '- **By Neighborhood:**\n';
    for (var h in data.byNeighborhood) {
      if (data.byNeighborhood.hasOwnProperty(h)) {
        var val = data.byNeighborhood[h];
        if (val !== 0) md += '  - ' + h + ': ' + (val > 0 ? '+' : '') + val + '\n';
      }
    }
  }
  return md + '\n';
}

function formatTransit(data, variant) {
  if (!data || typeof data !== 'object') return '';
  var md = '## Transit\n';
  if (data.ridership !== undefined) md += '- **BART Ridership:** ' + data.ridership + '\n';
  if (data.onTimeRate !== undefined) md += '- **On-Time Rate:** ' + data.onTimeRate + '%\n';
  if (variant !== 'summary') {
    if (data.trafficIndex !== undefined) md += '- **Traffic Index:** ' + data.trafficIndex + '\n';
  }
  if (data.alerts) md += '- **Alerts:** ' + data.alerts + '\n';
  return md + '\n';
}

function formatCityEvents(data) {
  if (!data || !Array.isArray(data) || data.length === 0) return '';
  var md = '## City Events\n';
  for (var i = 0; i < data.length; i++) {
    md += '- ' + data[i] + '\n';
  }
  return md + '\n';
}

function formatEveningSafety(eveningCity) {
  if (!eveningCity || typeof eveningCity !== 'object') return '';
  var hasSafety = eveningCity.safety || eveningCity.crowdHotspots || eveningCity.crowdMap;
  if (!hasSafety) return '';
  var md = '## Evening Safety\n';
  if (eveningCity.safety) md += '- **Safety:** ' + eveningCity.safety + '\n';
  if (eveningCity.crowdHotspots) md += '- **Crowd Hotspots:** ' + eveningCity.crowdHotspots + '\n';
  if (eveningCity.crowdMap) md += '- **Crowd Map:** ' + eveningCity.crowdMap + '\n';
  if (eveningCity.traffic) md += '- **Evening Traffic:** ' + eveningCity.traffic + '\n';
  return md + '\n';
}

function formatEveningCity(eveningCity) {
  if (!eveningCity || typeof eveningCity !== 'object') return '';
  var md = '## Evening City\n';
  if (eveningCity.nightlifeVibe) md += '- **Nightlife Vibe:** ' + eveningCity.nightlifeVibe + '\n';
  if (eveningCity.nightlifeVolume) md += '- **Volume:** ' + eveningCity.nightlifeVolume + '\n';
  if (eveningCity.restaurants) md += '- **Restaurants:** ' + eveningCity.restaurants + '\n';
  if (eveningCity.crowdHotspots) md += '- **Crowd Hotspots:** ' + eveningCity.crowdHotspots + '\n';
  if (eveningCity.safety) md += '- **Safety:** ' + eveningCity.safety + '\n';
  if (eveningCity.traffic) md += '- **Evening Traffic:** ' + eveningCity.traffic + '\n';
  return md + '\n';
}

function formatDemographicShifts(data) {
  if (!data || !Array.isArray(data) || data.length === 0) return '';
  var md = '## Demographic Shifts\n';
  for (var i = 0; i < data.length; i++) {
    md += '- ' + data[i] + '\n';
  }
  return md + '\n';
}

function formatEconomicStatus(econCtx) {
  if (!econCtx || typeof econCtx !== 'object') return '';
  var hasData = econCtx.economyDescription || econCtx.employment;
  if (!hasData) return '';
  var md = '## Economic Status\n';
  if (econCtx.economyDescription) md += '- **Economy:** ' + econCtx.economyDescription + '\n';
  if (econCtx.employment) md += '- **Employment:** ' + econCtx.employment + '\n';
  if (econCtx.medianIncome) md += '- **Median Income:** $' + Number(econCtx.medianIncome).toLocaleString() + '\n';
  return md + '\n';
}

// ─── DOMAIN BRIEFING GENERATOR ──────────────────────────

function generateDomainBriefing(agent, cycle, eveningCtx, econCtx) {
  var dd = agent.domain;
  if (!dd) return null;

  var hasV39 = eveningCtx.crimeSnapshot || eveningCtx.transit || eveningCtx.civicLoad ||
               eveningCtx.storyHooks || eveningCtx.neighborhoodEconomies || eveningCtx.migration;
  var md = '# ' + dd.label + ' — Domain Briefing, Cycle ' + cycle + '\n\n';

  if (!hasV39 && !econCtx.economyDescription) {
    md += '*No engine data available for this cycle. Domain briefing will populate after the next engine run with v3.9+ packet data.*\n';
    return md;
  }

  md += '*Engine data routed to your domain. Use these facts in your statements.*\n\n';

  if (eveningCtx.cycleSummary) {
    md += '## Cycle Summary\n';
    if (eveningCtx.cycleSummary.headline) md += '**' + eveningCtx.cycleSummary.headline + '**\n\n';
    if (eveningCtx.cycleSummary.oneLine) md += eveningCtx.cycleSummary.oneLine + '\n';
    if (eveningCtx.cycleSummary.keyEvents) md += '\nKey Events: ' + eveningCtx.cycleSummary.keyEvents + '\n';
    md += '\n';
  }

  if (eveningCtx.shockContext && eveningCtx.shockContext.flag && eveningCtx.shockContext.flag !== 'none') {
    md += '## ALERT: Shock State Active\n';
    md += '- **Flag:** ' + eveningCtx.shockContext.flag;
    if (eveningCtx.shockContext.score) md += ' | **Score:** ' + eveningCtx.shockContext.score;
    if (eveningCtx.shockContext.duration) md += ' | **Duration:** ' + eveningCtx.shockContext.duration;
    md += '\n';
    if (eveningCtx.shockContext.reasons && eveningCtx.shockContext.reasons.length > 0) {
      md += '- **Reasons:**\n';
      for (var ri = 0; ri < eveningCtx.shockContext.reasons.length; ri++) {
        md += '  - ' + eveningCtx.shockContext.reasons[ri] + '\n';
      }
    }
    md += '\n';
  }

  var hooks = filterHooksByDomain(eveningCtx.storyHooks, dd.hookDomains);
  if (hooks.length > 0) {
    md += '## Story Hooks' + (dd.hookDomains ? ' (Your Domain)' : ' (All)') + '\n';
    for (var hi = 0; hi < hooks.length; hi++) {
      md += '- ' + hooks[hi] + '\n';
    }
    md += '\n';
  }

  if (dd.crime && eveningCtx.crimeSnapshot) {
    md += formatCrimeSnapshot(eveningCtx.crimeSnapshot, dd.crime);
  }

  if (dd.civicLoad && eveningCtx.civicLoad) {
    md += formatCivicLoad(eveningCtx.civicLoad);
  }

  if (dd.neighborhoodEconomies && eveningCtx.neighborhoodEconomies) {
    var nhFilter = dd.neighborhoodEconomies === true ? null : dd.neighborhoodEconomies;
    md += formatNeighborhoodEconomies(eveningCtx.neighborhoodEconomies, nhFilter);
  }

  if (dd.migration && eveningCtx.migration) {
    md += formatMigration(eveningCtx.migration);
  }

  if (dd.transit && eveningCtx.transit) {
    var transitVariant = dd.transit === 'summary' ? 'summary' : 'full';
    md += formatTransit(eveningCtx.transit, transitVariant);
  }

  if (dd.cityEvents && eveningCtx.cityEvents) {
    md += formatCityEvents(eveningCtx.cityEvents);
  }

  if (dd.eveningSafety && eveningCtx.eveningCity) {
    md += formatEveningSafety(eveningCtx.eveningCity);
  }

  if (dd.eveningCity && eveningCtx.eveningCity) {
    md += formatEveningCity(eveningCtx.eveningCity);
  }

  if (dd.demographicShifts && eveningCtx.demographicShifts) {
    md += formatDemographicShifts(eveningCtx.demographicShifts);
  }

  md += formatEconomicStatus(econCtx);

  return md;
}

// ─── BRIEFING GENERATOR (v1.0 — initiatives, council, votes) ─

function generateVoiceBriefing(agent, cycle, baseContext) {
  let md = `# ${agent.name} Briefing — Cycle ${cycle}\n\n`;

  if (baseContext) {
    md += `**Cycle ${cycle}** | ${baseContext.month || ''} ${baseContext.simYear || ''} | ${baseContext.season || ''}\n\n`;
  }

  if (baseContext && baseContext.canon) {
    const canon = baseContext.canon;

    if (canon.initiatives && canon.initiatives.length > 0) {
      md += `## Active Initiatives\n`;
      for (const init of canon.initiatives) {
        md += `- **${init.name || init.initiative}** — Status: ${init.status || 'unknown'}`;
        if (init.budget) md += ` | Budget: ${init.budget}`;
        if (init.vote) md += ` | Vote: ${init.vote}`;
        md += '\n';
      }
      md += '\n';
    }

    if (canon.recentOutcomes && canon.recentOutcomes.length > 0) {
      md += `## Recent Vote Outcomes\n`;
      for (const outcome of canon.recentOutcomes) {
        md += `- **${outcome.initiative || outcome.name}** — ${outcome.result || outcome.status}`;
        if (outcome.vote) md += ` (${outcome.vote})`;
        if (outcome.notes) md += `\n  Notes: ${outcome.notes}`;
        md += '\n';
      }
      md += '\n';
    }

    if (canon.pendingVotes && canon.pendingVotes.length > 0) {
      md += `## Pending Votes\n`;
      for (const pv of canon.pendingVotes) {
        md += `- **${pv.initiative || pv.name}** — ${pv.status || 'pending'}`;
        if (pv.projectedOutcome) md += ` | Projected: ${pv.projectedOutcome}`;
        md += '\n';
      }
      md += '\n';
    }

    if (canon.council && canon.council.length > 0) {
      md += `## Council Composition\n`;
      for (const member of canon.council) {
        md += `- ${member.member || member.name} — D${member.district}, ${member.faction || 'IND'}`;
        if (member.status && member.status !== 'active') md += ` (${member.status})`;
        md += '\n';
      }
      md += '\n';
    }

    if (canon.executiveBranch) {
      const eb = canon.executiveBranch;
      md += `## Executive Branch\n`;
      if (eb.mayor) md += `- Mayor: ${eb.mayor}\n`;
      if (eb.deputyMayor) md += `- Deputy Mayor: ${eb.deputyMayor}\n`;
      if (eb.chiefOfStaff) md += `- Chief of Staff: ${eb.chiefOfStaff}\n`;
      md += '\n';
    }
  }

  if (baseContext && baseContext.events && baseContext.events.length > 0) {
    md += `## City Events This Cycle\n`;
    const topEvents = baseContext.events
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 8);
    for (const e of topEvents) {
      md += `- ${e.name || e.title || e.description}`;
      if (e.neighborhood) md += ` (${e.neighborhood})`;
      md += '\n';
    }
    md += '\n';
  }

  const maraPath = path.join(MARA_DIR, `mara_directive_c${cycle - 1}.txt`);
  const maraContent = readIfExists(maraPath);
  if (maraContent) {
    const fwdMatch = maraContent.match(/FORWARD GUIDANCE[:\s]*\n([\s\S]*?)(?:\n#{1,3}\s|\n---|\Z)/i);
    if (fwdMatch) {
      md += `## Mara Forward Guidance (Previous Cycle)\n${fwdMatch[1].trim()}\n\n`;
    }
  }

  return md;
}

// ─── MAIN ────────────────────────────────────────────────

function main() {
  console.log(`\n=== buildVoiceWorkspaces.js v2.0 — Cycle ${CYCLE} ===\n`);

  const baseContext = readJsonIfExists(path.join(PACKETS_DIR, 'base_context.json'));
  if (!baseContext) {
    console.error('ERROR: base_context.json not found. Run buildDeskPackets.js first.');
    process.exit(1);
  }

  const civicPacket = readJsonIfExists(path.join(PACKETS_DIR, `civic_c${CYCLE}.json`));
  const eveningCtx = (civicPacket && civicPacket.eveningContext) || {};
  const econCtx = (civicPacket && civicPacket.economicContext) || {};
  console.log('Engine data:',
    'hooks=' + (eveningCtx.storyHooks || []).length,
    'crime=' + (eveningCtx.crimeSnapshot ? 'yes' : 'no'),
    'transit=' + (eveningCtx.transit ? 'yes' : 'no'),
    'civicLoad=' + (eveningCtx.civicLoad ? 'yes' : 'no'),
    'nhEcon=' + Object.keys(eveningCtx.neighborhoodEconomies || {}).length,
    'migration=' + (eveningCtx.migration ? 'yes' : 'no'),
    'shock=' + (eveningCtx.shockContext ? 'yes' : 'no'));

  let totalFiles = 0;

  for (const agent of AGENTS) {
    console.log(`\n--- ${agent.name} ---`);
    const agentDir = path.join(WORKSPACE_DIR, agent.name);
    const currentDir = path.join(agentDir, 'current');
    const archiveDir = path.join(agentDir, 'archive');

    if (CLEAN && fs.existsSync(currentDir)) {
      fs.rmSync(currentDir, { recursive: true });
    }

    ensureDir(currentDir);
    ensureDir(archiveDir);

    let agentFiles = 0;

    copyIfExists(path.join(PACKETS_DIR, 'base_context.json'), path.join(currentDir, 'base_context.json'));
    console.log(`  base_context.json`);
    agentFiles++;

    for (let c = CYCLE - 1; c >= Math.max(CYCLE - 3, 1); c--) {
      const stmtSrc = path.join(VOICE_DIR, `${agent.voiceFile}_c${c}.json`);
      if (copyIfExists(stmtSrc, path.join(archiveDir, `${agent.voiceFile}_c${c}.json`))) {
        console.log(`  archive: ${agent.voiceFile}_c${c}.json`);
        agentFiles++;
      }
    }

    if (agent.shortName !== 'mayor') {
      const mayorStmt = path.join(VOICE_DIR, `mayor_c${CYCLE}.json`);
      if (copyIfExists(mayorStmt, path.join(currentDir, 'mayor_statements.json'))) {
        console.log(`  mayor_statements.json (current cycle)`);
        agentFiles++;
      } else {
        const prevMayor = path.join(VOICE_DIR, `mayor_c${CYCLE - 1}.json`);
        if (copyIfExists(prevMayor, path.join(currentDir, 'mayor_statements.json'))) {
          console.log(`  mayor_statements.json (previous cycle, current not available)`);
          agentFiles++;
        }
      }
    }

    const manifest = readJsonIfExists(path.join(INIT_PACKETS_DIR, 'manifest.json'));
    if (manifest && manifest.packets) {
      ensureDir(path.join(currentDir, 'initiative_packets'));
      for (const [key, info] of Object.entries(manifest.packets)) {
        const src = path.join(INIT_PACKETS_DIR, info.file);
        if (copyIfExists(src, path.join(currentDir, 'initiative_packets', info.file))) {
          agentFiles++;
        }
      }
      console.log(`  initiative_packets/ (${Object.keys(manifest.packets).length} files)`);
    }

    const CIVIC_DB = path.join(ROOT, 'output/city-civic-database/initiatives');
    const initDirs = ['stabilization-fund', 'oari', 'transit-hub', 'health-center', 'baylight'];
    let decisionsCount = 0;
    ensureDir(path.join(currentDir, 'initiative_decisions'));
    for (const init of initDirs) {
      const decisionsFile = path.join(CIVIC_DB, init, `decisions_c${CYCLE}.json`);
      if (copyIfExists(decisionsFile, path.join(currentDir, 'initiative_decisions', `${init}_decisions_c${CYCLE}.json`))) {
        decisionsCount++;
        agentFiles++;
      }
      const prevDecisions = path.join(CIVIC_DB, init, `decisions_c${CYCLE - 1}.json`);
      if (copyIfExists(prevDecisions, path.join(currentDir, 'initiative_decisions', `${init}_decisions_c${CYCLE - 1}.json`))) {
        decisionsCount++;
        agentFiles++;
      }
    }
    if (decisionsCount > 0) {
      console.log(`  initiative_decisions/ (${decisionsCount} files)`);
    }

    const briefing = generateVoiceBriefing(agent, CYCLE, baseContext);
    fs.writeFileSync(path.join(currentDir, 'briefing.md'), briefing);
    console.log(`  briefing.md (generated)`);
    agentFiles++;

    const domainBriefing = generateDomainBriefing(agent, CYCLE, eveningCtx, econCtx);
    if (domainBriefing) {
      fs.writeFileSync(path.join(currentDir, 'domain_briefing.md'), domainBriefing);
      var kb = (domainBriefing.length / 1024).toFixed(1);
      console.log(`  domain_briefing.md (${kb} KB)`);
      agentFiles++;
    }

    // Copy civic desk archive context into voice workspace (past Tribune coverage)
    const archiveSrc = path.join(ROOT, 'output', 'desk-briefings', `civic_archive_c${CYCLE}.md`);
    if (copyIfExists(archiveSrc, path.join(currentDir, 'archive_context.md'))) {
      console.log(`  archive_context.md (civic desk archive)`);
      agentFiles++;
    }

    // Generate previous_grades.md from grade history (voice agents)
    const gradeHistoryPath = path.join(ROOT, 'output', 'grades', 'grade_history.json');
    if (fs.existsSync(gradeHistoryPath)) {
      try {
        const gradeHistory = JSON.parse(fs.readFileSync(gradeHistoryPath, 'utf-8'));
        // Voice agents are tracked under their shortName in grades
        const voiceKey = agent.shortName || agent.name;
        // Check if voice agent has grades (future: gradeEdition.js will score voice agents)
        // For now, show overall edition grades as context
        if (gradeHistory.overall && gradeHistory.editionsGraded > 0) {
          let md = `# Previous Edition Grades\n\n`;
          md += `Overall edition rolling average: ${gradeHistory.overall.rolling} (${gradeHistory.overall.trend})\n\n`;
          md += `Your statements contribute to the civic desk's coverage. `;
          const civicGrades = gradeHistory.desks && gradeHistory.desks.civic;
          if (civicGrades) {
            md += `Civic desk rolling average: ${civicGrades.rolling} (${civicGrades.trend})\n\n`;
            if (civicGrades.editions && civicGrades.editions.length > 0) {
              md += `## Recent Civic Desk Grades\n`;
              for (const ed of civicGrades.editions.slice().reverse()) {
                md += `- E${ed.cycle}: ${ed.grade} | ${ed.criticalErrors} CRITICAL, ${ed.warnings} WARNING\n`;
              }
            }
          }
          md += `\nFocus on: policy coherence, data grounding from your domain briefing, staying in character, canon compliance.\n`;
          fs.writeFileSync(path.join(currentDir, 'previous_grades.md'), md);
          console.log(`  previous_grades.md (generated)`);
          agentFiles++;
        }
      } catch (e) {
        console.log(`  previous_grades.md (skipped: ${e.message})`);
      }
    }

    console.log(`  Total: ${agentFiles} files`);
    totalFiles += agentFiles;
  }

  console.log(`\n=== Done: ${totalFiles} files across ${AGENTS.length} voice agents ===\n`);
}

main();
