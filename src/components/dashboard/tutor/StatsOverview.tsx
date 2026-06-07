'use client';

import { Clock, Star, CheckCircle, DollarSign } from '@/components/ui/icons';

interface StatsData {
  totalHours: number;
  avgRating: number;
  totalReviews: number;
  totalSessions: number;
  totalEarnings: number;
}

export default function StatsOverview({ stats }: { stats: StatsData }) {
  const metrics = [
    {
      label: 'Total Hours Taught',
      value: stats.totalHours.toString(),
      icon: <Clock size={20} />,
      color: 'bg-blue-500',
    },
    {
      label: 'Overall Rating',
      value: `${stats.avgRating} ★`,
      subValue: `(${stats.totalReviews} reviews)`,
      icon: <Star size={20} />,
      color: 'bg-gold-400',
    },
    {
      label: 'Sessions Completed',
      value: stats.totalSessions.toString(),
      icon: <CheckCircle size={20} />,
      color: 'bg-sage-500',
    },
    {
      label: 'Total Earnings',
      value: `$${stats.totalEarnings.toLocaleString()}`,
      subValue: 'Net after fees',
      icon: <DollarSign size={20} />,
      color: 'bg-navy-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((m, i) => (
        <div key={i} className="glass-card p-5 relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-bl-[100px] z-0" />

          <div className="relative z-10">
            <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
              {m.icon}
            </div>

            <p className="label-xs text-navy-300 dark:text-cream-400/60 mb-1">{m.label}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">{m.value}</h3>
              {m.subValue && <span className="text-[10px] font-bold text-navy-300 dark:text-cream-400/40">{m.subValue}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
