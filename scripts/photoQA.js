#!/usr/bin/env node
/**
 * photoQA.js — Photo Quality Assurance via Claude Vision
 *
 * Reads a photo manifest and evaluates each photo against its article context.
 * Runs between Step 15 (photo generation) and Step 16 (PDF generation).
 *
 * Usage:
 *   node scripts/photoQA.js <photo-dir>
 *   node scripts/photoQA.js output/photos/e88
 *   node scripts/photoQA.js output/photos/e88 --dry-run
 *
 * Evaluates:
 *   - Does the photo match the article subject?
 *   - Is the tone appropriate (photojournalism, not stock/AI slop)?
 *   - Any anachronistic or impossible details?
 *   - Does it fit prosperity-era Oakland aesthetic?
 *
 * Output:
 *   - Console report with pass/flag/fail per photo
 *   - {photo-dir}/qa_report.json
 *
 * Requires: ANTHROPIC_API_KEY in environment or .env
 *
 * Cost: ~4,000 tokens per photo (~$0.01 each, ~$0.05 per edition)
 */

const fs = require('fs');
const path = require('path');
require('/root/GodWorld/lib/env');

const Anthropic = require('@anthropic-ai/sdk');

const QA_PROMPT = `You are a photo editor at the Bay Tribune, a newspaper in Oakland, California (set in 2041).
You are reviewing an AI-generated photo before it goes to print. The photo accompanies a specific article.

Evaluate the photo on these criteria:

1. **MATCH** — Does the photo depict a scene related to the article? It doesn't need to be literal, but it should feel connected to the story's subject, setting, or mood.
2. **TONE** — Does it look like photojournalism? Reject overly polished, stock-photo-like, or obviously AI-generated images (plastic skin, melted hands, impossible architecture, text artifacts).
3. **ANACHRONISM** — Any details that don't fit a prosperous 2041 Oakland? Wrong era clothing, impossible technology, recognizable real-world logos or faces.
4. **AESTHETIC** — Does it feel like Oakland? Urban, lived-in, specific. Not generic-city or suburban.

Respond with EXACTLY this format:
VERDICT: PASS | FLAG | FAIL
MATCH: [1-2 sentence assessment]
TONE: [1-2 sentence assessment]
ISSUES: [comma-separated list of problems, or "none"]
SUMMARY: [1 sentence overall]

PASS = good to print. FLAG = printable but has minor issues worth noting. FAIL = should not go to print.`;

async function evaluatePhoto(client, photoPath, articleContext) {
  const imageData = fs.readFileSync(photoPath);
  const base64 = imageData.toString('base64');
  const ext = path.extname(photoPath).toLowerCase();
  const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 }
        },
        {
          type: 'text',
          text: `${QA_PROMPT}\n\nARTICLE CONTEXT:\n${articleContext}`
        }
      ]
    }]
  });

  const text = response.content[0].text;

  // Parse verdict
  const verdictMatch = text.match(/VERDICT:\s*(PASS|FLAG|FAIL)/i);
  const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : 'FLAG';

  const matchLine = text.match(/MATCH:\s*(.+)/i);
  const toneLine = text.match(/TONE:\s*(.+)/i);
  const issuesLine = text.match(/ISSUES:\s*(.+)/i);
  const summaryLine = text.match(/SUMMARY:\s*(.+)/i);

  return {
    verdict,
    match: matchLine ? matchLine[1].trim() : '',
    tone: toneLine ? toneLine[1].trim() : '',
    issues: issuesLine ? issuesLine[1].trim() : 'none',
    summary: summaryLine ? summaryLine[1].trim() : '',
    rawResponse: text,
    tokens: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens
    }
  };
}

function extractArticleSummary(sectionText) {
  if (!sectionText) return '(no article context available)';
  // Take headline + first ~500 chars of article text
  const lines = sectionText.split('\n').filter(l => l.trim());
  const summary = lines.slice(0, 10).join('\n');
  return summary.length > 600 ? summary.substring(0, 600) + '...' : summary;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const photoDir = args.find(a => !a.startsWith('--'));

  if (!photoDir) {
    console.log('Usage: node scripts/photoQA.js <photo-dir> [--dry-run]');
    console.log('Example: node scripts/photoQA.js output/photos/e88');
    process.exit(1);
  }

  const fullDir = path.resolve(photoDir);
  const manifestPath = path.join(fullDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error('No manifest.json found in ' + fullDir);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log('');
  console.log('=== Bay Tribune Photo QA ===');
  console.log(`Edition: ${manifest.edition}`);
  console.log(`Photos: ${manifest.photos.length}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'live'}`);
  console.log('');

  if (dryRun) {
    manifest.photos.forEach((p, i) => {
      const photoPath = path.join(fullDir, p.file);
      const exists = fs.existsSync(photoPath);
      const size = exists ? (fs.statSync(photoPath).size / 1024).toFixed(0) + 'KB' : 'MISSING';
      console.log(`  [${i + 1}] ${p.file}`);
      console.log(`      Credit: ${p.credit}`);
      console.log(`      File: ${size}`);
      console.log(`      Context: ${extractArticleSummary(p.section).substring(0, 80)}...`);
      console.log('');
    });
    console.log('Run without --dry-run to evaluate with Claude Vision.');
    return;
  }

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set. Add to .env or export it.');
    process.exit(1);
  }

  const client = new Anthropic();
  const results = [];
  let totalInput = 0;
  let totalOutput = 0;

  for (let i = 0; i < manifest.photos.length; i++) {
    const photo = manifest.photos[i];
    const photoPath = path.join(fullDir, photo.file);

    if (!fs.existsSync(photoPath)) {
      console.log(`  [${i + 1}/${manifest.photos.length}] SKIP — file missing: ${photo.file}`);
      results.push({ file: photo.file, verdict: 'SKIP', reason: 'file missing' });
      continue;
    }

    const context = extractArticleSummary(photo.section);
    console.log(`  [${i + 1}/${manifest.photos.length}] Evaluating: ${photo.file}`);

    try {
      const evaluation = await evaluatePhoto(client, photoPath, context);
      totalInput += evaluation.tokens.input;
      totalOutput += evaluation.tokens.output;

      const icon = evaluation.verdict === 'PASS' ? 'OK' :
                   evaluation.verdict === 'FLAG' ? '!!' : 'XX';
      console.log(`    ${icon} ${evaluation.verdict} — ${evaluation.summary}`);
      if (evaluation.issues !== 'none') {
        console.log(`    Issues: ${evaluation.issues}`);
      }
      console.log('');

      results.push({
        file: photo.file,
        credit: photo.credit,
        verdict: evaluation.verdict,
        match: evaluation.match,
        tone: evaluation.tone,
        issues: evaluation.issues,
        summary: evaluation.summary
      });
    } catch (err) {
      console.error(`    ERROR: ${err.message}`);
      console.log('');
      results.push({ file: photo.file, verdict: 'ERROR', reason: err.message });
    }
  }

  // Summary
  const passes = results.filter(r => r.verdict === 'PASS').length;
  const flags = results.filter(r => r.verdict === 'FLAG').length;
  const fails = results.filter(r => r.verdict === 'FAIL').length;
  const errors = results.filter(r => r.verdict === 'ERROR' || r.verdict === 'SKIP').length;

  console.log('=== QA Summary ===');
  console.log(`  PASS: ${passes}  FLAG: ${flags}  FAIL: ${fails}  ERROR/SKIP: ${errors}`);
  console.log(`  Tokens: ${totalInput} input + ${totalOutput} output`);
  console.log('');

  if (fails > 0) {
    console.log('FAILED photos (should not go to print):');
    results.filter(r => r.verdict === 'FAIL').forEach(r => {
      console.log(`  - ${r.file}: ${r.summary}`);
    });
    console.log('');
  }

  // Write report
  const report = {
    edition: manifest.edition,
    date: new Date().toISOString().split('T')[0],
    summary: { pass: passes, flag: flags, fail: fails, errors },
    tokens: { input: totalInput, output: totalOutput },
    results
  };

  const reportPath = path.join(fullDir, 'qa_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report written: ${reportPath}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
