import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import {
  confirmSportsEntry,
  createSportsIdempotencyKey,
} from '../lib/sportsApi';

const reasonCopy = {
  sports_write_disabled: {
    title: 'Live append is switched off',
    body: 'The preview is complete, but this server is still operating in preview-only mode.',
  },
  sports_write_not_ready: {
    title: 'Secure browser append is not configured',
    body: 'TLS, the private listener, secure cookie, and write secrets must all be ready before this control unlocks.',
  },
  sports_https_required: {
    title: 'Open the secure dashboard address',
    body: 'Preview works here, but appending requires the configured HTTPS dashboard.',
  },
  sports_origin_invalid: {
    title: 'Open the configured dashboard address',
    body: 'This page is not the approved same-origin entry surface.',
  },
  sports_actor_required: {
    title: 'Sign in again',
    body: 'The preview could not be bound to an authenticated dashboard actor.',
  },
};

function GatedState({ reasonCode }) {
  const copy = reasonCopy[reasonCode] || reasonCopy.sports_write_not_ready;
  return (
    <section className="mt-5 rounded-2xl border border-amber-400/15 bg-amber-950/10 p-4">
      <div className="flex items-start gap-3">
        <LockKeyhole size={17} className="mt-0.5 shrink-0 text-amber-300" />
        <div>
          <h3 className="text-sm font-black text-white">{copy.title}</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">{copy.body}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/15 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-amber-200">
            <ShieldCheck size={11} /> No Sheet write available
          </div>
        </div>
      </div>
    </section>
  );
}

function Receipt({ receipt, onStartAnother }) {
  return (
    <section role="status" className="mt-5 overflow-hidden rounded-2xl border border-emerald-400/25 bg-emerald-950/15">
      <div className="border-b border-emerald-400/10 bg-emerald-400/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-400" />
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">Read-back verified</div>
            <h3 className="mt-1 text-lg font-black text-white">Event added to the Oakland feed</h3>
            <p className="mt-1 text-[10px] text-neutral-400">
              Exactly one 20-cell row was appended and matched its exact-range read-back.
            </p>
          </div>
        </div>
      </div>
      <dl className="grid gap-px bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Cycle', `C${receipt.cycle}`],
          ['Team', receipt.team],
          ['Sheet row', String(receipt.rowNumber)],
          ['Range', receipt.updatedRange],
        ].map(([label, value]) => (
          <div key={label} className="bg-neutral-950 p-4">
            <dt className="text-[8px] font-black uppercase tracking-widest text-neutral-500">{label}</dt>
            <dd className="mt-1 break-all font-mono text-[10px] text-neutral-200">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[9px] text-neutral-500">
          {receipt.replayed ? 'Safe replay returned the original receipt; no duplicate row was added.' : 'The sports desk cache was cleared for the next read.'}
        </p>
        <button
          type="button"
          onClick={onStartAnother}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-[10px] font-black text-white transition hover:bg-white/5"
        >
          <RefreshCcw size={13} /> Enter another event
        </button>
      </div>
    </section>
  );
}

export default function SportsWriteConfirmation({
  preview,
  onEntryWritten,
  onRepreview,
  onStartAnother,
}) {
  const confirmation = preview?.confirmation;
  const [writeKey, setWriteKey] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => createSportsIdempotencyKey()
  );

  useEffect(() => {
    setWriteKey('');
    setAcknowledged(false);
    setSubmitting(false);
    setError(null);
    setReceipt(null);
    setIdempotencyKey(createSportsIdempotencyKey());
  }, [confirmation?.previewToken]);

  if (!preview || !confirmation) return null;
  if (receipt) return <Receipt receipt={receipt} onStartAnother={onStartAnother} />;
  if (!confirmation.available) {
    return <GatedState reasonCode={confirmation.reasonCode} />;
  }

  const requiresFreshPreview = [
    'sports_preview_expired',
    'sports_source_changed',
    'sports_preview_changed',
  ].includes(error?.code);

  async function appendEvent(event) {
    event.preventDefault();
    if (!acknowledged || !writeKey || submitting) return;
    const capability = writeKey;
    setWriteKey('');
    setSubmitting(true);
    setError(null);
    try {
      const response = await confirmSportsEntry({
        previewToken: confirmation.previewToken,
        csrfToken: confirmation.csrfToken,
        capability,
        idempotencyKey,
        confirmation: confirmation.confirmationPhrase,
      });
      setReceipt(response.data);
      onEntryWritten?.(response.data);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-950/10 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <LockKeyhole size={18} className="mt-0.5 shrink-0 text-sky-300" />
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-300">Final confirmation</div>
            <h3 className="mt-1 text-base font-black text-white">Append this event?</h3>
            <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-neutral-400">
              This is the only step that can change the Sheet. The server will re-read the feed and rosters, append one row, and compare all 20 cells before returning a receipt.
            </p>
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-sky-300/15 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-sky-200">
          15-minute preview
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          ['Cycle', `C${preview.rowByHeader?.Cycle || '—'}`],
          ['Team', preview.team?.label || preview.rowByHeader?.TeamsUsed || '—'],
          ['Event', preview.rowByHeader?.EventType || '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/5 bg-black/25 p-3">
            <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">{label}</div>
            <div className="mt-1 text-xs font-black text-white">{value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-950/20 p-3">
          <div className="flex items-start gap-2 text-xs text-red-200">
            <TriangleAlert size={15} className="mt-0.5 shrink-0" />
            <span>{error.message}</span>
          </div>
          {requiresFreshPreview && (
            <button
              type="button"
              onClick={onRepreview}
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-300/20 px-3 text-[9px] font-black text-white"
            >
              <RefreshCcw size={12} /> Build a fresh preview
            </button>
          )}
        </div>
      )}

      <form onSubmit={appendEvent} className="mt-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-neutral-300">
            <KeyRound size={12} /> Sports write key
          </span>
          <input
            type="password"
            value={writeKey}
            onChange={(event) => setWriteKey(event.target.value)}
            autoComplete="off"
            spellCheck="false"
            placeholder="Enter only for this confirmation"
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none transition placeholder:text-neutral-700 focus:border-sky-400/60"
          />
          <span className="mt-1 block text-[9px] text-neutral-500">
            The key is sent once for this request, cleared immediately, and never returned by the API.
          </span>
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/7 bg-black/20 p-3">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-0.5 size-4 accent-sky-400"
          />
          <span className="text-[10px] leading-relaxed text-neutral-300">
            I reviewed the exact row and understand this appends one canon-bearing event to <span className="font-mono text-white">Oakland_Sports_Feed</span>.
          </span>
        </label>

        <button
          type="submit"
          disabled={!writeKey || !acknowledged || submitting}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-300 px-5 text-xs font-black text-sky-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          <ShieldCheck size={15} />
          {submitting ? 'Appending and verifying…' : 'Append one verified row'}
        </button>
      </form>
    </section>
  );
}
