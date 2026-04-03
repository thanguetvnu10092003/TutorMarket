'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getTimeZoneOptions } from '@/lib/intl-data';
import WeeklyAvailabilityGrid from './WeeklyAvailabilityGrid';

interface AvailabilityManagerProps {
  onSave?: () => void;
}

type SlotRecord = { dayOfWeek: number; startTime: string; endTime: string };

export default function AvailabilityManager({ onSave }: AvailabilityManagerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [timezoneQuery, setTimezoneQuery] = useState('');
  const [loadedSlots, setLoadedSlots] = useState<SlotRecord[]>([]);
  const [gridSlots, setGridSlots] = useState<SlotRecord[]>([]);
  const [loadKey, setLoadKey] = useState(0);
  const [overrides, setOverrides] = useState<any[]>([]);

  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);
  const filteredTimeZones = useMemo(() => {
    const query = timezoneQuery.trim().toLowerCase();
    if (!query) return timeZoneOptions;
    return timeZoneOptions.filter((o) => o.label.toLowerCase().includes(query));
  }, [timeZoneOptions, timezoneQuery]);

  useEffect(() => {
    if (filteredTimeZones.length > 0 && !filteredTimeZones.some((t) => t.value === timezone)) {
      setTimezone(filteredTimeZones[0].value);
    }
  }, [filteredTimeZones, timezone]);

  async function fetchData() {
    try {
      const response = await fetch('/api/tutor/availability');
      if (!response.ok) throw new Error('Failed to load availability');
      const data = await response.json();
      setTimezone(data.timezone || 'Asia/Ho_Chi_Minh');
      const slots: SlotRecord[] = Array.isArray(data.slots)
        ? data.slots.map((s: any) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        : [];
      setLoadedSlots(slots);
      setGridSlots(slots);
      setOverrides(data.overrides || []);
      setLoadKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load availability');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();
  }, []);

  const handleSave = async () => {
    if (gridSlots.length === 0) {
      toast.error('Please select at least one availability slot');
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch('/api/tutor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone, slots: gridSlots, overrides }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to save availability');

      const shifted = json.timezoneShiftApplied && json.timezoneShiftApplied !== 0;

      if (json.conflictCount > 0) {
        toast.error(
          `${json.conflictCount} existing booking${json.conflictCount === 1 ? '' : 's'} no longer fit your schedule. Check the Sessions tab to resolve.`,
          { duration: 8000 }
        );
      } else if (shifted) {
        toast.success(
          'Timezone changed — your availability times have been automatically adjusted to keep the same teaching hours.',
          { duration: 6000 }
        );
      } else {
        toast.success('Availability updated');
      }
      await fetchData();
      onSave?.();
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
          <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-1">
            Click or drag to set your available 30-minute slots each week.
          </p>
        </div>
        <div className="w-full md:w-[360px] space-y-2">
          <input
            type="text"
            value={timezoneQuery}
            onChange={(e) => setTimezoneQuery(e.target.value)}
            placeholder="Search timezone"
            className="input-field w-full text-sm bg-white dark:bg-navy-700"
          />
          <select
            className="input-field w-full text-xs py-2 bg-white dark:bg-navy-700"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {filteredTimeZones.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary w-full px-6 py-2 text-xs font-bold shadow-gold/20 shadow-lg"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <WeeklyAvailabilityGrid
        key={`${loadKey}-${timezone}`}
        initialSlots={gridSlots.length > 0 ? gridSlots : loadedSlots}
        onChange={setGridSlots}
        timezone={timezone}
      />

      <div className="mt-8 p-5 rounded-3xl border border-navy-100 dark:border-navy-400/10 bg-white dark:bg-navy-600/50">
        <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200 mb-4 uppercase tracking-wider">
          Blocked Dates
        </h3>
        <div className="space-y-3">
          <input
            type="date"
            className="input-field text-xs w-full"
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const value = e.target.value;
              if (value && !overrides.some((o) => o.date === value)) {
                setOverrides((prev) => [...prev, { date: value, reason: 'Blocked' }]);
              }
              e.target.value = '';
            }}
          />
          <div className="flex flex-wrap gap-2">
            {overrides.map((o) => (
              <div
                key={o.date}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 text-[10px] font-bold"
              >
                {new Date(o.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                <button
                  onClick={() => setOverrides((prev) => prev.filter((item) => item.date !== o.date))}
                  className="hover:text-red-800 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            {overrides.length === 0 && (
              <p className="text-[10px] text-navy-300 italic">No dates blocked yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
