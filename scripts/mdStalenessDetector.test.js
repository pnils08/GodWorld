#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  walkAuditRoot,
  collectAuditDocs,
  parseGitHistoryMtimes,
  extractDirectoryRefs,
  inboundReferrers,
  conventionStableReason,
  classify,
  reviewAction,
} = require('./mdStalenessDetector');

let assertions = 0;
function check(condition, message) {
  assert.ok(condition, message);
  assertions++;
}

function write(file, content = '# fixture\n') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function rootSpec(surface, root, prefix, excludePrefixes = []) {
  return { surface, root, prefix, excludePrefixes };
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md-staleness-'));
  try {
    const docsRoot = path.join(tempRoot, 'docs');
    const claudeRoot = path.join(tempRoot, '.claude');
    const memoryRoot = path.join(tempRoot, 'memory');

    write(path.join(docsRoot, 'active.md'));
    write(path.join(docsRoot, 'archive', 'old.md'));
    write(path.join(claudeRoot, 'skills', 'demo', 'SKILL.md'));
    write(path.join(memoryRoot, 'MEMORY.md'), '- [Rule](feedback_rule.md)\n');
    write(path.join(memoryRoot, 'feedback_rule.md'));

    const specs = [
      rootSpec('docs', docsRoot, 'docs', ['docs/archive/']),
      rootSpec('control-plane', claudeRoot, '.claude'),
      rootSpec('memory', memoryRoot, 'memory'),
    ];
    const audited = collectAuditDocs(specs);
    check(audited.length === 4, 'collects all three surfaces and honors docs exclusions');
    check(
      audited.some(doc => doc.path === '.claude/skills/demo/SKILL.md'
        && doc.surface === 'control-plane'),
      'labels Claude control-plane files',
    );
    check(
      audited.some(doc => doc.path === 'memory/feedback_rule.md'
        && doc.gitPath === null),
      'labels project-memory files as external to Git',
    );

    const history = parseGitHistoryMtimes([
      '@@MD_AUDIT_COMMIT@@200',
      'docs/active.md',
      '@@MD_AUDIT_COMMIT@@100',
      'docs/active.md',
      '.claude/skills/demo/SKILL.md',
    ].join('\n'));
    check(
      history.get('docs/active.md').getTime() === 200000,
      'batched history keeps the newest commit for a path',
    );
    check(
      history.get('.claude/skills/demo/SKILL.md').getTime() === 100000,
      'batched history records older paths',
    );

    const memoryTarget = audited.find(doc => doc.path === 'memory/feedback_rule.md');
    const memoryContents = new Map([
      ['memory/MEMORY.md', '- [Rule](feedback_rule.md)\n'],
      ['memory/feedback_rule.md', '# Rule\n'],
    ]);
    const memoryDirRefs = new Map([
      ['memory/MEMORY.md', extractDirectoryRefs(memoryContents.get('memory/MEMORY.md'))],
      ['memory/feedback_rule.md', new Set()],
    ]);
    check(
      inboundReferrers(memoryTarget, memoryContents, memoryDirRefs)
        .includes('memory/MEMORY.md'),
      'resolves relative links inside the external memory surface',
    );
    const memoryWikiContents = new Map([
      ['memory/peer.md', 'See [[feedback_rule]] and [[feedback_rule#Detail|Rule]].\n'],
      ['memory/feedback_rule.md', '# Rule\n'],
    ]);
    const memoryWikiDirRefs = new Map([
      ['memory/peer.md', new Set()],
      ['memory/feedback_rule.md', new Set()],
    ]);
    check(
      inboundReferrers(memoryTarget, memoryWikiContents, memoryWikiDirRefs)
        .includes('memory/peer.md'),
      'resolves relative wikilinks inside the external memory surface',
    );

    const claudeTarget = audited.find(doc => doc.path === '.claude/skills/demo/SKILL.md');
    const claudeContents = new Map([
      ['docs/index.md', 'Load `.claude/skills/demo/` when needed.\n'],
      ['.claude/skills/demo/SKILL.md', '# Demo\n'],
    ]);
    const claudeDirRefs = new Map([
      ['docs/index.md', extractDirectoryRefs(claudeContents.get('docs/index.md'))],
      ['.claude/skills/demo/SKILL.md', new Set()],
    ]);
    check(
      inboundReferrers(claudeTarget, claudeContents, claudeDirRefs)
        .includes('docs/index.md'),
      'counts exact control-plane parent-directory references',
    );

    const orphan = classify({
      frontmatter: {},
      is_stale: true,
      inbound: [],
      inbound_active: [],
      age_days: 120,
    });
    check(orphan.bucket === 'orphan-candidate', 'preserves five-bucket classification');

    check(
      conventionStableReason({
        surface: 'control-plane',
        path: '.claude/hookify.guard.local.md',
      }) !== null,
      'recognizes Hookify rules as convention-discovered',
    );
    check(
      conventionStableReason(claudeTarget) !== null,
      'recognizes Claude skill entrypoints as convention-discovered',
    );
    check(
      classify({
        surface: 'control-plane',
        path: '.claude/agents/demo/IDENTITY.md',
        frontmatter: {},
        is_stale: true,
        inbound: [],
        inbound_active: [],
        age_days: 120,
      }).bucket === 'reference-stable',
      'classifies Claude agent components as reference-stable',
    );
    check(
      classify({
        surface: 'control-plane',
        path: '.claude/notes/unused.md',
        frontmatter: {},
        is_stale: true,
        inbound: [],
        inbound_active: [],
        age_days: 120,
      }).bucket === 'orphan-candidate',
      'does not exempt ordinary unlinked control-plane notes',
    );

    check(
      !reviewAction({ surface: 'control-plane' }).includes('git mv'),
      'never suggests moving Claude control-plane files',
    );
    check(
      !reviewAction({ surface: 'memory' }).includes('git mv'),
      'never suggests moving project-memory files',
    );

    check(
      walkAuditRoot(specs[0]).every(doc => !doc.path.startsWith('docs/archive/')),
      'excluded docs history remains outside the audit surface',
    );

    console.log(`mdStalenessDetector tests: ${assertions}/${assertions} passed`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main();
