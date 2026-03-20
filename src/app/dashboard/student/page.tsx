'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { SUBJECT_LABELS } from '@/types';
import { formatCurrency, formatDate, formatTime, getInitials } from '@/lib/utils';
import ContinueLearningPrompt from '@/components/student/ContinueLearningPrompt';
import ReportIssueModal from '@/components/student/ReportIssueModal';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import { toast } from 'react-hot-toast';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'messages', label: 'Messages' },
  { id: 'payments', label: 'Payments' },
  { id: 'referral', label: 'Referral' },
];

export default function StudentDashboard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedReportBooking, setSelectedReportBooking] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [directMessageTutor, setDirectMessageTutor] = useState<any>(null);
  const [payingPaymentId, setPayingPaymentId] = useState<string | null>(null);
  const [data, setData] = useState({
    bookings: [] as any[],
    packages: [] as any[],
    favorites: [] as any[],
    payments: [] as any[],
    referral: null as any,
    isLoading: true,
  });

  async function loadData() {
    try {
      const [bookingsRes, referralRes, favoritesRes, paymentsRes] = await Promise.all([
        fetch('/api/bookings?role=STUDENT', { cache: 'no-store' }),
        fetch('/api/student/referral', { cache: 'no-store' }),
        fetch('/api/student/favorites', { cache: 'no-store' }),
        fetch('/api/payments', { cache: 'no-store' }),
      ]);

      const bookingsJson = await bookingsRes.json();
      const referralJson = await referralRes.json();
      const favoritesJson = await favoritesRes.json();
      const paymentsJson = await paymentsRes.json();

      setData({
        bookings: bookingsJson.data || [],
        packages: bookingsJson.packages || [],
        favorites: favoritesJson.data || [],
        payments: paymentsJson.data || [],
        referral: referralJson.data || null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading student dashboard:', error);
      setData((prev) => ({ ...prev, isLoading: false }));
    }
  }

  useEffect(() => {
    if (session?.user) {
      void loadData();
    }
  }, [session]);

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
      void loadData();
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

  if (data.isLoading) {
    return (
      <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-32 flex justify-center">
        <div className="w-10 h-10 border-4 border-navy-100 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  const upcoming = data.bookings.filter((booking) => booking.status === 'CONFIRMED' || booking.status === 'PENDING');
  const chatTarget = selectedConversation
    ? {
        conversationId: selectedConversation.id,
        tutorProfileId: selectedConversation.tutorProfile.id,
        tutorName: selectedConversation.tutorProfile.user.name,
        tutorImage: selectedConversation.tutorProfile.user.avatarUrl,
      }
    : directMessageTutor;

  return (
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
              className={`px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-navy-600 text-white shadow-xl scale-105'
                  : 'text-navy-400 dark:text-cream-400/60 hover:text-navy-600 dark:hover:text-cream-200 hover:bg-white dark:hover:bg-navy-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <ContinueLearningPrompt bookings={data.bookings} packages={data.packages} />
              <div className="glass-card overflow-hidden">
                <div className="p-6 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20 flex items-center justify-between">
                  <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Upcoming Lessons</h2>
                  <button onClick={() => setActiveTab('bookings')} className="text-[10px] font-bold text-gold-600 hover:underline">
                    View Schedule
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {upcoming.length > 0 ? (
                    upcoming.slice(0, 3).map((booking) => (
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
                        <div className="text-right">
                          <p className="text-xs font-black text-navy-600 dark:text-cream-200">{formatTime(booking.scheduledAt)}</p>
                          <span className="text-[9px] font-black uppercase tracking-widest text-gold-600">{booking.status}</span>
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
                    <p className="text-4xl font-display font-black">{data.bookings.filter((booking) => booking.status === 'COMPLETED').length}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                    <div>
                      <p className="text-[10px] font-bold text-cream-400/60">Saved Tutors</p>
                      <p className="text-xl font-bold">{data.favorites.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-cream-400/60">Payments</p>
                      <p className="text-xl font-bold">{data.payments.length}</p>
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
                    value={data.referral?.referralCode || ''}
                    className="w-full bg-navy-50/50 dark:bg-navy-700/30 border-2 border-dashed border-navy-100 dark:border-navy-500/20 rounded-xl p-3 text-sm font-black text-center text-navy-600 dark:text-gold-400 select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(data.referral?.referralCode || '');
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
              {data.bookings.map((booking) => (
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
                    {booking.status === 'COMPLETED' && (
                      <button
                        onClick={() => setSelectedReportBooking(booking)}
                        className="text-[10px] font-bold text-navy-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                      >
                        Report
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
            <div className={`lg:col-span-4 glass-card overflow-hidden flex flex-col ${chatTarget ? 'hidden lg:flex' : 'flex'}`}>
              <div className="p-4 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20">
                <h2 className="text-xs font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Conversations</h2>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <ConversationList
                  onSelectConversation={(conversation) => {
                    setSelectedConversation(conversation);
                    setDirectMessageTutor(null);
                  }}
                  selectedId={selectedConversation?.id}
                />
              </div>
            </div>

            <div className={`lg:col-span-8 h-full ${!chatTarget ? 'hidden lg:flex items-center justify-center glass-card opacity-30 text-center p-10 bg-white dark:bg-navy-700/30' : 'flex flex-col'}`}>
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
              {data.payments.length > 0 ? (
                data.payments.map((payment) => (
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-gold-600 mt-1">{payment.status.replaceAll('_', ' ')}</p>
                      {payment.canPayNow && (
                        <button
                          onClick={() => void handlePayNow(payment.id)}
                          disabled={payingPaymentId === payment.id}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-navy-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-navy-700 disabled:bg-navy-200 disabled:text-navy-400"
                        >
                          {payingPaymentId === payment.id ? (
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          ) : null}
                          Pay with Stripe
                        </button>
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
              Referral code: <span className="font-black text-navy-600 dark:text-cream-200">{data.referral?.referralCode || 'Not available'}</span>
            </p>
            <p className="mt-2 text-sm text-navy-400 dark:text-cream-300/70">
              Total earned: <span className="font-black text-navy-600 dark:text-cream-200">{formatCurrency(data.referral?.totalCredits || 0)}</span>
            </p>
          </div>
        )}
      </div>

      {selectedReportBooking && (
        <ReportIssueModal booking={selectedReportBooking} isOpen={!!selectedReportBooking} onClose={() => setSelectedReportBooking(null)} />
      )}
    </div>
  );
}
