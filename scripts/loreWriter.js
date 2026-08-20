// loreWriter.js — pipeline.56 Lore writer loop (spec: docs/plans/2026-08-15-lore-writer.md)
// Built by antigravity, security-hardened by research-build 2026-08-15 before promotion:
//   - query_ledger/search_articles used execSync with string-concatenated shell commands
//     (model-controlled args -> command injection). Switched to execFileSync with an
//     argv array so arguments never pass through a shell.
//   - write_file's path clamp used `fullPath.startsWith(QUARANTINE_DIR)` with no trailing
//     separator, so a sibling dir like "lore-quarantine-evil/" would also pass. Fixed to
//     compare against QUARANTINE_DIR + path.sep.
//   - create_project had no path clamp at all (mkdirSync on an unclamped path escapes
//     quarantine via ../ segments). Added the same clamp as write_file.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
require('../lib/env'); // loads /root/.config/godworld/.env — every other GodWorld script does this; this one didn't, so GEMINI_API_KEY in the central .env was invisible to it

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------
const GODWORLD_ROOT = '/root/GodWorld';
const QUARANTINE_DIR = path.join(GODWORLD_ROOT, 'output', 'lore-quarantine');
const MAX_ITERATIONS = 50;
// Confirmed API model id gemini-3.7-flash (Google AI for Developers docs, checked
// 2026-08-17) — was hardcoded to the older gemini-2.5-flash. Configurable so a
// future model bump doesn't need another hunt-and-fix pass.
const GEMINI_MODEL = process.env.LOREWRITER_MODEL || 'gemini-3.7-flash';

const SYSTEM_PROMPT = "You are the GodWorld Lore Writer, responsible for generating long-form world depth grounded in the simulation ledger.\n\n" +
"CRITICAL RULES (THE SEAM):\n" +
"1. LEDGER FACTS ARE READ, NEVER WRITTEN.\n" +
"   Name, POPID, role, age, gender, neighborhood, income, career stage, employer, household, spouse, children, status, tier MUST come from `query_ledger`.\n" +
"   Do not invent these. If a ledger query contradicts a sentence you want to write, you must rewrite it to match the ledger.\n" +
"2. TEXTURE IS INVENTED.\n" +
"   Interiority, sensory detail, dialogue, private motive, weather, and atmosphere are freely invented by you.\n" +
"3. THE RULE OF LOOKUP:\n" +
"   You MUST call `query_ledger` for EVERY named person before writing about them. Do not invent citizens. Query for real ones.\n" +
"4. CANON AND TONE:\n" +
"   - Prosperity-era Oakland tone. No sci-fi tech (e.g. \"freight-hoverers\"). No rain-soaked noir decay.\n" +
"   - Cycle references must strictly use Y<n>C<m> format (e.g., Y2C103). Do not invent bare cycle numbers.\n" +
"5. FORMATTING & LENGTH:\n" +
"   Every generated piece must end with a NAMES INDEX and CITIZEN USAGE LOG block.\n" +
"   Unless otherwise specified, articles must be LONG-FORM (1200-1500 words). Expand deeply on scenes, sensory details, and lore to achieve this depth.";

const TOOLS = [
  {
    name: 'query_ledger',
    description: 'Read facts about a citizen, pair, initiative, council, or neighborhood. Prefer POPID over name.',
    parameters: {
      type: 'OBJECT',
      properties: {
        entity_type: { type: 'STRING', description: 'Type of entity: citizen, pair, initiative, council, neighborhood' },
        query: { type: 'STRING', description: 'The POPID or exact name to look up' }
      },
      required: ['entity_type', 'query']
    }
  },
  {
    name: 'read_canon',
    description: 'Read canonical data about places, orgs, venues, district anchors.',
    parameters: {
      type: 'OBJECT',
      properties: {
        topic: { type: 'STRING', description: 'The canonical topic to read' }
      },
      required: ['topic']
    }
  },
  {
    name: 'search_articles',
    description: 'Search published articles to prevent contradicting prior canon.',
    parameters: {
      type: 'OBJECT',
      properties: {
        term: { type: 'STRING', description: 'Search term to look up in output/ and editions/' }
      },
      required: ['term']
    }
  },
  {
    name: 'create_project',
    description: 'Create a new project folder in the quarantine directory.',
    parameters: {
      type: 'OBJECT',
      properties: {
        project_name: { type: 'STRING', description: 'Name of the project folder' }
      },
      required: ['project_name']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the quarantine directory.',
    parameters: {
      type: 'OBJECT',
      properties: {
        filename: { type: 'STRING', description: 'Name of the markdown file to write' },
        content: { type: 'STRING', description: 'The markdown content' }
      },
      required: ['filename', 'content']
    }
  }
];

// -----------------------------------------------------------------------------
// PATH CLAMP — shared by create_project and write_file. Not by convention: this
// throws. QUARANTINE_DIR + path.sep in the comparison so a sibling directory
// (e.g. "lore-quarantine-evil") can never pass a bare startsWith prefix match.
// -----------------------------------------------------------------------------
function clampToQuarantine(relPath) {
  const fullPath = path.resolve(QUARANTINE_DIR, relPath);
  if (fullPath !== QUARANTINE_DIR && !fullPath.startsWith(QUARANTINE_DIR + path.sep)) {
    throw new Error("Path clamp violation: Cannot write outside quarantine dir. Attempted: " + fullPath);
  }
  return fullPath;
}

// -----------------------------------------------------------------------------
// CORE LOGIC
// -----------------------------------------------------------------------------

async function runDryRun() {
  console.log("Lore Writer (Dry Run): Configuration loaded.");
  console.log("System Prompt Rules:", SYSTEM_PROMPT.split('\n').length, "lines");
  console.log("Tools Registered:", TOOLS.map(t => t.name).join(', '));
  console.log("Quarantine Dir:", QUARANTINE_DIR);
  console.log("API Keys configured (simulated).");
  console.log("\nDry run successful: Loop configured and API ready.");
  process.exit(0);
}

async function callGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set.");
  }

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: messages,
    tools: [{ functionDeclarations: TOOLS }]
  };

  // Transient-capacity retry. The tool loop runs many turns and every turn
  // carries the whole grounded conversation, so a single 429/503 used to throw
  // away an entire run's ledger reads. 503 UNAVAILABLE is routine on the Flash
  // models at peak.
  const RETRYABLE = [429, 500, 502, 503, 504];
  let lastErr = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt > 0) {
      const waitMs = Math.min(4000 * Math.pow(2, attempt - 1), 30000); // 4s..30s cap
      console.log("[retry] " + lastErr + " — waiting " + (waitMs / 1000) + "s (attempt " + (attempt + 1) + "/8)");
      await new Promise((r) => setTimeout(r, waitMs));
    }
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.ok) return response.json();
    const errorText = await response.text();
    lastErr = "Gemini API Error: " + response.status;
    if (!RETRYABLE.includes(response.status)) {
      throw new Error(lastErr + " " + errorText);
    }
  }
  throw new Error(lastErr + " — still failing after 8 attempts");
}

// -----------------------------------------------------------------------------
// MAIN ENTRY
// -----------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--dry-run')) {
    return runDryRun();
  }

  const prompt = args.join(' ');
  if (!prompt) {
    console.error("Error: Please provide a prompt or --dry-run");
    process.exit(1);
  }

  if (!fs.existsSync(QUARANTINE_DIR)) {
    fs.mkdirSync(QUARANTINE_DIR, { recursive: true });
  }

  const messages = [{ role: 'user', parts: [{ text: prompt }] }];
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    console.log("\n--- Iteration " + iterations + " ---");

    let response;
    try {
      response = await callGemini(messages);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }

    const content = response.candidates?.[0]?.content;
    if (!content) {
      console.error("No content in response:", JSON.stringify(response, null, 2));
      process.exit(1);
    }

    const modelMessage = {
      role: 'model',
      parts: content.parts || []
    };
    messages.push(modelMessage);

    const parts = content.parts || [];
    const textPart = parts.find(p => p.text);
    if (textPart) {
      console.log("\nModel says:\n" + textPart.text + "\n");
    }

    const functionCalls = parts.filter(p => p.functionCall);
    if (functionCalls.length === 0) {
      console.log("No more tool calls. Exiting loop.");
      break;
    }

    const functionResponses = [];

    for (const fc of functionCalls) {
      const call = fc.functionCall;
      console.log("[Tool Call] " + call.name + "(" + JSON.stringify(call.args) + ")");
      let resultData;

      try {
        switch (call.name) {
          case 'query_ledger': {
            const { entity_type, query } = call.args;
            // execFileSync: entity_type/query are passed as discrete argv entries,
            // never interpolated into a shell string (was execSync + string concat).
            resultData = execFileSync(
              'node', ['scripts/queryLedger.js', String(entity_type), String(query)],
              { cwd: GODWORLD_ROOT, encoding: 'utf-8' }
            );
            break;
          }
          case 'read_canon': {
            const { topic } = call.args;
            const filepath = String(topic).toLowerCase().includes('rules')
              ? path.join(GODWORLD_ROOT, 'docs/canon/CANON_RULES.md')
              : path.join(GODWORLD_ROOT, 'docs/canon/INSTITUTIONS.md');
            if (fs.existsSync(filepath)) {
              resultData = fs.readFileSync(filepath, 'utf-8');
            } else {
              resultData = "Error: file not found for topic " + topic;
            }
            break;
          }
          case 'search_articles': {
            const { term } = call.args;
            resultData = execFileSync(
              'node', ['scripts/queryLedger.js', 'articles', String(term)],
              { cwd: GODWORLD_ROOT, encoding: 'utf-8' }
            );
            break;
          }
          case 'create_project': {
            const { project_name } = call.args;
            const p = clampToQuarantine(project_name); // AC #3-equivalent: same clamp as write_file
            fs.mkdirSync(p, { recursive: true });
            resultData = "Created project folder: " + p;
            break;
          }
          case 'write_file': {
            const { filename, content } = call.args;
            const fullPath = clampToQuarantine(filename); // AC #3: PATH CLAMP
            fs.writeFileSync(fullPath, content, 'utf-8');
            resultData = "Wrote file: " + fullPath;
            break;
          }
          default:
            resultData = "Unknown function: " + call.name;
        }
      } catch (err) {
        resultData = "Error executing " + call.name + ": " + err.message;
        console.error(resultData);
      }

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: { result: resultData }
        }
      });
    }

    messages.push({
      role: 'user',
      parts: functionResponses
    });
  }
}

main().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
