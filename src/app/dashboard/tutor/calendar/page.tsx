'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { expandWindowsToSlots, getOpenTimeWindowsForDate, timeToMinutes, minutesToTime } from '@/lib/availability';
import { getTzDateParts } from '@/lib/utils';

/**
 * Convert a UTC Date to a YYYY-MM-DD string in the given IANA timezone.
 * This is the canonical way to map a UTC timestamp onto a calendar day cell.
 */
function utcToDateString(utcDate: Date, tz: string): string {
  const p = getTzDateParts(utcDate, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

type CalendarData = {
  availability: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  bookings: Array<{
    id: string;
    scheduledAt: string;
    durationMinutes: number;
    status: string;
    student: { name: string; avatarUrl?: string | null };
    subject: string;
    meetingLink?: string | null;
    notes?: string | null;
  }>;
  overrides: Array<{ date: string; isAvailable: boolean; startTime?: string | null; endTime?: string | null; reason?: string | null }>;
  timezone: string;
};

type ViewMode = 'week' | 'month' | 'day';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-200 border-yellow-400 text-yellow-900 dark:bg-yellow-700/60 dark:border-yellow-500 dark:text-yellow-200',
  CONFIRMED: 'bg-blue-200 border-blue-400 text-blue-900 dark:bg-blue-700/60 dark:border-blue-500 dark:text-blue-200',
  COMPLETED: 'bg-gray-200 border-gray-300 text-gray-600 dark:bg-gray-600/50 dark:border-gray-500 dark:text-gray-300',
};

/** Format a calendar cell date as YYYY-MM-DD in browser local time (matches how days[] is constructed). */
function formatDateParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Format a calendar cell date as YYYY-MM-DD in the tutor's timezone.
 * We use this when we need the cell date and booking date to be in the same reference frame.
 * Since the `days` array is built from browser-local dates, we reformat via Intl to tutor-tz.
 */
function formatDateInTutorTz(d: Date, tz: string) {
  return utcToDateString(d, tz);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function TutorCalendarPage() {
  const { data: session } = useSession();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calData, setCalData] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<CalendarData['bookings'][0] | null>(null);

  const getDateRange = useCallback(() => {
    if (viewMode === 'week') {
      const dow = currentDate.getDay();
      const monday = new Date(currentDate);
      monday.setDate(currentDate.getDate() - ((dow + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: monday, end: sunday };
    }
    if (viewMode === 'day') {
      return { start: currentDate, end: currentDate };
    }
    // month
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return { start, end };
  }, [viewMode, currentDate]);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const { start, end } = getDateRange();
      const res = await fetch(`/api/tutor/calendar?start=${formatDateParam(start)}&end=${formatDateParam(end)}`);
      if (res.ok) {
        setCalData(await res.json());
      } else {
        toast.error('Failed to load calendar');
      }
    } catch {
      toast.error('Failed to load calendar data');
    } finally {
      setIsLoading(false);
    }
  }, [session, getDateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigate = (dir: 1 | -1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
      else if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  };

  const handleBookingAction = async (bookingId: string, action: 'accept' | 'decline' | 'cancel') => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(`Booking ${action}ed`);
        setSelectedBooking(null);
        fetchData();
      } else {
        const json = await res.json();
        toast.error(json.error || 'Action failed');
      }
    } catch {
      toast.error('Action failed');
    }
  };

  // ── WEEK VIEW ────────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const { start } = getDateRange();
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }

    // Build all 30-min slots visible across the week
    const allTimes: string[] = [];
    if (calData) {
      for (const day of days) {
        const windows = getOpenTimeWindowsForDate({
          date: day,
          durationMinutes: 30,
          availability: calData.availability,
          overrides: calData.overrides.map((o) => ({ ...o, date: new Date(o.date) })),
          bookings: [],
        });
        for (const slot of expandWindowsToSlots(windows, 30)) {
          if (!allTimes.includes(slot.startTime)) allTimes.push(slot.startTime);
        }
      }
      allTimes.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-16" />
              {days.map((day) => (
                <th key={day.toISOString()} className={`py-3 text-center font-black text-navy-500 dark:text-cream-300 ${isSameDay(day, new Date()) ? 'text-gold-500 dark:text-gold-400' : ''}`}>
                  <div>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day.getDay()]}</div>
                  <div className="text-[10px] font-bold text-navy-300">{day.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allTimes.map((time) => (
              <tr key={time} className="border-t border-navy-100/30 dark:border-navy-700/30">
                <td className="py-1 pr-3 text-right text-[10px] text-navy-300 font-bold whitespace-nowrap align-top">{time}</td>
                {days.map((day) => {
                  const dateKey = formatDateParam(day);
                  // Check for override block
                  const override = calData?.overrides.find((o) => {
                    const od = new Date(o.date);
                    return isSameDay(od, day) && !o.isAvailable;
                  });
                  if (override) {
                    return (
                      <td key={dateKey} className="py-1 px-0.5 align-top">
                        <div className="h-6 rounded bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-center text-[9px] text-red-500 font-bold">
                          Blocked
                        </div>
                      </td>
                    );
                  }
                  // Check if tutor has availability at this time
                  const slotMins = timeToMinutes(time);
                  const hasAvailability = calData?.availability.some((a) => {
                    if (a.dayOfWeek !== day.getDay()) return false;
                    const rem = slotMins % 30;
                    const snapped = rem === 0 ? slotMins : slotMins + (30 - rem);
                    return snapped >= timeToMinutes(a.startTime) && snapped + 30 <= timeToMinutes(a.endTime);
                  });

                  const tz = calData?.timezone || 'UTC';
                  // Map the calendar cell date to tutor-tz to compare with booking timestamps
                  const cellDateStr = formatDateInTutorTz(day, tz);

                  // Find booking at this slot by comparing booking's date-in-tutorTZ against cell
                  const booking = calData?.bookings.find((b) => {
                    const bd = new Date(b.scheduledAt);
                    if (utcToDateString(bd, tz) !== cellDateStr) return false;
                    const bParts = getTzDateParts(bd, tz);
                    const bStart = bParts.hour * 60 + bParts.minute;
                    return slotMins >= bStart && slotMins < bStart + b.durationMinutes;
                  });

                  if (booking) {
                    const isStart = (() => {
                      const bd = new Date(booking.scheduledAt);
                      const bParts = getTzDateParts(bd, tz);
                      return bParts.hour * 60 + bParts.minute === slotMins;
                    })();
                    return (
                      <td key={dateKey} className="py-1 px-0.5 align-top">
                        <div
                          onClick={() => setSelectedBooking(booking)}
                          className={`h-6 rounded border cursor-pointer truncate flex items-center px-1.5 gap-1 ${STATUS_COLORS[booking.status] || 'bg-gray-100 border-gray-200'}`}
                        >
                          {isStart && (
                            <>
                              <span className="font-bold truncate">{booking.student.name}</span>
                            </>
                          )}
                        </div>
                      </td>
                    );
                  }

                  if (hasAvailability) {
                    return (
                      <td key={dateKey} className="py-1 px-0.5 align-top">
                        <div className="h-6 rounded bg-green-200 dark:bg-green-700/50 border border-green-400 dark:border-green-600" />
                      </td>
                    );
                  }

                  return <td key={dateKey} className="py-1 px-0.5 align-top"><div className="h-6" /></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {allTimes.length === 0 && (
          <div className="py-20 text-center text-navy-300 italic text-sm">No availability set for this week</div>
        )}
      </div>
    );
  };

  // ── MONTH VIEW ───────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

    return (
      <div>
        <div className="grid grid-cols-7 border-b border-navy-100 dark:border-navy-400/20">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} className="min-h-[80px] border-r border-b border-navy-100/30 dark:border-navy-700/30 bg-navy-50/20" />;
            const date = new Date(year, month, day);
            const tz = calData?.timezone || 'UTC';
            const cellStr = formatDateInTutorTz(date, tz);
            const dayBookings = calData?.bookings.filter((b) =>
              utcToDateString(new Date(b.scheduledAt), tz) === cellStr
            ) || [];
            const isToday = utcToDateString(new Date(), tz) === cellStr;
            const counts: Record<string, number> = {};
            for (const b of dayBookings) counts[b.status] = (counts[b.status] || 0) + 1;

            return (
              <div
                key={idx}
                onClick={() => { setCurrentDate(date); setViewMode('day'); }}
                className="min-h-[80px] border-r border-b border-navy-100/30 dark:border-navy-700/30 p-2 cursor-pointer hover:bg-navy-50/50 transition-colors"
              >
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-gold-400 text-white' : 'text-navy-400 dark:text-cream-400/60'}`}>{day}</span>
                <div className="mt-1 space-y-0.5">
                  {Object.entries(counts).map(([status, count]) => (
                    <div key={status} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-500'}`}>
                      {count} {status.toLowerCase()}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── DAY VIEW ─────────────────────────────────────────────────────────────
  const renderDayView = () => {
    const tz = calData?.timezone || 'UTC';
    const cellStr = formatDateInTutorTz(currentDate, tz);
    const dayBookings = calData?.bookings.filter((b) =>
      utcToDateString(new Date(b.scheduledAt), tz) === cellStr
    ) || [];
    const windows = calData ? getOpenTimeWindowsForDate({
      date: currentDate,
      durationMinutes: 30,
      availability: calData.availability,
      overrides: calData.overrides.map((o) => ({ ...o, date: new Date(o.date) })),
      bookings: [],
    }) : [];
    const allSlots = expandWindowsToSlots(windows, 30);

    return (
      <div className="space-y-1">
        {allSlots.length === 0 && (
          <div className="py-12 text-center text-navy-300 italic text-sm">No availability on this day</div>
        )}
        {allSlots.map((slot) => {
          const slotMins = timeToMinutes(slot.startTime);
          const booking = dayBookings.find((b) => {
            const bd = new Date(b.scheduledAt);
            const bStart = bd.getHours() * 60 + bd.getMinutes();
            return slotMins >= bStart && slotMins < bStart + b.durationMinutes;
          });

          if (booking) {
            const bStart = new Date(booking.scheduledAt);
            const isBookingStart = bStart.getHours() * 60 + bStart.getMinutes() === slotMins;
            if (!isBookingStart) return null;
            return (
              <div
                key={slot.startTime}
                onClick={() => setSelectedBooking(booking)}
                className={`p-3 rounded-xl border cursor-pointer ${STATUS_COLORS[booking.status] || 'bg-gray-100 border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{slot.startTime} — {minutesToTime(timeToMinutes(slot.startTime) + booking.durationMinutes)}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{booking.status}</span>
                </div>
                <div className="text-sm font-bold mt-1">{booking.student.name}</div>
                <div className="text-[10px] opacity-70">{booking.subject} • {booking.durationMinutes} min</div>
              </div>
            );
          }

          return (
            <div key={slot.startTime} className="h-8 rounded-xl bg-green-200 dark:bg-green-700/50 border border-green-400 dark:border-green-600 flex items-center px-3 text-[10px] text-green-800 dark:text-green-200 font-bold">
              {slot.startTime} — {slot.endTime}
            </div>
          );
        })}
      </div>
    );
  };

  const { start, end } = getDateRange();
  const headerLabel = viewMode === 'month'
    ? currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
    : viewMode === 'day'
    ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200">Teaching Calendar</h1>
          <p className="text-navy-300 dark:text-cream-400/60 mt-1">Manage your sessions and schedule at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode */}
          <div className="flex items-center bg-white dark:bg-navy-600 rounded-2xl p-1 shadow-sm border border-navy-100 dark:border-navy-400/20">
            {(['week', 'month', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${viewMode === mode ? 'bg-navy-600 text-white' : 'text-navy-400 hover:bg-navy-50 dark:hover:bg-navy-500'}`}
              >
                {mode}
              </button>
            ))}
          </div>
          {/* Navigation */}
          <div className="flex items-center bg-white dark:bg-navy-600 rounded-2xl p-1 shadow-sm border border-navy-100 dark:border-navy-400/20">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-navy-50 dark:hover:bg-navy-500 rounded-xl transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="px-4 font-bold text-navy-600 dark:text-cream-200 text-sm min-w-40 text-center">{headerLabel}</span>
            <button onClick={() => navigate(1)} className="p-2 hover:bg-navy-50 dark:hover:bg-navy-500 rounded-xl transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar body */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center animate-pulse text-navy-300 text-sm">Loading calendar...</div>
        ) : (
          <>
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'day' && renderDayView()}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] font-bold text-navy-400 dark:text-cream-400/60">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 border border-green-400 inline-block" />Available</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-400 inline-block" />Pending</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-400 inline-block" />Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 border border-gray-300 inline-block" />Completed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />Blocked</span>
      </div>

      {/* Booking detail popover */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white dark:bg-navy-600 rounded-3xl p-6 shadow-glass w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-navy-600 dark:text-cream-200">Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} className="text-navy-300 hover:text-navy-600 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="text-navy-300 font-bold text-xs uppercase tracking-widest">Student</span><div className="font-bold text-navy-600 dark:text-cream-200">{selectedBooking.student.name}</div></div>
              <div><span className="text-navy-300 font-bold text-xs uppercase tracking-widest">Time</span><div className="font-bold">{new Date(selectedBooking.scheduledAt).toLocaleString()} • {selectedBooking.durationMinutes} min</div></div>
              <div><span className="text-navy-300 font-bold text-xs uppercase tracking-widest">Subject</span><div className="font-bold">{selectedBooking.subject}</div></div>
              <div><span className="text-navy-300 font-bold text-xs uppercase tracking-widest">Status</span><div className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[selectedBooking.status] || ''}`}>{selectedBooking.status}</div></div>
              {selectedBooking.meetingLink && <a href={selectedBooking.meetingLink} target="_blank" rel="noopener noreferrer" className="block text-blue-500 hover:underline text-xs font-bold">Join Meeting Room</a>}
            </div>
            <div className="mt-6 flex gap-2">
              {selectedBooking.status === 'PENDING' && (
                <>
                  <button onClick={() => handleBookingAction(selectedBooking.id, 'accept')} className="flex-1 py-2 rounded-xl bg-blue-500 text-white font-bold text-xs hover:bg-blue-600 transition-colors">Confirm</button>
                  <button onClick={() => handleBookingAction(selectedBooking.id, 'decline')} className="flex-1 py-2 rounded-xl bg-red-100 text-red-600 font-bold text-xs hover:bg-red-200 transition-colors">Decline</button>
                </>
              )}
              {selectedBooking.status === 'CONFIRMED' && (
                <button onClick={() => handleBookingAction(selectedBooking.id, 'cancel')} className="flex-1 py-2 rounded-xl bg-red-100 text-red-600 font-bold text-xs hover:bg-red-200 transition-colors">Cancel Booking</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="flex justify-start">
        <Link href="/dashboard/tutor" className="btn-outline px-8 py-3 rounded-2xl font-bold flex items-center gap-2 text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
