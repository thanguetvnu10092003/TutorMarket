'use client';

import { useMemo, useState } from 'react';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/utils';
import { toast } from 'react-hot-toast';

function Badge({ value }: { value: string }) {
  const tone =
    value === 'OPEN' || value === 'UNDER_REVIEW'
      ? 'bg-gold-50 text-gold-700 border-gold-200'
      : value === 'RESOLVED' || value === 'REFUNDED'
        ? 'bg-sage-50 text-sage-700 border-sage-200'
        : value === 'DISMISSED'
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-navy-50 text-navy-700 border-navy-200';

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tone}`}>
      {value.replaceAll('_', ' ')}
    </span>
  );
}

export function Reports({ data, onRefresh }: { data: any; onRefresh: () => Promise<void> }) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(data.queue[0]?.id || null);
  const [form, setForm] = useState({
    note: '',
    amount: '',
    duration: '7d',
    target: 'reported',
  });

  const selectedReport = useMemo(
    () => data.queue.find((report: any) => report.id === selectedReportId) ?? null,
    [data.queue, selectedReportId]
  );

  async function runAction(action: string) {
    if (!selectedReport) {
      return;
    }

    try {
      const targetUserId = form.target === 'reporter' ? selectedReport.reporter.id : selectedReport.reportedParty.id;
      const response = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          note: form.note,
          amount: form.amount ? Number(form.amount) : undefined,
          duration: form.duration,
          targetUserId,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Action failed');
      }

      toast.success('Decision recorded.');
      setForm((current) => ({ ...current, amount: '', note: '' }));
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="glass-card p-6">
        <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Reports queue</h2>
        <div className="mt-6 space-y-3">
          {data.queue.map((report: any) => (
            <button
              key={report.id}
              onClick={() => setSelectedReportId(report.id)}
              className={`w-full rounded-3xl border p-4 text-left transition-all ${
                selectedReportId === report.id
                  ? 'border-gold-400 bg-gold-400/10'
                  : 'border-navy-100 bg-white/70 hover:bg-white dark:border-navy-500/40 dark:bg-navy-600/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <Badge value={report.type} />
                <span className="text-[10px] text-navy-300">{formatRelativeTime(report.createdAt)}</span>
              </div>
              <div className="mt-3 text-sm font-bold text-navy-600 dark:text-cream-200">{report.reporter.name}</div>
              <div className="mt-1 text-xs text-navy-400 dark:text-cream-400/60 line-clamp-2">{report.description}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">
                  Against {report.reportedParty.name}
                </span>
                <Badge value={report.status} />
              </div>
            </button>
          ))}
          {data.queue.length === 0 && (
            <div className="py-10 text-center text-sm text-navy-300">No open reports.</div>
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        {selectedReport ? (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Report Investigation</h2>
                <div className="mt-1 text-sm text-navy-400 dark:text-cream-400/60">Ticket #{selectedReport.id.slice(-8)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge value={selectedReport.type} />
                <Badge value={selectedReport.status} />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl bg-navy-50/80 p-5 dark:bg-navy-700/20">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Reporter</div>
                <div className="mt-3 text-sm font-bold text-navy-600 dark:text-cream-200">{selectedReport.reporter.name}</div>
                <div className="mt-1 text-xs text-navy-400 dark:text-cream-400/60">{selectedReport.reporter.email}</div>
              </div>
              <div className="rounded-3xl bg-navy-50/80 p-5 dark:bg-navy-700/20">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Reported user</div>
                <div className="mt-3 text-sm font-bold text-navy-600 dark:text-cream-200">{selectedReport.reportedParty.name}</div>
                <div className="mt-1 text-xs text-navy-400 dark:text-cream-400/60">{selectedReport.reportedParty.email}</div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl bg-white/70 p-5 border border-navy-100 dark:border-navy-500/20 dark:bg-navy-600/20">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Session details</div>
                {selectedReport.booking ? (
                  <div className="mt-3 space-y-2 text-sm text-navy-500 dark:text-cream-300/80">
                    <div><span className="font-bold text-navy-600 dark:text-cream-200">Subject:</span> {selectedReport.booking.subject.replaceAll('_', ' ')}</div>
                    <div><span className="font-bold text-navy-600 dark:text-cream-200">When:</span> {formatDateTime(selectedReport.booking.date)}</div>
                    <div><span className="font-bold text-navy-600 dark:text-cream-200">Duration:</span> {selectedReport.booking.durationMinutes} minutes</div>
                    <div><span className="font-bold text-navy-600 dark:text-cream-200">Amount:</span> {formatCurrency(selectedReport.booking.amountPaid || 0)}</div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-navy-400 dark:text-cream-400/60">No session attached.</p>
                )}
              </div>
              <div className="rounded-3xl bg-white/70 p-5 border border-navy-100 dark:border-navy-500/20 dark:bg-navy-600/20">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Description</div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-navy-600 dark:text-cream-200">{selectedReport.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-navy-400">Resolution tools</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <textarea
                    value={form.note}
                    onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Admin notes or dismissal reason..."
                    className="h-36 w-full rounded-2xl border border-navy-100 bg-white p-4 text-sm dark:border-navy-500/40 dark:bg-navy-600/30"
                  />
                  <select
                    value={form.target}
                    onChange={(event) => setForm((current) => ({ ...current, target: event.target.value }))}
                    className="w-full rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs font-bold dark:border-navy-500/40 dark:bg-navy-600/30"
                  >
                    <option value="reported">Apply moderation to reported party</option>
                    <option value="reporter">Apply moderation to reporter</option>
                  </select>
                  <select
                    value={form.duration}
                    onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))}
                    className="w-full rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs font-bold dark:border-navy-500/40 dark:bg-navy-600/30"
                  >
                    <option value="1d">Suspend 1 day</option>
                    <option value="3d">Suspend 3 days</option>
                    <option value="7d">Suspend 7 days</option>
                    <option value="30d">Suspend 30 days</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-navy-100 p-4 dark:border-navy-500/40">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Refund amount</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-navy-400">$</span>
                      <input
                        type="number"
                        value={form.amount}
                        onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                        placeholder="Leave empty for full refund"
                        className="w-full bg-transparent text-xl font-bold text-navy-600 focus:outline-none dark:text-cream-200"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => void runAction('DISMISS_REPORT')} className="rounded-xl border border-navy-100 py-3 text-xs font-black dark:border-navy-500/40 hover:bg-navy-50 transition-colors">Dismiss</button>
                    <button onClick={() => void runAction('RESOLVE_REPORT')} className="rounded-xl bg-navy-600 py-3 text-xs font-black text-white hover:bg-navy-700 transition-colors">Resolve</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => void runAction(form.amount ? 'ISSUE_PARTIAL_REFUND' : 'ISSUE_FULL_REFUND')} className="rounded-xl bg-gold-400 py-3 text-xs font-black text-navy-600 hover:bg-gold-500 transition-colors">
                      {form.amount ? 'Partial Refund' : 'Full Refund'}
                    </button>
                    <button onClick={() => void runAction('WARN_USER')} className="rounded-xl bg-blue-500 py-3 text-xs font-black text-white hover:bg-blue-600 transition-colors">Warn User</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => void runAction('SUSPEND_ACCOUNT')} className="rounded-xl bg-red-500 py-3 text-xs font-black text-white hover:bg-red-600 transition-colors">Suspend</button>
                    <button onClick={() => void runAction('PERMANENT_BAN_ACCOUNT')} className="rounded-xl border border-red-300 py-3 text-xs font-black text-red-600 hover:bg-red-50 transition-colors">Ban</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-sm text-navy-300 italic">Select a report from the queue to start investigation.</div>
        )}
      </div>
    </div>
  );
}
