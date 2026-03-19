'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SUBJECT_COLORS, SUBJECT_LABELS, type Subject } from '@/types';
import { formatCurrency, formatDate, formatResponseTime, getInitials } from '@/lib/utils';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TutorProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'availability'>('about');

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/tutors/${params.id}`, { cache: 'no-store' });
      const json = await response.json();
      setProfile(json.data || null);
    }

    void load();
  }, [params.id]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-cream-200 pt-28 pb-16 dark:bg-navy-600">
        <div className="page-container">
          <div className="glass-card mx-auto max-w-md p-12 text-center">
            <h1 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Tutor Not Found</h1>
            <p className="mt-3 text-sm text-navy-300 dark:text-cream-400/60">This tutor is unavailable, hidden, or no longer publicly visible.</p>
            <Link href="/tutors" className="btn-primary mt-6 inline-flex">Browse Tutors</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-200 pt-24 pb-16 dark:bg-navy-600 md:pt-28">
      <div className="page-container">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="glass-card p-8">
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="flex h-32 w-32 items-center justify-center rounded-[32px] bg-gradient-to-br from-gold-100 to-gold-200 text-3xl font-black text-navy-600 dark:from-navy-400 dark:to-navy-500 dark:text-gold-400">
                  {profile.user.avatarUrl ? <img src={profile.user.avatarUrl} alt={profile.user.name} className="h-full w-full rounded-[32px] object-cover" /> : getInitials(profile.user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{profile.user.name}</h1>
                    {profile.verificationStatus === 'APPROVED' ? (
                      <span className="verified-badge">Verified</span>
                    ) : (
                      <span className="unverified-badge">Unverified</span>
                    )}
                    {profile.isFeatured ? <span className="badge-gold text-[10px]">Featured</span> : null}
                  </div>
                  <p className="mt-2 text-navy-300 dark:text-cream-400/60">{profile.headline}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.specializations.map((spec: Subject) => (
                      <span key={spec} className={`rounded-full px-3 py-1 text-xs font-semibold ${SUBJECT_COLORS[spec].bg} ${SUBJECT_COLORS[spec].text}`}>
                        {SUBJECT_LABELS[spec]}
                      </span>
                    ))}
                  </div>
                  {profile.certifications?.filter((c: any) => c.status === 'VERIFIED').length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {profile.certifications.filter((c: any) => c.status === 'VERIFIED').map((c: any) => (
                        <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-sage-50 border border-sage-200 px-2.5 py-0.5 text-[10px] font-bold text-sage-700">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          {c.type} Certified
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-navy-400 dark:text-cream-300/70">
                    <span>{profile.rating} rating</span>
                    <span>{profile.totalReviews} reviews</span>
                    <span>{profile.totalSessions} sessions</span>
                    <span>{profile.yearsOfExperience} years experience</span>
                    <span>{formatResponseTime(profile.responseTime)} response</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2 rounded-2xl bg-white/70 p-2 dark:bg-navy-600/30">
              {(['about', 'reviews', 'availability'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${activeTab === tab ? 'bg-gold-400 text-navy-600' : 'text-navy-500 dark:text-cream-300'}`}>
                  {tab === 'reviews' ? `Reviews (${profile.reviews.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === 'about' ? (
              <div className="glass-card mt-6 p-8">
                <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">About</h2>
                <p className="mt-4 whitespace-pre-line text-navy-400 dark:text-cream-300/80">{profile.about}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-sm font-bold text-navy-500 dark:text-cream-300">Languages</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.languages.map((language: string) => (
                        <span key={language} className="badge-navy">{language}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-navy-500 dark:text-cream-300">Timezone</div>
                    <div className="mt-2 text-sm text-navy-400 dark:text-cream-300/70">{profile.timezone}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'reviews' ? (
              <div className="mt-6 space-y-4">
                {profile.reviews.map((review: any) => (
                  <div key={review.id} className="glass-card p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{review.student.name}</div>
                        <div className="text-xs text-navy-300 dark:text-cream-400/60">{formatDate(review.createdAt)}</div>
                      </div>
                      <div className="text-sm font-bold text-gold-600">{review.rating}/5</div>
                    </div>
                    <div className="mt-3 text-sm text-navy-400 dark:text-cream-300/80">{review.comment}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {activeTab === 'availability' ? (
              <div className="glass-card mt-6 p-8">
                <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Weekly Availability</h2>
                <div className="mt-6 space-y-3">
                  {DAYS.map((day, index) => {
                    const slots = profile.availability.filter((slot: any) => slot.dayOfWeek === index);
                    return (
                      <div key={day} className="flex items-center justify-between border-b border-navy-100/70 py-3 last:border-0 dark:border-navy-500/20">
                        <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{day}</div>
                        <div className="text-sm text-navy-400 dark:text-cream-300/70">
                          {slots.length ? slots.map((slot: any) => `${slot.startTime} - ${slot.endTime}`).join(', ') : 'Unavailable'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="glass-card h-fit p-6 lg:sticky lg:top-28">
            <div className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200">{formatCurrency(profile.hourlyRate)}</div>
            <div className="mt-1 text-sm text-navy-300 dark:text-cream-400/60">per hour</div>
            <button className="btn-primary mt-6 w-full py-3 text-sm">Book Free Trial Session</button>
            <button className="btn-outline mt-3 w-full py-3 text-sm">Message {profile.user.name.split(' ')[0]}</button>
            <div className="mt-6 rounded-3xl bg-navy-50/80 p-4 dark:bg-navy-700/20">
              <div className="text-sm font-bold text-navy-600 dark:text-cream-200">
                {profile.verificationStatus === 'APPROVED' ? 'Verified credentials' : 'Credentials'}
              </div>
              <div className="mt-3 space-y-3">
                {profile.certifications.map((item: any) => (
                  <div key={item.id} className="rounded-2xl bg-white/80 p-3 text-sm text-navy-500 dark:bg-navy-600/30 dark:text-cream-300/80">
                    <div className="font-bold text-navy-600 dark:text-cream-200">{item.levelOrVariant || item.type}</div>
                    <div className="mt-1 text-xs">Score {item.score || 'n/a'}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
