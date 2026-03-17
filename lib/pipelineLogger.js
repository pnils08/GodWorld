/**
 * pipelineLogger.js — Append-Only Pipeline Logging with Correlation IDs
 *
 * Every pipeline step logs to output/pipeline-log/pipeline_c{XX}.jsonl.
 * Each entry has a correlation ID (edition + step) for tracing what happened and why.
 *
 * Usage:
 *   const { createPipelineLog } = require('../lib/pipelineLogger');
 *   const log = createPipelineLog(87);
 *   log.step('build-packets', 'started', { desks: 6 });
 *   log.step('build-packets', 'completed', { files: 42 });
 *   log.error('voice-agents', 'Mayor agent timed out', { agent: 'mayor' });
 *   log.decision('compile', 'Front page: OARI story', { desk: 'civic', reporter: 'Carmen Delaine' });
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(ROOT, 'output', 'pipeline-log');

function createPipelineLog(cycle) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  const logFile = path.join(LOG_DIR, `pipeline_c${cycle}.jsonl`);
  const correlationId = `E${cycle}-${Date.now()}`;

  function append(entry) {
    const line = JSON.stringify({
      correlationId,
      cycle,
      timestamp: new Date().toISOString(),
      ...entry
    }) + '\n';
    fs.appendFileSync(logFile, line);
  }

  return {
    correlationId,
    logFile,

    step(stepName, status, meta = {}) {
      append({ type: 'step', step: stepName, status, ...meta });
    },

    error(stepName, message, meta = {}) {
      append({ type: 'error', step: stepName, message, ...meta });
    },

    decision(stepName, description, meta = {}) {
      append({ type: 'decision', step: stepName, description, ...meta });
    },

    quality(stepName, description, meta = {}) {
      append({ type: 'quality', step: stepName, description, ...meta });
    },

    grade(stepName, grade, meta = {}) {
      append({ type: 'grade', step: stepName, grade, ...meta });
    },

    summary() {
      if (!fs.existsSync(logFile)) return { entries: 0 };

      const lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
      const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

      const steps = entries.filter(e => e.type === 'step');
      const errors = entries.filter(e => e.type === 'error');
      const decisions = entries.filter(e => e.type === 'decision');

      return {
        correlationId,
        cycle,
        entries: entries.length,
        steps: steps.length,
        errors: errors.length,
        decisions: decisions.length,
        lastStep: steps[steps.length - 1]?.step || 'none',
        lastStatus: steps[steps.length - 1]?.status || 'none'
      };
    }
  };
}

// CLI: node lib/pipelineLogger.js summary <cycle>
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === 'summary' && args[1]) {
    const cycle = parseInt(args[1]);
    const logFile = path.join(LOG_DIR, `pipeline_c${cycle}.jsonl`);
    if (!fs.existsSync(logFile)) {
      console.log(`No pipeline log found for cycle ${cycle}`);
      process.exit(1);
    }

    const lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
    const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

    console.log(`\nPipeline Log — Cycle ${cycle}`);
    console.log(`  Entries: ${entries.length}`);
    console.log(`  Steps: ${entries.filter(e => e.type === 'step').length}`);
    console.log(`  Errors: ${entries.filter(e => e.type === 'error').length}`);
    console.log(`  Decisions: ${entries.filter(e => e.type === 'decision').length}`);
    console.log(`  Quality: ${entries.filter(e => e.type === 'quality').length}`);
    console.log(`  Grades: ${entries.filter(e => e.type === 'grade').length}`);
    console.log('');

    for (const entry of entries) {
      const time = entry.timestamp ? entry.timestamp.split('T')[1].split('.')[0] : '??:??:??';
      const icon = entry.type === 'error' ? 'ERR' :
                   entry.type === 'decision' ? 'DEC' :
                   entry.type === 'quality' ? 'QA ' :
                   entry.type === 'grade' ? 'GRD' : '>>>';
      const msg = entry.type === 'step' ? `${entry.step}: ${entry.status}` :
                  entry.type === 'error' ? `${entry.step}: ${entry.message}` :
                  entry.type === 'decision' ? `${entry.step}: ${entry.description}` :
                  entry.type === 'quality' ? `${entry.step}: ${entry.description}` :
                  entry.type === 'grade' ? `${entry.step}: ${entry.grade}` :
                  JSON.stringify(entry);
      console.log(`  [${time}] ${icon} ${msg}`);
    }
  } else {
    console.log('Usage: node lib/pipelineLogger.js summary <cycle>');
  }
}

module.exports = { createPipelineLog };
