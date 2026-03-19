'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SUBJECT_COLORS, SUBJECT_LABELS, type Subject } from '@/types';
import { formatCurrency, formatResponseTime } from '@/lib/utils';

const subjects: { value: Subject | ''; label: string }[] = [
  { value: '', label: 'All Subjects' },
  { value: 'CFA_LEVEL_1', label: 'CFA Level I' },
  { value: 'CFA_LEVEL_2', label: 'CFA Level II' },
  { value: 'CFA_LEVEL_3', label: 'CFA Level III' },
  { value: 'GMAT', label: 'GMAT' },
  { value: 'GRE', label: 'GRE' },
];

const sortOptions = [
  { value: 'default', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'experience', label: 'Most Experienced' },
  { value: 'sessions', label: 'Most Sessions' },
];

function TutorsContent() {
  const searchParams = useSearchParams();
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('default');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (subject) params.set('subject', subject);
      if (minRating) params.set('minRating', String(minRating));
      if (sortBy !== 'default') params.set('sortBy', sortBy);

      try {
        const response = await fetch(`/api/tutors?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const json = await response.json();
        setResults(json.data || []);
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [minRating, sortBy, subject]);

  return (
    <div className="min-h-screen bg-cream-200 pt-24 pb-16 dark:bg-navy-600 md:pt-28">
      <div className="page-container">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200 md:text-4xl">Find Your Perfect Tutor</h1>
          <p className="mt-2 text-navy-300 dark:text-cream-400/60">{loading ? 'Loading tutors...' : `${results.length} tutors available`}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="glass-card h-fit p-6">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-navy-500 dark:text-cream-300">Filters</h2>
            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-500 dark:text-cream-300">Subject</label>
                <select value={subject} onChange={(event) => setSubject(event.target.value)} className="input-field text-sm">
                  {subjects.map((item) => (
                    <option key={item.label} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-navy-500 dark:text-cream-300">Minimum Rating</label>
                <div className="flex gap-2">
                  {[0, 4, 4.5, 4.8].map((value) => (
                    <button
                      key={value}
                      onClick={() => setMinRating(value)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold ${minRating === value ? 'bg-gold-400 text-navy-600' : 'bg-navy-50 text-navy-500 dark:bg-navy-700/20 dark:text-cream-300'}`}
                    >
                      {value === 0 ? 'Any' : `${value}+`}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  setSubject('');
                  setMinRating(0);
                  setSortBy('default');
                }}
                className="text-sm font-semibold text-gold-600"
              >
                Reset all filters
              </button>
            </div>
          </aside>

          <div>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-navy-300 dark:text-cream-400/60">
                Showing <span className="font-bold text-navy-600 dark:text-cream-200">{results.length}</span> tutors
              </p>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm text-navy-600 dark:border-navy-500/40 dark:bg-navy-600/30 dark:text-cream-200">
                {sortOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {results.map((tutor) => (
                <Link key={tutor.id} href={`/tutors/${tutor.id}`} className="glass-card block p-6">
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-gold-100 to-gold-200 text-2xl font-black text-navy-600 dark:from-navy-400 dark:to-navy-500 dark:text-gold-400">
                      {tutor.avatarUrl ? <img src={tutor.avatarUrl} alt={tutor.name} className="h-full w-full rounded-3xl object-cover" /> : tutor.name.split(' ').map((part: string) => part[0]).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold text-navy-600 dark:text-cream-200">{tutor.name}</h3>
                            {tutor.verificationStatus === 'APPROVED' ? (
                              <span className="verified-badge">Verified</span>
                            ) : (
                              <span className="unverified-badge">Unverified</span>
                            )}
                            {tutor.isFeatured ? <span className="badge-gold text-[10px]">Featured</span> : null}
                          </div>
                          <p className="mt-1 text-sm text-navy-300 dark:text-cream-400/60">{tutor.headline}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-navy-600 dark:text-cream-200">{formatCurrency(tutor.hourlyRate)}</div>
                          <div className="text-xs text-navy-300 dark:text-cream-400/60">per hour</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tutor.specializations.map((spec: Subject) => (
                          <span key={spec} className={`rounded-full px-3 py-1 text-[11px] font-semibold ${SUBJECT_COLORS[spec].bg} ${SUBJECT_COLORS[spec].text}`}>
                            {SUBJECT_LABELS[spec]}
                          </span>
                        ))}
                      </div>
                      {tutor.verifiedCertifications?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {tutor.verifiedCertifications.map((certType: string) => (
                            <span key={certType} className="inline-flex items-center gap-1 rounded-full bg-sage-50 border border-sage-200 px-2.5 py-0.5 text-[10px] font-bold text-sage-700">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                              {certType} Certified
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-navy-400 dark:text-cream-300/70">
                        <span>{tutor.rating} rating</span>
                        <span>{tutor.totalSessions} sessions</span>
                        <span>{tutor.yearsOfExperience} years experience</span>
                        <span>{formatResponseTime(tutor.responseTime)} response</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {!loading && results.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <div className="text-lg font-bold text-navy-600 dark:text-cream-200">No tutors found</div>
                  <div className="mt-2 text-sm text-navy-300 dark:text-cream-400/60">Try a broader subject or a lower minimum rating.</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TutorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-200 dark:bg-navy-600" />}>
      <TutorsContent />
    </Suspense>
  );
}
