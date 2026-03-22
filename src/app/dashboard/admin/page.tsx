'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

import { AdminOverview } from '@/components/admin/AdminOverview';
import { Moderation } from '@/components/admin/Moderation';
import { Analytics } from '@/components/admin/Analytics';
import { Verifications } from '@/components/admin/Verifications';
import { Reports } from '@/components/admin/Reports';

type DashboardData = any;
type AnalyticsPeriod = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME';

const sections = [
  { id: 'overview', label: 'Overview Dashboard' },
  { id: 'moderation', label: 'Content & User Moderation' },
  { id: 'analytics', label: 'Analytics & Growth' },
  { id: 'verifications', label: 'Review Tutor Applications' },
  { id: 'reports', label: 'Reports & Disputes' },
] as const;

async function parseResponse(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]['id']>('overview');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('ALL_TIME');

  const fetchDashboard = async (period = analyticsPeriod) => {
    try {
      const response = await fetch(`/api/admin/dashboard?t=${Date.now()}&period=${period}`, { cache: 'no-store' });
      const json = await parseResponse(response);
      setDashboard(json.data);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load admin dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, [analyticsPeriod]);

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
    <div className="min-h-screen bg-cream-200 pt-24 pb-16 dark:bg-navy-600 md:pt-28">
      <div className="page-container grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="glass-card h-fit p-5 lg:sticky lg:top-28">
          <div className="rounded-[28px] bg-gradient-to-br from-navy-600 via-navy-600 to-navy-500 p-5 text-cream-200 text-center">
            <h1 className="text-2xl font-display font-bold">Control center</h1>
            <p className="mt-2 text-xs text-cream-300/75">Platform Management {session?.user?.name ? `- ${session.user.name}` : ''}</p>
          </div>
          <div className="mt-5 grid gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-all ${
                  activeSection === section.id
                    ? 'border-gold-400 bg-gold-400 text-navy-600'
                    : 'border-navy-100 bg-white/70 text-navy-500 dark:border-navy-500/40 dark:bg-navy-600/30'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0">
          {activeSection === 'overview' && (
            <AdminOverview 
              data={dashboard} 
              onNavigate={(section: any) => setActiveSection(section)} 
              onRefresh={fetchDashboard}
            />
          )}
          {activeSection === 'moderation' && <Moderation data={dashboard.moderation} onRefresh={fetchDashboard} />}
          {activeSection === 'analytics' && (
            <Analytics
              data={dashboard.analytics}
              platformSettings={dashboard.platformSettings}
              period={analyticsPeriod}
              onPeriodChange={setAnalyticsPeriod}
              onRefresh={() => fetchDashboard(analyticsPeriod)}
            />
          )}
          {activeSection === 'verifications' && <Verifications data={dashboard.verifications} onRefresh={fetchDashboard} />}
          {activeSection === 'reports' && <Reports data={dashboard.reports} onRefresh={fetchDashboard} />}
        </main>
      </div>
    </div>
  );
}
