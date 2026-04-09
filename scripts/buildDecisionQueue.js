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

const getCurrentCycle = require('../lib/getCurrentCycle');
const CYCLE = getCurrentCycle();

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
        watching: ['OPP caucus (wants money moving)', 'CRC caucus (wants audit first)', 'Mayor Santana (her signature is on the fund)']
      }
    }
  ],
  health_center: [
    {
      condition: (init) => init.implementationPhase === 'in-progress' || init.implementationPhase === 'pre-design',
      owner: 'civic-office-mayor',
      decision: {
        title: 'Health Center Operator Selection',
        context: '$45M authorized for Temescal Community Health Center. Architect RFP issued, site due diligence underway. But building design depends on operator — you can\'t design exam rooms without knowing what services will be provided. No operator has been selected. Bobby Chen-Ramirez needs direction.',
        options: [
          { id: 'A', label: 'Direct sole-source negotiation with Alameda Health System', effect: 'Fast. AHS already runs Highland. But Temescal community wanted independent governance. OPP may object.' },
          { id: 'B', label: 'Issue competitive RFP for operator selection', effect: 'Transparent process. Adds 2-3 cycles to timeline. Chen-Ramirez can start design around common requirements.' },
          { id: 'C', label: 'Defer operator selection — authorize design for flexible multi-use', effect: 'Design proceeds now. Operator selected later. Risk: expensive redesign if operator needs differ from assumptions.' },
        ],
        stakes: 'The 5-cycle delay already cost this project momentum. Every additional cycle without an operator means design proceeds on assumptions. Ashford voted no — he\'ll highlight any waste.',
        watching: ['Bobby Chen-Ramirez (Project Director)', 'Warren Ashford (CRC, D7 — Temescal is his district, voted NO)', 'Rose Delgado (OPP, D3 — Fruitvale/Temescal overlap)']
      }
    },
    {
      condition: (init) => init.implementationPhase === 'in-progress' || init.implementationPhase === 'pre-design',
      owner: 'civic-office-crc-faction',
      decision: {
        title: 'Health Center Budget Oversight',
        context: '$45M authorized, $0 expended. Priority designation was delayed 5 cycles. The project is now in pre-design with architect RFP issued and site due diligence commissioned. Your faction voted against this 6-2.',
        options: [
          { id: 'A', label: 'Request quarterly budget accountability reports to council', effect: 'Standard oversight. Shows fiscal discipline without obstructing. Chen-Ramirez complies easily.' },
          { id: 'B', label: 'Demand independent cost estimate before design contract award', effect: 'Slows the architect selection by 1 cycle. Forces budget validation. OPP will call it obstruction.' },
          { id: 'C', label: 'Accept the project and focus CRC energy elsewhere', effect: 'Pick your battles. The vote is done. Redirect attention to Stabilization Fund audit.' },
        ],
        stakes: 'You voted no. The project is happening anyway. The question is whether CRC fights every milestone or plays oversight strategically.',
        watching: ['Bobby Chen-Ramirez (Project Director)', 'Mayor Santana (signed the authorization)', 'Nina Chen (CRC, D8 — your coalition)']
      }
    }
  ],
  transit_hub: [
    {
      condition: (init) => init.implementationPhase === 'pre-vote-visioning' || init.status === 'visioning-complete' || init.status === 'pending-vote',
      owner: 'civic-office-mayor',
      decision: {
        title: 'Fruitvale Transit Hub Phase II Authorization',
        context: '$230M project. Elena Soria Dominguez has completed community visioning sessions and submitted a council briefing. The vote is approaching. Two design scenarios with displacement analysis. Fruitvale community wants affordable housing and small business protection.',
        options: [
          { id: 'A', label: 'Publicly endorse Phase II and push for council vote', effect: 'Shows executive leadership. OPP will follow. CRC will demand cost controls. Independents are the margin.' },
          { id: 'B', label: 'Request additional community sessions before endorsing', effect: 'Cautious. Buys 1-2 cycles. Fruitvale residents may see delay as broken promise.' },
          { id: 'C', label: 'Endorse with conditions — anti-displacement proviso required', effect: 'Satisfies OPP equity demands. CRC can\'t argue against conditions. Strongest coalition path.' },
        ],
        stakes: '$230M is the second-largest project after Baylight. Fruitvale is OPP territory. The community visioning found displacement fears are real. Your endorsement sets the terms.',
        watching: ['Rose Delgado (OPP, D3 — Fruitvale)', 'Elena Soria Dominguez (Planning Lead)', 'Warren Ashford (CRC — cost concerns)']
      }
    },
    {
      condition: (init) => init.implementationPhase === 'pre-vote-visioning' || init.status === 'visioning-complete' || init.status === 'pending-vote',
      owner: 'civic-office-opp-faction',
      decision: {
        title: 'Transit Hub Anti-Displacement Requirements',
        context: 'Phase II visioning shows community priorities: protect small businesses, affordable housing, safer pedestrian access. 63 Fruitvale residents attended, 51 Spanish-speaking. The council briefing is submitted. Your faction controls the Fruitvale district (Delgado, D3).',
        options: [
          { id: 'A', label: 'Demand binding anti-displacement agreement before authorization vote', effect: 'Maximum protection. May delay the vote. CRC might support the process demand even if they oppose the project.' },
          { id: 'B', label: 'Accept visioning proviso — anti-displacement assessment required but not binding', effect: 'Gets the vote done. Assessment happens during design. Risk: assessment becomes a checkbox, not a commitment.' },
          { id: 'C', label: 'Push for community benefit agreement with enforcement mechanism', effect: 'Legal teeth. Requires City Legal (Dr. Ellis) to draft. Takes longer but survives political change.' },
        ],
        stakes: 'Fruitvale is your base. 51 Spanish-speaking residents showed up to say they\'re afraid of displacement. What you demand now is what they get.',
        watching: ['Rose Delgado (D3 — your member, her district)', 'Elena Soria Dominguez (Planning Lead)', 'Leonard Tran (IND, D2 — swing vote)']
      }
    },
    {
      condition: (init) => init.implementationPhase === 'pre-vote-visioning' || init.status === 'visioning-complete' || init.status === 'pending-vote',
      owner: 'civic-office-ind-swing',
      decision: {
        title: 'Transit Hub Phase II — Council Vote Position',
        context: '$230M authorization. Community visioning complete. Council briefing submitted. OPP wants anti-displacement guarantees. CRC wants cost controls. You are the swing votes.',
        options: [
          { id: 'A', label: 'Vote yes with anti-displacement and cost control conditions', effect: 'Bridge position. Satisfies both factions partially. Classic swing move.' },
          { id: 'B', label: 'Vote yes unconditionally — trust the visioning process', effect: 'Clean vote. Speeds up the project. But gives up leverage on conditions.' },
          { id: 'C', label: 'Request independent cost analysis before voting', effect: 'Procedural delay. Gets data CRC wants. OPP sees obstruction. Adds 1-2 cycles.' },
        ],
        stakes: 'Your votes decide whether this passes. Fruitvale is watching. The terms you set become the project\'s foundation.',
        watching: ['Mayor Santana (needs your votes)', 'Rose Delgado (OPP, D3)', 'Warren Ashford (CRC, D7)', 'Elena Soria Dominguez (Planning Lead)']
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

    md += `**OUTPUT REQUIRED:** For each decision above, include a statement in your output JSON using your existing statement types. Use the statement type that fits your office:\n\n`;
    md += `- **Mayor:** \`authorization_response\` with \`decision\` (approved/denied/deferred), \`conditions\`, and \`initiative\` fields\n`;
    md += `- **Factions:** \`hearing_request\`, \`audit_demand\`, \`endorsement\`, or \`dissent\` — whichever matches your position\n`;
    md += `- **Police Chief:** \`oari_coordination\` or \`operational_update\` with a clear position\n`;
    md += `- **Baylight Authority:** \`construction_update\` or \`milestone_announcement\` with blockers addressed\n`;
    md += `- **Independents:** \`conditional_support\`, \`endorsement\`, or \`dissent\` — Vega and Tran speak separately\n\n`;
    md += `Your statement MUST reference the specific decision, name your choice, and explain why. The initiative agents and desk reporters will read your statement next cycle.\n`;

    fs.writeFileSync(path.join(workspaceDir, 'pending_decisions.md'), md);
    console.log(`  → ${office}/current/pending_decisions.md (${decisions.length} decisions)`);
    totalFiles++;
  }

  console.log(`\n=== Done: ${totalFiles} decision queues generated ===\n`);
}

main();
