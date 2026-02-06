/**
 * ============================================================================
 * media-generator skill
 * ============================================================================
 * Generates media content from cycle context with multi-agent routing.
 *
 * @version 1.0
 * ============================================================================
 */

const fs = require('fs').promises;
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

// Voice profile prompts
const VOICE_PROFILES = {
  tribune: {
    name: 'Bay Tribune',
    systemPrompt: `You are writing for the Bay Tribune, Oakland's newspaper of record.

Voice: Professional, balanced, factual. Present multiple perspectives.
Structure: Inverted pyramid - lead with the most important facts.
Include: Direct quotes when available, context for newcomers, what's next.
Avoid: Editorializing, speculation, sensationalism.

Format your output as markdown with clear sections.`
  },

  continuity: {
    name: 'Continuity Checker',
    systemPrompt: `You are a fact-checker and continuity editor for GodWorld media.

Your job:
1. Verify all names are spelled correctly
2. Check timeline consistency (events in correct order)
3. Verify arc references match previous coverage
4. Flag any contradictions with established facts

Output format:
- PASS: [brief summary] if no issues
- ISSUES: [list each issue with severity: LOW/MEDIUM/HIGH]

Be thorough but concise.`
  }
};

/**
 * Determine which agents to route to based on context
 */
function determineRouting(contextPack, riskFlags) {
  const agents = [];

  // Always include Tribune for routine coverage
  agents.push('tribune');

  // Check for high-tension situations
  const hasHighTension = riskFlags.includes('high-tension');
  const hasChaos = (contextPack.city?.chaosEvents || 0) >= 2;
  const hasCivic = (contextPack.city?.civicEvents || 0) >= 1;
  const hasConflicts = contextPack.conflictsDetected === true;

  // Routing logic
  if (hasConflicts) {
    // Conflicts detected - only continuity check
    return ['continuity'];
  }

  // Always run continuity check for civic events
  if (hasCivic || hasHighTension) {
    agents.push('continuity');
  }

  return agents;
}

/**
 * Build prompt for Tribune Pulse
 */
function buildTribunePrompt(contextPack, citizens) {
  const city = contextPack.city || {};
  const civic = contextPack.civic || {};

  let prompt = `Generate the Bay Tribune Pulse for Cycle ${contextPack.cycleId}.

## City State
- Season: ${city.season || 'unknown'}
- Weather: ${city.weather?.type || 'clear'} (impact: ${city.weather?.impact || 1.0})
- Sentiment: ${city.sentiment || 0}
- Economic Mood: ${city.economicMood || 50}/100

## This Cycle's Events
- Chaos Events: ${city.chaosEvents || 0}
- Civic Events: ${city.civicEvents || 0}
`;

  // Add civic outcomes
  if (civic.votes?.length > 0) {
    prompt += `\n## Civic Votes\n`;
    for (const vote of civic.votes) {
      prompt += `- ${vote.name}: ${vote.outcome} (${vote.voteCount || 'no count'})\n`;
    }
  }

  // Add risk context
  if (contextPack.riskFlags?.length > 0) {
    prompt += `\n## Risk Flags: ${contextPack.riskFlags.join(', ')}\n`;
  }

  // Add key citizens
  if (citizens?.length > 0) {
    prompt += `\n## Key Citizens This Cycle\n`;
    for (const c of citizens.slice(0, 10)) {
      prompt += `- ${c.name} (${c.role || c.occupation || 'citizen'})\n`;
    }
  }

  prompt += `
## Required Sections
1. **Front Page** - Lead story (most significant event)
2. **Council Watch** - Political analysis (if civic events)
3. **Neighborhood Beat** - Local impacts
4. **Looking Ahead** - What to watch next cycle

Write 400-600 words total. Use specific names and details from above.`;

  return prompt;
}

/**
 * Build prompt for Continuity Check
 */
function buildContinuityPrompt(content, citizens, previousCoverage) {
  return `Check this media content for continuity issues:

## Content to Check
${content}

## Known Citizens (verify spelling)
${citizens.map(c => `- ${c.name} (${c.pop_id})`).join('\n')}

## Previous Coverage Context
${previousCoverage || 'No previous coverage loaded.'}

## Check For
1. Name spelling errors
2. Timeline inconsistencies
3. Contradictions with known facts
4. Arc continuity breaks

Output PASS or list ISSUES with severity.`;
}

/**
 * Main execute function
 */
async function execute(context) {
  const { config, log } = context;

  const dbPath = config?.godworld?.dbPath || './godworld/godworld.db';
  const mediaPath = config?.godworld?.mediaOutputPath || './media';
  const apiKey = config?.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    log?.error?.('No Anthropic API key configured');
    return { error: 'no_api_key' };
  }

  // 1. Load latest cycle from DB
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    log?.error?.('better-sqlite3 not installed');
    return { error: 'no_sqlite' };
  }

  const db = new Database(dbPath, { readonly: true });

  const latestCycle = db.prepare(
    'SELECT * FROM cycles ORDER BY cycle_id DESC LIMIT 1'
  ).get();

  if (!latestCycle) {
    log?.warn?.('No cycles in database');
    db.close();
    return { error: 'no_cycles' };
  }

  const riskFlags = JSON.parse(latestCycle.risk_flags || '[]');

  // 2. Load context pack from exports
  const contextPath = path.join(
    config?.godworld?.exportsPath || './exports',
    `cycle-${String(latestCycle.cycle_id).padStart(2, '0')}-context.json`
  );

  let contextPack;
  try {
    const raw = await fs.readFile(contextPath, 'utf8');
    contextPack = JSON.parse(raw);
  } catch (err) {
    log?.error?.(`Failed to load context pack: ${err.message}`);
    db.close();
    return { error: 'context_load_failed' };
  }

  // 3. Load key citizens
  const citizens = db.prepare(
    'SELECT * FROM v_key_citizens LIMIT 20'
  ).all();

  db.close();

  // 4. Determine routing
  const agents = determineRouting(contextPack, riskFlags);
  log?.info?.(`Routing to agents: ${agents.join(', ')}`);

  // 5. Initialize Claude
  const claude = new Anthropic({ apiKey });

  const outputs = {};
  const cycleDir = path.join(mediaPath, `cycle-${latestCycle.cycle_id}`);
  await fs.mkdir(cycleDir, { recursive: true });

  // 6. Generate content per agent
  for (const agent of agents) {
    const profile = VOICE_PROFILES[agent];
    if (!profile) continue;

    let userPrompt;
    if (agent === 'tribune') {
      userPrompt = buildTribunePrompt(contextPack, citizens);
    } else if (agent === 'continuity') {
      // Continuity checks the tribune output
      if (!outputs.tribune) continue;
      userPrompt = buildContinuityPrompt(outputs.tribune, citizens, null);
    }

    try {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: profile.systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });

      const content = response.content[0]?.text || '';
      outputs[agent] = content;

      // Save to file
      const filename = agent === 'tribune' ? 'tribune-pulse.md' :
                       'continuity-check.md';
      await fs.writeFile(path.join(cycleDir, filename), content);

      log?.info?.(`Generated ${agent}: ${content.length} chars`);

    } catch (err) {
      log?.error?.(`${agent} generation failed: ${err.message}`);
      outputs[agent] = { error: err.message };
    }
  }

  // 7. Evaluate continuity gate
  let continuityScore = 1.0;
  let riskScore = 0.0;

  if (outputs.continuity) {
    const check = outputs.continuity.toLowerCase();
    if (check.includes('pass')) {
      continuityScore = 1.0;
    } else if (check.includes('high')) {
      continuityScore = 0.5;
    } else if (check.includes('medium')) {
      continuityScore = 0.8;
    }
  }

  // Risk score from flags
  riskScore = riskFlags.length * 0.15;

  const publishable = continuityScore >= 0.9 && riskScore <= 0.4;

  return {
    cycleId: latestCycle.cycle_id,
    agents,
    outputs: Object.keys(outputs),
    continuityScore,
    riskScore,
    publishable,
    outputDir: cycleDir
  };
}

module.exports = { execute };
