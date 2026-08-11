# Does the reply-file approach save tokens? Mostly no.

Straight accounting:

- **Output tokens are identical either way.** The content costs the same whether it lands in chat or in a .md file. Writing the file adds overhead: the Write call, the SendUserFile call, the 50-char stub. Net: slightly MORE tokens per reply.
- **The block-and-retry is where it actively costs you.** When the hook rejects a long reply, you paid for the rejected attempt AND the rewrite. That's double-billing per violation. (Your S364 session already flagged this exact concern before adopting it.)
- **What it does buy:** clean chat on your phone, and durable replies on disk that survive session compaction. Convenience, not cost savings.
- **What actually saves tokens:** me writing less content, period — and not re-arguing settled points. A 300-word reply relocated to a file costs the same as a 300-word reply in chat. A 50-word reply saves money in both places.

If the goal is purely cost: drop the hook, keep the discipline. If you value the clean-chat side, keep it — but know it's costing a little extra, not saving.
