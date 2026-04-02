# Bug Fixes Round 3 — Tutor Marketplace Platform

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 bugs across the Tutor Marketplace spanning booking timezone, badge verification, student cancellation, availability display, currency, and sort/filter issues.

**Architecture:** Each bug is an isolated fix. Critical path: S5 (booking timezone) → S3 (badge trust) → S4 (cancel button) → S6/S7 (slot display) → T3 (documents) → S2 (sort) → T1/T2/S1 (low-impact polish). No schema migrations required.

**Tech Stack:** Next.js 14 App Router, Prisma ORM (PostgreSQL), NextAuth, SWR, Tailwind CSS, date-fns, framer-motion, Zod

---

## File Map

| File | What changes |
|------|-------------|
| `src/components/student/BookingModal.tsx` | S5: timezone-aware slot building + `timezone` prop |
| `src/lib/admin-dashboard.ts` | S2: sort uses `actualBookingCount`; S3: verifiedCertifications only VERIFIED; S5/S7: pass `timezone` in returned card data |
| `src/app/tutors/[id]/page.tsx` | S3: verifiedSubjectTypes matching logic |
| `src/app/api/bookings/[id]/route.ts` | S4: 24-hour cancellation guard + package cancel |
| `src/app/api/bookings/[id]/cancel-package/route.ts` | S4: new route for package-level cancel |
| `src/app/dashboard/student/page.tsx` | S4: Cancel button UI + confirmation dialog |
| `src/app/api/onboarding/step/[step]/route.ts` | T3: create TutorCredential when cert has fileUrl |
| `src/app/onboarding/tutor/steps/Step7Availability.tsx` | T1: controlled date input with explicit Add button |
| `src/components/tutors/TutorFilterBar.tsx` | S1: label text change |
| `src/components/tutors/HorizontalTutorCard.tsx` | T2: use pricingOptions + currency |

---

## Task 1 — S1: Change "Price per lesson" label (2 min)

**Files:**
- Modify: `src/components/tutors/TutorFilterBar.tsx:151`

- [ ] **Step 1: Change the label text**

In `TutorFilterBar.tsx`, line 151, find:
```tsx
<label className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 absolute left-4 top-2 z-10">
  Price per lesson
</label>
```
Change to:
```tsx
<label className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40 absolute left-4 top-2 z-10">
  Price per 60-min session
</label>
```

- [ ] **Step 2: Commit**
```bash
git add src/components/tutors/TutorFilterBar.tsx
git commit -m "fix(ui): rename filter label to 'Price per 60-min session'"
```

---

## Task 2 — S2: Fix "Most Lessons" sort uses stale totalSessions field

**Root cause:** In `getPublicTutorCards`, the sort `case 'sessions':` reads `right.totalSessions - left.totalSessions`. But `totalSessions` in `hydratedProfiles` is the denormalized `TutorProfile.totalSessions` DB field (from the `...profile` spread), **not** the freshly computed `actualBookingCount`. The fix is to sort by `actualBookingCount`.

**Files:**
- Modify: `src/lib/admin-dashboard.ts` (around line 1204)

- [ ] **Step 1: Fix the sort case in `getPublicTutorCards`**

Find (around line 1204):
```typescript
      case 'sessions':
        return right.totalSessions - left.totalSessions;
```
Replace with:
```typescript
      case 'sessions':
        return (right.actualBookingCount || 0) - (left.actualBookingCount || 0);
```

- [ ] **Step 2: Commit**
```bash
git add src/lib/admin-dashboard.ts
git commit -m "fix(tutors): sort Most Lessons by actual completed booking count"
```

---

## Task 3 — S3: Fix verified badge — only show for VERIFIED certifications

**Root cause (3 sub-bugs):**

**3a.** `getPublicTutorProfile` returns `verifiedCertifications` filtered on `VERIFIED || SELF_REPORTED || RESUBMITTED` → self-reported certs trigger "Verified" text. Must be VERIFIED only.

**3b.** Same bug in `getPublicTutorCards` under `verifiedCertifications`.

**3c.** In `tutors/[id]/page.tsx`, `verifiedSubjectTypes` is computed from `verifiedCertifications` mapped to `.type` (e.g., `'CFA'`), but `specializations` uses `Subject` enum values (`'CFA_LEVEL_1'`). Matching fails for CFA levels. Fix: map to `levelOrVariant || type` which gives Subject-compatible values like `'CFA_LEVEL_1'`.

**Files:**
- Modify: `src/lib/admin-dashboard.ts` (lines 1263–1270 and 1379–1381)
- Modify: `src/app/tutors/[id]/page.tsx` (lines 43–48, 174)

- [ ] **Step 1: Fix `getPublicTutorProfile` — `verifiedCertifications` (line ~1379)**

Find:
```typescript
    verifiedCertifications: profile.certifications
      .filter((c: any) => c.status === 'VERIFIED' || c.status === 'SELF_REPORTED' || c.status === 'RESUBMITTED')
      .map((c: any) => c.type),
```
Replace with:
```typescript
    verifiedCertifications: profile.certifications
      .filter((c: any) => c.status === 'VERIFIED')
      .map((c: any) => c.levelOrVariant || c.type),
```

- [ ] **Step 2: Fix `getPublicTutorCards` — `verifiedCertifications` (line ~1263)**

Find:
```typescript
    verifiedCertifications: profile.certifications
      .filter((c: any) => {
        if (c.status !== 'VERIFIED' && c.status !== 'SELF_REPORTED' && c.status !== 'RESUBMITTED') return false;
        if (!filters.subject) return true;
        const certType = filters.subject.startsWith('CFA') ? 'CFA' : filters.subject;
        return c.type === certType;
      })
      .map((c: any) => (filters.subject ? (c.levelOrVariant || c.type) : c.type)),
```
Replace with:
```typescript
    verifiedCertifications: profile.certifications
      .filter((c: any) => {
        if (c.status !== 'VERIFIED') return false;
        if (!filters.subject) return true;
        const certType = filters.subject.startsWith('CFA') ? 'CFA' : filters.subject;
        return c.type === certType;
      })
      .map((c: any) => c.levelOrVariant || c.type),
```

- [ ] **Step 3: Fix badge matching in tutor profile page (`src/app/tutors/[id]/page.tsx`)**

Find (lines 43–49):
```typescript
  const verifiedSubjectTypes = useMemo(
    () =>
      (profile?.verifiedCertifications || []).map((subject: string) =>
        String(subject).replaceAll(' ', '_').toUpperCase()
      ),
    [profile?.verifiedCertifications]
  );
```
Replace with:
```typescript
  const verifiedSubjectTypes = useMemo(
    () => (profile?.verifiedCertifications || []) as string[],
    [profile?.verifiedCertifications]
  );
```

(The API now returns `levelOrVariant || type` which is already the Subject enum value. No transform needed.)

- [ ] **Step 4: Verify badge label still renders correctly (line ~174)**

Confirm this line is unchanged:
```tsx
{SUBJECT_LABELS[spec]} {verifiedSubjectTypes.includes(spec) ? 'Verified' : ''}
```
This now correctly shows " Verified" only when the spec (e.g. `'CFA_LEVEL_1'`) is in the verified list.

- [ ] **Step 5: Commit**
```bash
git add src/lib/admin-dashboard.ts src/app/tutors/[id]/page.tsx
git commit -m "fix(badges): only show Verified badge for VERIFIED certifications; fix CFA level matching"
```

---

## Task 4 — S5: Fix booking flow — timezone-aware slot creation

**Root cause:** `BookingModal` creates `scheduledAt` using `setHours(hours, minutes, 0, 0)` which sets hours in the **student's browser timezone**. But slot times (e.g., "06:30") come from the tutor's availability which is stored in the **tutor's timezone**. When the API converts the sent UTC datetime back to the tutor's timezone via `toWallClockDate`, the resulting hour differs from the selected slot → `isSlotBookable` returns false → 409.

**Fix:** Add a `timezone` prop to `BookingModal`, and in `handleBooking`, convert the selected date+slot from the tutor's timezone to UTC before sending.

**Files:**
- Modify: `src/components/student/BookingModal.tsx`

- [ ] **Step 1: Add `timezone` to `BookingModalProps` interface**

Find:
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
  };
```
Replace with:
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
  };
```

- [ ] **Step 2: Add helper function `tutorLocalToUTC` before the component definition**

Insert after the `getPackagePrice` function (around line 85), before `export default function BookingModal`:

```typescript
/**
 * Given a calendar date (local browser date) and a slot time string "HH:MM"
 * that represents wall-clock time in tutorTz, return the equivalent UTC Date.
 */
function tutorLocalToUTC(date: Date, slotTime: string, tutorTz: string): Date {
  const [slotHour, slotMinute] = slotTime.split(':').map(Number);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  const day = date.getDate();

  // Create a candidate UTC date assuming slotTime is UTC
  const candidateUTC = new Date(Date.UTC(year, month - 1, day, slotHour, slotMinute, 0));

  // Find what wall-clock time that UTC maps to in the tutor's timezone
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tutorTz,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(candidateUTC)) {
    parts[p.type] = p.value;
  }
  const displayedH = parseInt(parts.hour) === 24 ? 0 : parseInt(parts.hour);
  const displayedMs = Date.UTC(
    parseInt(parts.year),
    parseInt(parts.month) - 1,
    parseInt(parts.day),
    displayedH,
    parseInt(parts.minute),
  );
  const targetMs = Date.UTC(year, month - 1, day, slotHour, slotMinute);
  // Offset: how much UTC differs from what would show as slotTime in tutorTz
  return new Date(candidateUTC.getTime() + (targetMs - displayedMs));
}
```

- [ ] **Step 3: Use `tutorLocalToUTC` in `handleBooking` for single/trial bookings**

Find (inside `handleBooking`, around line 188):
```typescript
      let scheduledAt: Date | null = null;
      if (selectedDate && selectedSlot) {
        scheduledAt = new Date(selectedDate);
        const [hours, minutes] = selectedSlot.split(':').map(Number);
        scheduledAt.setHours(hours, minutes, 0, 0);
      }
```
Replace with:
```typescript
      let scheduledAt: Date | null = null;
      if (selectedDate && selectedSlot) {
        const tutorTz = tutor.timezone || 'UTC';
        scheduledAt = tutorLocalToUTC(selectedDate, selectedSlot, tutorTz);
      }
```

- [ ] **Step 4: Use `tutorLocalToUTC` in package slot creation**

Find (inside `handleBooking`, in the PACKAGE branch, around line 206):
```typescript
          packageScheduledSlots: selectedType === 'PACKAGE'
            ? selectedPackageSlots.map(s => {
                const dt = new Date(s.date);
                const [hours, minutes] = s.slot.split(':').map(Number);
                dt.setHours(hours, minutes, 0, 0);
                return dt.toISOString();
              })
            : undefined,
```
Replace with:
```typescript
          packageScheduledSlots: selectedType === 'PACKAGE'
            ? selectedPackageSlots.map(s => {
                const tutorTz = tutor.timezone || 'UTC';
                return tutorLocalToUTC(s.date, s.slot, tutorTz).toISOString();
              })
            : undefined,
```

- [ ] **Step 5: Fix `getSlotsForDay` to use tutor's dayOfWeek**

The slot picker uses `date.getDay()` which is in the student's browser timezone, but tutor's `dayOfWeek` is in the tutor's timezone. Fix by computing dayOfWeek in the tutor's timezone.

Find `getSlotsForDay` function:
```typescript
  const getSlotsForDay = (day: Date) => {
    if (isBefore(day, startOfDay(new Date()))) {
      return [];
    }

    const windows = getOpenTimeWindowsForDate({
      date: day,
      durationMinutes: activeDuration,
      availability: tutor.availability || [],
      overrides: tutor.blockedDates || [],
      bookings: tutor.bookedSlots || [],
    });
```
Replace with:
```typescript
  const getSlotsForDay = (day: Date) => {
    if (isBefore(day, startOfDay(new Date()))) {
      return [];
    }

    // Compute dayOfWeek in the tutor's timezone (availability slots are keyed by tutor's dayOfWeek)
    const tutorTz = tutor.timezone || 'UTC';
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tutorTz, weekday: 'short' });
    const dayName = fmt.format(day);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const tutorDayOfWeek = weekdays.indexOf(dayName);

    // Build a synthetic availability array mapped to the student's local day
    // so getOpenTimeWindowsForDate's date.getDay() matches
    const localDayOfWeek = day.getDay();
    const remappedAvailability = (tutor.availability || []).map((slot: any) => ({
      ...slot,
      dayOfWeek: slot.dayOfWeek === tutorDayOfWeek ? localDayOfWeek : slot.dayOfWeek,
    }));

    const windows = getOpenTimeWindowsForDate({
      date: day,
      durationMinutes: activeDuration,
      availability: remappedAvailability,
      overrides: tutor.blockedDates || [],
      bookings: tutor.bookedSlots || [],
    });
```

- [ ] **Step 6: Verify `tutor.timezone` is passed from both usage sites**

In `src/app/tutors/page.tsx`, the `tutor` object comes from `getPublicTutorCards` which already returns `timezone: profile.timezone` (line ~1252 in admin-dashboard.ts). ✓

In `src/app/tutors/[id]/page.tsx`, the `profile` object comes from `getPublicTutorProfile` which spreads `...profile` (includes `timezone`). ✓

No change needed in the API.

- [ ] **Step 7: Commit**
```bash
git add src/components/student/BookingModal.tsx
git commit -m "fix(booking): interpret tutor slot times in tutor timezone to prevent false 409"
```

---

## Task 5 — S3 Continued: Fix tutor card `verifiedCertifications` for HorizontalTutorCard subjects display

The `HorizontalTutorCard` uses `tutor.verifiedCertifications?.[0]` to pick `primarySubject`. Since verifiedCertifications now returns Subject-enum values (`'CFA_LEVEL_1'`), this is already correct after Task 3.

No additional changes needed.

---

## Task 6 — S4: Add Cancel button for students

**Backend state:** `/api/bookings/[id]/route.ts` already handles `action: 'cancel'` for both student and tutor (line 62–97), so no backend change needed for single booking cancel. Two additions needed:
1. Add 24-hour check before cancellation
2. Add package cancel endpoint

**Files:**
- Modify: `src/app/api/bookings/[id]/route.ts`
- Create: `src/app/api/bookings/[id]/cancel-package/route.ts`
- Modify: `src/app/dashboard/student/page.tsx`

- [ ] **Step 1: Add 24-hour cancellation guard to existing cancel logic**

In `src/app/api/bookings/[id]/route.ts`, find the cancel block:
```typescript
    if (action === 'cancel') {
      if (booking.status === 'CANCELLED') {
        return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
      }

      const updatedBooking = await prisma.booking.update({
```
Replace with:
```typescript
    if (action === 'cancel') {
      if (booking.status === 'CANCELLED') {
        return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
      }

      if (booking.status === 'COMPLETED') {
        return NextResponse.json({ error: 'Completed bookings cannot be cancelled' }, { status: 400 });
      }

      const CANCEL_THRESHOLD_HOURS = 24;
      const hoursUntilSession = (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilSession < CANCEL_THRESHOLD_HOURS) {
        return NextResponse.json(
          { error: `Cannot cancel within ${CANCEL_THRESHOLD_HOURS} hours of scheduled time` },
          { status: 400 }
        );
      }

      const updatedBooking = await prisma.booking.update({
```

- [ ] **Step 2: Create package cancel route `src/app/api/bookings/[id]/cancel-package/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createInAppNotification } from '@/lib/in-app-notifications';

const CANCEL_THRESHOLD_HOURS = 24;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // params.id is the bookingPackage id
    const pkg = await prisma.bookingPackage.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          include: { payment: true },
        },
        payment: true,
        tutorProfile: {
          include: { user: { select: { id: true, name: true } } },
        },
        student: { select: { id: true, name: true } },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const isStudentOwner = pkg.studentId === session.user.id;
    const isTutorOwner = pkg.tutorProfile.userId === session.user.id;

    if (!isStudentOwner && !isTutorOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check 24h policy against the nearest upcoming session
    const upcomingBookings = pkg.bookings.filter(
      (b) => b.status === 'PENDING' || b.status === 'CONFIRMED'
    );

    if (upcomingBookings.length === 0) {
      return NextResponse.json({ error: 'No upcoming sessions to cancel' }, { status: 400 });
    }

    const nearestSession = upcomingBookings.reduce((min, b) =>
      b.scheduledAt < min.scheduledAt ? b : min
    );
    const hoursUntilNearest =
      (nearestSession.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilNearest < CANCEL_THRESHOLD_HOURS) {
      return NextResponse.json(
        {
          error: `Cannot cancel package: the next session is within ${CANCEL_THRESHOLD_HOURS} hours of its scheduled time`,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    await prisma.$transaction([
      // Cancel all upcoming sessions
      prisma.booking.updateMany({
        where: {
          packageId: pkg.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        data: { status: 'CANCELLED', cancelledAt: now },
      }),
      // Mark payment as refunded if captured
      ...(pkg.payment && pkg.payment.status === 'CAPTURED'
        ? [
            prisma.payment.update({
              where: { id: pkg.payment.id },
              data: {
                status: 'REFUNDED',
                refundedAmount: pkg.payment.amount,
                refundedAt: now,
                refundReason: `Package cancelled by ${isStudentOwner ? 'student' : 'tutor'}`,
              },
            }),
          ]
        : []),
    ]);

    // Notify the other party
    const notifyUserId = isStudentOwner ? pkg.tutorProfile.user.id : pkg.studentId;
    const actorName = isStudentOwner ? pkg.student.name : pkg.tutorProfile.user.name;
    await createInAppNotification({
      userId: notifyUserId,
      preferenceType: 'SESSION_UPDATES',
      type: 'BOOKING_CANCELLED',
      title: 'Lesson package cancelled',
      body: `${actorName} cancelled the lesson package. All upcoming sessions have been cancelled.`,
      link: isStudentOwner
        ? '/dashboard/tutor?tab=sessions'
        : '/dashboard/student?tab=bookings',
    });

    return NextResponse.json({ success: true, message: 'Package cancelled successfully' });
  } catch (error) {
    console.error('Package cancel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add `handleCancelBooking` and `handleCancelPackage` in student dashboard**

In `src/app/dashboard/student/page.tsx`, find the `handleMockPayNow` function and add after it (before the `if (isLoading)` block):

```typescript
  async function handleCancelBooking(bookingId: string) {
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to cancel booking');
      }
      toast.success('Booking cancelled successfully.');
      void mutateBookings();
    } catch (error: any) {
      toast.error(error.message || 'Could not cancel booking');
    }
  }

  async function handleCancelPackage(packageId: string) {
    if (!window.confirm('Are you sure you want to cancel this entire package? All upcoming sessions will be cancelled. This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`/api/bookings/${packageId}/cancel-package`, {
        method: 'POST',
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to cancel package');
      }
      toast.success('Package cancelled successfully.');
      void mutateBookings();
    } catch (error: any) {
      toast.error(error.message || 'Could not cancel package');
    }
  }
```

- [ ] **Step 4: Add Cancel button to single/trial bookings in the Bookings tab**

In `src/app/dashboard/student/page.tsx`, find the section that renders individual bookings in the bookings tab. Look for where booking status is shown for upcoming bookings (around `upcoming` array rendering). Add a cancel button after each booking's status badge for cancellable bookings.

Find the pattern where upcoming bookings are rendered (look for something like `upcoming.map(booking => ...` or where status PENDING/CONFIRMED bookings are listed). Add a Cancel button:

```tsx
{(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
  <button
    onClick={() => handleCancelBooking(booking.id)}
    className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-1.5 rounded-xl transition-all"
  >
    Cancel
  </button>
)}
```

- [ ] **Step 5: Add Cancel Package button to packages in the Bookings tab**

For the packages rendered in the bookings tab (where `packages` array is used), add a Cancel Package button:

```tsx
{pkg.sessionsRemaining > 0 && (
  <button
    onClick={() => handleCancelPackage(pkg.id)}
    className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-1.5 rounded-xl transition-all"
  >
    Cancel Package
  </button>
)}
```

- [ ] **Step 6: Commit**
```bash
git add src/app/api/bookings/[id]/route.ts \
        src/app/api/bookings/[id]/cancel-package/route.ts \
        src/app/dashboard/student/page.tsx
git commit -m "feat(student): add cancel booking/package with 24h policy"
```

---

## Task 7 — S6: Verify slot locking is correctly implemented

**Investigation:** The existing code already correctly implements slot locking:
- `getPublicTutorProfile` (and `getPublicTutorCards`) queries `bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } }` and returns them as `bookedSlots`
- `BookingModal.getSlotsForDay` passes `tutor.bookedSlots` to `getOpenTimeWindowsForDate`
- `getBlockedRangesForDate` blocks time ranges that are already booked
- The API double-checks via `isSlotBookable` with the same filter
- When booking is cancelled, status → `CANCELLED` → no longer in PENDING/CONFIRMED → slot becomes available automatically

**The only missing piece:** When the API returns 409 due to a race condition (another student just booked the slot), the frontend currently shows the generic error. Improve the message.

**Files:**
- Modify: `src/components/student/BookingModal.tsx`

- [ ] **Step 1: Improve 409 race-condition error message in `handleBooking`**

Find (inside `handleBooking`):
```typescript
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to process request');
      }
```
Replace with:
```typescript
      const json = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            json.error ||
              'This time slot is no longer available. Please choose a different time.'
          );
        }
        throw new Error(json.error || 'Failed to process request');
      }
```

- [ ] **Step 2: Commit**
```bash
git add src/components/student/BookingModal.tsx
git commit -m "fix(booking): improve 409 slot-conflict error message"
```

---

## Task 8 — S7: Availability count in tutor cards

**Investigation:** The availability count is computed by `countAvailableDaysWithinNextDays` in `admin-dashboard.ts`. It calls `getOpenTimeWindowsForDate` which uses `date.getDay()` (UTC, since server runs in UTC). The tutor's `dayOfWeek` in availability is also typically UTC-aligned for most profiles. However, when the tutor's timezone is significantly ahead of UTC (e.g., UTC+12), `date.getDay()` in UTC may return a different day than the tutor's local day, causing slots to be missed or double-counted.

**Fix:** In `countAvailableDaysWithinNextDays`, derive the `dayOfWeek` to check using the tutor's timezone. But the function doesn't receive the tutor's timezone.

Since this function is called from `getPublicTutorCards` (line ~1115):
```typescript
const availableDaysCount = countAvailableDaysWithinNextDays({
  availability: profile.availability,
  overrides: profile.overrides,
  bookings: profile.bookings,
  durationMinutes: primaryPricingOption?.durationMinutes || 60,
});
```

**Files:**
- Modify: `src/lib/availability.ts`
- Modify: `src/lib/admin-dashboard.ts`

- [ ] **Step 1: Add optional `timezone` param to `countAvailableDaysWithinNextDays`**

In `src/lib/availability.ts`, find:
```typescript
export function countAvailableDaysWithinNextDays(input: {
  availability: AvailabilitySlotLike[];
  overrides: AvailabilityOverrideLike[];
  bookings: BookingLike[];
  durationMinutes: number;
  days?: number;
}): number {
  const { availability, overrides, bookings, durationMinutes, days = 7 } = input;
  const now = new Date();
  const distinctDays = new Set<string>();

  for (let d = 0; d < days; d++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + d);
    checkDate.setHours(0, 0, 0, 0);

    const windows = getOpenTimeWindowsForDate({
      date: checkDate,
      durationMinutes,
      availability,
      overrides,
      bookings,
    });
```
Replace with:
```typescript
export function countAvailableDaysWithinNextDays(input: {
  availability: AvailabilitySlotLike[];
  overrides: AvailabilityOverrideLike[];
  bookings: BookingLike[];
  durationMinutes: number;
  days?: number;
  timezone?: string;
}): number {
  const { availability, overrides, bookings, durationMinutes, days = 7, timezone } = input;
  const now = new Date();
  const distinctDays = new Set<string>();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const tzFmt = timezone
    ? new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' })
    : null;

  for (let d = 0; d < days; d++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + d);
    checkDate.setHours(0, 0, 0, 0);

    // Remap availability dayOfWeek to the server's checkDate.getDay() if timezone provided
    let effectiveAvailability = availability;
    if (tzFmt) {
      const tutorDayOfWeek = weekdays.indexOf(tzFmt.format(checkDate));
      const localDayOfWeek = checkDate.getDay();
      if (tutorDayOfWeek !== localDayOfWeek) {
        effectiveAvailability = availability.map((slot) => ({
          ...slot,
          dayOfWeek:
            slot.dayOfWeek === tutorDayOfWeek ? localDayOfWeek : slot.dayOfWeek,
        }));
      }
    }

    const windows = getOpenTimeWindowsForDate({
      date: checkDate,
      durationMinutes,
      availability: effectiveAvailability,
      overrides,
      bookings,
    });
```

- [ ] **Step 2: Pass `timezone` when calling `countAvailableDaysWithinNextDays` in `admin-dashboard.ts`**

Find (around line 1115):
```typescript
      const availableDaysCount = countAvailableDaysWithinNextDays({
        availability: profile.availability,
        overrides: profile.overrides,
        bookings: profile.bookings,
        durationMinutes: primaryPricingOption?.durationMinutes || 60,
      });
```
Replace with:
```typescript
      const availableDaysCount = countAvailableDaysWithinNextDays({
        availability: profile.availability,
        overrides: profile.overrides,
        bookings: profile.bookings,
        durationMinutes: primaryPricingOption?.durationMinutes || 60,
        timezone: profile.timezone || undefined,
      });
```

- [ ] **Step 3: Commit**
```bash
git add src/lib/availability.ts src/lib/admin-dashboard.ts
git commit -m "fix(availability): count available days using tutor's own timezone"
```

---

## Task 9 — T3: Show onboarding-uploaded documents in dashboard

**Root cause:** Onboarding step 3 (`/api/onboarding/step/[step]`) creates `TutorCertification` records but does NOT create `TutorCredential` records. The dashboard "Submitted Documents" shows `tutorProfile.credentials` (TutorCredential table). So documents uploaded during onboarding are invisible in the dashboard.

**Fix:** In the onboarding step 3 handler, after creating/updating a `TutorCertification` with a `fileUrl`, also upsert a corresponding `TutorCredential` record.

**Files:**
- Modify: `src/app/api/onboarding/step/[step]/route.ts`

- [ ] **Step 1: Read the step 3 onboarding case**

The relevant section starts around `case 3: { // Certification`. Inside the cert creation loop, find where `fileUrl` is set:
```typescript
              fileUrl: cert.fileUrl || null,
```

After the certification creation (after `await prisma.tutorCertification.create({ ... })`), add:

```typescript
            // Sync to TutorCredential so dashboard "Submitted Documents" shows it
            if (certData.fileUrl) {
              const fileName = certData.fileUrl.split('/').pop() || cert.type;
              const subjectValue = cert.levelOrVariant || cert.type;
              const credId = `cred_onb_${Math.random().toString(36).substring(2, 11)}`;
              await prisma.$executeRawUnsafe(
                `INSERT INTO "TutorCredential" ("id", "tutorProfileId", "type", "subject", "fileName", "fileUrl", "uploadedAt")
                 VALUES ($1, $2, 'SCORE_REPORT'::"CredentialType", $3::"Subject", $4, $5, NOW())
                 ON CONFLICT DO NOTHING`,
                credId,
                tutorProfile.id,
                subjectValue,
                fileName,
                certData.fileUrl
              );
            }
```

Similarly, for the `existingCert` update path, after `await prisma.tutorCertification.update({ ... })`, add the same upsert (using `ON CONFLICT DO NOTHING` avoids duplicates).

> **Note:** The `$executeRawUnsafe` approach follows the same pattern already used in `/api/tutor/verify/route.ts` lines 311–323.

- [ ] **Step 2: Full step 3 handler with both create and update paths including credential sync**

Find in `case 3:`:
```typescript
        } else {
          for (const cert of certifications) {
            const certData: any = {
              tutorProfileId: tutorProfile.id,
              type: cert.type,
              ...
              fileUrl: cert.fileUrl || null,
            };
            if (cert.mbaEmail) certData.mbaEmail = cert.mbaEmail;
            if (cert.mbaPassword) certData.mbaPasswordEncrypted = encrypt(cert.mbaPassword);
```

After the `prisma.tutorCertification.create({ data: certData })` call (and after the GMAT request handling), add:

```typescript
            // Mirror uploaded document to TutorCredential table for dashboard visibility
            if (certData.fileUrl) {
              const fileName = certData.fileUrl.split('/').pop() || String(cert.type);
              const subjectRaw = (cert.levelOrVariant || cert.type) as string;
              const credId = `cred_onb_${Math.random().toString(36).substring(2, 11)}`;
              await prisma.$executeRawUnsafe(
                `INSERT INTO "TutorCredential" ("id", "tutorProfileId", "type", "subject", "fileName", "fileUrl", "uploadedAt")
                 VALUES ($1, $2, 'SCORE_REPORT'::"CredentialType", $3::"Subject", $4, $5, NOW())
                 ON CONFLICT DO NOTHING`,
                credId,
                tutorProfile.id,
                subjectRaw,
                fileName,
                certData.fileUrl
              );
            }
```

- [ ] **Step 3: Commit**
```bash
git add src/app/api/onboarding/step/[step]/route.ts
git commit -m "fix(onboarding): mirror uploaded certs to TutorCredential for dashboard visibility"
```

---

## Task 10 — T1: Fix block dates auto-selecting current date on month navigation

**Root cause:** The native `<input type="date">` fires `onChange` with today's date in some browsers when the user clicks month navigation arrows inside the picker. The current code immediately adds any non-empty value to overrides.

**Fix:** Use a controlled two-step flow: first the input captures the date into local state, then an explicit "Add" button commits it to the blocked list.

**Files:**
- Modify: `src/app/onboarding/tutor/steps/Step7Availability.tsx`

- [ ] **Step 1: Add `blockDateInput` state**

Find:
```typescript
  const [overrides, setOverrides] = useState<string[]>([]);
```
Replace with:
```typescript
  const [overrides, setOverrides] = useState<string[]>([]);
  const [blockDateInput, setBlockDateInput] = useState('');
```

- [ ] **Step 2: Replace the date input's auto-add `onChange` with controlled state + Add button**

Find:
```tsx
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
```
Replace with:
```tsx
        <div className="flex gap-2 items-center max-w-sm">
          <input
            type="date"
            className="input-field flex-1"
            min={new Date().toISOString().split('T')[0]}
            value={blockDateInput}
            onChange={(event) => setBlockDateInput(event.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              if (blockDateInput && !overrides.includes(blockDateInput)) {
                setOverrides((previous) => [...previous, blockDateInput]);
                setBlockDateInput('');
              }
            }}
            disabled={!blockDateInput || overrides.includes(blockDateInput)}
            className="btn-outline px-4 py-2 text-sm font-bold rounded-xl disabled:opacity-40"
          >
            Add
          </button>
        </div>
```

- [ ] **Step 3: Commit**
```bash
git add src/app/onboarding/tutor/steps/Step7Availability.tsx
git commit -m "fix(onboarding): prevent block-date auto-add on month navigation"
```

---

## Task 11 — T2: Fix missing currency in tutor pricing display

**Root cause 1:** `HorizontalTutorCard` uses `tutor.pricing` (not returned by `getPublicTutorCards` API) and `formatCurrency(p.price)` without currency code.

**Root cause 2:** The Lesson Options section should use `tutor.pricingOptions` (which is returned and has `priceDisplay.formatted`).

**Files:**
- Modify: `src/components/tutors/HorizontalTutorCard.tsx`

- [ ] **Step 1: Fix Lesson Options to use `pricingOptions` with formatted price**

Find the Lesson Options section (around line 200–225):
```tsx
          <div className="flex flex-wrap gap-2.5">
            {tutor.pricing?.filter((p: any) => p.isEnabled).sort((a: any, b: any) => a.durationMinutes - b.durationMinutes).map((p: any) => (
              <div
                key={p.id}
                ...
              >
                ...
                  <span className="text-xs font-black text-gold-600 dark:text-gold-400">{formatCurrency(p.price)}</span>
                ...
              </div>
            ))}
            {(!tutor.pricing || tutor.pricing.filter((p: any) => p.isEnabled).length === 0) && (
              <p className="text-xs text-navy-300 dark:text-cream-400/60 font-medium">Standard rates apply.</p>
            )}
          </div>
```
Replace the entire `<div className="flex flex-wrap gap-2.5">` block with:
```tsx
          <div className="flex flex-wrap gap-2.5">
            {(tutor.pricingOptions || tutor.pricing || [])
              .filter((p: any) => p.isEnabled)
              .sort((a: any, b: any) => a.durationMinutes - b.durationMinutes)
              .map((p: any) => (
                <div
                  key={p.id || p.durationMinutes}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-500/20 rounded-xl transition-all hover:border-gold-400 hover:shadow-lg group/price"
                >
                  <div className="w-6 h-6 rounded-lg bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center text-gold-600 group-hover/price:bg-gold-400 group-hover/price:text-navy-600 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div className="flex flex-col -space-y-0.5">
                    <span className="text-[10px] font-black text-navy-600 dark:text-cream-200 uppercase tracking-tighter">{p.durationMinutes}m</span>
                    <span className="text-xs font-black text-gold-600 dark:text-gold-400">
                      {p.priceDisplay?.formatted || formatCurrency(p.price, p.currency || 'USD')}
                    </span>
                  </div>
                </div>
              ))}
            {(tutor.pricingOptions || tutor.pricing || []).filter((p: any) => p.isEnabled).length === 0 && (
              <p className="text-xs text-navy-300 dark:text-cream-400/60 font-medium">Standard rates apply.</p>
            )}
          </div>
```

- [ ] **Step 2: Commit**
```bash
git add src/components/tutors/HorizontalTutorCard.tsx
git commit -m "fix(ui): show correct currency in tutor card lesson options"
```

---

## Task 12 — TypeScript validation

- [ ] **Step 1: Run TypeScript check**
```bash
cd /c/Users/Admin/Desktop/WEB && npx tsc --noEmit 2>&1 | head -80
```
Fix any errors introduced by our changes.

- [ ] **Step 2: Run Prisma validate**
```bash
npx prisma validate
```

- [ ] **Step 3: Final commit of any TS fixes**
```bash
git add -p
git commit -m "fix(types): resolve TypeScript errors from round-3 bug fixes"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] S1 — label changed in TutorFilterBar.tsx (Task 1)
- [x] S2 — sort uses actualBookingCount (Task 2)
- [x] S3 — verifiedCertifications only VERIFIED; CFA level matching fixed (Task 3)
- [x] S4 — cancel button for student + 24h policy + package cancel (Task 6)
- [x] S5 — timezone-aware slot creation in BookingModal (Task 4)
- [x] S6 — slot locking already works; 409 message improved (Task 7)
- [x] S7 — availability count uses tutor timezone (Task 8)
- [x] T1 — block dates controlled input with Add button (Task 10)
- [x] T2 — pricingOptions + formatted price with currency (Task 11)
- [x] T3 — onboarding creates TutorCredential when fileUrl present (Task 9)

**Type consistency:** All references to `actualBookingCount`, `pricingOptions`, `verifiedCertifications` are consistent across tasks.

**No placeholders:** All code blocks are complete and runnable.
