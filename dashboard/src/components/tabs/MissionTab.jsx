import React, { useState } from 'react';
import { Server, Radio, Wifi, Zap, Loader } from 'lucide-react';
import { Card, Stat, Badge } from '../ui';

export default function MissionTab({ missionData, onRefresh }) {
  const [actionStatus, setActionStatus] = useState(null);

  if (!missionData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size={24} className="text-accent animate-spin" />
      </div>
    );
  }

  const { health, events } = missionData;
  const engineStatus = health?.status || 'unknown';
  const engineLabel = health?.engine || '—';
  const latestCycle = health?.data?.latestCycleArchive?.replace('cycle-', '') || '—';
  const latestEdition = health?.data?.latestEdition || '—';

  const recentEvents = (events || [])
    .sort(
      (a, b) =>
        new Date(b.receivedAt || b.timestamp) - new Date(a.receivedAt || a.timestamp)
    )
    .slice(0, 10);

  const eventTone = (type) => {
    if (!type) return 'default';
    const t = type.toLowerCase();
    if (t.includes('start')) return 'good';
    if (t.includes('stop') || t.includes('end')) return 'warn';
    if (t.includes('webhook')) return 'accent';
    return 'default';
  };

  const eventDot = (type) => {
    const tone = eventTone(type);
    return tone === 'good'
      ? 'bg-good'
      : tone === 'warn'
      ? 'bg-warn'
      : tone === 'accent'
      ? 'bg-accent'
      : 'bg-dim';
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <Card title="System Health" right={<Server size={14} className="text-accent" />}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat
            label="Status"
            value={engineStatus === 'ok' ? 'Online' : engineStatus}
            tone={engineStatus === 'ok' ? 'good' : 'warn'}
          />
          <Stat label="Engine" value={engineLabel} />
          <Stat label="Latest Cycle" value={latestCycle} />
          <Stat label="Latest Edition" value={latestEdition} />
          <Stat label="Droplet" value="1 vCPU / 2GB" />
          <Stat label="Disk" value="25GB SSD" />
        </div>
      </Card>

      <Card
        title="Session Events"
        right={<span className="text-[11px] font-mono text-faint">{events?.length || 0} total</span>}
      >
        {recentEvents.length === 0 ? (
          <p className="text-xs text-dim italic">No events recorded</p>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-panel rounded-xl border border-edge">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${eventDot(ev.type)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={eventTone(ev.type)}>{ev.type || 'unknown'}</Badge>
                    {ev.session_id && (
                      <span className="text-[11px] font-mono text-faint truncate">
                        {ev.session_id.slice(0, 12)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-dim mt-0.5">
                    {formatTime(ev.receivedAt || ev.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Channel Status" right={<Wifi size={14} className="text-accent" />}>
        <div className="flex items-center gap-3 p-3 bg-panel rounded-xl border border-edge">
          <div className="w-2 h-2 rounded-full bg-good shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-bold text-text">Discord</div>
            <div className="text-[11px] text-dim">MagsClaudeCode</div>
          </div>
          <Badge tone="good">Connected</Badge>
        </div>
      </Card>

      <Card title="Quick Actions" right={<Zap size={14} className="text-accent" />}>
        <div className="flex gap-2">
          <ActionButton
            onClick={async () => {
              setActionStatus('Restarting bot...');
              try {
                const r = await fetch('/api/actions/restart-bot', { method: 'POST' });
                setActionStatus(r.ok ? 'Bot restarted' : 'Failed');
              } catch {
                setActionStatus('Failed');
              }
              setTimeout(() => {
                setActionStatus(null);
                onRefresh?.();
              }, 2000);
            }}
          >
            Restart Bot
          </ActionButton>
          <ActionButton
            onClick={async () => {
              setActionStatus('Checking health...');
              try {
                const r = await fetch('/api/actions/health-check', { method: 'POST' });
                const d = await r.json();
                setActionStatus(`${d.mem} RAM | ${d.disk} disk`);
              } catch {
                setActionStatus('Failed');
              }
              setTimeout(() => {
                setActionStatus(null);
                onRefresh?.();
              }, 5000);
            }}
          >
            Health Check
          </ActionButton>
          <ActionButton
            onClick={async () => {
              setActionStatus('Clearing...');
              try {
                await fetch('/api/session-events', { method: 'DELETE' });
                setActionStatus('Cleared');
              } catch {
                setActionStatus('Failed');
              }
              setTimeout(() => {
                setActionStatus(null);
                onRefresh?.();
              }, 1500);
            }}
          >
            Clear Events
          </ActionButton>
        </div>
        {actionStatus && (
          <div className="mt-3 text-xs text-accent font-mono text-center animate-pulse">
            {actionStatus}
          </div>
        )}
      </Card>
    </div>
  );
}

function ActionButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 px-3 py-2.5 rounded-xl border border-edge text-xs font-bold text-dim hover:text-text hover:border-faint/30 transition-colors"
    >
      {children}
    </button>
  );
}
