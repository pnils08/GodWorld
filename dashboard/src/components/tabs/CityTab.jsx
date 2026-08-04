import React from 'react';
import { MapPin } from 'lucide-react';
import { Card, Badge } from '../ui';

function MiniStat({ label, value, tone = 'default' }) {
  const colorClass =
    tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-text';
  return (
    <div>
      <div className="text-[11px] font-bold text-faint uppercase">{label}</div>
      <div className={`text-xs font-mono font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}

function sentimentTone(s) {
  if (s >= 0.92) return 'good';
  if (s >= 0.88) return 'accent';
  return 'warn';
}

export default function CityTab({ hoods }) {
  const sorted = [...hoods].sort((a, b) => b.sentiment - a.sentiment);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-20">
      {sorted.map((h) => {
        const tone = sentimentTone(h.sentiment);
        const hasShockEvent = Boolean(h.shockEvent) || Boolean(h.demographic && h.demographic !== 'Stable');
        return (
          <Card key={h.name}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-accent" />
                <h4 className="text-sm font-bold text-text">{h.name}</h4>
              </div>
              <Badge tone={tone}>{h.sentiment.toFixed(2)}</Badge>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <MiniStat label="Crime" value={h.crimeIndex} tone={h.crimeIndex > 1 ? 'bad' : 'default'} />
              <MiniStat label="Nightlife" value={h.nightlife.toFixed(1)} />
              <MiniStat label="Retail" value={h.retailVitality.toFixed(1)} />
              <MiniStat label="Events" value={h.eventAttractiveness.toFixed(0)} />
            </div>
            {hasShockEvent && (
              <p className="text-xs text-warn mt-2">
                {h.shockEvent || h.demographic}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
