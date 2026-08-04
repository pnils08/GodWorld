import React, { useState } from 'react';
import { Zap, GitBranch, BookOpen } from 'lucide-react';
import { Card, SectionHeader, Badge } from '../ui';

const domainTone = {
  CIVIC: 'good',
  ECONOMIC: 'warn',
  CRIME: 'bad',
  HEALTH: 'bad',
  CULTURE: 'accent',
  SPORTS: 'warn',
  NIGHTLIFE: 'accent',
};

const phaseTone = {
  early: 'accent',
  rising: 'warn',
  peak: 'bad',
  falling: 'default',
  resolved: 'good',
};

const priorityTone = {
  high: 'bad',
  medium: 'warn',
  low: 'default',
};

export default function IntelTab({ hooks, arcs, storylines }) {
  return (
    <div className="space-y-6 pb-20">
      <div>
        <SectionHeader
          title="Story Hooks"
          sub={`${hooks?.total || 0} total`}
          right={<Zap size={14} className="text-warn" />}
        />
        {(hooks?.hooks || []).slice(0, 10).map((hook, i) => (
          <HookCard key={i} hook={hook} />
        ))}
        {!hooks && (
          <Card className="text-center py-8 text-dim text-sm">Loading...</Card>
        )}
      </div>

      <div>
        <SectionHeader
          title="Active Arcs"
          sub={`${arcs?.total || 0} total`}
          right={<GitBranch size={14} className="text-accent" />}
        />
        {(arcs?.arcs || []).slice(0, 10).map((arc, i) => (
          <ArcCard key={i} arc={arc} />
        ))}
      </div>

      <div>
        <SectionHeader
          title="Active Storylines"
          sub={`${storylines?.total || 0} total`}
          right={<BookOpen size={14} className="text-good" />}
        />
        {(storylines?.storylines || []).slice(0, 15).map((sl, i) => (
          <StorylineCard key={i} storyline={sl} />
        ))}
      </div>
    </div>
  );
}

function HookCard({ hook }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card
      className="cursor-pointer hover:border-warn/20 transition-colors mb-2"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <Badge tone={domainTone[hook.domain] || 'default'}>{hook.domain}</Badge>
          {hook.neighborhood && <span className="text-[11px] text-dim">{hook.neighborhood}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-warn">
            P{hook.priorityScore || hook.priority}
          </span>
          <span className="text-[11px] text-dim">{hook.hookType}</span>
        </div>
      </div>
      <p className={`text-sm text-text leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
        {hook.text}
      </p>
      {expanded && hook.suggestedDesks && (
        <p className="text-xs text-accent mt-2">Desk: {hook.suggestedDesks}</p>
      )}
    </Card>
  );
}

function ArcCard({ arc }) {
  const tension = parseFloat(arc.tension) || 0;
  const tensionWidth = Math.min(100, (tension / 5) * 100);
  const tone = phaseTone[arc.phase] || 'default';
  const barColor = tension > 3 ? 'bg-bad' : tension > 2 ? 'bg-warn' : 'bg-accent';

  return (
    <Card className="mb-2">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <Badge tone={tone}>{arc.domain}</Badge>
          <Badge tone={tone}>{arc.phase}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {arc.neighborhood && <span className="text-[11px] text-dim">{arc.neighborhood}</span>}
          <span className="text-[11px] font-mono text-faint">age {arc.arcAge}</span>
        </div>
      </div>
      <p className="text-sm text-text mb-2">{arc.summary}</p>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-faint uppercase">Tension</span>
        <div className="flex-1 h-1 bg-edge rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${tensionWidth}%` }} />
        </div>
        <span className="text-[11px] font-mono text-faint">{tension.toFixed(1)}</span>
      </div>
    </Card>
  );
}

function StorylineCard({ storyline }) {
  return (
    <Card className="mb-2">
      <div className="flex justify-between items-start mb-1">
        <Badge tone={priorityTone[storyline.priority] || 'default'}>
          {storyline.priority} · {storyline.type}
        </Badge>
        <span className="text-[11px] font-mono text-faint">C{storyline.cycleAdded}</span>
      </div>
      <p className="text-sm text-text leading-relaxed">{storyline.description}</p>
      <div className="flex flex-wrap gap-2 mt-1.5 text-[11px]">
        {storyline.relatedCitizens && (
          <span className="text-accent">{storyline.relatedCitizens}</span>
        )}
        {storyline.neighborhood && <span className="text-dim">{storyline.neighborhood}</span>}
        {storyline.desks?.length > 0 && (
          <span className="text-faint">{storyline.desks.join(', ')}</span>
        )}
      </div>
    </Card>
  );
}
