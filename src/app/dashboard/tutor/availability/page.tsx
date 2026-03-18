'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

const DAYS = [
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
  { id: 0, label: 'Sunday' },
];

export default function AvailabilityPage() {
  const { data: session } = useSession();
  const [availability, setAvailability] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const response = await fetch('/api/tutor/availability');
        if (response.ok) {
          const data = await response.json();
          setAvailability(data);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchAvailability();
    }
  }, [session]);

  const handleToggleDay = (dayOfWeek: number) => {
    const exists = availability.find((a) => a.dayOfWeek === dayOfWeek);
    if (exists) {
      setAvailability(availability.filter((a) => a.dayOfWeek !== dayOfWeek));
    } else {
      setAvailability([...availability, { dayOfWeek, startTime: '09:00', endTime: '17:00' }]);
    }
  };

  const handleUpdateTimes = (dayOfWeek: number, field: string, value: string) => {
    setAvailability(availability.map((a) => 
      a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/tutor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability }),
      });

      if (response.ok) {
        toast.success('Availability updated successfully');
      } else {
        toast.error('Failed to update availability');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center bg-cream-200 min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-24 pb-16">
      <div className="page-container max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/dashboard/tutor" className="text-xs font-bold text-navy-400 hover:text-gold-500 flex items-center gap-1 mb-2 uppercase tracking-widest">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200">Weekly Schedule</h1>
            <p className="text-navy-300 dark:text-cream-400/60 mt-1">Set your regular working hours for each day of the week.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary px-8 py-3 shadow-lg shadow-gold-500/20 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>

        <div className="space-y-4">
          {DAYS.map((day) => {
            const slot = availability.find((a) => a.dayOfWeek === day.id);
            const isActive = !!slot;

            return (
              <div key={day.id} className={`glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${isActive ? 'border-gold-400/30 bg-gold-400/5' : 'opacity-60'}`}>
                <div className="flex items-center gap-4 w-full md:w-48">
                  <button 
                    onClick={() => handleToggleDay(day.id)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${isActive ? 'bg-gold-400' : 'bg-navy-200 dark:bg-navy-500'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isActive ? 'left-7' : 'left-1'}`} />
                  </button>
                  <span className={`font-bold uppercase tracking-widest text-xs ${isActive ? 'text-navy-600 dark:text-cream-200' : 'text-navy-300'}`}>
                    {day.label}
                  </span>
                </div>

                {isActive ? (
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-navy-300 uppercase tracking-widest">Start Time</label>
                      <input 
                        type="time" 
                        value={slot.startTime}
                        onChange={(e) => handleUpdateTimes(day.id, 'startTime', e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-sm font-bold text-navy-600 dark:text-cream-200 outline-none focus:ring-2 focus:ring-gold-400 transition-all"
                      />
                    </div>
                    <div className="h-px w-4 bg-navy-100 dark:bg-navy-400 mt-4" />
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-navy-300 uppercase tracking-widest">End Time</label>
                      <input 
                        type="time" 
                        value={slot.endTime}
                        onChange={(e) => handleUpdateTimes(day.id, 'endTime', e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-sm font-bold text-navy-600 dark:text-cream-200 outline-none focus:ring-2 focus:ring-gold-400 transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-navy-200 italic">Unavailable</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
