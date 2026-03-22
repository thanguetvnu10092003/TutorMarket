'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getTimeZoneOptions } from '@/lib/intl-data';
import { sortAvailabilitySlots, validateDailyAvailabilitySlots } from '@/lib/availability';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_SLOT = { startTime: '09:00', endTime: '17:00' };

type DaySlot = { id?: string; startTime: string; endTime: string; isBooked?: boolean };
type DaySchedule = { isActive: boolean; slots: DaySlot[] };

function createEmptySchedule() {
  return Object.fromEntries(
    DAY_NUMBERS.map((dayNumber) => [dayNumber, { isActive: false, slots: [] }])
  ) as Record<number, DaySchedule>;
}

export default function AvailabilityManager() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [timezoneQuery, setTimezoneQuery] = useState('');
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(createEmptySchedule);
  const [overrides, setOverrides] = useState<any[]>([]);

  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);
  const filteredTimeZones = useMemo(() => {
    const query = timezoneQuery.trim().toLowerCase();
    if (!query) {
      return timeZoneOptions;
    }

    return timeZoneOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [timeZoneOptions, timezoneQuery]);

  async function fetchData() {
    try {
      const response = await fetch('/api/tutor/availability');
      if (!response.ok) {
        throw new Error('Failed to load availability');
      }

      const data = await response.json();
      const rebuilt = createEmptySchedule();

      setTimezone(data.timezone || 'Asia/Ho_Chi_Minh');
      if (Array.isArray(data.slots)) {
        for (const slot of data.slots) {
          rebuilt[slot.dayOfWeek] = rebuilt[slot.dayOfWeek] || { isActive: true, slots: [] };
          rebuilt[slot.dayOfWeek].isActive = true;
          rebuilt[slot.dayOfWeek].slots.push({
            id: slot.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isBooked: slot.isBooked,
          });
        }
      }

      for (const dayNumber of DAY_NUMBERS) {
        if (rebuilt[dayNumber].isActive) {
          rebuilt[dayNumber].slots = sortAvailabilitySlots(rebuilt[dayNumber].slots);
        }
      }

      setSchedule(rebuilt);
      setOverrides(data.overrides || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load availability');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();
  }, []);

  const updateSlot = (dayNumber: number, slotIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((previous) => {
      const nextSlots = [...previous[dayNumber].slots];
      nextSlots[slotIndex] = { ...nextSlots[slotIndex], [field]: value };
      return {
        ...previous,
        [dayNumber]: { ...previous[dayNumber], slots: nextSlots },
      };
    });
  };

  const toggleDay = (dayNumber: number) => {
    setSchedule((previous) => ({
      ...previous,
      [dayNumber]: {
        ...previous[dayNumber],
        isActive: !previous[dayNumber].isActive,
        slots: previous[dayNumber].slots.length > 0 ? previous[dayNumber].slots : [DEFAULT_SLOT],
      },
    }));
  };

  const addSlot = (dayNumber: number) => {
    setSchedule((previous) => ({
      ...previous,
      [dayNumber]: {
        ...previous[dayNumber],
        slots: [...previous[dayNumber].slots, { ...DEFAULT_SLOT }],
      },
    }));
  };

  const removeSlot = (dayNumber: number, slotIndex: number) => {
    setSchedule((previous) => {
      const nextSlots = previous[dayNumber].slots.filter((_, index) => index !== slotIndex);
      return {
        ...previous,
        [dayNumber]: {
          ...previous[dayNumber],
          slots: nextSlots.length > 0 ? nextSlots : [{ ...DEFAULT_SLOT }],
        },
      };
    });
  };

  const handleSave = async () => {
    const slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];

    for (const dayNumber of DAY_NUMBERS) {
      if (!schedule[dayNumber].isActive) {
        continue;
      }

      const normalizedSlots = sortAvailabilitySlots(
        schedule[dayNumber].slots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
        }))
      );

      const validation = validateDailyAvailabilitySlots(normalizedSlots);
      if (!validation.valid) {
        toast.error(`${DAYS[DAY_NUMBERS.indexOf(dayNumber)]}: ${validation.error}`);
        return;
      }

      for (const slot of normalizedSlots) {
        slots.push({ dayOfWeek: dayNumber, startTime: slot.startTime, endTime: slot.endTime });
      }
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/tutor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone, slots, overrides }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to save availability');
      }

      toast.success('Availability updated');
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="glass-card p-12 animate-pulse text-center">Loading availability manager...</div>;
  }

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200">Availability Manager</h2>
          <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-1">Set exact start and end times for each day. Students only see open slots that fit these windows.</p>
        </div>
        <div className="w-full md:w-[360px] space-y-2">
          <input
            type="text"
            value={timezoneQuery}
            onChange={(event) => setTimezoneQuery(event.target.value)}
            placeholder="Search timezone"
            className="input-field w-full text-sm bg-white dark:bg-navy-700"
          />
          <select
            className="input-field w-full text-xs py-2 bg-white dark:bg-navy-700"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          >
            {filteredTimeZones.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button onClick={handleSave} disabled={isSaving} className="btn-primary w-full px-6 py-2 text-xs font-bold shadow-gold/20 shadow-lg">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {DAYS.map((dayLabel, index) => {
            const dayNumber = DAY_NUMBERS[index];
            const day = schedule[dayNumber];

            return (
              <div key={dayNumber} className={`rounded-2xl border transition-all duration-300 ${day.isActive ? 'border-sage-500/30 bg-sage-500/5 shadow-sm' : 'border-navy-100 dark:border-navy-400/10 bg-white/10 dark:bg-navy-600/10'}`}>
                <div className="flex items-center gap-4 p-4">
                  <button
                    onClick={() => toggleDay(dayNumber)}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${day.isActive ? 'bg-sage-500' : 'bg-navy-200 dark:bg-navy-500'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${day.isActive ? 'translate-x-5 left-0.5' : 'left-0.5'}`} />
                  </button>
                  <span className={`font-bold text-sm w-24 ${day.isActive ? 'text-navy-600 dark:text-cream-200' : 'text-navy-300 dark:text-cream-400/40'}`}>
                    {dayLabel}
                  </span>
                </div>

                {day.isActive && (
                  <div className="px-4 pb-4 space-y-2 pl-[4rem]">
                    {day.slots.map((slot, slotIndex) => {
                      const isLocked = slot.isBooked;
                      return (
                        <div key={`${dayNumber}-${slotIndex}`} className="flex flex-wrap items-center gap-2">
                          <input
                            type="time"
                            disabled={isLocked}
                            className="input-field text-sm py-2 w-36 disabled:opacity-50"
                            value={slot.startTime}
                            onChange={(event) => updateSlot(dayNumber, slotIndex, 'startTime', event.target.value)}
                          />
                          <span className="text-navy-300">to</span>
                          <input
                            type="time"
                            disabled={isLocked}
                            className="input-field text-sm py-2 w-36 disabled:opacity-50"
                            value={slot.endTime}
                            onChange={(event) => updateSlot(dayNumber, slotIndex, 'endTime', event.target.value)}
                          />

                          {isLocked ? (
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-2">Booked</span>
                          ) : (
                            <button
                              onClick={() => removeSlot(dayNumber, slotIndex)}
                              className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-navy-200 hover:text-red-500 transition-colors flex items-center justify-center"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <button onClick={() => addSlot(dayNumber)} className="text-[10px] font-black text-gold-500 hover:text-gold-600 uppercase tracking-widest mt-2">
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
            <h3 className="text-sm font-bold mb-4 relative z-10">Weekly Overview</h3>
            <div className="grid grid-cols-7 gap-1 relative z-10">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-black opacity-40">{label}</span>
                  <div className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all ${schedule[DAY_NUMBERS[index]]?.isActive ? 'bg-gold-400 text-navy-600 shadow-gold/30 shadow-md scale-105' : 'bg-white/5 opacity-20'}`}>
                    {schedule[DAY_NUMBERS[index]]?.isActive && <div className="w-1.5 h-1.5 rounded-full bg-navy-600" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-3xl border border-navy-100 dark:border-navy-400/10 bg-white dark:bg-navy-600/50">
            <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200 mb-4 uppercase tracking-wider">Blocked Dates</h3>
            <div className="space-y-3">
              <input
                type="date"
                className="input-field text-xs w-full"
                min={new Date().toISOString().split('T')[0]}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value && !overrides.some((override) => override.date === value)) {
                    setOverrides((previous) => [...previous, { date: value, reason: 'Blocked' }]);
                  }
                  event.target.value = '';
                }}
              />
              <div className="flex flex-wrap gap-2">
                {overrides.map((override) => (
                  <div key={override.date} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 text-[10px] font-bold">
                    {new Date(override.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <button onClick={() => setOverrides((previous) => previous.filter((item) => item.date !== override.date))} className="hover:text-red-800 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
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
