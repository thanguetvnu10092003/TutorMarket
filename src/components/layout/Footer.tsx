'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

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

export default function Footer() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isTutor = session?.user?.role === 'TUTOR';
  const visiblePlatformLinks = session?.user
    ? footerLinks.platform.filter((link) => {
        if (link.href === '/become-a-tutor') {
          return false;
        }

        if (isTutor && link.href === '/tutors') {
          return false;
        }

        return true;
      })
    : footerLinks.platform;

  if (pathname.startsWith('/onboarding') || pathname.startsWith('/auth/')) return null;

  return (
    <footer className="bg-navy-600 dark:bg-navy-700 text-cream-300/80 border-t border-navy-400/30">
      <div className="page-container">
        {/* Main Footer */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy-600">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/>
                </svg>
              </div>
              <span className="text-lg font-display font-bold text-cream-200">
                Prep<span className="text-gold-400">Pass</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-cream-400/60 mb-6">
              The premium marketplace for CFA, GMAT, and GRE exam preparation. Connect with verified, world-class tutors.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              {['twitter', 'linkedin', 'instagram'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-navy-500 hover:bg-navy-400 flex items-center justify-center transition-colors duration-200"
                  aria-label={social}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cream-400/60">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          <div>
            <h4 className="text-sm font-bold text-cream-200 mb-4 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-3">
              {visiblePlatformLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-gold-400 transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-cream-200 mb-4 uppercase tracking-wider">Subjects</h4>
            <ul className="space-y-3">
              {footerLinks.subjects.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-gold-400 transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-cream-200 mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-gold-400 transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-cream-200 mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-gold-400 transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-navy-500/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream-400/40">
            © {new Date().getFullYear()} PrepPass. All rights reserved.
          </p>
          <p className="text-xs text-cream-400/40">
            Built for students who refuse to settle for average.
          </p>
        </div>
      </div>
    </footer>
  );
}
