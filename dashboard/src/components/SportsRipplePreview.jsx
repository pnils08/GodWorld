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
  return (
    <section aria-live="polite" className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-950/10 p-4">
      <div className="flex items-center gap-2">
        <GitBranch size={15} className="text-emerald-400" />
        <h3 className="text-sm font-black text-white">Ripple Preview</h3>
        <span className="ml-auto rounded-full border border-white/10 px-2 py-1 text-[8px] font-black text-neutral-400">NO WRITE</span>
      </div>
      <p className="mt-2 text-[10px] text-neutral-400">This is a deterministic compatibility projection. It has not changed a Sheet, roster, citizen, or newsroom artifact.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-[9px] font-black uppercase tracking-widest text-emerald-400">Current consumers</h4>
          <ul className="space-y-2">
            {(ripple.currentConsumers || []).map((item) => <RippleItem key={item.id} item={item} />)}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-[9px] font-black uppercase tracking-widest text-neutral-400">Unavailable sibling work</h4>
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
