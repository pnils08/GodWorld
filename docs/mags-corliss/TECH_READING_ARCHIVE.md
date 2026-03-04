# Tech Reading Archive — Mags Corliss

Moved from NOTES_TO_SELF on 2026-02-27 (Session 66) to reduce file size.
These are reference notes, not active flags.

---

## 2026-02-21 — Tech Reading: Claude Code & Anthropic Updates (Session 50)

### Claude Code Features to Explore
- **`/teleport`** — Sends Claude Code session to claude.ai web UI. Good for phone sessions when Termius can't render full output.
- **Worktree isolation for agents** (`isolation: worktree`) — Desk agents could run in isolated git worktrees. Prevents file conflicts during parallel agent work. Directly relevant to edition pipeline.
- **Skills hot reload** — Edit skills without restarting sessions. No more restart cycles when tweaking desk agent skills.
- **Hooks in skill/agent frontmatter** — Attach hooks directly to skill definitions instead of global hooks config. Cleaner architecture.
- **`claude agents` CLI command** — Lists configured agents. Good for auditing our desk agent setup.
- **ConfigChange hook event** — Security auditing on config changes.
- **WorktreeCreate/WorktreeRemove hook events** — VCS setup/teardown hooks.

### Claude Code Security (Feb 20)
- AI-powered vulnerability scanner built into Claude Code. Found 500+ vulns in production open-source projects.
- Reads code like a human researcher, not pattern matching. Multi-stage self-verification.
- GitHub Action available: `anthropics/claude-code-security-review` — wired into repo (`.github/workflows/security.yml`).
- **TODO:** Add `CLAUDE_API_KEY` secret in GitHub repo Settings > Secrets and variables > Actions. Then every PR gets scanned automatically.

### Model Updates
- **Opus 4.6** (Feb 5): 1M context, agent teams, adaptive thinking. We're running on it now.
- **Sonnet 4.6** (Feb 17): Opus 4.5-level performance at Sonnet cost. 1M context. Good for opusplan mode (Sonnet does execution).
- **Anthropic $30B Series G** at $380B valuation. $14B run-rate revenue.

### Agent Cost Optimization — Try Haiku for Desk Agents
- **Source:** oh-my-opencode agent-model-matching guide (code-yeongyu/oh-my-opencode)
- Not all agents need the same model tier. Utility agents (search, grep, simple output) should run on cheap fast models.
- Our desk agents are read-only (Read, Glob, Grep) and write structured articles.
- **Test plan:** Try dropping letters-desk and business-desk to `model: haiku` for one edition.
- **Risk:** Haiku may lose voice fidelity or miss nuance in citizen data. Test before committing.
- Claude models respond to detailed checklists (more rules = more compliance). Our heavy skill files are the right approach.
- **MiniMax M2.5 is Sonnet-quality at 1/20th cost** — 80.2% SWE-Bench, 230B params but only 10B active (MoE).
- **llmfit tool** — `llmfit` (github.com/AlexsJones/llmfit) scans hardware and scores 157 models for fit.
- **Small local model reference** — Mistral 7B (~8GB), Qwen 2.5 7B (~8GB), Phi-4 Mini (~6GB), Gemma 2 9B (~12GB).

### Local Embeddings for Memory Search — Future Upgrade
- **Source:** adolfousier/opencrabs (Rust-based agent orchestrator)
- Local vector embeddings (embeddinggemma-300M, 768-dim) for hybrid FTS5+vector memory search.
- Priority: Low. Claude-Mem keyword search covers current needs.

### Security Hardening Applied (Session 50)
- Deny reads to `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `~/.kube/`, `*_key*`, `*token*` files.
- Block edits/writes to `.env` files. `rm -rf` hard-denied by hook.
- `enableAllProjectMcpServers: false`. Disabled Statsig telemetry + Sentry error reporting.
- **GitHub Action TODO:** Add `CLAUDE_API_KEY` secret to GitHub repo.

### Tech Debt Audit Skill — Future Build
- 7 debt categories, severity scoring, 4-phase workflow.
- Scans for: `Math.random()` violations, direct sheet writes outside Phase 10, unused ctx fields, dead code, cascade risks.

### `/pre-mortem` Skill — Predict Silent Failures
- Scans engine phases and predicts where the next silent failure will come from.
- Priority: Medium. Run before each cycle.

### `/stub-engine` Skill — Condensed Engine Overview
- Quick-reference map of every exported function across all 11 phases.
- Priority: Low.

### Code Mode for Desk Packets — Query Instead of Dump
- As desk packets grow, give agents a query interface instead of dumping full packets.
- Priority: Medium-high once packets exceed ~50K tokens.

### Multi-Character Discord — TinyClaw Reference
- **Source:** TinyAGI/tinyclaw (GitHub)
- Multi-agent orchestrator for Discord. File this for when the newsroom goes multi-character.

## S55 — Check Haiku Voice Quality (Next Edition)
- Letters desk and business desk switched from Sonnet to Haiku (Phase 2.1).
- Compare: Do letters still sound like distinct citizens? Does Jordan Velez's ticker still have texture?

## 2026-03-03 — S76 Tech Reading: Claude Code Docs Deep Dive + Plugin Install

**Source:** code.claude.com/docs (59 doc pages), github.com/anthropics/claude-code (v2.1.63, 73.2k stars)

### Plugin System (NEW — major feature)
- Plugins package skills, agents, hooks, MCP servers, LSP configs into shareable units.
- Official Anthropic marketplace auto-available. Demo marketplace at `anthropics/claude-code`.
- Plugin structure: `.claude-plugin/plugin.json` manifest + `skills/`, `agents/`, `hooks/`, `.mcp.json`.
- Skills namespaced: `/plugin-name:skill-name`. Install via `/plugin install name@marketplace`.
- Can convert existing `.claude/` configs to plugin format for distribution.
- LSP plugins give real-time code intelligence (type errors, jump-to-definition after every edit).
- **Installed S76:** claude-md-management, github, commit-commands, pr-review-toolkit, playwright, code-review, typescript-lsp. All user scope.

### Agent Teams (EXPERIMENTAL)
- Multiple independent Claude Code sessions coordinating via shared task list + inter-agent messaging.
- Enable: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json.
- Team lead coordinates, teammates self-claim tasks, can message each other directly.
- Higher token cost than subagents. Known limitations: no session resumption, task lag, no nested teams.
- **GodWorld decision (S76):** Test on podcast desk first (non-canon safe). Full edition pipeline adoption deferred until stable.
- Display modes: in-process (default, Shift+Down to cycle) or split panes (requires tmux/iTerm2).
- Hooks: `TeammateIdle` (exit code 2 = keep working), `TaskCompleted` (exit code 2 = reject completion).

### Desktop App (NEW)
- Standalone app for Claude Code. Visual diff review, live preview, PR monitoring (auto-fix + auto-merge).
- Parallel sessions with auto-worktree isolation. SSH sessions to remote machines.
- Connectors UI for GitHub, Slack, Linear, Notion, etc.
- **macOS and Windows only.** No Linux support. On watch list.

### Claude Code on the Web
- Run sessions at claude.ai/code on Anthropic cloud VMs.
- `claude --remote "task"` kicks off cloud session from terminal. Runs even if laptop closes.
- `/teleport` pulls web sessions back to terminal. Multiple parallel sessions supported.
- GitHub only. Pro/Max/Team/Enterprise.
- **Rollout item 7.10** — test for autonomous task execution.

### Slack Integration (NEW)
- `@Claude` in Slack channels routes coding tasks to Claude Code on the web.
- Reads thread context, picks repo, creates session, posts progress, offers "Create PR."
- Routing modes: Code Only or Code + Chat (auto-routes based on intent).
- **Rollout item 12.10** — depends on web sessions (7.10).

### Remote Control
- Continue local sessions from phone/tablet/browser. `claude remote-control` or `/remote-control`.
- Local process stays running — remote is just a window. Sessions sync real-time.
- **Requires Max plan.** Mike confirmed Max (S76) — should work. Worth testing.
- **Rollout item 7.9.**

### Checkpointing
- Auto-saves code state before each edit. `Esc Esc` or `/rewind` to restore.
- Options: restore code + conversation, code only, conversation only, or "Summarize from here" (targeted compact).
- Persists across sessions. Doesn't track bash command changes. Not a git replacement.

### Fast Mode
- Same Opus 4.6, 2.5x faster. Toggle `/fast`. Pricing: $30/$150 MTok.
- Billed to extra usage only (not included in subscription limits).
- Best for rapid iteration. Not for long autonomous runs. On watch list.

### Chrome Troubleshooting
- Requires `claude --chrome` or `/chrome` to activate.
- Native messaging host file: `~/.config/google-chrome/NativeMessagingHosts/com.anthropic.claude_code_browser_extension.json`
- First-time: restart Chrome after host file created. Run `/chrome` for status + reconnect.
- Extension version 1.0.36+ required. Direct Anthropic plan only.

### DigitalOcean Newsletter — AI Benchmarking & New Models (2026-03-03)
Source: DigitalOcean ICYMI AI newsletter.

**Ming-Omni-TTS** (inclusionAI/Ant Group) — Unified speech, music, and sound generation in one model.
- 100+ built-in voices. Zero-shot voice cloning (WER 0.83%). Voice design from text descriptions.
- Controls: speech rate, pitch, volume, emotion, dialect. Cantonese dialect accuracy 93%.
- Two sizes: 0.5B (light) and 16.8B-A3B (full). HuggingFace: `inclusionAI/Ming-omni-tts-0.5B`.
- Explicitly lists "podcast generation" as a supported task.
- **GodWorld relevance:** Direct replacement/complement for Podcastfy in podcast pipeline. Multi-voice control means Tomas and Sonia could have distinct, controllable voices. Emotion control adds editorial texture. Music/sound generation means intro/outro beds without separate tools.
- **Hardware:** Needs GPU for real-time. 0.5B might run on CPU slowly. 16.8B needs serious GPU. Options: Colab, RunPod, or API if one appears.
- GitHub: https://github.com/inclusionAI/Ming-omni-tts

**MiniMax M2.5 update** — Previous S50 note had early benchmarks. Now confirmed:
- SWE-Bench Verified: 80.2%. BrowseComp: 76.3%. 100 tokens/sec (37% faster than predecessor).
- Lightning: $0.30/M input, $2.40/M output. Standard: half cost at 50 tok/sec.
- API: https://platform.minimax.io/ — HuggingFace: `MiniMaxAI/MiniMax-M2.5`
- **GodWorld relevance:** Cheapest frontier-class model for desk agents. At $0.30/M input, running all 6 desks through M2.5 would cost ~$0.05-0.10 per edition vs ~$2-5 on Sonnet. Test on non-canon work (letters desk, Chicago bureau) first.

**Also noted:** GPT-5.3-Codex on DigitalOcean (our cloud provider). Gemini 3.1 Pro with record benchmarks. Qwen3.5 unified vision-language. GLM-5 at 744B params. DeepGen 1.0 multimodal at only 5B.

### All buildable items moved to `docs/engine/ROLLOUT_PLAN.md`:
- 7.8 Install Official Plugins, 7.9 Remote Control, 7.10 Cloud Sessions
- 7.6 updated (podcast test for agent teams), 12.10 Slack Integration
- Watch List: Desktop (Linux), Agent Teams stability, Fast Mode, Checkpointing

---

## 2026-02-21 — S55 Tech Reading (continued from S50)
- Session 55 research covered: agent orchestration, adversarial review loops, parallel subagent best practices, pre-commit hooks, agentic journalism, Claude Code changelog (2.1.45-2.1.50).
- All buildable items moved to `docs/engine/ROLLOUT_PLAN.md`.
