'use client';

import useSWR from 'swr';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { SUBJECT_LABELS } from '@/types';
import { formatCurrency, formatDate, formatTime, getInitials, buildBookingRoomUrl, getSessionJoinStatus } from '@/lib/utils';
import ContinueLearningPrompt from '@/components/student/ContinueLearningPrompt';
import ReportIssueModal from '@/components/student/ReportIssueModal';
import ReviewSessionModal from '@/components/student/ReviewSessionModal';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import { toast } from 'react-hot-toast';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'messages', label: 'Messages' },
  { id: 'payments', label: 'Payments' },
  { id: 'referral', label: 'Referral' },
];

function StudentDashboardInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedReportBooking, setSelectedReportBooking] = useState<any>(null);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [directMessageTutor, setDirectMessageTutor] = useState<any>(null);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [payingPaymentId, setPayingPaymentId] = useState<string | null>(null);
  const [mockPayingId, setMockPayingId] = useState<string | null>(null);
  const [paypalPayingId, setPaypalPayingId] = useState<string | null>(null);
  const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json());

  const { data: bookingsJson, mutate: mutateBookings } = useSWR(
    session?.user ? '/api/bookings?role=STUDENT' : null,
    fetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  );
  const { data: favoritesJson } = useSWR(
    session?.user ? '/api/student/favorites' : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  const { data: paymentsJson } = useSWR(
    session?.user ? '/api/payments' : null,
    fetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  );
  const { data: referralJson } = useSWR(
    session?.user ? '/api/student/referral' : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  const bookings = bookingsJson?.data ?? [];
  const packages = bookingsJson?.packages ?? [];
  const favorites = favoritesJson?.data ?? [];
  const payments = paymentsJson?.data ?? [];
  const referral = referralJson?.data ?? null;
  const isLoading = !bookingsJson && !favoritesJson;

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

    if (requestedTab && tabs.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const stripeStatus = searchParams.get('stripe');

    if (stripeStatus === 'success') {
      toast.success('Stripe payment completed. Updating your billing history...');
      void mutateBookings();
      return;
    }

    if (stripeStatus === 'cancelled') {
      toast('Stripe checkout was cancelled.');
    }
  }, [searchParams]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    const tutorId = searchParams.get('tutorId');

    if (!session?.user || requestedTab !== 'messages' || !tutorId) {
      return;
    }

    let ignore = false;

    async function loadTutorForDirectMessage() {
      try {
        const response = await fetch(`/api/tutors/${tutorId}`, { cache: 'no-store' });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || 'Failed to load tutor');
        }

        if (!ignore) {
          setSelectedConversation(null);
          setDirectMessageTutor({
            tutorProfileId: json.data.id,
            tutorName: json.data.user.name,
            tutorImage: json.data.user.avatarUrl,
          });
        }
      } catch (error) {
        if (!ignore) {
          console.error('Failed to prepare direct message:', error);
          toast.error('Could not open the tutor chat yet.');
        }
      }
    }

    void loadTutorForDirectMessage();

    return () => {
      ignore = true;
    };
  }, [searchParams, session]);

  async function handlePayNow(paymentId: string) {
    try {
      setPayingPaymentId(paymentId);

      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to start Stripe checkout');
      }

      if (!json.data?.checkoutUrl) {
        throw new Error('Stripe checkout URL was not returned');
      }

      window.location.href = json.data.checkoutUrl;
    } catch (error: any) {
      console.error('Stripe checkout launch error:', error);
      toast.error(error.message || 'Could not start Stripe checkout');
    } finally {
      setPayingPaymentId(null);
    }
  }

  async function handleMockPayNow(paymentId: string) {
    try {
      setMockPayingId(paymentId);

      const response = await fetch('/api/payments/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to process mock payment');
      }

      toast.success('Mock payment successful!');
      void mutateBookings(); // Refresh UI
    } catch (error: any) {
      console.error('Mock payment error:', error);
      toast.error(error.message || 'Could not process mock payment');
    } finally {
      setMockPayingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-32 flex justify-center">
        <div className="w-10 h-10 border-4 border-navy-100 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  const upcoming = (bookings as any[]).filter((booking: any) => booking.status === 'CONFIRMED' || booking.status === 'PENDING');
  const chatTarget = selectedConversation
    ? {
        conversationId: selectedConversation.id,
        tutorProfileId: selectedConversation.tutorProfile.id,
        tutorName: selectedConversation.tutorProfile.user.name,
        tutorImage: selectedConversation.tutorProfile.user.avatarUrl,
      }
    : directMessageTutor;

  const paypalOptions = {
      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
      currency: "USD",
      intent: "capture",
  };

  return (
    <PayPalScriptProvider options={paypalOptions}>
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-24 md:pt-28 pb-16">
      <div className="page-container max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-gold-100 to-gold-300 dark:from-navy-400 dark:to-navy-500 flex items-center justify-center text-xl font-bold text-navy-600 dark:text-gold-400 overflow-hidden shadow-glass border-2 border-white dark:border-navy-400/30">
              {session?.user?.image ? (
                <img src={session.user.image} alt={session.user.name || ''} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black">{getInitials(session?.user?.name || 'User')}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-display font-black text-navy-600 dark:text-cream-200 tracking-tight">
                Hey, {session?.user?.name?.split(' ')[0] || 'there'}!
              </h1>
              <p className="text-xs font-bold text-navy-300 dark:text-cream-400/40 uppercase tracking-widest mt-1">
                Student Portal | {formatDate(new Date().toISOString())}
              </p>
            </div>
          </div>
          <div className="md:ml-auto">
            <Link href="/tutors" className="btn-primary text-xs px-6 py-3 font-black tracking-widest uppercase">
              Find a Tutor
            </Link>
          </div>
        </div>

        <div className="flex gap-2 mb-10 bg-white/50 dark:bg-navy-800/30 backdrop-blur-md rounded-[24px] p-2 overflow-x-auto custom-scrollbar shadow-glass border border-white/50 dark:border-navy-500/20">
          {tabs.map((tab) => (
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <ContinueLearningPrompt bookings={bookings} packages={packages} />
              <div className="glass-card overflow-hidden">
                <div className="p-6 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20 flex items-center justify-between">
                  <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Upcoming Lessons</h2>
                  <button onClick={() => setActiveTab('bookings')} className="text-[10px] font-bold text-gold-600 hover:underline">
                    View Schedule
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {upcoming.length > 0 ? (
                    upcoming.slice(0, 3).map((booking: any) => (
                      <div key={booking.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-navy-700/30 border border-navy-100/50 dark:border-navy-500/10">
                        <div className="w-12 h-12 rounded-xl bg-gold-50 dark:bg-navy-600 flex items-center justify-center overflow-hidden">
                          {booking.tutorProfile.user.avatarUrl ? (
                            <img src={booking.tutorProfile.user.avatarUrl} alt={booking.tutorProfile.user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-navy-600 dark:text-cream-200">{getInitials(booking.tutorProfile.user.name)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">{booking.tutorProfile.user.name}</h3>
                          <p className="text-[10px] text-navy-300 dark:text-cream-400/40 font-bold uppercase tracking-widest mt-0.5">
                            {SUBJECT_LABELS[booking.subject as keyof typeof SUBJECT_LABELS]} | {formatDate(booking.scheduledAt)}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="text-xs font-black text-navy-600 dark:text-cream-200">{formatTime(booking.scheduledAt)}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gold-600">{booking.status}</span>
                            {(() => {
                              const joinStatus = getSessionJoinStatus(
                                booking.scheduledAt,
                                booking.durationMinutes,
                                booking.status,
                              );
                              if (joinStatus.canJoin) {
                                return (
                                  <a
                                    href={booking.meetingLink || buildBookingRoomUrl(booking.id)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-1 rounded-lg bg-navy-600 text-[8px] font-black uppercase tracking-widest text-white hover:bg-navy-700 transition-colors"
                                  >
                                    Join
                                  </a>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-50">
                      <p className="text-sm font-medium">No lessons scheduled yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <div className="glass-card p-6 bg-navy-600 text-white shadow-xl shadow-navy-900/20">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-cream-400/40 mb-6">Learning Pulse</h2>
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold text-cream-400/60 mb-1">Total Lessons</p>
                    <p className="text-4xl font-display font-black">{(bookings as any[]).filter((booking: any) => booking.status === 'COMPLETED').length}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                    <div>
                      <p className="text-[10px] font-bold text-cream-400/60">Saved Tutors</p>
                      <p className="text-xl font-bold">{favorites.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-cream-400/60">Payments</p>
                      <p className="text-xl font-bold">{(payments as any[]).filter((p: any) => p.status !== 'CANCELLED').length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 border-gold-400/30">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 mb-4">Refer & Earn</h2>
                <p className="text-xs text-navy-600 dark:text-cream-200 font-medium mb-4">
                  Earn credits when your friends join and book lessons.
                </p>
                <div className="relative group">
                  <input
                    readOnly
                    value={referral?.referralCode || ''}
                    className="w-full bg-navy-50/50 dark:bg-navy-700/30 border-2 border-dashed border-navy-100 dark:border-navy-500/20 rounded-xl p-3 text-sm font-black text-center text-navy-600 dark:text-gold-400 select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(referral?.referralCode || '');
                      toast.success('Code copied!');
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-gold-400 text-navy-600 font-black text-[10px] uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Copy Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="glass-card max-w-4xl mx-auto overflow-hidden">
            <div className="p-6 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20">
              <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Complete Schedule</h2>
            </div>
            <div className="p-6 divide-y divide-navy-100/50 dark:divide-navy-500/10">
              {(bookings as any[]).map((booking: any) => (
                <div key={booking.id} className="py-5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">{booking.tutorProfile.user.name}</h3>
                    <p className="text-[10px] text-navy-300 dark:text-cream-400/40 font-bold uppercase tracking-widest">
                      {SUBJECT_LABELS[booking.subject as keyof typeof SUBJECT_LABELS]} | {formatDate(booking.scheduledAt)} at {formatTime(booking.scheduledAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge py-1.5 px-3 text-[9px] font-black uppercase tracking-widest bg-gold-50 text-gold-600">
                      {booking.status}
                    </span>
                    {(() => {
                      const joinStatus = getSessionJoinStatus(
                        booking.scheduledAt,
                        booking.durationMinutes,
                        booking.status,
                      );

                      if (joinStatus.canJoin === false && joinStatus.reason === 'not_confirmed') return null;

                      const title =
                        !joinStatus.canJoin && joinStatus.reason === 'too_early'
                          ? `Opens at ${(joinStatus as any).opensAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                          : !joinStatus.canJoin && joinStatus.reason === 'expired'
                          ? 'Session window has closed'
                          : undefined;

                      const label = !joinStatus.canJoin && joinStatus.reason === 'expired' ? 'Room Closed' : 'Join Room';

                      if (!joinStatus.canJoin) {
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
                    {booking.status === 'COMPLETED' && (
                      <div className="flex items-center gap-3">
                        {!booking.review && (
                          <button
                            onClick={() => setSelectedReviewBooking(booking)}
                            className="text-[10px] font-bold text-gold-600 hover:text-gold-700 transition-colors uppercase tracking-widest"
                          >
                            Write a Review
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedReportBooking(booking)}
                          className="text-[10px] font-bold text-navy-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                        >
                          Report
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px] lg:h-[640px]">
            <div className={`lg:col-span-4 min-w-0 min-h-0 glass-card overflow-hidden flex flex-col ${chatTarget ? 'hidden lg:flex' : 'flex'}`}>
              <div className="p-4 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xs font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Conversations</h2>
                  {messageUnreadCount > 0 && (
                    <span className="min-w-6 h-6 px-2 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center">
                      {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <ConversationList
                  onSelectConversation={(conversation) => {
                    setSelectedConversation(conversation);
                    setDirectMessageTutor(null);
                  }}
                  selectedId={selectedConversation?.id}
                  onStatsChange={({ unreadCount }) => setMessageUnreadCount(unreadCount)}
                />
              </div>
            </div>

            <div className={`lg:col-span-8 min-w-0 min-h-0 h-full overflow-hidden ${!chatTarget ? 'hidden lg:flex items-center justify-center glass-card opacity-30 text-center p-10 bg-white dark:bg-navy-700/30' : 'flex flex-col'}`}>
              {chatTarget ? (
                <ChatWindow
                  key={`${chatTarget.conversationId || 'direct'}-${chatTarget.tutorProfileId}`}
                  conversationId={chatTarget.conversationId}
                  tutorName={chatTarget.tutorName}
                  tutorImage={chatTarget.tutorImage}
                  tutorProfileId={chatTarget.tutorProfileId}
                  onClose={() => {
                    setSelectedConversation(null);
                    setDirectMessageTutor(null);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="text-4xl text-gold-400">M</div>
                  <p className="text-xs font-black uppercase tracking-widest leading-relaxed text-navy-400 dark:text-cream-400/40">
                    Select a conversation
                    <br />
                    to start messaging
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="max-w-5xl mx-auto glass-card overflow-hidden">
            <div className="p-6 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20">
              <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Payments & Billing</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="rounded-[24px] border border-gold-200/70 dark:border-gold-500/20 bg-gold-50/70 dark:bg-navy-700/40 p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gold-700 dark:text-gold-400">Payment Method</p>
                  <h3 className="mt-2 text-lg font-black text-navy-600 dark:text-cream-200">Stripe Checkout</h3>
                  <p className="mt-1 text-sm text-navy-400 dark:text-cream-300/70">
                    Secure card checkout for single lessons and lesson packages. Trial lessons stay free.
                  </p>
                </div>
                <div className="rounded-2xl bg-white dark:bg-navy-800/60 px-4 py-3 border border-white/70 dark:border-navy-500/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">Status</p>
                  <p className="mt-1 text-sm font-bold text-navy-600 dark:text-cream-200">Ready for checkout</p>
                </div>
              </div>

              <div className="divide-y divide-navy-100/50 dark:divide-navy-500/10">
              {payments.length > 0 ? (
                (payments as any[]).map((payment: any) => (
                  <div key={payment.id} className="py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">
                        {payment.kind === 'PACKAGE' ? `${payment.packageSessions} Lesson Package` : payment.tutorName || 'Lesson Payment'}
                      </h3>
                      <p className="text-[10px] text-navy-300 dark:text-cream-400/40 font-bold uppercase tracking-widest mt-1">
                        {payment.subject ? `${SUBJECT_LABELS[payment.subject as keyof typeof SUBJECT_LABELS]} | ` : ''}
                        {formatDate(payment.paidAt || payment.createdAt)}
                      </p>
                      <p className="text-xs text-navy-400 dark:text-cream-300/70 mt-2">
                        Method: {payment.paymentMethod === 'FREE_TRIAL' ? 'Free trial' : 'Stripe Checkout'}
                      </p>
                    </div>
                    <div className="text-left md:text-right space-y-2">
                      <p className="text-lg font-black text-navy-600 dark:text-cream-200">{formatCurrency(payment.amount)}</p>
                      <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${payment.status === 'CANCELLED' ? 'text-red-500' : 'text-gold-600'}`}>
                        {payment.status.replaceAll('_', ' ')}
                      </p>
                      {payment.canPayNow && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => void handlePayNow(payment.id)}
                            disabled={payingPaymentId === payment.id || mockPayingId === payment.id}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-navy-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-navy-700 disabled:bg-navy-200 disabled:text-navy-400"
                          >
                            {payingPaymentId === payment.id ? (
                              <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : null}
                            Pay with Stripe
                          </button>
                          <button
                            onClick={() => void handleMockPayNow(payment.id)}
                            disabled={payingPaymentId === payment.id || mockPayingId === payment.id || paypalPayingId === payment.id}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-navy-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 transition-all hover:bg-navy-50 disabled:border-navy-200 disabled:text-navy-400"
                          >
                            {mockPayingId === payment.id ? (
                              <div className="h-3.5 w-3.5 rounded-full border-2 border-navy-600 border-t-transparent animate-spin" />
                            ) : null}
                            Mock Pay (Test)
                          </button>
                          
                          <div className="mt-2 relative z-0">
                            <PayPalButtons
                              style={{ layout: "horizontal", height: 40, label: "pay" }}
                              createOrder={async (data, actions) => {
                                setPaypalPayingId(payment.id);
                                const res = await fetch('/api/payments/paypal/create-order', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ paymentId: payment.id }),
                                });
                                const orderData = await res.json();
                                if (!orderData.success) {
                                  toast.error(orderData.error || "Failed to create PayPal order");
                                  setPaypalPayingId(null);
                                  return "";
                                }
                                return orderData.id;
                              }}
                              onApprove={async (data, actions) => {
                                try {
                                  const res = await fetch('/api/payments/paypal/capture-order', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      orderID: data.orderID,
                                      paymentId: payment.id,
                                    }),
                                  });
                                  const captureData = await res.json();
                                  if (captureData.success) {
                                    toast.success("PayPal payment successful!");
                                    void mutateBookings();
                                  } else {
                                    toast.error(captureData.error || "Failed to capture PayPal payment.");
                                  }
                                } catch (err) {
                                  toast.error("An error occurred during payment capture.");
                                } finally {
                                  setPaypalPayingId(null);
                                }
                              }}
                              onCancel={() => {
                                setPaypalPayingId(null);
                              }}
                              onError={(err) => {
                                console.error('PayPal button error:', err);
                                toast.error("PayPal encountered an error");
                                setPaypalPayingId(null);
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm font-bold text-navy-600 dark:text-cream-200">No payments recorded yet.</p>
                  <p className="text-[10px] font-black text-navy-300 dark:text-cream-400/40 uppercase tracking-widest mt-2">
                    Your lesson and package payments will appear here.
                  </p>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'referral' && (
          <div className="max-w-4xl mx-auto glass-card p-8">
            <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Referral Summary</h2>
            <p className="mt-3 text-sm text-navy-400 dark:text-cream-300/70">
              Referral code: <span className="font-black text-navy-600 dark:text-cream-200">{referral?.referralCode || 'Not available'}</span>
            </p>
            <p className="mt-2 text-sm text-navy-400 dark:text-cream-300/70">
              Total earned: <span className="font-black text-navy-600 dark:text-cream-200">{formatCurrency(referral?.totalCredits || 0)}</span>
            </p>
          </div>
        )}
      </div>

      {selectedReportBooking && (
        <ReportIssueModal booking={selectedReportBooking} isOpen={!!selectedReportBooking} onClose={() => setSelectedReportBooking(null)} />
      )}
      {selectedReviewBooking && (
        <ReviewSessionModal
          booking={selectedReviewBooking}
          isOpen={!!selectedReviewBooking}
          onClose={() => setSelectedReviewBooking(null)}
          onSubmitted={() => {
            setSelectedReviewBooking(null);
            void mutateBookings();
          }}
        />
      )}
    </div>
    </PayPalScriptProvider>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense>
      <StudentDashboardInner />
    </Suspense>
  );
}
