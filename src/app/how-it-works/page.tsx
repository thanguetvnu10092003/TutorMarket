'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

/* ─── Data ────────────────────────────────────────────── */

const studentSteps = [
  {
    step: '01',
    title: 'Browse Verified Tutors',
    desc: 'Search by exam type, price range, availability, and language. Every tutor is credential-verified by our team.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    color: 'gold',
    detail: 'Filter by CFA Level I/II/III, GMAT, or GRE. Sort by rating, price, or response time.',
  },
  {
    step: '02',
    title: 'Book a Free Session',
    desc: 'Your first session with any tutor is completely free. No credit card required. Try before you commit.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    color: 'sage',
    detail: 'Pick a time slot directly from the tutor\'s calendar. Instant confirmation sent to your inbox.',
  },
  {
    step: '03',
    title: 'Learn & Practice',
    desc: 'Get personalized strategies, review sessions, practice problems, and expert guidance tailored to your needs.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
    color: 'gold',
    detail: 'Access shared notes, practice sets, and session recordings from your student dashboard.',
  },
  {
    step: '04',
    title: 'Ace Your Exam',
    desc: 'Track your progress, review session recordings, and walk into exam day with full confidence.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    color: 'sage',
    detail: 'Join 2,500+ students who passed their exams on the first attempt with PrepPass.',
  },
];

const tutorSteps = [
  {
    step: '01',
    title: 'Create Your Profile',
    desc: 'Showcase your expertise, qualifications, and teaching philosophy. Set your hourly rate and availability.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    color: 'sage',
    detail: 'Add your bio, teaching style, subject expertise, and set flexible availability slots.',
  },
  {
    step: '02',
    title: 'Submit Credentials',
    desc: 'Upload your certificates, score reports, and transcripts. Our team verifies within 48 hours.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    color: 'gold',
    detail: 'Accepted credentials: CFA charter, GMAT 700+ score report, GRE 320+ report, university transcripts.',
  },
  {
    step: '03',
    title: 'Get Discovered',
    desc: 'Once verified, your profile goes live. Students find you through search and book sessions directly.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    color: 'sage',
    detail: 'Featured tutors get priority placement in search results and on the homepage.',
  },
  {
    step: '04',
    title: 'Teach & Earn',
    desc: 'Conduct sessions on your schedule. Get paid weekly via Stripe with a transparent commission structure.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    color: 'gold',
    detail: 'Weekly Stripe payouts, 0% commission after $500 cap per student-tutor relationship.',
  },
];

const faqs = [
  {
    q: 'How much does the first session cost?',
    a: 'Your first session with any tutor is completely free. This lets you experience the quality of tutoring before committing. From session 2 onward, you pay the tutor\'s posted hourly rate.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    q: 'How are tutors verified?',
    a: 'Every tutor must submit their credentials (certificates, score reports, transcripts) which are manually reviewed by our team. Only tutors who meet our strict quality standards receive the verified badge.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    q: 'What is the platform commission?',
    a: 'We charge a 20% platform fee from session 2 onward, capped at $500 total per student-tutor relationship. After the cap is reached, you pay 0% commission on subsequent sessions.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  {
    q: 'Can I get a refund for canceled sessions?',
    a: 'Yes. Cancellations more than 24 hours before the session receive a full refund. Cancellations within 24 hours receive a 50% refund. No-shows by tutors always receive a full refund.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.8"/>
      </svg>
    ),
  },
  {
    q: 'How do tutors get paid?',
    a: 'Tutors are paid via Stripe Connect with weekly rolling payouts. Instant payouts are also available for an additional fee.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
];

const trustStats = [
  { value: '2,500+', label: 'Students Mentored', icon: '🎓' },
  { value: '95%', label: 'Exam Pass Rate', icon: '✅' },
  { value: '4.9★', label: 'Average Rating', icon: '⭐' },
  { value: '48h', label: 'Tutor Verification', icon: '⚡' },
];

/* ─── Helpers ──────────────────────────────────────────── */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Sub-components ───────────────────────────────────── */

function StepCard({
  step, title, desc, icon, color, detail, index, accentGold,
}: {
  step: string; title: string; desc: string;
  icon: React.ReactNode; color: string; detail: string;
  index: number; accentGold: boolean;
}) {
  const { ref, visible } = useInView(0.1);
  const isLast = index === 3;

  return (
    <div
      ref={ref}
      className="relative flex gap-5 md:gap-7"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(36px)',
        transition: `opacity 0.6s ease ${index * 0.12}s, transform 0.6s ease ${index * 0.12}s`,
      }}
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0">
        {/* Icon circle */}
        <div
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center z-10 flex-shrink-0 shadow-lg
            ${accentGold
              ? 'bg-gradient-to-br from-gold-400 to-gold-500 text-navy-700'
              : 'bg-gradient-to-br from-sage-400 to-sage-500 text-white'}
            `}
          style={{
            boxShadow: accentGold
              ? '0 8px 24px rgba(201,168,76,0.45)'
              : '0 8px 24px rgba(74,124,111,0.45)',
          }}
        >
          {icon}
          {/* Step badge */}
          <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-navy-600 dark:bg-navy-800 text-cream-200 text-[10px] font-black flex items-center justify-center border-2 border-cream-200 dark:border-navy-500">
            {step}
          </span>
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div className="w-px flex-1 mt-3 mb-0 min-h-[48px]">
            <div
              className={`w-full h-full rounded-full ${accentGold ? 'bg-gradient-to-b from-gold-400/60 to-sage-400/30' : 'bg-gradient-to-b from-sage-400/60 to-gold-400/30'}`}
              style={{
                transform: visible ? 'scaleY(1)' : 'scaleY(0)',
                transformOrigin: 'top',
                transition: `transform 0.5s ease ${index * 0.12 + 0.3}s`,
              }}
            />
          </div>
        )}
      </div>

      {/* Content card */}
      <div
        className="group mb-8 flex-1 p-6 rounded-2xl border transition-all duration-400 ease-out cursor-default
          bg-white dark:bg-navy-600/50
          border-cream-300/70 dark:border-navy-400/30
          hover:border-gold-400/40 dark:hover:border-gold-400/25
          hover:shadow-[0_8px_40px_rgba(201,168,76,0.10)]
          hover:-translate-y-1"
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-bold text-navy-600 dark:text-cream-200 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors duration-300">
            {title}
          </h3>
        </div>
        <p className="text-sm text-navy-300 dark:text-cream-400/60 leading-relaxed mb-3">
          {desc}
        </p>
        <div
          className="flex items-center gap-2 text-xs font-medium overflow-hidden"
          style={{
            maxHeight: '0px',
            opacity: 0,
            transition: 'max-height 0.35s ease, opacity 0.35s ease',
          }}
        >
        </div>
        <p className="text-xs text-navy-200/70 dark:text-cream-400/40 border-t border-cream-200/60 dark:border-navy-400/20 pt-3 mt-1 leading-relaxed group-hover:text-navy-400 dark:group-hover:text-cream-400/60 transition-colors duration-300">
          {detail}
        </p>
        {/* Bottom accent */}
        <div
          className={`absolute bottom-0 left-6 right-6 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-400
            ${accentGold ? 'bg-gradient-to-r from-transparent via-gold-400 to-transparent' : 'bg-gradient-to-r from-transparent via-sage-400 to-transparent'}`}
        />
      </div>
    </div>
  );
}

function FaqItem({ q, a, icon, index }: { q: string; a: string; icon: React.ReactNode; index: number }) {
  const [open, setOpen] = useState(false);
  const { ref, visible } = useInView(0.1);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${index * 0.08}s, transform 0.5s ease ${index * 0.08}s`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 group
          ${open
            ? 'bg-navy-600 border-navy-500/60 shadow-[0_8px_32px_rgba(10,22,40,0.25)]'
            : 'bg-white dark:bg-navy-600/40 border-cream-300/60 dark:border-navy-400/30 hover:border-gold-400/40 hover:shadow-[0_4px_20px_rgba(201,168,76,0.08)]'
          }`}
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300
              ${open ? 'bg-gold-400/20 text-gold-400' : 'bg-cream-100 dark:bg-navy-500 text-navy-400 dark:text-cream-400/60 group-hover:text-gold-500 group-hover:bg-gold-50 dark:group-hover:bg-gold-900/20'}`}
            >
              {icon}
            </span>
            <span className={`font-semibold text-sm md:text-base transition-colors duration-300
              ${open ? 'text-cream-200' : 'text-navy-600 dark:text-cream-200'}`}>
              {q}
            </span>
          </div>
          <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300
            ${open ? 'bg-gold-400/20 text-gold-400 rotate-180' : 'bg-cream-100 dark:bg-navy-500 text-navy-300 dark:text-cream-400/50'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </div>

        <div
          style={{
            maxHeight: open ? '300px' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <p className={`mt-4 text-sm leading-relaxed pl-12 pr-2 transition-colors duration-300
            ${open ? 'text-cream-400/75' : 'text-navy-400 dark:text-cream-300/80'}`}>
            {a}
          </p>
        </div>
      </button>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */

export default function HowItWorksPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const primaryHref = !session?.user
    ? '/auth/register'
    : role === 'TUTOR'
      ? '/dashboard/tutor'
      : role === 'STUDENT'
        ? '/tutors'
        : `/dashboard/${role?.toLowerCase() || 'student'}`;
  const primaryLabel = !session?.user
    ? 'Find a Tutor'
    : role === 'TUTOR'
      ? 'Open Dashboard'
      : 'Find Tutors';

  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-24 md:pt-28">

      {/* ─── HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 md:py-28">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-600 via-navy-500 to-navy-600 dark:from-navy-700 dark:via-navy-600 dark:to-navy-700" />
        {/* Dot grid */}
        <div className="absolute inset-0 bg-dot-grid bg-[length:24px_24px] opacity-25 pointer-events-none" />
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 right-20 w-72 h-72 bg-gold-400/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 left-20 w-64 h-64 bg-sage-400/12 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gold-400/8 rounded-full blur-3xl" />
        </div>
        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L60 72C120 64 240 48 360 44C480 40 600 48 720 52C840 56 960 56 1080 52C1200 48 1320 48 1380 52L1440 56V80H0Z"
              className="fill-cream-200 dark:fill-navy-600"/>
          </svg>
        </div>

        <div className="relative z-10 page-container text-center">
          <div
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(28px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/15 border border-gold-400/25 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse-soft" />
              <span className="text-xs font-semibold text-gold-300 tracking-wider uppercase">How PrepPass Works</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-cream-200 leading-[1.1] mb-6">
              Simple.{' '}
              <span className="gradient-text">Transparent.</span>
              <br />Effective.
            </h1>
            <p className="text-lg md:text-xl text-cream-400/65 max-w-2xl mx-auto leading-relaxed mb-10">
              Whether you&apos;re a student seeking expert guidance or a tutor ready to share your knowledge,
              getting started takes just minutes.
            </p>

            {/* Quick jump buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="#for-students"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-400 text-navy-700 text-sm font-semibold hover:bg-gold-300 transition-all duration-200 shadow-gold hover:shadow-[0_4px_20px_rgba(201,168,76,0.5)] hover:-translate-y-0.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                </svg>
                For Students
              </a>
              <a
                href="#for-tutors"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-cream-200 text-sm font-semibold hover:bg-white/15 transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                For Tutors
              </a>
              <a
                href="#faq"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-cream-200 text-sm font-semibold hover:bg-white/15 transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                FAQ
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST STATS ──────────────────────────────── */}
      <section className="bg-cream-200 dark:bg-navy-600 py-10">
        <div className="page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trustStats.map((stat, i) => (
              <div
                key={stat.label}
                className="group flex flex-col items-center text-center p-5 rounded-2xl bg-white dark:bg-navy-500/40 border border-cream-300/60 dark:border-navy-400/25 hover:border-gold-400/40 hover:shadow-[0_4px_24px_rgba(201,168,76,0.10)] transition-all duration-300 hover:-translate-y-1"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <span className="text-2xl mb-2">{stat.icon}</span>
                <div className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200 group-hover:text-gold-500 dark:group-hover:text-gold-400 transition-colors duration-300">
                  {stat.value}
                </div>
                <div className="text-xs text-navy-300 dark:text-cream-400/50 font-medium mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOR STUDENTS ─────────────────────────────── */}
      <section id="for-students" className="section-padding bg-cream-200 dark:bg-navy-600">
        <div className="page-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

            {/* Left sticky label */}
            <div className="lg:sticky lg:top-28 pt-2">
              <span className="badge-sage mb-4 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse" />
                For Students
              </span>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-600 dark:text-cream-200 mb-5 leading-tight">
                Your Path to{' '}
                <span className="relative inline-block">
                  Exam Success
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-gold-400 to-gold-300 rounded-full" />
                </span>
              </h2>
              <p className="text-navy-300 dark:text-cream-400/60 leading-relaxed mb-8">
                Four clear steps from finding your tutor to walking into exam day with confidence.
                Your first session is always free — no strings attached.
              </p>
              <Link
                href={primaryHref}
                className="inline-flex items-center gap-2 btn-primary"
              >
                {primaryLabel}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>

              {/* Highlight pill */}
              <div className="mt-6 inline-flex items-center gap-2 text-xs text-navy-300 dark:text-cream-400/55">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold-400">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Free first session · No credit card required
              </div>
            </div>

            {/* Right timeline */}
            <div className="space-y-0">
              {studentSteps.map((s, i) => (
                <StepCard key={i} {...s} index={i} accentGold={i % 2 === 0} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative h-px bg-gradient-to-r from-transparent via-gold-400/30 to-transparent mx-8 md:mx-20" />

      {/* ─── FOR TUTORS ───────────────────────────────── */}
      <section id="for-tutors" className="section-padding bg-white dark:bg-navy-700 relative overflow-hidden">
        {/* Subtle bg decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-sage-400/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gold-400/5 rounded-full blur-3xl" />
        </div>

        <div className="page-container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

            {/* Right timeline (reversed order on mobile) */}
            <div className="order-2 lg:order-1 space-y-0">
              {tutorSteps.map((s, i) => (
                <StepCard key={i} {...s} index={i} accentGold={i % 2 !== 0} />
              ))}
            </div>

            {/* Left sticky label */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-28 pt-2">
              <span className="badge-navy mb-4 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-navy-400 animate-pulse" />
                For Tutors
              </span>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-600 dark:text-cream-200 mb-5 leading-tight">
                Share Your{' '}
                <span className="relative inline-block">
                  Expertise
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-sage-400 to-sage-300 rounded-full" />
                </span>
              </h2>
              <p className="text-navy-300 dark:text-cream-400/60 leading-relaxed mb-8">
                Join our community of verified experts. Set your own rate, choose your schedule,
                and get paid weekly with transparent commissions.
              </p>
              <Link
                href="/become-a-tutor"
                className="inline-flex items-center gap-2 btn-outline"
              >
                Apply to Teach
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>

              {/* Commission note */}
              <div className="mt-6 p-4 rounded-xl bg-sage-50 dark:bg-sage-900/20 border border-sage-200/70 dark:border-sage-500/20">
                <p className="text-xs text-sage-700 dark:text-sage-300 leading-relaxed">
                  <span className="font-bold">0% commission</span> after $500 cap per student-tutor relationship.
                  Weekly Stripe payouts with full transparency.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────── */}
      <section id="faq" className="section-padding bg-cream-200 dark:bg-navy-600">
        <div className="page-container max-w-3xl">

          {/* Header */}
          <div className="text-center mb-14">
            <span className="badge-gold mb-4 inline-flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-600 dark:text-cream-200 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-navy-300 dark:text-cream-400/60">
              Everything you need to know about PrepPass. Can&apos;t find an answer?{' '}
              <a href="#" className="text-gold-500 hover:text-gold-400 underline underline-offset-2 transition-colors duration-200">
                Contact us
              </a>
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} {...faq} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        {/* Animated gradient background */}
        <div
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background: 'linear-gradient(135deg, #0A1628, #0F2847, #0A1628, #1E3A6E)',
            backgroundSize: '300% 300%',
          }}
        />
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-8 right-16 w-64 h-64 bg-gold-400/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-8 left-16 w-56 h-56 bg-sage-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
        {/* Dot grid */}
        <div className="absolute inset-0 bg-dot-grid bg-[length:24px_24px] opacity-20 pointer-events-none" />

        <div className="relative z-10 page-container text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/15 border border-gold-400/25 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse-soft" />
            <span className="text-xs font-semibold text-gold-300 tracking-wider uppercase">Ready to Begin?</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-display font-bold text-cream-200 mb-6 leading-tight">
            Start Your{' '}
            <span className="gradient-text">Journey Today</span>
          </h2>
          <p className="text-lg text-cream-400/65 mb-10 max-w-xl mx-auto leading-relaxed">
            Join thousands who have transformed their exam preparation with expert guidance.
            Your first session is completely free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={primaryHref}
              className="btn-primary text-base py-4 px-8 hover:shadow-[0_8px_32px_rgba(201,168,76,0.5)] transition-shadow duration-300"
            >
              {primaryLabel}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            {!session?.user && (
              <Link
                href="/become-a-tutor"
                className="inline-flex items-center gap-2 text-cream-300/70 hover:text-gold-400 transition-colors duration-200 font-medium"
              >
                Become a Tutor
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            )}
          </div>

          {/* Social proof */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-cream-400/40">
            <span className="flex items-center gap-1.5">
              <span className="text-gold-400/70">★★★★★</span>
              4.9 average rating
            </span>
            <span className="w-px h-4 bg-cream-400/20" />
            <span>2,500+ students mentored</span>
            <span className="w-px h-4 bg-cream-400/20" />
            <span>95% first-attempt pass rate</span>
          </div>
        </div>
      </section>
    </div>
  );
}
