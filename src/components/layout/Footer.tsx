'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { FaTwitter, FaLinkedinIn, FaInstagram } from 'react-icons/fa';

const footerLinks = {
  platform: [
    { href: '/tutors', label: 'Find Tutors' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/become-a-tutor', label: 'Become a Tutor' },
  ],
  subjects: [
    { href: '/tutors?subject=CFA_LEVEL_1', label: 'CFA Level I' },
    { href: '/tutors?subject=CFA_LEVEL_2', label: 'CFA Level II' },
    { href: '/tutors?subject=CFA_LEVEL_3', label: 'CFA Level III' },
    { href: '/tutors?subject=GMAT', label: 'GMAT Prep' },
    { href: '/tutors?subject=GRE', label: 'GRE Prep' },
  ],
  company: [
    { href: '#', label: 'About Us' },
    { href: '#', label: 'Careers' },
    { href: '#', label: 'Blog' },
    { href: '#', label: 'Contact' },
  ],
  legal: [
    { href: '#', label: 'Privacy Policy' },
    { href: '#', label: 'Terms of Service' },
    { href: '#', label: 'Refund Policy' },
  ],
};

const trustBadges = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    label: 'Verified Tutors',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
    label: 'Secure Payments',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    label: 'Free First Session',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    label: '4.9★ Average Rating',
  },
];

export default function Footer() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isTutor = session?.user?.role === 'TUTOR';
  const visiblePlatformLinks = session?.user
    ? footerLinks.platform.filter((link) => {
        if (link.href === '/become-a-tutor') return false;
        if (isTutor && link.href === '/tutors') return false;
        return true;
      })
    : footerLinks.platform;

  if (pathname.startsWith('/onboarding') || pathname.startsWith('/auth/')) return null;

  return (
    <footer className="relative bg-navy-700 dark:bg-navy-800 text-cream-300/80 overflow-hidden">
      {/* Decorative top border with gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />

      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-gold-400/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-0 w-96 h-96 bg-sage-400/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-navy-500/20 rounded-full blur-3xl" />
      </div>

      {/* Trust Badges Strip */}
      <div className="relative border-b border-navy-500/40">
        <div className="page-container py-5">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-2.5 text-cream-400/60 hover:text-gold-400 transition-colors duration-300 group"
              >
                <span className="text-gold-400/70 group-hover:text-gold-400 transition-colors duration-300 group-hover:scale-110 transform inline-block">
                  {badge.icon}
                </span>
                <span className="text-xs font-semibold tracking-wide whitespace-nowrap">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="relative page-container">
        <div className="py-16 grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">

          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold group-hover:shadow-[0_4px_24px_rgba(201,168,76,0.5)] transition-all duration-300 group-hover:scale-105">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy-700">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/>
                </svg>
              </div>
              <span className="text-lg font-display font-bold text-cream-200 group-hover:text-gold-300 transition-colors duration-300">
                Prep<span className="text-gold-400">Pass</span>
              </span>
            </Link>

            <p className="text-sm leading-relaxed text-cream-400/50 mb-7">
              The premium marketplace for CFA, GMAT, and GRE exam preparation. Connect with verified, world-class tutors.
            </p>

            {/* Social Links */}
            <div className="flex gap-3">
              {[
                { icon: <FaTwitter size={15} />, label: 'Twitter', href: '#' },
                { icon: <FaLinkedinIn size={15} />, label: 'LinkedIn', href: '#' },
                { icon: <FaInstagram size={15} />, label: 'Instagram', href: '#' },
              ].map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-navy-500/70 border border-navy-400/30 hover:bg-gold-400/15 hover:border-gold-400/40 hover:text-gold-400 flex items-center justify-center text-cream-400/50 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_16px_rgba(201,168,76,0.2)]"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="label-sm text-cream-100 mb-6 relative inline-block">
              Platform
              <span className="absolute -bottom-1.5 left-0 w-6 h-0.5 bg-gold-400 rounded-full" />
            </h4>
            <ul className="space-y-3.5">
              {visiblePlatformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-cream-400/55 hover:text-gold-400 transition-all duration-200"
                  >
                    <span className="w-0 h-px bg-gold-400 transition-all duration-300 group-hover:w-3 rounded-full" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Subject Links */}
          <div>
            <h4 className="label-sm text-cream-100 mb-6 relative inline-block">
              Subjects
              <span className="absolute -bottom-1.5 left-0 w-6 h-0.5 bg-gold-400 rounded-full" />
            </h4>
            <ul className="space-y-3.5">
              {footerLinks.subjects.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-cream-400/55 hover:text-gold-400 transition-all duration-200"
                  >
                    <span className="w-0 h-px bg-gold-400 transition-all duration-300 group-hover:w-3 rounded-full" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="label-sm text-cream-100 mb-6 relative inline-block">
              Company
              <span className="absolute -bottom-1.5 left-0 w-6 h-0.5 bg-gold-400 rounded-full" />
            </h4>
            <ul className="space-y-3.5">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-cream-400/55 hover:text-gold-400 transition-all duration-200"
                  >
                    <span className="w-0 h-px bg-gold-400 transition-all duration-300 group-hover:w-3 rounded-full" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="label-sm text-cream-100 mb-6 relative inline-block">
              Legal
              <span className="absolute -bottom-1.5 left-0 w-6 h-0.5 bg-gold-400 rounded-full" />
            </h4>
            <ul className="space-y-3.5">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-cream-400/55 hover:text-gold-400 transition-all duration-200"
                  >
                    <span className="w-0 h-px bg-gold-400 transition-all duration-300 group-hover:w-3 rounded-full" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-navy-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-cream-400/35">
            © {new Date().getFullYear()} PrepPass. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-cream-400/35">
            <span className="w-1.5 h-1.5 rounded-full bg-sage-400/70 animate-pulse" />
            Built for students who refuse to settle for average.
          </div>
        </div>
      </div>
    </footer>
  );
}
