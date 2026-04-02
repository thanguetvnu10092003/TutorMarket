# Timezone Consistency Design

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Tutor timezone change → conflict detection, soft-flag resolution, schema migration

---

## Problem Statement

When a tutor changes their timezone (e.g., Europe/Berlin → Asia/Qatar), existing
PENDING/CONFIRMED bookings remain valid in UTC but may fall outside the tutor's
restated availability in the new timezone. The system currently has no mechanism to
detect or surface this. The result is visual inconsistency, phantom slots, and broken
trust in scheduling.

---

## Strategy: Option A — Absolute Time Preservation

- **Bookings**: Stored in UTC. Never rewritten. UTC is the immutable source of truth.
- **Availability**: Template (day-of-week + HH:MM + timezone). When TZ changes, HH:MM
  strings are preserved in the new timezone ("09:00 Qatar" instead of "09:00 Berlin").
  This preserves local intent — the tutor's morning slot stays a morning slot.
- **Conflicts**: After a TZ change, scan active bookings. If any UTC booking time falls
  outside the new availability template, soft-flag it (`hasConflict = true`) on the
  booking record. The booking status stays CONFIRMED — no automatic cancellation.
- **Student impact**: Zero. Student only sees their own UTC→studentTz display. They
  are notified only if the tutor explicitly reschedules or cancels.

Rationale for Option A over Option B (preserve UTC by shifting HH:MM):
The dominant reason tutors change timezone is mistake correction (wrong TZ entered),
not physical relocation. "09:00" in the new TZ is the intended schedule. Shifting
HH:MM to preserve UTC windows would confuse tutors whose grid suddenly looks different.

---

## Data Model Changes

### 1. Booking — add 3 fields

```prisma
model Booking {
  // ... existing fields unchanged ...
  hasConflict    Boolean   @default(false)
  conflictReason String?
  conflictAt     DateTime?
}
```

`hasConflict` is a soft flag. BookingStatus is NOT changed. No new enum value needed.

### 2. AvailabilityOverride — add 1 field

```prisma
model AvailabilityOverride {
  // ... existing fields unchanged ...
  timezone  String  @default("UTC")
}
```

Overrides need a timezone so that override date-matching works correctly when a tutor's
TZ differs from UTC.

---

## Backend Logic

### A. New function: `detectBookingConflicts` in `src/lib/availability.ts`

Reuses the existing `isSlotBookable` function. The caller pre-converts UTC booking
times to tutor wall-clock time (same pattern already used in `src/app/api/bookings/route.ts`).

```typescript
export type ConflictCheckBooking = {
  id: string;
  scheduledAt: Date | string;
  durationMinutes: number;
};

/**
 * Returns the IDs of bookings that fall outside the given availability template.
 * Input bookings must already be in wall-clock (local) time for the target timezone —
 * the caller is responsible for the UTC → local conversion via toWallClockDate().
 */
export function detectBookingConflicts(input: {
  bookings: ConflictCheckBooking[];
  availability: AvailabilitySlotLike[];
  overrides: AvailabilityOverrideLike[];
}): string[] {
  const conflictIds: string[] = [];
  for (const booking of input.bookings) {
    const localDate = toDate(booking.scheduledAt);
    const ok = isSlotBookable({
      scheduledAt: localDate,
      durationMinutes: booking.durationMinutes,
      availability: input.availability,
      overrides: input.overrides,
      bookings: [], // only check against availability template, not other bookings
    });
    if (!ok) conflictIds.push(booking.id);
  }
  return conflictIds;
}
```

### B. Changes to `POST /api/tutor/availability`

After the existing `$transaction` (save TZ + slots + overrides), add a second step:

```typescript
// 1. Load active future bookings for this tutor
const activeBookings = await prisma.booking.findMany({
  where: {
    tutorProfileId: tutorProfile.id,
    status: { in: ['PENDING', 'CONFIRMED'] },
    scheduledAt: { gte: new Date() },
  },
  select: { id: true, scheduledAt: true, durationMinutes: true },
});

// 2. Convert UTC booking times to wall-clock in the new TZ
const localBookings = activeBookings.map((b) => ({
  ...b,
  scheduledAt: toWallClockDate(b.scheduledAt, newTimezone),
}));

// 3. Load fresh availability (just saved) and overrides
const freshAvailability = await prisma.availability.findMany({
  where: { tutorProfileId: tutorProfile.id, isActive: true },
});
const freshOverrides = await prisma.availabilityOverride.findMany({
  where: { tutorProfileId: tutorProfile.id, date: { gte: new Date() } },
});
const localOverrides = freshOverrides.map((o) => ({
  ...o,
  date: toWallClockDate(o.date, newTimezone),
}));

// 4. Detect conflicts
const conflictIds = detectBookingConflicts({
  bookings: localBookings,
  availability: freshAvailability,
  overrides: localOverrides,
});

// 5. Write conflict flags atomically
await prisma.$transaction([
  prisma.booking.updateMany({
    where: { id: { in: conflictIds } },
    data: {
      hasConflict: true,
      conflictReason: 'Booking falls outside tutor availability after timezone change',
      conflictAt: new Date(),
    },
  }),
  prisma.booking.updateMany({
    where: {
      tutorProfileId: tutorProfile.id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      id: { notIn: conflictIds },
    },
    data: { hasConflict: false, conflictReason: null, conflictAt: null },
  }),
]);

// 6. Return conflict summary
return NextResponse.json({ success: true, conflictCount: conflictIds.length, conflictIds });
```

Also fix: store `timezone` on each new `AvailabilityOverride` record (currently missing):
```typescript
normalizedOverrides.map((override) => ({
  ...existingFields,
  timezone: newTimezone,  // add this
}))
```

### C. New endpoint: `PATCH /api/tutor/bookings/[id]/resolve-conflict`

Allows the tutor to dismiss a conflict without rescheduling or cancelling.

```typescript
// body: { action: 'dismiss' }
// Clears hasConflict flag. Booking remains CONFIRMED.
await prisma.booking.update({
  where: { id: bookingId, tutorProfileId: tutorProfile.id },
  data: { hasConflict: false, conflictReason: null, conflictAt: null },
});
```

Reschedule and cancel use existing endpoints — no changes needed there.

---

## Timezone Conversion Strategy

No new libraries. The existing `toWallClockDate(utcDate, timezone)` utility (in
`src/app/api/bookings/route.ts`, lines 37–61) uses native `Intl.DateTimeFormat` and
correctly handles:
- DST transitions (Europe/Berlin: UTC+1 winter / UTC+2 summer)
- Timezones without DST (Asia/Qatar: always UTC+3)
- Day-of-week in local time (so `date.getDay()` returns the correct local weekday)

Move `toWallClockDate` from `bookings/route.ts` into `src/lib/availability.ts` so it
can be imported by both the bookings API and the availability API.

Display formatting uses the existing utilities in `src/lib/utils.ts`:
- Tutor view: `formatDateTimeInTz(booking.scheduledAt, tutor.timezone)`
- Student view: `formatDateTimeInTz(booking.scheduledAt, student.timezone)`

---

## Migration Plan

### Step 1 — Prisma schema migration
```bash
npx prisma migrate dev --name add_booking_conflict_and_override_timezone
```
Adds: `Booking.hasConflict`, `Booking.conflictReason`, `Booking.conflictAt`,
`AvailabilityOverride.timezone`.

### Step 2 — Backfill `AvailabilityOverride.timezone`
One-time script at `prisma/scripts/backfill-override-timezone.ts`:
```typescript
const tutors = await prisma.tutorProfile.findMany({ select: { id: true, timezone: true } });
for (const tutor of tutors) {
  await prisma.availabilityOverride.updateMany({
    where: { tutorProfileId: tutor.id },
    data: { timezone: tutor.timezone || 'UTC' },
  });
}
```

### Step 3 — Initial conflict scan
One-time script at `prisma/scripts/initial-conflict-scan.ts`:
Runs `detectBookingConflicts` for every tutor using their current TZ and availability.
Flags any pre-existing inconsistencies. Tutors see them in the dashboard immediately
after deploy.

### Step 4 — Verify bookings are UTC-clean
Prisma/PostgreSQL stores `DateTime` as UTC by default. Existing `scheduledAt` values
are already UTC. No data transformation needed. Confirm with a spot-check query.

---

## Conflict Detection Logic

### When to run
| Trigger | Action |
|---------|--------|
| Tutor saves availability (TZ changed OR slots changed) | Always run scan |
| Initial migration | One-time full scan |
| Cron (optional safety net) | Daily scan, low priority |

### What counts as a conflict
A PENDING/CONFIRMED booking is flagged `hasConflict = true` when:
- Its local time (UTC → tutor's current TZ) does not fall within any active
  Availability slot for that day of week, **OR**
- The date has a blocking AvailabilityOverride (`isAvailable: false`, no time range), **OR**
- The booking time range overlaps a partial time-range override

### What clears a conflict
- Tutor dismisses it (`PATCH resolve-conflict`)
- Tutor cancels (booking CANCELLED — only PENDING/CONFIRMED scanned going forward)
- Tutor updates availability so the slot is now covered (next save re-runs scan → flag cleared)
- Booking is cancelled or completed (irrelevant — only PENDING/CONFIRMED are scanned)

---

## UI Update Flow

### AvailabilityManager (after save)
```
POST /api/tutor/availability → { success: true, conflictCount: 3, conflictIds: [...] }

if conflictCount > 0:
  toast.warning("Timezone updated. 3 bookings are outside your new availability. [View →]")
  // link to /dashboard/tutor/bookings?filter=conflict

Invalidate SWR caches:
  mutate('/api/tutor/availability')
  mutate('/api/tutor/bookings')
  mutate('/api/tutor/calendar')
```

### Tutor bookings list
- Each booking with `hasConflict: true` shows a yellow "Conflict" badge
- Action row: **[Dismiss]** · **[Cancel]**
- "Dismiss" → `PATCH /api/tutor/bookings/[id]/resolve-conflict` → removes badge
- "Cancel" → existing cancel endpoint; student is notified via existing email flow

### Student bookings list
- No change. No badge. No notification.
- Student sees their booking in their own timezone as before.

---

## Edge Cases

| Edge case | Handling |
|-----------|----------|
| Booking crosses midnight after TZ change | `toWallClockDate` returns correct local date; `isSlotBookable` uses `date.getDay()` which reflects the local weekday — correct |
| DST (Europe/Berlin) | `Intl.DateTimeFormat` handles automatically |
| Qatar (no DST) | UTC+3 always, no special handling needed |
| Student changes their timezone | Display-only change. No bookings affected. |
| Tutor changes TZ multiple times | Each save re-runs full scan. Old conflict flags for now-resolved slots are cleared. |
| Pending (not confirmed) bookings | Scanned and flagged same as CONFIRMED |
| Cached UI state | SWR `mutate` calls after save clear stale data |
| `conflictIds` array empty in `notIn` clause | Prisma `notIn: []` matches all records — correctly clears all stale flags |

---

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add 3 fields to `Booking`, 1 field to `AvailabilityOverride` |
| `prisma/migrations/` | New migration file |
| `src/lib/availability.ts` | Add `detectBookingConflicts`, move `toWallClockDate` here, export `ConflictCheckBooking` type |
| `src/app/api/tutor/availability/route.ts` | After save transaction: run conflict scan, return `conflictCount`; add `timezone` to override creation |
| `src/app/api/tutor/bookings/[id]/resolve-conflict/route.ts` | New file — `PATCH` dismiss handler |
| `src/app/api/bookings/route.ts` | Remove local `toWallClockDate` (now imported from `availability.ts`) |
| `src/components/dashboard/tutor/AvailabilityManager.tsx` | Show conflict toast/banner after save; call SWR mutate |
| Tutor bookings dashboard component (exact path TBD at implementation) | Conflict badge + Dismiss/Cancel buttons |
| `prisma/scripts/backfill-override-timezone.ts` | New one-time script |
| `prisma/scripts/initial-conflict-scan.ts` | New one-time script |
