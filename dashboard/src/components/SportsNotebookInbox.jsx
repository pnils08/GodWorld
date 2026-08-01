import React from 'react';
import { BookOpen, ExternalLink, FileWarning, PenLine } from 'lucide-react';

function shortAnswer(value) {
  const text = String(value || '').trim();
  return text.length > 360 ? `${text.slice(0, 357)}…` : text;
}

export default function SportsNotebookInbox({ items, warnings, loading, error, onRetry, onStartDraft }) {
  return (
    <section className="mt-9 rounded-3xl border border-amber-400/20 bg-amber-950/10 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">
            <FileWarning size={13} /> Listening brief
          </div>
          <h2 className="mt-1 text-lg font-black text-white">Notebook Daily Inbox</h2>
          <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-neutral-400">
            Local completed artifacts only. These items are research prompts, never established world facts.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[9px] font-black tracking-wider text-amber-300">
          NOT CANON
        </span>
      </div>

      {loading && <div className="mt-5 text-xs text-neutral-400">Reading completed local artifacts…</div>}
      {error && (
        <div className="mt-5 rounded-xl border border-red-400/20 bg-red-950/20 p-4">
          <p className="text-xs text-red-300">{error}</p>
          <button type="button" onClick={onRetry} className="mt-3 text-[10px] font-black uppercase tracking-widest text-white">Retry inbox</button>
        </div>
      )}
      {!loading && !error && items?.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-amber-300/15 p-5 text-xs text-neutral-400">
          No complete daily brief artifact is available locally.
        </div>
      )}
      {!loading && !error && warnings?.length > 0 && (
        <p className="mt-4 text-[10px] text-amber-300">
          {warnings.length} incomplete or unsafe local artifact{warnings.length === 1 ? ' was' : 's were'} rejected.
        </p>
      )}
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {(items || []).map((item) => (
          <article key={`${item.cycle}-${item.generatedAt}`} className="rounded-2xl border border-amber-300/10 bg-black/35 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300"><BookOpen size={12} />C{item.cycle}</span>
              <span className="text-[9px] text-neutral-400">{item.citationCount || 0} citations</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-300">{shortAnswer(item.answer) || 'Brief answer is empty.'}</p>
            <p className="mt-3 text-[9px] font-mono text-neutral-400">{new Date(item.generatedAt).toLocaleString()}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onStartDraft(item)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-300 px-3 text-[10px] font-black text-black"
              >
                <PenLine size={13} /> Start blank draft
              </button>
              {item.driveLink && (
                <a
                  href={item.driveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-bold text-neutral-300"
                >
                  <ExternalLink size={13} /> Open source
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
