'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Props { onNext: () => void; onBack: () => void; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 0]; // Mon=1... Sun=0

const TIMESLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (UTC+7)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (UTC+7)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (UTC+5:30)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8)' },
  { value: 'America/Chicago', label: 'America/Chicago (UTC-6)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+11)' },
  { value: 'UTC', label: 'UTC (UTC+0)' },
];

interface Slot { startTime: string; endTime: string; }
interface DaySchedule { isActive: boolean; slots: Slot[]; }

export default function Step7Availability({ onNext, onBack }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(() =>
    Object.fromEntries(DAY_NUMBERS.map(d => [d, { isActive: false, slots: [{ startTime: '09:00', endTime: '17:00' }] }]))
  );
  const [overrides, setOverrides] = useState<string[]>([]);
  const [newBlockDate, setNewBlockDate] = useState('');

  useEffect(() => {
    fetch('/api/onboarding/step/7').then(r => r.json()).then(d => {
      if (d.data) {
        if (d.data.timezone) setTimezone(d.data.timezone);
        if (d.data.slots?.length > 0) {
          const rebuilt: Record<number, DaySchedule> = Object.fromEntries(
            DAY_NUMBERS.map(d => [d, { isActive: false, slots: [{ startTime: '09:00', endTime: '17:00' }] }])
          );
          for (const slot of d.data.slots) {
            if (!rebuilt[slot.dayOfWeek]) rebuilt[slot.dayOfWeek] = { isActive: true, slots: [] };
            rebuilt[slot.dayOfWeek].isActive = true;
            rebuilt[slot.dayOfWeek].slots.push({ startTime: slot.startTime, endTime: slot.endTime });
          }
          setSchedule(rebuilt);
        }
        if (d.data.overrides?.length > 0) {
          setOverrides(d.data.overrides.map((o: any) => o.date?.toString().slice(0, 10)));
        }
      }
    }).finally(() => setIsLoading(false));
  }, []);

  const toggleDay = (dayNum: number) => {
    setSchedule(p => ({ ...p, [dayNum]: { ...p[dayNum], isActive: !p[dayNum].isActive } }));
  };

  const addSlot = (dayNum: number) => {
    setSchedule(p => ({
      ...p,
      [dayNum]: { ...p[dayNum], slots: [...p[dayNum].slots, { startTime: '09:00', endTime: '17:00' }] }
    }));
  };

  const removeSlot = (dayNum: number, slotIdx: number) => {
    setSchedule(p => {
      const slots = p[dayNum].slots.filter((_, i) => i !== slotIdx);
      return { ...p, [dayNum]: { ...p[dayNum], slots } };
    });
  };

  const updateSlot = (dayNum: number, slotIdx: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(p => {
      const slots = p[dayNum].slots.map((s, i) => i === slotIdx ? { ...s, [field]: value } : s);
      return { ...p, [dayNum]: { ...p[dayNum], slots } };
    });
  };

  const addOverride = () => {
    if (!newBlockDate || overrides.includes(newBlockDate)) return;
    setOverrides(prev => [...prev, newBlockDate]);
    setNewBlockDate('');
  };

  const handleSave = async () => {
    const slots: any[] = [];
    for (const dayNum of DAY_NUMBERS) {
      const day = schedule[dayNum];
      if (day.isActive) {
        for (const slot of day.slots) {
          if (slot.startTime >= slot.endTime) {
            toast.error(`Invalid time slot on ${DAYS[DAY_NUMBERS.indexOf(dayNum)]}: end time must be after start time`);
            return;
          }
          slots.push({ dayOfWeek: dayNum, startTime: slot.startTime, endTime: slot.endTime });
        }
      }
    }
    if (slots.length === 0) {
      toast.error('Please enable at least one day with available time slots');
      return;
    }

    setIsSaving(true);
    try {
      await fetch('/api/onboarding/step/7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          slots,
          overrides: overrides.map(date => ({ date, reason: 'Blocked' })),
        }),
      });
      toast.success('Availability saved!');
      onNext();
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="glass-card p-8 text-center text-navy-400">Loading...</div>;

  return (
    <div className="glass-card p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Availability</h2>
        <p className="text-navy-400 dark:text-cream-400/60 mt-1">Set your weekly schedule so students know when to book you.</p>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Your Timezone</label>
        <select className="input-field w-full max-w-sm" value={timezone} onChange={e => setTimezone(e.target.value)}>
          {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
        <p className="text-xs text-navy-300 dark:text-cream-400/40">All times shown to students in their local timezone.</p>
      </div>

      {/* Weekly Grid */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Weekly Schedule</label>
        {DAYS.map((dayLabel, idx) => {
          const dayNum = DAY_NUMBERS[idx];
          const day = schedule[dayNum];
          return (
            <div key={dayNum} className={`rounded-2xl border transition-all duration-200 ${day.isActive ? 'border-sage-500/40 bg-sage-500/5' : 'border-navy-100 dark:border-navy-400/20 bg-white/20 dark:bg-navy-600/10'}`}>
              <div className="flex items-center gap-4 p-4">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => toggleDay(dayNum)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${day.isActive ? 'bg-sage-500' : 'bg-navy-200 dark:bg-navy-500'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${day.isActive ? 'translate-x-5 left-0' : 'left-0.5'}`} />
                </button>
                <span className={`font-bold w-28 ${day.isActive ? 'text-navy-600 dark:text-cream-200' : 'text-navy-300 dark:text-cream-400/40'}`}>{dayLabel}</span>
                {!day.isActive && <span className="text-xs text-navy-300 dark:text-cream-400/30">Unavailable</span>}
              </div>

              {day.isActive && (
                <div className="px-4 pb-4 space-y-2 pl-[4.5rem]">
                  {day.slots.map((slot, slotIdx) => (
                    <div key={slotIdx} className="flex items-center gap-2">
                      <select className="input-field text-sm py-2" value={slot.startTime} onChange={e => updateSlot(dayNum, slotIdx, 'startTime', e.target.value)}>
                        {TIMESLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-navy-400 font-bold">→</span>
                      <select className="input-field text-sm py-2" value={slot.endTime} onChange={e => updateSlot(dayNum, slotIdx, 'endTime', e.target.value)}>
                        {TIMESLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {day.slots.length > 1 && (
                        <button onClick={() => removeSlot(dayNum, slotIdx)} className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center text-lg hover:bg-red-200 transition-colors">×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addSlot(dayNum)} className="text-xs font-bold text-gold-500 hover:text-gold-400 transition-colors">
                    + Add another timeslot
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Override / Block dates */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Block Specific Dates</label>
        <p className="text-xs text-navy-300 dark:text-cream-400/40">Add dates you&apos;re unavailable (holidays, travel).</p>
        <div className="flex items-center gap-3">
          <input type="date" className="input-field" value={newBlockDate} onChange={e => setNewBlockDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
          <button onClick={addOverride} className="btn-outline px-4 py-2 rounded-xl text-sm font-bold">Block date</button>
        </div>
        {overrides.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {overrides.map(date => (
              <span key={date} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold">
                {date}
                <button onClick={() => setOverrides(p => p.filter(d => d !== date))} className="hover:text-red-800 text-base ml-0.5">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-navy-100 dark:border-navy-400/20">
        <button onClick={onBack} className="btn-outline px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2">
          {isSaving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving...</> : <>Save and continue <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></>}
        </button>
      </div>
    </div>
  );
}
