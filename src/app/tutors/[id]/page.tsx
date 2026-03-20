'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SUBJECT_COLORS, SUBJECT_LABELS, type Subject } from '@/types';
import { formatCurrency, formatDate, formatResponseTime, getInitials } from '@/lib/utils';
import BookingModal from '@/components/student/BookingModal';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TutorProfilePage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'availability'>('about');
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const handleBookingClick = () => {
    if (!session) {
      // Redirect to sign in, then back here
      const currentPath = window.location.pathname;
      signIn(undefined, { callbackUrl: currentPath });
      return;
    }
    
    // If not a student, maybe show a message?
    // For now, just open modal as most users will be students
    setIsBookingModalOpen(true);
  };

  const handleSendMessage = () => {
    if (!session) {
      const currentPath = window.location.pathname;
      signIn(undefined, { callbackUrl: currentPath });
      return;
    }

    router.push(`/dashboard/student?tab=messages&tutorId=${params.id}`);
  };

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/tutors/${params.id}`, { cache: 'no-store' });
        const json = await response.json();
        setProfile(json.data || null);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [params.id]);

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
            <p className="mt-3 text-sm text-navy-300 dark:text-cream-400/60">This tutor is unavailable, hidden, or no longer publicly visible.</p>
            <Link href="/tutors" className="btn-primary mt-6 inline-flex text-xs">Browse Tutors</Link>
          </div>
        </div>
      </div>
    );
  }

  const verifiedCerts = profile.certifications?.filter((c: any) => c.status === 'VERIFIED') || [];
  const otherCerts = profile.certifications?.filter((c: any) => c.status !== 'VERIFIED') || [];

  return (
    <div className="min-h-screen bg-cream-200 pt-24 pb-16 dark:bg-navy-600 md:pt-28">
      <div className="page-container">
        {/* Breadcrumbs */}
        <nav className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-navy-300 dark:text-cream-400/40">
          <Link href="/tutors" className="hover:text-gold-500 transition-colors">TUTORS</Link>
          <span>/</span>
          <span className="text-navy-600 dark:text-cream-200">{profile.user.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Main Column */}
          <div className="space-y-6">
            {/* Header Card */}
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
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </div>
                    )}
                  </div>
                  <p className="mt-2 text-lg font-medium text-navy-500 dark:text-cream-300">{profile.headline}</p>
                  
                  <div className="mt-6 flex flex-wrap gap-2">
                    {profile.specializations
                      .filter((spec: Subject) => 
                        verifiedCerts.some((cert: any) => cert.type === spec)
                      )
                      .map((spec: Subject) => (
                        <span key={spec} className={`rounded-full px-4 py-1.5 text-xs font-bold tracking-tight shadow-glass ${SUBJECT_COLORS[spec].bg} ${SUBJECT_COLORS[spec].text}`}>
                          {SUBJECT_LABELS[spec]} Verified
                        </span>
                      ))}
                    {/* Fallback if no verified specializations but we want to show something? 
                        The user said "chỉ được hiện GMAT thôi" so we follow that strictly. */}
                  </div>

                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">RATING</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-navy-600 dark:text-cream-200">{profile.rating}</span>
                        <div className="flex text-gold-500">
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">SESSIONS</div>
                      <div className="text-base font-black text-navy-600 dark:text-cream-200">{profile.totalSessions}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">EXPERIENCE</div>
                      <div className="text-base font-black text-navy-600 dark:text-cream-200">{profile.yearsOfExperience}y</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">RESPONSE</div>
                      <div className="text-base font-black text-navy-600 dark:text-cream-200">{formatResponseTime(profile.responseTime)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
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

            {/* Content Sections */}
            <div className="space-y-6">
              {activeTab === 'about' && (
                <>
                  {/* About Text */}
                  <section className="glass-card p-8">
                    <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 mb-6 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-gold-400 rounded-full" />
                      About Me
                    </h2>
                    <p className="whitespace-pre-line text-navy-400 dark:text-cream-300/80 leading-relaxed">
                      {profile.about}
                    </p>
                    
                    <div className="mt-10 pt-8 border-t border-navy-100/50 dark:border-navy-500/20 grid gap-8 sm:grid-cols-2">
                       <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 mb-3">LANGUAGES</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.languages.map((lang: string) => (
                            <span key={lang} className="px-3 py-1 rounded-lg bg-navy-50 dark:bg-navy-600 text-[11px] font-bold text-navy-500 dark:text-cream-300">
                              {lang}
                            </span>
                          ))}
                        </div>
                       </div>
                       <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 mb-3">ORIGIN</h4>
                        <div className="text-sm font-bold text-navy-600 dark:text-cream-200 flex items-center gap-2">
                          <span className="text-lg">🌍</span> {profile.countryOfBirth || 'International'}
                        </div>
                       </div>
                    </div>
                  </section>

                  {/* Education & Experience */}
                  <section className="glass-card p-8">
                    <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 mb-6 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-sage-400 rounded-full" />
                      Education
                    </h2>
                    <div className="space-y-6">
                      {profile.education?.map((edu: any) => (
                        <div key={edu.id} className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-sage-50 dark:bg-sage-500/10 flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-bold text-navy-600 dark:text-cream-200">{edu.degree} in {edu.fieldOfStudy}</div>
                            <div className="text-sm text-navy-400 dark:text-cream-400/60">{edu.institution} • {edu.graduationYear}</div>
                          </div>
                        </div>
                      ))}
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
                            {[...Array(5)].map((_, i) => (
                              <svg key={i} width="12" height="12" fill={i < review.rating ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DAYS.map((day, index) => {
                      const slots = profile.availability?.filter((slot: any) => slot.dayOfWeek === index) || [];
                      return (
                        <div key={day} className="p-4 rounded-2xl bg-cream-50 dark:bg-navy-600/50 border border-navy-100/50 dark:border-navy-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black uppercase tracking-widest text-navy-500 dark:text-cream-200">{day}</span>
                            <span className={`w-2 h-2 rounded-full ${slots.length ? 'bg-green-500' : 'bg-red-500/30'}`} />
                          </div>
                          <div className="text-xs text-navy-400 dark:text-cream-300">
                            {slots.length ? (
                                <div className="space-y-1">
                                    {slots.map((slot: any, idx: number) => (
                                        <div key={idx} className="font-bold">{slot.startTime} - {slot.endTime}</div>
                                    ))}
                                </div>
                            ) : (
                                <span className="opacity-50 italic">Unavailable</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-6 text-[10px] text-center text-navy-300 dark:text-cream-400/40 font-bold uppercase tracking-widest">
                    ALL TIMES ARE SHOWN IN YOUR LOCAL TIMEZONE ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="glass-card p-7 sticky top-28 border-gold-400/30 shadow-gold-sm">
                <div className="flex items-baseline justify-between mb-6">
                    <div>
                        <span className="text-3xl font-display font-black text-navy-600 dark:text-cream-200">{formatCurrency(profile.hourlyRate)}</span>
                        <span className="text-xs font-bold text-navy-300 ml-1">/ hour</span>
                    </div>
                    {profile.totalReviews > 0 && (
                        <div className="flex items-center gap-1 text-gold-500 font-bold text-sm">
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            {profile.rating}
                        </div>
                    )}
                </div>

                <div className="space-y-3 mb-8">
                    <button 
                        onClick={handleBookingClick}
                        disabled={profile.hasUsedTrialLesson}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                          profile.hasUsedTrialLesson
                            ? 'bg-navy-100 dark:bg-navy-700 text-navy-400 dark:text-cream-400/50 cursor-not-allowed'
                            : 'bg-gold-500 hover:bg-gold-600 text-navy-600 shadow-gold'
                        }`}
                    >
                        {profile.hasUsedTrialLesson ? 'Free Trial Used' : 'Book Trial Lesson ($0)'}
                    </button>
                    {profile.hasUsedTrialLesson && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-navy-300 dark:text-cream-400/40 text-center">
                        Trial already used with this tutor
                      </p>
                    )}
                    <button 
                        onClick={handleBookingClick}
                        className="w-full bg-navy-50/50 dark:bg-navy-600/50 text-navy-600 dark:text-cream-200 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-navy-100 transition-all"
                    >
                        Buy Lesson Package
                    </button>
                </div>

                <div className="pb-6 border-b border-navy-100/50 dark:border-navy-500/20">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 mb-4">VERIFIED RESULTS</h3>
                    <div className="space-y-2">
                        {verifiedCerts.map((cert: any) => (
                            <div key={cert.id} className="flex items-center justify-between p-3 rounded-xl bg-sage-50 border border-sage-100 text-sage-700">
                                <div className="flex items-center gap-2">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span className="text-xs font-bold">{cert.levelOrVariant || cert.type}</span>
                                </div>
                                <span className="text-xs font-black">{cert.score || 'CERTIFIED'}</span>
                            </div>
                        ))}
                        {verifiedCerts.length === 0 && (
                            <p className="text-xs italic text-navy-300">No verified certificates yet.</p>
                        )}
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        onClick={handleSendMessage}
                        className="w-full flex items-center justify-center gap-2 text-xs font-bold text-navy-400 hover:text-navy-600 transition-colors"
                    >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Send a message
                    </button>
                </div>
            </div>

            {/* Refund Policy Prompt */}
            <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100 text-center">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Satisfied Guarantee</p>
                <p className="text-[11px] text-blue-500/80 leading-relaxed">
                    Not happy with your trial? We&apos;ll find you a new tutor for free.
                </p>
            </div>
          </aside>
        </div>
      </div>

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        tutor={profile}
      />
    </div>
  );
}
