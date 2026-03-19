'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import StatsOverview from '@/components/dashboard/tutor/StatsOverview';
import CertificationStatus from '@/components/dashboard/tutor/CertificationStatus';
import AvailabilityManager from '@/components/dashboard/tutor/AvailabilityManager';
import PricingManager from '@/components/dashboard/tutor/PricingManager';
import ReviewsSection from '@/components/dashboard/tutor/ReviewsSection';

export default function TutorDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [verificationData, setVerificationData] = useState<{ status: string, certifications: any[], documents: any[], notes?: string | null } | null>(null);
  const [availability, setAvailability] = useState<any[] | null>(null);
  const [bookings, setBookings] = useState<any[] | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [verifyRes, availRes, bookingsRes, statsRes] = await Promise.all([
          fetch('/api/tutor/verify'),
          fetch('/api/tutor/availability'),
          fetch('/api/tutor/bookings'),
          fetch('/api/tutor/stats')
        ]);

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          setVerificationData(verifyData);
        }

        if (availRes.ok) {
          const availData = await availRes.json();
          setAvailability(availData.slots);
        }

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  const handleDeleteCredential = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This will also remove it from the Admin review list.')) return;

    try {
      const response = await fetch(`/api/tutor/verify/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Document removed successfully');
        setVerificationData(prev => prev ? {
          ...prev,
          documents: prev.documents.filter(c => c.id !== id)
        } : null);
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An error occurred during deletion');
    }
  };

  const isVerified = verificationData?.status === 'APPROVED';

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-cream-200 dark:bg-navy-600">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-navy-400 animate-pulse uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-20 bg-cream-200 dark:bg-navy-600">
      <div className="page-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-glass border-4 border-white dark:border-navy-500">
              {session?.user?.image ? (
                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(session?.user?.name || 'Tutor')
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200">
                  Welcome back, {session?.user?.name?.split(' ')[0]}
                </h1>
                {isVerified ? (
                  <div className="group relative">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sage-500/20">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                      Verified
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <div className="unverified-badge px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gold-500/10 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="animate-pulse"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      Unverified
                    </div>
                  </div>
                )}
              </div>
              <p className="text-navy-400 dark:text-cream-400/50 font-medium">Ready for another day of helping students? 🍎</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-1.5 bg-white/50 dark:bg-navy-700/50 backdrop-blur-md rounded-2xl border border-white dark:border-navy-500 shadow-sm">
            {['overview', 'availability', 'pricing', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-navy-600 text-white shadow-lg scale-[1.02]'
                    : 'text-navy-400 hover:text-navy-600 dark:hover:text-cream-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Content Based on Tabs */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {stats && <StatsOverview stats={stats} />}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Upcoming Sessions */}
                  <div className="glass-card p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Upcoming Sessions</h2>
                        <p className="text-xs text-navy-300 dark:text-cream-400/40 mt-1">Don&apos;t forget to prepare for your next sessions.</p>
                      </div>
                      <Link href="/dashboard/tutor/calendar" className="text-[10px] font-black text-navy-400 hover:text-gold-500 transition-colors uppercase tracking-widest flex items-center gap-2">
                        View Calendar
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="9 18 15 12 9 6"/></svg>
                      </Link>
                    </div>

                    {bookings && bookings.length > 0 ? (
                      <div className="space-y-4">
                        {bookings.map((booking) => {
                          const date = new Date(booking.scheduledAt);
                          const isToday = date.toDateString() === new Date().toDateString();
                          return (
                            <div key={booking.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-3xl border border-navy-100 dark:border-navy-400/10 bg-white/40 dark:bg-navy-600/30 hover:bg-white dark:hover:bg-navy-600 hover:shadow-xl hover:translate-x-1 transition-all group duration-300">
                              <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white transition-transform group-hover:rotate-3 ${isToday ? 'bg-gold-500 shadow-gold/30 shadow-lg' : 'bg-navy-600 dark:bg-navy-400'}`}>
                                  <span className="text-[10px] font-black uppercase tracking-tighter opacity-80">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                                  <span className="text-xl font-display font-bold leading-none">{date.getDate()}</span>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-base font-bold text-navy-600 dark:text-cream-200">{booking.student.name}</h3>
                                    <span className="px-2.5 py-0.5 rounded-lg bg-gold-400/10 text-gold-600 text-[9px] font-black uppercase tracking-widest border border-gold-400/20">
                                      {booking.subject.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-navy-400 dark:text-cream-400/50 font-medium">
                                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {booking.durationMinutes} min session
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                                <button className="flex-1 sm:flex-none btn-outline py-2.5 px-6 text-xs font-bold border-navy-100 dark:border-navy-400 rounded-xl hover:border-gold-400">Notes</button>
                                <button className="flex-1 sm:flex-none btn-primary py-2.5 px-6 text-xs font-bold shadow-gold/20 shadow-lg group-hover:scale-105">Join Room</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-16 border-2 border-dashed border-navy-100 dark:border-navy-400/10 rounded-[40px] bg-navy-50/30 dark:bg-navy-700/10">
                         <div className="w-16 h-16 rounded-full bg-navy-100 dark:bg-navy-600 flex items-center justify-center mx-auto mb-4 text-navy-300">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </div>
                        <p className="text-base font-bold text-navy-400 dark:text-cream-400/60 mb-2">No upcoming sessions</p>
                        <p className="text-xs text-navy-300 dark:text-cream-400/40 max-w-xs mx-auto">Update your availability and subjects to get more bookings!</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <CertificationStatus certifications={verificationData?.certifications || []} />
                  
                  {/* Uploaded Documents List */}
                  <div className="glass-card p-6">
                    <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200 mb-6 uppercase tracking-wider">Submitted Documents</h3>
                    <div className="space-y-3">
                      {(verificationData?.documents || []).length > 0 ? (
                        verificationData?.documents.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-navy-50/50 dark:bg-navy-700/30 border border-navy-100/50 dark:border-navy-500/20">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-navy-600 flex items-center justify-center text-navy-400">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-navy-600 dark:text-cream-200 truncate">{doc.fileName}</p>
                                <p className="text-[9px] text-navy-300 dark:text-cream-400/40">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteCredential(doc.id)}
                              className="p-1.5 text-navy-200 hover:text-red-500 transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-center text-navy-300 py-4 italic">No documents uploaded yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="glass-card p-7 space-y-6">
                    <h3 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest border-b border-navy-100 dark:border-navy-500/50 pb-4">Quick Links</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { href: '/dashboard/tutor/students', label: 'My Students', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
                        { href: '/dashboard/tutor/analytics', label: 'Performance', icon: 'M18 20V10M12 20V4M6 20v-6' },
                        { href: '/dashboard/tutor/resources', label: 'Tutor Resources', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' }
                      ].map(link => (
                        <Link key={link.href} href={link.href} className="group flex items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-navy-600/30 border border-navy-50 dark:border-navy-500/30 hover:border-gold-400/50 hover:bg-white dark:hover:bg-navy-600 transition-all duration-300">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-navy-50 dark:bg-navy-500 flex items-center justify-center text-navy-400 group-hover:text-gold-500 transition-colors">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={link.icon}/></svg>
                            </div>
                            <span className="text-sm font-bold text-navy-600 dark:text-cream-200">{link.label}</span>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-navy-200 group-hover:text-gold-400 group-hover:translate-x-1 transition-all"><polyline points="9 18 15 12 9 6"/></svg>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'availability' && <AvailabilityManager />}
          {activeTab === 'pricing' && <PricingManager />}
          {activeTab === 'reviews' && <ReviewsSection />}
        </div>
      </div>
    </div>
  );
}

