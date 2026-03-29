'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SUBJECT_COLORS, SUBJECT_LABELS, type Subject } from '@/types';
import { formatDate, formatResponseTime, getInitials } from '@/lib/utils';
import BookingModal from '@/components/student/BookingModal';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function StatBox({ label, score, pct, color = 'blue' }: { label: string; score?: any; pct?: any; color?: 'blue' | 'emerald' | 'amber' }) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-500/5',
    emerald: 'text-emerald-600 bg-emerald-50/50 dark:text-emerald-400 dark:bg-emerald-500/5',
    amber: 'text-amber-600 bg-amber-50/50 dark:text-amber-400 dark:bg-amber-500/5',
  };

  if (!score && !pct) return null;

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white dark:bg-navy-800/40 border border-navy-50 dark:border-navy-700/50">
      <p className="text-[9px] font-black uppercase tracking-widest text-navy-400 dark:text-cream-400/30 line-clamp-1">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-sm font-black text-navy-600 dark:text-cream-200">{score || '---'}</p>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${colorClasses[color]}`}>
          {pct ? `${pct}%` : '---'}
        </span>
      </div>
    </div>
  );
}

function AvailabilityGrid({ tutorId }: { tutorId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [gridData, setGridData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getWeekStart = (offset: number) => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const formatDateParam = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    const weekStart = getWeekStart(weekOffset);
    setLoading(true);
    fetch(`/api/tutors/${tutorId}/weekly-availability?weekStart=${formatDateParam(weekStart)}`)
      .then((r) => r.json())
      .then(setGridData)
      .finally(() => setLoading(false));
  }, [tutorId, weekOffset]);

  const weekStart = getWeekStart(weekOffset);
  const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Build column headers from gridData dates
  const days = gridData?.slots
    ? Array.from(new Set<string>(gridData.slots.map((s: any) => s.date)))
        .sort()
        .map((date: string) => ({ date, day: gridData.slots.find((s: any) => s.date === date)?.day }))
    : [];

  // All unique time slots across the week
  const times = gridData?.slots
    ? Array.from(new Set<string>(gridData.slots.map((s: any) => s.startTime))).sort()
    : [];

  // Lookup map: "date|startTime" → status
  const slotMap: Record<string, 'available' | 'booked'> = {};
  if (gridData?.slots) {
    for (const s of gridData.slots) {
      slotMap[`${s.date}|${s.startTime}`] = s.status;
    }
  }

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          disabled={weekOffset <= 0}
          className="p-2 rounded-xl border border-navy-100 dark:border-navy-500/20 hover:bg-navy-50 dark:hover:bg-navy-700 disabled:opacity-30 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-sm font-bold text-navy-600 dark:text-cream-200">
          Week of {weekLabel}
          {weekOffset === 0 && <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-gold-500">Current</span>}
        </span>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="p-2 rounded-xl border border-navy-100 dark:border-navy-500/20 hover:bg-navy-50 dark:hover:bg-navy-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        {gridData?.timezone && (
          <span className="ml-auto text-[10px] text-navy-300 dark:text-cream-400/40 font-bold">
            {gridData.timezone}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-navy-300 animate-pulse text-sm">Loading availability...</div>
      ) : times.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-navy-300 text-sm italic">No availability this week</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="w-16 py-2 text-right pr-3 text-navy-300 font-bold" />
                {days.map(({ date, day }) => (
                  <th key={date} className="py-2 text-center font-black text-navy-500 dark:text-cream-300">
                    <div>{day?.slice(0, 3)}</div>
                    <div className="text-[10px] font-bold text-navy-300">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time) => (
                <tr key={time}>
                  <td className="py-0.5 text-right pr-3 text-[10px] text-navy-300 font-bold whitespace-nowrap">
                    {time}
                  </td>
                  {days.map(({ date }) => {
                    const status = slotMap[`${date}|${time}`];
                    if (!status) return <td key={date} className="py-0.5 px-1"><div className="h-5 rounded" /></td>;
                    return (
                      <td key={date} className="py-0.5 px-1">
                        <div
                          className={`h-5 rounded text-[9px] font-bold flex items-center justify-center gap-0.5 ${
                            status === 'available'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-400 dark:bg-red-900/20 dark:text-red-400 opacity-60'
                          }`}
                        >
                          {status === 'booked' && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-[10px] font-bold text-navy-300">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/50 inline-block" />Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/20 inline-block" />Booked
        </span>
      </div>
    </div>
  );
}

export default function TutorProfilePage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'availability'>('about');
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const verifiedSubjectTypes = useMemo(
    () => (profile?.verifiedCertifications || []) as string[],
    [profile?.verifiedCertifications]
  );

  const handleBookingClick = () => {
    if (!session) {
      signIn(undefined, { callbackUrl: window.location.pathname });
      return;
    }

    if (session.user.role !== 'STUDENT') {
      router.push('/dashboard/student');
      return;
    }

    setIsBookingModalOpen(true);
  };

  const handleSendMessage = () => {
    if (!session) {
      signIn(undefined, { callbackUrl: window.location.pathname });
      return;
    }

    router.push(`/dashboard/student?tab=messages&tutorId=${params.id}`);
  };

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch(`/api/tutors/${params.id}`, { cache: 'no-store' });
      const json = await response.json();
      setProfile(json.data || null);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, [params.id]);

  useEffect(() => {
    setIsLoading(true);
    void loadProfile().finally(() => setIsLoading(false));
  }, [loadProfile]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-200 pt-28 pb-16 dark:bg-navy-600 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-navy-100 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-cream-200 pt-28 pb-16 dark:bg-navy-600">
        <div className="page-container">
          <div className="glass-card mx-auto max-w-md p-12 text-center">
            <h1 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Tutor Not Found</h1>
            <p className="mt-3 text-sm text-navy-300 dark:text-cream-400/60">
              This tutor is unavailable, hidden, or no longer publicly visible.
            </p>
            <Link href="/tutors" className="btn-primary mt-6 inline-flex text-xs">
              Browse Tutors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const blockedDateLabels = (profile.blockedDates || []).slice(0, 6).map((override: any) =>
    new Date(override.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  );

  return (
    <div className="min-h-screen bg-cream-200 pt-24 pb-16 dark:bg-navy-600 md:pt-28">
      <div className="page-container">
        <nav className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-navy-300 dark:text-cream-400/40">
          <Link href="/tutors" className="hover:text-gold-500 transition-colors">
            Tutors
          </Link>
          <span>/</span>
          <span className="text-navy-600 dark:text-cream-200">{profile.user.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <div className="glass-card p-8">
              <div className="flex flex-col gap-8 sm:flex-row">
                <div className="relative">
                  <div className="flex h-36 w-36 items-center justify-center rounded-[40px] bg-gradient-to-br from-gold-100 to-gold-200 text-4xl font-black text-navy-600 dark:from-navy-400 dark:to-navy-500 dark:text-gold-400 shadow-glass">
                    {profile.user.avatarUrl ? (
                      <img src={profile.user.avatarUrl} alt={profile.user.name} className="h-full w-full rounded-[40px] object-cover" />
                    ) : (
                      getInitials(profile.user.name)
                    )}
                  </div>
                  {profile.isFeatured && (
                    <div className="absolute -top-2 -right-2 bg-gold-400 text-navy-600 text-[10px] font-black px-3 py-1.5 rounded-full shadow-gold-sm border-2 border-white dark:border-navy-600">
                      TOP PICK
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl lg:text-4xl font-body font-black text-navy-600 dark:text-cream-200 leading-tight tracking-tight">
                      {profile.user.name}
                    </h1>
                    {profile.verificationStatus === 'APPROVED' && (
                      <div className="p-1.5 rounded-full bg-blue-50 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-400/20 text-blue-500" title="Identity Verified">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    {profile.countryFlag && <span className="text-xl">{profile.countryFlag}</span>}
                  </div>
                  <p className="mt-2 text-lg font-medium text-navy-500 dark:text-cream-300">{profile.headline}</p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {profile.specializations.map((spec: Subject) => (
                      <span
                        key={spec}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold tracking-tight shadow-glass ${SUBJECT_COLORS[spec].bg} ${SUBJECT_COLORS[spec].text}`}
                      >
                        {SUBJECT_LABELS[spec]}
                        {verifiedSubjectTypes.includes(spec) ? ' Verified' : ''}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">Rating</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-navy-600 dark:text-cream-200">{profile.rating}</span>
                        <div className="flex text-gold-500">
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">Sessions</div>
                      <div className="text-base font-black text-navy-600 dark:text-cream-200">{profile.totalSessions}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">Experience</div>
                      <div className="text-base font-black text-navy-600 dark:text-cream-200">{profile.yearsOfExperience}y</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">Response</div>
                      <div className="text-base font-black text-navy-600 dark:text-cream-200">{formatResponseTime(profile.responseTime)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-1 p-1 bg-cream-100 dark:bg-navy-700 rounded-2xl border border-navy-100 dark:border-navy-500/20">
              {(['about', 'reviews', 'availability'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === tab
                      ? 'bg-white dark:bg-navy-600 text-gold-600 shadow-glass'
                      : 'text-navy-400 dark:text-cream-400/40 hover:text-navy-600 dark:hover:text-cream-200'
                  }`}
                >
                  {tab === 'reviews' ? `Reviews (${profile.totalReviews})` : tab}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {activeTab === 'about' && (
                <>
                  <section className="glass-card p-8">
                    <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 mb-6 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-gold-400 rounded-full" />
                      About Me
                    </h2>
                    <p className="whitespace-pre-line break-words text-navy-400 dark:text-cream-300/80 leading-relaxed">
                      {profile.about}
                    </p>

                    <div className="mt-10 pt-8 border-t border-navy-100/50 dark:border-navy-500/20 grid gap-8 sm:grid-cols-2">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 mb-3">
                          Languages
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.languages.map((language: string) => (
                            <span key={language} className="px-3 py-1 rounded-lg bg-navy-50 dark:bg-navy-600 text-[11px] font-bold text-navy-500 dark:text-cream-300">
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 mb-3">
                          Origin
                        </h4>
                        <div className="text-sm font-bold text-navy-600 dark:text-cream-200 flex items-center gap-2">
                          <span className="text-lg">{profile.countryFlag || '🌍'}</span>
                          {profile.publicCountry || 'International'}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="glass-card p-8">
                    <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 mb-8 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-sage-400 rounded-full" />
                      Certifications & Scores
                    </h2>
                    {profile.verifiedResults?.length > 0 ? (
                      <div className="grid gap-6 sm:grid-cols-2">
                        {profile.verifiedResults.map((result: any) => {
                          const isGmat = result.type === 'GMAT';
                          const isGre = result.type === 'GRE';
                          const isCfa = result.type === 'CFA';
                          const b = result.breakdown;

                          return (
                            <div key={result.id} className={`rounded-[24px] border p-6 transition-all duration-300 ${
                              result.isVerified
                                ? 'bg-sage-50/30 border-sage-100 dark:bg-sage-900/10 dark:border-sage-800 shadow-sage-sm'
                                : 'bg-blue-50/30 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800 shadow-sm'
                            }`}>
                              <div className="flex items-center justify-between gap-2 mb-6">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    isGmat ? 'bg-blue-500 text-white' : 
                                    isGre ? 'bg-emerald-500 text-white' : 
                                    'bg-amber-500 text-white'
                                  }`}>
                                    {isGmat ? (
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                                    ) : isGre ? (
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                                    ) : (
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 dark:text-cream-400/40">{result.label}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {result.isVerified ? (
                                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tight text-sage-600 dark:text-sage-400">
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                          Verified
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">Self-reported</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-black text-navy-600 dark:text-cream-200 tracking-tighter">
                                    {isGmat ? b?.total : isGre ? 'Passed' : result.scoreText.split(': ')[1] || 'Passed'}
                                  </p>
                                  {b?.totalPercentile && (
                                    <p className="text-[10px] font-bold text-navy-400 mt-1">{b.totalPercentile}th percentile</p>
                                  )}
                                </div>
                              </div>

                              {/* Breakdown Grid */}
                              {(isGmat || isGre) && b && (
                                <div className="grid grid-cols-2 gap-3">
                                  {isGmat ? (
                                    <>
                                      <StatBox label="Quant" score={b.quant} pct={b.quantPercentile} color="blue" />
                                      <StatBox label="Verbal" score={b.verbal} pct={b.verbalPercentile} color="blue" />
                                      <StatBox label="Data Insights" score={b.dataInsights} pct={b.dataInsightsPercentile} color="blue" />
                                    </>
                                  ) : (
                                    <>
                                      <StatBox label="Verbal" score={b.verbal} pct={b.verbalPercentile} color="emerald" />
                                      <StatBox label="Quant" score={b.quant} pct={b.quantPercentile} color="emerald" />
                                      <StatBox label="Writing" score={b.writing} pct={b.writingPercentile} color="emerald" />
                                    </>
                                  )}
                                </div>
                              )}

                              {!isGmat && !isGre && result.detailText && (
                                <p className="mt-4 text-xs font-bold text-navy-400 dark:text-cream-400/60 leading-relaxed italic">
                                  {result.detailText}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-12 rounded-[32px] bg-navy-50/50 dark:bg-navy-800/30 border border-dashed border-navy-100 dark:border-navy-700 text-center">
                        <svg className="mx-auto mb-4 text-navy-200" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <p className="text-sm font-bold text-navy-300 dark:text-cream-400/50 uppercase tracking-widest leading-loose">
                          No certifications have been submitted yet.
                        </p>
                      </div>
                    )}
                  </section>

                  <section className="glass-card p-8">
                    <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 mb-6 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-blue-400 rounded-full" />
                      Education
                    </h2>
                    <div className="space-y-6">
                      {profile.education?.length > 0 ? (
                        profile.education.map((education: any) => (
                          <div key={education.id} className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-sage-50 dark:bg-sage-500/10 flex items-center justify-center shrink-0">
                              <svg className="w-6 h-6 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-bold text-navy-600 dark:text-cream-200">
                                {education.degree} in {education.fieldOfStudy}
                              </div>
                              <div className="text-sm text-navy-400 dark:text-cream-400/60">
                                {education.institution} • {education.graduationYear}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-navy-300 dark:text-cream-400/50 italic">No education details added yet.</p>
                      )}
                    </div>
                  </section>
                </>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  {profile.reviews.length === 0 ? (
                    <div className="glass-card p-12 text-center text-navy-300 dark:text-cream-400/40">No reviews yet.</div>
                  ) : (
                    profile.reviews.map((review: any) => (
                      <div key={review.id} className="glass-card p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-cream-200 dark:bg-navy-500 flex items-center justify-center text-sm font-bold">
                              {getInitials(review.student.name)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{review.student.name}</div>
                              <div className="text-[10px] text-navy-300 dark:text-cream-400/60 font-bold uppercase tracking-widest">
                                {formatDate(review.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex text-gold-500 gap-0.5">
                            {[...Array(5)].map((_, index) => (
                              <svg key={index} width="12" height="12" fill={index < review.rating ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <p className="mt-4 text-sm text-navy-400 dark:text-cream-300/80 leading-relaxed italic">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                        {review.tags?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {review.tags.map((tag: any) => (
                              <span key={tag.id} className="text-[10px] font-bold text-gold-600 bg-gold-50 px-2.5 py-1 rounded-md">
                                #{tag.tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'availability' && (
                <div className="glass-card p-8">
                  <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 mb-6 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-400 rounded-full" />
                    Weekly Availability
                  </h2>
                  <AvailabilityGrid tutorId={params.id} />
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="glass-card p-7 sticky top-28 border-gold-400/30 shadow-gold-sm">
              <div className="mb-6">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <span className="text-3xl font-display font-black text-navy-600 dark:text-cream-200">
                      {profile.primaryPrice?.formatted || 'Contact for pricing'}
                    </span>
                    {profile.primaryPrice?.usesConversion && (
                      <p className="text-xs font-bold text-navy-300 mt-2">
                        Original: {profile.primaryPrice.originalFormatted}
                      </p>
                    )}
                  </div>
                  {profile.totalReviews > 0 && (
                    <div className="flex items-center gap-1 text-gold-500 font-bold text-sm">
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {profile.rating}
                    </div>
                  )}
                </div>
                {profile.pricingOptions?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.pricingOptions.map((option: any) => (
                      <span key={option.id || option.durationMinutes} className="px-3 py-1.5 rounded-full bg-navy-50 dark:bg-navy-600 text-[10px] font-black uppercase tracking-widest text-navy-500 dark:text-cream-300">
                        {option.durationMinutes}m • {option.priceDisplay?.formatted || option.price}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-8">
                <button
                  onClick={handleBookingClick}
                  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-gold-500 hover:bg-gold-600 text-navy-600 shadow-gold"
                >
                  Book a lesson
                </button>
                {profile.hasUsedTrialLesson && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-navy-300 dark:text-cream-400/40 text-center">
                    Free trial has already been used with this tutor
                  </p>
                )}
                <button
                  onClick={handleSendMessage}
                  className="w-full bg-navy-50/50 dark:bg-navy-600/50 text-navy-600 dark:text-cream-200 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-navy-100 transition-all"
                >
                  Send a message
                </button>
              </div>

              <div className="pb-6 border-b border-navy-100/50 dark:border-navy-500/20">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 mb-4">
                  Test Results & Certifications
                </h3>
                <div className="space-y-3">
                  {profile.verifiedResults?.length > 0 ? (
                    profile.verifiedResults.map((result: any) => (
                      <div key={result.id} className={`p-4 rounded-2xl border transition-all ${
                        result.isVerified
                          ? 'bg-sage-50/50 border-sage-100 dark:bg-sage-900/10 dark:border-sage-800'
                          : 'bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800'
                      }`}>
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-navy-600 dark:text-cream-200">{result.label}</span>
                            {result.isVerified ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-sage-500 text-[8px] font-black text-white uppercase tracking-tighter">Verified</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-500 text-[8px] font-black text-white uppercase tracking-tighter">Self-reported</span>
                            )}
                          </div>
                          <span className="text-xs font-black text-navy-600 dark:text-cream-200">{result.scoreText}</span>
                        </div>
                        {result.detailText && (
                          <div className="flex items-start gap-2 mt-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={result.isVerified ? 'text-sage-500' : 'text-blue-500'}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <p className={`text-[11px] font-medium leading-relaxed ${
                              result.isVerified ? 'text-sage-700/80 dark:text-sage-400' : 'text-blue-700/80 dark:text-blue-400'
                            }`}>
                              {result.detailText}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 rounded-2xl bg-navy-50/50 dark:bg-navy-800/30 border border-dashed border-navy-100 dark:border-navy-700 text-center">
                      <p className="text-xs font-bold text-navy-300 dark:text-cream-400/40 uppercase tracking-widest leading-loose">
                        No verified scores are public yet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100 text-center">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Satisfaction Guarantee</p>
              <p className="text-[11px] text-blue-500/80 leading-relaxed">
                If the first session is not a fit, booking support can help you choose a better match.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} tutor={profile} />
    </div>
  );
}
