'use client';

import { formatCurrency } from '@/lib/utils';

export function Analytics({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Revenue overview</h2>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-3xl bg-navy-50/80 p-5 dark:bg-navy-700/20">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Gross revenue</div>
              <div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{formatCurrency(data.tutorAnalytics.gmv)}</div>
            </div>
            <div className="rounded-3xl bg-navy-50/80 p-5 dark:bg-navy-700/20">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">Platform Profit</div>
              <div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{formatCurrency(data.tutorAnalytics.gmv * (data.tutorAnalytics.takeRate / 100))}</div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Conversions</h2>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-navy-400">Free to Paid</span>
              <span className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">{data.tutorAnalytics.freeToPaidConversionRate}%</span>
            </div>
            <div className="w-full bg-navy-100 h-2 rounded-full overflow-hidden">
               <div className="bg-gold-400 h-full" style={{ width: `${data.tutorAnalytics.freeToPaidConversionRate}%` }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-navy-400">Student Retention</span>
              <span className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">{data.studentAnalytics.retention.paidConversionRate}%</span>
            </div>
            <div className="w-full bg-navy-100 h-2 rounded-full overflow-hidden">
               <div className="bg-navy-600 h-full" style={{ width: `${data.studentAnalytics.retention.paidConversionRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Top earning tutors</h2>
        <div className="mt-6 overflow-x-auto">
           <table className="w-full">
             <thead>
               <tr className="border-b border-navy-100 text-[10px] font-black uppercase tracking-[0.16em] text-navy-300">
                 <th className="px-3 py-3 text-left">Tutor</th>
                 <th className="px-3 py-3 text-left">Hours Taught</th>
                 <th className="px-3 py-3 text-right">Revenue Generated</th>
               </tr>
             </thead>
             <tbody>
               {data.tutorAnalytics.hoursTaughtPerTutor.map((tutor: any) => (
                 <tr key={tutor.id} className="border-b border-navy-50 last:border-0 dark:border-navy-500/20">
                    <td className="px-3 py-4 text-sm font-bold text-navy-600 dark:text-cream-200">{tutor.tutorName}</td>
                    <td className="px-3 py-4 text-sm text-navy-400">{tutor.hoursTaught}h</td>
                    <td className="px-3 py-4 text-sm text-right font-display font-bold text-navy-600 dark:text-cream-200">{formatCurrency(tutor.grossGenerated || 0)}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
