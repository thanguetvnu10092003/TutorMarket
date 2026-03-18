'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 0];

const TIMESLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (UTC+7)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
  { value: 'UTC', label: 'UTC (UTC+0)' },
];

export default function AvailabilityManager() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [schedule, setSchedule] = useState<any>({});
  const [overrides, setOverrides] = useState<any[]>([]);
  const [bookedSlots, setBookedSlots] = useState<any[]>([]); // Future bookings that lock slots

  const fetchData = async () => {
    try {
      const res = await fetch('/api/tutor/availability');
      if (res.ok) {
        const d = await res.json();
        setTimezone(d.timezone || 'Asia/Ho_Chi_Minh');
        
        const rebuilt: any = Object.fromEntries(DAY_NUMBERS.map(d => [d, { isActive: false, slots: [] }]));
        if (d.slots?.length > 0) {
          d.slots.forEach((s: any) => {
            rebuilt[s.dayOfWeek].isActive = true;
            rebuilt[s.dayOfWeek].slots.push({ id: s.id, startTime: s.startTime, endTime: s.endTime, isBooked: s.isBooked });
          });
        }
        // Ensure each active day has at least one slot
        DAY_NUMBERS.forEach(dn => {
            if (rebuilt[dn].isActive && rebuilt[dn].slots.length === 0) {
                rebuilt[dn].slots.push({ startTime: '09:00', endTime: '17:00' });
            }
        });
        setSchedule(rebuilt);
        setOverrides(d.overrides || []);
        setBookedSlots(d.bookedSlots || []);
      }
    } catch (error) {
      toast.error('Failed to load availability');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    const slots: any[] = [];
    for (const dn of DAY_NUMBERS) {
      if (schedule[dn].isActive) {
        schedule[dn].slots.forEach((s: any) => {
          slots.push({ dayOfWeek: dn, startTime: s.startTime, endTime: s.endTime });
        });
      }
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/tutor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone, slots, overrides }),
      });
      if (res.ok) {
        toast.success('Availability updated!');
        fetchData();
      }
    } catch {
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="glass-card p-12 animate-pulse text-center">Loading availability manager...</div>;

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200">Availability Manager</h2>
          <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-1">Changes take effect immediately for future bookings.</p>
        </div>
        <div className="flex items-center gap-3">
           <select 
            className="input-field text-xs py-2 bg-white dark:bg-navy-700"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
          >
            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary px-6 py-2 text-xs font-bold shadow-gold/20 shadow-lg"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {DAYS.map((dayLabel, idx) => {
            const dayNum = DAY_NUMBERS[idx];
            const day = schedule[dayNum];
            return (
              <div key={dayNum} className={`rounded-2xl border transition-all duration-300 ${day.isActive ? 'border-sage-500/30 bg-sage-500/5 shadow-sm' : 'border-navy-100 dark:border-navy-400/10 bg-white/10 dark:bg-navy-600/10'}`}>
                <div className="flex items-center gap-4 p-4">
                  <button
                    onClick={() => setSchedule((p:any) => ({ ...p, [dayNum]: { ...p[dayNum], isActive: !p[dayNum].isActive, slots: p[dayNum].slots.length === 0 ? [{startTime:'09:00', endTime:'17:00'}] : p[dayNum].slots } }))}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${day.isActive ? 'bg-sage-500' : 'bg-navy-200 dark:bg-navy-500'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${day.isActive ? 'translate-x-5 left-0.5' : 'left-0.5'}`} />
                  </button>
                  <span className={`font-bold text-sm w-24 ${day.isActive ? 'text-navy-600 dark:text-cream-200' : 'text-navy-300 dark:text-cream-400/40'}`}>{dayLabel}</span>
                </div>

                {day.isActive && (
                  <div className="px-4 pb-4 space-y-2 pl-[4rem]">
                    {day.slots.map((slot: any, sIdx: number) => {
                      const isLocked = slot.isBooked;
                      return (
                        <div key={sIdx} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                          <select 
                            disabled={isLocked}
                            className="input-field text-[11px] py-1.5 w-24 disabled:opacity-50" 
                            value={slot.startTime} 
                            onChange={e => setSchedule((p:any) => {
                              const newSlots = [...p[dayNum].slots];
                              newSlots[sIdx].startTime = e.target.value;
                              return {...p, [dayNum]: {...p[dayNum], slots: newSlots}};
                            })}
                          >
                            {TIMESLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="text-navy-300">→</span>
                          <select 
                            disabled={isLocked}
                            className="input-field text-[11px] py-1.5 w-24 disabled:opacity-50" 
                            value={slot.endTime}
                            onChange={e => setSchedule((p:any) => {
                              const newSlots = [...p[dayNum].slots];
                              newSlots[sIdx].endTime = e.target.value;
                              return {...p, [dayNum]: {...p[dayNum], slots: newSlots}};
                            })}
                          >
                            {TIMESLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          
                          {isLocked ? (
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-2 flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                              Booked
                            </span>
                          ) : (
                            <button 
                              onClick={() => setSchedule((p:any) => {
                                const newSlots = p[dayNum].slots.filter((_:any, i:number) => i !== sIdx);
                                return {...p, [dayNum]: {...p[dayNum], slots: newSlots.length === 0 ? [{startTime:'09:00', endTime:'17:00'}] : newSlots}};
                              })}
                              className="w-6 h-6 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-navy-200 hover:text-red-500 transition-colors flex items-center justify-center"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <button 
                      onClick={() => setSchedule((p:any) => ({
                        ...p,
                        [dayNum]: { ...p[dayNum], slots: [...p[dayNum].slots, { startTime: '09:00', endTime: '17:00' }] }
                      }))}
                      className="text-[10px] font-black text-gold-500 hover:text-gold-600 uppercase tracking-widest mt-2"
                    >
                      + Add timeslot
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-navy-600 dark:bg-navy-700 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 relative z-10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Weekly Overview
            </h3>
            <div className="grid grid-cols-7 gap-1 relative z-10">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-black opacity-40">{d}</span>
                  <div className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all ${
                    schedule[DAY_NUMBERS[i]]?.isActive 
                      ? 'bg-gold-400 text-navy-600 shadow-gold/30 shadow-md scale-105' 
                      : 'bg-white/5 opacity-20'
                  }`}>
                    {schedule[DAY_NUMBERS[i]]?.isActive && (
                       <div className="w-1.5 h-1.5 rounded-full bg-navy-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-cream-400/40 mt-6 leading-relaxed">
              * Highlighted days have active sessions or available slots.
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-navy-100 dark:border-navy-400/10 bg-white dark:bg-navy-600/50">
            <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200 mb-4 uppercase tracking-wider">Date Overrides</h3>
            <div className="space-y-3">
               <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    className="input-field text-xs flex-1"
                    min={new Date().toISOString().split('T')[0]}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val && !overrides.some(o => o.date === val)) {
                          setOverrides(prev => [...prev, { date: val, reason: 'Blocked' }]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
               </div>
               <div className="flex flex-wrap gap-2">
                 {overrides.map(o => (
                   <div key={o.date} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 text-[10px] font-bold">
                     {new Date(o.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                     <button 
                      onClick={() => setOverrides(prev => prev.filter(item => item.date !== o.date))}
                      className="hover:text-red-800 transition-colors"
                     >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                     </button>
                   </div>
                 ))}
                 {overrides.length === 0 && <p className="text-[10px] text-navy-300 italic">No dates blocked yet.</p>}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
