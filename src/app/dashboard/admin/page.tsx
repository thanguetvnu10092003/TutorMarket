'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';

import { AdminOverview } from '@/components/admin/AdminOverview';
import { Moderation } from '@/components/admin/Moderation';
import { Analytics } from '@/components/admin/Analytics';
import { Verifications } from '@/components/admin/Verifications';
import { Reports } from '@/components/admin/Reports';
import { LayoutDashboard, Users, ShieldCheck, BarChart2, Settings, Flag, Award } from '@/components/ui/icons';

type DashboardData = any;
type AnalyticsPeriod = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME';

const adminNav = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'verifications', label: 'Verifications', icon: <Award size={18} /> },
  { id: 'reports', label: 'Reports', icon: <Flag size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={18} /> },
  { id: 'moderation', label: 'Moderation', icon: <ShieldCheck size={18} /> },
] as const;

type ActiveSection = (typeof adminNav)[number]['id'];

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('ALL_TIME');

  const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json());

  const { data: dashboardJson, mutate: mutateDashboard } = useSWR(
    `/api/admin/dashboard?period=${analyticsPeriod}`,
    fetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  );
  const dashboard = dashboardJson?.data ?? null;
  const isLoading = !dashboardJson;

  const handleRefresh = async () => { await mutateDashboard(); };

  if (isLoading || !dashboard) {
    return (
      <div className="min-h-screen bg-cream-200 pt-28 dark:bg-navy-600">
        <div className="page-container flex min-h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600">
      <div className="flex gap-8 min-h-[calc(100vh-6rem)] pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 hidden lg:block">
          <nav className="glass-card p-2 sticky top-24 space-y-1">
            <div className="rounded-[20px] bg-gradient-to-br from-navy-600 via-navy-600 to-navy-500 p-4 text-cream-200 text-center mb-2">
              <h1 className="text-lg font-display font-bold">Control center</h1>
              <p className="mt-1 label-xs text-cream-300/75">Platform Management{session?.user?.name ? ` — ${session.user.name}` : ''}</p>
            </div>
            {adminNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeSection === item.id
                    ? 'bg-navy-600 text-white shadow-md'
                    : 'text-navy-400 dark:text-cream-400/60 hover:bg-navy-50 dark:hover:bg-navy-700/30 hover:text-navy-600 dark:hover:text-cream-200'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {/* Mobile tab bar — shown only when sidebar is hidden */}
          <div className="flex overflow-x-auto gap-1 pb-2 lg:hidden mb-6">
            {adminNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`px-4 py-2 rounded-lg label-xs whitespace-nowrap flex items-center gap-1.5 ${
                  activeSection === item.id
                    ? 'bg-navy-600 text-white'
                    : 'text-navy-400 hover:bg-navy-50 dark:hover:bg-navy-700/30'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          {activeSection === 'overview' && (
            <AdminOverview
              data={dashboard}
              onNavigate={(section: any) => setActiveSection(section)}
              onRefresh={handleRefresh}
            />
          )}
          {activeSection === 'moderation' && <Moderation data={dashboard.moderation} onRefresh={handleRefresh} />}
          {activeSection === 'analytics' && (
            <Analytics
              data={dashboard.analytics}
              platformSettings={dashboard.platformSettings}
              period={analyticsPeriod}
              onPeriodChange={setAnalyticsPeriod}
              onRefresh={handleRefresh}
            />
          )}
          {activeSection === 'verifications' && <Verifications data={dashboard.verifications} onRefresh={handleRefresh} />}
          {activeSection === 'reports' && <Reports data={dashboard.reports} onRefresh={handleRefresh} />}
        </main>
      </div>
    </div>
  );
}
