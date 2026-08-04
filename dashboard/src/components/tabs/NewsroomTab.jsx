import React from 'react';
import {
  Loader,
  Star,
  Briefcase,
  BarChart3,
  Users,
  Radio,
  Database,
} from 'lucide-react';
import { Card, Stat, SectionHeader, Badge } from '../ui';

const deskTone = {
  civic: 'good',
  sports: 'warn',
  culture: 'accent',
  business: 'warn',
  chicago: 'bad',
  letters: 'default',
};

export default function NewsroomTab({ newsroom }) {
  if (!newsroom) {
    return (
      <Card className="py-12 text-center">
        <Loader size={24} className="mx-auto mb-3 animate-spin text-accent" />
        <p className="text-sm text-dim">Loading newsroom...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <Card>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center font-black text-sm text-accent">
            M
          </div>
          <div>
            <h3 className="text-base font-black text-text">{newsroom.editor.name}</h3>
            <span className="text-[11px] text-dim">{newsroom.editor.role}</span>
          </div>
        </div>
        {newsroom.editor.journal && (
          <div className="mt-3 p-3 bg-panel rounded-xl border border-edge">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-black text-accent uppercase tracking-widest">
                Entry {newsroom.editor.journal.entryNumber}: {newsroom.editor.journal.entryTitle}
              </span>
              <span className="text-[11px] font-mono text-faint">
                S{newsroom.editor.journal.session}
              </span>
            </div>
            <p className="text-xs text-dim leading-relaxed italic">
              {newsroom.editor.journal.preview}
            </p>
          </div>
        )}
      </Card>

      <Card title="Mara Vance — Audit" right={<Star size={14} className="text-warn" />}>
        {newsroom.audit.latestScore && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Grade" value={newsroom.audit.latestScore.grade} tone="warn" />
            <Stat label="Score" value={newsroom.audit.latestScore.total || '—'} />
            <Stat label="Edition" value={`E${newsroom.audit.latestScore.edition}`} />
          </div>
        )}
        {newsroom.audit.latestScore?.deskErrors && (
          <div className="space-y-1.5">
            {Object.entries(newsroom.audit.latestScore.deskErrors).map(
              ([desk, errors]) =>
                errors.length > 0 && (
                  <div key={desk} className="flex items-start gap-2">
                    <span className="text-[11px] font-black text-faint uppercase w-14 shrink-0 mt-0.5">
                      {desk}
                    </span>
                    <div className="flex-1">
                      {errors.map((err, i) => (
                        <p key={i} className="text-xs text-bad/80 leading-relaxed">
                          {err}
                        </p>
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        )}
        {newsroom.audit.scoreHistory?.length > 1 && (
          <div className="mt-4 pt-4 border-t border-edge">
            <h5 className="text-[11px] font-black uppercase tracking-widest text-faint mb-2">
              Score History
            </h5>
            <div className="flex items-end gap-1 h-12">
              {newsroom.audit.scoreHistory.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[11px] font-bold text-dim">{s.grade}</span>
                  <div
                    className="w-full rounded-sm bg-warn/30"
                    style={{ height: `${Math.max(4, (s.total || 80) * 0.4)}px` }}
                  />
                  <span className="text-[11px] font-mono text-faint">E{s.edition}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div>
        <SectionHeader title="Desk Status" right={<Briefcase size={14} className="text-accent" />} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(newsroom.desks).map(([desk, status]) => (
            <Card
              key={desk}
              title={desk}
              right={<span className="text-[11px] font-mono text-faint">C{status.latestCycle}</span>}
            >
              <div className="flex flex-wrap gap-3 text-xs text-dim">
                {status.latestArticles > 0 && <span>{status.latestArticles} articles</span>}
                {status.hookCount > 0 && <span>{status.hookCount} hooks</span>}
                {status.arcCount > 0 && <span>{status.arcCount} arcs</span>}
                {status.packetCount > 0 && <span>{status.packetCount} packets</span>}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title="Pipeline" right={<BarChart3 size={14} className="text-good" />} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat label="Total Files" value={newsroom.pipeline.totalEditions} />
          <Stat label="Editions" value={newsroom.pipeline.mainEditions} />
          <Stat label="Supplementals" value={newsroom.pipeline.supplementals} />
        </div>
        {newsroom.pipeline.articleTrend?.length > 0 && (
          <Card title="Article Count — Recent Editions">
            <div className="flex items-end gap-2 h-16">
              {newsroom.pipeline.articleTrend.slice().reverse().map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-xs font-black text-accent">{t.articles}</span>
                  <div
                    className="w-full rounded-sm bg-accent/30"
                    style={{ height: `${Math.max(8, t.articles * 3)}px` }}
                  />
                  <span className="text-[11px] font-mono text-faint">E{t.cycle}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div>
        <SectionHeader
          title="Tribune Roster"
          sub={`${newsroom.roster.totalReporters} journalists`}
          right={<Users size={14} className="text-accent" />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {newsroom.roster.desks.map((d) => (
            <Card key={d.desk} title={d.desk}>
              <div className="space-y-1">
                {d.reporters.map((r, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs text-text font-bold">{r.name}</span>
                    <span className="text-[11px] text-dim">{r.beat}</span>
                  </div>
                ))}
                {d.columnists.map((c, i) => (
                  <div key={`c${i}`} className="flex justify-between items-center">
                    <span className="text-xs text-text font-bold">{c.name}</span>
                    <span className="text-[11px] text-warn/80 italic">{c.column}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {newsroom.processes?.length > 0 && (
        <div>
          <SectionHeader title="Processes" right={<Radio size={14} className="text-good" />} />
          <div className="space-y-3">
            {newsroom.processes.map((p, i) => (
              <Card key={i} className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-text">{p.name}</span>
                  <div className="flex flex-wrap gap-3 mt-0.5">
                    {p.memory && <span className="text-[11px] text-dim">{p.memory} MB</span>}
                    <span className="text-[11px] text-dim">{p.restarts} restarts</span>
                    {p.uptime && (
                      <span className="text-[11px] text-dim">
                        since {p.uptime.split('T')[0]}
                      </span>
                    )}
                  </div>
                </div>
                <Badge tone={p.status === 'online' ? 'good' : 'bad'}>{p.status}</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {newsroom.citizenArchive && (
        <div>
          <SectionHeader
            title="Citizen Archive"
            sub={`${newsroom.citizenArchive.totalCitizens} citizens, ${newsroom.citizenArchive.totalRefs} refs`}
            right={<Database size={14} className="text-accent" />}
          />
          <div className="space-y-2">
            {newsroom.citizenArchive.topCitizens.map((c, i) => (
              <Card key={i} className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-faint w-4 text-right">{i + 1}</span>
                <span className="text-xs font-bold text-text flex-1">{c.name}</span>
                <span className="text-[11px] font-mono text-accent">{c.refs} refs</span>
                <span className="text-[11px] font-mono text-faint">{c.popId}</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
