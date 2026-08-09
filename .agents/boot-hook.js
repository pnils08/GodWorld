#!/usr/bin/env node

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
      
      if (pinLine || nextLine) {
        const message = `**SESSION AUTO-BOOT**\n\n${pinLine || ''}\n${nextLine || ''}\n\n*I have automatically read this from SESSION_CONTEXT.md per the auto-boot hook.*`;
        
        console.log(JSON.stringify({
          injectSteps: [
            {
              ephemeralMessage: message
            }
          ]
        }));
        process.exit(0);
      }
    }
    
    console.log(JSON.stringify({}));
  } catch(e) {
    console.log(JSON.stringify({}));
  }
});
