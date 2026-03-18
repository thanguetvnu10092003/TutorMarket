'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function TutorCalendarPage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch('/api/tutor/bookings');
        if (response.ok) {
          const data = await response.json();
          setBookings(data);
        }
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
        toast.error('Failed to load calendar data');
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchBookings();
    }
  }, [session]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getBookingsForDay = (day: number) => {
    return bookings.filter(b => {
      const bDate = new Date(b.scheduledAt);
      return bDate.getDate() === day && 
             bDate.getMonth() === currentDate.getMonth() && 
             bDate.getFullYear() === currentDate.getFullYear();
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200">Teaching Calendar</h1>
          <p className="text-navy-300 dark:text-cream-400/60 mt-1">Manage your sessions and schedule at a glance.</p>
        </div>
        <div className="flex items-center bg-white dark:bg-navy-600 rounded-2xl p-1 shadow-sm border border-navy-100 dark:border-navy-400/20">
          <button onClick={prevMonth} className="p-2 hover:bg-navy-50 dark:hover:bg-navy-500 rounded-xl transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="px-4 font-bold text-navy-600 dark:text-cream-200 min-w-32 text-center">
            {monthName} {year}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-navy-50 dark:hover:bg-navy-500 rounded-xl transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-navy-100 dark:border-navy-400/20">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-4 text-center text-xs font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-5 min-h-[600px]">
          {calendarDays.map((day, idx) => {
            const dayBookings = day ? getBookingsForDay(day) : [];
            const isToday = day === new Date().getDate() && 
                            currentDate.getMonth() === new Date().getMonth() && 
                            currentDate.getFullYear() === new Date().getFullYear();

            return (
              <div key={idx} className={`p-2 border-r border-b border-navy-100 dark:border-navy-400/10 min-h-[120px] transition-colors ${day ? 'bg-white/30 dark:bg-navy-600/20' : 'bg-navy-50/30 dark:bg-navy-700/10'}`}>
                {day && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-gold-400 text-white shadow-gold' : 'text-navy-400 dark:text-cream-400/60'}`}>
                        {day}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayBookings.map((booking: any) => (
                        <div key={booking.id} className="p-1 px-2 rounded-md bg-sage-500/10 border border-sage-500/20 text-[10px] leading-tight group relative cursor-pointer hover:bg-sage-500/20 transition-colors">
                          <div className="font-bold text-sage-600 dark:text-sage-400 truncate">
                            {new Date(booking.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-navy-600 dark:text-cream-200 truncate font-medium">
                            {booking.student.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sage-500 flex items-center justify-center text-white shadow-sage">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">{bookings.length}</p>
            <p className="text-xs text-navy-300 uppercase tracking-widest font-bold">Confirmed Sessions</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gold-400 flex items-center justify-center text-white shadow-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">
              {bookings.filter(b => new Date(b.scheduledAt).toDateString() === new Date().toDateString()).length}
            </p>
            <p className="text-xs text-navy-300 uppercase tracking-widest font-bold">Sessions Today</p>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <Link href="/dashboard/tutor" className="btn-outline px-8 py-3 rounded-2xl font-bold flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
