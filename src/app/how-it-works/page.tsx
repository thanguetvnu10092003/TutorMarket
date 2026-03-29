import Link from 'next/link';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how PrepPass connects you with verified CFA, GMAT, and GRE tutors. Free trial session, flexible scheduling, proven results.',
};

const studentSteps = [
  { step: '1', title: 'Browse Verified Tutors', desc: 'Search by exam type, price range, availability, and language. Every tutor is credential-verified by our team.', icon: '🔍' },
  { step: '2', title: 'Book a Free Session', desc: 'Your first session with any tutor is completely free. No credit card required. Try before you commit.', icon: '📅' },
  { step: '3', title: 'Learn & Practice', desc: 'Get personalized strategies, review sessions, practice problems, and expert guidance tailored to your needs.', icon: '📚' },
  { step: '4', title: 'Ace Your Exam', desc: 'Track your progress, review session recordings, and walk into exam day with confidence.', icon: '🏆' },
];

const tutorSteps = [
  { step: '1', title: 'Create Your Profile', desc: 'Showcase your expertise, qualifications, and teaching philosophy. Set your hourly rate and availability.', icon: '✏️' },
  { step: '2', title: 'Submit Credentials', desc: 'Upload your certificates, score reports, and transcripts. Our team verifies within 48 hours.', icon: '📄' },
  { step: '3', title: 'Get Matched', desc: 'Once verified, your profile goes live. Students find you through search and book sessions directly.', icon: '🤝' },
  { step: '4', title: 'Teach & Earn', desc: 'Conduct sessions on your schedule. Get paid weekly via Stripe with transparent commission structure.', icon: '💰' },
];

const faqs = [
  { q: 'How much does the first session cost?', a: 'Your first session with any tutor is completely free. This lets you experience the quality of tutoring before committing. From session 2 onward, you pay the tutor\'s posted hourly rate.' },
  { q: 'How are tutors verified?', a: 'Every tutor must submit their credentials (certificates, score reports, transcripts) which are manually reviewed by our team. Only tutors who meet our strict quality standards receive the verified badge.' },
  { q: 'What is the platform commission?', a: 'We charge a 20% platform fee from session 2 onward, capped at $500 total per student-tutor relationship. After the cap is reached, you pay 0% commission on subsequent sessions.' },
  { q: 'Can I get a refund for canceled sessions?', a: 'Yes. Cancellations more than 24 hours before the session receive a full refund. Cancellations within 24 hours receive a 50% refund. No-shows by tutors always receive a full refund.' },
  { q: 'How do tutors get paid?', a: 'Tutors are paid via Stripe Connect with weekly rolling payouts. Instant payouts are also available for an additional fee.' },
];

export default async function HowItWorksPage() {
  const session = await getServerSession(authOptions);
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
      ? 'Open Tutor Dashboard'
      : role === 'STUDENT'
        ? 'Find Tutors'
        : 'Open Dashboard';

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-24 md:pt-28">
      {/* Header */}
      <section className="section-padding bg-white dark:bg-navy-700">
        <div className="page-container text-center">
          <span className="badge-gold mb-4 inline-block">How It Works</span>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-navy-600 dark:text-cream-200 mb-4">
            Simple, Transparent, Effective
          </h1>
          <p className="text-lg text-navy-300 dark:text-cream-400/60 max-w-2xl mx-auto">
            Whether you&apos;re a student seeking expert guidance or a tutor ready to share your knowledge, getting started takes just minutes.
          </p>
        </div>
      </section>

      {/* For Students */}
      <section className="section-padding">
        <div className="page-container">
          <div className="text-center mb-12">
            <span className="badge-sage mb-3 inline-block">For Students</span>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-navy-600 dark:text-cream-200">Your Path to Success</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {studentSteps.map((s, i) => (
              <div key={i} className="glass-card p-6 text-center relative">
                <div className="text-3xl mb-4">{s.icon}</div>
                <span className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gold-400 text-navy-600 text-xs font-bold flex items-center justify-center">{s.step}</span>
                <h3 className="font-bold text-navy-600 dark:text-cream-200 mb-2">{s.title}</h3>
                <p className="text-sm text-navy-300 dark:text-cream-400/60 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Tutors */}
      <section className="section-padding bg-white dark:bg-navy-700">
        <div className="page-container">
          <div className="text-center mb-12">
            <span className="badge-navy mb-3 inline-block">For Tutors</span>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-navy-600 dark:text-cream-200">Share Your Expertise</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {tutorSteps.map((s, i) => (
              <div key={i} className="glass-card p-6 text-center relative">
                <div className="text-3xl mb-4">{s.icon}</div>
                <span className="absolute top-4 right-4 w-7 h-7 rounded-full bg-sage-400 text-white text-xs font-bold flex items-center justify-center">{s.step}</span>
                <h3 className="font-bold text-navy-600 dark:text-cream-200 mb-2">{s.title}</h3>
                <p className="text-sm text-navy-300 dark:text-cream-400/60 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding">
        <div className="page-container max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-navy-600 dark:text-cream-200">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="glass-card p-6 group cursor-pointer">
                <summary className="flex items-center justify-between font-bold text-navy-600 dark:text-cream-200 list-none">
                  {faq.q}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-navy-300 group-open:rotate-180 transition-transform flex-shrink-0 ml-4">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </summary>
                <p className="mt-4 text-sm text-navy-400 dark:text-cream-300/80 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-navy-600 dark:bg-navy-700">
        <div className="page-container text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-cream-200 mb-4">Ready to Get Started?</h2>
          <p className="text-cream-400/70 mb-8 max-w-xl mx-auto">Join thousands who have transformed their exam preparation.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={primaryHref} className="btn-primary py-3 px-8">{primaryLabel}</Link>
            {!session?.user && (
              <Link href="/become-a-tutor" className="btn-outline border-cream-300/30 text-cream-300 hover:bg-cream-300/10 py-3 px-8">Become a Tutor</Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
