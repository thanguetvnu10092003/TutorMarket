'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getTimeZoneOptions } from '@/lib/intl-data';
import WeeklyAvailabilityGrid from '@/components/dashboard/tutor/WeeklyAvailabilityGrid';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

type SlotRecord = { dayOfWeek: number; startTime: string; endTime: string };

export default function Step7Availability({ onNext, onBack }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'
  );
  const [timezoneQuery, setTimezoneQuery] = useState('');
  const [loadedSlots, setLoadedSlots] = useState<SlotRecord[]>([]);
  const [gridSlots, setGridSlots] = useState<SlotRecord[]>([]);
  const [loadKey, setLoadKey] = useState(0);
  const [overrides, setOverrides] = useState<string[]>([]);
  const [blockDateInput, setBlockDateInput] = useState('');

  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);
  const filteredTimeZones = useMemo(() => {
    const query = timezoneQuery.trim().toLowerCase();
    if (!query) return timeZoneOptions;
    return timeZoneOptions.filter((o) => o.label.toLowerCase().includes(query));
  }, [timeZoneOptions, timezoneQuery]);

  useEffect(() => {
    fetch('/api/onboarding/step/7')
      .then((r) => r.json())
      .then((data) => {
        if (!data.data) return;
        setTimezone(data.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh');
        const slots: SlotRecord[] = (data.data.slots || []).map((s: any) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        }));
        setLoadedSlots(slots);
        setGridSlots(slots);
        setOverrides(
          (data.data.overrides || []).map((o: any) => o.date?.toString().slice(0, 10))
        );
        setLoadKey((k) => k + 1);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (gridSlots.length === 0) {
      toast.error('Please select at least one availability slot');
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch('/api/onboarding/step/7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          slots: gridSlots,
          overrides: overrides.map((date) => ({ date, reason: 'Blocked' })),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to save availability');
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
        <p className="text-navy-400 dark:text-cream-400/60 mt-1">
          Click or drag to set the 30-minute slots when students can book you.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Your Timezone</label>
        <input
          type="text"
          value={timezoneQuery}
          onChange={(e) => setTimezoneQuery(e.target.value)}
          placeholder="Search timezone"
          className="input-field w-full max-w-md"
        />
        <select
          className="input-field w-full max-w-md"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {filteredTimeZones.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-navy-300 dark:text-cream-400/40">
          Students see these times converted into their own timezone.
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Weekly Schedule</label>
        <WeeklyAvailabilityGrid
          key={`${loadKey}-${timezone}`}
          initialSlots={gridSlots.length > 0 ? gridSlots : loadedSlots}
          onChange={setGridSlots}
          timezone={timezone}
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Block Specific Dates</label>
        <p className="text-xs text-navy-300 dark:text-cream-400/40">
          Add holidays or one-off unavailable dates here.
        </p>
        <div className="flex gap-2 items-center max-w-sm">
          <input
            type="date"
            className="input-field flex-1"
            min={new Date().toISOString().split('T')[0]}
            value={blockDateInput}
            onChange={(e) => setBlockDateInput(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              if (blockDateInput && !overrides.includes(blockDateInput)) {
                setOverrides((prev) => [...prev, blockDateInput]);
              }
              setBlockDateInput('');
            }}
            className="px-4 py-2 rounded-xl bg-navy-600 text-white text-xs font-black uppercase tracking-widest hover:bg-navy-700 transition-colors"
          >
            Add
          </button>
        </div>
        {overrides.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {overrides.map((date) => (
              <span
                key={date}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold"
              >
                {date}
                <button
                  type="button"
                  onClick={() => setOverrides((prev) => prev.filter((v) => v !== date))}
                  className="hover:text-red-800 text-base ml-0.5"
                >
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
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
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
