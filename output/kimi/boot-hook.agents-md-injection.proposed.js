#!/usr/bin/env node

// Turn-1 auto-boot injection (kimi, builder-direct 2026-08-15): alongside
// PIN + NEXT[antigravity], inject the full root AGENTS.md so Antigravity boots
// with the engineering governance loaded (scope tiers, gates, canon rules) —
// Antigravity's harness auto-loads .agents/AGENTS.md only, never the repo-root
// file, and a pointer line is not reliably followed. Read at fire time, so the
// injected text is always current; HTML comments stripped, blank runs collapsed.
// If Antigravity ever truncates the message, split governance into a second
// injectStep.

const fs = require('fs');
const path = require('path');

let raw = '';
process.stdin.on('data', d => raw += d);
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(raw);

    // Only run on the very first turn of a new session
    if (payload.invocationNum === 1) {
      // hooks.json runs from its containing directory (.agents)
      const sessionContextPath = path.join(__dirname, '..', 'SESSION_CONTEXT.md');
      const sessionContext = fs.readFileSync(sessionContextPath, 'utf-8');

      const lines = sessionContext.split('\n');
      const pinLine = lines.find(l => l.startsWith('**PIN:**'));
      const nextLine = lines.find(l => l.startsWith('**NEXT[antigravity]:**'));

      let agentsRules = '';
      try {
        agentsRules = fs.readFileSync(path.join(__dirname, '..', 'AGENTS.md'), 'utf-8')
          .replace(/<!--[\s\S]*?-->/g, '')   // harness provenance comments
          .replace(/\n{3,}/g, '\n\n')         // blank-run collapse
          .trim();
      } catch (e) {
        agentsRules = '(AGENTS.md unreadable — tell the builder before doing repository work)';
      }

      const message = `**SESSION AUTO-BOOT**\n\n${pinLine || ''}\n${nextLine || ''}\n\n**BINDING ENGINEERING GOVERNANCE — auto-loaded from /root/GodWorld/AGENTS.md. These rules govern every action this session (you are the fully gated lane: read-only, proposed diffs only, sole exception your own NEXT line):**\n\n${agentsRules}`;

      console.log(JSON.stringify({
        injectSteps: [
          {
            ephemeralMessage: message
          }
        ]
      }));
      process.exit(0);
    }

    console.log(JSON.stringify({}));
  } catch(e) {
    console.log(JSON.stringify({}));
  }
});
