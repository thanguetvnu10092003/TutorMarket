import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Become a Tutor',
  description: 'Share your CFA, GMAT, or GRE expertise. Set your own rate, teach on your schedule, earn more with PrepPass.',
};

const perks = [
  { title: 'Set Your Own Rate', desc: 'You decide what your time is worth. Top tutors earn $150-200+ per hour.', icon: '💰' },
  { title: 'Flexible Schedule', desc: 'Teach when it works for you. Set recurring availability or one-off sessions.', icon: '🕐' },
  { title: 'Global Students', desc: 'Connect with motivated students worldwide preparing for CFA, GMAT, and GRE.', icon: '🌍' },
  { title: 'Transparent Fees', desc: '20% platform fee capped at $500 per student relationship. After that, you keep 100%.', icon: '📊' },
  { title: 'Quick Payouts', desc: 'Weekly payouts via Stripe Connect. Instant payout option available.', icon: '⚡' },
  { title: 'Verified Badge', desc: 'Stand out with credential verification. Build trust with prospective students.', icon: '✅' },
];

const earnings = [
  { rate: 100, sessions: 20, monthly: '$2,000', afterFees: '$1,600' },
  { rate: 150, sessions: 15, monthly: '$2,250', afterFees: '$1,800' },
  { rate: 200, sessions: 10, monthly: '$2,000', afterFees: '$1,600' },
];

export default function BecomeATutorPage() {
  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600">
      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sage-400 via-sage-500 to-navy-600" />
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 bg-gold-400/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 left-20 w-48 h-48 bg-cream-200/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>

        <div className="page-container relative z-10 text-center">
          <span className="badge bg-white/10 text-white border border-white/20 mb-6 inline-block">For Experts</span>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 leading-tight">
            Turn Your Expertise<br />Into{' '}
            <span className="gradient-text">Income</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
            Join a premium marketplace of CFA charterholders, GMAT 700+ scorers, and GRE experts. 
            Set your rate, teach on your schedule, impact lives.
          </p>
          <Link href="/auth/register" className="btn-primary text-base py-4 px-10">
            Apply as a Tutor
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* Perks */}
      <section className="section-padding">
        <div className="page-container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-600 dark:text-cream-200 mb-4">Why Tutor on Our Platform?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {perks.map((p, i) => (
              <div key={i} className="glass-card p-6 text-center group">
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{p.icon}</div>
                <h3 className="font-bold text-navy-600 dark:text-cream-200 mb-2">{p.title}</h3>
                <p className="text-sm text-navy-300 dark:text-cream-400/60">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings */}
      <section className="section-padding bg-white dark:bg-navy-700">
        <div className="page-container max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-navy-600 dark:text-cream-200 mb-3">Earning Potential</h2>
            <p className="text-navy-300 dark:text-cream-400/60">Estimated monthly earnings based on hourly rate and sessions per week</p>
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-navy-50 dark:bg-navy-500">
                  <th className="text-left p-4 text-sm font-bold text-navy-600 dark:text-cream-200">Hourly Rate</th>
                  <th className="text-left p-4 text-sm font-bold text-navy-600 dark:text-cream-200">Sessions/Month</th>
                  <th className="text-left p-4 text-sm font-bold text-navy-600 dark:text-cream-200">Gross</th>
                  <th className="text-left p-4 text-sm font-bold text-navy-600 dark:text-cream-200">Your Earnings*</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((e, i) => (
                  <tr key={i} className="border-t border-navy-100/50 dark:border-navy-400/30">
                    <td className="p-4 text-sm text-navy-500 dark:text-cream-300 font-medium">${e.rate}/hr</td>
                    <td className="p-4 text-sm text-navy-500 dark:text-cream-300">{e.sessions}</td>
                    <td className="p-4 text-sm text-navy-500 dark:text-cream-300">{e.monthly}</td>
                    <td className="p-4 text-sm font-bold text-gold-600 dark:text-gold-400">{e.afterFees}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="p-4 text-xs text-navy-300 dark:text-cream-400/50 border-t border-navy-100/50 dark:border-navy-400/30">
              *After 20% platform fee (first $500 only). Free trial sessions not counted.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-navy-600 dark:bg-navy-700">
        <div className="page-container text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-cream-200 mb-4">Ready to Start Teaching?</h2>
          <p className="text-cream-400/70 mb-8 max-w-xl mx-auto">Applications are reviewed within 48 hours. Join our community of expert tutors today.</p>
          <Link href="/auth/register" className="btn-primary text-base py-4 px-10">Apply Now</Link>
        </div>
      </section>
    </div>
  );
}
