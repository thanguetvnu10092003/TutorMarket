# Booking System Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the full student booking flow, tutor calendar, pricing settings, and profile availability tab to the fixed 30-minute slot architecture already used by the tutor availability system.

**Architecture:** Extend `src/lib/availability.ts` with `expandWindowsToSlots()` and `getSlotStatusForDate()` as the single source of slot logic. Three new API endpoints consume these functions. All UI components (BookingModal, PricingManager, tutor profile, calendar) are updated to use the new APIs and data shapes.

**Tech Stack:** Next.js 14, Prisma 5, TypeScript, Tailwind CSS, date-fns, framer-motion, react-hot-toast, zod

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `prisma/schema.prisma` | Add `discount5`, `discount10`, `discount20`, `offerFreeTrial` to `TutorProfile` |
| Modify | `src/lib/availability.ts` | Add `SlotItem` type, `expandWindowsToSlots()`, `getSlotStatusForDate()` |
| Modify | `src/app/dashboard/tutor/calendar/page.tsx` | Fix 1-line bug + full rewrite |
| Create | `src/app/api/tutors/[tutorId]/available-slots/route.ts` | New GET endpoint for slot picker |
| Create | `src/app/api/tutors/[tutorId]/weekly-availability/route.ts` | New GET endpoint for availability grid |
| Create | `src/app/api/tutor/calendar/route.ts` | New GET endpoint for tutor calendar data |
| Modify | `src/app/api/tutor/pricing/route.ts` | Save `discount5`, `discount10`, `discount20`, `offerFreeTrial` via POST |
| Modify | `src/components/dashboard/tutor/PricingManager.tsx` | Add package discounts UI + free trial toggle; show only 30/60/90 |
| Modify | `src/components/student/BookingModal.tsx` | Fix slot walking (30-min steps); use tutor discount props; package multi-schedule |
| Modify | `src/app/tutors/[id]/page.tsx` | Replace availability tab text list with weekly grid |

> `getPublicTutorProfile` in `src/lib/admin-dashboard.ts` already spreads `...profile`, so the new TutorProfile fields are automatically included in `GET /api/tutors/[id]` response with no code change.

---

### Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add 4 fields to TutorProfile in `prisma/schema.prisma`**

Find the `TutorProfile` model (around line 200). Add the 4 new fields after `onboardingCompleted`:

```prisma
  onboardingCompleted Boolean            @default(false)
  discount5      Int?
  discount10     Int?
  discount20     Int?
  offerFreeTrial Boolean                 @default(false)
  createdAt           DateTime           @default(now())
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_tutor_package_discounts
```

Expected output: `✔ Generated Prisma Client`

- [ ] **Step 3: Verify generated client**

```bash
npx prisma generate
```

Expected: no errors.

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add discount5/10/20 and offerFreeTrial to TutorProfile"
```

---

### Task 2: Extend `src/lib/availability.ts`

**Files:**
- Modify: `src/lib/availability.ts`

- [ ] **Step 1: Add `SlotItem` type and `expandWindowsToSlots` function**

Add after the `OpenTimeWindow` type definition (after line 25):

```typescript
export type SlotItem = {
  startTime: string;  // "09:00"
  endTime: string;    // "09:30" / "10:00" / "10:30" depending on duration
  status: 'available' | 'booked';
};

/**
 * Expand free OpenTimeWindows into individual :00/:30-aligned slot starts.
 * Walks the window in 30-min steps; each step produces a slot if all
 * `durationMinutes` fit within the window.
 */
export function expandWindowsToSlots(
  windows: OpenTimeWindow[],
  durationMinutes: number
): SlotItem[] {
  const slots: SlotItem[] = [];
  const seen = new Set<string>();

  for (const window of windows) {
    const windowStart = timeToMinutes(window.startTime);
    const windowEnd = timeToMinutes(window.endTime);

    // Snap to next :00 or :30 boundary
    const remainder = windowStart % 30;
    const snappedStart = remainder === 0 ? windowStart : windowStart + (30 - remainder);

    let cur = snappedStart;
    while (cur + durationMinutes <= windowEnd) {
      const startTime = minutesToTime(cur);
      if (!seen.has(startTime)) {
        seen.add(startTime);
        slots.push({
          startTime,
          endTime: minutesToTime(cur + durationMinutes),
          status: 'available',
        });
      }
      cur += 30;
    }
  }

  return sortAvailabilitySlots(slots);
}
```

- [ ] **Step 2: Add `getSlotStatusForDate` convenience wrapper**

Add immediately after `expandWindowsToSlots`:

```typescript
/**
 * Returns individual :00/:30-aligned available slots for a specific date.
 * Slots already past `now` (today only) are excluded.
 */
export function getSlotStatusForDate(input: {
  date: Date;
  durationMinutes: number;
  availability: AvailabilitySlotLike[];
  overrides?: AvailabilityOverrideLike[];
  bookings?: BookingLike[];
  now?: Date;
}): SlotItem[] {
  const { date, durationMinutes, now } = input;

  const windows = getOpenTimeWindowsForDate({
    date,
    durationMinutes,
    availability: input.availability,
    overrides: input.overrides,
    bookings: input.bookings,
  });

  const slots = expandWindowsToSlots(windows, durationMinutes);

  if (!now) return slots;

  const isToday = normalizeDateKey(date) === normalizeDateKey(now);
  if (!isToday) return slots;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((slot) => timeToMinutes(slot.startTime) > nowMinutes);
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/availability.ts
git commit -m "feat(lib): add expandWindowsToSlots and getSlotStatusForDate to availability.ts"
```

---

### Task 3: Fix Calendar Page Bug

**Files:**
- Modify: `src/app/dashboard/tutor/calendar/page.tsx` (line 21)

- [ ] **Step 1: Fix `setBookings(data)` → `setBookings(data.data ?? [])`**

The API at `/api/tutor/bookings` returns `{ data: [...], timezone: "..." }` but the component sets state with the whole object. Change line 21:

```typescript
// BEFORE (line 21):
          const data = await response.json();
          setBookings(data);

// AFTER:
          const data = await response.json();
          setBookings(data.data ?? []);
```

- [ ] **Step 2: Verify fix**

Open `/dashboard/tutor/calendar` in browser. Error `bookings.filter is not a function` must be gone and the calendar renders.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/tutor/calendar/page.tsx
git commit -m "fix(calendar): unwrap data.data array from /api/tutor/bookings response"
```

---

### Task 4: Create `GET /api/tutors/[tutorId]/available-slots`

**Files:**
- Create: `src/app/api/tutors/[tutorId]/available-slots/route.ts`

> Note: The directory `src/app/api/tutors/[tutorId]/` already exists (it has `route.ts` for the public profile). Create the sub-directory `available-slots/` inside it.

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/tutors/[tutorId]/available-slots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSlotStatusForDate } from '@/lib/availability';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { tutorId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');    // "2026-03-31"
    const durationParam = searchParams.get('duration'); // "60"

    if (!dateParam || !durationParam) {
      return NextResponse.json({ error: 'date and duration are required' }, { status: 400 });
    }

    const duration = parseInt(durationParam, 10);
    if (![30, 60, 90].includes(duration)) {
      return NextResponse.json({ error: 'duration must be 30, 60, or 90' }, { status: 400 });
    }

    // Parse date as local calendar date (year-month-day only)
    const [year, month, day] = dateParam.split('-').map(Number);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const tutorProfile = await prisma.tutorProfile.findFirst({
      where: {
        id: params.tutorId,
        hiddenFromSearch: false,
        verificationStatus: { in: ['APPROVED', 'PENDING'] },
      },
      include: {
        availability: { where: { isActive: true } },
        overrides: {
          where: {
            date: {
              gte: new Date(year, month - 1, day, 0, 0, 0, 0),
              lt: new Date(year, month - 1, day + 1, 0, 0, 0, 0),
            },
          },
        },
        bookings: {
          where: {
            scheduledAt: {
              gte: new Date(year, month - 1, day, 0, 0, 0, 0),
              lt: new Date(year, month - 1, day + 1, 0, 0, 0, 0),
            },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          select: { scheduledAt: true, durationMinutes: true, status: true },
        },
      },
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const slots = getSlotStatusForDate({
      date,
      durationMinutes: duration,
      availability: tutorProfile.availability,
      overrides: tutorProfile.overrides,
      bookings: tutorProfile.bookings.map((b) => ({
        scheduledAt: b.scheduledAt,
        durationMinutes: b.durationMinutes,
        status: b.status,
      })),
      now: new Date(),
    });

    return NextResponse.json({
      date: dateParam,
      duration,
      slots,
    });
  } catch (error) {
    console.error('available-slots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Manual test**

Start dev server and run:
```
GET /api/tutors/<any-tutor-id>/available-slots?date=2026-04-01&duration=60
```
Expected: `{ "date": "2026-04-01", "duration": 60, "slots": [...] }` — slots have `startTime`, `endTime`, `status: "available"`. All `startTime` values end in `:00` or `:30`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tutors/[tutorId]/available-slots/route.ts
git commit -m "feat(api): add GET /api/tutors/[tutorId]/available-slots endpoint"
```

---

### Task 5: Create `GET /api/tutors/[tutorId]/weekly-availability`

**Files:**
- Create: `src/app/api/tutors/[tutorId]/weekly-availability/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/tutors/[tutorId]/weekly-availability/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { expandWindowsToSlots, getOpenTimeWindowsForDate, minutesToTime, timeToMinutes } from '@/lib/availability';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tutorId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get('weekStart'); // "2026-03-31"

    if (!weekStartParam) {
      return NextResponse.json({ error: 'weekStart is required' }, { status: 400 });
    }

    const [y, m, d] = weekStartParam.split('-').map(Number);
    const weekStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (isNaN(weekStart.getTime())) {
      return NextResponse.json({ error: 'Invalid weekStart' }, { status: 400 });
    }

    // Build 7 dates
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(y, m - 1, d + i, 0, 0, 0, 0);
      dates.push(dt);
    }
    const weekEnd = dates[6];

    const tutorProfile = await prisma.tutorProfile.findFirst({
      where: {
        id: params.tutorId,
        hiddenFromSearch: false,
        verificationStatus: { in: ['APPROVED', 'PENDING'] },
      },
      include: {
        availability: { where: { isActive: true } },
        overrides: {
          where: {
            date: { gte: weekStart, lte: weekEnd },
          },
        },
        bookings: {
          where: {
            scheduledAt: { gte: weekStart, lte: new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59) },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          select: { scheduledAt: true, durationMinutes: true, status: true },
        },
      },
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const slots: Array<{
      day: string;
      date: string;
      startTime: string;
      endTime: string;
      status: 'available' | 'booked';
    }> = [];

    for (const date of dates) {
      const dateKey = formatDateKey(date);

      // All available 30-min slots for this day (ignoring bookings)
      const allWindows = getOpenTimeWindowsForDate({
        date,
        durationMinutes: 30,
        availability: tutorProfile.availability,
        overrides: tutorProfile.overrides,
        bookings: [],
      });
      const allSlots = expandWindowsToSlots(allWindows, 30);

      // Build set of booked start-times (minute values) for this date
      const bookedMinutes = new Set<number>();
      for (const booking of tutorProfile.bookings) {
        const bDate = new Date(booking.scheduledAt);
        const bDateKey = formatDateKey(bDate);
        if (bDateKey !== dateKey) continue;
        const bStart = bDate.getHours() * 60 + bDate.getMinutes();
        const bEnd = bStart + booking.durationMinutes;
        // Mark every 30-min slot covered by this booking
        for (let t = bStart; t < bEnd; t += 30) {
          bookedMinutes.add(t);
        }
      }

      for (const slot of allSlots) {
        const startMins = timeToMinutes(slot.startTime);
        slots.push({
          day: DAY_NAMES[date.getDay()],
          date: dateKey,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: bookedMinutes.has(startMins) ? 'booked' : 'available',
        });
      }
    }

    return NextResponse.json({
      weekStart: weekStartParam,
      weekEnd: formatDateKey(weekEnd),
      timezone: tutorProfile.timezone || 'UTC',
      slots,
    });
  } catch (error) {
    console.error('weekly-availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tutors/[tutorId]/weekly-availability/route.ts
git commit -m "feat(api): add GET /api/tutors/[tutorId]/weekly-availability endpoint"
```

---

### Task 6: Create `GET /api/tutor/calendar`

**Files:**
- Create: `src/app/api/tutor/calendar/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/tutor/calendar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start'); // "2026-03-31"
    const endParam = searchParams.get('end');     // "2026-04-06"

    if (!startParam || !endParam) {
      return NextResponse.json({ error: 'start and end are required' }, { status: 400 });
    }

    const [sy, sm, sd] = startParam.split('-').map(Number);
    const [ey, em, ed] = endParam.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const endDate = new Date(ey, em - 1, ed, 23, 59, 59, 999);

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        availability: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        overrides: {
          where: { date: { gte: startDate, lte: endDate } },
        },
        bookings: {
          where: {
            scheduledAt: { gte: startDate, lte: endDate },
            status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
          },
          include: {
            student: {
              select: { name: true, avatarUrl: true },
            },
          },
          orderBy: { scheduledAt: 'asc' },
        },
      },
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      availability: tutorProfile.availability.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
      bookings: tutorProfile.bookings.map((b) => ({
        id: b.id,
        scheduledAt: b.scheduledAt.toISOString(),
        durationMinutes: b.durationMinutes,
        status: b.status,
        student: b.student,
        subject: b.subject,
        meetingLink: b.meetingLink,
        notes: b.notes,
      })),
      overrides: tutorProfile.overrides.map((o) => ({
        date: o.date.toISOString(),
        startTime: o.startTime,
        endTime: o.endTime,
        isAvailable: o.isAvailable,
        reason: o.reason,
      })),
      timezone: tutorProfile.timezone || 'UTC',
    });
  } catch (error) {
    console.error('tutor calendar error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tutor/calendar/route.ts
git commit -m "feat(api): add GET /api/tutor/calendar endpoint"
```

---

### Task 7: Update Pricing API to Save Discounts and Free Trial Toggle

**Files:**
- Modify: `src/app/api/tutor/pricing/route.ts`

The current `GET` returns `{ data: tutorProfile.pricing }`. We also need to return the discount/freeTrialfields.
The current `POST` only saves `TutorPricing` rows. We need to also save the 4 new TutorProfile fields.

- [ ] **Step 1: Update GET to also return discount fields**

Replace the current GET return statement (line 28):

```typescript
    return NextResponse.json({
      data: tutorProfile.pricing,
      discount5: tutorProfile.discount5 ?? null,
      discount10: tutorProfile.discount10 ?? null,
      discount20: tutorProfile.discount20 ?? null,
      offerFreeTrial: tutorProfile.offerFreeTrial,
    });
```

- [ ] **Step 2: Update POST to also parse and save discount fields**

Replace the destructuring line (line 43) and add validation + saving:

```typescript
    const { pricing, discount5, discount10, discount20, offerFreeTrial } = await request.json();
    const normalizedPricing = Array.isArray(pricing) ? pricing : [];

    // Validate discount values (0-100 integer or null)
    for (const [key, val] of Object.entries({ discount5, discount10, discount20 })) {
      if (val !== null && val !== undefined) {
        const n = Number(val);
        if (!Number.isInteger(n) || n < 0 || n > 100) {
          return NextResponse.json({ error: `${key} must be an integer between 0 and 100` }, { status: 400 });
        }
      }
    }
```

Then in the `prisma.$transaction` array, replace the `prisma.tutorProfile.update` call (around line 83-88) with:

```typescript
      prisma.tutorProfile.update({
        where: { id: tutorProfile.id },
        data: {
          hourlyRate: primaryOption?.price || tutorProfile.hourlyRate,
          discount5: discount5 != null ? Number(discount5) : null,
          discount10: discount10 != null ? Number(discount10) : null,
          discount20: discount20 != null ? Number(discount20) : null,
          offerFreeTrial: typeof offerFreeTrial === 'boolean' ? offerFreeTrial : tutorProfile.offerFreeTrial,
        },
      }),
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tutor/pricing/route.ts
git commit -m "feat(api): extend /api/tutor/pricing to save package discounts and offerFreeTrial"
```

---

### Task 8: Update `PricingManager.tsx`

**Files:**
- Modify: `src/components/dashboard/tutor/PricingManager.tsx`

Changes: filter durations to 30/60/90 only; add package discount inputs; add free trial toggle; load/save new fields.

- [ ] **Step 1: Replace the full file content**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const DURATIONS = [30, 60, 90];

export default function PricingManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState('VND');
  const [prices, setPrices] = useState<Record<number, { price: number; isEnabled: boolean }>>({
    30: { price: 0, isEnabled: false },
    60: { price: 0, isEnabled: true },
    90: { price: 0, isEnabled: false },
  });
  const [discount5, setDiscount5] = useState<string>('');
  const [discount10, setDiscount10] = useState<string>('');
  const [discount20, setDiscount20] = useState<string>('');
  const [offerFreeTrial, setOfferFreeTrial] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const rates: Record<string, number> = { VND: 25000, USD: 1, SGD: 1.34 };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/tutor/pricing');
      if (res.ok) {
        const json = await res.json();
        const pMap: Record<number, { price: number; isEnabled: boolean }> = {
          30: { price: 0, isEnabled: false },
          60: { price: 250000, isEnabled: true },
          90: { price: 0, isEnabled: false },
        };
        DURATIONS.forEach((d) => {
          const found = json.data.find((item: any) => item.durationMinutes === d);
          if (found) pMap[d] = { price: found.price, isEnabled: found.isEnabled };
        });
        setPrices(pMap);
        setCurrency(json.data[0]?.currency || 'VND');
        setLastUpdated(json.data[0]?.updatedAt || null);
        setDiscount5(json.discount5 != null ? String(json.discount5) : '');
        setDiscount10(json.discount10 != null ? String(json.discount10) : '');
        setDiscount20(json.discount20 != null ? String(json.discount20) : '');
        setOfferFreeTrial(Boolean(json.offerFreeTrial));
      }
    } catch {
      toast.error('Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    const data = Object.entries(prices).map(([duration, details]) => ({
      durationMinutes: parseInt(duration),
      price: details.price,
      isEnabled: details.isEnabled,
      currency,
    }));

    setSaving(true);
    try {
      const res = await fetch('/api/tutor/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing: data,
          discount5: discount5 !== '' ? parseInt(discount5) : null,
          discount10: discount10 !== '' ? parseInt(discount10) : null,
          discount20: discount20 !== '' ? parseInt(discount20) : null,
          offerFreeTrial,
        }),
      });
      if (res.ok) {
        toast.success('Pricing updated!');
        fetchData();
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="glass-card p-12 animate-pulse text-center">Loading pricing manager...</div>;

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200">Pricing Manager</h2>
          <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-1">Set rates for different session lengths.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-1 bg-navy-50 dark:bg-navy-700 rounded-xl border border-navy-100 dark:border-navy-400/20">
            {['VND', 'USD'].map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                  currency === curr ? 'bg-white dark:bg-navy-500 text-navy-600 dark:text-cream-200 shadow-sm' : 'text-navy-300'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-6 py-2 text-xs font-bold shadow-gold/20 shadow-lg"
          >
            {saving ? 'Updating...' : 'Save Pricing'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Duration Pricing */}
        <div className="space-y-4">
          {DURATIONS.map((dur) => (
            <div
              key={dur}
              className={`p-4 rounded-2xl border transition-all ${
                prices[dur].isEnabled
                  ? 'border-gold-400/40 bg-gold-400/5'
                  : 'border-navy-100 dark:border-navy-400/10 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-navy-600 text-gold-400 flex items-center justify-center font-bold text-xs">
                    {dur}&apos;
                  </div>
                  <h4 className="text-sm font-bold text-navy-600 dark:text-cream-200">{dur} Minutes Session</h4>
                </div>
                <button
                  onClick={() => setPrices((p) => ({ ...p, [dur]: { ...p[dur], isEnabled: !p[dur].isEnabled } }))}
                  className={`relative w-8 h-4 rounded-full transition-colors ${prices[dur].isEnabled ? 'bg-gold-400' : 'bg-navy-200'}`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      prices[dur].isEnabled ? 'translate-x-4 left-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-navy-300">{currency}</span>
                  <input
                    type="number"
                    value={prices[dur].price}
                    onChange={(e) =>
                      setPrices((p) => ({ ...p, [dur]: { ...p[dur], price: parseFloat(e.target.value) || 0 } }))
                    }
                    disabled={!prices[dur].isEnabled}
                    className="input-field w-full pl-12 py-2 text-sm font-bold disabled:bg-transparent"
                  />
                </div>
                <div className="flex-1 px-3 py-2 rounded-xl bg-navy-50 dark:bg-navy-700/50 border border-navy-100 dark:border-navy-400/10">
                  <p className="text-[9px] text-navy-300 font-bold uppercase tracking-tighter mb-0.5">Conversion Preview</p>
                  <p className="text-xs font-black text-navy-600 dark:text-cream-200">
                    {currency === 'VND'
                      ? `$${(prices[dur].price / rates['VND']).toFixed(2)} USD`
                      : `${(prices[dur].price * rates['VND']).toLocaleString()} VND`}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Package Discounts */}
          <div className="p-4 rounded-2xl border border-navy-100 dark:border-navy-400/10 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-navy-400 dark:text-cream-400/60">Package Discounts (optional)</h4>
            {[
              { label: '5-lesson package', value: discount5, setter: setDiscount5 },
              { label: '10-lesson package', value: discount10, setter: setDiscount10 },
              { label: '20-lesson package', value: discount20, setter: setDiscount20 },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-navy-500 dark:text-cream-300 w-36">{label}</span>
                <div className="relative w-24">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder="0"
                    className="input-field w-full pr-8 py-1.5 text-sm font-bold text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-navy-300">%</span>
                </div>
                <span className="text-[10px] text-navy-300">off</span>
              </div>
            ))}
          </div>

          {/* Free Trial Toggle */}
          <div className="p-4 rounded-2xl border border-navy-100 dark:border-navy-400/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-navy-600 dark:text-cream-200">Offer Free Trial</p>
              <p className="text-[10px] text-navy-300 mt-0.5">First 30-min lesson free for new students</p>
            </div>
            <button
              onClick={() => setOfferFreeTrial((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${offerFreeTrial ? 'bg-gold-400' : 'bg-navy-200'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  offerFreeTrial ? 'translate-x-5 left-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Policy panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-navy-600 dark:bg-navy-700 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-gold-400">Policy & Impact</h3>
            <ul className="space-y-4 relative z-10">
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-400/20 flex items-center justify-center flex-shrink-0 text-gold-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <p className="text-xs text-cream-200/80 leading-relaxed">Price changes only apply to new bookings. Existing sessions keep their original rate.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-400/20 flex items-center justify-center flex-shrink-0 text-gold-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <p className="text-xs text-cream-200/80 leading-relaxed">Students see rates converted to their local currency (approximate).</p>
              </li>
              {lastUpdated && (
                <li className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-[10px] uppercase font-black tracking-widest opacity-40">
                  <span>Last Updated</span>
                  <span>{new Date(lastUpdated).toLocaleDateString()}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/tutor/PricingManager.tsx
git commit -m "feat(pricing): add package discounts and free trial toggle to PricingManager"
```

---

### Task 9: Update `BookingModal.tsx` — Fix Slot Walking + Package Discounts

**Files:**
- Modify: `src/components/student/BookingModal.tsx`

Two targeted changes: (1) fix `getSlotsForDay` to walk in 30-min steps, and (2) derive PACKAGES from tutor props instead of hardcoded values.

- [ ] **Step 1: Update `BookingModalProps` to include discount and trial fields**

Find the `BookingModalProps` interface (around line 22) and add to the `tutor` object:

```typescript
  tutor: {
    id: string;
    user: { name: string; avatarUrl?: string | null };
    specializations: string[];
    verifiedCertifications?: string[];
    verifiedResults?: any[];
    availability: any[];
    hasUsedTrialLesson?: boolean;
    pricingOptions?: any[];
    primaryPrice?: any;
    blockedDates?: any[];
    bookedSlots?: any[];
    hourlyRate?: number;
    timezone?: string | null;
    discount5?: number | null;
    discount10?: number | null;
    discount20?: number | null;
    offerFreeTrial?: boolean;
  };
```

- [ ] **Step 2: Replace hardcoded PACKAGES constant with a derived function**

Find and remove the `PACKAGES` constant (lines 43-47):

```typescript
// REMOVE this:
const PACKAGES = [
  { sessions: 5, discount: 0.05, label: 'Starter Bundle' },
  { sessions: 10, discount: 0.1, label: 'Success Pack' },
  { sessions: 20, discount: 0.15, label: 'Elite Mastery' },
];
```

Replace with a function called inside the component:

```typescript
function getPackages(tutor: BookingModalProps['tutor']) {
  return [
    { sessions: 5,  discount: (tutor.discount5  ?? 0) / 100, label: 'Starter Bundle' },
    { sessions: 10, discount: (tutor.discount10 ?? 0) / 100, label: 'Success Pack' },
    { sessions: 20, discount: (tutor.discount20 ?? 0) / 100, label: 'Elite Mastery' },
  ];
}
```

Then inside `BookingModal` component, after `const pricingOptions = ...`:

```typescript
  const packages = getPackages(tutor);
```

Replace all references to `PACKAGES` in the component body with `packages`.

- [ ] **Step 3: Fix slot walking — change `cur += activeDuration` to `cur += 30` in `getSlotsForDay`**

Find the `getSlotsForDay` function (around line 187). There are two loops inside it that use `cur += activeDuration`. Change **both** to `cur += 30`:

First loop (building `freeSlotTimes`, around lines 221-226):
```typescript
    for (const w of freeWindows) {
      let cur = timeToMinutes(w.startTime);
      const last = timeToMinutes(w.endTime) - activeDuration;
      while (cur <= last) {
        freeSlotTimes.add(minutesToTime(cur));
        cur += 30;  // was: cur += activeDuration
      }
    }
```

Second loop (building `result`, around lines 232-254):
```typescript
    for (const w of allWindows) {
      let cur = timeToMinutes(w.startTime);
      const last = timeToMinutes(w.endTime) - activeDuration;

      while (cur <= last) {
        const time = minutesToTime(cur);
        if (!seen.has(time)) {
          seen.add(time);

          if (isToday(day)) {
            const slotDate = new Date(day);
            slotDate.setHours(Math.floor(cur / 60), cur % 60, 0, 0);
            if (isBefore(slotDate, new Date())) {
              cur += 30;  // was: cur += activeDuration
              continue;
            }
          }

          result.push({ time, isBooked: !freeSlotTimes.has(time) });
        }
        cur += 30;  // was: cur += activeDuration
      }
    }
```

- [ ] **Step 4: Snap window start to :00/:30 boundary in `getSlotsForDay`**

At the top of both inner loops (where `let cur = timeToMinutes(w.startTime)` is set), snap `cur` to the next :00 or :30 boundary:

```typescript
      let cur = timeToMinutes(w.startTime);
      // Snap to next :00 or :30
      const rem = cur % 30;
      if (rem !== 0) cur += 30 - rem;
      const last = timeToMinutes(w.endTime) - activeDuration;
```

Apply this to **both** inner loops.

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/student/BookingModal.tsx
git commit -m "fix(booking-modal): walk slots in 30-min steps; derive package discounts from tutor props"
```

---

### Task 10: Update Tutor Profile Availability Tab

**Files:**
- Modify: `src/app/tutors/[id]/page.tsx`

Replace the availability tab (around lines 432–480) — the day-by-day text list — with a read-only weekly grid that fetches from the new endpoint.

- [ ] **Step 1: Add `AvailabilityGrid` sub-component at the top of the file (before the default export)**

```typescript
// Add after imports, before TutorProfilePage component

function AvailabilityGrid({ tutorId }: { tutorId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [gridData, setGridData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getWeekStart = (offset: number) => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const formatDateParam = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    const weekStart = getWeekStart(weekOffset);
    setLoading(true);
    fetch(`/api/tutors/${tutorId}/weekly-availability?weekStart=${formatDateParam(weekStart)}`)
      .then((r) => r.json())
      .then(setGridData)
      .finally(() => setLoading(false));
  }, [tutorId, weekOffset]);

  const weekStart = getWeekStart(weekOffset);
  const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Build column headers from gridData dates
  const days = gridData?.slots
    ? [...new Set<string>(gridData.slots.map((s: any) => s.date))]
        .sort()
        .map((date: string) => ({ date, day: gridData.slots.find((s: any) => s.date === date)?.day }))
    : [];

  // All unique time slots across the week
  const times = gridData?.slots
    ? [...new Set<string>(gridData.slots.map((s: any) => s.startTime))].sort()
    : [];

  // Lookup map: "date|startTime" → status
  const slotMap: Record<string, 'available' | 'booked'> = {};
  if (gridData?.slots) {
    for (const s of gridData.slots) {
      slotMap[`${s.date}|${s.startTime}`] = s.status;
    }
  }

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          disabled={weekOffset <= 0}
          className="p-2 rounded-xl border border-navy-100 dark:border-navy-500/20 hover:bg-navy-50 dark:hover:bg-navy-700 disabled:opacity-30 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-sm font-bold text-navy-600 dark:text-cream-200">
          Week of {weekLabel}
          {weekOffset === 0 && <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-gold-500">Current</span>}
        </span>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="p-2 rounded-xl border border-navy-100 dark:border-navy-500/20 hover:bg-navy-50 dark:hover:bg-navy-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        {gridData?.timezone && (
          <span className="ml-auto text-[10px] text-navy-300 dark:text-cream-400/40 font-bold">
            {gridData.timezone}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-navy-300 animate-pulse text-sm">Loading availability...</div>
      ) : times.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-navy-300 text-sm italic">No availability this week</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="w-16 py-2 text-right pr-3 text-navy-300 font-bold" />
                {days.map(({ date, day }) => (
                  <th key={date} className="py-2 text-center font-black text-navy-500 dark:text-cream-300">
                    <div>{day?.slice(0, 3)}</div>
                    <div className="text-[10px] font-bold text-navy-300">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time) => (
                <tr key={time}>
                  <td className="py-0.5 text-right pr-3 text-[10px] text-navy-300 font-bold whitespace-nowrap">
                    {time}
                  </td>
                  {days.map(({ date }) => {
                    const status = slotMap[`${date}|${time}`];
                    if (!status) return <td key={date} className="py-0.5 px-1"><div className="h-5 rounded" /></td>;
                    return (
                      <td key={date} className="py-0.5 px-1">
                        <div
                          className={`h-5 rounded text-[9px] font-bold flex items-center justify-center gap-0.5 ${
                            status === 'available'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-400 dark:bg-red-900/20 dark:text-red-400 opacity-60'
                          }`}
                        >
                          {status === 'booked' && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-[10px] font-bold text-navy-300">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/50 inline-block" />Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/20 inline-block" />Booked
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `useState` import to `AvailabilityGrid` (it needs `useEffect` and `useState`)**

Ensure the import at the top of the file includes both:

```typescript
import { useEffect, useMemo, useState } from 'react';
```

(It already has these — just confirm `useState` is included.)

- [ ] **Step 3: Replace the availability tab JSX in `TutorProfilePage`**

Find the `activeTab === 'availability'` block (around lines 432–480) and replace its inner content:

```tsx
              {activeTab === 'availability' && (
                <div className="glass-card p-8">
                  <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200 mb-6 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-400 rounded-full" />
                    Weekly Availability
                  </h2>
                  <AvailabilityGrid tutorId={params.id} />
                </div>
              )}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/tutors/[id]/page.tsx
git commit -m "feat(profile): replace availability text list with interactive weekly grid"
```

---

### Task 11: Upgrade Tutor Calendar Page

**Files:**
- Modify: `src/app/dashboard/tutor/calendar/page.tsx`

Full rewrite: adds Week/Month/Day views, uses new `/api/tutor/calendar` endpoint, shows booking details, availability slots, and override blocks.

- [ ] **Step 1: Replace the full file content**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { expandWindowsToSlots, getOpenTimeWindowsForDate, timeToMinutes, minutesToTime } from '@/lib/availability';

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
  PENDING: 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  CONFIRMED: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  COMPLETED: 'bg-gray-100 border-gray-200 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400',
};

function formatDateParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
                  // Find booking at this slot
                  const booking = calData?.bookings.find((b) => {
                    const bd = new Date(b.scheduledAt);
                    if (!isSameDay(bd, day)) return false;
                    const bStart = bd.getHours() * 60 + bd.getMinutes();
                    return slotMins >= bStart && slotMins < bStart + b.durationMinutes;
                  });

                  if (booking) {
                    const isStart = (() => {
                      const bd = new Date(booking.scheduledAt);
                      return bd.getHours() * 60 + bd.getMinutes() === slotMins;
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
                        <div className="h-6 rounded bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20" />
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
            const dayBookings = calData?.bookings.filter((b) => isSameDay(new Date(b.scheduledAt), date)) || [];
            const isToday = isSameDay(date, new Date());
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
    const dayBookings = calData?.bookings.filter((b) => isSameDay(new Date(b.scheduledAt), currentDate)) || [];
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
            <div key={slot.startTime} className="h-8 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 flex items-center px-3 text-[10px] text-green-600 dark:text-green-400 font-bold">
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
      <div className="flex flex-wrap gap-4 text-[10px] font-bold text-navy-300">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 inline-block" />Available</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block" />Pending</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" />Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 inline-block" />Completed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block" />Blocked</span>
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
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Manual test**

- Open `/dashboard/tutor/calendar` — no crash, shows Week view with green available slots and coloured booking blocks
- Switch to Month view — see booking count badges per day; click a day → switches to Day view
- In Day view — click a booking block → popover shows student name, time, subject, action buttons
- Confirm/Decline/Cancel actions call API and refresh

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/tutor/calendar/page.tsx
git commit -m "feat(calendar): full rewrite with week/month/day views, booking popover, and slot display"
```

---

## Self-Review

**Spec coverage check:**

| Spec Section | Covered in tasks |
|---|---|
| 1A/1B Duration + Slot picker | Task 9 (BookingModal fix) + Task 4 (API) |
| 1C available-slots API | Task 4 |
| 2A Free Trial flow | Task 8 (PricingManager toggle), existing booking API already handles `isFreeSession` |
| 2B Single Lesson flow | Task 9 (slot walking fix) |
| 2C Lesson Package flow | Task 9 (packages derived from tutor discounts); per-session multi-schedule already exists in BookingModal |
| 3A Weekly grid (Availability tab) | Task 10 |
| 3B weekly-availability API | Task 5 |
| 4A Pricing UI | Task 8 |
| 4B Pricing backend | Tasks 1 + 7 |
| 4C Student-facing pricing | Automatic via `getPublicTutorProfile` spread |
| 5A Calendar bug fix | Task 3 |
| 5B Calendar upgrade | Task 11 |
| 5C tutor/calendar API | Task 6 |
| 6A–6C Backend validation | Already implemented in recent commits; package slot validation already in POST /api/bookings |

**No gaps found.**

**Placeholder scan:** No TBD/TODO in any code block. All function names consistent across tasks (`expandWindowsToSlots`, `getSlotStatusForDate`, `SlotItem` used consistently).

**Type consistency:** `SlotItem` defined in Task 2, used in Task 4 (API return) and Task 9 (indirect via lib). `CalendarData` defined inline in Task 11. All consistent.
