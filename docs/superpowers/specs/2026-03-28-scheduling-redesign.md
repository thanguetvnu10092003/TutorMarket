# Scheduling System Redesign & UI Fixes — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the freeform time-range availability system with a fixed 30-minute slot system to eliminate booking conflicts, then surface "Next available" on tutor cards.

**Architecture:** No Prisma schema changes needed — `AvailabilitySlot` already stores `dayOfWeek`, `startTime`, `endTime`, `isActive`. We change *what values get written* (30-min records instead of wide ranges) and *how tutors set them* (weekly grid UI instead of text inputs). The core `src/lib/availability.ts` functions (`getOpenTimeWindowsForDate`, `isSlotBookable`, etc.) are untouched.

**Tech Stack:** Next.js 14 App Router, Prisma, React state (no external drag library needed — mouse events), Tailwind CSS.

---

## Clarifying Decisions Made During Brainstorm

- **Data migration:** Auto-migrate on save (Option A). New UI reads existing range records and pre-selects all covered 30-min slots. On Save, old records replaced with 30-min records. No migration script.
- **Trial lessons:** Follow same fixed-slot rules (must land on :00 or :30, subject to availability).
- **Duration values:** Only 30 / 60 / 90 minutes allowed (enforced at API level).

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/tutor/WeeklyAvailabilityGrid.tsx` | **NEW** — weekly grid component |
| `src/components/dashboard/tutor/AvailabilityManager.tsx` | Replace time-range inputs with `WeeklyAvailabilityGrid` |
| `src/app/onboarding/tutor/steps/Step7Availability.tsx` | Replace time-range inputs with `WeeklyAvailabilityGrid` |
| `src/app/api/tutor/availability/route.ts` | Accept new 30-min slot format, validate :00/:30 |
| `src/app/api/onboarding/step/[step]/route.ts` | Step 7 POST: same 30-min slot format |
| `src/app/api/bookings/route.ts` | Add :00/:30 validation + atomic Prisma transaction |
| `src/lib/availability.ts` | Add `getNextAvailableDate()` helper |
| `src/lib/admin-dashboard.ts` | Compute `nextAvailableDate` in `getPublicTutorCards()` |
| `src/components/tutors/HorizontalTutorCard.tsx` | Replace "Xd AVAILABILITY" with "Next available: ..." |

---

## Part 1 — WeeklyAvailabilityGrid Component

### Component Interface

```tsx
interface WeeklyAvailabilityGridProps {
  // Initial selected slots loaded from DB (any format — ranges or 30-min)
  initialSlots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  // Called when selection changes: returns normalized 30-min slots
  onChange: (slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>) => void;
  timezone: string;
}
```

### Grid Layout

- **Columns:** 7 days: Mon (1), Tue (2), Wed (3), Thu (4), Fri (5), Sat (6), Sun (0)
- **Rows:** Time slots from 06:00 to 23:30 in 30-minute increments = 36 rows
- **Cell identity:** `${dayOfWeek}:${startTime}` (e.g., `"1:09:00"` for Monday 9 AM)
- **Selected state:** React `Set<string>` of selected cell keys

### Loading Existing Data

When `initialSlots` is provided, expand any wide range into 30-min slots:

```typescript
function expandToSlots(slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>) {
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
```

This means existing tutors with "Mon 09:00–17:00" will see all 16 slots pre-selected in the grid.

### Interaction

1. **Click single cell:** Toggle selected/deselected.
2. **Click-drag:** On `mousedown`, record start cell and the *mode* (selecting if cell was unselected, deselecting if cell was selected). On `mousemove` over other cells while dragging, apply the same mode. On `mouseup`, end drag.
3. **Day header click:** Toggle all slots in that column (select all if any unselected, deselect all otherwise).
4. **Time row label click:** Toggle that time slot across all 7 days.

### Output to Parent

On every change, call `onChange` with the sorted array of 30-min slot objects:

```typescript
[
  { dayOfWeek: 1, startTime: "09:00", endTime: "09:30" },
  { dayOfWeek: 1, startTime: "09:30", endTime: "10:00" },
  ...
]
```

### Visual Design

- **Selected cell:** `bg-sage-500 text-white` (green, matching existing sage color palette)
- **Unselected cell:** `bg-navy-50 dark:bg-navy-700/30 hover:bg-sage-100` (subtle hover hint)
- **Dragging:** cells being dragged over show selected/deselected state immediately
- **Day header:** sticky top, shows "Mon", "Tue" etc.
- **Time labels:** left column, 30-min increments (show only :00 labels to save space, :30 rows show no label but remain full height)
- **Scrollable:** grid in `overflow-y-auto` container (max-height ~500px), sticky header row

---

## Part 2 — AvailabilityManager Changes

Replace the existing per-day time-range input section with `WeeklyAvailabilityGrid`. Keep:
- Timezone selector (existing, unchanged)
- Blocked dates section (existing, unchanged — `AvailabilityOverride` records)
- Save/load logic via `POST /api/tutor/availability`

New save payload format:
```json
{
  "timezone": "Asia/Ho_Chi_Minh",
  "slots": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "09:30" },
    { "dayOfWeek": 1, "startTime": "09:30", "endTime": "10:00" }
  ],
  "overrides": [...]
}
```

---

## Part 3 — Step7Availability Changes

Same pattern as AvailabilityManager: replace time-range inputs with `WeeklyAvailabilityGrid`. The component already uses `/api/onboarding/step/7` for load/save — just update the payload to the 30-min format.

---

## Part 4 — API: POST /api/tutor/availability

Add validation before saving slots:
```typescript
for (const slot of normalizedSlots) {
  const minutes = timeToMinutes(slot.startTime) % 30;
  if (minutes !== 0) {
    return NextResponse.json({ error: 'Slot times must be on :00 or :30 boundaries' }, { status: 400 });
  }
  // endTime must be exactly startTime + 30 minutes
  const expectedEnd = minutesToTime(timeToMinutes(slot.startTime) + 30);
  if (slot.endTime !== expectedEnd) {
    return NextResponse.json({ error: 'Each slot must be exactly 30 minutes' }, { status: 400 });
  }
}
```

Rest of the POST handler (delete old records, create new ones) stays the same.

---

## Part 5 — API: POST /api/onboarding/step/[step] (Step 7)

Add the same `:00/:30` validation as the availability route (copy the validation block). The rest of the step-7 POST handler (delete/create records) is identical in structure.

---

## Part 6 — API: POST /api/bookings — Atomic Transaction + Validation

### New Validations (add before existing checks)

```typescript
// 1. Enforce :00 or :30 minute boundaries
const minutes = scheduledDate.getMinutes();
if (minutes !== 0 && minutes !== 30) {
  return NextResponse.json(
    { error: 'Bookings must start on :00 or :30 minute boundaries' },
    { status: 400 }
  );
}

// 2. Enforce allowed durations
if (![30, 60, 90].includes(selectedDurationMinutes)) {
  return NextResponse.json(
    { error: 'Duration must be 30, 60, or 90 minutes' },
    { status: 400 }
  );
}
```

### Atomic Conflict Check + Creation (replace current non-atomic check)

The existing `isSlotBookable` call stays for the *availability* check. The *conflict check* moves inside a transaction:

```typescript
const booking = await prisma.$transaction(async (tx) => {
  // Re-check for conflicts inside the transaction (prevents race conditions)
  const newEnd = new Date(scheduledDate.getTime() + selectedDurationMinutes * 60 * 1000);
  const conflict = await tx.booking.findFirst({
    where: {
      tutorProfileId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      scheduledAt: { lt: newEnd },
      // Filter to bookings whose end time (scheduledAt + durationMinutes) > scheduledDate
      // Prisma can't compute endTime in WHERE, so fetch candidates and filter in JS
      // Use a generous window: fetch all bookings starting within ±2 hours
      AND: [
        {
          scheduledAt: {
            gt: new Date(scheduledDate.getTime() - 90 * 60 * 1000),
          },
        },
      ],
    },
    select: { scheduledAt: true, durationMinutes: true },
  });

  // Filter in JS for exact overlap
  if (conflict) {
    const existingEnd = new Date(
      new Date(conflict.scheduledAt).getTime() + conflict.durationMinutes * 60 * 1000
    );
    const overlaps =
      new Date(conflict.scheduledAt) < newEnd &&
      existingEnd > scheduledDate;
    if (overlaps) {
      throw new Error('SLOT_CONFLICT');
    }
  }

  return tx.booking.create({ data: { ...bookingData } });
});
```

Catch `'SLOT_CONFLICT'` and return 409. The `payment` create is moved outside the transaction (Stripe calls should not be inside DB transactions).

### Package Bookings

Same atomic check applied per-slot for package bookings — wrap each booking creation in a transaction that checks for conflicts first.

---

## Part 7 — src/lib/availability.ts: getNextAvailableDate

Add a new exported function:

```typescript
export function getNextAvailableDate(input: {
  availability: AvailabilitySlotLike[];
  overrides?: AvailabilityOverrideLike[];
  bookings?: BookingLike[];
  durationMinutes: number;
  days?: number; // default 14
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

  return null; // no availability in next 14 days
}
```

---

## Part 8 — src/lib/admin-dashboard.ts: nextAvailableDate

In `getPublicTutorCards()`, after the existing `countAvailableDaysWithinNextDays` call:

```typescript
const nextAvailableDate = getNextAvailableDate({
  availability: profile.availability,
  overrides: profile.overrides,
  bookings: profile.bookings,
  durationMinutes: primaryPricingOption?.durationMinutes || 60,
  days: 14,
});
```

Add `nextAvailableDate` to the returned object. Import `getNextAvailableDate` from `@/lib/availability`.

---

## Part 9 — HorizontalTutorCard: Replace "Xd AVAILABILITY"

### Current code to find and replace

In the stats grid section, find the cell rendering `availableDaysCount` with "AVAILABILITY" label.

### New display logic

```tsx
function formatNextAvailable(nextDate: Date | null | string): string {
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

Replace the availability stat cell:
```tsx
// OLD
<div>
  <p className="...">{tutor.availableDaysCount ?? 'N/A'}d</p>
  <p className="...">AVAILABILITY</p>
</div>

// NEW
<div>
  <p className="text-[10px] font-black text-navy-600 dark:text-cream-200 truncate">
    {formatNextAvailable(tutor.nextAvailableDate)}
  </p>
  <p className="...">NEXT AVAILABLE</p>
</div>
```

Also remove `availableWithin7Days` / `availableDaysCount` from the `"Open"` badge logic if it's tied to these — use `nextAvailableDate !== null` instead.

---

## Plan B — Bugs (Separate Plan)

### Bug T1 — Already fixed
The block-date auto-select bug was fixed in the previous session (added controlled input with explicit Add button in `Step7Availability.tsx`).

### Bug T2 — Pricing currency display
- Find: Pricing input in `AvailabilityManager` / onboarding Step 8
- Fix: Show currency symbol + code next to price inputs; ensure consistent display in tutor card, booking modal, payment summary

### Bug T3 — Submitted documents not showing from onboarding
- Root cause: Onboarding uploads create `TutorCertification` records but dashboard queries `TutorCredential` records (or vice versa)
- Fix already partially implemented in previous session — verify it's complete

---

## Test Criteria

1. **Grid renders:** Tutor opens AvailabilityManager → sees weekly grid with existing slots pre-selected.
2. **Click/drag:** Clicking or dragging across cells toggles selection correctly.
3. **Save:** Grid selection saves as 30-min records; verify in DB.
4. **Booking validation:** API rejects `scheduledAt` with minutes ≠ 0 or 30. API rejects duration ≠ 30/60/90.
5. **No overlap:** Two simultaneous bookings for overlapping times → second one gets 409.
6. **Next available:** Tutor card shows "Next available: Mon, Mar 31" (or "Available today"/"tomorrow").
7. **No available:** Tutor with no upcoming slots shows "No upcoming slots".
8. **Onboarding grid:** Step7Availability shows same grid, saves same format.
9. **TypeScript:** `npx tsc --noEmit` passes clean.
