# Bug Fixes Round 2 — Tutor Marketplace Platform

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 bugs across the Tutor Marketplace platform spanning booking flow, session visibility, availability display, sort logic, analytics, penalty/discipline system, and UI/UX improvements.

**Architecture:** The app is Next.js 14 App Router with Prisma/PostgreSQL, NextAuth, Stripe, Tailwind CSS dark-mode via `darkMode: "class"`. Most data fetching uses SWR. The main code areas touched are: `src/components/student/BookingModal.tsx`, `src/app/api/bookings/route.ts`, `src/app/api/tutor/bookings/route.ts`, `src/lib/admin-dashboard.ts`, `src/components/tutors/HorizontalTutorCard.tsx`, `src/components/admin/`, `src/app/settings/page.tsx`, `prisma/schema.prisma`, and new penalty/appeal API routes.

**Tech Stack:** Next.js 14, React 18, Prisma 5, PostgreSQL, NextAuth, Tailwind CSS 3, Framer Motion, SWR, Zod, react-hot-toast

---

## File Map

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `packageId` to Booking; add `UserPenalty` and `Appeal` models |
| `src/components/student/BookingModal.tsx` | Add multi-slot selection for package, new SCHEDULE step |
| `src/app/api/bookings/route.ts` | Accept `packageScheduledSlots[]`, create individual Booking records per package session |
| `src/app/api/tutor/bookings/route.ts` | Remove `take:10` limit, include ALL statuses for full session list |
| `src/lib/admin-dashboard.ts` | Fix `getPublicTutorCards`: `availableDaysCount` + `experience` sort; fix `hoursTaughtPerTutor` to include package revenue |
| `src/components/tutors/HorizontalTutorCard.tsx` | Display `availableDaysCount` instead of hardcoded "7d" |
| `src/app/dashboard/tutor/students/page.tsx` | Fix Total Sessions (COMPLETED only) and Revenue (CAPTURED payments only) |
| `src/app/settings/page.tsx` | Remove Hourly Rate field from tutor profile tab |
| `src/components/admin/Reports.tsx` | Add Revoke Suspension button and confirmation dialogs |
| `src/app/api/admin/reports/[id]/route.ts` | Add `REVOKE_SUSPENSION` action |
| `src/app/api/admin/users/[id]/route.ts` | Add `REVOKE_SUSPENSION` action |
| `src/app/api/user/penalties/route.ts` | **New** — GET active penalties for current user |
| `src/app/api/user/appeals/route.ts` | **New** — POST user appeal |
| `src/app/api/admin/appeals/route.ts` | **New** — GET all appeals |
| `src/app/api/admin/appeals/[id]/route.ts` | **New** — PATCH appeal (accept/reject) |
| `src/components/providers/PenaltyNotificationModal.tsx` | **New** — Penalty popup shown on login |
| `src/app/layout.tsx` | Mount PenaltyNotificationModal in root layout |
| `src/app/globals.css` | Bug 10: complete dark/light CSS variable audit |
| Various components | Bug 10: add missing `dark:` variants |

---

## Task 1 — Schema: Add packageId to Booking + UserPenalty + Appeal

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `packageId` field to Booking model**

In `prisma/schema.prisma`, inside the `Booking` model (after the `isFreeSession` line), add:

```prisma
packageId       String?
package         BookingPackage? @relation("PackageBookings", fields: [packageId], references: [id], onDelete: SetNull)
```

And in `BookingPackage` model add the reverse relation after the `payment Payment?` line:

```prisma
bookings        Booking[]       @relation("PackageBookings")
```

- [ ] **Step 2: Add `UserPenalty` and `Appeal` models + enums**

After the `UserStrike` model, add:

```prisma
enum PenaltyType {
  WARNING
  SUSPEND_7D
  SUSPEND_30D
  PERMANENT_BAN
}

enum PenaltyStatus {
  ACTIVE
  EXPIRED
  APPEALED
  REVOKED
}

enum AppealStatus {
  PENDING
  REVIEWED
  ACCEPTED
  REJECTED
}

model UserPenalty {
  id         String        @id @default(cuid())
  userId     String
  user       User          @relation("ReceivedPenalties", fields: [userId], references: [id], onDelete: Cascade)
  adminId    String?
  admin      User?         @relation("IssuedPenalties", fields: [adminId], references: [id], onDelete: SetNull)
  type       PenaltyType
  reason     String
  status     PenaltyStatus @default(ACTIVE)
  expiresAt  DateTime?
  revokedAt  DateTime?
  createdAt  DateTime      @default(now())
  appeals    Appeal[]

  @@index([userId, status])
}

model Appeal {
  id            String       @id @default(cuid())
  penaltyId     String
  penalty       UserPenalty  @relation(fields: [penaltyId], references: [id], onDelete: Cascade)
  userId        String
  user          User         @relation("UserAppeals", fields: [userId], references: [id], onDelete: Cascade)
  reason        String
  evidence      String?
  status        AppealStatus @default(PENDING)
  adminResponse String?
  reviewedAt    DateTime?
  createdAt     DateTime     @default(now())

  @@index([status, createdAt])
}
```

Add relations to `User` model (after `receivedStrikes` line):
```prisma
receivedPenalties  UserPenalty[]  @relation("ReceivedPenalties")
issuedPenalties    UserPenalty[]  @relation("IssuedPenalties")
userAppeals        Appeal[]       @relation("UserAppeals")
```

- [ ] **Step 3: Run migration**

```bash
cd C:/Users/Admin/Desktop/WEB
npx prisma migrate dev --name "add-package-booking-link-and-penalty-appeal"
```

Expected: Migration runs successfully, `npx prisma generate` runs automatically.

- [ ] **Step 4: Verify schema**

```bash
npx prisma validate
```

Expected: `The schema at ... is valid`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add packageId to Booking, add UserPenalty and Appeal models"
```

---

## Task 2 — Bug 1: BookingModal — Add multi-slot selection for Lesson Package

**Files:**
- Modify: `src/components/student/BookingModal.tsx`

The root cause: line 298 in the PACKAGE step calls `setStep(STEPS.CONFIRM)` directly, skipping slot selection entirely.

- [ ] **Step 1: Add `SCHEDULE` step constant and new state**

Replace the `STEPS` constant and add state variables. In `BookingModal.tsx`:

Change:
```typescript
const STEPS = { TYPE: 'type', PACKAGE: 'package', TIME: 'time', CONFIRM: 'confirm' } as const;
```
To:
```typescript
const STEPS = { TYPE: 'type', PACKAGE: 'package', SCHEDULE: 'schedule', TIME: 'time', CONFIRM: 'confirm' } as const;
```

Add after `const [selectedSlot, setSelectedSlot] = useState<string | null>(null);`:
```typescript
const [selectedPackageSlots, setSelectedPackageSlots] = useState<Array<{ date: Date; slot: string }>>([]);
```

- [ ] **Step 2: Update the reset effect**

Add `setSelectedPackageSlots([]);` inside the `useEffect` that runs on `isOpen` change (after `setSelectedSlot(null);`).

- [ ] **Step 3: Fix PACKAGE step — remove direct jump to CONFIRM**

In the PACKAGE step JSX, change the `onClick` for each package button from:
```typescript
onClick={() => { setSelectedPackage(pkg); setStep(STEPS.CONFIRM); }}
```
To:
```typescript
onClick={() => { setSelectedPackage(pkg); setSelectedPackageSlots([]); setStep(STEPS.SCHEDULE); }}
```

- [ ] **Step 4: Add SCHEDULE step JSX after the TIME step block**

Insert a new AnimatePresence block after the `{step === STEPS.TIME && (...)}` block:

```tsx
{step === STEPS.SCHEDULE && selectedPackage && (
  <motion.div key="schedule" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-6">
    <div className="flex items-center justify-between">
      <button onClick={() => setStep(STEPS.PACKAGE)} className="text-[11px] font-black uppercase tracking-widest text-navy-300 hover:text-navy-600">Back</button>
      <div className="flex items-center gap-4">
        <button onClick={prevWeek} className="p-1 rounded-full hover:bg-navy-50 text-navy-300">◀</button>
        <span className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">{format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d')}</span>
        <button onClick={nextWeek} className="p-1 rounded-full hover:bg-navy-50 text-navy-300">▶</button>
      </div>
    </div>

    <div className="rounded-2xl bg-navy-50/60 dark:bg-navy-700/30 p-4 flex items-center justify-between">
      <span className="text-xs font-bold text-navy-600 dark:text-cream-200">Select {selectedPackage.sessions} slots</span>
      <span className={`text-xs font-black ${selectedPackageSlots.length === selectedPackage.sessions ? 'text-sage-600' : 'text-gold-600'}`}>
        {selectedPackageSlots.length} / {selectedPackage.sessions} chosen
      </span>
    </div>

    <div className="grid grid-cols-7 gap-1 border-b border-navy-100/50 pb-2">
      {daysInWeek.map((day) => (
        <div key={day.toString()} className="text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/30">{format(day, 'EEE')}</div>
          <div className={`mt-1 text-xs font-black w-7 h-7 flex items-center justify-center mx-auto rounded-full ${isToday(day) ? 'bg-gold-400 text-navy-600' : 'text-navy-600 dark:text-cream-200'}`}>{format(day, 'd')}</div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-7 gap-1 h-[320px] overflow-y-auto pr-2 custom-scrollbar pt-2">
      {daysInWeek.map((day) => {
        const slots = getSlotsForDay(day);
        return (
          <div key={day.toString()} className="flex flex-col gap-1">
            {slots.length > 0 ? slots.map((time) => {
              const isSelected = selectedPackageSlots.some(s => isSameDay(s.date, day) && s.slot === time);
              const isMaxReached = selectedPackageSlots.length >= selectedPackage.sessions && !isSelected;
              return (
                <button
                  key={time}
                  disabled={isMaxReached}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedPackageSlots(prev => prev.filter(s => !(isSameDay(s.date, day) && s.slot === time)));
                    } else if (selectedPackageSlots.length < selectedPackage.sessions) {
                      setSelectedPackageSlots(prev => [...prev, { date: day, slot: time }]);
                    }
                  }}
                  className={`py-2 text-[10px] font-bold rounded-lg transition-all ${isSelected ? 'bg-sage-500 text-white shadow-lg' : isMaxReached ? 'opacity-30 cursor-not-allowed bg-navy-50/30 text-navy-300' : 'bg-navy-50/50 dark:bg-navy-700/50 text-navy-400 dark:text-cream-400/40 hover:bg-gold-50 hover:text-gold-600'}`}
                >
                  {slotLabel(time)}
                </button>
              );
            }) : <div className="h-full flex items-center justify-center opacity-10"><div className="w-px h-8 bg-navy-100" /></div>}
          </div>
        );
      })}
    </div>

    {selectedPackageSlots.length > 0 && (
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-navy-300 ml-1">Selected sessions</p>
        <div className="flex flex-wrap gap-2">
          {selectedPackageSlots.map((s, i) => (
            <span key={i} className="px-3 py-1.5 rounded-xl bg-sage-50 dark:bg-sage-500/10 text-[10px] font-black text-sage-700 dark:text-sage-300 border border-sage-200/70">
              {format(s.date, 'MMM d')} {slotLabel(s.slot)}
            </span>
          ))}
        </div>
      </div>
    )}

    <button
      disabled={selectedPackageSlots.length !== selectedPackage.sessions}
      onClick={() => setStep(STEPS.CONFIRM)}
      className="w-full bg-navy-600 hover:bg-navy-700 disabled:bg-navy-100 disabled:text-navy-300 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all"
    >
      {selectedPackageSlots.length === selectedPackage.sessions ? 'Next: Review & Confirm' : `Select ${selectedPackage.sessions - selectedPackageSlots.length} more slot(s)`}
    </button>
  </motion.div>
)}
```

- [ ] **Step 5: Update CONFIRM step to show package slots**

In the CONFIRM step, replace the package summary block (the `selectedType === 'PACKAGE'` branch in the booking summary) to show selected slots:

Change the `selectedType === 'PACKAGE'` branch from:
```tsx
<div className="flex justify-between gap-4">
  <span className="text-navy-400 dark:text-cream-400/60">Package</span>
  <span className="text-right font-bold text-navy-600 dark:text-cream-200">{selectedPackage?.sessions} lessons • {selectedDuration} minutes</span>
</div>
```
To:
```tsx
<div className="space-y-2">
  <div className="flex justify-between gap-4">
    <span className="text-navy-400 dark:text-cream-400/60">Package</span>
    <span className="text-right font-bold text-navy-600 dark:text-cream-200">{selectedPackage?.sessions} lessons • {selectedDuration}m each</span>
  </div>
  {selectedPackageSlots.length > 0 && (
    <div className="pl-2 space-y-1">
      {selectedPackageSlots.map((s, i) => (
        <div key={i} className="flex justify-between text-xs">
          <span className="text-navy-300">Session {i + 1}</span>
          <span className="font-bold text-navy-500 dark:text-cream-300">{format(s.date, 'EEE, MMM d')} at {slotLabel(s.slot)}</span>
        </div>
      ))}
    </div>
  )}
</div>
```

Also update the "Change" button back navigation for package:
```typescript
onClick={() => setStep(selectedType === 'PACKAGE' ? STEPS.SCHEDULE : STEPS.TIME)}
```

- [ ] **Step 6: Update `handleBooking` to send package slots**

In `handleBooking`, update the package branch to include slots:

Change the `fetch('/api/bookings', ...)` call body to include slots for packages:
```typescript
body: JSON.stringify({
  tutorProfileId: tutor.id,
  scheduledAt: scheduledAt?.toISOString(),
  type: selectedType,
  durationMinutes: activeDuration,
  subject: tutor.verifiedCertifications?.[0] || tutor.specializations[0],
  notes,
  packageSessions: selectedPackage?.sessions,
  discount: selectedPackage?.discount,
  packageScheduledSlots: selectedType === 'PACKAGE'
    ? selectedPackageSlots.map(s => {
        const dt = new Date(s.date);
        const [hours, minutes] = s.slot.split(':').map(Number);
        dt.setHours(hours, minutes, 0, 0);
        return dt.toISOString();
      })
    : undefined,
}),
```

Also update the validation at the top of `handleBooking`:
```typescript
if (selectedType === 'PACKAGE' && (!selectedPackage || selectedPackageSlots.length !== selectedPackage.sessions)) {
  return;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/student/BookingModal.tsx
git commit -m "feat(booking): add multi-slot schedule selection for lesson packages"
```

---

## Task 3 — Bug 1 (Backend): API creates individual Booking records for packages

**Files:**
- Modify: `src/app/api/bookings/route.ts`

- [ ] **Step 1: Update Zod schema to accept `packageScheduledSlots`**

In `bookingSchema`, add:
```typescript
packageScheduledSlots: z.array(z.string()).optional(),
```

And destructure it in the POST handler:
```typescript
const { tutorProfileId, scheduledAt, durationMinutes, type, subject, notes, packageSessions, discount, packageScheduledSlots } = bookingSchema.parse(body);
```

- [ ] **Step 2: Validate `packageScheduledSlots` when type is PACKAGE**

Inside the `if (type === 'PACKAGE')` block, after the existing `packageSessions` check, add:

```typescript
if (!packageScheduledSlots || packageScheduledSlots.length !== packageSessions) {
  return NextResponse.json({ error: 'You must select a time slot for each session in the package.' }, { status: 400 });
}

// Validate all slots are in the future
for (const slotIso of packageScheduledSlots) {
  const slotDate = new Date(slotIso);
  if (Number.isNaN(slotDate.getTime()) || slotDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'All selected session times must be in the future.' }, { status: 400 });
  }
}
```

- [ ] **Step 3: Create individual Booking records after BookingPackage creation**

After the `pkg` creation (after `include: { payment: true }`) and before the `checkoutUrl` logic, add:

```typescript
// Normalize subject for bookings
const normalizedPkgSubject = normalizeSubject(subject);
if (!VALID_SUBJECTS.includes(normalizedPkgSubject as any)) {
  return NextResponse.json({ error: `Invalid subject: "${subject}"` }, { status: 400 });
}

// Create one Booking record per scheduled slot
const sessionNumber0 = previousSessionsCount;
const bookingCreations = packageScheduledSlots.map((slotIso, index) => {
  const slotDate = new Date(slotIso);
  return prisma.booking.create({
    data: {
      studentId,
      tutorProfileId,
      packageId: pkg.id,
      scheduledAt: slotDate,
      durationMinutes: selectedDurationMinutes,
      status: 'PENDING',
      sessionNumber: sessionNumber0 + index + 1,
      isFreeSession: false,
      subject: normalizedPkgSubject as any,
      meetingLink: buildBookingRoomUrl(`pkg-${pkg.id}-${index}`),
      notes,
    },
  });
});

const packageBookings = await Promise.all(bookingCreations);

// Update meeting links to use actual booking IDs
await Promise.all(packageBookings.map(b =>
  prisma.booking.update({
    where: { id: b.id },
    data: { meetingLink: buildBookingRoomUrl(b.id) },
  })
));

// Notify tutor about the package
await notifyTutorAboutBookingRequest({
  tutorUserId: tutorProfile.user.id,
  tutorEmail: tutorProfile.user.email,
  tutorName: tutorProfile.user.name,
  studentName: session.user.name || 'A student',
  subject,
  scheduledAt: packageBookings[0].scheduledAt,
  durationMinutes: selectedDurationMinutes,
});
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/bookings/route.ts
git commit -m "feat(api): create individual Booking records for package sessions with scheduled slots"
```

---

## Task 4 — Bug 2: Tutor sessions API — remove limit, show all statuses

**Files:**
- Modify: `src/app/api/tutor/bookings/route.ts`

The root cause: `take: 10` limit + status filter `['CONFIRMED', 'PENDING']` — after Bug 1 fix packages create bookings, but the limit cuts results. Also need to show all relevant statuses.

- [ ] **Step 1: Update the query**

Replace the `prisma.booking.findMany` call in `src/app/api/tutor/bookings/route.ts` with:

```typescript
const bookings = await prisma.booking.findMany({
  where: {
    tutorProfileId: tutorProfile.id,
    // Show all non-cancelled statuses from the last 30 days onwards
    status: {
      in: ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'],
    },
    scheduledAt: {
      gte: thirtyDaysAgo,
    },
  },
  include: {
    student: {
      select: {
        name: true,
        email: true,
        avatarUrl: true,
      },
    },
  },
  orderBy: {
    scheduledAt: 'asc',
  },
  // Remove take: 10 limit
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tutor/bookings/route.ts
git commit -m "fix(tutor): remove session limit and include all active statuses in tutor bookings API"
```

---

## Task 5 — Bug 3: Availability — compute actual days count instead of boolean

**Files:**
- Modify: `src/lib/admin-dashboard.ts`
- Modify: `src/components/tutors/HorizontalTutorCard.tsx`

Root cause: `getPublicTutorCards` returns `availableWithin7Days: boolean` and the card hardcodes "7d".

- [ ] **Step 1: Add `countAvailableDaysWithinDays` function in availability.ts**

In `src/lib/availability.ts`, after the `hasAvailabilityWithinDays` function signature, check what parameters it takes and add a new function:

First, read lines around `hasAvailabilityWithinDays`:

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

    if (windows.length > 0) {
      // Check that at least one slot fits
      for (const w of windows) {
        const startMins = timeToMinutes(w.startTime);
        const endMins = timeToMinutes(w.endTime);
        if (endMins - startMins >= durationMinutes) {
          distinctDays.add(normalizeDateKey(checkDate));
          break;
        }
      }
    }
  }

  return distinctDays.size;
}
```

Note: `getOpenTimeWindowsForDate` must be imported/accessible in this file. Check if it's already exported from the file or needs to be used differently. If the function is not exported, use the logic pattern already in the file to compute available days.

- [ ] **Step 2: Update `getPublicTutorCards` to return `availableDaysCount`**

In `src/lib/admin-dashboard.ts`, import the new function:
```typescript
import { hasAvailabilityWithinDays, sortAvailabilitySlots, countAvailableDaysWithinNextDays } from '@/lib/availability';
```

Replace the `hasNextWeekAvailability` computation:
```typescript
const hasNextWeekAvailability = hasAvailabilityWithinDays({
  availability: profile.availability,
  overrides: profile.overrides,
  bookings: profile.bookings,
  durationMinutes: primaryPricingOption?.durationMinutes || 60,
  timeBucket:
    filters.availability && filters.availability !== 'NEXT_7_DAYS'
      ? (filters.availability as any)
      : null,
});
const availableDaysCount = countAvailableDaysWithinNextDays({
  availability: profile.availability,
  overrides: profile.overrides,
  bookings: profile.bookings,
  durationMinutes: primaryPricingOption?.durationMinutes || 60,
});
```

In the returned object, change:
```typescript
availableWithin7Days: profile.hasNextWeekAvailability,
```
To:
```typescript
availableWithin7Days: profile.hasNextWeekAvailability,
availableDaysCount: profile.availableDaysCount,
```

And update the hydrated profile object to include `availableDaysCount`:
```typescript
hasNextWeekAvailability,
availableDaysCount,
```

Then in the final return map object add:
```typescript
availableDaysCount: profile.availableDaysCount,
```

- [ ] **Step 3: Fix card display in HorizontalTutorCard.tsx**

Change lines 251-253:
```tsx
<div className="text-sm font-black text-navy-600 dark:text-cream-200 mb-1">
  {tutor.availableWithin7Days ? '7d' : 'N/A'}
</div>
```
To:
```tsx
<div className="text-sm font-black text-navy-600 dark:text-cream-200 mb-1">
  {tutor.availableDaysCount > 0 ? `${tutor.availableDaysCount}d` : 'N/A'}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/availability.ts src/lib/admin-dashboard.ts src/components/tutors/HorizontalTutorCard.tsx
git commit -m "fix(tutors): show actual available days count instead of hardcoded 7d"
```

---

## Task 6 — Bug 4: Sort "Most Experienced" — use actual booking count

**Files:**
- Modify: `src/lib/admin-dashboard.ts`

Root cause: `case 'experience'` sorts by `yearsOfExperience` (self-declared), not actual booking/teaching history.

- [ ] **Step 1: Update the sort logic in `getPublicTutorCards`**

In `admin-dashboard.ts`, inside `sortedProfiles` sort, change:
```typescript
case 'experience':
  return right.yearsOfExperience - left.yearsOfExperience;
```
To:
```typescript
case 'experience': {
  // Primary: actual booking count; secondary: hours taught
  const bookingDiff = (right.actualBookingCount || 0) - (left.actualBookingCount || 0);
  if (bookingDiff !== 0) return bookingDiff;
  return (right.actualHoursTaught || 0) - (left.actualHoursTaught || 0);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin-dashboard.ts
git commit -m "fix(tutors): sort 'Most Experienced' by actual booking count and hours taught"
```

---

## Task 7 — Bug 5: Tutor Students page — fix Total Sessions and Revenue

**Files:**
- Modify: `src/app/dashboard/tutor/students/page.tsx`

Root cause: counts ALL booking statuses including CANCELLED; revenue uses raw `payment.amount` without checking payment status.

- [ ] **Step 1: Fix the booking query and aggregation**

Replace the `studentBookings` query with:

```typescript
const studentBookings = await prisma.booking.findMany({
  where: {
    tutorProfileId: tutorProfile.id,
    status: { in: ['COMPLETED', 'CONFIRMED'] },
  },
  include: {
    student: {
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    },
    payment: true,
  },
  orderBy: {
    scheduledAt: 'desc',
  },
});
```

Replace the revenue calculation inside the forEach:
```typescript
const bookingRevenue = (booking.payment?.status === 'CAPTURED' && !booking.isFreeSession)
  ? (booking.payment.tutorPayout > 0 ? booking.payment.tutorPayout : booking.payment.amount)
  : 0;
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/tutor/students/page.tsx
git commit -m "fix(tutor): count only COMPLETED/CONFIRMED sessions and CAPTURED payments for student stats"
```

---

## Task 8 — Bug 6: Remove Hourly Rate from Tutor Settings

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Remove the Hourly Rate input from the profile form**

Find and remove lines 503-504 (the Hourly Rate label and input):
```tsx
<label className="text-sm font-bold text-navy-600 dark:text-cream-200">Hourly Rate ($)</label>
<input type="number" value={profileData.hourlyRate} onChange={e => setProfileData({ ...profileData, hourlyRate: Number(e.target.value) })} ...
```
Delete these two elements (the wrapping `<div>` container for this field too).

Also remove `hourlyRate` from the `profileData` form submission object (line ~374 where it says `hourlyRate: Number(profileData.hourlyRate)`). Remove that field from the form submit payload.

Keep `hourlyRate` in the `profileData` state initialization (line ~169, `hourlyRate: 0`) and when loading from API (line ~211) — it's needed as a fallback for price display elsewhere.

- [ ] **Step 2: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "fix(settings): remove Hourly Rate field from tutor profile settings UI"
```

---

## Task 9 — Bug 7: Admin Analytics — Top Earning Tutors include package revenue

**Files:**
- Modify: `src/lib/admin-dashboard.ts`

Root cause: `hoursTaughtPerTutor` only counts revenue from individual `Booking` records. Package payments (in `BookingPackage`) are not included because packages don't join to tutorProfile directly through bookings.

After Bug 1 fix, packages create individual bookings, so package sessions will appear in `bookings`. But for existing packages (created before the fix), we still need to account for package-level payments.

- [ ] **Step 1: Build a `packageRevenueByTutor` map in `buildAdminDashboardData`**

After the `capturedPackages` definition (line ~296), add:

```typescript
// Map tutorProfileId → package revenue for all captured packages
const packageRevenueByTutor = new Map<string, number>();
for (const pkg of capturedPackages) {
  const rev = Math.max((pkg.payment?.amount || 0) - (pkg.payment?.refundedAmount || 0), 0);
  packageRevenueByTutor.set(pkg.tutorProfileId, (packageRevenueByTutor.get(pkg.tutorProfileId) || 0) + rev);
}
```

Note: `BookingPackage` has `tutorProfileId` directly.

- [ ] **Step 2: Update `hoursTaughtPerTutor` calculation to include package revenue**

In `hoursTaughtPerTutor` map, change `tutorGross` to:
```typescript
const tutorGross = sum(
  tutorCompleted
    .filter((booking: any) => booking.payment && ['CAPTURED', 'REFUNDED'].includes(booking.payment.status))
    .map((booking: any) => (booking.payment?.amount || 0) - (booking.payment?.refundedAmount || 0))
) + (packageRevenueByTutor.get(profile.id) || 0);
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin-dashboard.ts
git commit -m "fix(admin): include package revenue in Top Earning Tutors analytics"
```

---

## Task 10 — Bug 8+9: Penalty Notification System — Backend

**Files:**
- Create: `src/app/api/user/penalties/route.ts`
- Create: `src/app/api/user/appeals/route.ts`
- Create: `src/app/api/admin/appeals/route.ts`
- Create: `src/app/api/admin/appeals/[id]/route.ts`
- Modify: `src/app/api/admin/users/[id]/route.ts`
- Modify: `src/app/api/admin/reports/[id]/route.ts`

- [ ] **Step 1: Create `GET /api/user/penalties`**

Create `src/app/api/user/penalties/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    // Auto-expire penalties that have passed their expiresAt
    await prisma.userPenalty.updateMany({
      where: {
        userId: session.user.id,
        status: 'ACTIVE',
        expiresAt: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });

    const penalties = await prisma.userPenalty.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['ACTIVE'] },
      },
      include: {
        appeals: {
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: penalties });
  } catch (error) {
    console.error('Get penalties error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `POST /api/user/appeals`**

Create `src/app/api/user/appeals/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const appealSchema = z.object({
  penaltyId: z.string(),
  reason: z.string().min(10).max(2000),
  evidence: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { penaltyId, reason, evidence } = appealSchema.parse(body);

    const penalty = await prisma.userPenalty.findFirst({
      where: { id: penaltyId, userId: session.user.id, status: 'ACTIVE' },
    });

    if (!penalty) {
      return NextResponse.json({ error: 'Penalty not found or not active' }, { status: 404 });
    }

    const existingAppeal = await prisma.appeal.findFirst({
      where: { penaltyId, userId: session.user.id, status: { in: ['PENDING', 'REVIEWED'] } },
    });

    if (existingAppeal) {
      return NextResponse.json({ error: 'You already have a pending appeal for this penalty' }, { status: 400 });
    }

    const appeal = await prisma.appeal.create({
      data: {
        penaltyId,
        userId: session.user.id,
        reason,
        evidence: evidence || null,
        status: 'PENDING',
      },
    });

    await prisma.userPenalty.update({
      where: { id: penaltyId },
      data: { status: 'APPEALED' },
    });

    return NextResponse.json({ success: true, data: appeal });
  } catch (error: any) {
    console.error('Create appeal error:', error);
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create `GET /api/admin/appeals`**

Create `src/app/api/admin/appeals/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession();

    const appeals = await prisma.appeal.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        penalty: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: appeals });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get appeals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create `PATCH /api/admin/appeals/[id]`**

Create `src/app/api/admin/appeals/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();
    const { decision, adminResponse } = await req.json();

    if (!['ACCEPTED', 'REJECTED'].includes(decision)) {
      return NextResponse.json({ error: 'Decision must be ACCEPTED or REJECTED' }, { status: 400 });
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id: params.id },
      include: { penalty: true },
    });

    if (!appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    await prisma.appeal.update({
      where: { id: params.id },
      data: {
        status: decision,
        adminResponse: adminResponse || null,
        reviewedAt: new Date(),
      },
    });

    if (decision === 'ACCEPTED') {
      // Revoke the underlying penalty
      await prisma.userPenalty.update({
        where: { id: appeal.penaltyId },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });

      // If it was a suspension or ban, lift it from user record
      const penalty = appeal.penalty;
      if (penalty.type === 'SUSPEND_7D' || penalty.type === 'SUSPEND_30D') {
        await prisma.user.update({
          where: { id: penalty.userId },
          data: { suspendedUntil: null, suspensionReason: null },
        });
      } else if (penalty.type === 'PERMANENT_BAN') {
        await prisma.user.update({
          where: { id: penalty.userId },
          data: { isBanned: false, banReason: null },
        });
      }
    } else {
      // Rejected → set penalty back to ACTIVE
      await prisma.userPenalty.update({
        where: { id: appeal.penaltyId },
        data: { status: 'ACTIVE' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Process appeal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Add `REVOKE_SUSPENSION` to `/api/admin/users/[id]`**

In `src/app/api/admin/users/[id]/route.ts`, inside the `switch (action)` block, add before `default:`:

```typescript
case 'REVOKE_SUSPENSION': {
  await prisma.user.update({
    where: { id: params.id },
    data: { suspendedUntil: null, suspensionReason: null },
  });
  await recordAdminAction({
    adminId: session.user.id,
    targetUserId: params.id,
    actionType: 'REVOKE_SUSPENSION',
    reason: reason || 'Suspension revoked by admin',
  });
  const updatedUser = await prisma.user.findUnique({ where: { id: params.id } });
  return NextResponse.json({ data: updatedUser });
}
case 'REVOKE_BAN': {
  if (!reason) {
    return NextResponse.json({ error: 'Reason is required for revoking a ban' }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: params.id },
    data: { isBanned: false, banReason: null },
  });
  await recordAdminAction({
    adminId: session.user.id,
    targetUserId: params.id,
    actionType: 'REVOKE_BAN',
    reason,
  });
  const updatedUser = await prisma.user.findUnique({ where: { id: params.id } });
  return NextResponse.json({ data: updatedUser });
}
```

Also add `REVOKE_SUSPENSION` action to `/api/admin/reports/[id]/route.ts` — after `case 'RESOLVE_REPORT'` add:

```typescript
case 'REVOKE_SUSPENSION': {
  const userId = targetUserId || report.reportedUserId;
  await prisma.user.update({
    where: { id: userId },
    data: { suspendedUntil: null, suspensionReason: null },
  });
  await prisma.userReport.update({
    where: { id: report.id },
    data: {
      status: 'RESOLVED',
      adminNote: note ?? 'Suspension revoked',
      resolvedByAdminId: session.user.id,
      resolvedAt: new Date(),
    },
  });
  break;
}
```

- [ ] **Step 6: Update `SUSPEND_ACCOUNT` and `PERMANENT_BAN_ACCOUNT` to also create UserPenalty records**

In `/api/admin/reports/[id]/route.ts`, after the `suspendUser(...)` call in `SUSPEND_ACCOUNT`:
```typescript
const durationDays = (duration === '7d') ? 7 : (duration === '30d') ? 30 : (duration === '1d') ? 1 : 3;
await prisma.userPenalty.create({
  data: {
    userId: targetUserId || report.reportedUserId,
    adminId: session.user.id,
    type: durationDays <= 7 ? 'SUSPEND_7D' : 'SUSPEND_30D',
    reason: note || 'Suspended after report investigation.',
    status: 'ACTIVE',
    expiresAt: until,
  },
});
```

After the `banUser(...)` call in `PERMANENT_BAN_ACCOUNT`:
```typescript
await prisma.userPenalty.create({
  data: {
    userId: targetUserId || report.reportedUserId,
    adminId: session.user.id,
    type: 'PERMANENT_BAN',
    reason: note,
    status: 'ACTIVE',
    expiresAt: null,
  },
});
```

Also do the same for `WARN_USER`:
```typescript
await prisma.userPenalty.create({
  data: {
    userId,
    adminId: session.user.id,
    type: 'WARNING',
    reason: note || 'Warning issued after report investigation.',
    status: 'ACTIVE',
    expiresAt: null,
  },
});
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/user/penalties/route.ts src/app/api/user/appeals/route.ts src/app/api/admin/appeals/ src/app/api/admin/users/[id]/route.ts src/app/api/admin/reports/[id]/route.ts
git commit -m "feat(penalties): add penalty/appeal API routes and revoke suspension actions"
```

---

## Task 11 — Bug 8 (Frontend): PenaltyNotificationModal

**Files:**
- Create: `src/components/providers/PenaltyNotificationModal.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create PenaltyNotificationModal component**

Create `src/components/providers/PenaltyNotificationModal.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const PENALTY_TYPE_LABELS: Record<string, string> = {
  WARNING: 'Account Warning',
  SUSPEND_7D: 'Account Suspended (7 Days)',
  SUSPEND_30D: 'Account Suspended (30 Days)',
  PERMANENT_BAN: 'Account Permanently Banned',
};

export function PenaltyNotificationModal() {
  const { data: session, status } = useSession();
  const [penalties, setPenalties] = useState<any[]>([]);
  const [activePenalty, setActivePenalty] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealEvidence, setAppealEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    const sessionKey = `penalty-seen-${session.user.id}`;
    const alreadySeen = sessionStorage.getItem(sessionKey);

    async function fetchPenalties() {
      try {
        const res = await fetch('/api/user/penalties');
        if (!res.ok) return;
        const json = await res.json();
        const active = (json.data || []);
        setPenalties(active);
        if (active.length > 0) {
          const ban = active.find((p: any) => p.type === 'PERMANENT_BAN');
          const penalty = ban || active[0];
          // Always show bans; show others only once per session
          if (penalty.type === 'PERMANENT_BAN' || !alreadySeen) {
            setActivePenalty(penalty);
          }
        }
      } catch {
        // Silently fail — don't block login
      }
    }

    void fetchPenalties();
  }, [status, session?.user]);

  function handleDismiss() {
    if (!activePenalty || activePenalty.type === 'PERMANENT_BAN') return;
    const sessionKey = `penalty-seen-${session?.user?.id}`;
    sessionStorage.setItem(sessionKey, '1');
    setDismissed(true);
    setActivePenalty(null);
  }

  async function handleSubmitAppeal() {
    if (!activePenalty || !appealReason.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/user/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          penaltyId: activePenalty.id,
          reason: appealReason,
          evidence: appealEvidence || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit appeal');
      setAppealSubmitted(true);
      toast.success('Appeal submitted successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Could not submit appeal');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!activePenalty || dismissed) return null;

  const isBan = activePenalty.type === 'PERMANENT_BAN';
  const isSuspend = activePenalty.type === 'SUSPEND_7D' || activePenalty.type === 'SUSPEND_30D';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-navy-900/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg rounded-[32px] bg-white dark:bg-navy-600 shadow-glass p-8 space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isBan ? 'bg-red-100' : isSuspend ? 'bg-orange-100' : 'bg-yellow-100'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isBan ? 'text-red-600' : isSuspend ? 'text-orange-600' : 'text-yellow-600'}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-navy-600 dark:text-cream-200">
              {PENALTY_TYPE_LABELS[activePenalty.type] || 'Account Action'}
            </h2>
            <p className="text-xs text-navy-400 dark:text-cream-400/60">
              Applied on {new Date(activePenalty.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-navy-50/80 dark:bg-navy-700/40 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-navy-300 mb-2">Reason</p>
          <p className="text-sm text-navy-600 dark:text-cream-200">{activePenalty.reason}</p>
          {isSuspend && activePenalty.expiresAt && (
            <p className="mt-3 text-xs font-bold text-orange-600">
              Suspension ends: {new Date(activePenalty.expiresAt).toLocaleDateString()}
            </p>
          )}
          {isBan && (
            <p className="mt-3 text-xs font-bold text-red-600">
              This ban is permanent. You may appeal below.
            </p>
          )}
        </div>

        {appealSubmitted ? (
          <div className="rounded-2xl bg-sage-50 dark:bg-sage-500/10 p-4 text-center">
            <p className="text-sm font-bold text-sage-700 dark:text-sage-300">
              Your appeal has been submitted. We will review within 48 hours.
            </p>
          </div>
        ) : showAppealForm ? (
          <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-navy-300">Submit an Appeal</p>
            <textarea
              value={appealReason}
              onChange={e => setAppealReason(e.target.value)}
              placeholder="Explain why this decision should be reconsidered..."
              className="w-full bg-white dark:bg-navy-700 border-2 border-navy-100 dark:border-navy-500/20 rounded-2xl p-4 text-sm text-navy-600 dark:text-cream-200 focus:border-gold-400 outline-none resize-none h-28"
            />
            <input
              type="text"
              value={appealEvidence}
              onChange={e => setAppealEvidence(e.target.value)}
              placeholder="Evidence link or description (optional)"
              className="w-full bg-white dark:bg-navy-700 border-2 border-navy-100 dark:border-navy-500/20 rounded-2xl px-4 py-3 text-sm text-navy-600 dark:text-cream-200 focus:border-gold-400 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAppealForm(false)}
                className="flex-1 border border-navy-200 dark:border-navy-500/20 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-navy-600 dark:text-cream-200 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmitAppeal()}
                disabled={isSubmitting || appealReason.trim().length < 10}
                className="flex-1 bg-gold-400 hover:bg-gold-500 disabled:opacity-50 text-navy-600 py-3 rounded-2xl text-xs font-black uppercase tracking-widest"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {!isBan && (
              <button
                onClick={handleDismiss}
                className="w-full bg-navy-600 hover:bg-navy-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                I Understand
              </button>
            )}
            <button
              onClick={() => setShowAppealForm(true)}
              className="w-full border-2 border-navy-200 dark:border-navy-500/20 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-navy-600 dark:text-cream-200 hover:border-gold-400"
            >
              Appeal This Decision
            </button>
            {isBan && (
              <button
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="w-full border border-red-200 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Mount PenaltyNotificationModal in root layout**

In `src/app/layout.tsx`, import and add the modal inside the `<Providers>` wrapper (or at the end of the body content):

```tsx
import { PenaltyNotificationModal } from '@/components/providers/PenaltyNotificationModal';
```

Inside the render tree (after the main content but before `</Providers>`):
```tsx
<PenaltyNotificationModal />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/providers/PenaltyNotificationModal.tsx src/app/layout.tsx
git commit -m "feat(penalties): add PenaltyNotificationModal shown on login for suspended/banned users"
```

---

## Task 12 — Bug 9: Admin Reports — Revoke Suspension button

**Files:**
- Modify: `src/components/admin/Reports.tsx`

- [ ] **Step 1: Add Revoke Suspension button to resolution tools**

In `src/components/admin/Reports.tsx`, in the resolution actions grid (after the Suspend/Ban grid), add:

```tsx
{(selectedReport.reportedParty?.suspendedUntil || selectedReport.reportedParty?.isBanned) && (
  <div className="grid grid-cols-1 gap-2">
    <button
      onClick={() => void runAction('REVOKE_SUSPENSION')}
      className="rounded-xl bg-green-500 py-3 text-xs font-black text-white hover:bg-green-600 transition-colors"
    >
      {selectedReport.reportedParty?.isBanned ? 'Lift Ban' : 'Revoke Suspension'}
    </button>
  </div>
)}
```

Note: The `reportedParty` object needs `suspendedUntil` and `isBanned` fields. Check what data `reportsQueue` currently returns for `reportedParty` in `admin-dashboard.ts`. If those fields aren't there, add them to the `reportsQueue` mapping in `buildAdminDashboardData`.

In `admin-dashboard.ts`, in the `reportsQueue` map where `reportedParty` is built (around line 630+), ensure:
```typescript
reportedParty: {
  id: report.reportedUser.id,
  name: report.reportedUser.name,
  email: report.reportedUser.email,
  suspendedUntil: report.reportedUser.suspendedUntil,
  isBanned: report.reportedUser.isBanned,
},
```

- [ ] **Step 2: Add confirmation dialogs for destructive actions**

Wrap each action button's `onClick` with a confirmation. For example, for the Suspend button:

```tsx
<button
  onClick={() => {
    if (!confirm(`Are you sure you want to suspend this user? Duration: ${form.duration}.\nReason: ${form.note || '(none provided)'}`)) return;
    void runAction('SUSPEND_ACCOUNT');
  }}
  className="rounded-xl bg-red-500 py-3 text-xs font-black text-white hover:bg-red-600 transition-colors"
>
  Suspend
</button>
```

Do the same for Ban, Warn User buttons.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/Reports.tsx src/lib/admin-dashboard.ts
git commit -m "feat(admin): add Revoke Suspension button and confirmation dialogs to report investigation"
```

---

## Task 13 — Bug 10: Dark/Light Mode — Fix CSS variables and component audit

**Files:**
- Modify: `src/app/globals.css`
- Audit many component files

- [ ] **Step 1: Audit and fix `globals.css` — ensure all critical variables exist in both `:root` and `.dark`**

Read `src/app/globals.css` in full. Verify these variables exist in both `:root` and `.dark`:
- `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-input`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--border-default`, `--border-hover`
- `--accent-primary` (gold)

Ensure the `.dark` section has all the same variables but with dark-mode-appropriate values. If any are missing from `.dark`, add them.

- [ ] **Step 2: Fix select/dropdown elements for dark mode**

In `globals.css`, add:
```css
.dark select,
.dark select option {
  background-color: var(--bg-card, theme('colors.navy.700'));
  color: var(--text-primary, theme('colors.cream.200'));
}
```

- [ ] **Step 3: Fix modal overlays (backdrop) for dark mode**

Ensure modals use `dark:bg-navy-600` for their inner container where they're using `bg-white`. Audit: `BookingModal.tsx`, `PenaltyNotificationModal.tsx`, any other modal components.

- [ ] **Step 4: Fix empty state and loading skeleton colors**

In all dashboard pages, loading spinners use `border-gold-400` (fine), but loading text and empty state backgrounds need dark mode variants. Search for `bg-navy-50/40` and `text-navy-300` in component files and ensure they have proper `dark:` variants.

- [ ] **Step 5: Fix table header and row backgrounds**

In `Analytics.tsx` and similar, table headers use `border-navy-100` — ensure `dark:border-navy-500/20` is present.

- [ ] **Step 6: Typography improvements**

For `src/app/globals.css`, ensure body font size is at least 14px:
```css
body {
  font-size: 15px;
  line-height: 1.6;
}
```

- [ ] **Step 7: Fix button hover/active states globally**

In `globals.css`, ensure `.btn-primary` and `.btn-secondary` have `cursor: pointer` and visible `disabled:` state:
```css
.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/globals.css src/components/
git commit -m "fix(ui): comprehensive dark/light mode fixes and typography improvements"
```

---

## Task 14 — Final verification

- [ ] **Step 1: TypeScript check**

```bash
cd C:/Users/Admin/Desktop/WEB
npx tsc --noEmit 2>&1 | head -50
```

Fix any TypeScript errors before proceeding.

- [ ] **Step 2: Prisma validation**

```bash
npx prisma validate
```

Expected: `The schema at ... is valid`

- [ ] **Step 3: Verify booking flow end-to-end**

Test manually in browser:
1. Student goes to Find Tutors → tutor card shows correct `Xd availability` (not hardcoded 7d)
2. Student clicks "Book lesson options" → BookingModal opens
3. Student selects "Lesson Package" → selects 5-session bundle → SCHEDULE step appears
4. Student selects 5 time slots → "5 / 5 chosen" → "Next: Review & Confirm" enables
5. Student confirms → Stripe checkout (or mock payment for dev)
6. Tutor logs in → Sessions tab shows all 5 bookings from the package
7. Admin logs in → Analytics → Top Earning Tutors shows gross revenue

- [ ] **Step 4: Verify penalty flow**

1. Admin suspends a user via Reports → user gets penalty record created
2. User logs in → PenaltyNotificationModal appears with reason
3. User clicks "Appeal This Decision" → submits appeal form
4. Admin sees appeal in admin panel → accepts/rejects
5. Admin clicks "Revoke Suspension" → user can log in normally

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete bug fix round 2 - booking packages, session visibility, analytics, penalty system, UI improvements"
```

---

## Quick Bug Summary

| Bug | Root Cause | Files Changed |
|-----|-----------|---------------|
| 1 | Package step jumps to CONFIRM, no slot selection | BookingModal.tsx, api/bookings/route.ts |
| 2 | take:10 limit + packages don't create Booking records | api/tutor/bookings/route.ts + Bug 1 fix |
| 3 | HorizontalTutorCard hardcodes "7d"; API returns boolean | HorizontalTutorCard.tsx, admin-dashboard.ts, availability.ts |
| 4 | `experience` sort uses self-reported `yearsOfExperience` | admin-dashboard.ts |
| 5 | All statuses counted; all payment amounts used | students/page.tsx |
| 6 | Hourly Rate input in profile settings UI | settings/page.tsx |
| 7 | Package revenue not in analytics calculation | admin-dashboard.ts |
| 8 | No penalty notification system exists | New files + layout.tsx |
| 9 | No REVOKE action in admin APIs | admin/reports/[id], admin/users/[id] |
| 10 | Inconsistent dark mode CSS variables | globals.css + components |
