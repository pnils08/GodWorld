// costRoutes.js — /api/costs: where the OpenRouter money goes.
// Spend by day and model comes from OpenRouter's activity feed (management key, server-side only — the key
// never reaches the browser). "Who runs the model" is read from the files that actually pick models: the
// wake packages (per seat and wake), model strings in scripts/ and lib/, and claude-mem's own setting.
import fs from 'fs';
import os from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OR = 'https://openrouter.ai/api/v1';
const TTL_MS = 10 * 60 * 1000;
const MODEL_RE = /['"`]((?:anthropic|nvidia|deepseek|google|x-ai|openai|meta-llama|moonshotai|qwen|z-ai)\/[A-Za-z0-9._:-]+)/g;

const baseModel = (m) => String(m || '').replace(/:free$/, '').toLowerCase();

// rows: OpenRouter activity rows {date, model, usage, requests, prompt_tokens, completion_tokens}
export function aggregateActivity(rows, now = new Date()) {
  const dayKey = (d) => String(d).slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const weekStart = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
  const days = new Map();
  const models = new Map();
  for (const r of rows || []) {
    const day = dayKey(r.date);
    const use = Number(r.usage) || 0;
    const key = r.model || r.model_permaslug || 'unknown';
    days.set(day, (days.get(day) || 0) + use);
    if (!models.has(key)) models.set(key, { model: key, usage7: 0, usage30: 0, requests7: 0, requests30: 0, promptTokens7: 0, completionTokens7: 0, daily: {} });
    const m = models.get(key);
    m.usage30 += use;
    m.requests30 += Number(r.requests) || 0;
    m.daily[day] = (m.daily[day] || 0) + use;
    if (day >= weekStart) {
      m.usage7 += use;
      m.requests7 += Number(r.requests) || 0;
      m.promptTokens7 += Number(r.prompt_tokens) || 0;
      m.completionTokens7 += Number(r.completion_tokens) || 0;
    }
  }
  const dayList = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, usage]) => ({ date, usage }));
  const modelList = [...models.values()].sort((a, b) => b.usage7 - a.usage7 || b.usage30 - a.usage30);
  const sum = (f) => dayList.filter(f).reduce((s, d) => s + d.usage, 0);
  return {
    today: sum((d) => d.date === today),
    week: sum((d) => d.date >= weekStart),
    month: sum(() => true),
    days: dayList,
    models: modelList,
  };
}

// model -> [{kind, name, detail}] read from the files that choose models
export function modelUsers({ root = ROOT, home = os.homedir() } = {}) {
  const users = new Map();
  const add = (model, entry) => {
    const k = baseModel(model);
    if (!users.has(k)) users.set(k, []);
    const list = users.get(k);
    if (!list.some((e) => e.kind === entry.kind && e.name === entry.name && e.detail === entry.detail)) list.push(entry);
  };
  try {
    const pk = JSON.parse(fs.readFileSync(join(root, 'scripts/newsroom-wake-packages.json'), 'utf8'));
    for (const [seat, v] of Object.entries(pk)) {
      if (!v || !v.models) continue;
      for (const [wake, cfg] of Object.entries(v.models)) if (cfg && cfg.model) add(cfg.model, { kind: 'seat', name: seat, detail: wake });
    }
  } catch { /* wake packages unreadable: seats just don't list */ }
  for (const dir of ['scripts', 'lib']) {
    let files = [];
    try { files = fs.readdirSync(join(root, dir)).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js')); } catch { continue; }
    for (const f of files) {
      let src = '';
      try { src = fs.readFileSync(join(root, dir, f), 'utf8'); } catch { continue; }
      const seen = new Set();
      for (const m of src.matchAll(MODEL_RE)) seen.add(m[1]);
      for (const model of seen) add(model, { kind: 'script', name: `${dir}/${f}`, detail: '' });
    }
  }
  try {
    const s = JSON.parse(fs.readFileSync(join(home, '.claude-mem/settings.json'), 'utf8'));
    String(s.CLAUDE_MEM_OPENROUTER_MODEL || '').split(',').map((x) => x.trim()).filter(Boolean)
      .forEach((m) => add(m, { kind: 'claude-mem', name: 'claude-mem observer', detail: m.endsWith(':free') ? 'free' : 'paid' }));
  } catch { /* no claude-mem settings */ }
  return users;
}

let cache = { at: 0, body: null };

async function getJson(url, key) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`OpenRouter ${res.status} on ${url.replace(OR, '')}`);
  return (await res.json()).data;
}

export async function buildCostBody(key, now = new Date()) {
  const [rows, credits] = await Promise.all([getJson(`${OR}/activity`, key), getJson(`${OR}/credits`, key)]);
  const agg = aggregateActivity(rows, now);
  const users = modelUsers();
  const models = agg.models.map((m) => ({ ...m, runs: users.get(baseModel(m.model)) || [] }));
  return {
    fetchedAt: now.toISOString(),
    credits: { total: credits.total_credits, used: credits.total_usage, left: credits.total_credits - credits.total_usage },
    today: agg.today, week: agg.week, month: agg.month,
    days: agg.days,
    models,
  };
}

export function registerCostRoutes(app) {
  app.get('/api/costs', async (req, res) => {
    const key = process.env.OPENROUTER_MGMT_KEY;
    if (!key) return res.status(503).json({ error: 'OPENROUTER_MGMT_KEY is not set for the dashboard' });
    const fresh = Date.now() - cache.at < TTL_MS && cache.body;
    if (fresh && req.query.refresh !== '1') return res.json(cache.body);
    try {
      cache = { at: Date.now(), body: await buildCostBody(key) };
      return res.json(cache.body);
    } catch (e) {
      if (cache.body) return res.json({ ...cache.body, stale: true, staleReason: String(e.message).slice(0, 200) });
      return res.status(502).json({ error: String(e.message).slice(0, 200) });
    }
  });
}
