'use client';

import { formatRelativeTime } from '@/lib/utils';
import { AdminStatsCards } from './StatsCards';

function Badge({ value }: { value: string }) {
  const tone =
    value === 'ACTIVE' || value === 'APPROVED' || value === 'VERIFIED' || value === 'PAID'
      ? 'bg-sage-50 text-sage-700 border-sage-200'
      : value === 'PENDING' || value === 'OPEN' || value === 'UNDER_REVIEW'
        ? 'bg-gold-50 text-gold-700 border-gold-200'
        : value === 'DISMISSED' || value === 'RESOLVED'
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-red-50 text-red-700 border-red-200';

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tone}`}>
      {value.replaceAll('_', ' ')}
    </span>
  );
}

import { toast } from 'react-hot-toast';

export function AdminOverview({ data, onNavigate, onRefresh }: { data: any; onNavigate: (section: string) => void; onRefresh: () => Promise<void> }) {
  const dismiss = async (id: string) => {
    try {
      const resp = await fetch(`/api/admin/actions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: true }),
      });
      if (!resp.ok) throw new Error('Failed to dismiss');
      toast.success('Action dismissed.');
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <AdminStatsCards stats={data.overview.stats} />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="glass-card p-6">
          <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Audit log</h2>
          <p className="mt-1 text-sm text-navy-400 dark:text-cream-400/60">Every decision is accessible here through the admin_actions history.</p>
          
          <div className="mt-6 space-y-3">
            {data.overview.auditLog.map((item: any) => (
              <div key={item.id} className="group relative rounded-3xl border border-navy-100 bg-white/70 p-4 transition-all hover:bg-white dark:border-navy-500/40 dark:bg-navy-600/30">
                <div className="flex flex-wrap items-center gap-2 pr-10">
                  <Badge value={item.actionType} />
                  <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.targetUser?.name || 'Platform record'}</div>
                  <div className="text-xs text-navy-300 dark:text-cream-400/40">{formatRelativeTime(item.createdAt)}</div>
                </div>
                <div className="mt-2 text-sm text-navy-400 dark:text-cream-300/80">{item.reason || 'No explicit reason recorded.'}</div>
                
                <button 
                  onClick={() => dismiss(item.id)}
                  className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-xl bg-navy-50 text-navy-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-sage-100 hover:text-sage-600 dark:bg-navy-700/50"
                  title="Mark as read"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-navy-300 dark:text-cream-400/40">Quick links</h3>
            <div className="mt-4 grid gap-3">
              <button 
                onClick={() => onNavigate('moderation')}
                className="flex items-center justify-between rounded-2xl bg-navy-50/80 p-4 text-left transition-colors hover:bg-navy-100 dark:bg-navy-700/20 dark:hover:bg-navy-700/40"
              >
                <span className="text-sm font-bold text-navy-600 dark:text-cream-200">Pending Reviews</span>
                <span className="rounded-full bg-navy-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {data.moderation.contentFlags.filter((f: any) => f.status === 'OPEN').length}
                </span>
              </button>
              <button 
                onClick={() => onNavigate('verifications')}
                className="flex items-center justify-between rounded-2xl bg-navy-50/80 p-4 text-left transition-colors hover:bg-navy-100 dark:bg-navy-700/20 dark:hover:bg-navy-700/40"
              >
                <span className="text-sm font-bold text-navy-600 dark:text-cream-200">Pending Applications</span>
                <span className="rounded-full bg-navy-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {data.verifications.queue.length}
                </span>
              </button>
              <button 
                onClick={() => onNavigate('reports')}
                className="flex items-center justify-between rounded-2xl bg-navy-50/80 p-4 text-left transition-colors hover:bg-navy-100 dark:bg-navy-700/20 dark:hover:bg-navy-700/40"
              >
                <span className="text-sm font-bold text-navy-600 dark:text-cream-200">Open Disputes</span>
                <span className="rounded-full bg-navy-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {data.reports.queue.filter((r: any) => r.status === 'OPEN' || r.status === 'UNDER_REVIEW').length}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
