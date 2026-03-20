'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { SUBJECT_LABELS } from '@/types';
import { formatCurrency, formatDate, formatTime, formatRelativeTime, getInitials } from '@/lib/utils';
import ContinueLearningPrompt from '@/components/student/ContinueLearningPrompt';
import ReportIssueModal from '@/components/student/ReportIssueModal';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import { toast } from 'react-hot-toast';

const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'bookings', label: 'Bookings', icon: '📅' },
  { id: 'messages', label: 'Messages', icon: '💬' },
  { id: 'referral', label: 'Referral', icon: '🎁' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function StudentDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({
    bookings: [] as any[],
    packages: [] as any[],
    referral: null as any,
    isLoading: true
  });
  const [selectedReportBooking, setSelectedReportBooking] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
        try {
            const [bookingsRes, referralRes] = await Promise.all([
                fetch('/api/bookings?role=STUDENT'),
                fetch('/api/student/referral')
            ]);
            
            const bookingsJson = await bookingsRes.json();
            const referralJson = await referralRes.json();
            
            setData({
                bookings: bookingsJson.data || [],
                packages: bookingsJson.packages || [],
                referral: referralJson.data || null,
                isLoading: false
            });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setData(prev => ({ ...prev, isLoading: false }));
        }
    }
    
    if (session) {
        void loadData();
    }
  }, [session]);

  if (data.isLoading) {
    return (
      <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-32 flex justify-center">
        <div className="w-10 h-10 border-4 border-navy-100 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  const upcoming = data.bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING');
  const past = data.bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-24 md:pt-28 pb-16">
      <div className="page-container max-w-6xl">
        {/* Header */}
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
              <p className="text-xs font-bold text-navy-300 dark:text-cream-400/40 uppercase tracking-widest mt-1">Student Portal • {formatDate(new Date().toISOString())}</p>
            </div>
          </div>
          
          <div className="md:ml-auto flex items-center gap-3">
             <Link href="/tutors" className="btn-primary text-xs px-6 py-3 font-black tracking-widest uppercase">Find a Tutor</Link>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-2 mb-10 bg-white/50 dark:bg-navy-800/30 backdrop-blur-md rounded-[24px] p-2 overflow-x-auto custom-scrollbar shadow-glass border border-white/50 dark:border-navy-500/20">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-navy-600 text-white shadow-xl scale-105'
                  : 'text-navy-400 dark:text-cream-400/60 hover:text-navy-600 dark:hover:text-cream-200 hover:bg-white dark:hover:bg-navy-700/50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
               {/* Continue Learning Prompts */}
               <ContinueLearningPrompt bookings={data.bookings} packages={data.packages} />

               {/* Upcoming Sessions Card */}
               <div className="glass-card overflow-hidden">
                  <div className="p-6 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20 flex items-center justify-between">
                     <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Upcoming Lessons</h2>
                     <button onClick={() => setActiveTab('bookings')} className="text-[10px] font-bold text-gold-600 hover:underline">View Schedule</button>
                  </div>
                  <div className="p-6">
                    {upcoming.length > 0 ? (
                      <div className="space-y-4">
                        {upcoming.slice(0, 3).map(booking => (
                          <div key={booking.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-navy-700/30 border border-navy-100/50 dark:border-navy-500/10 hover:border-gold-400/50 transition-all">
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
                                    {SUBJECT_LABELS[booking.subject as keyof typeof SUBJECT_LABELS]} · {formatDate(booking.scheduledAt)}
                                </p>
                             </div>
                             <div className="text-right">
                                <p className="text-xs font-black text-navy-600 dark:text-cream-200">{formatTime(booking.scheduledAt)}</p>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${booking.status === 'CONFIRMED' ? 'text-sage-600' : 'text-gold-600'}`}>
                                    {booking.status}
                                </span>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 opacity-50">
                        <p className="text-sm font-medium">No lessons scheduled yet.</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
               {/* Quick Stats Card */}
               <div className="glass-card p-6 bg-navy-600 text-white shadow-xl shadow-navy-900/20">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-cream-400/40 mb-6">Learning Pulse</h2>
                  <div className="space-y-6">
                    <div>
                        <p className="text-xs font-bold text-cream-400/60 mb-1">Total Lessons</p>
                        <p className="text-4xl font-display font-black">{data.bookings.filter(b => b.status === 'COMPLETED').length}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                        <div>
                            <p className="text-[10px] font-bold text-cream-400/60">Credits</p>
                            <p className="text-xl font-bold">{formatCurrency(data.referral?.totalCredits || 0)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-cream-400/60">Active Packages</p>
                            <p className="text-xl font-bold">{data.packages.length}</p>
                        </div>
                    </div>
                  </div>
               </div>

               {/* Referral Quick Card */}
               <div className="glass-card p-6 border-gold-400/30">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 mb-4">Refer & Earn</h2>
                  <p className="text-xs text-navy-600 dark:text-cream-200 font-medium mb-4">Earn $10 for every friend who joins and books their first lesson.</p>
                  <div className="relative group divide-none">
                     <input 
                        readOnly 
                        value={data.referral?.referralCode || ''} 
                        className="w-full bg-navy-50/50 dark:bg-navy-700/30 border-2 border-dashed border-navy-100 dark:border-navy-500/20 rounded-xl p-3 text-sm font-black text-center text-navy-600 dark:text-gold-400 select-all" 
                     />
                     <button 
                        onClick={() => {
                            navigator.clipboard.writeText(data.referral?.referralCode);
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

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="glass-card max-w-4xl mx-auto overflow-hidden">
             <div className="p-6 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20">
                <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Complete Schedule</h2>
             </div>
             <div className="p-6 divide-y divide-navy-100/50 dark:divide-navy-500/10">
                {data.bookings.map(booking => (
                  <div key={booking.id} className="py-5 flex items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-navy-50 dark:bg-navy-600 flex items-center justify-center overflow-hidden">
                           {booking.tutorProfile.user.avatarUrl ? (
                               <img src={booking.tutorProfile.user.avatarUrl} alt={booking.tutorProfile.user.name} className="w-full h-full object-cover" />
                           ) : (
                               <span className="text-xs font-bold">{getInitials(booking.tutorProfile.user.name)}</span>
                           )}
                        </div>
                        <div>
                           <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">{booking.tutorProfile.user.name}</h3>
                           <p className="text-[10px] text-navy-300 dark:text-cream-400/40 font-bold uppercase tracking-widest">
                               {SUBJECT_LABELS[booking.subject as keyof typeof SUBJECT_LABELS]} · {formatDate(booking.scheduledAt)} at {formatTime(booking.scheduledAt)}
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <span className={`badge py-1.5 px-3 text-[9px] font-black uppercase tracking-widest ${
                            booking.status === 'COMPLETED' ? 'bg-sage-50 text-sage-600' :
                            booking.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                            'bg-gold-50 text-gold-600'
                        }`}>
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

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
            <div className={`lg:col-span-4 glass-card overflow-hidden flex flex-col ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
              <div className="p-4 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20">
                <h2 className="text-xs font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Conversations</h2>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <ConversationList 
                  onSelectConversation={(conv) => setSelectedConversation(conv)}
                  selectedId={selectedConversation?.id}
                />
              </div>
            </div>
            
            <div className={`lg:col-span-8 h-full ${!selectedConversation ? 'hidden lg:flex items-center justify-center glass-card opacity-30 text-center p-10 bg-white dark:bg-navy-700/30' : 'flex flex-col'}`}>
              {selectedConversation ? (
                <ChatWindow 
                  conversationId={selectedConversation.id}
                  tutorName={selectedConversation.tutorProfile.user.name}
                  tutorImage={selectedConversation.tutorProfile.user.avatarUrl}
                  tutorProfileId={selectedConversation.tutorProfile.id}
                  onClose={() => setSelectedConversation(null)}
                />
              ) : (
                <div className="flex flex-col items-center gap-4">
                    <div className="text-4xl text-gold-400">💬</div>
                    <p className="text-xs font-black uppercase tracking-widest leading-relaxed text-navy-400 dark:text-cream-400/40">Select a conversation<br/>to start messaging</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-8 pb-10">
            {/* Notification Preferences */}
            <div className="glass-card overflow-hidden">
                <div className="p-6 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20">
                    <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Notification Alerts</h2>
                </div>
                <div className="p-6 space-y-6">
                    {[
                        { id: 'BOOKING_CONFIRMATION', label: 'Booking Confirmation', desc: 'When your session is confirmed by a tutor' },
                        { id: 'LESSON_REMINDER', label: 'Lesson Reminders', desc: 'Alerts before your session starts' },
                        { id: 'NEW_MESSAGE', label: 'New Messages', desc: 'When a tutor sends you a message' },
                        { id: 'PROMOTIONAL', label: 'Offers & Discounts', desc: 'Referral rewards and seasonal deals' },
                    ].map((pref) => (
                        <div key={pref.id} className="flex items-center justify-between gap-6 pb-6 border-b border-navy-100/50 last:border-0 last:pb-0">
                            <div>
                                <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">{pref.label}</h3>
                                <p className="text-[10px] text-navy-300 dark:text-cream-400/40 font-bold uppercase tracking-widest mt-1">{pref.desc}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-navy-300 text-gold-500 focus:ring-gold-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-navy-400">In-App</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-navy-300 text-gold-500 focus:ring-gold-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-navy-400">Email</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Learning Settings */}
            <div className="glass-card p-6">
                 <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest mb-6">Learning Context</h2>
                 <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-navy-300 dark:text-cream-400/40 uppercase tracking-widest mb-2 block">Primary Timezone</label>
                        <select className="w-full bg-navy-50/50 dark:bg-navy-900/50 border-2 border-navy-100 dark:border-navy-700 rounded-xl p-3 text-sm focus:border-gold-400 outline-none">
                            <option>UTC (Coordinated Universal Time)</option>
                            <option>EST (Eastern Standard Time)</option>
                            <option>GMT (Greenwich Mean Time)</option>
                            <option>ICT (Indochina Time)</option>
                        </select>
                    </div>
                 </div>
                 <div className="mt-8 pt-6 border-t border-navy-100/50">
                    <button onClick={() => toast.success('Preferences saved!')} className="btn-primary w-full py-4 text-xs font-black tracking-widest uppercase shadow-gold-sm">Save Changes</button>
                 </div>
            </div>
          </div>
        )}

        {/* Referral Tab */}
        {activeTab === 'referral' && (
          <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="glass-card overflow-hidden">
                <div className="p-6 bg-white dark:bg-navy-700/50 border-b border-navy-100/50 dark:border-navy-500/20 flex items-center justify-between">
                    <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Referral History</h2>
                    <span className="text-[10px] bg-gold-400 text-navy-600 px-3 py-1.5 rounded-full font-black uppercase tracking-widest shadow-gold-sm">
                        Total Earned: ${data.referral?.totalCredits || 0}
                    </span>
                </div>
                <div className="p-6">
                    {data.referral?.history?.length > 0 ? (
                        <div className="divide-y divide-navy-100/50 dark:divide-navy-500/10">
                            {data.referral.history.map((ref: any) => (
                                <div key={ref.id} className="py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-sage-50 dark:bg-navy-600 flex items-center justify-center font-bold text-sage-600 dark:text-sage-400">
                                            {getInitials(ref.referredUser.name)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-navy-600 dark:text-cream-200">{ref.referredUser.name}</p>
                                            <p className="text-[10px] text-navy-300 dark:text-cream-400/40 font-bold uppercase tracking-widest">Joined {formatDate(ref.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-sage-600 dark:text-sage-400">+$20.00</p>
                                        <p className="text-[9px] text-navy-300 dark:text-cream-400/40 font-black uppercase tracking-widest">Completed</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 opacity-30">
                            <p className="text-4xl mb-4">🎁</p>
                            <p className="text-xs font-black uppercase tracking-widest">No successful referrals yet.<br/>Share your link to start earning!</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-card p-8 bg-gradient-to-br from-gold-400 to-gold-500 text-navy-900 border-none relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center md:text-left">
                        <h3 className="text-2xl font-black font-display uppercase tracking-tight">Give $20, Get $20</h3>
                        <p className="text-sm font-bold mt-2 opacity-80 max-w-sm">Share your love for learning. When your friend signs up and books their first lesson, you both get $20 in credits.</p>
                    </div>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(data.referral?.referralLink);
                            toast.success('Referral link copied!');
                        }}
                        className="bg-navy-900 text-gold-400 px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl"
                    >
                        Copy Link
                    </button>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {selectedReportBooking && (
        <ReportIssueModal 
            booking={selectedReportBooking} 
            isOpen={!!selectedReportBooking} 
            onClose={() => setSelectedReportBooking(null)} 
        />
      )}
    </div>
  );
}
