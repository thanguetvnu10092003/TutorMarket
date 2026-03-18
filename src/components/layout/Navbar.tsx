'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/providers/ThemeProvider';
import { getInitials } from '@/lib/utils';

const navLinks = [
  { href: '/tutors', label: 'Find Tutors' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/become-a-tutor', label: 'Become a Tutor' },
];

export default function Navbar() {
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (pathname.startsWith('/onboarding') || pathname.startsWith('/auth/')) return null;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/80 dark:bg-navy-600/80 backdrop-blur-xl shadow-glass border-b border-navy-100/50 dark:border-navy-400/30'
          : 'bg-transparent'
      }`}
    >
      <div className="page-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold transition-transform duration-300 group-hover:scale-110">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy-600">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/>
              </svg>
            </div>
            <span className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 tracking-tight">
              Tutor<span className="text-gold-400">Market</span>
            </span>
          </Link>

          {/* Desktop Links */}
          {!pathname.startsWith('/dashboard') && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-navy-400 dark:text-cream-300 
                           hover:text-navy-600 dark:hover:text-cream-100 hover:bg-navy-50 dark:hover:bg-navy-500
                           transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
            </div>
          )}

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-navy-400 dark:text-cream-300 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all duration-200"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl text-navy-400 dark:text-cream-300 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all duration-200"
                aria-label="Notifications"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gold-400 rounded-full text-[10px] font-bold text-navy-600 flex items-center justify-center">
                  2
                </span>
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-navy-500 rounded-2xl shadow-glass-lg border border-navy-100 dark:border-navy-400 animate-slide-down overflow-hidden">
                  <div className="p-4 border-b border-navy-100 dark:border-navy-400">
                    <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    <div className="p-3 hover:bg-navy-50/50 dark:hover:bg-navy-400/30 transition-colors cursor-pointer border-l-2 border-gold-400">
                      <p className="text-sm font-semibold text-navy-600 dark:text-cream-200">Session Confirmed</p>
                      <p className="text-xs text-navy-300 dark:text-navy-200 mt-0.5">Your session with Dr. James Wright on Mar 20 at 2:00 PM has been confirmed.</p>
                      <p className="text-xs text-gold-500 mt-1">2 days ago</p>
                    </div>
                    <div className="p-3 hover:bg-navy-50/50 dark:hover:bg-navy-400/30 transition-colors cursor-pointer border-l-2 border-gold-400">
                      <p className="text-sm font-semibold text-navy-600 dark:text-cream-200">New Message</p>
                      <p className="text-xs text-navy-300 dark:text-navy-200 mt-0.5">Dr. James Wright sent you a message.</p>
                      <p className="text-xs text-gold-500 mt-1">Just now</p>
                    </div>
                  </div>
                  <div className="p-3 border-t border-navy-100 dark:border-navy-400">
                    <Link href={`/dashboard/${session?.user?.role?.toLowerCase() || 'student'}`} className="text-xs font-semibold text-gold-500 hover:text-gold-600 transition-colors">
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {session ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 pl-3 rounded-full border border-navy-100 dark:border-navy-400 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all"
                >
                  <span className="text-xs font-bold text-navy-600 dark:text-cream-200 hidden lg:block">
                    {session.user?.name}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gold-400 flex items-center justify-center text-navy-600 text-xs font-bold overflow-hidden border-2 border-gold-200 dark:border-navy-400">
                    {session.user?.image ? (
                      <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(session.user?.name || '')
                    )}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-navy-500 rounded-2xl shadow-glass-lg border border-navy-100 dark:border-navy-400 overflow-hidden animate-slide-down">
                    <div className="p-4 border-b border-navy-100 dark:border-navy-400 bg-navy-50/30 dark:bg-navy-600/30">
                      <p className="text-sm font-bold text-navy-600 dark:text-cream-200 truncate">{session.user?.name}</p>
                      <p className="text-[11px] text-navy-300 dark:text-cream-400 truncate mt-0.5">{session.user?.email}</p>
                      <span className="inline-block mt-2 badge-gold text-[10px]">{session.user?.role}</span>
                    </div>
                    <div className="p-2">
                      <Link 
                        href={`/dashboard/${session.user?.role?.toLowerCase()}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-600 dark:text-cream-200 hover:bg-gold-50 dark:hover:bg-navy-400 transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        Dashboard
                      </Link>
                      <Link 
                        href="/settings"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-600 dark:text-cream-200 hover:bg-gold-50 dark:hover:bg-navy-400 transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        Settings
                      </Link>
                      <button 
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-navy-400 dark:text-cream-300 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all"
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMobileMenuOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              ) : (
                <><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-6 animate-slide-down">
            {!pathname.startsWith('/dashboard') && (
              <div className="flex flex-col gap-1 mb-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-navy-400 dark:text-cream-300 hover:text-navy-600 dark:hover:text-cream-100 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all duration-200"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-navy-300 dark:text-cream-400">Theme</span>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-navy-400 dark:text-cream-300 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
              </div>
              <Link href="/auth/register" className="btn-primary text-sm py-2.5 text-center">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
