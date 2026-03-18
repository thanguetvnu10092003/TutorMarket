'use client';

import Link from 'next/link';
import { useState } from 'react';
import { tutorProfiles, users, getTutorCardData } from '@/lib/mock-data';
import { SUBJECT_LABELS, SUBJECT_COLORS, type Subject } from '@/types';
import { formatCurrency, formatResponseTime } from '@/lib/utils';

const subjects: { value: Subject; label: string }[] = [
  { value: 'CFA_LEVEL_1', label: 'CFA Level I' },
  { value: 'CFA_LEVEL_2', label: 'CFA Level II' },
  { value: 'CFA_LEVEL_3', label: 'CFA Level III' },
  { value: 'GMAT', label: 'GMAT' },
  { value: 'GRE', label: 'GRE' },
];

const stats = [
  { value: '2,500+', label: 'Students Mentored' },
  { value: '95%', label: 'Pass Rate' },
  { value: '4.9/5', label: 'Average Rating' },
  { value: '10,000+', label: 'Sessions Completed' },
];

const howItWorks = [
  {
    step: '01',
    title: 'Find Your Expert',
    description: 'Browse verified tutors filtered by exam, price, availability, and rating. Every tutor is credential-verified.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Book a Free Trial',
    description: 'Your first session with any tutor is completely free. No credit card required. Experience the quality firsthand.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Learn & Excel',
    description: 'Get personalized preparation strategies, practice problems, and expert guidance to achieve your target score.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
      </svg>
    ),
  },
  {
    step: '04',
    title: 'Achieve Your Goals',
    description: 'Join thousands of students who passed their exams on the first attempt with our expert tutors by their side.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
];

export default function HomePage() {
  const [searchSubject, setSearchSubject] = useState('');
  const featuredTutors = tutorProfiles
    .filter(t => t.isFeatured && t.verificationStatus === 'APPROVED')
    .map(getTutorCardData);

  return (
    <div className="min-h-screen">
      {/* ─── HERO SECTION ─────────────────────────────── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-600 via-navy-600 to-navy-500 dark:from-navy-700 dark:via-navy-700 dark:to-navy-600" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gold-400/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-sage-400/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-400/10 rounded-full blur-3xl" />
        </div>

        <div className="page-container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-400/10 border border-gold-400/20 mb-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse-soft" />
              <span className="text-sm font-medium text-gold-300">Free first session with every tutor</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-cream-200 leading-[1.1] mb-6 animate-slide-up">
              Master Your Exam with{' '}
              <span className="gradient-text">World-Class</span>{' '}
              Tutors
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-cream-400/70 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Connect with verified CFA, GMAT, and GRE experts who have walked the path. 
              Personalized strategies, proven results, and your first session is free.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10">
                <select
                  value={searchSubject}
                  onChange={(e) => setSearchSubject(e.target.value)}
                  className="flex-1 px-4 py-3.5 rounded-xl bg-white/10 border border-white/10 text-cream-200 
                             placeholder:text-cream-400/50 focus:outline-none focus:ring-2 focus:ring-gold-400/50
                             appearance-none cursor-pointer text-sm font-medium"
                >
                  <option value="" className="bg-navy-600 text-cream-200">Select an exam...</option>
                  {subjects.map((s) => (
                    <option key={s.value} value={s.value} className="bg-navy-600 text-cream-200">
                      {s.label}
                    </option>
                  ))}
                </select>
                <Link
                  href={searchSubject ? `/tutors?subject=${searchSubject}` : '/tutors'}
                  className="btn-primary py-3.5 px-8 text-sm whitespace-nowrap"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Find Tutors
                </Link>
              </div>

              {/* Quick Links */}
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                <span className="text-xs text-cream-400/50">Popular:</span>
                {subjects.slice(0, 4).map((s) => (
                  <Link
                    key={s.value}
                    href={`/tutors?subject=${s.value}`}
                    className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cream-300/70 
                               hover:bg-gold-400/20 hover:text-gold-300 hover:border-gold-400/30 transition-all duration-200"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
                  className="fill-cream-200 dark:fill-navy-600"/>
          </svg>
        </div>
      </section>

      {/* ─── STATS BAR ──────────────────────────────────── */}
      <section className="relative -mt-2 bg-cream-200 dark:bg-navy-600">
        <div className="page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-12">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="text-center group"
              >
                <div className="text-3xl md:text-4xl font-display font-bold text-navy-600 dark:text-cream-200 mb-1 group-hover:text-gold-500 transition-colors duration-300">
                  {stat.value}
                </div>
                <div className="text-sm text-navy-300 dark:text-cream-400/60 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED TUTORS ────────────────────────────── */}
      <section className="section-padding bg-cream-200 dark:bg-navy-600">
        <div className="page-container">
          <div className="text-center mb-14">
            <span className="badge-gold mb-4 inline-block">Featured Experts</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-600 dark:text-cream-200 mb-4">
              Learn from the Best
            </h2>
            <p className="text-navy-300 dark:text-cream-400/60 max-w-2xl mx-auto">
              Our top-rated tutors have helped thousands of students achieve their dream scores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {featuredTutors.map((tutor) => (
              <Link
                key={tutor.id}
                href={`/tutors/${tutor.id}`}
                className="glass-card p-6 group cursor-pointer"
              >
                {/* Featured Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="badge-gold text-[11px]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-gold-500">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    Featured
                  </span>
                  <span className="verified-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Verified
                  </span>
                </div>

                {/* Avatar & Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-100 to-gold-200 dark:from-navy-400 dark:to-navy-500 flex items-center justify-center text-xl font-bold text-navy-600 dark:text-gold-400 overflow-hidden flex-shrink-0 ring-2 ring-gold-400/20 group-hover:ring-gold-400/50 transition-all">
                    {tutor.avatarUrl ? (
                      <img src={tutor.avatarUrl} alt={tutor.name} className="w-full h-full object-cover" />
                    ) : (
                      tutor.name.split(' ').map(n => n[0]).join('')
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-navy-600 dark:text-cream-200 group-hover:text-gold-500 transition-colors truncate">
                      {tutor.name}
                    </h3>
                    <p className="text-sm text-navy-300 dark:text-cream-400/60 line-clamp-2 mt-0.5 leading-snug">
                      {tutor.headline}
                    </p>
                  </div>
                </div>

                {/* Subject Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tutor.specializations.map((spec) => (
                    <span
                      key={spec}
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${SUBJECT_COLORS[spec].bg} ${SUBJECT_COLORS[spec].text}`}
                    >
                      {SUBJECT_LABELS[spec]}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 pt-4 border-t border-navy-100/50 dark:border-navy-400/30">
                  <div className="stat-chip text-xs">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gold-400">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    {tutor.rating}
                  </div>
                  <div className="stat-chip text-xs">
                    {tutor.totalSessions} sessions
                  </div>
                  <div className="stat-chip text-xs ml-auto">
                    <span className="font-bold text-navy-600 dark:text-cream-200">{formatCurrency(tutor.hourlyRate)}</span>/hr
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/tutors" className="btn-outline">
              Browse All Tutors
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────── */}
      <section className="section-padding bg-white dark:bg-navy-700">
        <div className="page-container">
          <div className="text-center mb-14">
            <span className="badge-sage mb-4 inline-block">Simple Process</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-600 dark:text-cream-200 mb-4">
              How TutorMarket Works
            </h2>
            <p className="text-navy-300 dark:text-cream-400/60 max-w-2xl mx-auto">
              From finding your perfect tutor to acing your exam — we&apos;ve streamlined every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, i) => (
              <div
                key={i}
                className="relative group"
              >
                {/* Connector Line (desktop) */}
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-gold-400/30 to-transparent" />
                )}

                <div className="flex flex-col items-center text-center">
                  {/* Step Number + Icon */}
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-cream-100 dark:bg-navy-500 flex items-center justify-center text-gold-500 group-hover:bg-gold-50 dark:group-hover:bg-gold-900/20 group-hover:text-gold-600 transition-all duration-300 group-hover:scale-110">
                      {item.icon}
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gold-400 text-navy-600 text-xs font-bold flex items-center justify-center shadow-gold">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-navy-600 dark:text-cream-200 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-navy-300 dark:text-cream-400/60 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRUST & SUBJECTS ───────────────────────────── */}
      <section className="section-padding bg-cream-200 dark:bg-navy-600">
        <div className="page-container">
          <div className="text-center mb-14">
            <span className="badge-navy mb-4 inline-block">Exam Specializations</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-600 dark:text-cream-200 mb-4">
              Expert Tutors for Every Exam
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CFA */}
            <div className="glass-card p-8 text-center group">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 mb-2">CFA Program</h3>
              <p className="text-sm text-navy-300 dark:text-cream-400/60 mb-4">Level I, II, and III preparation with CFA charterholders</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/tutors?subject=CFA_LEVEL_1" className="text-xs px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                  Level I
                </Link>
                <Link href="/tutors?subject=CFA_LEVEL_2" className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                  Level II
                </Link>
                <Link href="/tutors?subject=CFA_LEVEL_3" className="text-xs px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
                  Level III
                </Link>
              </div>
            </div>

            {/* GMAT */}
            <div className="glass-card p-8 text-center group">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <h3 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 mb-2">GMAT Prep</h3>
              <p className="text-sm text-navy-300 dark:text-cream-400/60 mb-4">Comprehensive GMAT preparation with 700+ scorers</p>
              <Link href="/tutors?subject=GMAT" className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                Browse GMAT Tutors
              </Link>
            </div>

            {/* GRE */}
            <div className="glass-card p-8 text-center group">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <h3 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 mb-2">GRE Prep</h3>
              <p className="text-sm text-navy-300 dark:text-cream-400/60 mb-4">Verbal and quantitative expertise with 330+ scorers</p>
              <Link href="/tutors?subject=GRE" className="text-xs px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                Browse GRE Tutors
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-600 via-navy-600 to-navy-500 dark:from-navy-700 dark:via-navy-700 dark:to-navy-600" />
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-64 h-64 bg-gold-400/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-sage-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="page-container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-cream-200 mb-6">
              Ready to{' '}
              <span className="gradient-text">Ace Your Exam</span>?
            </h2>
            <p className="text-lg text-cream-400/70 mb-10 max-w-xl mx-auto">
              Join thousands of students who transformed their preparation with expert guidance. Your first session is always free.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register" className="btn-primary text-base py-4 px-8">
                Start for Free
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
              <Link href="/become-a-tutor" className="inline-flex items-center text-cream-300/70 hover:text-gold-400 transition-colors font-medium">
                Or become a tutor
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
