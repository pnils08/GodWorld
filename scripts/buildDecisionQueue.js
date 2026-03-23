#!/usr/bin/env node
/**
 * buildDecisionQueue.js — Generate pending decision queues for voice agents
 *
 * Reads initiative state from packets and maps blockers to responsible
 * officeholders. Each agent gets a pending_decisions.md with specific
 * decisions they need to make, options, and consequences.
 *
 * Usage:
 *   node scripts/buildDecisionQueue.js [cycle]
 *
 * Output:
 *   output/civic-voice-workspace/{agent}/current/pending_decisions.md
 *
 * Run AFTER: buildInitiativePackets.js, buildVoiceWorkspaces.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INIT_PACKETS_DIR = path.join(ROOT, 'output/initiative-packets');
const WORKSPACE_DIR = path.join(ROOT, 'output/civic-voice-workspace');
const DECISIONS_DIR = path.join(ROOT, 'output/city-civic-database/initiatives');

const CYCLE = parseInt(process.argv[2]) || (() => {
  try {
    const bc = JSON.parse(fs.readFileSync(path.join(ROOT, 'output/desk-packets/base_context.json'), 'utf-8'));
    return bc.cycle || 88;
  } catch { return 88; }
})();

// ─── BLOCKER → OFFICE MAPPING ───────────────────────────────────
// Each initiative can have multiple blockers, each owned by a specific office.
// This is the institutional knowledge layer — who has to act for things to move.

const BLOCKER_MAP = {
  oari: [
    {
      condition: (init) => init.implementationPhase === 'clock-running',
      owner: 'civic-office-police-chief',
      decision: {
        title: 'OARI Dispatch Integration Protocol',
        context: 'Behavioral health response teams cannot deploy to pilot districts (D1, D3, D5) until OPD releases dispatch integration protocols. The 45-day implementation clock is running.',
        options: [
          { id: 'A', label: 'Release integration protocols', effect: 'Teams begin training. Pilot deployment can start. Rivers (D5) gets what she asked for.' },
          { id: 'B', label: 'Request 30-day extension from Mayor', effect: 'Buys time but signals delay. OPP will escalate. Tran (swing yes vote) will question.' },
          { id: 'C', label: 'Propose modified protocol — OPD backup on all calls', effect: 'Compromise position. Slower rollout but maintains OPD presence. CRC may support.' },
        ],
        stakes: 'If clock expires without protocols, OARI fails on your watch. Rivers will name you. The Tribune already reported Day 30.',
        watching: ['Janae Rivers (OPP, D5)', 'Leonard Tran (IND, D2 — swing yes)', 'Warren Ashford (CRC, D7 — wants data)']
      }
    },
    {
      condition: (init) => init.implementationPhase === 'clock-running',
      owner: 'civic-office-mayor',
      decision: {
        title: 'OARI Implementation Oversight',
        context: 'You signed the OARI ordinance. The 45-day clock is your deadline. Chief Montez has not released dispatch integration protocols. Three pilot districts are named but no teams exist.',
        options: [
          { id: 'A', label: 'Direct Montez to release protocols by end of week', effect: 'Forces the issue. Shows executive authority. Chief may push back privately.' },
          { id: 'B', label: 'Convene implementation task force (Mayor + Chief + OARI director)', effect: 'Collaborative approach. Buys 1 cycle but shows action.' },
          { id: 'C', label: 'Issue public progress report acknowledging delays', effect: 'Transparency play. Gets ahead of Tribune coverage. OPP may still escalate.' },
        ],
        stakes: 'Your signature is on this. $12.5M authorized, zero deployed. Mags Corliss already wrote the Day 30 story.',
        watching: ['Chief Montez (appointed by you)', 'Janae Rivers (OPP — your coalition)', 'Carmen Delaine (Tribune civic desk)']
      }
    }
  ],
  stabilization_fund: [
    {
      condition: (init) => init.milestoneNotes && init.milestoneNotes.includes('0 disbursed'),
      owner: 'civic-office-mayor',
      decision: {
        title: 'Stabilization Fund Disbursement Authorization',
        context: '$28M authorized, $4.2M approved for 47 recipients, $0 actually disbursed. 295 applications pending. OEWD Director Marcus Webb has not moved funds. Beverly Hayes and others are waiting.',
        options: [
          { id: 'A', label: 'Direct OEWD to begin disbursements within 10 days', effect: 'Money moves. Applicants get relief. Webb is on the clock.' },
          { id: 'B', label: 'Request independent audit before disbursement (CRC demand)', effect: 'Delays money but addresses fiscal accountability. Ashford gets what he wants.' },
          { id: 'C', label: 'Approve partial disbursement — 47 approved recipients first', effect: 'Incremental progress. Shows movement. 295 still waiting.' },
        ],
        stakes: '$0 disbursed over 5 editions. Beverly Hayes is a named citizen who submitted paperwork and heard nothing. The Tribune is tracking this.',
        watching: ['OEWD Director Marcus Webb', 'Warren Ashford (CRC — demanded audit)', 'Brenda Okoro (Deputy Mayor — direct oversight)']
      }
    },
    {
      condition: (init) => init.implementationPhase === 'committee-review',
      owner: 'civic-office-ind-swing',
      decision: {
        title: 'Stabilization Fund Committee Review — Agenda Item 4',
        context: 'Council President Vega chairs the committee reviewing the Stabilization Fund. $0 has been disbursed. The CRC wants an independent audit. The OPP wants immediate disbursement.',
        options: [
          { id: 'A', label: 'Advance to full council vote on disbursement timeline', effect: 'Forces a public vote. Both factions must commit.' },
          { id: 'B', label: 'Request OEWD presentation with disbursement plan', effect: 'Procedural. Gets data on record. Delays decision by 1 cycle.' },
          { id: 'C', label: 'Propose compromise — audit + partial disbursement simultaneously', effect: 'Bridge position. Satisfies both factions partially. Classic Vega move.' },
        ],
        stakes: 'You are the swing voter and the committee chair. Both sides are watching your agenda choices.',
        watching: ['OPP caucus (wants money moving)', 'CRC caucus (wants audit first)', 'Mayor Santana (his signature is on the fund)']
      }
    }
  ],
  baylight: [
    {
      condition: (init) => init.implementationPhase === 'blocked',
      owner: 'civic-office-baylight-authority',
      decision: {
        title: 'Outstanding Financing Instruments',
        context: 'Bond authorization passed 6-3. Two instruments remain unsigned: TIF language (incomplete) and soil remediation bonding (not executed). Construction cannot mobilize until both are signed.',
        options: [
          { id: 'A', label: 'Finalize TIF language and submit for City Legal review', effect: 'Removes one of two blockers. Remediation still pending.' },
          { id: 'B', label: 'Request extension on Q3 fiscal close deadline', effect: 'Buys time but signals to CRC that Baylight is slipping.' },
          { id: 'C', label: 'Package both instruments for simultaneous execution', effect: 'Clean resolution. Requires City Legal (Dr. Ellis) sign-off on both.' },
        ],
        stakes: '$2.1B project. The Tribune noted chalk outlines on the waterfront before the vote. Every delay is public.',
        watching: ['Dr. Simone Ellis (City Legal)', 'Warren Ashford (CRC — fiscal hawk)', 'Mayor Santana (signed the authorization)']
      }
    },
    {
      condition: (init) => init.implementationPhase === 'blocked',
      owner: 'civic-office-mayor',
      decision: {
        title: 'Baylight Financing Deadline',
        context: 'You signed the Baylight authorization. Q3 fiscal close deadline approaching. Two financing instruments unsigned. Director Ramos has not announced timelines.',
        options: [
          { id: 'A', label: 'Set public deadline for instrument execution', effect: 'Forces Ramos and Ellis to act. Public accountability.' },
          { id: 'B', label: 'Convene closed-door meeting with Ramos + Ellis', effect: 'Quiet resolution. No public pressure. Risk: looks like backroom dealing.' },
        ],
        stakes: 'Biggest project in Oakland history. CRC opposed it 3-6. Any delay validates their concerns.',
        watching: ['Keisha Ramos (Baylight Authority)', 'Dr. Simone Ellis (City Legal)', 'CRC caucus']
      }
    }
  ]
};

// ─── GENERATE DECISION QUEUES ───────────────────────────────────

function loadInitiativePacket(initKey) {
  const names = [
    `${initKey.replace(/_/g, '-')}_c${CYCLE}.json`,
    `${initKey}_c${CYCLE}.json`
  ];
  for (const name of names) {
    const p = path.join(INIT_PACKETS_DIR, name);
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch {}
    }
  }
  return null;
}

function main() {
  console.log(`\n=== buildDecisionQueue.js — Cycle ${CYCLE} ===\n`);

  // Collect decisions per office
  const officeDecisions = {};

  for (const [initKey, blockers] of Object.entries(BLOCKER_MAP)) {
    const packet = loadInitiativePacket(initKey);
    if (!packet || !packet.initiative) {
      console.log(`  ${initKey}: no packet found, skipping`);
      continue;
    }

    const init = packet.initiative;

    for (const blocker of blockers) {
      if (blocker.condition(init)) {
        const office = blocker.owner;
        if (!officeDecisions[office]) officeDecisions[office] = [];
        officeDecisions[office].push({
          initiative: init.name,
          initiativeKey: initKey,
          ...blocker.decision
        });
        console.log(`  ${initKey} → ${office}: ${blocker.decision.title}`);
      }
    }
  }

  // Write pending_decisions.md per office
  let totalFiles = 0;
  for (const [office, decisions] of Object.entries(officeDecisions)) {
    const workspaceDir = path.join(WORKSPACE_DIR, office, 'current');
    if (!fs.existsSync(workspaceDir)) {
      console.warn(`  WARNING: workspace not found for ${office}`);
      continue;
    }

    let md = `# Pending Decisions — Cycle ${CYCLE}\n\n`;
    md += `**These decisions are waiting on YOUR office. The city is watching.**\n\n`;
    md += `---\n\n`;

    for (const d of decisions) {
      md += `## ${d.title}\n`;
      md += `*Initiative: ${d.initiative}*\n\n`;
      md += `**Context:** ${d.context}\n\n`;
      md += `**Options:**\n`;
      for (const opt of d.options) {
        md += `- **${opt.id}.** ${opt.label}\n`;
        md += `  → ${opt.effect}\n`;
      }
      md += `\n**Stakes:** ${d.stakes}\n\n`;
      md += `**Who's watching:** ${d.watching.join(', ')}\n\n`;
      md += `---\n\n`;
    }

    md += `**OUTPUT REQUIRED:** Include a \`decisions\` array in your output JSON alongside \`statements\`. Each decision:\n`;
    md += '```json\n';
    md += `{\n`;
    md += `  "decisionId": "DEC-${CYCLE}-{OFFICE}-{NNN}",\n`;
    md += `  "initiative": "initiative name",\n`;
    md += `  "choice": "A/B/C",\n`;
    md += `  "rationale": "Why you chose this (in character, 1-2 sentences)",\n`;
    md += `  "publicStatement": "What you say publicly about this decision (quote-ready)",\n`;
    md += `  "privateNote": "What you actually think (not for publication)"\n`;
    md += `}\n`;
    md += '```\n';

    fs.writeFileSync(path.join(workspaceDir, 'pending_decisions.md'), md);
    console.log(`  → ${office}/current/pending_decisions.md (${decisions.length} decisions)`);
    totalFiles++;
  }

  console.log(`\n=== Done: ${totalFiles} decision queues generated ===\n`);
}

main();
