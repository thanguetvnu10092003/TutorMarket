# Scheduling System Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace freeform time-range availability with a fixed 30-minute slot grid, add `getNextAvailableDate()`, and surface "Next available" on tutor cards.

**Architecture:** No Prisma schema changes — `AvailabilitySlot` already stores `dayOfWeek`, `startTime`, `endTime`, `isActive`. We change what values get written (30-min records) and how tutors set them (weekly grid UI). Existing `getOpenTimeWindowsForDate` / `isSlotBookable` functions in `src/lib/availability.ts` are untouched.

**Tech Stack:** Next.js 14 App Router, Prisma, React state (mouse events for drag), Tailwind CSS.

---

## Files

| File | Change |
|------|--------|
| `src/lib/availability.ts` | Add `getNextAvailableDate()` |
| `src/lib/admin-dashboard.ts` | Compute `nextAvailableDate` in `getPublicTutorCards()` |
| `src/components/tutors/HorizontalTutorCard.tsx` | Replace "Xd AVAILABILITY" with "Next available" |
| `src/components/dashboard/tutor/WeeklyAvailabilityGrid.tsx` | **NEW** weekly grid component |
| `src/components/dashboard/tutor/AvailabilityManager.tsx` | Replace time-range inputs with `WeeklyAvailabilityGrid` |
| `src/app/onboarding/tutor/steps/Step7Availability.tsx` | Replace time-range inputs with `WeeklyAvailabilityGrid` |
| `src/app/api/tutor/availability/route.ts` | Add :00/:30 slot validation |
| `src/app/api/onboarding/step/[step]/route.ts` | Add :00/:30 slot validation in case 7 |
| `src/app/api/bookings/route.ts` | Add minute/duration validations + atomic conflict check |

---

## Task 1: `getNextAvailableDate` in `src/lib/availability.ts`

**Files:**
- Modify: `src/lib/availability.ts` (end of file, after `isSlotBookable`)

- [ ] **Step 1: Add the function at the end of `src/lib/availability.ts`**

Open `src/lib/availability.ts`. After the closing `}` of `isSlotBookable` (currently the last function), append:

```typescript
export function getNextAvailableDate(input: {
  availability: AvailabilitySlotLike[];
  overrides?: AvailabilityOverrideLike[];
  bookings?: BookingLike[];
  durationMinutes: number;
  days?: number;
}): Date | null {
  const days = input.days ?? 14;
  const today = new Date();

  for (let offset = 0; offset < days; offset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    date.setHours(0, 0, 0, 0);

    const windows = getOpenTimeWindowsForDate({
      date,
      durationMinutes: input.durationMinutes,
      availability: input.availability,
      overrides: input.overrides ?? [],
      bookings: input.bookings ?? [],
    });

    if (windows.length > 0) {
      return date;
    }
  }

  return null;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/Admin/Desktop/WEB && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `availability.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/availability.ts
git commit -m "feat(availability): add getNextAvailableDate helper"
```

---

## Task 2: `nextAvailableDate` in `src/lib/admin-dashboard.ts`

**Files:**
- Modify: `src/lib/admin-dashboard.ts`

- [ ] **Step 1: Add `getNextAvailableDate` to the import on line 4**

Find the existing import:
```typescript
import { hasAvailabilityWithinDays, sortAvailabilitySlots, countAvailableDaysWithinNextDays } from '@/lib/availability';
```

Replace with:
```typescript
import { hasAvailabilityWithinDays, sortAvailabilitySlots, countAvailableDaysWithinNextDays, getNextAvailableDate } from '@/lib/availability';
```

- [ ] **Step 2: Compute `nextAvailableDate` after `availableDaysCount` (around line 1115)**

Find the block:
```typescript
      const availableDaysCount = countAvailableDaysWithinNextDays({
        availability: profile.availability,
        overrides: profile.overrides,
        bookings: profile.bookings,
        durationMinutes: primaryPricingOption?.durationMinutes || 60,
        timezone: profile.timezone || undefined,
      });
```

Immediately after that closing `});`, add:
```typescript

      const nextAvailableDate = getNextAvailableDate({
        availability: profile.availability,
        overrides: profile.overrides,
        bookings: profile.bookings,
        durationMinutes: primaryPricingOption?.durationMinutes || 60,
        days: 14,
      });
```

- [ ] **Step 3: Add `nextAvailableDate` to the intermediate computed object (around line 1127)**

Find the block that starts `return {` inside `.map((profile: any) => {`. Add `nextAvailableDate` to it:
```typescript
      return {
        ...profile,
        primaryPricingOption,
        priceDisplay,
        viewerCurrency,
        verifiedResults,
        publicCountryCode: countryCode,
        publicCountry: profile.countryOfBirth || profile.user.country,
        additionalLanguages,
        hasNextWeekAvailability,
        availableDaysCount,
        nextAvailableDate,          // <-- add this line
        actualBookingCount: bookingData.count,
        actualHoursTaught: Math.round((bookingData.minutes / 60) * 10) / 10,
        actualStudentCount: studentCount,
      };
```

- [ ] **Step 4: Expose `nextAvailableDate` in the final `return sortedProfiles.map(...)` block (around line 1261)**

Find the line:
```typescript
    availableDaysCount: profile.availableDaysCount,
```

Add immediately after it:
```typescript
    nextAvailableDate: profile.nextAvailableDate ? (profile.nextAvailableDate as Date).toISOString() : null,
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin-dashboard.ts
git commit -m "feat(tutors): compute nextAvailableDate in getPublicTutorCards"
```

---

## Task 3: HorizontalTutorCard — "Next available" display

**Files:**
- Modify: `src/components/tutors/HorizontalTutorCard.tsx`

- [ ] **Step 1: Add `formatNextAvailable` helper before the component**

Find the line:
```typescript
function getPricingSummary(tutor: any) {
```

Insert above it:
```typescript
function formatNextAvailable(nextDate: Date | null | string | undefined): string {
  if (!nextDate) return 'No upcoming slots';
  const date = typeof nextDate === 'string' ? new Date(nextDate) : nextDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.getTime() <= today.getTime()) return 'Available today';
  if (date.getTime() <= tomorrow.getTime()) return 'Available tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

```

- [ ] **Step 2: Update the "Open" badge to use `nextAvailableDate`**

Find:
```tsx
        {tutor.availableWithin7Days && (
          <div className="absolute -bottom-1 -right-1 px-2.5 py-1 rounded-full bg-green-500 border-4 border-white dark:border-navy-800 shadow-md z-10 text-[9px] font-black uppercase tracking-widest text-white">
            Open
          </div>
        )}
```

Replace with:
```tsx
        {tutor.nextAvailableDate != null && (
          <div className="absolute -bottom-1 -right-1 px-2.5 py-1 rounded-full bg-green-500 border-4 border-white dark:border-navy-800 shadow-md z-10 text-[9px] font-black uppercase tracking-widest text-white">
            Open
          </div>
        )}
```

- [ ] **Step 3: Replace the availability stat cell**

Find this block (inside the `grid grid-cols-3` section):
```tsx
          <div className="flex flex-col">
            <div className="text-sm font-black text-navy-600 dark:text-cream-200 mb-1">
              {(tutor.availableDaysCount ?? 0) > 0 ? `${tutor.availableDaysCount}d` : 'N/A'}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">
              availability
            </span>
          </div>
```

Replace with:
```tsx
          <div className="flex flex-col">
            <div className="text-[10px] font-black text-navy-600 dark:text-cream-200 mb-1 truncate leading-tight">
              {formatNextAvailable(tutor.nextAvailableDate)}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">
              next available
            </span>
          </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add src/components/tutors/HorizontalTutorCard.tsx
git commit -m "feat(tutors): replace availability days with next-available date on tutor cards"
```

---

## Task 4: Create `WeeklyAvailabilityGrid.tsx`

**Files:**
- Create: `src/components/dashboard/tutor/WeeklyAvailabilityGrid.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/dashboard/tutor/WeeklyAvailabilityGrid.tsx` with the full content below:

```tsx
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
  for (const key of selected) {
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/tutor/WeeklyAvailabilityGrid.tsx
git commit -m "feat(availability): add WeeklyAvailabilityGrid component with click/drag support"
```

---

## Task 5: Update `AvailabilityManager.tsx`

**Files:**
- Modify: `src/components/dashboard/tutor/AvailabilityManager.tsx`

The current file has ~337 lines. We're replacing it with a much simpler version that delegates all slot editing to `WeeklyAvailabilityGrid`.

- [ ] **Step 1: Replace the entire file content**

Write `src/components/dashboard/tutor/AvailabilityManager.tsx` with:

```tsx
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
      toast.success('Availability updated');
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
        key={loadKey}
        initialSlots={loadedSlots}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/tutor/AvailabilityManager.tsx
git commit -m "feat(availability): replace time-range inputs with WeeklyAvailabilityGrid in AvailabilityManager"
```

---

## Task 6: Update `Step7Availability.tsx`

**Files:**
- Modify: `src/app/onboarding/tutor/steps/Step7Availability.tsx`

- [ ] **Step 1: Replace the entire file content**

Write `src/app/onboarding/tutor/steps/Step7Availability.tsx` with:

```tsx
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
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
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
        setTimezone(data.data.timezone || 'Asia/Ho_Chi_Minh');
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
          key={loadKey}
          initialSlots={loadedSlots}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/tutor/steps/Step7Availability.tsx
git commit -m "feat(onboarding): replace time-range inputs with WeeklyAvailabilityGrid in Step7"
```

---

## Task 7: API validation — `POST /api/tutor/availability`

**Files:**
- Modify: `src/app/api/tutor/availability/route.ts`

- [ ] **Step 1: Add `timeToMinutes` and `minutesToTime` to the import**

Find:
```typescript
import { sortAvailabilitySlots, validateDailyAvailabilitySlots } from '@/lib/availability';
```

Replace with:
```typescript
import { sortAvailabilitySlots, validateDailyAvailabilitySlots, timeToMinutes, minutesToTime } from '@/lib/availability';
```

- [ ] **Step 2: Add :00/:30 validation in the POST handler, before the `slotsByDay` building**

Find (around line 72):
```typescript
    const { timezone, slots, overrides } = await request.json();
    const normalizedSlots = Array.isArray(slots) ? slots : [];
    const normalizedOverrides = Array.isArray(overrides) ? overrides : [];

    const tutorProfile = await prisma.tutorProfile.findUnique({
```

Replace with:
```typescript
    const { timezone, slots, overrides } = await request.json();
    const normalizedSlots = Array.isArray(slots) ? slots : [];
    const normalizedOverrides = Array.isArray(overrides) ? overrides : [];

    // Validate: each slot must be on :00 or :30 boundary and exactly 30 minutes long
    for (const slot of normalizedSlots) {
      const startMins = timeToMinutes(slot.startTime);
      if (startMins % 30 !== 0) {
        return NextResponse.json(
          { error: 'Slot times must be on :00 or :30 boundaries' },
          { status: 400 }
        );
      }
      const expectedEnd = minutesToTime(startMins + 30);
      if (slot.endTime !== expectedEnd) {
        return NextResponse.json(
          { error: 'Each slot must be exactly 30 minutes' },
          { status: 400 }
        );
      }
    }

    const tutorProfile = await prisma.tutorProfile.findUnique({
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tutor/availability/route.ts
git commit -m "feat(api): enforce 30-min slot boundaries in availability POST handler"
```

---

## Task 8: API validation — `POST /api/onboarding/step/7`

**Files:**
- Modify: `src/app/api/onboarding/step/[step]/route.ts`

- [ ] **Step 1: Add `timeToMinutes` and `minutesToTime` to the import**

Find:
```typescript
import { sortAvailabilitySlots, validateDailyAvailabilitySlots } from '@/lib/availability';
```

Replace with:
```typescript
import { sortAvailabilitySlots, validateDailyAvailabilitySlots, timeToMinutes, minutesToTime } from '@/lib/availability';
```

- [ ] **Step 2: Add validation in the `case 7` POST handler, before `slotsByDay` is built**

Find (inside `case 7: { // Availability`):
```typescript
        const { timezone, slots, overrides } = body;
        const normalizedSlots = Array.isArray(slots) ? slots : [];
        const normalizedOverrides = Array.isArray(overrides) ? overrides : [];
        const slotsByDay = normalizedSlots.reduce<Record<number, Array<{ startTime: string; endTime: string }>>>(
```

Replace with:
```typescript
        const { timezone, slots, overrides } = body;
        const normalizedSlots = Array.isArray(slots) ? slots : [];
        const normalizedOverrides = Array.isArray(overrides) ? overrides : [];

        // Validate: each slot must be on :00 or :30 boundary and exactly 30 minutes long
        for (const slot of normalizedSlots) {
          const startMins = timeToMinutes(slot.startTime);
          if (startMins % 30 !== 0) {
            return NextResponse.json(
              { error: 'Slot times must be on :00 or :30 boundaries' },
              { status: 400 }
            );
          }
          const expectedEnd = minutesToTime(startMins + 30);
          if (slot.endTime !== expectedEnd) {
            return NextResponse.json(
              { error: 'Each slot must be exactly 30 minutes' },
              { status: 400 }
            );
          }
        }

        const slotsByDay = normalizedSlots.reduce<Record<number, Array<{ startTime: string; endTime: string }>>>(
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/onboarding/step/[step]/route.ts"
git commit -m "feat(api): enforce 30-min slot boundaries in onboarding step 7 handler"
```

---

## Task 9: Bookings API — validations + atomic conflict check

**Files:**
- Modify: `src/app/api/bookings/route.ts`

This task has multiple sub-changes within the same file. Apply them in order.

### Sub-change A: Single/trial — add minute and duration validations

- [ ] **Step 1: Add minute and duration validation after the "future time" check**

Find:
```typescript
    if (scheduledDate.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Please choose a future time slot' }, { status: 400 });
    }

    // Bug 3.1: Validate & normalize subject enum value
```

Replace with:
```typescript
    if (scheduledDate.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Please choose a future time slot' }, { status: 400 });
    }

    // Enforce :00 or :30 minute boundaries
    const scheduledMinutes = scheduledDate.getMinutes();
    if (scheduledMinutes !== 0 && scheduledMinutes !== 30) {
      return NextResponse.json(
        { error: 'Bookings must start on :00 or :30 minute boundaries' },
        { status: 400 }
      );
    }

    // Enforce allowed durations
    if (![30, 60, 90].includes(selectedDurationMinutes)) {
      return NextResponse.json(
        { error: 'Duration must be 30, 60, or 90 minutes' },
        { status: 400 }
      );
    }

    // Bug 3.1: Validate & normalize subject enum value
```

### Sub-change B: Single/trial — replace `booking.create` with atomic transaction

- [ ] **Step 2: Replace the `booking.create` call and subsequent `booking.update` with an atomic transaction**

Find this block (starting after the `slotBookable` check, around line 329):
```typescript
    const rawPrice = type === 'TRIAL' ? 0 : selectedPricingOption?.price || 0;
    const isFreeSession = type === 'TRIAL';
    const exchangeRate = 25500;
    const isVnd = selectedPricingOption?.currency === 'VND';
    const usdPrice = isVnd ? Math.round((rawPrice / exchangeRate) * 100) / 100 : rawPrice;

    const booking = await prisma.booking.create({
      data: {
        studentId,
        tutorProfileId,
        scheduledAt: scheduledDate,
        durationMinutes: selectedDurationMinutes,
        status: 'PENDING',
        sessionNumber: previousSessionsCount + 1,
        isFreeSession,
        subject: normalizedSubject as any,
        meetingLink: buildBookingRoomUrl(`pending-${Date.now()}`),
        notes,
        payment: {
          create: {
            amount: usdPrice,
            status: usdPrice === 0 ? 'CAPTURED' : 'PENDING',
            platformFee: 0,
            tutorPayout: 0,
          },
        },
      },
      include: {
        payment: true,
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        meetingLink: buildBookingRoomUrl(booking.id),
      },
    });
```

Replace with:
```typescript
    const rawPrice = type === 'TRIAL' ? 0 : selectedPricingOption?.price || 0;
    const isFreeSession = type === 'TRIAL';
    const exchangeRate = 25500;
    const isVnd = selectedPricingOption?.currency === 'VND';
    const usdPrice = isVnd ? Math.round((rawPrice / exchangeRate) * 100) / 100 : rawPrice;
    const newEnd = new Date(scheduledDate.getTime() + selectedDurationMinutes * 60 * 1000);

    // Atomic: conflict check + booking creation to prevent double-booking race conditions
    const booking = await prisma.$transaction(async (tx) => {
      const candidate = await tx.booking.findFirst({
        where: {
          tutorProfileId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          scheduledAt: {
            lt: newEnd,
            gt: new Date(scheduledDate.getTime() - 90 * 60 * 1000),
          },
        },
        select: { scheduledAt: true, durationMinutes: true },
      });
      if (candidate) {
        const existingEnd = new Date(
          new Date(candidate.scheduledAt).getTime() + candidate.durationMinutes * 60 * 1000
        );
        if (new Date(candidate.scheduledAt) < newEnd && existingEnd > scheduledDate) {
          throw new Error('SLOT_CONFLICT');
        }
      }

      return tx.booking.create({
        data: {
          studentId,
          tutorProfileId,
          scheduledAt: scheduledDate,
          durationMinutes: selectedDurationMinutes,
          status: 'PENDING',
          sessionNumber: previousSessionsCount + 1,
          isFreeSession,
          subject: normalizedSubject as any,
          meetingLink: buildBookingRoomUrl(`pending-${Date.now()}`),
          notes,
          payment: {
            create: {
              amount: usdPrice,
              status: usdPrice === 0 ? 'CAPTURED' : 'PENDING',
              platformFee: 0,
              tutorPayout: 0,
            },
          },
        },
        include: { payment: true },
      });
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { meetingLink: buildBookingRoomUrl(booking.id) },
    });
```

### Sub-change C: Package — add minute + duration validations

- [ ] **Step 3: Add :00/:30 validation inside the package slot loop**

Find (inside the package block):
```typescript
      // Validate all slots are in the future
      for (const slotIso of packageScheduledSlots) {
        const slotDate = new Date(slotIso);
        if (Number.isNaN(slotDate.getTime()) || slotDate.getTime() <= Date.now()) {
          return NextResponse.json({ error: 'All selected session times must be in the future.' }, { status: 400 });
        }
      }
```

Replace with:
```typescript
      // Validate all slots are in the future and on :00/:30 boundaries
      for (const slotIso of packageScheduledSlots) {
        const slotDate = new Date(slotIso);
        if (Number.isNaN(slotDate.getTime()) || slotDate.getTime() <= Date.now()) {
          return NextResponse.json({ error: 'All selected session times must be in the future.' }, { status: 400 });
        }
        const slotMinutes = slotDate.getMinutes();
        if (slotMinutes !== 0 && slotMinutes !== 30) {
          return NextResponse.json(
            { error: 'Package booking times must be on :00 or :30 minute boundaries' },
            { status: 400 }
          );
        }
      }

      // Enforce allowed durations
      if (![30, 60, 90].includes(selectedDurationMinutes)) {
        return NextResponse.json(
          { error: 'Duration must be 30, 60, or 90 minutes' },
          { status: 400 }
        );
      }
```

### Sub-change D: Package — replace `Promise.all` with sequential atomic loop

- [ ] **Step 4: Replace the `Promise.all` booking-creation block inside the package transaction with a sequential conflict-checking loop**

Inside `prisma.$transaction(async (tx) => {`, find:
```typescript
        // Create one Booking record per scheduled slot
        const packageBookings = await Promise.all(
          packageScheduledSlots.map((slotIso, index) => {
            const slotDate = new Date(slotIso);
            return tx.booking.create({
              data: {
                studentId,
                tutorProfileId,
                packageId: pkg.id,
                scheduledAt: slotDate,
                durationMinutes: selectedDurationMinutes,
                status: 'PENDING',
                sessionNumber: previousSessionsCount + index + 1,
                isFreeSession: false,
                subject: normalizedPkgSubject as any,
                meetingLink: `pending-pkg-${pkg.id}-${index}`,
                notes: notes || null,
              },
            });
          })
        );

        // Update meeting links to use actual booking IDs
        await Promise.all(
          packageBookings.map(b =>
            tx.booking.update({
              where: { id: b.id },
              data: { meetingLink: buildBookingRoomUrl(b.id) },
            })
          )
        );
```

Replace with:
```typescript
        // Create one Booking record per scheduled slot, with atomic conflict check per slot
        const packageBookings: any[] = [];
        for (const [index, slotIso] of packageScheduledSlots.entries()) {
          const slotDate = new Date(slotIso);
          const slotEnd = new Date(slotDate.getTime() + selectedDurationMinutes * 60 * 1000);

          const candidate = await tx.booking.findFirst({
            where: {
              tutorProfileId,
              status: { in: ['PENDING', 'CONFIRMED'] },
              scheduledAt: {
                lt: slotEnd,
                gt: new Date(slotDate.getTime() - 90 * 60 * 1000),
              },
            },
            select: { scheduledAt: true, durationMinutes: true },
          });
          if (candidate) {
            const existingEnd = new Date(
              new Date(candidate.scheduledAt).getTime() + candidate.durationMinutes * 60 * 1000
            );
            if (new Date(candidate.scheduledAt) < slotEnd && existingEnd > slotDate) {
              throw new Error('SLOT_CONFLICT');
            }
          }

          const b = await tx.booking.create({
            data: {
              studentId,
              tutorProfileId,
              packageId: pkg.id,
              scheduledAt: slotDate,
              durationMinutes: selectedDurationMinutes,
              status: 'PENDING',
              sessionNumber: previousSessionsCount + index + 1,
              isFreeSession: false,
              subject: normalizedPkgSubject as any,
              meetingLink: `pending-pkg-${pkg.id}-${index}`,
              notes: notes || null,
            },
          });
          packageBookings.push(b);
        }

        // Update meeting links to use actual booking IDs
        await Promise.all(
          packageBookings.map((b) =>
            tx.booking.update({
              where: { id: b.id },
              data: { meetingLink: buildBookingRoomUrl(b.id) },
            })
          )
        );
```

### Sub-change E: Handle SLOT_CONFLICT in the outer catch

- [ ] **Step 5: Add SLOT_CONFLICT handling to the outer `catch` block**

Find (at the very bottom of the `POST` function):
```typescript
  } catch (error: any) {
    console.error('Booking error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
```

Replace with:
```typescript
  } catch (error: any) {
    console.error('Booking error:', error);
    if (error.message === 'SLOT_CONFLICT') {
      return NextResponse.json(
        { error: 'This time slot is already booked. Please choose another time.', code: 'SLOT_CONFLICT' },
        { status: 409 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
```

- [ ] **Step 6: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/bookings/route.ts
git commit -m "feat(bookings): enforce :00/:30 boundaries, allowed durations, and atomic conflict check"
```

---

## Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: exits 0 with no output.

- [ ] **Step 2: Manual smoke test — availability grid**

1. Log in as a tutor → go to **Dashboard → Availability Manager**.
2. Verify the weekly grid renders (Mon–Sun columns, 06:00–23:30 rows).
3. Existing availability slots should be pre-selected (green).
4. Click a cell → it toggles.
5. Click-drag across several cells → they toggle together.
6. Click a day header (e.g., "Mon") → all 36 Monday slots toggle.
7. Click a time label (e.g., "09:00") → that row toggles across all 7 days.
8. Click **Save Changes** → success toast appears.
9. Reload page → same slots still selected.

- [ ] **Step 3: Manual smoke test — next available on tutor cards**

1. Go to **Find Tutors** page.
2. Each tutor card should show "Next available: [date]" or "Available today/tomorrow" or "No upcoming slots" (instead of the old "Xd availability").
3. "Open" badge appears only for tutors with a next available date (not null).

- [ ] **Step 4: Manual smoke test — booking validation**

1. Attempt to POST to `/api/bookings` with `scheduledAt` at a non-:00/:30 time → expect 400 with "must start on :00 or :30".
2. Attempt with `durationMinutes: 45` → expect 400 with "Duration must be 30, 60, or 90 minutes".
3. Book a valid slot → succeeds.
4. Attempt to book the same tutor at an overlapping time immediately after → expect 409 "SLOT_CONFLICT".

- [ ] **Step 5: Manual smoke test — onboarding step 7**

1. Start tutor onboarding (or navigate to step 7).
2. Verify the weekly grid renders.
3. Select some slots → save → verify stored in DB.
