'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// ─── Data ──────────────────────────────────────────────

const perks = [
  {
    title: 'Set Your Own Rate',
    desc: 'You decide what your time is worth. Top tutors earn $150–200+ per hour.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    accent: 'gold',
  },
  {
    title: 'Flexible Schedule',
    desc: 'Teach when it works for you. Set recurring availability or one-off sessions.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    accent: 'sage',
  },
  {
    title: 'Global Students',
    desc: 'Connect with motivated students worldwide preparing for CFA, GMAT, and GRE.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
    accent: 'gold',
  },
  {
    title: 'Transparent Fees',
    desc: '20% platform fee capped at $500 per student relationship. After that, you keep 100%.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    accent: 'sage',
  },
  {
    title: 'Quick Payouts',
    desc: 'Weekly payouts via Stripe Connect. Instant payout option available.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    accent: 'gold',
  },
  {
    title: 'Verified Badge',
    desc: 'Stand out with credential verification. Build trust with prospective students.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    accent: 'sage',
  },
];

const earnings = [
  { rate: 100, sessions: 20, monthly: '$2,000', afterFees: '$1,600' },
  { rate: 150, sessions: 15, monthly: '$2,250', afterFees: '$1,800' },
  { rate: 200, sessions: 10, monthly: '$2,000', afterFees: '$1,600' },
];

const steps = [
  { label: 'Create Profile', icon: '✏️' },
  { label: 'Submit Credentials', icon: '📄' },
  { label: 'Get Verified', icon: '✅' },
  { label: 'Start Earning', icon: '💰' },
];

// ─── Helpers ───────────────────────────────────────────

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function PerkCard({ perk, index }: { perk: typeof perks[0]; index: number }) {
  const { ref, visible } = useInView();
  const isGold = perk.accent === 'gold';
  return (
    <div
      ref={ref}
      className="shimmer-hover group relative p-6 rounded-2xl border transition-all duration-500 cursor-default overflow-hidden
        bg-white dark:bg-navy-600/50
        border-cream-300/60 dark:border-navy-400/30
        hover:border-gold-400/40 dark:hover:border-gold-400/25
        hover:shadow-[0_8px_40px_rgba(201,168,76,0.10)]
        hover:-translate-y-1.5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.55s ease ${index * 0.08}s, transform 0.55s ease ${index * 0.08}s, box-shadow 0.3s ease, border-color 0.3s ease`,
      }}
    >
      {/* Icon */}
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-400 group-hover:scale-110
        ${isGold
          ? 'bg-gold-50 dark:bg-gold-900/20 text-gold-500 group-hover:bg-gold-100 dark:group-hover:bg-gold-900/30 group-hover:shadow-[0_4px_20px_rgba(201,168,76,0.2)]'
          : 'bg-sage-50 dark:bg-sage-900/20 text-sage-500 group-hover:bg-sage-100 dark:group-hover:bg-sage-900/30 group-hover:shadow-[0_4px_20px_rgba(74,124,111,0.2)]'
        }`}
      >
        {perk.icon}
      </div>

      <h3 className="font-bold text-navy-600 dark:text-cream-200 mb-2 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors duration-300">
        {perk.title}
      </h3>
      <p className="text-sm text-navy-300 dark:text-cream-400/60 leading-relaxed">
        {perk.desc}
      </p>

      {/* Bottom accent */}
      <div className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-400
        ${isGold ? 'bg-gradient-to-r from-transparent via-gold-400 to-transparent' : 'bg-gradient-to-r from-transparent via-sage-400 to-transparent'}`}
      />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────

export default function BecomeATutorPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => { setTimeout(() => setHeroVisible(true), 80); }, []);

  const earningsRef = useInView();
  const stepsRef = useInView();

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600">

      {/* ─── HERO ─────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-32 overflow-hidden">
        {/* Layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage-500 via-sage-400 to-navy-600" />
        <div className="absolute inset-0 bg-dot-grid bg-[length:24px_24px] opacity-20 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-16 right-16 w-72 h-72 bg-gold-400/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-16 left-16 w-56 h-56 bg-cream-200/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-sage-300/10 rounded-full blur-3xl" />
        </div>
        {/* Gold top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L60 70C120 60 240 40 360 35C480 30 600 40 720 45C840 50 960 50 1080 45C1200 40 1320 40 1380 42L1440 44V80H0Z"
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse-soft" />
              <span className="text-xs font-semibold text-white/80 tracking-wider uppercase">For Experts</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 leading-tight">
              Turn Your Expertise<br />Into{' '}
              <span className="gradient-text">Income</span>
            </h1>
            <p className="text-lg md:text-xl text-white/65 max-w-2xl mx-auto mb-10 leading-relaxed">
              Join a premium marketplace of CFA charterholders, GMAT 700+ scorers, and GRE experts.
              Set your rate, teach on your schedule, impact lives.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register"
                className="btn-primary text-base py-4 px-10 hover:shadow-gold-lg transition-shadow duration-300 group"
              >
                Apply as a Tutor
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2 group-hover:translate-x-1 transition-transform duration-200">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 font-medium text-sm"
              >
                See how it works
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </a>
            </div>

            {/* Trust pills */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {['48h verification', 'Weekly Stripe payouts', '0% fee after $500 cap', 'Global student base'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-xs text-white/60 px-3 py-1.5 rounded-full bg-white/8 border border-white/12">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gold-400">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── MINI STEPS ───────────────────────────────── */}
      <section id="how-it-works" className="py-10 bg-cream-200 dark:bg-navy-600">
        <div className="page-container">
          <div
            ref={stepsRef.ref}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {steps.map((step, i) => (
              <div
                key={step.label}
                className="flex flex-col items-center text-center p-4 rounded-2xl bg-white dark:bg-navy-500/40 border border-cream-300/60 dark:border-navy-400/25 hover:border-gold-400/40 hover:shadow-[0_4px_20px_rgba(201,168,76,0.10)] transition-all duration-300 hover:-translate-y-1"
                style={{
                  opacity: stepsRef.visible ? 1 : 0,
                  transform: stepsRef.visible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s, box-shadow 0.3s ease`,
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-gold-50 dark:bg-gold-900/20 flex items-center justify-center text-lg mb-3">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-navy-400 dark:text-cream-400/50 mb-0.5 label-xs">Step {i + 1}</div>
                <div className="text-sm font-semibold text-navy-600 dark:text-cream-200">{step.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PERKS ────────────────────────────────────── */}
      <section className="section-padding bg-cream-200 dark:bg-navy-600 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gold-400/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sage-400/5 rounded-full blur-3xl" />
        </div>
        <div className="page-container relative z-10">
          <div className="text-center mb-14">
            <span className="badge-sage mb-4 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse" />
              Why PrepPass
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-600 dark:text-cream-200 mb-4">
              Why Tutor on Our Platform?
            </h2>
            <p className="text-navy-300 dark:text-cream-400/60 max-w-2xl mx-auto">
              We built PrepPass for tutors who take their craft seriously. Everything you need to run a premium teaching business.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {perks.map((p, i) => <PerkCard key={p.title} perk={p} index={i} />)}
          </div>
        </div>
      </section>

      {/* ─── EARNINGS ─────────────────────────────────── */}
      <section className="section-padding bg-white dark:bg-navy-700 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
        </div>
        <div className="page-container max-w-3xl relative z-10">
          <div
            ref={earningsRef.ref}
            style={{
              opacity: earningsRef.visible ? 1 : 0,
              transform: earningsRef.visible ? 'translateY(0)' : 'translateY(28px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            <div className="text-center mb-10">
              <span className="badge-gold mb-4 inline-flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                Earning Potential
              </span>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-navy-600 dark:text-cream-200 mb-3">
                Real Earning Potential
              </h2>
              <p className="text-navy-300 dark:text-cream-400/60">
                Estimated monthly earnings based on hourly rate and sessions per week
              </p>
            </div>

            <div className="rounded-2xl border border-cream-300/60 dark:border-navy-400/30 overflow-hidden shadow-[0_4px_32px_rgba(10,22,40,0.06)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.2)]">
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-600 dark:bg-navy-500">
                    <th className="text-left p-4 text-sm font-bold text-cream-200">Hourly Rate</th>
                    <th className="text-left p-4 text-sm font-bold text-cream-200">Sessions/Month</th>
                    <th className="text-left p-4 text-sm font-bold text-cream-200">Gross</th>
                    <th className="text-left p-4 text-sm font-bold text-gold-400">Your Earnings*</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((e, i) => (
                    <tr
                      key={i}
                      className="border-t border-cream-200/60 dark:border-navy-400/30 group hover:bg-gold-50/50 dark:hover:bg-gold-900/10 transition-colors duration-200"
                    >
                      <td className="p-4 text-sm text-navy-500 dark:text-cream-300 font-medium group-hover:text-navy-700 dark:group-hover:text-cream-100 transition-colors duration-200">${e.rate}/hr</td>
                      <td className="p-4 text-sm text-navy-400 dark:text-cream-300/80">{e.sessions}</td>
                      <td className="p-4 text-sm text-navy-400 dark:text-cream-300/80">{e.monthly}</td>
                      <td className="p-4 text-sm font-bold text-gold-600 dark:text-gold-400 group-hover:text-gold-700 dark:group-hover:text-gold-300 transition-colors duration-200">
                        <span className="flex items-center gap-1.5">
                          {e.afterFees}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gold-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                          </svg>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-cream-50/50 dark:bg-navy-600/30 border-t border-cream-200/60 dark:border-navy-400/30">
                <p className="text-xs text-navy-300 dark:text-cream-400/50">
                  *After 20% platform fee (first $500 only). Free trial sessions not counted. Earnings may vary.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background: 'linear-gradient(135deg, #23413A, #0F2847, #23413A, #3D6A5E)',
            backgroundSize: '300% 300%',
          }}
        />
        <div className="absolute inset-0 bg-dot-grid bg-[length:24px_24px] opacity-15 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 right-20 w-64 h-64 bg-gold-400/12 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 left-20 w-56 h-56 bg-sage-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 page-container text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse-soft" />
            <span className="text-xs font-semibold text-white/75 tracking-wider uppercase">Ready to Start?</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-display font-bold text-cream-200 mb-6 leading-tight">
            Ready to Start <span className="gradient-text">Teaching?</span>
          </h2>
          <p className="text-cream-400/65 mb-10 max-w-xl mx-auto leading-relaxed text-lg">
            Applications are reviewed within 48 hours. Join our community of expert tutors today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="btn-primary text-base py-4 px-10 hover:shadow-gold-lg transition-shadow duration-300 group"
            >
              Apply Now — It&apos;s Free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2 group-hover:translate-x-1 transition-transform duration-200">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            <Link
              href="/how-it-works#for-tutors"
              className="inline-flex items-center gap-2 text-cream-300/65 hover:text-gold-400 transition-colors duration-200 font-medium"
            >
              Learn more about the process
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-cream-400/35">
            <span>Top tutors earn $3,000+/month</span>
            <span className="w-px h-4 bg-cream-400/20" />
            <span>Verified in 48 hours</span>
            <span className="w-px h-4 bg-cream-400/20" />
            <span>Weekly Stripe payouts</span>
          </div>
        </div>
      </section>
    </div>
  );
}
