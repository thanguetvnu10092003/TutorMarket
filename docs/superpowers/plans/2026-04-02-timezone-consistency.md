# Timezone Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a tutor changes their timezone, existing PENDING/CONFIRMED bookings are automatically scanned against the new availability template and soft-flagged (`hasConflict`) if they fall outside it — preserving UTC booking times and surfacing conflicts to the tutor for manual resolution.

**Architecture:** Option A (Absolute Time Preservation) — bookings stay fixed in UTC forever; availability is re-expressed in the new timezone preserving HH:MM strings; a `detectBookingConflicts` function re-uses the existing `isSlotBookable` logic to scan active bookings after every availability save.

**Tech Stack:** Next.js 14 App Router, Prisma 5, PostgreSQL (Neon), native `Intl.DateTimeFormat` for timezone conversion, react-hot-toast for notifications, SWR for client-side cache invalidation.

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Modify | `src/lib/availability.ts` |
| Modify | `src/app/api/bookings/route.ts` |
| Modify | `src/app/api/tutor/availability/route.ts` |
| Create | `src/app/api/tutor/bookings/[id]/resolve-conflict/route.ts` |
| Modify | `src/components/dashboard/tutor/AvailabilityManager.tsx` |
| Modify | `src/app/dashboard/tutor/page.tsx` |
| Create | `prisma/scripts/backfill-override-timezone.ts` |
| Create | `prisma/scripts/initial-conflict-scan.ts` |

---

## Task 1: Schema — add conflict fields to Booking, timezone to AvailabilityOverride

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to Booking model**

Find the `model Booking` block (around line 374). Add three fields after `updatedAt`:

```prisma
  hasConflict    Boolean   @default(false)
  conflictReason String?
  conflictAt     DateTime?
```

The block should now end:
```prisma
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  hasConflict     Boolean       @default(false)
  conflictReason  String?
  conflictAt      DateTime?

  // Relations
  payment Payment?
```

- [ ] **Step 2: Add timezone field to AvailabilityOverride model**

Find `model AvailabilityOverride` (around line 361). Add after `reason`:

```prisma
  timezone       String       @default("UTC")
```

The block should now end:
```prisma
  isAvailable    Boolean      @default(false)
  reason         String?
  timezone       String       @default("UTC")

  @@index([tutorProfileId, date])
```

- [ ] **Step 3: Run Prisma migration**

```bash
cd "C:\Users\Admin\Desktop\WEB"
npx prisma migrate dev --name add_booking_conflict_and_override_timezone
```

Expected output: `✔ Generated Prisma Client` and a new migration folder under `prisma/migrations/`.

- [ ] **Step 4: Verify generated client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add hasConflict fields to Booking and timezone to AvailabilityOverride"
```

---

## Task 2: Move `toWallClockDate` + add `detectBookingConflicts` to `src/lib/availability.ts`

**Files:**
- Modify: `src/lib/availability.ts`

- [ ] **Step 1: Add `toWallClockDate` as an exported function**

Append to the end of `src/lib/availability.ts`:

```typescript
/**
 * Convert a UTC Date to "wall clock" time in the given IANA timezone.
 * Returns a Date whose .getHours()/.getDay()/.getDate() reflect the local
 * time in that timezone — suitable for availability checking only, not storage.
 */
export function toWallClockDate(utcDate: Date, timezone: string): Date {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false,
    });
    const parts: Record<string, string> = {};
    for (const p of fmt.formatToParts(utcDate)) {
      parts[p.type] = p.value;
    }
    const h = parseInt(parts.hour, 10);
    return new Date(
      parseInt(parts.year, 10),
      parseInt(parts.month, 10) - 1,
      parseInt(parts.day, 10),
      h === 24 ? 0 : h,
      parseInt(parts.minute, 10),
      parseInt(parts.second, 10)
    );
  } catch {
    return utcDate;
  }
}

export type ConflictCheckBooking = {
  id: string;
  scheduledAt: Date | string;
  durationMinutes: number;
};

/**
 * Returns the IDs of bookings whose wall-clock time falls outside the
 * availability template. Bookings must already be pre-converted to wall-clock
 * time via toWallClockDate() before passing in — caller handles UTC→local.
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
      bookings: [], // check against availability template only, not other bookings
    });
    if (!ok) conflictIds.push(booking.id);
  }
  return conflictIds;
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd "C:\Users\Admin\Desktop\WEB"
npx tsc --noEmit
```

Expected: no errors. If TypeScript complains about `toDate` not being exported, note that `toDate` is already defined (but private) at line 33 of `availability.ts` — no change needed since `detectBookingConflicts` is in the same file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/availability.ts
git commit -m "feat: export toWallClockDate and add detectBookingConflicts to availability lib"
```

---

## Task 3: Remove local `toWallClockDate` from `src/app/api/bookings/route.ts`, import from lib

**Files:**
- Modify: `src/app/api/bookings/route.ts`

- [ ] **Step 1: Update the import line**

Find line 9:
```typescript
import { isSlotBookable } from '@/lib/availability';
```

Replace with:
```typescript
import { isSlotBookable, toWallClockDate } from '@/lib/availability';
```

- [ ] **Step 2: Delete the local `toWallClockDate` function**

Find and delete the entire local function (lines 35–61):
```typescript
// Convert a UTC Date to "wall clock" time in the given timezone
// Returns a Date whose .getHours()/.getDay() reflect the local time in that timezone
function toWallClockDate(utcDate: Date, timezone: string): Date {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false,
    });
    const parts: Record<string, string> = {};
    for (const p of fmt.formatToParts(utcDate)) {
      parts[p.type] = p.value;
    }
    const h = parseInt(parts.hour, 10);
    return new Date(
      parseInt(parts.year, 10),
      parseInt(parts.month, 10) - 1,
      parseInt(parts.day, 10),
      h === 24 ? 0 : h,
      parseInt(parts.minute, 10),
      parseInt(parts.second, 10)
    );
  } catch {
    return utcDate;
  }
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/bookings/route.ts
git commit -m "refactor: import toWallClockDate from availability lib instead of duplicating"
```

---

## Task 4: Update `POST /api/tutor/availability` — conflict scan + return `conflictCount` + override timezone

**Files:**
- Modify: `src/app/api/tutor/availability/route.ts`

- [ ] **Step 1: Update the import line at the top of the file**

Find line 5:
```typescript
import { sortAvailabilitySlots, validateDailyAvailabilitySlots, timeToMinutes, minutesToTime } from '@/lib/availability';
```

Replace with:
```typescript
import { sortAvailabilitySlots, validateDailyAvailabilitySlots, timeToMinutes, minutesToTime, detectBookingConflicts, toWallClockDate } from '@/lib/availability';
```

- [ ] **Step 2: Add `timezone` to override creation (fix missing field)**

Find the override mapping block inside the `$transaction` array (around line 152–163):
```typescript
...(normalizedOverrides.length > 0
  ? [prisma.availabilityOverride.createMany({
      data: normalizedOverrides.map((override: any) => ({
        tutorProfileId: tutorProfile.id,
        date: new Date(override.date),
        startTime: override.startTime || null,
        endTime: override.endTime || null,
        isAvailable: override.isAvailable ?? false,
        reason: override.reason || 'Blocked',
      })),
    })]
  : []),
```

Add `timezone` field to the mapped object:
```typescript
...(normalizedOverrides.length > 0
  ? [prisma.availabilityOverride.createMany({
      data: normalizedOverrides.map((override: any) => ({
        tutorProfileId: tutorProfile.id,
        date: new Date(override.date),
        startTime: override.startTime || null,
        endTime: override.endTime || null,
        isAvailable: override.isAvailable ?? false,
        reason: override.reason || 'Blocked',
        timezone: timezone || tutorProfile.timezone || 'UTC',
      })),
    })]
  : []),
```

- [ ] **Step 3: Add conflict scan after the `$transaction`**

Find the line after the `$transaction` closes (after the `]);` on line ~164), just before:
```typescript
    return NextResponse.json({ success: true });
```

Replace that return with the following conflict scan block:

```typescript
    // --- Conflict scan after availability save ---
    const newTimezone = timezone || tutorProfile.timezone || 'UTC';

    const activeBookings = await prisma.booking.findMany({
      where: {
        tutorProfileId: tutorProfile.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { gte: new Date() },
      },
      select: { id: true, scheduledAt: true, durationMinutes: true },
    });

    let conflictCount = 0;
    let conflictIds: string[] = [];

    if (activeBookings.length > 0) {
      const freshAvailability = await prisma.availability.findMany({
        where: { tutorProfileId: tutorProfile.id, isActive: true },
      });
      const freshOverrides = await prisma.availabilityOverride.findMany({
        where: { tutorProfileId: tutorProfile.id, date: { gte: new Date() } },
      });

      const localBookings = activeBookings.map((b) => ({
        ...b,
        scheduledAt: toWallClockDate(b.scheduledAt, newTimezone),
      }));
      const localOverrides = freshOverrides.map((o) => ({
        ...o,
        date: toWallClockDate(o.date, newTimezone),
      }));

      conflictIds = detectBookingConflicts({
        bookings: localBookings,
        availability: freshAvailability,
        overrides: localOverrides,
      });
      conflictCount = conflictIds.length;

      if (conflictIds.length > 0) {
        await prisma.booking.updateMany({
          where: { id: { in: conflictIds } },
          data: {
            hasConflict: true,
            conflictReason: 'Booking falls outside tutor availability after timezone change',
            conflictAt: new Date(),
          },
        });
      }

      // Clear stale flags for bookings that are now fine
      await prisma.booking.updateMany({
        where: {
          tutorProfileId: tutorProfile.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          ...(conflictIds.length > 0 ? { id: { notIn: conflictIds } } : {}),
        },
        data: { hasConflict: false, conflictReason: null, conflictAt: null },
      });
    }

    return NextResponse.json({ success: true, conflictCount, conflictIds });
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tutor/availability/route.ts
git commit -m "feat: run booking conflict scan after availability save, return conflictCount"
```

---

## Task 5: Create `PATCH /api/tutor/bookings/[id]/resolve-conflict` endpoint

**Files:**
- Create: `src/app/api/tutor/bookings/[id]/resolve-conflict/route.ts`

- [ ] **Step 1: Create the directory and file**

Create `src/app/api/tutor/bookings/[id]/resolve-conflict/route.ts` with this content:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      select: { id: true, tutorProfileId: true },
    });

    if (!booking || booking.tutorProfileId !== tutorProfile.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    await prisma.booking.update({
      where: { id: params.id },
      data: { hasConflict: false, conflictReason: null, conflictAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resolve conflict error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tutor/bookings/[id]/resolve-conflict/route.ts
git commit -m "feat: add PATCH resolve-conflict endpoint for tutor to dismiss booking conflicts"
```

---

## Task 6: Update `AvailabilityManager` — show conflict toast after save

**Files:**
- Modify: `src/components/dashboard/tutor/AvailabilityManager.tsx`

- [ ] **Step 1: Read `conflictCount` from save response and show toast**

Find the `handleSave` function. Locate the success path (around line 71–75):

```typescript
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to save availability');
      toast.success('Availability updated');
      await fetchData();
      onSave?.();
```

Replace with:

```typescript
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to save availability');
      if (json.conflictCount > 0) {
        toast.success(`Availability updated — ${json.conflictCount} existing booking${json.conflictCount === 1 ? '' : 's'} now outside your schedule. Check the Sessions tab.`, { duration: 6000 });
      } else {
        toast.success('Availability updated');
      }
      await fetchData();
      onSave?.();
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/tutor/AvailabilityManager.tsx
git commit -m "feat: show conflict count toast after availability save"
```

---

## Task 7: Update tutor dashboard — conflict badge + Dismiss button + wire `mutateBookings` to `onSave`

**Files:**
- Modify: `src/app/dashboard/tutor/page.tsx`

- [ ] **Step 1: Add `dismissingConflictId` state**

Find the existing state declarations (around line 36–39):
```typescript
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
```

Add after `updatingBookingId`:
```typescript
  const [dismissingConflictId, setDismissingConflictId] = useState<string | null>(null);
```

- [ ] **Step 2: Add `handleDismissConflict` function**

Find `handleBookingDecision` function (around line 175). Add a new function immediately after it ends (after the closing `};`):

```typescript
  const handleDismissConflict = async (bookingId: string) => {
    try {
      setDismissingConflictId(bookingId);
      const response = await fetch(`/api/tutor/bookings/${bookingId}/resolve-conflict`, {
        method: 'PATCH',
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to dismiss conflict');
      await mutateBookings();
    } catch (error: any) {
      console.error('Dismiss conflict error:', error);
      toast.error(error.message || 'Could not dismiss conflict');
    } finally {
      setDismissingConflictId(null);
    }
  };
```

- [ ] **Step 3: Wire `mutateBookings` to `AvailabilityManager.onSave`**

Search the file for where `AvailabilityManager` is rendered (it will be inside the `activeTab === 'availability'` section). Find the line that renders it — it will look like:

```tsx
<AvailabilityManager />
```

or

```tsx
<AvailabilityManager onSave={...} />
```

Change it to:

```tsx
<AvailabilityManager onSave={() => { void mutateBookings(); }} />
```

- [ ] **Step 4: Add conflict badge next to status badge in the sessions list**

Find the status badge span in the booking card (around line 471–473):
```tsx
              <span className="px-2.5 py-1 rounded-full bg-navy-50 dark:bg-navy-600 text-[10px] font-black uppercase tracking-widest text-navy-500 dark:text-cream-300">
                {booking.status}
              </span>
```

Add a conflict badge immediately after it:
```tsx
              {booking.hasConflict && (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  Conflict
                </span>
              )}
```

- [ ] **Step 5: Add Dismiss button in the booking actions area**

Find the actions `<div className="flex flex-wrap gap-3">` (around line 483). Inside that div, find the Notes button:
```tsx
                            <button
                              onClick={() => setSelectedNotesBooking(booking)}
                              className="rounded-2xl border border-navy-200 dark:border-navy-500/20 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-navy-600 dark:text-cream-200 hover:border-gold-400 transition-colors"
                            >
                              Notes
                            </button>
```

Add a Dismiss button immediately after the Notes button:
```tsx
                            {booking.hasConflict && (
                              <button
                                onClick={() => void handleDismissConflict(booking.id)}
                                disabled={dismissingConflictId === booking.id}
                                className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition-colors disabled:opacity-50"
                              >
                                {dismissingConflictId === booking.id ? 'Dismissing...' : 'Dismiss Conflict'}
                              </button>
                            )}
```

- [ ] **Step 6: Add conflict info text at the bottom of the booking card**

Find the existing status-based info text blocks at the bottom of each booking card (around line 558–568):
```tsx
                        {booking.status === 'PENDING' && (
                          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-blue-500">
                            This is a new booking request. Accept or decline it before the lesson can proceed.
                          </p>
                        )}
```

Add a conflict notice immediately before that block:
```tsx
                        {booking.hasConflict && (
                          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                            This session falls outside your current availability after a timezone change. Dismiss to acknowledge, or cancel if it can no longer proceed.
                          </p>
                        )}
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/tutor/page.tsx
git commit -m "feat: show conflict badge and dismiss button on sessions with timezone conflicts"
```

---

## Task 8: Write migration scripts

**Files:**
- Create: `prisma/scripts/backfill-override-timezone.ts`
- Create: `prisma/scripts/initial-conflict-scan.ts`

- [ ] **Step 1: Create `prisma/scripts/` directory**

```bash
mkdir -p "C:\Users\Admin\Desktop\WEB\prisma\scripts"
```

- [ ] **Step 2: Create `backfill-override-timezone.ts`**

Create `prisma/scripts/backfill-override-timezone.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tutors = await prisma.tutorProfile.findMany({
    select: { id: true, timezone: true },
  });

  console.log(`Backfilling timezone for overrides of ${tutors.length} tutors...`);

  for (const tutor of tutors) {
    const tz = tutor.timezone || 'UTC';
    const result = await prisma.availabilityOverride.updateMany({
      where: { tutorProfileId: tutor.id },
      data: { timezone: tz },
    });
    console.log(`  Tutor ${tutor.id} (${tz}): updated ${result.count} overrides`);
  }

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Create `initial-conflict-scan.ts`**

Create `prisma/scripts/initial-conflict-scan.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { detectBookingConflicts, toWallClockDate } from '../../src/lib/availability';

const prisma = new PrismaClient();

async function main() {
  const tutors = await prisma.tutorProfile.findMany({
    select: { id: true, timezone: true },
  });

  console.log(`Scanning conflicts for ${tutors.length} tutors...`);
  let totalFlagged = 0;

  for (const tutor of tutors) {
    const tz = tutor.timezone || 'UTC';

    const activeBookings = await prisma.booking.findMany({
      where: {
        tutorProfileId: tutor.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { gte: new Date() },
      },
      select: { id: true, scheduledAt: true, durationMinutes: true },
    });

    if (activeBookings.length === 0) continue;

    const availability = await prisma.availability.findMany({
      where: { tutorProfileId: tutor.id, isActive: true },
    });
    const overrides = await prisma.availabilityOverride.findMany({
      where: { tutorProfileId: tutor.id, date: { gte: new Date() } },
    });

    const localBookings = activeBookings.map((b) => ({
      ...b,
      scheduledAt: toWallClockDate(b.scheduledAt, tz),
    }));
    const localOverrides = overrides.map((o) => ({
      ...o,
      date: toWallClockDate(o.date, tz),
    }));

    const conflictIds = detectBookingConflicts({
      bookings: localBookings,
      availability,
      overrides: localOverrides,
    });

    if (conflictIds.length > 0) {
      await prisma.booking.updateMany({
        where: { id: { in: conflictIds } },
        data: {
          hasConflict: true,
          conflictReason: 'Pre-existing conflict detected during initial timezone scan',
          conflictAt: new Date(),
        },
      });
      console.log(`  Tutor ${tutor.id} (${tz}): flagged ${conflictIds.length} conflicts`);
      totalFlagged += conflictIds.length;
    }
  }

  console.log(`Done. Total flagged: ${totalFlagged}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Add scripts to `package.json`**

Find the `"scripts"` block in `package.json`. After `"db:studio"` add:

```json
    "db:backfill-tz": "ts-node prisma/scripts/backfill-override-timezone.ts",
    "db:conflict-scan": "ts-node prisma/scripts/initial-conflict-scan.ts"
```

- [ ] **Step 5: Commit**

```bash
git add prisma/scripts/ package.json
git commit -m "feat: add backfill-override-timezone and initial-conflict-scan migration scripts"
```

---

## Task 9: Run migration scripts and verify

- [ ] **Step 1: Run the override timezone backfill**

```bash
cd "C:\Users\Admin\Desktop\WEB"
npm run db:backfill-tz
```

Expected output like:
```
Backfilling timezone for overrides of N tutors...
  Tutor clxxx (Asia/Ho_Chi_Minh): updated 0 overrides
Done.
```

- [ ] **Step 2: Run the initial conflict scan**

```bash
npm run db:conflict-scan
```

Expected output like:
```
Scanning conflicts for N tutors...
Done. Total flagged: 0
```

(If there are conflicts in your current data they will be shown and flagged.)

- [ ] **Step 3: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start the dev server and manually verify**

```bash
npm run dev
```

1. Log in as a tutor
2. Go to Dashboard → Availability tab
3. Change timezone (e.g., select a different one)
4. Click Save
5. **Expected**: toast shows "Availability updated" (with conflict count if any PENDING/CONFIRMED future bookings exist)
6. Go to Sessions tab
7. **Expected**: any conflicted bookings show the amber "Conflict" badge and "Dismiss Conflict" button
8. Click "Dismiss Conflict"
9. **Expected**: badge disappears, booking remains CONFIRMED

- [ ] **Step 5: Final commit and push**

```bash
git add -A
git status  # verify only expected files
git commit -m "feat: timezone conflict detection — complete implementation"
git push origin main
```
