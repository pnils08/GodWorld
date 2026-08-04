import React, { useState } from 'react';
import {
  AlertTriangle,
  Timer,
  CheckCircle2,
  CircleDot,
  FileWarning,
} from 'lucide-react';
import { Card, Stat, Badge, SectionHeader } from '../ui';

const statusConfig = {
  blocked: { icon: AlertTriangle, tone: 'bad', label: 'BLOCKED' },
  stalled: { icon: FileWarning, tone: 'warn', label: 'STALLED' },
  'clock-running': { icon: Timer, tone: 'accent', label: 'CLOCK RUNNING' },
  'in-progress': { icon: CheckCircle2, tone: 'good', label: 'IN PROGRESS' },
  untracked: { icon: CircleDot, tone: 'default', label: 'UNTRACKED' },
};

export default function TrackerTab({ initiatives }) {
  return (
    <div className="space-y-4 pb-20">
      {initiatives?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Blocked" value={initiatives.summary.blocked} tone="bad" />
          <Stat label="Stalled" value={initiatives.summary.stalled} tone="warn" />
          <Stat label="Clock" value={initiatives.summary.clockRunning} tone="accent" />
          <Stat label="Active" value={initiatives.summary.inProgress} tone="good" />
        </div>
      )}

      {(initiatives?.initiatives || []).map((init) => (
        <InitiativeCard key={init.id} initiative={init} />
      ))}

      {initiatives?.lastUpdated && (
        <p className="text-[11px] text-faint text-center mt-6 font-mono">
          Last updated: {initiatives.lastUpdated} by {initiatives.updatedBy}
        </p>
      )}
    </div>
  );
}

function InitiativeCard({ initiative }) {
  const [expanded, setExpanded] = useState(false);
  const impl = initiative.implementation || {};
  const cfg = statusConfig[impl.status] || statusConfig.untracked;
  const StatusIcon = cfg.icon;

  const iconColor =
    cfg.tone === 'bad'
      ? 'text-bad'
      : cfg.tone === 'warn'
      ? 'text-warn'
      : cfg.tone === 'good'
      ? 'text-good'
      : cfg.tone === 'accent'
      ? 'text-accent'
      : 'text-dim';

  return (
    <Card
      className="cursor-pointer hover:bg-panel-2 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon size={14} className={iconColor} />
          <Badge tone={cfg.tone}>{cfg.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-faint">{initiative.id}</span>
          <span className="text-[11px] font-mono text-faint">C{initiative.voteCycle}</span>
        </div>
      </div>
      <h3 className="text-base font-black tracking-tight mb-1 text-text">
        {initiative.name}
      </h3>
      <div className="flex flex-wrap gap-3 mt-2 mb-3 text-xs text-dim">
        <span>{initiative.vote} vote</span>
        <span>{initiative.budget}</span>
        {initiative.domain && <span className="capitalize">{initiative.domain}</span>}
        {initiative.relatedArticles?.length > 0 && (
          <span className="text-accent font-bold">
            {initiative.relatedArticles.length} articles
          </span>
        )}
      </div>
      <p className="text-xs text-dim leading-relaxed">{impl.summary}</p>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-edge space-y-3">
          {impl.pendingItems?.length > 0 && (
            <div>
              <h5 className="text-[11px] font-black uppercase tracking-widest text-faint mb-2">
                Pending
              </h5>
              {impl.pendingItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <CircleDot size={10} className="text-accent mt-0.5 shrink-0" />
                  <span className="text-sm text-text">{item}</span>
                </div>
              ))}
            </div>
          )}
          {impl.keyContacts?.length > 0 && (
            <div>
              <h5 className="text-[11px] font-black uppercase tracking-widest text-faint mb-2">
                Key Contacts
              </h5>
              {impl.keyContacts.map((contact, i) => (
                <p key={i} className="text-sm text-dim mb-1">
                  {contact}
                </p>
              ))}
            </div>
          )}
          {impl.newsroomNote && (
            <div className="p-3 bg-panel rounded-xl border border-edge">
              <h5 className="text-[11px] font-black uppercase tracking-widest text-accent mb-1">
                Newsroom Note
              </h5>
              <p className="text-sm text-text leading-relaxed italic">{impl.newsroomNote}</p>
            </div>
          )}
          {initiative.relatedArticles?.length > 0 && (
            <div>
              <h5 className="text-[11px] font-black uppercase tracking-widest text-faint mb-2">
                Coverage Trail{' '}
                <span className="text-dim">({initiative.relatedArticles.length} articles)</span>
              </h5>
              <div className="space-y-1.5">
                {initiative.relatedArticles.map((article, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 bg-panel rounded-lg border border-edge"
                  >
                    <span className="text-[11px] font-mono text-accent shrink-0 mt-0.5">
                      E{article.cycle}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text font-bold truncate">{article.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        {article.author && (
                          <span className="text-[11px] text-dim">{article.author}</span>
                        )}
                        {article.section && (
                          <span className="text-[11px] text-dim">{article.section}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {initiative.engine?.voteBreakdown && (
            <div>
              <h5 className="text-[11px] font-black uppercase tracking-widest text-faint mb-1">
                Vote Record
              </h5>
              <p className="text-xs text-dim leading-relaxed">
                {initiative.engine.voteBreakdown}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
