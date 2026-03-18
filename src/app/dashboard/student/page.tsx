'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { bookings, tutorProfiles, users, conversations, messages, notifications } from '@/lib/mock-data';
import { SUBJECT_LABELS } from '@/types';
import { formatCurrency, formatDate, formatTime, formatRelativeTime, getInitials } from '@/lib/utils';

// Filter mock data for demonstration
const studentBookings = bookings.filter(b => b.studentId === 'student-001');
const upcoming = studentBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING');
const past = studentBookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');
const studentNotifs = notifications.filter(n => n.userId === 'student-001');
const studentConversations = conversations.filter(c => c.studentId === 'student-001');

const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'bookings', label: 'Bookings', icon: '📅' },
  { id: 'messages', label: 'Messages', icon: '💬' },
  { id: 'payments', label: 'Payments', icon: '💳' },
  { id: 'saved', label: 'Saved', icon: '❤️' },
];

export default function StudentDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-24 md:pt-28 pb-16">
      <div className="page-container">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-100 to-gold-200 dark:from-navy-400 dark:to-navy-500 flex items-center justify-center text-lg font-bold text-navy-600 dark:text-gold-400 overflow-hidden shadow-glass border border-navy-100/50 dark:border-navy-400/30">
            {session?.user?.image ? (
              <img src={session.user.image} alt={session.user.name || ''} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold">{getInitials(session?.user?.name || 'User')}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">
              Welcome back, {session?.user?.name?.split(' ')[0] || 'Student'}!
            </h1>
            <p className="text-sm text-navy-300 dark:text-cream-400/60">Student Dashboard</p>
          </div>
          {session?.user?.role === 'STUDENT' && (
            <Link 
              href="/auth/register" 
              onClick={() => {
                // Set intent cookie if they want to switch via the register flow
                document.cookie = `next-auth.intent-role=TUTOR; path=/; max-age=600; SameSite=Lax`;
              }}
              className="ml-auto hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-sage-600/10 hover:bg-sage-600/20 text-sage-600 text-xs font-bold transition-all border border-sage-600/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/></svg>
              BECOME A TUTOR
            </Link>
          )}
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 mb-8 bg-white dark:bg-navy-500 rounded-xl p-1 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gold-400 text-navy-600 shadow-gold'
                  : 'text-navy-400 dark:text-cream-400 hover:text-navy-600 dark:hover:text-cream-200'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Upcoming Sessions', value: upcoming.length, color: 'text-gold-500' },
                { label: 'Completed Sessions', value: past.filter(b => b.status === 'COMPLETED').length, color: 'text-sage-500' },
                { label: 'Unread Messages', value: 1, color: 'text-blue-500' },
                { label: 'Saved Tutors', value: 3, color: 'text-pink-500' },
              ].map((stat, i) => (
                <div key={i} className="glass-card p-5">
                  <p className={`text-3xl font-display font-bold ${stat.color} mb-1`}>{stat.value}</p>
                  <p className="text-xs text-navy-300 dark:text-cream-400/60 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Upcoming Sessions */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-navy-600 dark:text-cream-200">Upcoming Sessions</h2>
                <button onClick={() => setActiveTab('bookings')} className="text-xs text-gold-500 hover:text-gold-600 font-semibold">View All</button>
              </div>
              {upcoming.length > 0 ? upcoming.map(booking => {
                const profile = tutorProfiles.find(p => p.id === booking.tutorProfileId);
                const tutor = profile ? users.find(u => u.id === profile.userId) : null;
                return (
                  <div key={booking.id} className="flex items-center gap-4 py-4 border-b border-navy-100/50 dark:border-navy-400/30 last:border-0">
                    <div className="w-12 h-12 rounded-xl bg-cream-100 dark:bg-navy-500 flex items-center justify-center overflow-hidden">
                      {tutor?.avatarUrl ? (
                        <img src={tutor.avatarUrl} alt={tutor.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-navy-600 dark:text-cream-200">{tutor ? getInitials(tutor.name) : '?'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">{tutor?.name}</h3>
                      <p className="text-xs text-navy-300 dark:text-cream-400/60">
                        {SUBJECT_LABELS[booking.subject]} · {formatDate(booking.scheduledAt)} at {formatTime(booking.scheduledAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {booking.meetingLink && (
                        <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs py-1.5 px-3">Join</a>
                      )}
                      <span className={`badge text-[10px] ${
                        booking.status === 'CONFIRMED' ? 'bg-sage-50 text-sage-600 dark:bg-sage-900/30 dark:text-sage-300' :
                        'bg-gold-50 text-gold-600 dark:bg-gold-900/30 dark:text-gold-300'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8">
                  <p className="text-sm text-navy-300 dark:text-cream-400/60">No upcoming sessions</p>
                  <Link href="/tutors" className="btn-primary text-xs py-2 px-4 mt-3 inline-block">Find a Tutor</Link>
                </div>
              )}
            </div>

            {/* Recent Notifications */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-navy-600 dark:text-cream-200 mb-4">Recent Notifications</h2>
              {studentNotifs.map(notif => (
                <div key={notif.id} className={`flex items-start gap-3 py-3 border-b border-navy-100/50 dark:border-navy-400/30 last:border-0 ${!notif.isRead ? 'bg-gold-50/30 dark:bg-gold-900/10 -mx-3 px-3 rounded-lg' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.isRead ? 'bg-gold-400' : 'bg-transparent'}`} />
                  <div>
                    <p className="text-sm font-semibold text-navy-600 dark:text-cream-200">{notif.title}</p>
                    <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-0.5">{notif.body}</p>
                    <p className="text-xs text-gold-500 mt-1">{formatRelativeTime(notif.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-navy-600 dark:text-cream-200 mb-4">All Bookings</h2>
              {studentBookings.map(booking => {
                const profile = tutorProfiles.find(p => p.id === booking.tutorProfileId);
                const tutor = profile ? users.find(u => u.id === profile.userId) : null;
                return (
                  <div key={booking.id} className="flex items-center gap-4 py-4 border-b border-navy-100/50 dark:border-navy-400/30 last:border-0">
                    <div className="w-12 h-12 rounded-xl bg-cream-100 dark:bg-navy-500 flex items-center justify-center overflow-hidden">
                      {tutor?.avatarUrl && <img src={tutor.avatarUrl} alt={tutor.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">{tutor?.name}</h3>
                      <p className="text-xs text-navy-300 dark:text-cream-400/60">
                        {SUBJECT_LABELS[booking.subject]} · Session #{booking.sessionNumber}
                        {booking.isFreeSession && ' (Free Trial)'}
                      </p>
                      <p className="text-xs text-navy-300 dark:text-cream-400/60">{formatDate(booking.scheduledAt)} at {formatTime(booking.scheduledAt)}</p>
                    </div>
                    <span className={`badge text-[10px] ${
                      booking.status === 'COMPLETED' ? 'bg-sage-50 text-sage-600 dark:bg-sage-900/30 dark:text-sage-300' :
                      booking.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' :
                      booking.status === 'CANCELLED' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300' :
                      'bg-gold-50 text-gold-600 dark:bg-gold-900/30 dark:text-gold-300'
                    }`}>{booking.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-navy-600 dark:text-cream-200 mb-4">Messages</h2>
            {studentConversations.map(conv => {
              const profile = tutorProfiles.find(p => p.id === conv.tutorProfileId);
              const tutor = profile ? users.find(u => u.id === profile.userId) : null;
              const lastMsg = messages.filter(m => m.conversationId === conv.id).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0];
              return (
                <div key={conv.id} className="flex items-center gap-4 py-4 border-b border-navy-100/50 dark:border-navy-400/30 last:border-0 cursor-pointer hover:bg-navy-50/50 dark:hover:bg-navy-500/30 -mx-3 px-3 rounded-lg transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-cream-100 dark:bg-navy-500 overflow-hidden">
                    {tutor?.avatarUrl && <img src={tutor.avatarUrl} alt={tutor.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">{tutor?.name}</h3>
                      <span className="text-xs text-navy-300 dark:text-cream-400/60">{formatRelativeTime(conv.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-navy-300 dark:text-cream-400/60 truncate mt-0.5">{lastMsg?.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-navy-600 dark:text-cream-200 mb-4">Payment History</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-navy-100/50 dark:border-navy-400/30">
                <div>
                  <p className="text-sm font-semibold text-navy-600 dark:text-cream-200">Session with Dr. James Wright</p>
                  <p className="text-xs text-navy-300 dark:text-cream-400/60">CFA Level I · Mar 15, 2026</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy-600 dark:text-cream-200">$150.00</p>
                  <span className="badge-sage text-[10px]">Paid</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-navy-100/50 dark:border-navy-400/30">
                <div>
                  <p className="text-sm font-semibold text-navy-600 dark:text-cream-200">Session with Dr. James Wright</p>
                  <p className="text-xs text-navy-300 dark:text-cream-400/60">CFA Level I · Mar 8, 2026</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy-600 dark:text-cream-200">$150.00</p>
                  <span className="badge-sage text-[10px]">Paid</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-navy-600 dark:text-cream-200">Free Trial with Dr. James Wright</p>
                  <p className="text-xs text-navy-300 dark:text-cream-400/60">CFA Level I · Jun 10, 2024</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-sage-500">Free</p>
                  <span className="badge-gold text-[10px]">Trial</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saved Tab */}
        {activeTab === 'saved' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tutorProfiles.slice(0, 3).map(profile => {
              const tutor = users.find(u => u.id === profile.userId);
              return (
                <Link key={profile.id} href={`/tutors/${profile.id}`} className="glass-card p-5 group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden">
                      {tutor?.avatarUrl && <img src={tutor.avatarUrl} alt={tutor.name} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200 group-hover:text-gold-500 transition-colors">{tutor?.name}</h3>
                      <p className="text-xs text-navy-300 dark:text-cream-400/60">{formatCurrency(profile.hourlyRate)}/hr</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="stat-chip text-xs">⭐ {profile.rating}</div>
                    <div className="stat-chip text-xs">{profile.totalSessions} sessions</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
