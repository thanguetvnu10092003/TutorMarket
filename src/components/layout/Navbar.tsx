'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/providers/ThemeProvider';
import { formatRelativeTime, getInitials } from '@/lib/utils';

const navLinks = [
  { href: '/tutors', label: 'Find Tutors' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/become-a-tutor', label: 'Become a Tutor' },
];

type FavoriteTutor = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  headline?: string | null;
  savedAt: string;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
};

export default function Navbar() {
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [favoriteTutors, setFavoriteTutors] = useState<FavoriteTutor[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const isStudent = session?.user?.role === 'STUDENT';
  const dashboardHref = `/dashboard/${session?.user?.role?.toLowerCase() || 'student'}`;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setShowFavorites(false);
    setShowNotifications(false);
    setShowUserMenu(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!session?.user) {
      setFavoriteTutors([]);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let ignore = false;

    async function loadNavbarData() {
      setNotificationsLoading(true);
      setFavoritesLoading(isStudent);

      try {
        const requests: Promise<Response>[] = [fetch('/api/notifications?limit=8', { cache: 'no-store' })];

        if (isStudent) {
          requests.push(fetch('/api/student/favorites', { cache: 'no-store' }));
        }

        const [notificationsRes, favoritesRes] = await Promise.all(requests);

        if (!notificationsRes.ok) {
          throw new Error('Failed to load notifications');
        }

        const notificationsJson = await notificationsRes.json();

        if (!ignore) {
          setNotifications(notificationsJson.data || []);
          setUnreadCount(notificationsJson.unreadCount || 0);
        }

        if (isStudent && favoritesRes) {
          if (!favoritesRes.ok) {
            throw new Error('Failed to load favorites');
          }

          const favoritesJson = await favoritesRes.json();

          if (!ignore) {
            setFavoriteTutors(favoritesJson.data || []);
          }
        }
      } catch (error) {
        if (!ignore) {
          console.error('Navbar data load error:', error);
        }
      } finally {
        if (!ignore) {
          setNotificationsLoading(false);
          setFavoritesLoading(false);
        }
      }
    }

    void loadNavbarData();

    return () => {
      ignore = true;
    };
  }, [isStudent, session?.user]);

  useEffect(() => {
    if (!showNotifications || unreadCount === 0) {
      return;
    }

    let ignore = false;

    async function markNotificationsRead() {
      try {
        const response = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error('Failed to mark notifications as read');
        }

        const json = await response.json();

        if (!ignore) {
          setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
          setUnreadCount(json.unreadCount || 0);
        }
      } catch (error) {
        if (!ignore) {
          console.error('Mark notifications read error:', error);
        }
      }
    }

    void markNotificationsRead();

    return () => {
      ignore = true;
    };
  }, [notifications, showNotifications, unreadCount]);

  if (pathname.startsWith('/onboarding') || pathname.startsWith('/auth/')) {
    return null;
  }

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
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold transition-transform duration-300 group-hover:scale-110">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy-600">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
              </svg>
            </div>
            <span className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 tracking-tight">
              Tutor<span className="text-gold-400">Market</span>
            </span>
          </Link>

          {!pathname.startsWith('/dashboard') && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-navy-400 dark:text-cream-300 hover:text-navy-600 dark:hover:text-cream-100 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-navy-400 dark:text-cream-300 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all duration-200"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>

            {isStudent && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowFavorites((current) => !current);
                    setShowNotifications(false);
                    setShowUserMenu(false);
                  }}
                  className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-navy-500 dark:text-cream-300 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all duration-200"
                  aria-label="Favorite tutors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={favoriteTutors.length > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s-6.716-4.35-9.192-8.192C.93 9.893 2.087 5.8 5.5 4.5A5.47 5.47 0 0 1 12 6.09 5.47 5.47 0 0 1 18.5 4.5c3.413 1.3 4.57 5.393 2.692 8.308C18.716 16.65 12 21 12 21z" />
                  </svg>
                  <span className="hidden lg:block">Saved</span>
                  {favoriteTutors.length > 0 && (
                    <span className="min-w-5 h-5 px-1 rounded-full bg-gold-400 text-[10px] font-black text-navy-600 flex items-center justify-center">
                      {favoriteTutors.length > 9 ? '9+' : favoriteTutors.length}
                    </span>
                  )}
                </button>

                {showFavorites && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-navy-500 rounded-2xl shadow-glass-lg border border-navy-100 dark:border-navy-400 animate-slide-down overflow-hidden">
                    <div className="p-4 border-b border-navy-100 dark:border-navy-400 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">Saved Tutors</h3>
                      {favoriteTutors.length > 0 && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-gold-600">
                          {favoriteTutors.length} saved
                        </span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {favoritesLoading ? (
                        <div className="p-6 text-center text-sm text-navy-400 dark:text-cream-300/70">
                          Loading saved tutors...
                        </div>
                      ) : favoriteTutors.length > 0 ? (
                        favoriteTutors.slice(0, 6).map((tutor) => (
                          <div key={tutor.id} className="px-4 py-3 border-b border-navy-100/60 dark:border-navy-400/20 last:border-b-0">
                            <div className="flex items-start gap-3">
                              <Link href={`/tutors/${tutor.id}`} className="w-10 h-10 rounded-full bg-gold-50 dark:bg-navy-600 overflow-hidden flex items-center justify-center text-xs font-bold text-navy-600 dark:text-cream-200 shrink-0">
                                {tutor.avatarUrl ? (
                                  <img src={tutor.avatarUrl} alt={tutor.name} className="w-full h-full object-cover" />
                                ) : (
                                  getInitials(tutor.name)
                                )}
                              </Link>
                              <div className="min-w-0 flex-1">
                                <Link href={`/tutors/${tutor.id}`} className="text-sm font-semibold text-navy-600 dark:text-cream-200 hover:text-gold-600 transition-colors block truncate">
                                  {tutor.name}
                                </Link>
                                <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-0.5 line-clamp-2">
                                  {tutor.headline || 'Saved from Find Tutors'}
                                </p>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
                                    {formatRelativeTime(tutor.savedAt)}
                                  </span>
                                  <Link href={`/dashboard/student?tab=messages&tutorId=${tutor.id}`} className="text-[10px] font-black uppercase tracking-widest text-navy-500 hover:text-gold-600 transition-colors">
                                    Message
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center">
                          <p className="text-sm font-semibold text-navy-600 dark:text-cream-200">No saved tutors yet.</p>
                          <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-2">
                            Save tutors from Find Tutors and they will stay here.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-navy-100 dark:border-navy-400">
                      <Link href="/tutors" className="text-xs font-semibold text-gold-500 hover:text-gold-600 transition-colors">
                        Browse tutors
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications((current) => !current);
                  setShowFavorites(false);
                  setShowUserMenu(false);
                }}
                className="relative p-2.5 rounded-xl text-navy-400 dark:text-cream-300 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all duration-200"
                aria-label="Notifications"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-gold-400 rounded-full text-[10px] font-bold text-navy-600 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-navy-500 rounded-2xl shadow-glass-lg border border-navy-100 dark:border-navy-400 animate-slide-down overflow-hidden">
                  <div className="p-4 border-b border-navy-100 dark:border-navy-400 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">Notifications</h3>
                    {notifications.length > 0 && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-gold-600">
                        {notifications.length} recent
                      </span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {notificationsLoading ? (
                      <div className="p-6 text-center text-sm text-navy-400 dark:text-cream-300/70">
                        Loading notifications...
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.map((notification) => {
                        const content = (
                          <>
                            <p className="text-sm font-semibold text-navy-600 dark:text-cream-200">
                              {notification.title}
                            </p>
                            <p className="text-xs text-navy-300 dark:text-navy-200 mt-0.5">
                              {notification.body}
                            </p>
                            <p className="text-xs text-gold-500 mt-1">
                              {formatRelativeTime(notification.createdAt)}
                            </p>
                          </>
                        );

                        const className = `block p-3 transition-colors ${notification.isRead ? 'hover:bg-navy-50/50 dark:hover:bg-navy-400/30' : 'bg-gold-50/40 dark:bg-gold-500/10 hover:bg-gold-50 dark:hover:bg-gold-500/15 border-l-2 border-gold-400'}`;

                        return notification.link ? (
                          <Link key={notification.id} href={notification.link} className={className}>
                            {content}
                          </Link>
                        ) : (
                          <div key={notification.id} className={className}>
                            {content}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-sm font-semibold text-navy-600 dark:text-cream-200">No notifications yet.</p>
                        <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-2">
                          Booking updates and other alerts will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-navy-100 dark:border-navy-400">
                    <Link href="/settings?tab=notifications" className="text-xs font-semibold text-gold-500 hover:text-gold-600 transition-colors">
                      Notification preferences
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {session ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowUserMenu((current) => !current);
                    setShowFavorites(false);
                    setShowNotifications(false);
                  }}
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
                        href={dashboardHref}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-600 dark:text-cream-200 hover:bg-gold-50 dark:hover:bg-navy-400 transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                        </svg>
                        Dashboard
                      </Link>
                      <Link
                        href="/settings?tab=account"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-600 dark:text-cream-200 hover:bg-gold-50 dark:hover:bg-navy-400 transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        Account Settings
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
                Get Started
              </Link>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            className="md:hidden p-2 rounded-xl text-navy-400 dark:text-cream-300 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all"
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

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
              {session ? (
                <>
                  <Link href={dashboardHref} className="px-4 py-3 rounded-xl text-sm font-medium text-navy-600 dark:text-cream-200 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all">
                    Dashboard
                  </Link>
                  <Link href="/settings?tab=account" className="px-4 py-3 rounded-xl text-sm font-medium text-navy-600 dark:text-cream-200 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all">
                    Account Settings
                  </Link>
                  {isStudent && favoriteTutors.length > 0 && (
                    <Link href="/tutors" className="px-4 py-3 rounded-xl text-sm font-medium text-navy-600 dark:text-cream-200 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all">
                      Saved Tutors ({favoriteTutors.length})
                    </Link>
                  )}
                </>
              ) : (
                <Link href="/auth/register" className="btn-primary text-sm py-2.5 text-center">
                  Get Started
                </Link>
              )}
              <div className="flex items-center justify-between mb-2 px-4 py-2">
                <span className="text-sm text-navy-300 dark:text-cream-400">Theme</span>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-navy-400 dark:text-cream-300 hover:bg-navy-50 dark:hover:bg-navy-500 transition-all"
                >
                  {theme === 'light' ? 'Moon' : 'Sun'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
