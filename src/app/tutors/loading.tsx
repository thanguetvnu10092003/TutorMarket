export default function TutorsLoadingPage() {
  return (
    <div className="min-h-screen bg-cream-50/50 dark:bg-navy-900 pt-32 pb-16 transition-colors duration-500">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 rounded-2xl bg-white dark:bg-navy-800 animate-pulse border border-navy-100/50 dark:border-navy-500/10" />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 w-28 rounded-xl bg-white dark:bg-navy-800 animate-pulse border border-navy-100/50 dark:border-navy-500/10" />
            ))}
          </div>
          <div className="h-8 w-56 rounded-xl bg-white dark:bg-navy-800 animate-pulse border border-navy-100/50 dark:border-navy-500/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start mt-8">
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="glass-card h-64 animate-pulse rounded-[32px] bg-white dark:bg-navy-800" />
            ))}
          </div>
          <aside className="hidden lg:block">
            <div className="glass-card h-[420px] animate-pulse rounded-[32px] bg-white dark:bg-navy-800" />
          </aside>
        </div>
      </div>
    </div>
  );
}
