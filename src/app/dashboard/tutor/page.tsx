'use client';

import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { buildBookingRoomUrl, formatDateTime, getInitials, getSessionJoinStatus } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import StatsOverview from '@/components/dashboard/tutor/StatsOverview';
import CertificationStatus from '@/components/dashboard/tutor/CertificationStatus';
import AvailabilityManager from '@/components/dashboard/tutor/AvailabilityManager';
import PricingManager from '@/components/dashboard/tutor/PricingManager';
import ReviewsSection from '@/components/dashboard/tutor/ReviewsSection';

const tutorTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'messages', label: 'Messages' },
  { id: 'availability', label: 'Availability' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'reviews', label: 'Reviews' },
] as const;

type TutorTab = (typeof tutorTabs)[number]['id'];

export default function TutorDashboard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TutorTab>('overview');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [selectedNotesBooking, setSelectedNotesBooking] = useState<any>(null);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json());

  const { data: verifyData, mutate: mutateVerify } = useSWR(
    session?.user ? '/api/tutor/verify' : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  const { data: availData, mutate: mutateAvailability } = useSWR(
    session?.user ? '/api/tutor/availability' : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  const { data: bookingsData, mutate: mutateBookings } = useSWR(
    session?.user ? '/api/tutor/bookings' : null,
    fetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  );
  const { data: statsData, mutate: mutateStats } = useSWR(
    session?.user ? '/api/tutor/stats' : null,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true }
  );

  const verificationData = verifyData ?? null;
  const availability = availData?.slots ?? null;
  const bookings = bookingsData ?? null;
  const stats = statsData?.data ?? null;
  const isLoading = !verifyData && !bookingsData;

  useEffect(() => {
    if (!session?.user) {
      setMessageUnreadCount(0);
      return;
    }

    let ignore = false;

    async function loadUnreadCount() {
      try {
        const response = await fetch('/api/conversations', { cache: 'no-store' });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || 'Failed to load unread messages');
        }

        if (!ignore) {
          setMessageUnreadCount(json.unreadCount || 0);
        }
      } catch (error) {
        if (!ignore) {
          console.error('Failed to load unread message count:', error);
        }
      }
    }

    void loadUnreadCount();
    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, 5000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [session?.user]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (requestedTab && tutorTabs.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab as TutorTab);
    }
  }, [searchParams]);

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Delete this submitted document and remove it from review?')) {
      return;
    }

    try {
      setDeletingDocumentId(id);
      const response = await fetch(`/api/tutor/verify/${id}`, {
        method: 'DELETE',
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to delete document');
      }

      toast.success('Document deleted');
      await mutateVerify();
    } catch (error: any) {
      console.error('Delete document error:', error);
      toast.error(error.message || 'Could not delete document');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleCompleteSession = async (bookingId: string) => {
    if (!confirm('Mark this session as complete? The student will be able to review the lesson afterward.')) {
      return;
    }

    try {
      setCompletingBookingId(bookingId);
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'complete' }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to complete session');
      }

      toast.success(json.message || 'Session marked as complete');
      setSelectedNotesBooking(null);
      await Promise.all([mutateBookings(), mutateStats()]);
    } catch (error: any) {
      console.error('Complete session error:', error);
      toast.error(error.message || 'Could not complete session');
    } finally {
      setCompletingBookingId(null);
    }
  };

  const handleBookingDecision = async (bookingId: string, action: 'accept' | 'decline') => {
    const confirmationMessage =
      action === 'accept'
        ? 'Accept this booking request? The student will be notified immediately.'
        : 'Decline this booking request? If payment exists, it will be refunded.';

    if (!confirm(confirmationMessage)) {
      return;
    }

    try {
      setUpdatingBookingId(bookingId);
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `Failed to ${action} booking`);
      }

      toast.success(json.message || `Booking ${action}ed`);
      await Promise.all([mutateBookings(), mutateStats()]);
    } catch (error: any) {
      console.error(`Booking ${action} error:`, error);
      toast.error(error.message || `Could not ${action} booking`);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-200 dark:bg-navy-600">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-navy-400 animate-pulse uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const isVerified = verificationData?.status === 'APPROVED';
  const documents = verificationData?.documents || [];
  const nextBooking = bookings?.[0] || null;
  const activeAvailabilityCount = availability?.length || 0;

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-20 bg-cream-200 dark:bg-navy-600">
      <div className="page-container">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-glass border-4 border-white dark:border-navy-500">
              {session?.user?.image ? (
                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(session?.user?.name || 'Tutor')
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl font-body font-bold tracking-tight text-navy-600 dark:text-cream-200">
                  {session?.user?.name || 'Tutor Dashboard'}
                </h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isVerified ? 'bg-sage-500 text-white' : 'bg-gold-100 text-gold-700 dark:bg-gold-500/20 dark:text-gold-400'}`}>
                  {isVerified ? 'Verified' : 'Verification Pending'}
                </span>
              </div>
              <p className="text-sm text-navy-400 dark:text-cream-300/70">
                Sessions, student messages, submitted files, and payout tracking are managed here.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/tutor/calendar" className="btn-outline border-navy-200 dark:border-navy-500 px-5 py-3 text-xs font-black uppercase tracking-widest">
              Open Calendar
            </Link>
            <button
              onClick={() => setActiveTab('sessions')}
              className="btn-primary px-5 py-3 text-xs font-black uppercase tracking-widest"
            >
              Manage Sessions
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-8 bg-white/50 dark:bg-navy-800/30 backdrop-blur-md rounded-[24px] p-2 overflow-x-auto custom-scrollbar shadow-glass border border-white/50 dark:border-navy-500/20">
          {tutorTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all inline-flex items-center justify-center ${
                activeTab === tab.id
                  ? 'bg-navy-600 text-white shadow-xl scale-105'
                  : 'text-navy-400 dark:text-cream-400/60 hover:text-navy-600 dark:hover:text-cream-200 hover:bg-white dark:hover:bg-navy-700/50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === 'messages' && messageUnreadCount > 0 && (
                <span className="ml-2 min-w-5 h-5 px-1 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center">
                  {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {stats && <StatsOverview stats={stats} />}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-8">
              <div className="glass-card p-6">
                <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest mb-5">Dashboard Snapshot</h2>
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white dark:bg-navy-700/40 border border-navy-100/60 dark:border-navy-500/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">Pending Requests</p>
                    <p className="mt-2 text-sm font-bold text-navy-600 dark:text-cream-200">
                      {(bookings || []).filter((booking) => booking.status === 'PENDING').length} booking request(s) waiting
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-navy-700/40 border border-navy-100/60 dark:border-navy-500/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">Next Session</p>
                    <p className="mt-2 text-sm font-bold text-navy-600 dark:text-cream-200">
                        {nextBooking ? `${nextBooking.student.name} | ${formatDateTime(nextBooking.scheduledAt)}` : 'No upcoming session'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white dark:bg-navy-700/40 border border-navy-100/60 dark:border-navy-500/20 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">Availability Slots</p>
                      <p className="mt-2 text-sm font-bold text-navy-600 dark:text-cream-200">{activeAvailabilityCount} recurring slots active</p>
                    </div>
                    <div className="rounded-2xl bg-white dark:bg-navy-700/40 border border-navy-100/60 dark:border-navy-500/20 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">Submitted Files</p>
                      <p className="mt-2 text-sm font-bold text-navy-600 dark:text-cream-200">{documents.length} document{documents.length === 1 ? '' : 's'} on file</p>
                    </div>
                  </div>
                </div>

                <CertificationStatus certifications={verificationData?.certifications || []} />
              </div>

              <div className="lg:col-span-8 space-y-8">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Submitted Documents</h2>
                      <p className="text-sm text-navy-400 dark:text-cream-300/70 mt-2">
                        Open the exact file you uploaded, or remove it from the review queue if it needs to be replaced.
                      </p>
                    </div>
                    <Link href="/dashboard/tutor/verify" className="text-[10px] font-black uppercase tracking-widest text-gold-600 hover:text-gold-700 transition-colors">
                      Upload More
                    </Link>
                  </div>

                  {documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {documents.map((doc: any) => (
                        <div key={doc.id} className="rounded-3xl border border-navy-100/60 dark:border-navy-500/20 bg-white dark:bg-navy-700/30 p-5">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-navy-600 dark:text-cream-200 break-words">{doc.fileName}</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {doc.subject && (
                                <span className="px-2.5 py-1 rounded-full bg-gold-50 dark:bg-gold-500/10 text-[10px] font-black uppercase tracking-widest text-gold-700 dark:text-gold-400">
                                  {String(doc.subject).replaceAll('_', ' ')}
                                </span>
                              )}
                              {doc.type && (
                                <span className="px-2.5 py-1 rounded-full bg-navy-50 dark:bg-navy-600 text-[10px] font-black uppercase tracking-widest text-navy-500 dark:text-cream-300">
                                  {String(doc.type).replaceAll('_', ' ')}
                                </span>
                              )}
                            </div>
                            <p className="mt-3 text-xs text-navy-300 dark:text-cream-400/50">
                              Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-2xl bg-navy-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-navy-700 transition-colors"
                            >
                              View File
                            </a>
                            <button
                              onClick={() => void handleDeleteDocument(doc.id)}
                              disabled={deletingDocumentId === doc.id}
                              className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {deletingDocumentId === doc.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[28px] border-2 border-dashed border-navy-100 dark:border-navy-500/20 bg-navy-50/40 dark:bg-navy-700/10 p-10 text-center">
                      <p className="text-base font-bold text-navy-600 dark:text-cream-200">No submitted documents yet.</p>
                      <p className="text-sm text-navy-400 dark:text-cream-300/70 mt-2">
                        Upload your score reports or certificates so admin can review them.
                      </p>
                    </div>
                  )}
                </div>

                <div className="glass-card p-6">
                  <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest mb-6">Quick Actions</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('sessions')}
                      className="rounded-3xl border border-navy-100/60 dark:border-navy-500/20 bg-white dark:bg-navy-700/30 p-5 text-left hover:border-gold-400 transition-all"
                    >
                      <p className="text-sm font-bold text-navy-600 dark:text-cream-200">Manage Sessions</p>
                      <p className="text-xs text-navy-300 dark:text-cream-400/50 mt-2">Open lesson actions, notes, room links, and completion.</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('messages')}
                      className="rounded-3xl border border-navy-100/60 dark:border-navy-500/20 bg-white dark:bg-navy-700/30 p-5 text-left hover:border-gold-400 transition-all"
                    >
                      <p className="text-sm font-bold text-navy-600 dark:text-cream-200">Reply to Students</p>
                      <p className="text-xs text-navy-300 dark:text-cream-400/50 mt-2">Jump straight into your conversation inbox.</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('availability')}
                      className="rounded-3xl border border-navy-100/60 dark:border-navy-500/20 bg-white dark:bg-navy-700/30 p-5 text-left hover:border-gold-400 transition-all"
                    >
                      <p className="text-sm font-bold text-navy-600 dark:text-cream-200">Update Availability</p>
                      <p className="text-xs text-navy-300 dark:text-cream-400/50 mt-2">Adjust your recurring time slots for new bookings.</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('pricing')}
                      className="rounded-3xl border border-navy-100/60 dark:border-navy-500/20 bg-white dark:bg-navy-700/30 p-5 text-left hover:border-gold-400 transition-all"
                    >
                      <p className="text-sm font-bold text-navy-600 dark:text-cream-200">Adjust Pricing</p>
                      <p className="text-xs text-navy-300 dark:text-cream-400/50 mt-2">Edit rates before your next bookings come in.</p>
                    </button>
                    <Link
                      href="/dashboard/tutor/students"
                      className="rounded-3xl border border-navy-100/60 dark:border-navy-500/20 bg-white dark:bg-navy-700/30 p-5 text-left hover:border-gold-400 transition-all"
                    >
                      <p className="text-sm font-bold text-navy-600 dark:text-cream-200">View Students</p>
                      <p className="text-xs text-navy-300 dark:text-cream-400/50 mt-2">See active students and recent session history.</p>
                    </Link>
                    <Link
                      href="/dashboard/tutor/analytics"
                      className="rounded-3xl border border-navy-100/60 dark:border-navy-500/20 bg-white dark:bg-navy-700/30 p-5 text-left hover:border-gold-400 transition-all"
                    >
                      <p className="text-sm font-bold text-navy-600 dark:text-cream-200">Open Analytics</p>
                      <p className="text-xs text-navy-300 dark:text-cream-400/50 mt-2">Review earnings, ratings, and feedback trends.</p>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 glass-card p-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Session Actions</h2>
                  <p className="text-sm text-navy-400 dark:text-cream-300/70 mt-2">
                    Review pending requests, join the room, open notes, and mark lessons complete when they end.
                  </p>
                </div>
                <Link href="/dashboard/tutor/calendar" className="text-[10px] font-black uppercase tracking-widest text-gold-600 hover:text-gold-700 transition-colors">
                  Full Calendar
                </Link>
              </div>

              {bookings && bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const canComplete = new Date(booking.scheduledAt).getTime() <= Date.now();

                    return (
                      <div key={booking.id} className="rounded-3xl border border-navy-100/60 dark:border-navy-500/20 bg-white dark:bg-navy-700/30 p-5">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-lg font-bold text-navy-600 dark:text-cream-200">{booking.student.name}</h3>
                              <span className="px-2.5 py-1 rounded-full bg-gold-50 dark:bg-gold-500/10 text-[10px] font-black uppercase tracking-widest text-gold-700 dark:text-gold-400">
                                {String(booking.subject).replaceAll('_', ' ')}
                              </span>
                              <span className="px-2.5 py-1 rounded-full bg-navy-50 dark:bg-navy-600 text-[10px] font-black uppercase tracking-widest text-navy-500 dark:text-cream-300">
                                {booking.status}
                              </span>
                            </div>
                            <p className="text-sm text-navy-400 dark:text-cream-300/70 mt-3">
                              {formatDateTime(booking.scheduledAt)} | {booking.durationMinutes} minutes
                            </p>
                            <p className="text-xs text-navy-300 dark:text-cream-400/50 mt-2">
                              {booking.notes?.trim() ? `Student notes: ${booking.notes}` : 'No student notes were added for this lesson.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => setSelectedNotesBooking(booking)}
                              className="rounded-2xl border border-navy-200 dark:border-navy-500/20 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 dark:text-cream-200 hover:border-gold-400 transition-colors"
                            >
                              Notes
                            </button>
                            {booking.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => void handleBookingDecision(booking.id, 'accept')}
                                  disabled={updatingBookingId === booking.id}
                                  className="rounded-2xl bg-sage-500 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-sage-600 transition-colors disabled:opacity-50"
                                >
                                  {updatingBookingId === booking.id ? 'Working...' : 'Accept'}
                                </button>
                                <button
                                  onClick={() => void handleBookingDecision(booking.id, 'decline')}
                                  disabled={updatingBookingId === booking.id}
                                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  {updatingBookingId === booking.id ? 'Working...' : 'Decline'}
                                </button>
                              </>
                            )}
                            {(() => {
                              const joinStatus = getSessionJoinStatus(
                                booking.scheduledAt,
                                booking.durationMinutes,
                                booking.status,
                              );

                              if (!joinStatus.canJoin) {
                                const title =
                                  joinStatus.reason === 'too_early'
                                    ? `Opens at ${joinStatus.opensAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                                    : joinStatus.reason === 'expired'
                                    ? 'Session window has closed'
                                    : 'Session not confirmed';
                                const label =
                                  joinStatus.reason === 'too_early'
                                    ? 'Join Room'
                                    : 'Room Closed';
                                return (
                                  <button
                                    disabled
                                    title={title}
                                    className="rounded-2xl bg-navy-100 dark:bg-navy-800 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-navy-400 dark:text-cream-400/20 cursor-not-allowed opacity-60"
                                  >
                                    {label}
                                  </button>
                                );
                              }

                              return (
                                <a
                                  href={booking.meetingLink || buildBookingRoomUrl(booking.id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-2xl bg-navy-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-navy-700 transition-colors shadow-lg shadow-navy-900/10"
                                >
                                  Join Room
                                </a>
                              );
                            })()}
                            <button
                              onClick={() => void handleCompleteSession(booking.id)}
                              disabled={booking.status !== 'CONFIRMED' || !canComplete || completingBookingId === booking.id}
                              className="rounded-2xl bg-gold-400 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 hover:bg-gold-500 transition-colors disabled:bg-navy-100 disabled:text-navy-400"
                            >
                              {completingBookingId === booking.id ? 'Completing...' : 'Complete Session'}
                            </button>
                          </div>
                        </div>

                        {booking.status === 'PENDING' && (
                          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-blue-500">
                            This is a new booking request. Accept or decline it before the lesson can proceed.
                          </p>
                        )}

                        {booking.status === 'CONFIRMED' && !canComplete && (
                          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-navy-300 dark:text-cream-400/40">
                            You can mark this session complete once its scheduled start time has begun.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[28px] border-2 border-dashed border-navy-100 dark:border-navy-500/20 bg-navy-50/40 dark:bg-navy-700/10 p-10 text-center">
                  <p className="text-base font-bold text-navy-600 dark:text-cream-200">No active sessions right now.</p>
                  <p className="text-sm text-navy-400 dark:text-cream-300/70 mt-2">
                    New or confirmed lessons will appear here with room links and completion controls.
                  </p>
                </div>
              )}
            </div>

            <div className="xl:col-span-4 space-y-6">
              <div className="glass-card p-6">
                <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest mb-5">Session Flow</h2>
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white dark:bg-navy-700/30 border border-navy-100/60 dark:border-navy-500/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gold-700 dark:text-gold-400">Step 1</p>
                    <p className="mt-2 text-sm font-bold text-navy-600 dark:text-cream-200">Open Notes and Join Room</p>
                    <p className="mt-2 text-xs text-navy-300 dark:text-cream-400/50">Review the student brief, then enter the session room from this tab.</p>
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-navy-700/30 border border-navy-100/60 dark:border-navy-500/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gold-700 dark:text-gold-400">Step 2</p>
                    <p className="mt-2 text-sm font-bold text-navy-600 dark:text-cream-200">Teach the Lesson</p>
                    <p className="mt-2 text-xs text-navy-300 dark:text-cream-400/50">Run the live session normally. The room link stays available here throughout the lesson.</p>
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-navy-700/30 border border-navy-100/60 dark:border-navy-500/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gold-700 dark:text-gold-400">Step 3</p>
                    <p className="mt-2 text-sm font-bold text-navy-600 dark:text-cream-200">Mark Complete</p>
                    <p className="mt-2 text-xs text-navy-300 dark:text-cream-400/50">After the lesson ends, click `Complete Session`. The booking closes and the student can leave a review.</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest mb-4">Need More Detail?</h2>
                <div className="space-y-3">
                  <Link href="/dashboard/tutor/students" className="block rounded-2xl border border-navy-100/60 dark:border-navy-500/20 bg-white dark:bg-navy-700/30 p-4 hover:border-gold-400 transition-all">
                    <p className="text-sm font-bold text-navy-600 dark:text-cream-200">Student List</p>
                    <p className="text-xs text-navy-300 dark:text-cream-400/50 mt-2">Browse active learners and recent session history.</p>
                  </Link>
                  <Link href="/dashboard/tutor/analytics" className="block rounded-2xl border border-navy-100/60 dark:border-navy-500/20 bg-white dark:bg-navy-700/30 p-4 hover:border-gold-400 transition-all">
                    <p className="text-sm font-bold text-navy-600 dark:text-cream-200">Performance Analytics</p>
                    <p className="text-xs text-navy-300 dark:text-cream-400/50 mt-2">Track ratings, completed sessions, and revenue over time.</p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px] lg:h-[640px]">
            <div className={`lg:col-span-4 min-w-0 min-h-0 glass-card overflow-hidden flex flex-col ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
              <div className="p-4 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xs font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Student Messages</h2>
                  {messageUnreadCount > 0 && (
                    <span className="min-w-6 h-6 px-2 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center">
                      {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <ConversationList
                  onSelectConversation={(conversation) => setSelectedConversation(conversation)}
                  selectedId={selectedConversation?.id}
                  onStatsChange={({ unreadCount }) => setMessageUnreadCount(unreadCount)}
                />
              </div>
            </div>

            <div className={`lg:col-span-8 min-w-0 min-h-0 h-full overflow-hidden ${!selectedConversation ? 'hidden lg:flex items-center justify-center glass-card opacity-30 text-center p-10 bg-white dark:bg-navy-700/30' : 'flex flex-col'}`}>
              {selectedConversation ? (
                <ChatWindow
                  key={`${selectedConversation.id}-${selectedConversation.tutorProfile.id}`}
                  conversationId={selectedConversation.id}
                  tutorProfileId={selectedConversation.tutorProfile.id}
                  tutorName={selectedConversation.participant?.name || selectedConversation.student?.name || 'Student'}
                  tutorImage={selectedConversation.participant?.avatarUrl || selectedConversation.student?.avatarUrl}
                  onClose={() => setSelectedConversation(null)}
                />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="text-4xl text-gold-400">M</div>
                  <p className="text-xs font-black uppercase tracking-widest leading-relaxed text-navy-400 dark:text-cream-400/40">
                    Select a conversation
                    <br />
                    to reply to your students
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'availability' && <AvailabilityManager />}
        {activeTab === 'pricing' && <PricingManager />}
        {activeTab === 'reviews' && <ReviewsSection />}
      </div>

      {selectedNotesBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setSelectedNotesBooking(null)}
            className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-lg rounded-[32px] bg-white dark:bg-navy-700 shadow-glass overflow-hidden border border-white/60 dark:border-navy-500/30">
            <div className="flex items-center justify-between border-b border-navy-100/50 dark:border-navy-500/20 px-6 py-5">
              <div>
                <h3 className="text-lg font-black text-navy-600 dark:text-cream-200">Session Notes</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-navy-300 dark:text-cream-400/40">
                  {selectedNotesBooking.student.name} | {formatDateTime(selectedNotesBooking.scheduledAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotesBooking(null)}
                className="text-navy-300 hover:text-navy-600 dark:hover:text-cream-200 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm leading-7 text-navy-500 dark:text-cream-300/80 whitespace-pre-wrap">
                {selectedNotesBooking.notes?.trim() || 'The student has not added any notes for this session yet.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
