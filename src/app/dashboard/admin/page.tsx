'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime, getInitials } from '@/lib/utils';

type DashboardData = any;

const sections = [
  { id: 'moderation', label: 'Content & User Moderation' },
  { id: 'analytics', label: 'Analytics & Growth' },
  { id: 'verifications', label: 'Review Tutor Applications' },
  { id: 'reports', label: 'Reports & Disputes' },
] as const;

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

function ShellCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-navy-400 dark:text-cream-400/60">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function TrendBars({ items, tone }: { items: Array<{ label: string; value: number }>; tone: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="flex items-end gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-24 w-full items-end rounded-2xl bg-navy-50/80 px-2 py-2 dark:bg-navy-700/20">
            <div className={`w-full rounded-xl ${tone}`} style={{ height: `${Math.max((item.value / max) * 100, item.value > 0 ? 12 : 4)}%` }} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">{item.label}</div>
          <div className="text-xs font-bold text-navy-500 dark:text-cream-300">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function TutorPreview({ preview }: { preview: any }) {
  if (!preview) return null;

  return (
    <div className="rounded-[28px] border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 text-lg font-black text-navy-600">
          {getInitials(preview.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">{preview.name}</div>
            <Badge value="Preview" />
          </div>
          <div className="mt-1 text-sm text-navy-400 dark:text-cream-400/60">{preview.headline || 'No headline available.'}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(preview.specializations || []).map((subject: string) => (
              <span key={subject} className="rounded-full bg-navy-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-navy-500 dark:bg-navy-700/20 dark:text-cream-300">
                {subject.replaceAll('_', ' ')}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-navy-600 dark:text-cream-200">{formatCurrency(preview.hourlyRate || 0)}</div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">per hour</div>
        </div>
      </div>
      <div className="mt-5 text-sm leading-relaxed text-navy-400 dark:text-cream-300/80">{preview.about || 'No about text provided.'}</div>
    </div>
  );
}

async function parseResponse(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]['id']>('moderation');
  const [analyticsTab, setAnalyticsTab] = useState<'students' | 'tutors' | 'optimization'>('students');
  const [trendMode, setTrendMode] = useState<'weekly' | 'monthly'>('weekly');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [featuredDraft, setFeaturedDraft] = useState<string[]>([]);
  const [seoDrafts, setSeoDrafts] = useState<Record<string, { title: string; description: string }>>({});
  const [campaignForm, setCampaignForm] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: '10',
    expiryDate: '',
    usageLimit: '100',
  });
  const [reportForm, setReportForm] = useState({
    note: '',
    amount: '',
    duration: '7d',
    customUntil: '',
    target: 'reported',
  });
  const [rejectModal, setRejectModal] = useState<null | {
    tutorProfileId: string;
    reasonCategory: string;
    notes: string;
    requestedDocument: string;
  }>(null);
  const [certificationChecks, setCertificationChecks] = useState<Record<string, { scoreMatches: boolean; authentic: boolean; dateConsistent: boolean }>>({});

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' });
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
  }, []);

  useEffect(() => {
    if (!dashboard) return;
    if (!selectedUserId && dashboard.moderation.users[0]) setSelectedUserId(dashboard.moderation.users[0].id);
    if (!selectedApplicationId && dashboard.verifications.queue[0]) setSelectedApplicationId(dashboard.verifications.queue[0].id);
    if (!selectedReportId && dashboard.reports.queue[0]) setSelectedReportId(dashboard.reports.queue[0].id);
    setFeaturedDraft(dashboard.analytics.optimizationTools.featuredTutors.map((item: any) => item.tutorProfileId));
    setSeoDrafts(
      Object.fromEntries(
        dashboard.analytics.optimizationTools.seoMetadata.map((item: any) => [item.subject, { title: item.title, description: item.description }])
      )
    );
  }, [dashboard, selectedApplicationId, selectedReportId, selectedUserId]);

  const selectedUser = useMemo(
    () => dashboard?.moderation.users.find((item: any) => item.id === selectedUserId) ?? null,
    [dashboard, selectedUserId]
  );
  const selectedApplication = useMemo(
    () => dashboard?.verifications.queue.find((item: any) => item.id === selectedApplicationId) ?? null,
    [dashboard, selectedApplicationId]
  );
  const selectedReport = useMemo(
    () => dashboard?.reports.queue.find((item: any) => item.id === selectedReportId) ?? null,
    [dashboard, selectedReportId]
  );

  useEffect(() => {
    if (!selectedApplication) return;
    setCertificationChecks(
      Object.fromEntries(
        selectedApplication.certifications.map((item: any) => [
          item.id,
          item.checklist || { scoreMatches: false, authentic: false, dateConsistent: false },
        ])
      )
    );
  }, [selectedApplication]);

  const filteredUsers = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.moderation.users.filter((item: any) => {
      const matchesRole = roleFilter === 'ALL' || item.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const query = `${item.name} ${item.email}`.toLowerCase();
      const matchesSearch = !search || query.includes(search.toLowerCase());
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [dashboard, roleFilter, search, statusFilter]);

  const runPatch = async (path: string, body: Record<string, unknown>, success: string) => {
    const response = await fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await parseResponse(response);
    toast.success(success);
    await fetchDashboard();
  };

  const warnUser = async (userId: string) => {
    const reason = window.prompt('Enter warning reason');
    if (!reason) return;
    await runPatch(`/api/admin/users/${userId}`, { action: 'SEND_WARNING', reason }, 'Warning email sent.');
  };

  const suspendUser = async (userId: string) => {
    const suggested = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const suspendedUntil = window.prompt('Enter suspension end date/time in YYYY-MM-DDTHH:mm', suggested);
    if (!suspendedUntil) return;
    const reason = window.prompt('Enter suspension reason', 'Suspended after admin review.') || 'Suspended after admin review.';
    await runPatch(`/api/admin/users/${userId}`, { action: 'SUSPEND', suspendedUntil, reason }, 'Suspension updated.');
  };

  const banUser = async (userId: string) => {
    const reason = window.prompt('Enter permanent ban reason');
    if (!reason) return;
    await runPatch(`/api/admin/users/${userId}`, { action: 'PERMANENT_BAN', reason }, 'User banned.');
  };

  const flagAction = async (flagId: string, action: string) => {
    const note = window.prompt('Enter admin note', '') || '';
    await runPatch(`/api/admin/flags/${flagId}`, { action, note }, 'Content flag processed.');
  };

  const toggleTutorVisibility = async () => {
    if (!selectedUser?.tutorProfile) return;
    await runPatch(
      `/api/admin/users/${selectedUser.id}`,
      {
        action: 'TOGGLE_HIDE_PROFILE',
        tutorProfileId: selectedUser.tutorProfile.id,
        hiddenFromSearch: !selectedUser.tutorProfile.hiddenFromSearch,
      },
      selectedUser.tutorProfile.hiddenFromSearch ? 'Tutor is visible in search again.' : 'Tutor hidden from search.'
    );
  };

  const approveApplication = async () => {
    if (!selectedApplication) return;
    await runPatch(
      `/api/admin/verifications/${selectedApplication.id}`,
      { decision: 'APPROVE', certificationChecklist: certificationChecks },
      'Tutor application approved.'
    );
  };

  const rejectApplication = async () => {
    if (!rejectModal) return;
    await runPatch(
      `/api/admin/verifications/${rejectModal.tutorProfileId}`,
      {
        decision: 'REJECT',
        reasonCategory: rejectModal.reasonCategory,
        notes: rejectModal.notes,
        requestedDocument: rejectModal.requestedDocument,
        certificationChecklist: certificationChecks,
      },
      'Tutor application updated.'
    );
    setRejectModal(null);
  };

  const submitCampaign = async () => {
    const response = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: campaignForm.code,
        type: campaignForm.type,
        value: Number(campaignForm.value),
        expiryDate: campaignForm.expiryDate,
        usageLimit: Number(campaignForm.usageLimit),
      }),
    });
    await parseResponse(response);
    toast.success('Discount code created.');
    setCampaignForm({ code: '', type: 'PERCENTAGE', value: '10', expiryDate: '', usageLimit: '100' });
    await fetchDashboard();
  };

  const moveFeaturedTutor = (id: string, direction: -1 | 1) => {
    setFeaturedDraft((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const saveFeaturedTutors = async () => {
    await runPatch('/api/admin/featured-tutors', { tutorProfileIds: featuredDraft }, 'Search ranking controls saved.');
  };

  const saveSeo = async (subject: string) => {
    await runPatch(`/api/admin/seo/${subject}`, seoDrafts[subject], `SEO metadata updated for ${subject.replaceAll('_', ' ')}.`);
  };

  const reportAction = async (action: string) => {
    if (!selectedReport) return;
    const targetUserId = reportForm.target === 'reporter' ? selectedReport.reporter.id : selectedReport.reportedParty.id;
    await runPatch(
      `/api/admin/reports/${selectedReport.id}`,
      {
        action,
        note: reportForm.note,
        amount: reportForm.amount ? Number(reportForm.amount) : undefined,
        duration: reportForm.duration,
        customUntil: reportForm.customUntil,
        targetUserId,
      },
      'Report decision recorded.'
    );
    setReportForm({ note: '', amount: '', duration: '7d', customUntil: '', target: 'reported' });
  };

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
          <div className="rounded-[28px] bg-gradient-to-br from-navy-600 via-navy-600 to-navy-500 p-5 text-cream-200">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-300/80">Overview Dashboard</div>
            <h1 className="mt-3 text-3xl font-display font-bold">Admin control center</h1>
            <p className="mt-3 text-sm text-cream-300/75">
              {session?.user?.name || 'Platform Admin'} can moderate content, review tutors, manage growth, and resolve reports here.
            </p>
          </div>
          <div className="mt-5 grid gap-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${
                  activeSection === section.id
                    ? 'border-gold-400 bg-gold-400 text-navy-600'
                    : 'border-navy-100 bg-white/70 text-navy-500 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-300'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-300 dark:text-cream-400/40">Total active users</div>
              <div className="mt-3 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{dashboard.overview.stats.totalActiveUsers}</div>
              <div className="mt-2 text-xs text-navy-400 dark:text-cream-400/60">Students and tutors with active access.</div>
            </div>
            <div className="glass-card p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-300 dark:text-cream-400/40">Total tutors</div>
              <div className="mt-3 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">
                {dashboard.overview.stats.tutorCounts.verified + dashboard.overview.stats.tutorCounts.pending + dashboard.overview.stats.tutorCounts.rejected}
              </div>
              <div className="mt-2 text-xs text-navy-400 dark:text-cream-400/60">
                Verified {dashboard.overview.stats.tutorCounts.verified} / Pending {dashboard.overview.stats.tutorCounts.pending} / Rejected {dashboard.overview.stats.tutorCounts.rejected}
              </div>
            </div>
            <div className="glass-card p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-300 dark:text-cream-400/40">Total revenue</div>
              <div className="mt-3 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{formatCurrency(dashboard.overview.stats.revenue.gross)}</div>
              <div className="mt-2 text-xs text-navy-400 dark:text-cream-400/60">Net after payouts {formatCurrency(dashboard.overview.stats.revenue.netAfterPayouts)}</div>
            </div>
            <div className="glass-card p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-300 dark:text-cream-400/40">Open tickets / reports</div>
              <div className="mt-3 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{dashboard.overview.stats.openTicketsAndReports}</div>
              <div className="mt-2 text-xs text-navy-400 dark:text-cream-400/60">Flags, disputes, and investigations still open.</div>
            </div>
          </div>

          <ShellCard title="Audit log" subtitle="Every decision is accessible here through the admin_actions history.">
            <div className="space-y-3">
              {dashboard.overview.auditLog.map((item: any) => (
                <div key={item.id} className="rounded-3xl border border-navy-100 bg-white/70 p-4 dark:border-navy-500/40 dark:bg-navy-600/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge value={item.actionType} />
                    <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.targetUser?.name || 'Platform record'}</div>
                    <div className="text-xs text-navy-300 dark:text-cream-400/40">{formatRelativeTime(item.createdAt)}</div>
                  </div>
                  <div className="mt-2 text-sm text-navy-400 dark:text-cream-300/80">{item.reason || 'No explicit reason recorded.'}</div>
                </div>
              ))}
            </div>
          </ShellCard>

          {activeSection === 'moderation' ? (
            <>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <ShellCard title="User list" subtitle="Filter users by role or moderation status, then take action row by row.">
                  <div className="grid gap-3 md:grid-cols-3">
                    <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200">
                      <option value="ALL">All roles</option>
                      <option value="STUDENT">Student</option>
                      <option value="TUTOR">Tutor</option>
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200">
                      <option value="ALL">All statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="BANNED">Banned</option>
                    </select>
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200" />
                  </div>
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[980px] border-collapse">
                      <thead>
                        <tr className="border-b border-navy-100 text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:border-navy-500/40 dark:text-cream-400/40">
                          <th className="px-3 py-3 text-left">Id</th>
                          <th className="px-3 py-3 text-left">Name</th>
                          <th className="px-3 py-3 text-left">Email</th>
                          <th className="px-3 py-3 text-left">Role</th>
                          <th className="px-3 py-3 text-left">Status</th>
                          <th className="px-3 py-3 text-left">Joined</th>
                          <th className="px-3 py-3 text-left">Last active</th>
                          <th className="px-3 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((item: any) => (
                          <tr key={item.id} className={`border-b border-navy-100/70 last:border-0 dark:border-navy-500/20 ${selectedUserId === item.id ? 'bg-gold-400/10' : ''}`}>
                            <td className="px-3 py-4 text-xs font-bold text-navy-400 dark:text-cream-300/70">{item.id.slice(0, 8)}</td>
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-100 text-xs font-black text-navy-500 dark:bg-navy-500/40 dark:text-cream-200">{getInitials(item.name)}</div>
                                <div>
                                  <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.name}</div>
                                  <div className="text-[11px] text-navy-300 dark:text-cream-400/40">{item.tutorProfile?.verificationStatus || 'Student account'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{item.email}</td>
                            <td className="px-3 py-4"><Badge value={item.role} /></td>
                            <td className="px-3 py-4"><Badge value={item.status} /></td>
                            <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{formatDate(item.joinedDate)}</td>
                            <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{formatRelativeTime(item.lastActive)}</td>
                            <td className="px-3 py-4">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setSelectedUserId(item.id)} className="rounded-xl border border-navy-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-navy-500 dark:border-navy-500/40 dark:text-cream-300">View profile</button>
                                <button onClick={() => void suspendUser(item.id)} className="rounded-xl bg-blue-500 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">Suspend</button>
                                <button onClick={() => void banUser(item.id)} className="rounded-xl bg-red-500 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">Permanently ban</button>
                                <button onClick={() => void warnUser(item.id)} className="rounded-xl border border-gold-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gold-700">Send warning email</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ShellCard>

                <ShellCard title="Tutor profile moderation" subtitle="Hide tutors from search, suspend booking access, or inspect documents and public preview.">
                  {selectedUser?.tutorProfile ? (
                    <div className="space-y-5">
                      <div className="grid gap-3 md:grid-cols-2">
                        <button onClick={() => void toggleTutorVisibility()} className="rounded-2xl border border-navy-100 bg-white px-4 py-4 text-left dark:border-navy-500/40 dark:bg-navy-600/30">
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">Hide profile from search</div>
                          <div className="mt-2 text-sm font-bold text-navy-600 dark:text-cream-200">
                            {selectedUser.tutorProfile.hiddenFromSearch ? 'Currently hidden from search.' : 'Currently visible to students.'}
                          </div>
                        </button>
                        <button onClick={() => void suspendUser(selectedUser.id)} className="rounded-2xl border border-navy-100 bg-white px-4 py-4 text-left dark:border-navy-500/40 dark:bg-navy-600/30">
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">Suspend account</div>
                          <div className="mt-2 text-sm font-bold text-navy-600 dark:text-cream-200">Blocks new bookings while existing confirmed sessions remain unaffected.</div>
                        </button>
                      </div>

                      <button onClick={() => void banUser(selectedUser.id)} className="w-full rounded-2xl bg-red-500 px-4 py-4 text-left text-white">
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/75">Permanently ban</div>
                        <div className="mt-2 text-sm font-bold">Reason is mandatory and the tutor receives a ban email.</div>
                      </button>

                      <TutorPreview preview={{ ...selectedUser.tutorProfile.preview, name: selectedUser.name }} />

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[28px] border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
                          <div className="text-sm font-black uppercase tracking-[0.16em] text-navy-500 dark:text-cream-300">Uploaded credentials</div>
                          <div className="mt-4 space-y-3">
                            {selectedUser.tutorProfile.credentials.map((credential: any) => (
                              <div key={credential.id} className="rounded-2xl bg-navy-50/80 p-3 dark:bg-navy-700/20">
                                <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{credential.fileName}</div>
                                <div className="mt-1 text-xs text-navy-400 dark:text-cream-400/60">{credential.type.replaceAll('_', ' ')}</div>
                                <a href={credential.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-black text-gold-700">Open document</a>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[28px] border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
                          <div className="text-sm font-black uppercase tracking-[0.16em] text-navy-500 dark:text-cream-300">Certification data</div>
                          <div className="mt-4 space-y-3">
                            {selectedUser.tutorProfile.certifications.map((certification: any) => (
                              <div key={certification.id} className="rounded-2xl bg-navy-50/80 p-3 dark:bg-navy-700/20">
                                <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{certification.levelOrVariant || certification.type}</div>
                                <div className="mt-1 text-xs text-navy-400 dark:text-cream-400/60">Score {certification.score || 'n/a'} | Date {certification.testDate ? formatDate(certification.testDate) : 'n/a'}</div>
                                {certification.fileUrl ? <a href={certification.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-black text-gold-700">Open supporting file</a> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[28px] border border-dashed border-navy-200 p-8 text-center text-sm text-navy-400 dark:border-navy-500/40 dark:text-cream-400/60">
                      Select a tutor from the user list to moderate visibility, suspension, and profile documents.
                    </div>
                  )}
                </ShellCard>
              </div>

              <ShellCard title="Content flags" subtitle="Reported reviews, messages, and profiles move through dismissal, removal, warning, or banning actions here.">
                <div className="space-y-4">
                  {dashboard.moderation.contentFlags.map((item: any) => (
                    <div key={item.id} className="rounded-[28px] border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge value={item.contentType} />
                        <Badge value={item.status} />
                      </div>
                      <div className="mt-3 text-sm text-navy-500 dark:text-cream-300/80">
                        Reporter <span className="font-bold">{item.reporter.name}</span> flagged content from <span className="font-bold">{item.targetUser?.name || item.tutorProfile?.name || 'Unknown user'}</span>.
                      </div>
                      <div className="mt-2 text-sm text-navy-400 dark:text-cream-300/80">{item.reason}</div>
                      <pre className="mt-3 overflow-x-auto rounded-2xl bg-navy-50/80 p-4 text-xs text-navy-500 dark:bg-navy-700/20 dark:text-cream-300/80">{JSON.stringify(item.contentSnapshot, null, 2)}</pre>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={() => void flagAction(item.id, 'DISMISS')} className="rounded-xl border border-navy-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-navy-500 dark:border-navy-500/40 dark:text-cream-300">Dismiss</button>
                        <button onClick={() => void flagAction(item.id, 'REMOVE_CONTENT')} className="rounded-xl border border-red-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-600">Remove content</button>
                        <button onClick={() => void flagAction(item.id, 'WARN_USER')} className="rounded-xl border border-gold-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gold-700">Warn user</button>
                        <button onClick={() => void flagAction(item.id, 'BAN_USER')} className="rounded-xl bg-red-500 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">Ban user</button>
                      </div>
                    </div>
                  ))}
                </div>
              </ShellCard>
            </>
          ) : null}

          {activeSection === 'analytics' ? (
            <>
              <div className="flex flex-wrap gap-2 rounded-3xl bg-white/70 p-2 dark:bg-navy-600/30">
                {[
                  { id: 'students', label: 'Student Analytics' },
                  { id: 'tutors', label: 'Tutor Analytics' },
                  { id: 'optimization', label: 'Optimization Tools' },
                ].map((tab) => (
                  <button key={tab.id} onClick={() => setAnalyticsTab(tab.id as typeof analyticsTab)} className={`rounded-2xl px-4 py-3 text-sm font-bold ${analyticsTab === tab.id ? 'bg-navy-600 text-white' : 'text-navy-500 dark:text-cream-300'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {analyticsTab === 'students' ? (
                <>
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <ShellCard title="Total students by subject" subtitle="Weekly and monthly trends are computed from real booking activity.">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setTrendMode('weekly')} className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.16em] ${trendMode === 'weekly' ? 'bg-gold-400 text-navy-600' : 'bg-navy-50 text-navy-500 dark:bg-navy-700/20 dark:text-cream-300'}`}>Weekly</button>
                        <button onClick={() => setTrendMode('monthly')} className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.16em] ${trendMode === 'monthly' ? 'bg-gold-400 text-navy-600' : 'bg-navy-50 text-navy-500 dark:bg-navy-700/20 dark:text-cream-300'}`}>Monthly</button>
                      </div>
                      <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        {dashboard.analytics.studentAnalytics.studentsBySubject.map((item: any, index: number) => (
                          <div key={item.subject} className="rounded-[28px] border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">{item.subject}</div>
                            <div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{item.totalStudents}</div>
                            <div className="mt-4">
                              <TrendBars items={trendMode === 'weekly' ? item.trend.weekly : item.trend.monthly} tone={index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-emerald-500' : 'bg-amber-500'} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ShellCard>

                    <ShellCard title="Retention" subtitle="Students who booked session 2+ are treated as paid conversions.">
                      <div className="space-y-4">
                        <div className="rounded-3xl bg-navy-50/80 p-4 dark:bg-navy-700/20">
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">Students with bookings</div>
                          <div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{dashboard.analytics.studentAnalytics.retention.studentsWithAnyBooking}</div>
                        </div>
                        <div className="rounded-3xl bg-navy-50/80 p-4 dark:bg-navy-700/20">
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">Students who booked session 2+</div>
                          <div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{dashboard.analytics.studentAnalytics.retention.retainedStudents}</div>
                        </div>
                        <div className="rounded-3xl bg-gold-400 p-4 text-navy-600">
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-600/70">Paid conversion rate</div>
                          <div className="mt-2 text-3xl font-display font-bold">{dashboard.analytics.studentAnalytics.retention.paidConversionRate}%</div>
                        </div>
                      </div>
                    </ShellCard>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <ShellCard title="Active students per tutor" subtitle="Top 10 leaderboard by distinct active students.">
                      <div className="space-y-3">
                        {dashboard.analytics.studentAnalytics.activeStudentsPerTutor.map((item: any, index: number) => (
                          <div key={item.tutorProfileId} className="flex items-center justify-between rounded-3xl border border-navy-100 bg-white/70 px-4 py-4 dark:border-navy-500/40 dark:bg-navy-600/30">
                            <div className="flex items-center gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-100 text-sm font-black text-navy-500 dark:bg-navy-500/40 dark:text-cream-200">{index + 1}</div>
                              <div>
                                <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.tutorName}</div>
                                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">{item.subject.replaceAll('_', ' ')}</div>
                              </div>
                            </div>
                            <div className="text-lg font-bold text-navy-600 dark:text-cream-200">{item.activeStudents}</div>
                          </div>
                        ))}
                      </div>
                    </ShellCard>

                    <ShellCard title="Most recent signups" subtitle="Student signups from the last 7 days.">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[580px] border-collapse">
                          <thead>
                            <tr className="border-b border-navy-100 text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:border-navy-500/40 dark:text-cream-400/40">
                              <th className="px-3 py-3 text-left">Name</th>
                              <th className="px-3 py-3 text-left">Email</th>
                              <th className="px-3 py-3 text-left">Joined</th>
                              <th className="px-3 py-3 text-left">Last active</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboard.analytics.studentAnalytics.recentSignups.map((item: any) => (
                              <tr key={item.id} className="border-b border-navy-100/70 last:border-0 dark:border-navy-500/20">
                                <td className="px-3 py-4 text-sm font-bold text-navy-600 dark:text-cream-200">{item.name}</td>
                                <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{item.email}</td>
                                <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{formatDate(item.joinedDate)}</td>
                                <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{formatRelativeTime(item.lastActive)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ShellCard>
                  </div>
                </>
              ) : null}

              {analyticsTab === 'tutors' ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="glass-card p-5"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">GMV</div><div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{formatCurrency(dashboard.analytics.tutorAnalytics.gmv)}</div></div>
                    <div className="glass-card p-5"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">Take rate</div><div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{dashboard.analytics.tutorAnalytics.takeRate}%</div></div>
                    <div className="glass-card p-5"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">Free to paid conversion</div><div className="mt-2 text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{dashboard.analytics.tutorAnalytics.freeToPaidConversionRate}%</div></div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <ShellCard title="Hours taught per tutor" subtitle="Ranking based on completed booking duration.">
                      <div className="space-y-3">
                        {dashboard.analytics.tutorAnalytics.hoursTaughtPerTutor.map((item: any) => (
                          <div key={item.tutorProfileId} className="flex items-center justify-between rounded-3xl border border-navy-100 bg-white/70 px-4 py-4 dark:border-navy-500/40 dark:bg-navy-600/30">
                            <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.tutorName}</div>
                            <div className="text-lg font-bold text-navy-600 dark:text-cream-200">{item.hoursTaught}h</div>
                          </div>
                        ))}
                      </div>
                    </ShellCard>

                    <ShellCard title="Student bookings per tutor" subtitle="Includes session 2+ conversion rate for each tutor.">
                      <div className="space-y-3">
                        {dashboard.analytics.tutorAnalytics.studentBookingsPerTutor.map((item: any) => (
                          <div key={item.tutorProfileId} className="rounded-3xl border border-navy-100 bg-white/70 px-4 py-4 dark:border-navy-500/40 dark:bg-navy-600/30">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.tutorName}</div>
                              <div className="text-lg font-bold text-navy-600 dark:text-cream-200">{item.totalBookings}</div>
                            </div>
                            <div className="mt-2 text-xs text-navy-400 dark:text-cream-400/60">Session 2+ conversion rate {item.sessionTwoPlusConversionRate}%</div>
                          </div>
                        ))}
                      </div>
                    </ShellCard>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <ShellCard title="New tutor signups per week" subtitle="Weekly acquisition trend for tutor accounts.">
                      <TrendBars items={dashboard.analytics.tutorAnalytics.newTutorSignupsPerWeek} tone="bg-sage-500" />
                    </ShellCard>
                    <ShellCard title="Payout history summary" subtitle="Charge, payout status, and transfer references for recent bookings.">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] border-collapse">
                          <thead>
                            <tr className="border-b border-navy-100 text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:border-navy-500/40 dark:text-cream-400/40">
                              <th className="px-3 py-3 text-left">Tutor</th>
                              <th className="px-3 py-3 text-left">Student</th>
                              <th className="px-3 py-3 text-left">Subject</th>
                              <th className="px-3 py-3 text-left">Payout</th>
                              <th className="px-3 py-3 text-left">Status</th>
                              <th className="px-3 py-3 text-left">Transfer</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboard.analytics.tutorAnalytics.payoutHistory.map((item: any) => (
                              <tr key={item.bookingId} className="border-b border-navy-100/70 last:border-0 dark:border-navy-500/20">
                                <td className="px-3 py-4 text-sm font-bold text-navy-600 dark:text-cream-200">{item.tutorName}</td>
                                <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{item.studentName}</td>
                                <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{item.subject.replaceAll('_', ' ')}</td>
                                <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{formatCurrency(item.payoutAmount)}</td>
                                <td className="px-3 py-4"><Badge value={item.payoutStatus} /></td>
                                <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{item.stripeTransferId || 'Pending'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ShellCard>
                  </div>
                </>
              ) : null}

              {analyticsTab === 'optimization' ? (
                <>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <ShellCard title="Pricing suggestions" subtitle="Average hourly rate benchmarks by subject.">
                      <div className="grid gap-4 md:grid-cols-3">
                        {dashboard.analytics.optimizationTools.pricingSuggestions.map((item: any) => (
                          <div key={item.subject} className="rounded-[28px] border border-navy-100 bg-white/70 p-5 text-center dark:border-navy-500/40 dark:bg-navy-600/30">
                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">{item.subject}</div>
                            <div className="mt-2 text-2xl font-display font-bold text-navy-600 dark:text-cream-200">{formatCurrency(item.averageHourlyRate)}</div>
                            <div className="mt-1 text-xs text-navy-400 dark:text-cream-400/60">{item.tutorCount} tutors</div>
                          </div>
                        ))}
                      </div>
                    </ShellCard>

                    <ShellCard title="Search ranking controls" subtitle="Manually pin featured tutors at the top of public search.">
                      <div className="space-y-3">
                        {featuredDraft.map((id, index) => {
                          const item = dashboard.analytics.optimizationTools.featuredTutors.find((entry: any) => entry.tutorProfileId === id);
                          if (!item) return null;
                          return (
                            <div key={id} className="flex items-center justify-between rounded-3xl border border-navy-100 bg-white/70 px-4 py-4 dark:border-navy-500/40 dark:bg-navy-600/30">
                              <div>
                                <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.tutorName}</div>
                                <div className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-navy-300 dark:text-cream-400/40">Pinned rank {index + 1}</div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => moveFeaturedTutor(id, -1)} className="rounded-xl border border-navy-100 px-3 py-2 text-xs font-black text-navy-500 dark:border-navy-500/40 dark:text-cream-300">Up</button>
                                <button onClick={() => moveFeaturedTutor(id, 1)} className="rounded-xl border border-navy-100 px-3 py-2 text-xs font-black text-navy-500 dark:border-navy-500/40 dark:text-cream-300">Down</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={() => void saveFeaturedTutors()} className="mt-4 rounded-2xl bg-gold-400 px-4 py-3 text-sm font-bold text-navy-600">Save ranking</button>
                    </ShellCard>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <ShellCard title="Campaign manager" subtitle="Create discount codes by percentage or fixed amount, with expiry and usage limits.">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input value={campaignForm.code} onChange={(event) => setCampaignForm((current) => ({ ...current, code: event.target.value }))} placeholder="Discount code" className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200" />
                        <select value={campaignForm.type} onChange={(event) => setCampaignForm((current) => ({ ...current, type: event.target.value }))} className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200">
                          <option value="PERCENTAGE">Percentage</option>
                          <option value="FIXED">Fixed amount</option>
                        </select>
                        <input value={campaignForm.value} onChange={(event) => setCampaignForm((current) => ({ ...current, value: event.target.value }))} placeholder="Value" className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200" />
                        <input type="date" value={campaignForm.expiryDate} onChange={(event) => setCampaignForm((current) => ({ ...current, expiryDate: event.target.value }))} className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200" />
                        <input value={campaignForm.usageLimit} onChange={(event) => setCampaignForm((current) => ({ ...current, usageLimit: event.target.value }))} placeholder="Usage limit" className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200" />
                        <button onClick={() => void submitCampaign()} className="rounded-2xl bg-navy-600 px-4 py-3 text-sm font-bold text-white">Create campaign</button>
                      </div>
                      <div className="mt-4 space-y-3">
                        {dashboard.analytics.optimizationTools.campaigns.map((item: any) => (
                          <div key={item.id} className="rounded-3xl border border-navy-100 bg-white/70 px-4 py-4 dark:border-navy-500/40 dark:bg-navy-600/30">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.code}</div>
                                <div className="mt-1 text-xs text-navy-400 dark:text-cream-400/60">
                                  {item.type === 'PERCENTAGE' ? `${item.value}% off` : `${formatCurrency(item.value)} off`} | Expires {formatDate(item.expiryDate)}
                                </div>
                              </div>
                              <Badge value={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ShellCard>

                    <ShellCard title="SEO metadata editor" subtitle="Update title and description copy per subject landing page.">
                      <div className="space-y-4">
                        {dashboard.analytics.optimizationTools.seoMetadata.map((item: any) => (
                          <div key={item.subject} className="rounded-[28px] border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.subject.replaceAll('_', ' ')}</div>
                              <button onClick={() => void saveSeo(item.subject)} className="rounded-xl bg-gold-400 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-navy-600">Save metadata</button>
                            </div>
                            <div className="mt-4 grid gap-3">
                              <input value={seoDrafts[item.subject]?.title || ''} onChange={(event) => setSeoDrafts((current) => ({ ...current, [item.subject]: { ...current[item.subject], title: event.target.value } }))} className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200" />
                              <textarea value={seoDrafts[item.subject]?.description || ''} onChange={(event) => setSeoDrafts((current) => ({ ...current, [item.subject]: { ...current[item.subject], description: event.target.value } }))} rows={3} className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ShellCard>
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {activeSection === 'verifications' ? (
            <>
              <ShellCard title="Pending tutor applications" subtitle="Queue is ordered by oldest submission first.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse">
                    <thead>
                      <tr className="border-b border-navy-100 text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 dark:border-navy-500/40 dark:text-cream-400/40">
                        <th className="px-3 py-3 text-left">Tutor name</th>
                        <th className="px-3 py-3 text-left">Subjects</th>
                        <th className="px-3 py-3 text-left">Submitted</th>
                        <th className="px-3 py-3 text-left">Credentials</th>
                        <th className="px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.verifications.queue.map((item: any) => (
                        <tr key={item.id} className={`border-b border-navy-100/70 last:border-0 dark:border-navy-500/20 ${selectedApplicationId === item.id ? 'bg-gold-400/10' : ''}`}>
                          <td className="px-3 py-4 text-sm font-bold text-navy-600 dark:text-cream-200">{item.tutorName}</td>
                          <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{item.subjects.map((subject: string) => subject.replaceAll('_', ' ')).join(', ')}</td>
                          <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{formatDate(item.submittedDate)}</td>
                          <td className="px-3 py-4 text-sm text-navy-400 dark:text-cream-300/70">{item.credentialsCount}</td>
                          <td className="px-3 py-4 text-right">
                            <button onClick={() => setSelectedApplicationId(item.id)} className="rounded-xl border border-navy-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-navy-500 dark:border-navy-500/40 dark:text-cream-300">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ShellCard>

              {selectedApplication ? (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <div className="space-y-6">
                    <ShellCard title="Tutor profile preview" subtitle="Left panel mirrors the public profile students would see after approval.">
                      <TutorPreview preview={selectedApplication.preview} />
                    </ShellCard>
                    <ShellCard title="History log" subtitle="Every prior admin action on this application is shown with timestamps.">
                      <div className="space-y-3">
                        {selectedApplication.history.map((item: any) => (
                          <div key={item.id} className="rounded-3xl border border-navy-100 bg-white/70 p-4 dark:border-navy-500/40 dark:bg-navy-600/30">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge value={item.action} />
                              <div className="text-xs text-navy-300 dark:text-cream-400/40">{formatDateTime(item.createdAt)}</div>
                            </div>
                            <div className="mt-2 text-sm text-navy-400 dark:text-cream-300/80">{item.notes || 'No notes recorded.'}</div>
                            {item.requestedDocument ? <div className="mt-2 text-xs font-black text-gold-700">Requested document: {item.requestedDocument}</div> : null}
                          </div>
                        ))}
                      </div>
                    </ShellCard>
                  </div>

                  <ShellCard title="Verification checklist" subtitle="Check each certification against the uploaded document before deciding.">
                    <div className="space-y-5">
                      {selectedApplication.certifications.map((item: any) => (
                        <div key={item.id} className="rounded-[28px] border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.levelOrVariant || item.type}</div>
                              <div className="mt-1 text-xs text-navy-400 dark:text-cream-400/60">Score {item.score || 'n/a'} | Date {item.testDate ? formatDate(item.testDate) : 'n/a'}</div>
                            </div>
                            <Badge value={item.status} />
                          </div>
                          <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                            <div className="rounded-2xl bg-navy-50/80 p-4 text-sm text-navy-500 dark:bg-navy-700/20 dark:text-cream-300/80">
                              <div><strong>Type:</strong> {item.type}</div>
                              <div className="mt-2"><strong>Percentiles:</strong> {JSON.stringify(item.percentiles || {})}</div>
                            </div>
                            <div className="rounded-2xl border border-navy-100 bg-white p-3 dark:border-navy-500/40 dark:bg-navy-600/30">
                              {item.viewerUrl ? (
                                item.viewerUrl.endsWith('.pdf') ? (
                                  <iframe src={item.viewerUrl} className="h-64 w-full rounded-xl border border-navy-100 dark:border-navy-500/40" />
                                ) : (
                                  <img src={item.viewerUrl} alt="Certification document" className="h-64 w-full rounded-xl object-cover" />
                                )
                              ) : (
                                <div className="flex h-64 items-center justify-center rounded-xl bg-navy-50 text-sm text-navy-400 dark:bg-navy-700/20 dark:text-cream-400/60">No document uploaded</div>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {[
                              ['scoreMatches', 'Score matches the document'],
                              ['authentic', 'Document appears authentic'],
                              ['dateConsistent', 'Date is consistent'],
                            ].map(([key, label]) => (
                              <label key={key} className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm font-semibold text-navy-500 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200">
                                <input
                                  type="checkbox"
                                  checked={certificationChecks[item.id]?.[key as keyof (typeof certificationChecks)[string]] || false}
                                  onChange={(event) =>
                                    setCertificationChecks((current) => ({
                                      ...current,
                                      [item.id]: { ...current[item.id], [key]: event.target.checked },
                                    }))
                                  }
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-[28px] border border-navy-100 bg-navy-50/80 p-5 dark:border-navy-500/40 dark:bg-navy-700/20">
                      <div className="text-sm font-black uppercase tracking-[0.16em] text-navy-500 dark:text-cream-300">Decision section</div>
                      <div className="mt-1 text-sm text-navy-400 dark:text-cream-300/80">Condition check: Hồ sơ đủ điều kiện?</div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button onClick={() => void approveApplication()} className="rounded-2xl bg-sage-500 px-4 py-3 text-sm font-bold text-white">Approve</button>
                        <button onClick={() => setRejectModal({ tutorProfileId: selectedApplication.id, reasonCategory: 'Insufficient proof', notes: '', requestedDocument: '' })} className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white">Reject / request more info</button>
                      </div>
                    </div>
                  </ShellCard>
                </div>
              ) : null}
            </>
          ) : null}

          {activeSection === 'reports' ? (
            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              <ShellCard title="Reports queue" subtitle="No-show, conduct, payment, and technical issues are triaged here.">
                <div className="space-y-3">
                  {dashboard.reports.queue.map((item: any) => (
                    <button key={item.id} onClick={() => setSelectedReportId(item.id)} className={`w-full rounded-[28px] border px-4 py-4 text-left ${selectedReportId === item.id ? 'border-gold-400 bg-gold-400/10' : 'border-navy-100 bg-white/70 dark:border-navy-500/40 dark:bg-navy-600/30'}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge value={item.type} />
                        <Badge value={item.status} />
                      </div>
                      <div className="mt-3 text-sm font-bold text-navy-600 dark:text-cream-200">{item.reporter.name} → {item.reportedParty.name}</div>
                      <div className="mt-2 text-sm text-navy-400 dark:text-cream-300/80">{item.description}</div>
                    </button>
                  ))}
                </div>
              </ShellCard>

              {selectedReport ? (
                <div className="space-y-6">
                  <ShellCard title="Investigation tools" subtitle="Read-only chat, booking timeline, payment log, and pair history for this report.">
                    <div className="grid gap-6 xl:grid-cols-2">
                      <div className="space-y-6">
                        <div className="rounded-[28px] border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
                          <div className="text-sm font-black uppercase tracking-[0.16em] text-navy-500 dark:text-cream-300">Conversation thread</div>
                          <div className="mt-4 space-y-3">
                            {selectedReport.conversationThread.length ? selectedReport.conversationThread.map((message: any) => (
                              <div key={message.id} className="rounded-2xl bg-navy-50/80 p-4 dark:bg-navy-700/20">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{message.sender.name}</div>
                                  <div className="text-[11px] text-navy-300 dark:text-cream-400/40">{formatDateTime(message.sentAt)}</div>
                                </div>
                                <div className="mt-2 text-sm text-navy-400 dark:text-cream-300/80">{message.body}</div>
                              </div>
                            )) : <div className="rounded-2xl bg-navy-50/80 p-4 text-sm text-navy-400 dark:bg-navy-700/20 dark:text-cream-400/60">No conversation was found for this pair.</div>}
                          </div>
                        </div>

                        <div className="rounded-[28px] border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
                          <div className="text-sm font-black uppercase tracking-[0.16em] text-navy-500 dark:text-cream-300">Previous bookings</div>
                          <div className="mt-4 space-y-3">
                            {selectedReport.previousBookings.map((item: any) => (
                              <div key={item.id} className="rounded-2xl bg-navy-50/80 p-4 dark:bg-navy-700/20">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.subject.replaceAll('_', ' ')}</div>
                                  <Badge value={item.status} />
                                </div>
                                <div className="mt-2 text-xs text-navy-400 dark:text-cream-400/60">Session {item.sessionNumber} | {formatDateTime(item.scheduledAt)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="rounded-[28px] border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
                          <div className="text-sm font-black uppercase tracking-[0.16em] text-navy-500 dark:text-cream-300">Booking timeline</div>
                          <div className="mt-4 space-y-3">
                            {(selectedReport.booking?.timeline || []).map((item: any) => (
                              <div key={item.id} className="rounded-2xl bg-navy-50/80 p-4 dark:bg-navy-700/20">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.title}</div>
                                  <div className="text-[11px] text-navy-300 dark:text-cream-400/40">{formatDateTime(item.createdAt)}</div>
                                </div>
                                <div className="mt-2 text-sm text-navy-400 dark:text-cream-300/80">{item.details || 'No extra details recorded.'}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[28px] border border-navy-100 bg-white/70 p-5 dark:border-navy-500/40 dark:bg-navy-600/30">
                          <div className="text-sm font-black uppercase tracking-[0.16em] text-navy-500 dark:text-cream-300">Payment log</div>
                          <div className="mt-4 grid gap-3">
                            <div className="rounded-2xl bg-navy-50/80 p-4 text-sm text-navy-500 dark:bg-navy-700/20 dark:text-cream-300/80">Charge amount: {formatCurrency(selectedReport.booking?.paymentLog?.chargeAmount || 0)}</div>
                            <div className="rounded-2xl bg-navy-50/80 p-4 text-sm text-navy-500 dark:bg-navy-700/20 dark:text-cream-300/80">Platform fee: {formatCurrency(selectedReport.booking?.paymentLog?.platformFee || 0)}</div>
                            <div className="rounded-2xl bg-navy-50/80 p-4 text-sm text-navy-500 dark:bg-navy-700/20 dark:text-cream-300/80">Payout status: {selectedReport.booking?.paymentLog?.payoutStatus || 'N/A'}</div>
                            <div className="rounded-2xl bg-navy-50/80 p-4 text-sm text-navy-500 dark:bg-navy-700/20 dark:text-cream-300/80">Stripe payment ID: {selectedReport.booking?.paymentLog?.stripePaymentIntentId || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ShellCard>

                  <ShellCard title="Decision panel" subtitle="Refund, warn, suspend, ban, or dismiss and write the result back to admin_actions.">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <textarea value={reportForm.note} onChange={(event) => setReportForm((current) => ({ ...current, note: event.target.value }))} rows={4} placeholder="Reason / note for this decision" className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200 xl:col-span-2" />
                      <input value={reportForm.amount} onChange={(event) => setReportForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Partial refund amount" className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200" />
                      <select value={reportForm.target} onChange={(event) => setReportForm((current) => ({ ...current, target: event.target.value }))} className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200">
                        <option value="reported">Reported party</option>
                        <option value="reporter">Reporter</option>
                      </select>
                      <select value={reportForm.duration} onChange={(event) => setReportForm((current) => ({ ...current, duration: event.target.value }))} className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200">
                        <option value="1d">1 day</option>
                        <option value="3d">3 days</option>
                        <option value="7d">7 days</option>
                        <option value="30d">30 days</option>
                        <option value="custom">Custom</option>
                      </select>
                      <input type="datetime-local" value={reportForm.customUntil} onChange={(event) => setReportForm((current) => ({ ...current, customUntil: event.target.value }))} className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200" />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <button onClick={() => void reportAction('ISSUE_FULL_REFUND')} className="rounded-2xl bg-sage-500 px-4 py-3 text-sm font-bold text-white">Issue full refund</button>
                      <button onClick={() => void reportAction('ISSUE_PARTIAL_REFUND')} className="rounded-2xl bg-gold-400 px-4 py-3 text-sm font-bold text-navy-600">Issue partial refund</button>
                      <button onClick={() => void reportAction('WARN_USER')} className="rounded-2xl border border-gold-300 px-4 py-3 text-sm font-bold text-gold-700">Warn user</button>
                      <button onClick={() => void reportAction('SUSPEND_ACCOUNT')} className="rounded-2xl border border-blue-300 px-4 py-3 text-sm font-bold text-blue-700">Suspend account</button>
                      <button onClick={() => void reportAction('PERMANENT_BAN_ACCOUNT')} className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white">Permanently ban account</button>
                      <button onClick={() => void reportAction('DISMISS_REPORT')} className="rounded-2xl border border-navy-100 px-4 py-3 text-sm font-bold text-navy-500 dark:border-navy-500/40 dark:text-cream-300">Dismiss report</button>
                    </div>
                  </ShellCard>
                </div>
              ) : null}
            </div>
          ) : null}
        </main>
      </div>

      {rejectModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[32px] bg-white p-6 shadow-2xl dark:bg-navy-600">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-300 dark:text-cream-400/40">Reject / request more info</div>
                <div className="mt-2 text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Tutor application outcome</div>
              </div>
              <button onClick={() => setRejectModal(null)} className="rounded-xl border border-navy-100 px-3 py-2 text-xs font-black text-navy-500 dark:border-navy-500/40 dark:text-cream-300">Close</button>
            </div>
            <div className="mt-6 grid gap-4">
              <select value={rejectModal.reasonCategory} onChange={(event) => setRejectModal((current) => (current ? { ...current, reasonCategory: event.target.value } : current))} className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200">
                <option>Insufficient proof</option>
                <option>Unreadable document</option>
                <option>Scores don&apos;t match</option>
                <option>Other</option>
              </select>
              <textarea value={rejectModal.notes} onChange={(event) => setRejectModal((current) => (current ? { ...current, notes: event.target.value } : current))} rows={5} placeholder="Required admin notes sent to the tutor" className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200" />
              <input value={rejectModal.requestedDocument} onChange={(event) => setRejectModal((current) => (current ? { ...current, requestedDocument: event.target.value } : current))} placeholder="Request specific document (optional)" className="rounded-2xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setRejectModal(null)} className="rounded-2xl border border-navy-100 px-4 py-3 text-sm font-bold text-navy-500 dark:border-navy-500/40 dark:text-cream-300">Cancel</button>
              <button onClick={() => void rejectApplication()} disabled={!rejectModal.notes} className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Confirm rejection</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
