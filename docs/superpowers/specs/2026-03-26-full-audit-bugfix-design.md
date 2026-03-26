# Tutor Marketplace — Full Audit & Bug Fix Design

**Date:** 2026-03-26
**Scope:** Audit all bugs in the Tutor Marketplace (Next.js 14 + Prisma + PostgreSQL), fix confirmed issues, migrate dashboards to SWR.

---

## 1. Confirmed Already Fixed (no action)

These bugs from the original list are confirmed resolved in the current codebase:

| Bug | Fix location | Evidence |
|-----|-------------|----------|
| B1 — Subject enum `"CFA"` mismatch | `api/bookings/route.ts` | `normalizeSubject()` maps `CFA → CFA_LEVEL_1` |
| B4 — Booking count shows 0 | `lib/admin-dashboard.ts` | `actualBookingCount` via `prisma.booking.groupBy` |
| B5 — Student count wrong | `lib/admin-dashboard.ts` | `actualStudentCount` via distinct query |
| B8 — Admin reports `reportedParty` missing | `lib/admin-dashboard.ts:652` | `reportedParty` correctly mapped from `reportedUser` |
| B9 — Country filter duplicates | `lib/intl-data.ts:93` | Deduped via `seenNames` Set |
| B10 — Specialty filter in UI | `components/tutors/TutorFilterBar.tsx` | Dropdown not rendered |
| B12 polling — dashboards not refreshing | All 3 dashboard pages | `setInterval(30 000ms)` present in all |

---

## 2. Confirmed Bugs To Fix

### 2a. Backend (3 files)

#### Fix 1 — Admin certification checklist validation weak
**File:** `src/app/api/admin/certifications/[id]/route.ts:23`

**Problem:** The guard `checklistCompleted === false` does not catch when the client omits the field entirely (`undefined`). A crafted PATCH request without `checklistCompleted` bypasses the three-checkbox gate and can mark a cert VERIFIED without admin review.

**Fix:**
```ts
// Before
if (status === 'VERIFIED' && checklistCompleted === false) {

// After
if (status === 'VERIFIED' && !checklistCompleted) {
```

#### Fix 2 — Report route Zod enum missing variant
**File:** `src/app/api/bookings/[id]/report/route.ts:9`

**Problem:** `ReportType` in the schema has 5 values. The Zod enum in this route only allows 4 (missing `NO_SHOW_STUDENT`). Though the student UI never sends this value, the mismatch between schema and route creates a silent gap and means a 400 would be returned if it were ever submitted.

**Fix:** Add `'NO_SHOW_STUDENT'` to the Zod enum:
```ts
type: z.enum(['NO_SHOW_TUTOR', 'NO_SHOW_STUDENT', 'INAPPROPRIATE_CONDUCT', 'PAYMENT_DISPUTE', 'TECHNICAL_ISSUE']),
```

#### Fix 3 — `DISMISS_REPORT` action requires note but UI sends empty
**File:** `src/app/api/admin/reports/[id]/route.ts:179`

**Problem:** `DISMISS_REPORT` action returns 400 if `note` is empty (`if (!note) return 400`). The admin UI does not enforce a non-empty note before clicking Dismiss, so an admin dismissing without a note gets a silent failure.

**Fix:** Remove the hard 400 guard and fall back to a default reason. The entire `DISMISS_REPORT` case becomes:
```ts
case 'DISMISS_REPORT': {
  const dismissNote = note || 'Dismissed by admin';
  await prisma.userReport.update({
    where: { id: report.id },
    data: {
      status: 'DISMISSED',
      adminNote: dismissNote,
      resolvedByAdminId: session.user.id,
      resolvedAt: new Date(),
    },
  });
  await recordAdminAction({
    adminId: session.user.id,
    targetUserId: report.reportedUserId,
    actionType: 'DISMISS_REPORT',
    reason: dismissNote,
    metadata: { reportId: report.id },
  });
  break;
}

---

### 2b. Frontend — Static (3 areas)

#### Fix 4 — Language filter missing 12 languages
**File:** `src/components/tutors/TutorFilterBar.tsx:51`

The current `languageOptions` array has 22 entries. Missing from the requested comprehensive list:

```
'Danish', 'Norwegian', 'Finnish', 'Czech', 'Hungarian', 'Romanian',
'Greek', 'Hebrew', 'Bengali', 'Urdu', 'Tagalog', 'Swahili'
```

**Fix:** Append these 12 entries to `languageOptions`. Keep existing entries unchanged. Sort alphabetically after insertion to keep UX clean.

#### Fix 5 — Dead `specialty` filter field
**Files:** `src/app/tutors/page.tsx`, `src/app/api/tutors/route.ts`

`specialty` exists in the `TutorFilters` type, `DEFAULT_FILTERS`, and is forwarded to `getPublicTutorCards` as a filter. But `getPublicTutorCards` never applies it (no WHERE clause, no post-filter). It is silently ignored.

**Fix:**
- Remove `specialty` from `TutorFilters` type and `DEFAULT_FILTERS` in `tutors/page.tsx`
- Remove `specialty: searchParams.get('specialty') || undefined` from the filters object in `api/tutors/route.ts`
- Remove `specialty?: string` from the `getPublicTutorCards` parameter type in `lib/admin-dashboard.ts`

#### Fix 6 — Language filter in `getPublicTutorCards` incorrectly excludes single-language tutors
**File:** `src/lib/admin-dashboard.ts` (inside `getPublicTutorCards`, post-filter block)

**Problem:**
```ts
if (filters.language) {
  const speaksLanguage = (profile.languages || []).includes(filters.language);
  if (!speaksLanguage || profile.additionalLanguages.length === 0) {
    return false;
  }
}
```
The `|| profile.additionalLanguages.length === 0` clause hides tutors who speak only the filtered language (e.g., a tutor who speaks only English is hidden from the "Also speaks English" filter even though they match). `additionalLanguages` is the list minus the first element, so a single-language tutor always has `additionalLanguages.length === 0`.

**Fix:** Remove the extra clause:
```ts
if (filters.language) {
  const speaksLanguage = (profile.languages || []).includes(filters.language);
  if (!speaksLanguage) return false;
}
```

---

## 3. SWR Migration

### 3a. Install SWR
Add `"swr": "^2.2.5"` to `dependencies` in `package.json` and install.

### 3b. Strategy
Each dashboard replaces its `loadData + useEffect + setInterval` pattern with `useSWR`. The `setInterval` is removed — SWR handles refresh via `refreshInterval`. `revalidateOnFocus: true` is set on all keys so the data refreshes when the user returns to the tab from another window.

After each mutation (booking create/cancel/confirm/complete, report submit, availability update, cert verify), call `mutate(key)` to trigger an immediate revalidation of the relevant key without waiting for the next poll interval.

### 3c. Student Dashboard (`src/app/dashboard/student/page.tsx`)

Replace `loadData()` + `useEffect + setInterval` with four `useSWR` calls:

```ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json());

const { data: bookingsData, mutate: mutateBookings } = useSWR(
  session?.user ? '/api/bookings?role=STUDENT' : null,
  fetcher,
  { refreshInterval: 15000, revalidateOnFocus: true }
);
const { data: favoritesData, mutate: mutateFavorites } = useSWR(
  session?.user ? '/api/student/favorites' : null,
  fetcher,
  { revalidateOnFocus: true }
);
const { data: paymentsData } = useSWR(
  session?.user ? '/api/payments' : null,
  fetcher,
  { refreshInterval: 15000, revalidateOnFocus: true }
);
const { data: referralData } = useSWR(
  session?.user ? '/api/student/referral' : null,
  fetcher,
  { revalidateOnFocus: true }
);
```

Derive data from SWR results:
```ts
const bookings = bookingsData?.data ?? [];
const packages = bookingsData?.packages ?? [];
const favorites = favoritesData?.data ?? [];
const payments = paymentsData?.data ?? [];
const referral = referralData?.data ?? null;
const isLoading = !bookingsData && !favoritesData;
```

Post-mutation calls:
- After cancel/confirm booking → `mutateBookings()`
- After toggle favorite → `mutateFavorites()`
- After PayPal capture → `mutateBookings()`

Remove: `const [data, setData] = useState(...)`, `loadData()` function, `useEffect` with `setInterval`.

### 3d. Tutor Dashboard (`src/app/dashboard/tutor/page.tsx`)

Replace `loadDashboardData()` + `useEffect + setInterval` with four `useSWR` calls:

```ts
const { data: verifyData, mutate: mutateVerify } = useSWR(
  session?.user ? '/api/tutor/verify' : null,
  fetcher,
  { revalidateOnFocus: true }
);
const { data: availData, mutate: mutateAvailability } = useSWR(
  session?.user ? '/api/tutor/availability' : null,
  fetcher,
  { revalidateOnFocus: true }
);
const { data: bookingsData, mutate: mutateBookings } = useSWR(
  session?.user ? '/api/tutor/bookings' : null,
  fetcher,
  { refreshInterval: 15000, revalidateOnFocus: true }
);
const { data: statsData, mutate: mutateStats } = useSWR(
  session?.user ? '/api/tutor/stats' : null,
  fetcher,
  { refreshInterval: 30000, revalidateOnFocus: true }
);
```

Derive:
```ts
const verificationData = verifyData ?? null;
const availability = availData?.slots ?? null;
const bookings = bookingsData ?? null;
const stats = statsData?.data ?? null;
const isLoading = !verifyData && !bookingsData;
```

Post-mutation:
- After confirm/complete/no-show booking → `mutateBookings()`, `mutateStats()`
- After availability update → `mutateAvailability()`
- After profile update → `mutateVerify()`

Remove: four `useState` declarations for the fetched data, `loadDashboardData()`, `useEffect` with `setInterval`.

### 3e. Admin Dashboard (`src/app/dashboard/admin/page.tsx`)

Single endpoint — one `useSWR` call:

```ts
const { data: dashboardJson, mutate: mutateDashboard } = useSWR(
  `/api/admin/dashboard?period=${analyticsPeriod}`,
  fetcher,
  { refreshInterval: 15000, revalidateOnFocus: true }
);
const dashboard = dashboardJson?.data ?? null;
const isLoading = !dashboardJson;
```

The existing `onRefresh` prop passed to `<Verifications>` and `<Reports>` becomes:
```ts
const handleRefresh = async () => { await mutateDashboard(); };
```

When `analyticsPeriod` changes, SWR automatically fetches the new key (the period is part of the URL). Remove the manual `fetchDashboard(period)` call on period change.

Remove: `useState<DashboardData | null>`, `useState<boolean>` for loading, `fetchDashboard()` function, `useEffect` with `setInterval`.

---

## 4. Implementation Order

1. **Backend fixes** (Fixes 1–3) — smallest blast radius, no dependencies
2. **Frontend static fixes** (Fixes 4–6) — independent of SWR
3. **Install SWR** — add package
4. **Student dashboard SWR** — highest traffic, most mutations
5. **Tutor dashboard SWR**
6. **Admin dashboard SWR**
7. **TypeScript check** — `npx tsc --noEmit` after all changes

---

## 5. Files Changed Summary

| File | Type of change |
|------|---------------|
| `src/app/api/admin/certifications/[id]/route.ts` | Backend fix — checklist validation |
| `src/app/api/bookings/[id]/report/route.ts` | Backend fix — Zod enum |
| `src/app/api/admin/reports/[id]/route.ts` | Backend fix — dismiss note fallback |
| `src/components/tutors/TutorFilterBar.tsx` | Frontend — add languages |
| `src/app/tutors/page.tsx` | Frontend — remove specialty field |
| `src/app/api/tutors/route.ts` | Frontend — remove specialty param |
| `src/lib/admin-dashboard.ts` | Frontend — fix language filter logic, remove specialty param |
| `package.json` | Add swr dependency |
| `src/app/dashboard/student/page.tsx` | SWR migration |
| `src/app/dashboard/tutor/page.tsx` | SWR migration |
| `src/app/dashboard/admin/page.tsx` | SWR migration |
