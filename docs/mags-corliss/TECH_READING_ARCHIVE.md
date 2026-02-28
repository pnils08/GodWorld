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

## 2026-02-21 — S55 Tech Reading (continued from S50)
- Session 55 research covered: agent orchestration, adversarial review loops, parallel subagent best practices, pre-commit hooks, agentic journalism, Claude Code changelog (2.1.45-2.1.50).
- All buildable items moved to `docs/engine/ROLLOUT_PLAN.md`.
