'use client';

import { formatCurrency } from '@/lib/utils';
import { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon?: ReactNode;
}

export function StatsCard({ label, value, subtext }: StatsCardProps) {
  return (
    <div className="glass-card p-5">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-300 dark:text-cream-400/40">{label}</div>
      <div className="mt-3 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{value}</div>
      <div className="mt-2 text-xs text-navy-400 dark:text-cream-400/60">{subtext}</div>
    </div>
  );
}

export function AdminStatsCards({ stats }: { stats: any }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatsCard
        label="Total active users"
        value={stats.totalActiveUsers}
        subtext="Students and tutors with active access."
      />
      <StatsCard
        label="Total tutors"
        value={stats.tutorCounts.verified + stats.tutorCounts.pending + stats.tutorCounts.rejected}
        subtext={`Verified ${stats.tutorCounts.verified} / Pending ${stats.tutorCounts.pending} / Rejected ${stats.tutorCounts.rejected}`}
      />
      <StatsCard
        label="Total revenue"
        value={formatCurrency(stats.revenue.gross)}
        subtext={`Net after payouts ${formatCurrency(stats.revenue.netAfterPayouts)}`}
      />
      <StatsCard
        label="Open tickets / reports"
        value={stats.openTicketsAndReports}
        subtext="Flags, disputes, and investigations still open."
      />
    </div>
  );
}
