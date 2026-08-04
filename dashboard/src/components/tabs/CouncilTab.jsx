import React from 'react';
import { Card, Stat, Badge } from '../ui';

function factionTone(f) {
  switch (f?.toUpperCase()) {
    case 'OPP':
      return 'accent';
    case 'CRC':
      return 'warn';
    case 'IND':
      return 'default';
    default:
      return 'default';
  }
}

function factionColor(f) {
  switch (f?.toUpperCase()) {
    case 'OPP':
      return 'text-accent';
    case 'CRC':
      return 'text-warn';
    case 'IND':
      return 'text-dim';
    default:
      return 'text-dim';
  }
}

export default function CouncilTab({ councilMembers }) {
  const mayor = councilMembers.filter((c) => c.officeId === 'MAYOR-01');
  const councilors = councilMembers.filter((c) => c.officeId?.startsWith('COUNCIL-'));
  const counts = ['OPP', 'CRC', 'IND'].map((faction) => ({
    faction,
    count: councilors.filter((c) => c.faction === faction).length,
  }));

  return (
    <div className="space-y-4 pb-20">
      {mayor.map((m) => (
        <Card
          key={m.officeId}
          title="Mayor"
          right={<Badge tone={factionTone(m.faction)}>{m.faction}</Badge>}
          className="bg-panel-2"
        >
          <h3 className="text-xl font-black tracking-tight text-text">{m.holder}</h3>
          <p className="text-xs text-dim mt-1">{m.notes}</p>
        </Card>
      ))}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {councilors.map((m) => (
          <Card key={m.officeId}>
            <div className="flex flex-wrap items-start gap-2 mb-2">
              <span className="text-[11px] font-mono text-faint">{m.district}</span>
              <Badge tone={factionTone(m.faction)}>{m.faction}</Badge>
              {m.status === 'injured' && <Badge tone="bad">INJURED</Badge>}
            </div>
            <h4 className="text-sm font-bold text-text">{m.holder}</h4>
            <p className="text-xs text-dim mt-0.5">{m.notes}</p>
            <div className="mt-2 text-[11px] font-mono text-faint">{m.popId}</div>
          </Card>
        ))}
      </div>

      <Card title="Faction Breakdown">
        <div className="grid grid-cols-3 gap-4">
          {counts.map(({ faction, count }) => (
            <div key={faction} className="text-center">
              <div className={`text-xl font-black ${factionColor(faction)}`}>{count}</div>
              <div className="text-[11px] font-bold text-faint uppercase">{faction}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
