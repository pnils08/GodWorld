#!/bin/bash
# Launch or resume a Claude Code session based on the tmux window name.
# Usage: just run it in a tmux window. It figures out the rest.

WINDOW_NAME=$(tmux display-message -p '#W' 2>/dev/null)

if [ -z "$WINDOW_NAME" ]; then
  echo "Not in a tmux window. Run: claude"
  exit 1
fi

# Try to resume a session with this name first, fall back to new named session
claude --resume "$WINDOW_NAME" 2>/dev/null || claude --name "$WINDOW_NAME"
