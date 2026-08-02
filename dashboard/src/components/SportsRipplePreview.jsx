import React from 'react';
import { CheckCircle2, CircleOff, GitBranch } from 'lucide-react';

function RippleItem({ item, unavailable }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/25 p-3">
      {unavailable
        ? <CircleOff size={15} className="mt-0.5 shrink-0 text-neutral-400" />
        : <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />}
      <div className="min-w-0">
        <div className="text-xs font-bold text-neutral-200">{item.label}</div>
        <div className="mt-0.5 text-[9px] font-mono text-neutral-400">{item.id} · {item.status}</div>
      </div>
    </li>
  );
}

export default function SportsRipplePreview({ preview }) {
  if (!preview) return null;
  const ripple = preview.ripplePreview || {};
  const statDiff = preview.mutationPreview?.statDiff;
  const stateDiff = preview.mutationPreview?.stateDiff;
  return (
    <section aria-live="polite" className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-950/10 p-4">
      <div className="flex items-center gap-2">
        <GitBranch size={15} className="text-emerald-400" />
        <h3 className="text-sm font-black text-white">Ripple Preview</h3>
        <span className="ml-auto rounded-full border border-white/10 px-2 py-1 text-[8px] font-black text-neutral-400">NO WRITE</span>
      </div>
      <p className="mt-2 text-[10px] text-neutral-400">This is a deterministic compatibility projection. It has not changed a Sheet, roster, citizen, or newsroom artifact.</p>
      {statDiff && (
        <section className="mt-4 overflow-hidden rounded-xl border border-sky-400/15 bg-sky-950/10">
          <div className="flex flex-col gap-2 border-b border-sky-400/10 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-sky-300">Exact roster stat diff</h4>
              <p className="mt-1 text-[9px] text-neutral-400">
                {preview.mutationPreview.participant.name} · row {preview.mutationPreview.participant.sourceRow}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[8px] font-black uppercase tracking-wider">
              <span className="rounded-full border border-sky-400/20 px-2 py-1 text-sky-300">{statDiff.changedCount} changed</span>
              <span className="rounded-full border border-white/10 px-2 py-1 text-neutral-400">{statDiff.unchangedCount} unchanged</span>
              <span className="rounded-full border border-amber-400/20 px-2 py-1 text-amber-300">{statDiff.blankSourceCount} blank source</span>
              <span className="rounded-full border border-red-400/20 px-2 py-1 text-red-300">{statDiff.invalidCount} invalid</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[9px]">
              <thead className="bg-black/20 text-[8px] font-black uppercase tracking-widest text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2">Before</th>
                  <th className="px-3 py-2">After</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">Review</th>
                </tr>
              </thead>
              <tbody>
                {statDiff.fields.map((field) => (
                  <tr key={field.field} className="border-t border-white/5 text-neutral-300">
                    <th className="px-3 py-2 font-bold text-white">{field.label} <span className="font-mono text-neutral-600">{field.column}</span></th>
                    <td className="px-3 py-2 font-mono">{field.before || 'blank'}</td>
                    <td className="px-3 py-2 font-mono">{field.after || 'blank'}</td>
                    <td className="px-3 py-2">{field.status}</td>
                    <td className="px-3 py-2">{field.status === 'unchanged' ? 'not required' : field.reviewed ? 'checked' : 'missing'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {stateDiff && (
        <section className="mt-4 overflow-hidden rounded-xl border border-violet-400/15 bg-violet-950/10">
          <div className="flex flex-col gap-2 border-b border-violet-400/10 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-300">
                Exact roster and citizen diff
              </h4>
              <p className="mt-1 text-[9px] text-neutral-400">
                {preview.mutationPreview.participant.name} · Citizen Tier{' '}
                {preview.mutationPreview.participant.citizenTier || '—'} · roster
                row {preview.mutationPreview.participant.sourceRow} · citizen row{' '}
                {preview.mutationPreview.participant.citizenSourceRow}
              </p>
            </div>
            <span className="rounded-full border border-violet-400/20 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-violet-200">
              {stateDiff.changedCount} state fields changed
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[9px]">
              <thead className="bg-black/20 text-[8px] font-black uppercase tracking-widest text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Surface</th>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2">Before</th>
                  <th className="px-3 py-2">After</th>
                </tr>
              </thead>
              <tbody>
                {stateDiff.fields.map((field) => (
                  <tr key={field.field} className="border-t border-white/5 text-neutral-300">
                    <td className="px-3 py-2 uppercase text-neutral-500">
                      {field.surface}
                    </td>
                    <th className="px-3 py-2 font-bold text-white">{field.label}</th>
                    <td className="px-3 py-2 font-mono">{field.before || 'blank'}</td>
                    <td className="px-3 py-2 font-mono">{field.after || 'blank'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 border-t border-violet-400/10 p-3 lg:grid-cols-3">
            <div className="rounded-lg border border-white/5 bg-black/20 p-3">
              <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
                LifeHistory append
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-neutral-200">
                {preview.mutationPreview.lifeHistory.line}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 p-3">
              <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
                LifeHistory_Log tag
              </div>
              <p className="mt-2 break-all font-mono text-[8px] leading-relaxed text-neutral-300">
                {preview.mutationPreview.lifeHistory.eventTag}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/20 p-3">
              <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
                Ripple attribution
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-neutral-300">
                {preview.mutationPreview.ripple.effectType} · citizen ·{' '}
                {preview.mutationPreview.participant.popid} · magnitude 1 · duration 1
              </p>
            </div>
          </div>
          {preview.mutationPreview.tradeWarning && (
            <div className="border-t border-amber-400/10 bg-amber-950/10 p-3 text-[9px] text-amber-200">
              {preview.mutationPreview.tradeWarning}
            </div>
          )}
        </section>
      )}
      {(ripple.mutationEffects || []).length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-[9px] font-black uppercase tracking-widest text-violet-300">
            Confirmed mutation surfaces
          </h4>
          <ul className="grid gap-2 lg:grid-cols-3">
            {ripple.mutationEffects.map((item) => (
              <RippleItem key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-[9px] font-black uppercase tracking-widest text-emerald-400">Current consumers</h4>
          <ul className="space-y-2">
            {(ripple.currentConsumers || []).map((item) => <RippleItem key={item.id} item={item} />)}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-[9px] font-black uppercase tracking-widest text-neutral-400">Deferred sibling work</h4>
          <ul className="space-y-2">
            {(ripple.unavailableSiblings || []).map((item) => <RippleItem key={item.id} item={item} unavailable />)}
          </ul>
        </div>
      </div>

      <details className="mt-4 rounded-xl border border-white/5 bg-black/25">
        <summary className="cursor-pointer px-4 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">
          Exact 20-cell row
        </summary>
        <div className="overflow-x-auto border-t border-white/5 p-3">
          <table className="w-full min-w-[620px] text-left text-[10px]">
            <tbody>
              {Object.entries(preview.rowByHeader || {}).map(([header, value]) => (
                <tr key={header} className="border-b border-white/5">
                  <th className="w-48 px-2 py-2 font-bold text-neutral-400">{header}</th>
                  <td className="px-2 py-2 text-neutral-300">{value || <span className="text-neutral-700">blank</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
