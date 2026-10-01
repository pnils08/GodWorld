#!/usr/bin/env node
/**
 * modelFitScore.js — deterministic scorer for docs/plans/2026-09-22-agent-model-fit-test.md Task 4.
 * Evaluates model-fit run outputs against deterministic schema, grounding, character caps,
 * persona-fact violation checks, voice distinctiveness (Jaccard overlap), and produces
 * blind evaluation packs.
 *
 * Usage:
 *   node scripts/modelFitScore.js [--runs output/model-fit/runs.jsonl] \
 *        [--out output/model-fit/scores.json] [--blind-dir output/model-fit/blind]
 *   node scripts/modelFitScore.js --self-test
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const civic = require(path.join(ROOT, 'scripts', 'cron-civic-run.js'));

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : def;
}

const RUNS_PATH = arg('--runs', path.join(ROOT, 'output', 'model-fit', 'runs.jsonl'));
const OUT_PATH = arg('--out', path.join(ROOT, 'output', 'model-fit', 'scores.json'));
const BLIND_DIR = process.argv.includes('--blind-dir')
  ? arg('--blind-dir', path.join(ROOT, 'output', 'model-fit', 'blind'))
  : null;
const SELF_TEST = process.argv.includes('--self-test');

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'couldn\'t',
  'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
  'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
  'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it',
  'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my',
  'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
  'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so',
  'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d',
  'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s',
  'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s',
  'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re',
  'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

function extractWords(text) {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOPWORDS.has(w));
  return new Set(words);
}

function jaccard(setA, setB) {
  if (!setA.size && !setB.size) return 0;
  let inter = 0;
  for (const w of setA) {
    if (setB.has(w)) inter++;
  }
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : Number((inter / union).toFixed(4));
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, rand) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getLabel(idx) {
  let label = '';
  let n = idx;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripModelLines(text, modelNames) {
  if (!text) return '';
  const lines = text.split('\n');
  const filtered = lines.filter(line => {
    for (const m of modelNames) {
      if (m && m.length > 2) {
        const re = new RegExp('\\b' + escapeRegex(m) + '\\b', 'i');
        if (re.test(line)) return false;
      }
    }
    return true;
  });
  return filtered.join('\n');
}

function scoreRow(row, personaFacts) {
  const entry = {
    input: row.input,
    model: row.model,
    reasoning: row.reasoning,
    tier: row.tier,
    errored: Boolean(row.error),
    finish: row.finish || null,
    truncated: row.finish === 'length' || row.finish === 'max_tokens',
    tokensIn: row.tokensIn ?? null,
    tokensOut: row.tokensOut ?? null,
    tokensReasoning: row.tokensReasoning ?? null,
    tokens: (row.tokensIn || 0) + (row.tokensOut || 0),
    costUsd: row.costUsd ?? null,
    words: row.words ?? (row.output ? row.output.split(/\s+/).filter(Boolean).length : 0),
  };

  if (row.error) {
    entry.error = row.error;
    return entry;
  }

  const absInput = path.resolve(ROOT, row.input || '');
  const hay = fs.existsSync(absInput) ? fs.readFileSync(absInput, 'utf8') : '';

  if (row.tier === 'structured-seat') {
    const v = civic.validateVoiceJson(row.output || '');
    entry.schemaOk = v.ok;
    entry.schemaWhy = v.why;

    if (v.ok && v.json) {
      const dm = (row.input || '').match(/council-d(\d+)/i);
      const district = dm ? dm[1] : null;
      const cm = (row.input || '').match(/c(\d+)/i);
      const cycle = cm ? cm[1] : null;

      const checkFn = civic.statementNumberCheck(hay, { district, cycle });
      const groundingWhy = checkFn(v.json);
      entry.groundingOk = groundingWhy === null;
      entry.groundingWhy = groundingWhy;

      const milestoneNotes = [];
      const statements = v.json.statements || [];
      for (const st of statements) {
        const tu = st && st.trackerUpdates;
        if (!tu || typeof tu !== 'object') continue;
        if (tu.MilestoneNotes != null) milestoneNotes.push(String(tu.MilestoneNotes));
        for (const val of Object.values(tu)) {
          if (val && typeof val === 'object' && val.MilestoneNotes != null) {
            milestoneNotes.push(String(val.MilestoneNotes));
          }
        }
      }

      entry.maxMilestoneChars = milestoneNotes.length ? Math.max(...milestoneNotes.map(n => n.length)) : 0;
      entry.milestoneCapOk = entry.maxMilestoneChars <= 200;
      entry.statements = statements.length;

      let totalStatementWords = 0;
      for (const st of statements) {
        const full = String(st.fullStatement || '').trim();
        totalStatementWords += full ? full.split(/\s+/).filter(Boolean).length : 0;
      }
      entry.wordsPerStatement = statements.length > 0
        ? Number((totalStatementWords / statements.length).toFixed(1))
        : 0;
    } else {
      entry.groundingOk = null;
      entry.groundingWhy = null;
      entry.maxMilestoneChars = null;
      entry.milestoneCapOk = null;
      entry.statements = 0;
      entry.wordsPerStatement = null;
    }
  } else if (row.tier === 'semi-open-voice') {
    const cm = (row.input || '').match(/c(\d+)/i);
    const cycle = cm ? cm[1] : null;
    const ungrounded = civic.ungroundedNumbers(hay, [row.output || ''], { cycle });
    entry.groundedNumbersOk = ungrounded.length === 0;
    entry.ungrounded = ungrounded;
  } else if (row.tier === 'open-character') {
    const agent = /mags-narration/i.test(row.input || '')
      ? 'mags-narration'
      : (/elias-varek/i.test(row.input || '') ? 'elias-varek' : null);

    let factsList = [];
    let wordRange = null;
    if (personaFacts && agent && personaFacts[agent]) {
      const agentObj = personaFacts[agent];
      if (Array.isArray(agentObj)) {
        factsList = agentObj;
      } else if (agentObj && typeof agentObj === 'object') {
        if (Array.isArray(agentObj.facts)) {
          factsList = agentObj.facts;
        }
        if (agentObj.wordRange) {
          wordRange = agentObj.wordRange;
        }
      }
    }

    if (Array.isArray(wordRange) && wordRange.length === 2) {
      entry.wordRange = wordRange;
      entry.wordRangeOk = entry.words >= wordRange[0] && entry.words <= wordRange[1];
    } else {
      entry.wordRangeOk = null;
    }

    entry.factsChecked = factsList.length;
    entry.factViolations = [];
    if (factsList.length > 0) {
      const outputText = row.output || '';
      for (const item of factsList) {
        const patterns = item.contradictPatterns || [];
        for (const pat of patterns) {
          try {
            const re = new RegExp(pat, 'im');
            if (re.test(outputText)) {
              entry.factViolations.push(item.id);
              break;
            }
          } catch (_) {}
        }
      }
    }
  }

  return entry;
}

function computeDistinctiveness(rows) {
  const arms = new Map();
  for (const r of rows) {
    if (r.error || !r.output) continue;
    const key = `${r.model} (${r.reasoning})`;
    if (!arms.has(key)) {
      arms.set(key, { model: r.model, reasoning: r.reasoning, rows: [] });
    }
    arms.get(key).rows.push(r);
  }

  const distinctiveness = {};
  for (const [armKey, group] of arms.entries()) {
    const armEntry = {
      model: group.model,
      reasoning: group.reasoning,
    };

    const magsRows = group.rows.filter(r => /mags/i.test(r.input));
    const eliasRows = group.rows.filter(r => /elias/i.test(r.input));
    let carmenRows = group.rows.filter(r => /carmen/i.test(r.input) || r.tier === 'semi-open-voice');
    const councilRows = group.rows.filter(r => /council/i.test(r.input) || r.tier === 'structured-seat');

    if (!carmenRows.length) {
      carmenRows = rows.filter(r => !r.error && r.output && r.model === group.model && (/carmen/i.test(r.input) || r.tier === 'semi-open-voice'));
    }

    if (magsRows.length > 0 && eliasRows.length > 0) {
      const scores = [];
      for (const m of magsRows) {
        for (const e of eliasRows) {
          scores.push(jaccard(extractWords(m.output), extractWords(e.output)));
        }
      }
      armEntry.mags_vs_elias = Number((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(4));
    }

    if (carmenRows.length > 0 && councilRows.length > 0) {
      const scores = [];
      for (const c of carmenRows) {
        for (const s of councilRows) {
          scores.push(jaccard(extractWords(c.output), extractWords(s.output)));
        }
      }
      armEntry.carmen_vs_council = Number((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(4));
    }

    if ('mags_vs_elias' in armEntry || 'carmen_vs_council' in armEntry) {
      distinctiveness[armKey] = armEntry;
    }
  }

  return distinctiveness;
}

function generateBlindPack(rows, blindDir) {
  if (!blindDir) return;
  fs.mkdirSync(blindDir, { recursive: true });

  const tiers = ['structured-seat', 'semi-open-voice', 'open-character'];

  const modelNames = new Set([
    'claude', 'sonnet', 'opus', 'haiku', 'deepseek', 'gemini', 'fable',
    'gpt-4', 'gpt-3', 'gpt-4o', 'qwen', 'mistral', 'moonshot', 'kimi', 'anthropic', 'openai'
  ]);
  for (const r of rows) {
    if (r.model) {
      modelNames.add(r.model);
      const parts = r.model.split(/[/:]/);
      for (const p of parts) modelNames.add(p);
    }
    if (r.provider) modelNames.add(r.provider);
  }

  for (const tier of tiers) {
    const tierRows = [];
    rows.forEach((r, idx) => {
      if (!r.error && r.tier === tier && r.output) {
        tierRows.push({ rowIndex: idx, row: r });
      }
    });

    if (!tierRows.length) continue;

    const rng = mulberry32(20260929);
    const shuffled = shuffle(tierRows, rng);

    const keyData = {};
    const blindSections = [`# Tier: ${tier} (Blind Pack)\n`];

    shuffled.forEach((item, i) => {
      const label = getLabel(i);
      const inputName = item.row.input ? path.basename(item.row.input) : null;
      keyData[label] = {
        rowIndex: item.rowIndex,
        input: inputName,
        model: item.row.model,
        reasoning: item.row.reasoning,
      };

      // The input name is not a model leak — a scorer needs to know which prompt an output answers.
      const sanitizedOutput = stripModelLines(item.row.output, modelNames);
      blindSections.push(`## Output ${label}${inputName ? ` — input: ${inputName}` : ''}\n\n${sanitizedOutput}\n\n---`);
    });

    const blindFile = path.join(blindDir, `${tier}-blind.md`);
    const keyFile = path.join(blindDir, `${tier}-key.json`);

    fs.writeFileSync(blindFile, blindSections.join('\n') + '\n', 'utf8');
    fs.writeFileSync(keyFile, JSON.stringify(keyData, null, 2) + '\n', 'utf8');
  }
}

function printSummaryTable(scoredRows) {
  const groups = new Map();
  for (const r of scoredRows) {
    const key = `${r.model} (${r.reasoning})`;
    if (!groups.has(key)) {
      groups.set(key, {
        model: r.model,
        reasoning: r.reasoning,
        rows: 0,
        errors: 0,
        schemaPass: 0,
        schemaTotal: 0,
        groundPass: 0,
        groundTotal: 0,
        milestonePass: 0,
        milestoneTotal: 0,
        factsPass: 0,
        factsTotal: 0,
        rangePass: 0,
        rangeTotal: 0,
        wordsTotal: 0,
        costTotal: 0,
      });
    }
    const g = groups.get(key);
    g.rows++;
    if (r.errored) {
      g.errors++;
    } else {
      g.wordsTotal += r.words || 0;
      if (r.costUsd != null) g.costTotal += r.costUsd;

      if (r.schemaOk !== undefined && r.schemaOk !== null) {
        g.schemaTotal++;
        if (r.schemaOk) g.schemaPass++;
      }
      if (r.groundingOk !== undefined && r.groundingOk !== null) {
        g.groundTotal++;
        if (r.groundingOk) g.groundPass++;
      }
      if (r.groundedNumbersOk !== undefined && r.groundedNumbersOk !== null) {
        g.groundTotal++;
        if (r.groundedNumbersOk) g.groundPass++;
      }
      if (r.milestoneCapOk !== undefined && r.milestoneCapOk !== null) {
        g.milestoneTotal++;
        if (r.milestoneCapOk) g.milestonePass++;
      }
      if (r.factsChecked > 0) {
        g.factsTotal++;
        if (r.factViolations && r.factViolations.length === 0) g.factsPass++;
      }
      if (r.wordRangeOk !== undefined && r.wordRangeOk !== null) {
        g.rangeTotal++;
        if (r.wordRangeOk) g.rangePass++;
      }
    }
  }

  const tableData = [];
  for (const g of groups.values()) {
    const validRows = g.rows - g.errors;
    tableData.push({
      Model: g.model,
      Reasoning: g.reasoning,
      Rows: g.rows,
      'Schema%': g.schemaTotal ? `${Math.round(100 * g.schemaPass / g.schemaTotal)}%` : '-',
      'Ground%': g.groundTotal ? `${Math.round(100 * g.groundPass / g.groundTotal)}%` : '-',
      'Milestone%': g.milestoneTotal ? `${Math.round(100 * g.milestonePass / g.milestoneTotal)}%` : '-',
      'Facts%': g.factsTotal ? `${Math.round(100 * g.factsPass / g.factsTotal)}%` : '-',
      'Range%': g.rangeTotal ? `${Math.round(100 * g.rangePass / g.rangeTotal)}%` : '-',
      'Mean Words': validRows > 0 ? Math.round(g.wordsTotal / validRows) : 0,
      'Total Cost': g.costTotal > 0 ? `$${g.costTotal.toFixed(5)}` : '-',
    });
  }

  console.table(tableData);
}

function runSelfTest() {
  const fixturePath = path.join(ROOT, 'output', 'model-fit', 'score-fixture.jsonl');
  if (!fs.existsSync(fixturePath)) {
    throw new Error('score-fixture.jsonl not found at ' + fixturePath);
  }

  const rawLines = fs.readFileSync(fixturePath, 'utf8').trim().split('\n').filter(Boolean);
  const fixtureRows = rawLines.map(line => JSON.parse(line));

  const personaFactsPath = path.join(ROOT, 'output', 'model-fit', 'persona-facts.json');
  let personaFacts = null;
  if (fs.existsSync(personaFactsPath)) {
    personaFacts = JSON.parse(fs.readFileSync(personaFactsPath, 'utf8'));
  }

  const scored = fixtureRows.map(r => scoreRow(r, personaFacts));
  const distinctiveness = computeDistinctiveness(fixtureRows);

  // 1. Valid structured-seat JSON
  const validSeat = scored[0];
  assert.strictEqual(validSeat.errored, false, 'Row 0 must not be errored');
  assert.strictEqual(validSeat.schemaOk, true, 'Row 0 must have schemaOk: true');
  assert.strictEqual(validSeat.groundingOk, true, 'Row 0 must have groundingOk: true');
  assert.strictEqual(validSeat.milestoneCapOk, true, 'Row 0 must have milestoneCapOk: true');
  assert.strictEqual(validSeat.statements, 1, 'Row 0 must have 1 statement');
  assert(validSeat.wordsPerStatement > 0, 'Row 0 must have wordsPerStatement > 0');
  assert.strictEqual(validSeat.truncated, false, 'Row 0 must not be truncated');

  // 2. Schema failure
  const schemaFail = scored[1];
  assert.strictEqual(schemaFail.errored, false, 'Row 1 must not be errored');
  assert.strictEqual(schemaFail.schemaOk, false, 'Row 1 must have schemaOk: false');
  assert(typeof schemaFail.schemaWhy === 'string' && schemaFail.schemaWhy.length > 0, 'Row 1 must have schemaWhy');

  // 3. Ungrounded number
  const ungrounded = scored[2];
  assert.strictEqual(ungrounded.errored, false, 'Row 2 must not be errored');
  assert.strictEqual(ungrounded.groundedNumbersOk, false, 'Row 2 must have groundedNumbersOk: false');
  assert(Array.isArray(ungrounded.ungrounded) && ungrounded.ungrounded.includes('77777'), 'Row 2 must flag 77777');

  // 4. Open-character fact violation and wordRangeOk
  const factViol = scored[3];
  assert.strictEqual(factViol.errored, false, 'Row 3 must not be errored');
  assert(factViol.factsChecked > 0, 'Row 3 must check facts');
  assert(Array.isArray(factViol.factViolations) && factViol.factViolations.length >= 2, 'Row 3 must flag fact violations');
  assert(factViol.factViolations.includes('clock-not-real-dates'), 'Row 3 must flag clock-not-real-dates');
  assert(factViol.factViolations.includes('no-engine-vocabulary'), 'Row 3 must flag no-engine-vocabulary');
  assert.strictEqual(factViol.wordRangeOk, true, 'Row 3 (920 words) must be inside [900, 1200]');

  // Check wordRangeOk is null when wordRange is null
  const eliasRow = scored[6];
  assert.strictEqual(eliasRow.wordRangeOk, null, 'Row 6 must have wordRangeOk: null when wordRange is null');

  // Check wordRangeOk is false when outside range
  const outOfRange = scoreRow({ ...fixtureRows[3], words: 100 }, personaFacts);
  assert.strictEqual(outOfRange.wordRangeOk, false, 'words outside range must yield wordRangeOk: false');

  // 5. Errored row
  const errored = scored[4];
  assert.strictEqual(errored.errored, true, 'Row 4 must have errored: true');
  assert(errored.error, 'Row 4 must preserve error string');
  assert.strictEqual(errored.schemaOk, undefined, 'Row 4 must skip other checks');

  // 6. Truncated row
  const trunc = scored[5];
  assert.strictEqual(trunc.truncated, true, 'Row 5 must have truncated: true');
  assert.strictEqual(trunc.finish, 'length', 'Row 5 finish must be length');

  // Distinctiveness
  const arm = distinctiveness['deepseek/deepseek-chat (off)'];
  assert(arm, 'Distinctiveness must include deepseek/deepseek-chat (off)');
  assert(typeof arm.mags_vs_elias === 'number', 'mags_vs_elias must be a number');
  assert(typeof arm.carmen_vs_council === 'number', 'carmen_vs_council must be a number');

  // Blind pack generation test in temp dir
  const tempBlindDir = path.join(ROOT, 'output', 'model-fit', '.test-blind-' + Date.now().toString(36));
  try {
    generateBlindPack(fixtureRows, tempBlindDir);
    assert(fs.existsSync(path.join(tempBlindDir, 'structured-seat-blind.md')), 'structured-seat-blind.md created');
    assert(fs.existsSync(path.join(tempBlindDir, 'structured-seat-key.json')), 'structured-seat-key.json created');
    assert(fs.existsSync(path.join(tempBlindDir, 'open-character-blind.md')), 'open-character-blind.md created');
    assert(fs.existsSync(path.join(tempBlindDir, 'open-character-key.json')), 'open-character-key.json created');
    const blindContent = fs.readFileSync(path.join(tempBlindDir, 'open-character-blind.md'), 'utf8');
    assert(!blindContent.includes('deepseek'), 'blind pack must strip model names');
    const keyData = JSON.parse(fs.readFileSync(path.join(tempBlindDir, 'open-character-key.json'), 'utf8'));
    assert(keyData.A && typeof keyData.A.rowIndex === 'number', 'key file must map label to rowIndex');
  } finally {
    fs.rmSync(tempBlindDir, { recursive: true, force: true });
  }

  printSummaryTable(scored);
  console.log('Self-test PASSED (all assertions verified against output/model-fit/score-fixture.jsonl).');
}

function main() {
  if (SELF_TEST) {
    runSelfTest();
    process.exit(0);
  }

  const personaFactsPath = path.join(ROOT, 'output', 'model-fit', 'persona-facts.json');
  let personaFacts = null;
  if (fs.existsSync(personaFactsPath)) {
    try {
      personaFacts = JSON.parse(fs.readFileSync(personaFactsPath, 'utf8'));
    } catch (_) {}
  }

  let rows = [];
  if (fs.existsSync(RUNS_PATH)) {
    const raw = fs.readFileSync(RUNS_PATH, 'utf8').trim();
    if (raw) {
      rows = raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
    }
  }

  const scoredRows = rows.map(r => scoreRow(r, personaFacts));
  const distinctiveness = computeDistinctiveness(rows);

  const result = {
    scores: scoredRows,
    distinctiveness,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2) + '\n', 'utf8');

  if (BLIND_DIR) {
    generateBlindPack(rows, BLIND_DIR);
  }

  printSummaryTable(scoredRows);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('Fatal error:', e.message);
    process.exit(1);
  }
}

module.exports = {
  scoreRow,
  computeDistinctiveness,
  generateBlindPack,
  mulberry32,
  shuffle,
  jaccard,
  extractWords,
  stripModelLines,
};
