'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

type AnalyticsPeriod = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME';

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: 'TODAY', label: 'Today' },
  { value: 'THIS_WEEK', label: 'This Week' },
  { value: 'THIS_MONTH', label: 'This Month' },
  { value: 'ALL_TIME', label: 'All Time' },
];

interface AnalyticsProps {
  data: any;
  platformSettings: {
    commissionRate: number;
    commissionPercent: number;
  };
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  onRefresh: () => void | Promise<void>;
}

export function Analytics({
  data,
  platformSettings,
  period,
  onPeriodChange,
  onRefresh,
}: AnalyticsProps) {
  const tutorAnalytics = data.tutorAnalytics;
  const studentAnalytics = data.studentAnalytics;
  const [commissionPercent, setCommissionPercent] = useState(String(platformSettings.commissionPercent ?? 20));
  const [isSavingCommission, setIsSavingCommission] = useState(false);

  useEffect(() => {
    setCommissionPercent(String(platformSettings.commissionPercent ?? 20));
  }, [platformSettings.commissionPercent]);

  const handleSaveCommission = async () => {
    const numericPercent = Number(commissionPercent);
    if (Number.isNaN(numericPercent) || numericPercent < 0 || numericPercent > 100) {
      toast.error('Commission rate must be between 0 and 100.');
      return;
    }

    try {
      setIsSavingCommission(true);
      const response = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionRate: numericPercent / 100 }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to update commission rate');
      }

      toast.success('Commission rate updated');
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update commission rate');
    } finally {
      setIsSavingCommission(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div>
            <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Analytics Controls</h2>
            <p className="mt-2 text-sm text-navy-400">Adjust the platform commission rate and switch analytics time windows.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="rounded-3xl border border-navy-100 dark:border-navy-500/20 bg-white/70 dark:bg-navy-700/20 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Time Range</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onPeriodChange(option.value)}
                    className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                      period === option.value
                        ? 'bg-gold-400 text-navy-600'
                        : 'bg-navy-50 dark:bg-navy-700/50 text-navy-500 dark:text-cream-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-navy-100 dark:border-navy-500/20 bg-white/70 dark:bg-navy-700/20 p-4 min-w-[280px]">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Platform Commission</div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={commissionPercent}
                  onChange={(event) => setCommissionPercent(event.target.value)}
                  className="input-field w-28"
                />
                <span className="text-sm font-bold text-navy-400">%</span>
                <button
                  onClick={handleSaveCommission}
                  disabled={isSavingCommission}
                  className="btn-primary px-4 py-2 text-xs font-black uppercase tracking-widest"
                >
                  {isSavingCommission ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p className="mt-3 text-xs text-navy-300">
                This rate is used for new payment captures. Current setting: {platformSettings.commissionPercent}%.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6 min-w-0">
          <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Revenue Overview</h2>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-3xl bg-navy-50/80 p-5 dark:bg-navy-700/20">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Gross Revenue</div>
              <div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">
                {formatCurrency(tutorAnalytics.grossRevenue || 0)}
              </div>
            </div>
            <div className="rounded-3xl bg-navy-50/80 p-5 dark:bg-navy-700/20">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Platform Profit</div>
              <div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">
                {formatCurrency(tutorAnalytics.platformProfit || 0)}
              </div>
            </div>
            <div className="rounded-3xl bg-navy-50/80 p-5 dark:bg-navy-700/20">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Tutor Earnings</div>
              <div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">
                {formatCurrency(tutorAnalytics.tutorEarnings || 0)}
              </div>
            </div>
            <div className="rounded-3xl bg-navy-50/80 p-5 dark:bg-navy-700/20">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Commission Setting</div>
              <div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">
                {tutorAnalytics.commissionRate || 0}%
              </div>
              <p className="mt-2 text-xs text-navy-300">
                Realized take rate: {tutorAnalytics.realizedCommissionRate || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Conversions</h2>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-navy-400">Overall Booking Conversion</span>
              <span className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">
                {tutorAnalytics.overallConversionRate || 0}%
              </span>
            </div>
            <div className="w-full bg-navy-100 dark:bg-navy-700/40 h-2 rounded-full overflow-hidden">
              <div className="bg-gold-400 h-full" style={{ width: `${tutorAnalytics.overallConversionRate || 0}%` }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-navy-400">Free to Paid</span>
              <span className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">
                {tutorAnalytics.freeToPaidConversionRate || 0}%
              </span>
            </div>
            <div className="w-full bg-navy-100 dark:bg-navy-700/40 h-2 rounded-full overflow-hidden">
              <div className="bg-navy-600 h-full" style={{ width: `${tutorAnalytics.freeToPaidConversionRate || 0}%` }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-navy-400">Student Retention</span>
              <span className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">
                {studentAnalytics.retention.paidConversionRate}%
              </span>
            </div>
            <div className="w-full bg-navy-100 dark:bg-navy-700/40 h-2 rounded-full overflow-hidden">
              <div className="bg-sage-500 h-full" style={{ width: `${studentAnalytics.retention.paidConversionRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Top Earning Tutors</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-100 dark:border-navy-500/20 text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">
                <th className="px-3 py-3 text-left">Tutor</th>
                <th className="px-3 py-3 text-left">Hours</th>
                <th className="px-3 py-3 text-right">Gross Revenue</th>
                <th className="px-3 py-3 text-right">Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {tutorAnalytics.hoursTaughtPerTutor.map((tutor: any) => (
                <tr key={tutor.tutorProfileId} className="border-b border-navy-50 last:border-0 dark:border-navy-500/20">
                  <td className="px-3 py-4 text-sm font-bold text-navy-600 dark:text-cream-200">{tutor.tutorName}</td>
                  <td className="px-3 py-4 text-sm text-navy-400">{tutor.hoursTaught}h</td>
                  <td className="px-3 py-4 text-sm text-right font-display font-bold text-navy-600 dark:text-cream-200">
                    {formatCurrency(tutor.grossGenerated || 0)}
                  </td>
                  <td className="px-3 py-4 text-sm text-right font-display font-bold text-navy-600 dark:text-cream-200">
                    {tutor.conversionRate || 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
