import React, { useEffect, useState } from 'react';
import { Badge } from './ui';

/**
 * SupportChip — engine.102 Task 8 provenance surface.
 *
 * Shows, per cascade metric, whether the number on screen is supported by the
 * ground layers (hood demographics + ledger sample) or is a city-level dial
 * whose support the engine hasn't earned yet — the dashboard half of the
 * review paper's news rule ("no bare dice-as-census").
 *
 * Data: GET /api/cascade (10-min server cache over scripts/cascadeAudit.js).
 */

const METRICS = ['illness', 'employment', 'migration'];

function fmtPct(v) {
  return Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '—';
}

function tooltip(name, m, denominators) {
  if (!m) return `${name}: no data`;
  const parts = [];
  if (Number.isFinite(m.city)) parts.push(`city ${fmtPct(m.city)}`);
  if (Number.isFinite(m.hood)) parts.push(`hood ${fmtPct(m.hood)}`);
  if (Number.isFinite(m.ledger)) {
    const denom = denominators?.ledger;
    parts.push(`ledger ${fmtPct(m.ledger)}${denom ? ` (of ${denom})` : ''}`);
  }
  return `${name}: ${parts.join(' | ') || 'no data'}`;
}

export function useCascade() {
  const [cascade, setCascade] = useState(undefined); // undefined = loading, null = failed
  useEffect(() => {
    let cancelled = false;
    fetch('/api/cascade')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setCascade(data); })
      .catch(() => { if (!cancelled) setCascade(null); });
    return () => { cancelled = true; };
  }, []);
  return cascade;
}

export default function SupportChip({ cascade }) {
  if (cascade === undefined) return null; // still loading — render nothing
  if (!cascade) {
    return <span className="text-[11px] text-faint italic">provenance unavailable</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {METRICS.map((name) => {
        const m = cascade.metrics?.[name];
        const support = m?.support || 'unknown';
        const tone = support === 'supported' ? 'good' : support === 'unsupported' ? 'warn' : 'default';
        const label = support === 'supported' ? 'SUPPORTED' : support === 'unsupported' ? 'CITY DIAL' : 'NO DATA';
        return (
          <span key={name} title={tooltip(name, m, cascade.denominators)}>
            <Badge tone={tone}>{`${name}: ${label}`}</Badge>
          </span>
        );
      })}
    </span>
  );
}

/** One-line three-scale breakdown for the active metric (legend area). */
export function SupportScaleLine({ cascade, metric }) {
  if (!cascade || !metric) return null;
  const m = cascade.metrics?.[metric];
  if (!m) return null;
  return (
    <div className="text-[11px] text-faint font-mono mt-1">
      {tooltip(metric, m, cascade.denominators)}
    </div>
  );
}
