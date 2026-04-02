# Booking System Overhaul — Fixed 30-Minute Slot Architecture

**Date:** 2026-03-29
**Status:** Approved
**Scope:** Student booking flow, tutor calendar, tutor pricing settings, tutor profile availability tab

---

## 1. Context and Goals

The tutor availability system was already migrated to fixed 30-minute slots. This spec covers aligning everything else — student-facing booking flows, the tutor calendar dashboard, the pricing settings UI, and the public availability view — to the same model.

**Core invariants (already enforced on tutor side, now applied everywhere):**
- Minimum time unit = 30 minutes
- All slot starts are at :00 or :30 only
- Duration options: 30 min (1 slot), 60 min (2 consecutive slots), 90 min (3 consecutive slots)
- A slot occupied by a PENDING or CONFIRMED booking is locked for all other students
- CANCELLED or COMPLETED bookings release their slots

---

## 2. Architecture Approach

**Chosen: Shared slot logic layer, extend existing code.**

`src/lib/availability.ts` already has `getOpenTimeWindowsForDate()` which computes free time windows for a given date. It returns continuous windows (e.g., "09:00–17:00 minus booked ranges"). What it doesn't do yet is expand those windows into individual :00/:30-aligned slot starts.

A new exported function `expandWindowsToSlots()` is added to that file. All new APIs and the updated BookingModal call this single function. No logic is duplicated.

The rest of the changes are:
- 3 new API endpoints that call the extended lib
- BookingModal updated to use the slot picker API instead of computing locally
- Calendar page fixed (1-line bug) + rewritten as a full weekly/monthly/daily view
- PricingManager updated for 30/60/90 durations + per-tutor package discounts
- Tutor profile availability tab replaced with a read-only weekly grid
- Schema: 3 new nullable fields on `TutorProfile`

---

## 3. Schema Changes

**Migration: add to `TutorProfile`**

```prisma
discount5      Int?     // % off 5-lesson package, null = 0%
discount10     Int?     // % off 10-lesson package, null = 0%
discount20     Int?     // % off 20-lesson package, null = 0%
offerFreeTrial Boolean  @default(false)
```

**No other schema changes.** Rationale:
- `TutorPricing` already covers per-duration prices with `durationMinutes`, `price`, `currency`, `isEnabled`
- `BookingPackage.packageDiscount` already stores the applied rate at booking time
- `AvailabilityOverride` with `isAvailable: false` already covers blocked dates (no `BlockedDate` table needed)
- `Booking.packageId` + `Booking.sessionNumber` already exist

After adding fields: `npx prisma migrate dev --name add_tutor_package_discounts` then `npx prisma generate`.

---

## 4. Shared Slot Logic Layer

**Add to `src/lib/availability.ts`:**

```typescript
export type SlotItem = {
  startTime: string;   // "09:00"
  endTime: string;     // "09:30" / "10:00" / "10:30" depending on duration
  status: 'available' | 'booked';
};

/**
 * Expand a list of free OpenTimeWindows into individual :00/:30-aligned slot starts.
 * A slot is included only if ALL required sub-slots fit within the same window.
 * durationMinutes must be 30, 60, or 90.
 */
export function expandWindowsToSlots(
  windows: OpenTimeWindow[],
  durationMinutes: number
): SlotItem[]
```

Logic:
1. For each `OpenTimeWindow { startTime, endTime }`:
   - Snap `start` up to the next :00 or :30 boundary (if not already)
   - Walk from `start` to `end - durationMinutes` in 30-min steps
   - Each step `t` produces a slot `{ startTime: t, endTime: t + durationMinutes, status: 'available' }`
2. Return sorted list

This function is pure (no DB access). All callers pass the already-computed windows.

**Also add `getSlotStatusForDate()`** — a convenience wrapper used by the new APIs:

```typescript
export function getSlotStatusForDate(input: {
  date: Date;
  durationMinutes: number;
  availability: AvailabilitySlotLike[];
  overrides?: AvailabilityOverrideLike[];
  bookings?: BookingLike[];
  now?: Date;  // for filtering past slots
}): SlotItem[]
```

This calls `getOpenTimeWindowsForDate()` then `expandWindowsToSlots()`, then marks past slots as non-returned (filtered out). The `status` on all returned items is always `'available'` — the "booked" status is reserved for the weekly availability view where we also need to show occupied slots separately.

---

## 5. New API Endpoints

### 5A. `GET /api/tutors/[tutorId]/available-slots`

**Query params:** `?date=2026-03-31&duration=60`

**Response:**
```json
{
  "date": "2026-03-31",
  "duration": 60,
  "slots": [
    { "startTime": "09:00", "endTime": "10:00", "status": "available" },
    { "startTime": "10:00", "endTime": "11:00", "status": "available" }
  ]
}
```

**Backend logic:**
1. Fetch tutor's `Availability` records + `AvailabilityOverride` records
2. Fetch bookings for the tutor on that date with status PENDING/CONFIRMED
3. Call `getSlotStatusForDate({ date, durationMinutes: duration, availability, overrides, bookings, now: new Date() })`
4. Return slots array (only available ones — this endpoint drives the interactive slot picker)

**Used by:** BookingModal slot picker step.

---

### 5B. `GET /api/tutors/[tutorId]/weekly-availability`

**Query params:** `?weekStart=2026-03-31`

**Response:**
```json
{
  "weekStart": "2026-03-31",
  "weekEnd": "2026-04-06",
  "timezone": "Asia/Ho_Chi_Minh",
  "slots": [
    { "day": "Monday", "date": "2026-03-31", "startTime": "09:00", "endTime": "09:30", "status": "available" },
    { "day": "Monday", "date": "2026-03-31", "startTime": "09:30", "endTime": "10:00", "status": "booked" }
  ]
}
```

**Backend logic:**
1. Parse `weekStart` → 7 dates (weekStart … weekStart + 6 days)
2. Fetch tutor `Availability` + `AvailabilityOverride` once
3. Fetch all bookings for tutor in the 7-day range (PENDING/CONFIRMED)
4. For each date:
   - Compute `available slots` = `getSlotStatusForDate(date, 30min, ...)` (30-min granularity for the grid)
   - Compute `booked ranges` from bookings: expand each booking into its occupied 30-min slots
   - Merge: a 30-min slot is `'booked'` if any existing PENDING/CONFIRMED booking overlaps it (i.e., `booking.scheduledAt <= slotStart AND booking.scheduledAt + booking.durationMinutes > slotStart`); otherwise `'available'`
5. Return flat list of all slots across all 7 days

**Used by:** Tutor profile Availability tab (read-only grid for students).

---

### 5C. `GET /api/tutor/calendar` (new, replaces fetching from `/api/tutor/bookings` in calendar)

**Query params:** `?start=2026-03-31&end=2026-04-06`

**Response:**
```json
{
  "availability": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00" }
  ],
  "bookings": [
    {
      "id": "...",
      "scheduledAt": "2026-03-31T09:00:00Z",
      "durationMinutes": 60,
      "status": "CONFIRMED",
      "student": { "name": "John", "avatarUrl": "..." },
      "subject": "CFA_LEVEL_1",
      "meetingLink": "https://..."
    }
  ],
  "overrides": [
    { "date": "2026-04-01", "isAvailable": false, "reason": "Personal day" }
  ],
  "timezone": "Asia/Ho_Chi_Minh"
}
```

**Used by:** Tutor calendar dashboard.

---

## 6. Component Changes

### 6A. `src/lib/availability.ts`
- Add `expandWindowsToSlots(windows, durationMinutes): SlotItem[]`
- Add `getSlotStatusForDate(input): SlotItem[]` (convenience wrapper)
- No existing functions are changed

### 6B. `src/app/api/tutors/[tutorId]/available-slots/route.ts` *(new file)*
- `GET` handler — calls availability lib, returns slot list

### 6C. `src/app/api/tutors/[tutorId]/weekly-availability/route.ts` *(new file)*
- `GET` handler — returns 7-day slot grid with available/booked status

### 6D. `src/app/api/tutor/calendar/route.ts` *(new file)*
- `GET` handler — returns availability + bookings + overrides for a date range

### 6E. `src/components/student/BookingModal.tsx`
**What changes:**
1. **Duration selection** — keep existing 3-option UI (30M / 60M / 90M)
2. **Schedule step** — replace the week-view slot computation (currently done locally with `getOpenTimeWindowsForDate`) with a call to `GET /api/tutors/[tutorId]/available-slots?date=X&duration=Y`. The date picker only enables dates that have ≥1 available slot (checked by calling the endpoint per candidate date, or via a separate "available dates" check)
3. **Package multi-session scheduling** — when type=PACKAGE, the schedule/time steps repeat for each session. A `selectedSessions` array accumulates chosen `{scheduledAt}` entries. Slots already chosen in earlier sessions are marked "Selected for Lesson N" and disabled in subsequent sessions. Progress indicator "N/total scheduled" shown.
4. **PACKAGES constant** — replace hardcoded discounts with values from `tutor.discount5 / discount10 / discount20` (passed in as props), falling back to 0 if null. The `BookingModalProps.tutor` interface gains: `discount5?: number | null; discount10?: number | null; discount20?: number | null; offerFreeTrial?: boolean`. The tutor data fetched at `GET /api/tutors/[id]` must include these fields from TutorProfile.
5. **Booking summary** — for packages, list all sessions with their dates/times

**What does NOT change:** Step flow (TYPE → PACKAGE → SCHEDULE → TIME → CONFIRM), payment integration, subject selection, notes field, animations, styling patterns.

### 6F. `src/components/dashboard/tutor/PricingManager.tsx`
**What changes:**
1. Filter duration options to only show 30, 60, 90 minutes (remove 45 and 120 from UI display; keep them in DB if already set)
2. Add **Package Discounts** section below the pricing cards:
   - 5-lesson: `[__]% off` (input, optional)
   - 10-lesson: `[__]% off` (input, optional)
   - 20-lesson: `[__]% off` (input, optional)
3. Save discount values via `PATCH /api/tutor/pricing` (extend the existing endpoint to also accept and save `discount5`, `discount10`, `discount20` to TutorProfile)
4. Free Trial toggle: add `☑ Offer first lesson free (30 min)` — maps to existing `isFreeSession` logic in booking

**What does NOT change:** Currency selection, price inputs, conversion preview, styling.

### 6G. `src/app/tutors/[id]/page.tsx` — Availability tab
**What changes:**
Replace the current availability display with a read-only weekly grid component:
- Fetch `GET /api/tutors/[tutorId]/weekly-availability?weekStart=<Monday of current week>`
- Render a 7-column grid (Mon–Sun), rows = 30-min time slots that have at least one slot across the week
- Available slots: green-tinted cell
- Booked slots: red/grey cell with lock icon, no student name shown
- Week navigation: Previous Week / This Week / Next Week buttons
- Timezone label shown above grid

### 6H. `src/app/dashboard/tutor/calendar/page.tsx`
**Bug fix (line 21):** `setBookings(data.data ?? [])` instead of `setBookings(data)`.

**Full upgrade:**
1. Switch data source from `/api/tutor/bookings` to new `GET /api/tutor/calendar?start=...&end=...`
2. Add view mode toggle: **Week** (default) | **Month** | **Day**
3. **Week view:** 7-column grid, rows = 30-min slots. Each cell shows:
   - Available (has availability, no booking): light green
   - PENDING booking: yellow + student name + "Pending"
   - CONFIRMED booking: blue + student name + subject + time
   - COMPLETED booking: grey + "Completed"
   - CANCELLED: not shown
   - Override block: red full-height cell
4. **Month view:** Existing calendar grid kept; each day shows booking count badges by status color
5. **Day view:** Single day, full slot list
6. **Interaction:** Click on a booking → popover with details (student, subject, duration, status, meeting link) + action buttons (Confirm/Decline for PENDING, Cancel for CONFIRMED)
7. **Data fetching:** Fetch only the range currently visible (not all bookings)

---

## 7. Backend Booking Validation (already implemented, verify completeness)

The `POST /api/bookings` route already has (from recent commits):
- `:00/:30` boundary check
- Future time check
- Tutor availability check via `isSlotBookable()`
- Overlap check against existing PENDING/CONFIRMED bookings
- Prisma transaction for atomicity

**Additions needed for package booking:**
- Accept `packageScheduledSlots: string[]` (array of ISO datetimes, one per session)
- In the PACKAGE branch: validate each slot individually, then create all bookings in a single transaction
- If any slot fails validation → reject entire package with 409 and which slot failed
- Apply `tutor.discount5/10/20` when computing `packageDiscount` (fallback to hardcoded 5/10/15 if tutor hasn't set custom rates)

---

## 8. Implementation Order

| # | Task | Files | Priority |
|---|------|-------|----------|
| 1 | Schema migration | `prisma/schema.prisma` | Foundation |
| 2 | Extend availability lib | `src/lib/availability.ts` | Foundation |
| 3 | Fix calendar bug | `calendar/page.tsx` line 21 | Unblocks tutor |
| 4 | New `available-slots` API | `api/tutors/[id]/available-slots/route.ts` | Unblocks booking flow |
| 5 | New `weekly-availability` API | `api/tutors/[id]/weekly-availability/route.ts` | Unblocks availability tab |
| 6 | New `tutor/calendar` API | `api/tutor/calendar/route.ts` | Unblocks calendar |
| 7 | Update booking API (package slots) | `api/bookings/route.ts` | Core booking |
| 8 | Update PricingManager | `PricingManager.tsx` | Tutor pricing |
| 9 | Update booking API endpoint (discounts) | `api/tutor/pricing/route.ts` | Saves discounts |
| 10 | Update BookingModal (slot picker + package multi-schedule) | `BookingModal.tsx` | Student booking |
| 11 | Update tutor profile availability tab | `tutors/[id]/page.tsx` | Student-facing |
| 12 | Upgrade calendar page | `calendar/page.tsx` | Tutor calendar |

---

## 9. Test Checklist

1. Slot picker only shows :00 and :30 starts — no :15, :45, etc.
2. 60M booking: slot S only appears if S and S+30 are both free
3. 90M booking: slot S only appears if S, S+30, S+60 are all free
4. Student A books 9:00 (60M) → Student B cannot book 9:00, 9:30, or 8:30 (60M)
5. Student B can book 10:00 (30M) after the above
6. Package 3×60M: selecting lesson 1 at Mon 9:00 disables Mon 9:00 and 9:30 for lessons 2 and 3
7. Cancel booking → slots reappear as available
8. Tutor profile availability tab: green slots, grey/locked booked slots, week navigation works
9. Calendar page loads without `bookings.filter is not a function` error
10. Calendar shows PENDING (yellow), CONFIRMED (blue), COMPLETED (grey) bookings with correct student names
11. PricingManager saves 30/60/90 prices + package discounts correctly
12. Package price on student side reflects tutor's custom discounts (or 0% if not set)
