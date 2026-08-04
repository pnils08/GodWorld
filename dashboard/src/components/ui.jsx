import React from 'react';

/**
 * Shared UI primitives for the GodWorld dashboard.
 * All styling uses the Tailwind v4 design tokens defined in index.css.
 */

/**
 * Card — panel with an optional header row.
 * @param {Object} props
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.right]
 * @param {boolean} [props.pad=true]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function Card({ title, right, pad = true, className = '', children }) {
  return (
    <div className={`bg-panel border border-edge rounded-2xl overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-faint">{title}</h3>
          {right && <div className="flex items-center gap-2">{right}</div>}
        </div>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </div>
  );
}

/**
 * Stat — metric card pattern.
 * @param {Object} props
 * @param {string} props.label
 * @param {React.ReactNode} props.value
 * @param {React.ReactNode} [props.sub]
 * @param {'default'|'good'|'warn'|'bad'} [props.tone='default']
 */
export function Stat({ label, value, sub, tone = 'default' }) {
  const toneClass = {
    default: 'text-text',
    good: 'text-good',
    warn: 'text-warn',
    bad: 'text-bad',
  }[tone] || 'text-text';

  return (
    <div className="bg-panel border border-edge rounded-2xl p-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-faint mb-1">{label}</div>
      <div className={`text-2xl font-semibold tracking-tight ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-dim mt-0.5">{sub}</div>}
    </div>
  );
}

/**
 * Badge — small tone pill.
 * @param {Object} props
 * @param {'default'|'accent'|'good'|'warn'|'bad'} [props.tone='default']
 * @param {React.ReactNode} props.children
 */
export function Badge({ tone = 'default', children }) {
  const toneClass = {
    default: 'border-edge text-dim',
    accent: 'border-accent/30 text-accent',
    good: 'border-good/30 text-good',
    warn: 'border-warn/30 text-warn',
    bad: 'border-bad/30 text-bad',
  }[tone] || 'border-edge text-dim';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wide ${toneClass}`}>
      {children}
    </span>
  );
}

/**
 * SectionHeader — title + optional subtext + right slot.
 * @param {Object} props
 * @param {string} props.title
 * @param {React.ReactNode} [props.sub]
 * @param {React.ReactNode} [props.right]
 */
export function SectionHeader({ title, sub, right }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-widest text-faint">{title}</h3>
        {sub && <p className="text-xs text-dim mt-0.5">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/**
 * TabButton — icon + label button for the fixed bottom navigation.
 * @param {Object} props
 * @param {boolean} [props.active]
 * @param {React.ComponentType<{size?:number}>} props.icon
 * @param {string} props.label
 * @param {() => void} props.onClick
 */
export function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-colors ${active ? 'text-accent bg-accent/10' : 'text-dim hover:text-text'}`}
    >
      <Icon size={20} />
      <span className="hidden sm:block text-[10px] font-medium mt-1 leading-none">{label}</span>
    </button>
  );
}
