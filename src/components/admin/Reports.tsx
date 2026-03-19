'use client';

import { useState, useMemo } from 'react';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { toast } from 'react-hot-toast';

function Badge({ value }: { value: string }) {
  const tone =
    value === 'OPEN' || value === 'UNDER_REVIEW'
      ? 'bg-gold-50 text-gold-700 border-gold-200'
      : value === 'RESOLVED' || value === 'REFUNDED'
        ? 'bg-sage-50 text-sage-700 border-sage-200'
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
    () => data.queue.find((r: any) => r.id === selectedReportId) ?? null,
    [data.queue, selectedReportId]
  );

  const runAction = async (action: string) => {
    if (!selectedReport) return;
    try {
      const targetUserId = form.target === 'reporter' ? selectedReport.reporter.id : selectedReport.reportedParty.id;
      const resp = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note: form.note,
          amount: form.amount ? Number(form.amount) : undefined,
          duration: form.duration,
          targetUserId,
        }),
      });
      if (!resp.ok) throw new Error('Action failed');
      toast.success('Decision recorded.');
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div className="glass-card p-6">
        <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Dispute queue</h2>
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
              <div className="flex items-center justify-between">
                <Badge value={report.type} />
                <span className="text-[10px] text-navy-300">{formatRelativeTime(report.createdAt)}</span>
              </div>
              <div className="mt-3 text-sm font-bold text-navy-600 dark:text-cream-200">From {report.reporter.name}</div>
              <div className="mt-1 text-xs text-navy-400 dark:text-cream-400/60 line-clamp-1">{report.reason}</div>
            </button>
          ))}
          {data.queue.length === 0 && (
            <div className="py-10 text-center text-sm text-navy-300">No open disputes.</div>
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        {selectedReport ? (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Investigation</h2>
                <div className="mt-1 text-sm text-navy-400 dark:text-cream-400/60">Ticket #{selectedReport.id.slice(-8)}</div>
              </div>
              <Badge value={selectedReport.status} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl bg-navy-50/80 p-5 dark:bg-navy-700/20">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Description</div>
                <div className="mt-2 text-sm text-navy-600 dark:text-cream-200 leading-relaxed">{selectedReport.reason}</div>
              </div>
              <div className="rounded-3xl bg-navy-50/80 p-5 dark:bg-navy-700/20">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Involved parties</div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-navy-400">Reporter:</span>
                    <span className="font-bold text-navy-600 dark:text-cream-200">{selectedReport.reporter.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-navy-400">Reported party:</span>
                    <span className="font-bold text-navy-600 dark:text-cream-200">{selectedReport.reportedParty.name}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-navy-400">Resolution tools</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <textarea 
                    value={form.note}
                    onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="Admin investigation notes..."
                    className="w-full h-32 rounded-2xl border border-navy-100 bg-white p-4 text-sm dark:border-navy-500/40 dark:bg-navy-600/30"
                  />
                  <div className="flex gap-2">
                    <select value={form.target} onChange={(e) => setForm(f => ({ ...f, target: e.target.value }))} className="flex-1 rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs font-bold dark:border-navy-500/40 dark:bg-navy-600/30">
                      <option value="reported">Apply to reported party</option>
                      <option value="reporter">Apply to reporter</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-navy-100 p-4 dark:border-navy-500/40">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Refund amount</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-navy-400">$</span>
                      <input 
                        type="number"
                        value={form.amount}
                        onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                        placeholder="Max 45.00"
                        className="w-full bg-transparent text-xl font-bold text-navy-600 dark:text-cream-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => runAction('DISMISS')} className="rounded-xl border border-navy-100 py-3 text-xs font-black dark:border-navy-500/40 hover:bg-navy-50 transition-colors">Dismiss</button>
                    <button onClick={() => runAction('RESOLVE')} className="rounded-xl bg-navy-600 py-3 text-xs font-black text-white hover:bg-navy-700 transition-colors">Resolve</button>
                  </div>
                  <button onClick={() => runAction('REFUND')} className="w-full rounded-xl bg-gold-400 py-3 text-xs font-black text-navy-600 hover:bg-gold-500 transition-colors">Issue Refund</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-sm text-navy-300 italic">Select a dispute from the queue to start investigation.</div>
        )}
      </div>
    </div>
  );
}
