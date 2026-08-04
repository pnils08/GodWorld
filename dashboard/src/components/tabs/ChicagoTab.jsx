import React from 'react';
import { MapPinned, Activity, Newspaper, Users, Trophy, Loader } from 'lucide-react';
import { Card, SectionHeader, Badge } from '../ui';

const eventTypeTone = {
  'game-result': 'accent',
  trade: 'warn',
  transaction: 'warn',
  'roster-move': 'default',
  injury: 'bad',
  milestone: 'warn',
  signing: 'default',
  callup: 'good',
};

const trendTone = {
  rising: 'good',
  steady: 'accent',
  falling: 'warn',
  declining: 'bad',
};

export default function ChicagoTab({ chicagoData }) {
  if (!chicagoData) {
    return (
      <Card className="py-12 text-center">
        <Loader size={24} className="mx-auto mb-3 animate-spin text-bad" />
        <p className="text-sm text-dim">Loading Chicago data...</p>
      </Card>
    );
  }

  const feeds = chicagoData.feeds || [];
  const articles = chicagoData.articles || [];

  let digest = null;
  if (chicagoData.digest) {
    if (typeof chicagoData.digest === 'object' && chicagoData.digest.teamLabel) {
      digest = chicagoData.digest;
    } else if (typeof chicagoData.digest === 'object') {
      const vals = Object.values(chicagoData.digest).filter(
        (v) => v && typeof v === 'object' && v.teamLabel
      );
      digest = vals[0] || null;
    }
  }

  const latestFeed = feeds[0] || {};
  const record = digest?.currentRecord || latestFeed.Record || null;
  const trend = digest?.teamMomentum || latestFeed.Trend || null;
  const seasonType = digest?.seasonState || latestFeed.SeasonType || null;
  const trendArrow =
    trend === 'rising' ? '▲' : trend === 'falling' || trend === 'declining' ? '▼' : '●';

  return (
    <div className="space-y-6 pb-20">
      <Card
        className="bg-panel-2 border-bad/20"
        title="Chicago Bulls"
        right={record && <div className="text-xl font-black tracking-tight text-text">{record}</div>}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-bad/10 rounded-lg">
            <MapPinned size={18} className="text-bad" />
          </div>
          <div>
            <h3 className="text-lg font-black text-bad">Chicago Bulls</h3>
            {seasonType && <span className="text-xs text-dim uppercase">{seasonType}</span>}
          </div>
        </div>
        {trend && (
          <Badge tone={trendTone[trend] || 'default'}>
            {trendArrow} {trend}
          </Badge>
        )}
        {digest?.rosterMoves?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-edge">
            <h5 className="text-[11px] font-black uppercase tracking-widest text-faint mb-2">
              Recent Moves
            </h5>
            {digest.rosterMoves.slice(0, 3).map((rm, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <span className="text-[11px] font-mono text-faint shrink-0">C{rm.cycle}</span>
                <span className="text-xs text-dim">{rm.names?.join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {feeds.length > 0 && (
        <div>
          <SectionHeader title="Feed Events" right={<Activity size={14} className="text-bad" />} />
          <div className="space-y-3">
            {feeds.map((f, i) => {
              const evtType = (f.EventType || '').toLowerCase();
              return (
                <Card key={i}>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {f.Cycle && <span className="text-[11px] font-mono text-faint">C{f.Cycle}</span>}
                    {f.EventType && (
                      <Badge tone={eventTypeTone[evtType] || 'default'}>{f.EventType}</Badge>
                    )}
                    {f.SeasonType && (
                      <span className="text-[11px] text-dim uppercase">{f.SeasonType}</span>
                    )}
                  </div>
                  {f.Notes && <p className="text-sm text-text leading-relaxed mb-1">{f.Notes}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px]">
                    {f.TeamsUsed && (
                      <span className="text-dim">
                        <Trophy size={9} className="inline mr-0.5" /> {f.TeamsUsed}
                      </span>
                    )}
                    {f.NamesUsed && (
                      <span className="text-dim">
                        <Users size={9} className="inline mr-0.5" /> {f.NamesUsed}
                      </span>
                    )}
                    {f.Stats && <span className="text-accent font-mono">{f.Stats}</span>}
                    {f.Record && <span className="font-mono text-dim">{f.Record}</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {articles.length > 0 && (
        <div>
          <SectionHeader title="Bureau Coverage" right={<Newspaper size={14} className="text-bad" />} />
          <div className="space-y-3">
            {articles.map((a, i) => (
              <Card key={i}>
                <div className="flex justify-between items-start mb-1">
                  <Badge tone="bad">{a.cycle ? `C${a.cycle}` : 'ARCHIVE'}</Badge>
                  {a.section && <span className="text-[11px] text-dim">{a.section}</span>}
                </div>
                <h4 className="text-xs font-bold mb-1 text-text">{a.title}</h4>
                {a.snippet && (
                  <p className="text-xs text-dim leading-relaxed line-clamp-2">{a.snippet}</p>
                )}
                {a.author && <span className="text-[11px] text-dim mt-1 block">{a.author}</span>}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionHeader title="Bureau Reporters" right={<Users size={14} className="text-bad" />} />
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="text-xs font-bold text-text">Selena Grant</div>
            <div className="text-[11px] text-dim mt-0.5">Beats Reporter</div>
          </Card>
          <Card>
            <div className="text-xs font-bold text-text">Talia Finch</div>
            <div className="text-[11px] text-dim mt-0.5">Neighborhood Texture</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
