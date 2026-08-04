import React from 'react';
import { Newspaper, BookOpen } from 'lucide-react';
import { Card, SectionHeader, Badge } from '../ui';

export default function EditionTab({
  articles,
  supplementals,
  tier1,
  ArticleCard,
  onSupplementalClick,
  onCitizenClick,
}) {
  return (
    <div className="space-y-6 pb-20">
      {articles.length === 0 && (
        <Card className="py-12 text-center">
          <Newspaper size={32} className="mx-auto mb-3 opacity-50 text-dim" />
          <p className="text-sm text-dim">No edition data loaded</p>
        </Card>
      )}
      {articles.map((article, i) => (
        <ArticleCard key={i} article={article} isFirst={i === 0} />
      ))}

      {supplementals.length > 0 && (
        <Card
          title="Supplemental Editions"
          right={<Badge tone="warn">{supplementals.length}</Badge>}
        >
          <div className="space-y-3">
            {supplementals.map((s, i) => {
              const label = s.file
                .replace('supplemental_', '')
                .replace(/\.txt$/, '')
                .replace(/_c\d+/, '')
                .replace(/_/g, ' ');
              return (
                <div
                  key={i}
                  className="p-4 bg-panel-2 rounded-xl border border-edge hover:border-warn/30 transition-colors cursor-pointer"
                  onClick={() => onSupplementalClick(s)}
                >
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-bold capitalize text-text">{label}</div>
                    <Badge tone="warn">C{s.cycle}</Badge>
                  </div>
                  <div className="text-[11px] text-faint mt-1 font-mono">{s.file}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tier1.length > 0 && (
        <div className="mt-12">
          <SectionHeader
            title="Key Figures"
            sub={`${tier1.length} tier-1 citizens`}
            right={<Badge tone="accent">TIER 1</Badge>}
          />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {tier1.slice(0, 12).map((c) => (
              <Card
                key={c.popId}
                className="cursor-pointer hover:border-accent/30 transition-colors"
                onClick={() => onCitizenClick(c.popId)}
              >
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold text-text">
                    {c.firstName} {c.lastName}
                  </div>
                  <Badge tone="warn">T{c.tier}</Badge>
                </div>
                <div className="text-[11px] text-dim mt-0.5">{c.role}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[11px] text-faint">{c.neighborhood}</span>
                  {c.totalRefs > 0 && (
                    <span className="text-[11px] font-mono text-accent/80">
                      {c.totalRefs} refs
                    </span>
                  )}
                </div>
                {c.originCity && (
                  <div className="text-[11px] text-faint mt-0.5 italic">{c.originCity}</div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
