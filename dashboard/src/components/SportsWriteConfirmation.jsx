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
  const isMutation = Boolean(receipt.mutationAction);
  return (
    <section role="status" className="mt-5 overflow-hidden rounded-2xl border border-emerald-400/25 bg-emerald-950/15">
      <div className="border-b border-emerald-400/10 bg-emerald-400/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-400" />
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">Read-back verified</div>
            <h3 className="mt-1 text-lg font-black text-white">
              {isMutation
                ? 'Event and mutation verified'
                : 'Event added to the Oakland feed'}
            </h3>
            <p className="mt-1 text-[10px] text-neutral-400">
              {isMutation
                ? `${receipt.updatedRanges?.length || 1} affected range${receipt.updatedRanges?.length === 1 ? '' : 's'} matched exact read-back.`
                : 'Exactly one 20-cell row was appended and matched its exact-range read-back.'}
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

// S357 (Mike-approved): the browser may remember the write key AFTER its
// first accepted write — single-operator tool behind dashboard auth +
// Tailscale; the key never leaves this machine. A rejected key is never
// stored. "Forget key" clears it.
const WRITE_KEY_STORAGE = 'gw-sports-write-key';
function loadStoredWriteKey() {
  try { return window.localStorage.getItem(WRITE_KEY_STORAGE) || ''; } catch { return ''; }
}
function storeWriteKey(value) {
  try { window.localStorage.setItem(WRITE_KEY_STORAGE, value); } catch { /* storage unavailable — key stays session-only */ }
}
function forgetStoredWriteKey() {
  try { window.localStorage.removeItem(WRITE_KEY_STORAGE); } catch { /* nothing stored */ }
}

export default function SportsWriteConfirmation({
  preview,
  onEntryWritten,
  onRepreview,
  onStartAnother,
}) {
  const confirmation = preview?.confirmation;
  const statDiff = preview?.mutationPreview?.statDiff;
  const stateDiff = preview?.mutationPreview?.stateDiff;
  const [writeKey, setWriteKey] = useState(loadStoredWriteKey);
  const [keyRemembered, setKeyRemembered] = useState(() => Boolean(loadStoredWriteKey()));
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    setWriteKey(loadStoredWriteKey());
    setAcknowledged(false);
    setSubmitting(false);
    setError(null);
    setReceipt(null);
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
        confirmation: confirmation.confirmationPhrase,
      });
      storeWriteKey(capability); // accepted by the server — safe to remember
      setKeyRemembered(true);
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
            <h3 className="mt-1 text-base font-black text-white">
              {statDiff
                ? 'Append the event and update this stat line?'
                : stateDiff
                  ? 'Apply this roster, state, life, and Ripple event?'
                  : 'Append this event?'}
            </h3>
            <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-neutral-400">
              {statDiff
                ? `This is the only step that can change the Sheets. The server will re-read every source, append one feed row, update ${statDiff.changedCount} reviewed roster field${statDiff.changedCount === 1 ? '' : 's'}, and verify exact read-back.`
                : stateDiff
                  ? 'This is the only step that can change the Sheets. The server will re-read the feed, roster, citizen, LifeHistory log, and Ripple ledger; apply one atomic batch; then verify every affected surface.'
                  : 'This is the only step that can change the Sheet. The server will re-read the feed and rosters, append one row, and compare all 20 cells before returning a receipt.'}
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

      {statDiff && (
        <div className="mt-4 rounded-xl border border-sky-300/15 bg-black/20 p-3">
          <div className="text-[8px] font-black uppercase tracking-widest text-sky-300">Reviewed roster changes</div>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {statDiff.fields
              .filter((field) => field.status !== 'unchanged')
              .map((field) => (
                <li key={field.field} className="rounded-lg border border-white/5 px-2.5 py-2 font-mono text-[9px] text-neutral-300">
                  <span className="font-bold text-white">{field.label}</span> {field.before || 'blank'} → {field.after}
                </li>
              ))}
          </ul>
        </div>
      )}
      {stateDiff && (
        <div className="mt-4 rounded-xl border border-violet-300/15 bg-black/20 p-3">
          <div className="text-[8px] font-black uppercase tracking-widest text-violet-300">
            Reviewed engine.77 operation
          </div>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {stateDiff.fields.map((field) => (
              <li key={field.field} className="rounded-lg border border-white/5 px-2.5 py-2 font-mono text-[9px] text-neutral-300">
                <span className="font-bold text-white">{field.label}</span>{' '}
                {field.before || 'blank'} → {field.after || 'blank'}
              </li>
            ))}
          </ul>
          <div className="mt-2 rounded-lg border border-white/5 p-2.5 text-[9px] leading-relaxed text-neutral-300">
            <span className="font-black text-white">LifeHistory:</span>{' '}
            {preview.mutationPreview.lifeHistory.line}
          </div>
          {preview.mutationPreview.tradeWarning && (
            <div className="mt-2 rounded-lg border border-amber-400/15 bg-amber-950/10 p-2.5 text-[9px] text-amber-200">
              {preview.mutationPreview.tradeWarning}
            </div>
          )}
        </div>
      )}

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
          <span className="mt-1 flex items-center gap-2 text-[9px] text-neutral-500">
            {keyRemembered
              ? 'Key remembered in this browser after its first accepted write.'
              : 'Sent once per request, never returned by the API; remembered in this browser after its first accepted write.'}
            {keyRemembered && (
              <button
                type="button"
                onClick={() => { forgetStoredWriteKey(); setKeyRemembered(false); setWriteKey(''); }}
                className="rounded border border-white/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-neutral-400 transition hover:border-red-300/30 hover:text-red-200"
              >
                Forget key
              </button>
            )}
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
            {statDiff
              ? <>I reviewed the exact feed row and every changed roster field, and understand they will be applied together as one canon-bearing operation.</>
              : stateDiff
                ? <>I reviewed the exact feed row, roster and citizen transitions, deterministic LifeHistory text, log tag, and Ripple attribution, and understand they will be applied together.</>
                : <>I reviewed the exact row and understand this appends one canon-bearing event to <span className="font-mono text-white">Oakland_Sports_Feed</span>.</>}
          </span>
        </label>

        <button
          type="submit"
          disabled={!writeKey || !acknowledged || submitting}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-300 px-5 text-xs font-black text-sky-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          <ShieldCheck size={15} />
          {submitting
            ? 'Applying and verifying…'
            : statDiff
              ? 'Apply one verified stat event'
              : stateDiff
                ? 'Apply one verified roster event'
                : 'Append one verified row'}
        </button>
      </form>
    </section>
  );
}
