'use client';

import { useCallback, useRef, useState } from 'react';
import { timeToMinutes, minutesToTime } from '@/lib/availability';

interface SlotRecord {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface WeeklyAvailabilityGridProps {
  initialSlots: SlotRecord[];
  onChange: (slots: SlotRecord[]) => void;
  timezone: string;
}

const DAYS = [
  { short: 'Mon', dayOfWeek: 1 },
  { short: 'Tue', dayOfWeek: 2 },
  { short: 'Wed', dayOfWeek: 3 },
  { short: 'Thu', dayOfWeek: 4 },
  { short: 'Fri', dayOfWeek: 5 },
  { short: 'Sat', dayOfWeek: 6 },
  { short: 'Sun', dayOfWeek: 0 },
];

// 06:00 – 23:30 in 30-min increments = 36 rows
const TIME_SLOTS: string[] = [];
for (let m = 6 * 60; m < 24 * 60; m += 30) {
  TIME_SLOTS.push(minutesToTime(m));
}

function expandToSelected(slots: SlotRecord[]): Set<string> {
  const selected = new Set<string>();
  for (const slot of slots) {
    let cur = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);
    while (cur < end) {
      selected.add(`${slot.dayOfWeek}:${minutesToTime(cur)}`);
      cur += 30;
    }
  }
  return selected;
}

function selectedToSlots(selected: Set<string>): SlotRecord[] {
  const result: SlotRecord[] = [];
  for (const key of Array.from(selected)) {
    const sep = key.indexOf(':');
    const dayOfWeek = parseInt(key.slice(0, sep), 10);
    const startTime = key.slice(sep + 1);
    result.push({
      dayOfWeek,
      startTime,
      endTime: minutesToTime(timeToMinutes(startTime) + 30),
    });
  }
  return result.sort((a, b) =>
    a.dayOfWeek !== b.dayOfWeek
      ? a.dayOfWeek - b.dayOfWeek
      : timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
}

export default function WeeklyAvailabilityGrid({
  initialSlots,
  onChange,
  timezone,
}: WeeklyAvailabilityGridProps) {
  const [selected, setSelected] = useState<Set<string>>(() => expandToSelected(initialSlots));
  const isDragging = useRef(false);
  const dragMode = useRef<'select' | 'deselect'>('select');

  const applyChange = useCallback(
    (next: Set<string>) => {
      setSelected(next);
      onChange(selectedToSlots(next));
    },
    [onChange]
  );

  const handleCellMouseDown = (key: string) => {
    isDragging.current = true;
    dragMode.current = selected.has(key) ? 'deselect' : 'select';
    const next = new Set(selected);
    if (dragMode.current === 'select') next.add(key);
    else next.delete(key);
    applyChange(next);
  };

  const handleCellMouseEnter = (key: string) => {
    if (!isDragging.current) return;
    const next = new Set(selected);
    if (dragMode.current === 'select') next.add(key);
    else next.delete(key);
    applyChange(next);
  };

  const stopDrag = () => {
    isDragging.current = false;
  };

  const toggleDay = (dayOfWeek: number) => {
    const keys = TIME_SLOTS.map((t) => `${dayOfWeek}:${t}`);
    const allOn = keys.every((k) => selected.has(k));
    const next = new Set(selected);
    if (allOn) keys.forEach((k) => next.delete(k));
    else keys.forEach((k) => next.add(k));
    applyChange(next);
  };

  const toggleTimeRow = (startTime: string) => {
    const keys = DAYS.map((d) => `${d.dayOfWeek}:${startTime}`);
    const allOn = keys.every((k) => selected.has(k));
    const next = new Set(selected);
    if (allOn) keys.forEach((k) => next.delete(k));
    else keys.forEach((k) => next.add(k));
    applyChange(next);
  };

  return (
    <div className="select-none" onMouseUp={stopDrag} onMouseLeave={stopDrag}>
      <p className="text-xs text-navy-400 dark:text-cream-400/60 mb-3">
        Click or drag to toggle 30-min slots. Times shown in {timezone}.
        Click a day header to toggle the whole column; click a time label to toggle that row.
      </p>
      <div className="overflow-x-auto">
        <div className="overflow-y-auto rounded-xl border border-navy-100 dark:border-navy-500/20" style={{ maxHeight: '480px' }}>
          <table className="border-collapse text-xs w-full table-fixed">
            <thead className="sticky top-0 z-10 bg-white dark:bg-navy-800 shadow-sm">
              <tr>
                <th className="w-12 py-2 text-right pr-2 text-[9px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">
                  —
                </th>
                {DAYS.map((d) => (
                  <th key={d.dayOfWeek} className="py-2 px-0.5">
                    <button
                      type="button"
                      onClick={() => toggleDay(d.dayOfWeek)}
                      className="w-full text-[10px] font-black uppercase tracking-widest text-navy-500 dark:text-cream-300 hover:text-sage-600 dark:hover:text-sage-400 transition-colors"
                    >
                      {d.short}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((startTime) => (
                <tr key={startTime} className="hover:bg-navy-50/30 dark:hover:bg-navy-700/10">
                  <td className="py-0.5 pr-2 text-right whitespace-nowrap w-12">
                    <button
                      type="button"
                      onClick={() => toggleTimeRow(startTime)}
                      className="text-[9px] font-bold text-navy-300 dark:text-cream-400/40 hover:text-sage-500 dark:hover:text-sage-400 transition-colors leading-none w-full text-right pr-1"
                    >
                      {startTime.endsWith(':00') ? startTime : '·'}
                    </button>
                  </td>
                  {DAYS.map((d) => {
                    const key = `${d.dayOfWeek}:${startTime}`;
                    const on = selected.has(key);
                    return (
                      <td key={key} className="p-0.5">
                        <div
                          className={`h-4 rounded cursor-pointer transition-colors ${
                            on
                              ? 'bg-sage-500 hover:bg-sage-600'
                              : 'bg-navy-50 dark:bg-navy-700/30 hover:bg-sage-100 dark:hover:bg-sage-500/20'
                          }`}
                          onMouseDown={() => handleCellMouseDown(key)}
                          onMouseEnter={() => handleCellMouseEnter(key)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[10px] font-bold text-navy-400 dark:text-cream-400/40">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-sage-500 inline-block" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-navy-100 dark:bg-navy-700/30 border border-navy-200 dark:border-navy-500/20 inline-block" />
          Not set
        </span>
        <span className="ml-auto">
          {selected.size} slot{selected.size !== 1 ? 's' : ''} ({Math.floor(selected.size / 2)}h total)
        </span>
      </div>
    </div>
  );
}
