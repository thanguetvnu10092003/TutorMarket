'use client';

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
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      color: 'bg-blue-500',
    },
    {
      label: 'Overall Rating',
      value: `${stats.avgRating} ★`,
      subValue: `(${stats.totalReviews} reviews)`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ),
      color: 'bg-gold-400',
    },
    {
      label: 'Sessions Completed',
      value: stats.totalSessions.toString(),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      color: 'bg-sage-500',
    },
    {
      label: 'Total Earnings',
      value: `$${stats.totalEarnings.toLocaleString()}`,
      subValue: 'Net after fees',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
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
            
            <p className="text-[10px] font-black text-navy-300 dark:text-cream-400/60 uppercase tracking-widest mb-1">{m.label}</p>
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
