import React, { useEffect, useState } from 'react';
import { Loader, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { Card, Stat, Badge } from '../ui';

const usd = (n) => '$' + (Number(n) || 0).toFixed(2);

// "carmen-delaine" -> seats grouped as "carmen-delaine (write, report)"
function groupRuns(runs) {
  const seats = {};
  const scripts = [];
  const mem = [];
  for (const r of runs || []) {
    if (r.kind === 'seat') (seats[r.name] = seats[r.name] || []).push(r.detail);
    else if (r.kind === 'claude-mem') mem.push(`claude-mem observer (${r.detail})`);
    else scripts.push(r.name);
  }
  return {
    seats: Object.entries(seats).map(([name, wakes]) => `${name} · ${wakes.join(', ')}`),
    scripts,
    mem,
  };
}

function DayBars({ days }) {
  const max = Math.max(0.01, ...days.map((d) => d.usage));
  return (
    <div className="flex items-end gap-1 h-24">
      {days.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col justify-end h-full group relative" title={`${d.date}  ${usd(d.usage)}`}>
          <div className="bg-accent/70 rounded-t" style={{ height: `${Math.max(2, (d.usage / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

export default function CostsTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState({});
  const [loading, setLoading] = useState(false);

  const load = (refresh) => {
    setLoading(true);
    fetch('/api/costs' + (refresh ? '?refresh=1' : ''), { credentials: 'same-origin' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        setData(j);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(false), []);

  if (error && !data) {
    return <div className="py-16 text-center text-sm text-bad">Costs unavailable: {error}</div>;
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size={24} className="text-accent animate-spin" />
      </div>
    );
  }

  const lowBalance = data.credits.left < 10;
  const last30 = data.days.slice(-30);

  return (
    <div className="space-y-6 pb-24">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Credit left" value={usd(data.credits.left)} sub={`${usd(data.credits.used)} of ${usd(data.credits.total)} used`} tone={lowBalance ? 'bad' : 'default'} />
        <Stat label="Today (UTC)" value={usd(data.today)} />
        <Stat label="Last 7 days" value={usd(data.week)} />
        <Stat label="Last 30 days" value={usd(data.month)} />
      </div>

      <Card
        title="Spend per day (30 days, UTC)"
        right={
          <button onClick={() => load(true)} className="text-dim hover:text-text" title="Refresh">
            {loading ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        }
      >
        <DayBars days={last30} />
      </Card>

      <Card title="By model — ranked by the last 7 days" pad={false}>
        <div className="divide-y divide-edge">
          {data.models.map((m) => {
            const g = groupRuns(m.runs);
            const isOpen = !!open[m.model];
            const noUser = !m.runs.length;
            return (
              <div key={m.model}>
                <button
                  onClick={() => setOpen({ ...open, [m.model]: !isOpen })}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-ink/40"
                >
                  {isOpen ? <ChevronDown size={14} className="text-dim" /> : <ChevronRight size={14} className="text-dim" />}
                  <span className="flex-1 text-sm font-semibold text-text break-all">{m.model}</span>
                  <span className="w-20 text-right text-sm text-text">{usd(m.usage7)}</span>
                  <span className="w-20 text-right text-xs text-dim hidden sm:block">{usd(m.usage30)} /30d</span>
                  <span className="w-20 text-right text-xs text-dim hidden sm:block">{m.requests7.toLocaleString()} calls</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pl-12 space-y-3 text-xs text-dim">
                    {noUser && <div>No current config names this model (an older setting, or something outside this repo).</div>}
                    {g.mem.length > 0 && <div><Badge tone="warn">claude-mem</Badge> {g.mem.join(' · ')}</div>}
                    {g.seats.length > 0 && (
                      <div>
                        <div className="font-bold uppercase tracking-widest text-faint mb-1">Newsroom seats</div>
                        <div className="flex flex-wrap gap-2">{g.seats.map((s) => <Badge key={s}>{s}</Badge>)}</div>
                      </div>
                    )}
                    {g.scripts.length > 0 && (
                      <div>
                        <div className="font-bold uppercase tracking-widest text-faint mb-1">Scripts that name it</div>
                        <div className="flex flex-wrap gap-2">{g.scripts.map((s) => <Badge key={s}>{s}</Badge>)}</div>
                      </div>
                    )}
                    <div>{m.promptTokens7.toLocaleString()} tokens in · {m.completionTokens7.toLocaleString()} out (7 days)</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-xs text-faint">
        Spend comes from OpenRouter, whole days in UTC, refreshed every 10 minutes. “Runs it” lists what the config names today — a script that names a model may not call it every time, and past spend can come from an older setting.
        {data.stale && ` Showing the last good read (${data.staleReason}).`}
      </p>
    </div>
  );
}
