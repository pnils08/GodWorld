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
const WRITE_WARNING_TURNS = 10;
// pipeline.106 (builder 2026-11-08): gemini-3.8-flash (id confirmed from the API's model
// list 2026-11-08) with thinking at high — the upstream gemini-writer runs thinking_level
// HIGH; this port never set it. Both configurable.
const GEMINI_MODEL = process.env.LOREWRITER_MODEL || 'gemini-3.8-flash';
const THINKING_LEVEL = process.env.LOREWRITER_THINKING || 'high';
// The notebook search is 30-40 s and NotebookLM quota per call; a run can take 50 turns.
const NOTEBOOK_CALLS_PER_RUN = 3;

const SYSTEM_PROMPT = "You are the GodWorld Lore Writer, responsible for generating long-form world depth grounded in the simulation ledger.\n\n" +
"CRITICAL RULES (THE SEAM):\n" +
"1. LEDGER FACTS ARE READ, NEVER WRITTEN.\n" +
"   Name, POPID, role, age, gender, neighborhood, income, career stage, employer, household, spouse, children, status, tier MUST come from `query_ledger`.\n" +
"   Do not invent these. If a ledger query contradicts a sentence you want to write, you must rewrite it to match the ledger.\n" +
"2. TEXTURE IS INVENTED.\n" +
"   Interiority, sensory detail, dialogue, private motive, weather, and atmosphere are freely invented by you.\n" +
"3. THE RULE OF LOOKUP:\n" +
"   You MUST call `query_ledger` for EVERY named person before writing about them. Do not invent citizens. Query for real ones.\n" +
"   Everything already established about a person, place or event is in the canon: `search_articles` (the city's records on disk: every edition, the Richmond Archive, player TrueSource cards, world summaries, the ledger), `canon_recall` (the Bay Tribune's published canon archive) and `notebook_search` (the canon notebook, slow, a few calls per run). `read_source` opens one file a search returned, whole. Search before you write a past event, a career fact, a birthplace or a game; then write -- research has a turn budget.\n" +
"4. CANON AND TONE:\n" +
"   - Prosperity-era Oakland tone. No sci-fi tech (e.g. \"freight-hoverers\"). No rain-soaked noir decay.\n" +
"   - Cycle references must strictly use Y<n>C<m> format (e.g., Y2C51). Do not invent bare cycle numbers.\n" +
"   - m is the week within the year and never exceeds 52. An engine cycle N converts as n = floor((N-1)/52)+1, m = ((N-1)%52)+1 (cycle 103 = Y2C51, cycle 105 = Y3C1, cycle 111 = Y3C7). Never write an engine cycle number as m.\n" +
"5. FORMATTING & LENGTH:\n" +
"   Every generated piece must end with a NAMES INDEX and CITIZEN USAGE LOG block.\n" +
"   Unless otherwise specified, articles must be LONG-FORM (1200-1500 words). Expand deeply on scenes, sensory details, and lore to achieve this depth.\n" +
"6. DELIVERY:\n" +
"   The finished piece is delivered ONLY by calling the `write_file` tool. Never output the finished article as reply text -- prose you type instead of a write_file call is discarded. When the piece (including the NAMES INDEX and CITIZEN USAGE LOG) is ready, call write_file exactly once with the complete content as the `content` argument.";

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
    description: 'Ranked search of the city records on disk: every published edition, the Richmond Archive, player TrueSource cards (birthplace, draft, career stats), world summaries, gate-passed articles, the ledger. Use it to avoid contradicting prior canon.',
    parameters: {
      type: 'OBJECT',
      properties: {
        term: { type: 'STRING', description: 'A name, place or phrase, e.g. "Martin Richards" or "Richards Mets trade"' }
      },
      required: ['term']
    }
  },
  {
    name: 'canon_recall',
    description: 'The Bay Tribune published canon archive: editions, supplementals, lore and daily pieces, each labeled with its cycle. Search a person, place or event.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'A person, place or event' }
      },
      required: ['query']
    }
  },
  {
    name: 'read_source',
    description: 'Read one canon file whole, by the path search_articles printed (e.g. "editions/cycle_pulse_edition_101.txt" or "archive/non-articles/data/Martin Richards DataPage v1.0.txt"). Use it instead of searching phrases to read more of an article. Long files come in pages; pass offset to continue.',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: { type: 'STRING', description: 'Repo-relative path from a search_articles result' },
        offset: { type: 'NUMBER', description: 'Character offset to start from (default 0)' }
      },
      required: ['path']
    }
  },
  {
    name: 'notebook_search',
    description: 'Ask the canon notebook a question; it answers from every canon source with citations. Slow (30-40 s) and limited to ' + NOTEBOOK_CALLS_PER_RUN + ' calls per run: save it for a question the other searches leave open.',
    parameters: {
      type: 'OBJECT',
      properties: {
        question: { type: 'STRING', description: 'One short question, e.g. "Where was Martin Richards born and drafted from?"' }
      },
      required: ['question']
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

// pipeline.106: never overwrite a quarantine piece; a rerun on the same subject picks a
// new name instead of replacing a graded or repaired draft.
function writeQuarantineFile(filename, content) {
  const fullPath = clampToQuarantine(filename); // AC #3: PATH CLAMP
  if (fs.existsSync(fullPath)) {
    throw new Error('file exists: ' + path.relative(QUARANTINE_DIR, fullPath) + ' -- choose a new filename');
  }
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
}

// S417: a run that ends with a long final text turn and no write_file call
// (2026-09-04 -- Gemini answered in prose instead of calling the tool, after
// a string of 503/429 retries) used to just print the piece and exit,
// silently discarding a paid generation. This derives a filesystem-safe slug
// from the prompt so the fallback save below gets a readable name.
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'untitled';
}

// Minimum length to treat a final turn as a real generated piece rather than
// closing chatter ("Done." / "Let me know if..."). The system prompt mandates
// 1200-1500 words (well over 5000 chars); 400 is a deliberately low floor --
// false positives (rescuing throwaway chatter) cost nothing since /lore-ingest
// re-verifies every quarantine file against the ledger regardless of how it
// got there. A false negative (losing a real piece) is the actual failure mode.
const FALLBACK_MIN_CHARS = 400;

// -----------------------------------------------------------------------------
// CANON SOURCES (pipeline.106)
// -----------------------------------------------------------------------------

// The bay-tribune canon archive, as the desk writers' canon_recall reads it
// (cron-desk-writer.js toolCanonRecall), with lore kept and no cycle cutoff: a deep
// dive looks backward over the whole record. Supermemory is semantic and always
// answers, so a result counts only if its text carries the query's own terms.
async function canonRecall(query) {
  const q = String(query || '').trim();
  if (!q) return '(empty query)';
  if (!process.env.SUPERMEMORY_CC_API_KEY) return '(canon_recall unavailable: no Supermemory key in this run)';
  const raw = await require('../lib/supermemory').search(q, { containerTags: ['bay-tribune'], limit: 16, timeoutMs: 15000, apiVersion: 'v3' });
  const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'about', 'what', 'where', 'into', 'over']);
  const terms = Array.from(new Set(q.toLowerCase().split(/[^a-z0-9']+/).filter((t) => t.length >= 3 && !STOP.has(t))));
  const need = terms.length <= 3 ? terms.length : Math.ceil(terms.length * 0.6);
  const seen = new Set();
  const out = [];
  for (const x of raw || []) {
    const m = x.metadata || {};
    const title = String(m.title || x.title || '');
    if (seen.has(x.documentId)) continue;
    const chunks = (x.chunks || []).filter((k) => k.isRelevant);
    const text = (chunks.length ? chunks : (x.chunks || []).slice(0, 1)).map((k) => String(k.content || '')).join(' ')
      .replace(/[#*_|>-]{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    if ((text.match(/[A-Za-z]/g) || []).length < 80) continue;
    const low = text.toLowerCase();
    if (terms.length && terms.filter((t) => low.includes(t)).length < need) continue;
    seen.add(x.documentId);
    const c = Number(m.cycle);
    out.push('[' + (Number.isFinite(c) ? 'C' + c : 'cycle unknown') + ' · ' + (m.type || 'piece') + ' · ' + title + '] ' + text.slice(0, 600));
    if (out.length >= 6) break;
  }
  if (!out.length) return 'No published piece came back for "' + q + '". That is not proof the canon is silent; do not write that it is.';
  return out.join('\n');
}

// One canon file whole, in pages. Only a path the crons' canon search would serve
// (lib/mags isCanonSearchPath), resolved inside the repo; never a symlink out.
const READ_PAGE_CHARS = 20000;
function readSource(relPath, offset) {
  const rel = path.normalize(String(relPath || '').trim()).replace(/^\/+/, '');
  if (!rel || rel.startsWith('..') || !require('../lib/mags').isCanonSearchPath(rel)) {
    return 'read_source refused: "' + relPath + '" is not a canon path a search returned.';
  }
  const full = path.join(GODWORLD_ROOT, rel);
  if (!fs.existsSync(full) || fs.lstatSync(full).isSymbolicLink() || !fs.statSync(full).isFile()) {
    return 'read_source: no such file: ' + rel;
  }
  const text = fs.readFileSync(full, 'utf-8');
  const start = Math.max(0, Math.floor(Number(offset) || 0));
  const page = text.slice(start, start + READ_PAGE_CHARS);
  const end = start + page.length;
  return '[' + rel + ' chars ' + start + '-' + end + ' of ' + text.length + ']\n' + page +
    (end < text.length ? '\n[more: read_source with offset ' + end + ']' : '');
}

// The canon notebook through the read-only, fail-closed wrapper (whole-notebook scope).
function notebookSearch(question) {
  const q = String(question || '').trim().slice(0, 1000);
  if (!q) return '(empty question)';
  const out = execFileSync('node', ['scripts/notebooklmCanonSearch.js', '--question', q, '--timeout', '180'],
    { cwd: GODWORLD_ROOT, encoding: 'utf-8', timeout: 240 * 1000, maxBuffer: 10 * 1024 * 1024 });
  const r = JSON.parse(out.slice(out.indexOf('{')));
  const cited = (r.sourceExcerpts || []).slice(0, 8)
    .map((e) => '[' + e.citationNumber + '] ' + e.sourceTitle + ': ' + String(e.citedText).replace(/\s+/g, ' ').slice(0, 300));
  return String(r.answer || '') + '\n\nCITED SOURCES:\n' + cited.join('\n');
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
    tools: [{ functionDeclarations: TOOLS }],
    // S426: unset before this, so a long-form 1200-1500 word piece plus the
    // NAMES INDEX/CITIZEN USAGE LOG blocks plus a write_file call could hit the
    // model's default output cap mid-generation -- the 2026-09-18 Hal Richmond
    // run cut off mid-sentence with no write_file call as a result. ~3-4k tokens
    // is what the mandated length needs; 8192 is deliberate headroom.
    // pipeline.106: thinking tokens ride alongside the piece; 32768 leaves room for both.
    generationConfig: { maxOutputTokens: 32768, thinkingConfig: { thinkingLevel: THINKING_LEVEL } }
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
    // S426: fetch() itself can throw (ECONNRESET, DNS blip, TLS reset -- Node
    // reports all of these as a bare "fetch failed") before a response ever
    // exists. That used to escape this loop entirely and kill the run --
    // only HTTP-status errors (429/500/502/503/504 returned WITH a response)
    // were retried, so a transient connection failure was treated as fatal
    // even though it's the same "try again" case as a 503.
    let response;
    try {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (networkErr) {
      lastErr = "Gemini fetch error: " + networkErr.message;
      continue;
    }
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
  let notebookCalls = 0;
  let wroteFile = false;
  let lastText = null;

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
      lastText = textPart.text;
    }

    // S426: finishReason distinguishes "the model is done" from "the response
    // was cut off mid-generation" -- both used to print as the same
    // "No more tool calls" line, so a truncated turn (e.g. MAX_TOKENS) looked
    // identical to a clean finish. Logged every iteration so the next failure
    // is diagnosable from the log instead of inferred from where the text stops.
    const finishReason = response.candidates?.[0]?.finishReason;
    console.log("[finishReason] " + finishReason);

    const functionCalls = parts.filter(p => p.functionCall);
    if (functionCalls.length === 0) {
      if (finishReason === 'MAX_TOKENS') {
        console.log("Response truncated by the output-length limit before a write_file call. Not a clean finish -- leaving the AUTOSAVE fallback below to catch it.");
      } else {
        console.log("No more tool calls. Exiting loop.");
      }
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
            // pipeline.106: the crons' ranked disk search (lib/mags searchDisk) — editions, the
            // Richmond Archive, TrueSource cards, world summaries, staged canon, the ledger. The
            // old queryLedger `articles` reached editions/ only and dropped hits past its cap.
            resultData = require('../lib/mags').searchDisk(String(call.args.term), 12);
            break;
          }
          case 'canon_recall': {
            resultData = await canonRecall(call.args.query);
            break;
          }
          case 'read_source': {
            resultData = readSource(call.args.path, call.args.offset);
            break;
          }
          case 'notebook_search': {
            if (notebookCalls >= NOTEBOOK_CALLS_PER_RUN) {
              resultData = 'notebook_search limit reached (' + NOTEBOOK_CALLS_PER_RUN + ' per run); use search_articles or canon_recall.';
              break;
            }
            notebookCalls++;
            resultData = notebookSearch(call.args.question);
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
            const fullPath = writeQuarantineFile(filename, content);
            resultData = "Wrote file: " + fullPath;
            wroteFile = true;
            break;
          }
          default:
            resultData = "Unknown function: " + call.name;
        }
      } catch (err) {
        resultData = "Error executing " + call.name + ": " + err.message;
        console.error(resultData);
      }

      // pipeline.106: the 2026-11-08 Richards rerun researched all 50 turns and wrote
      // nothing. In the last turns every tool result carries the budget left.
      const turnsLeft = MAX_ITERATIONS - iterations;
      if (!wroteFile && turnsLeft <= WRITE_WARNING_TURNS) {
        resultData = String(resultData) + '\n\n[TURN BUDGET: ' + turnsLeft + ' turn(s) left. Stop researching and call write_file with the complete piece now.]';
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

  if (!wroteFile && lastText && lastText.trim().length >= FALLBACK_MIN_CHARS) {
    const fallbackName = 'AUTOSAVE-' + Date.now() + '-' + slugify(prompt) + '.md';
    const fullPath = clampToQuarantine(fallbackName);
    const banner = '<!-- AUTOSAVE: the model never called write_file this run -- this is its ' +
      'final text turn, persisted verbatim by the harness fallback so the generation is not ' +
      'silently discarded. Unverified provenance: review before /lore-ingest treats this like ' +
      'a normally-filed candidate. -->\n\n';
    fs.writeFileSync(fullPath, banner + lastText, 'utf-8');
    console.log('\nFALLBACK SAVE: model produced text but never called write_file. Persisted to ' + fullPath);
  } else if (!wroteFile) {
    console.log('\nNo file written and no substantial final text to rescue.');
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
  });
}

module.exports = { slugify, FALLBACK_MIN_CHARS, clampToQuarantine, writeQuarantineFile, canonRecall, notebookSearch, readSource, QUARANTINE_DIR, GEMINI_MODEL, THINKING_LEVEL, TOOLS };
