'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getTimeZoneOptions } from '@/lib/intl-data';
import { sortAvailabilitySlots, validateDailyAvailabilitySlots } from '@/lib/availability';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_SLOT = { startTime: '09:00', endTime: '17:00' };

type DaySlot = { startTime: string; endTime: string };
type DaySchedule = { isActive: boolean; slots: DaySlot[] };

function createSchedule() {
  return Object.fromEntries(
    DAY_NUMBERS.map((dayNumber) => [dayNumber, { isActive: false, slots: [] }])
  ) as Record<number, DaySchedule>;
}

export default function Step7Availability({ onNext, onBack }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [timezoneQuery, setTimezoneQuery] = useState('');
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(createSchedule);
  const [overrides, setOverrides] = useState<string[]>([]);

  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);
  const filteredTimeZones = useMemo(() => {
    const query = timezoneQuery.trim().toLowerCase();
    if (!query) {
      return timeZoneOptions;
    }

    return timeZoneOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [timeZoneOptions, timezoneQuery]);

  useEffect(() => {
    fetch('/api/onboarding/step/7')
      .then((response) => response.json())
      .then((data) => {
        if (!data.data) {
          return;
        }

        setTimezone(data.data.timezone || 'Asia/Ho_Chi_Minh');
        const rebuilt = createSchedule();

        if (Array.isArray(data.data.slots)) {
          for (const slot of data.data.slots) {
            rebuilt[slot.dayOfWeek].isActive = true;
            rebuilt[slot.dayOfWeek].slots.push({
              startTime: slot.startTime,
              endTime: slot.endTime,
            });
          }
        }

        for (const dayNumber of DAY_NUMBERS) {
          if (rebuilt[dayNumber].isActive) {
            rebuilt[dayNumber].slots = sortAvailabilitySlots(rebuilt[dayNumber].slots);
          }
        }

        setSchedule(rebuilt);
        setOverrides((data.data.overrides || []).map((override: any) => override.date?.toString().slice(0, 10)));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateSlot = (dayNumber: number, slotIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((previous) => {
      const nextSlots = [...previous[dayNumber].slots];
      nextSlots[slotIndex] = { ...nextSlots[slotIndex], [field]: value };
      return {
        ...previous,
        [dayNumber]: {
          ...previous[dayNumber],
          slots: nextSlots,
        },
      };
    });
  };

  const toggleDay = (dayNumber: number) => {
    setSchedule((previous) => ({
      ...previous,
      [dayNumber]: {
        ...previous[dayNumber],
        isActive: !previous[dayNumber].isActive,
        slots: previous[dayNumber].slots.length > 0 ? previous[dayNumber].slots : [{ ...DEFAULT_SLOT }],
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

      const daySlots = sortAvailabilitySlots(schedule[dayNumber].slots);
      const validation = validateDailyAvailabilitySlots(daySlots);
      if (!validation.valid) {
        toast.error(`${DAYS[DAY_NUMBERS.indexOf(dayNumber)]}: ${validation.error}`);
        return;
      }

      for (const slot of daySlots) {
        slots.push({
          dayOfWeek: dayNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }

    if (slots.length === 0) {
      toast.error('Please enable at least one day with available time slots');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/onboarding/step/7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          slots,
          overrides: overrides.map((date) => ({ date, reason: 'Blocked' })),
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to save availability');
      }

      toast.success('Availability saved');
      onNext();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="glass-card p-8 text-center text-navy-400">Loading...</div>;
  }

  return (
    <div className="glass-card p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Availability</h2>
        <p className="text-navy-400 dark:text-cream-400/60 mt-1">Set the exact days and time windows students can book.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Your Timezone</label>
        <input
          type="text"
          value={timezoneQuery}
          onChange={(event) => setTimezoneQuery(event.target.value)}
          placeholder="Search timezone"
          className="input-field w-full max-w-md"
        />
        <select className="input-field w-full max-w-md" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
          {filteredTimeZones.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-navy-300 dark:text-cream-400/40">Students see these times converted into their own timezone.</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Weekly Schedule</label>
        {DAYS.map((dayLabel, index) => {
          const dayNumber = DAY_NUMBERS[index];
          const day = schedule[dayNumber];

          return (
            <div key={dayNumber} className={`rounded-2xl border transition-all duration-200 ${day.isActive ? 'border-sage-500/40 bg-sage-500/5' : 'border-navy-100 dark:border-navy-400/20 bg-white/20 dark:bg-navy-600/10'}`}>
              <div className="flex items-center gap-4 p-4">
                <button
                  type="button"
                  onClick={() => toggleDay(dayNumber)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${day.isActive ? 'bg-sage-500' : 'bg-navy-200 dark:bg-navy-500'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${day.isActive ? 'translate-x-5 left-0' : 'left-0.5'}`} />
                </button>
                <span className={`font-bold w-28 ${day.isActive ? 'text-navy-600 dark:text-cream-200' : 'text-navy-300 dark:text-cream-400/40'}`}>
                  {dayLabel}
                </span>
                {!day.isActive && <span className="text-xs text-navy-300 dark:text-cream-400/30">Unavailable</span>}
              </div>

              {day.isActive && (
                <div className="px-4 pb-4 space-y-2 pl-[4.5rem]">
                  {day.slots.map((slot, slotIndex) => (
                    <div key={`${dayNumber}-${slotIndex}`} className="flex items-center gap-2 flex-wrap">
                      <input
                        type="time"
                        className="input-field text-sm py-2"
                        value={slot.startTime}
                        onChange={(event) => updateSlot(dayNumber, slotIndex, 'startTime', event.target.value)}
                      />
                      <span className="text-navy-400 font-bold">to</span>
                      <input
                        type="time"
                        className="input-field text-sm py-2"
                        value={slot.endTime}
                        onChange={(event) => updateSlot(dayNumber, slotIndex, 'endTime', event.target.value)}
                      />
                      {day.slots.length > 1 && (
                        <button type="button" onClick={() => removeSlot(dayNumber, slotIndex)} className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors flex-shrink-0">
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addSlot(dayNumber)} className="text-xs font-bold text-gold-500 hover:text-gold-400 transition-colors">
                    + Add another timeslot
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Block Specific Dates</label>
        <p className="text-xs text-navy-300 dark:text-cream-400/40">Add holidays or one-off unavailable dates here.</p>
        <input
          type="date"
          className="input-field w-full max-w-sm"
          min={new Date().toISOString().split('T')[0]}
          onChange={(event) => {
            const value = event.target.value;
            if (value && !overrides.includes(value)) {
              setOverrides((previous) => [...previous, value]);
            }
            event.target.value = '';
          }}
        />
        {overrides.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {overrides.map((date) => (
              <span key={date} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold">
                {date}
                <button type="button" onClick={() => setOverrides((previous) => previous.filter((value) => value !== date))} className="hover:text-red-800 text-base ml-0.5">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-navy-100 dark:border-navy-400/20">
        <button onClick={onBack} className="btn-outline px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2">
          {isSaving ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...
            </>
          ) : (
            <>
              Save and continue
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
