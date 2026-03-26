# Tutor Marketplace — Full Audit & Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 confirmed bugs (3 backend, 3 frontend) and migrate all three dashboards from manual polling to SWR for immediate post-mutation refresh and focus-based revalidation.

**Architecture:** Backend fixes are one-liner or small block changes with zero schema impact. Frontend static fixes touch only filter data arrays and dead field removal. SWR migration replaces `useState + useEffect + setInterval` with `useSWR` hooks while preserving the existing `data.xxx` access pattern so downstream JSX stays unchanged.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma, Tailwind, SWR v2, Zod, react-hot-toast.

---

## File Map

| File | Change type |
|------|-------------|
| `src/app/api/admin/certifications/[id]/route.ts` | Backend — checklist guard |
| `src/app/api/bookings/[id]/report/route.ts` | Backend — Zod enum |
| `src/app/api/admin/reports/[id]/route.ts` | Backend — dismiss note fallback |
| `src/components/tutors/TutorFilterBar.tsx` | Frontend — language list |
| `src/app/tutors/page.tsx` | Frontend — remove dead specialty field |
| `src/app/api/tutors/route.ts` | Frontend — remove dead specialty param |
| `src/lib/admin-dashboard.ts` | Frontend — remove specialty param + fix language filter |
| `package.json` | Add swr dependency |
| `src/app/dashboard/student/page.tsx` | SWR migration |
| `src/app/dashboard/tutor/page.tsx` | SWR migration |
| `src/app/dashboard/admin/page.tsx` | SWR migration |

---

## Task 1: Fix admin certification checklist backend guard

**Files:**
- Modify: `src/app/api/admin/certifications/[id]/route.ts:23`

The current guard `checklistCompleted === false` passes when the field is omitted entirely (`undefined`). A PATCH request without `checklistCompleted` can mark a certification VERIFIED without the three-checkbox gate.

- [ ] **Open the file and locate line 23:**

```ts
if (status === 'VERIFIED' && checklistCompleted === false) {
```

- [ ] **Replace that line with:**

```ts
if (status === 'VERIFIED' && !checklistCompleted) {
```

The surrounding context for reference (no other changes):
```ts
if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
  return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
}

// Bug 6.1: Require all 3 checklist items before verifying
if (status === 'VERIFIED' && !checklistCompleted) {
  return NextResponse.json(
    { error: 'All 3 checklist items (Document Authentic, Score Matches Claims, Date In Range) must be ticked before verifying.' },
    { status: 400 }
  );
}
```

- [ ] **Verify the change is correct:**

```bash
grep -n "checklistCompleted" src/app/api/admin/certifications/[id]/route.ts
```

Expected output contains: `if (status === 'VERIFIED' && !checklistCompleted) {`

- [ ] **Commit:**

```bash
git add src/app/api/admin/certifications/[id]/route.ts
git commit -m "fix(admin): checklist guard catches undefined, not just false"
```

---

## Task 2: Fix report route Zod enum — add NO_SHOW_STUDENT

**Files:**
- Modify: `src/app/api/bookings/[id]/report/route.ts:9`

The Prisma `ReportType` enum has 5 values; the Zod schema here only allows 4. `NO_SHOW_STUDENT` is missing. Any client sending that value gets a 400 with a confusing error.

- [ ] **Open the file. The current Zod schema at line 8:**

```ts
const reportSchema = z.object({
  type: z.enum(['NO_SHOW_TUTOR', 'INAPPROPRIATE_CONDUCT', 'PAYMENT_DISPUTE', 'TECHNICAL_ISSUE']),
  description: z.string().min(10, 'Please provide more details (min 10 characters)'),
});
```

- [ ] **Replace the `type` line with:**

```ts
const reportSchema = z.object({
  type: z.enum(['NO_SHOW_TUTOR', 'NO_SHOW_STUDENT', 'INAPPROPRIATE_CONDUCT', 'PAYMENT_DISPUTE', 'TECHNICAL_ISSUE']),
  description: z.string().min(10, 'Please provide more details (min 10 characters)'),
});
```

- [ ] **Verify:**

```bash
grep -n "NO_SHOW" src/app/api/bookings/[id]/report/route.ts
```

Expected: both `NO_SHOW_TUTOR` and `NO_SHOW_STUDENT` appear.

- [ ] **Commit:**

```bash
git add "src/app/api/bookings/[id]/report/route.ts"
git commit -m "fix(reports): add missing NO_SHOW_STUDENT to report Zod enum"
```

---

## Task 3: Fix DISMISS_REPORT — remove hard 400, add note fallback

**Files:**
- Modify: `src/app/api/admin/reports/[id]/route.ts` (the `DISMISS_REPORT` case)

The admin UI does not validate that `form.note` is non-empty before calling Dismiss. The backend currently returns 400 if `note` is falsy, causing a silent failure for the admin.

- [ ] **Open the file. Find the `DISMISS_REPORT` case (around line 179):**

```ts
case 'DISMISS_REPORT': {
  if (!note) {
    return NextResponse.json({ error: 'Dismiss reason is required' }, { status: 400 });
  }
  await prisma.userReport.update({
    where: { id: report.id },
    data: {
      status: 'DISMISSED',
      adminNote: note,
      resolvedByAdminId: session.user.id,
      resolvedAt: new Date(),
    },
  });
  await recordAdminAction({
    adminId: session.user.id,
    targetUserId: report.reportedUserId,
    actionType: 'DISMISS_REPORT',
    reason: note,
    metadata: { reportId: report.id },
  });
  break;
}
```

- [ ] **Replace the entire `DISMISS_REPORT` case with:**

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
```

- [ ] **Verify the 400 guard is gone:**

```bash
grep -n "Dismiss reason is required" "src/app/api/admin/reports/[id]/route.ts"
```

Expected: no output (line removed).

- [ ] **Commit:**

```bash
git add "src/app/api/admin/reports/[id]/route.ts"
git commit -m "fix(admin): dismiss report no longer requires admin note — uses fallback"
```

---

## Task 4: Add 12 missing languages to TutorFilterBar

**Files:**
- Modify: `src/components/tutors/TutorFilterBar.tsx:51`

The current `languageOptions` array has 22 entries. 12 languages from the comprehensive list are absent.

- [ ] **Open the file. Find `const languageOptions` (around line 51). The current array:**

```ts
const languageOptions = [
  'English',
  'Vietnamese',
  'Mandarin',
  'Cantonese',
  'Korean',
  'Japanese',
  'Thai',
  'Hindi',
  'Arabic',
  'French',
  'German',
  'Spanish',
  'Portuguese',
  'Russian',
  'Italian',
  'Dutch',
  'Turkish',
  'Polish',
  'Swedish',
  'Indonesian',
  'Malay',
];
```

- [ ] **Replace the entire array with the sorted, expanded list:**

```ts
const languageOptions = [
  'Arabic',
  'Bengali',
  'Cantonese',
  'Czech',
  'Danish',
  'Dutch',
  'English',
  'Finnish',
  'French',
  'German',
  'Greek',
  'Hebrew',
  'Hindi',
  'Hungarian',
  'Indonesian',
  'Italian',
  'Japanese',
  'Korean',
  'Malay',
  'Mandarin',
  'Norwegian',
  'Polish',
  'Portuguese',
  'Romanian',
  'Russian',
  'Spanish',
  'Swahili',
  'Swedish',
  'Tagalog',
  'Thai',
  'Turkish',
  'Urdu',
  'Vietnamese',
];
```

- [ ] **Verify the count:**

```bash
grep -c "'" src/components/tutors/TutorFilterBar.tsx | head -1
```

Then count manually in the array — expect 33 entries.

- [ ] **Commit:**

```bash
git add src/components/tutors/TutorFilterBar.tsx
git commit -m "feat(filters): add 12 missing languages to tutor language filter"
```

---

## Task 5: Remove dead `specialty` filter field

**Files:**
- Modify: `src/app/tutors/page.tsx`
- Modify: `src/app/api/tutors/route.ts`
- Modify: `src/lib/admin-dashboard.ts`

`specialty` exists in the filter type and is forwarded to `getPublicTutorCards`, but that function never uses it. It is dead code that pollutes URL params.

### 5a — tutors/page.tsx

- [ ] **Find the `TutorFilters` type definition (around line 13). Remove the `specialty` line:**

```ts
// Before
type TutorFilters = {
  subject: string;
  minPrice: number | '';
  maxPrice: number | '';
  language: string;
  country: string;
  availability: string;
  specialty: string;   // ← remove this line
  nativeSpeaker: boolean;
  category: string;
  sortBy: string;
  search: string;
};

// After
type TutorFilters = {
  subject: string;
  minPrice: number | '';
  maxPrice: number | '';
  language: string;
  country: string;
  availability: string;
  nativeSpeaker: boolean;
  category: string;
  sortBy: string;
  search: string;
};
```

- [ ] **Find `DEFAULT_FILTERS` (around line 27). Remove the `specialty` line:**

```ts
// Before
const DEFAULT_FILTERS: TutorFilters = {
  subject: '',
  minPrice: '',
  maxPrice: '',
  language: '',
  country: '',
  availability: '',
  specialty: '',   // ← remove this line
  nativeSpeaker: false,
  category: '',
  sortBy: 'default',
  search: '',
};

// After
const DEFAULT_FILTERS: TutorFilters = {
  subject: '',
  minPrice: '',
  maxPrice: '',
  language: '',
  country: '',
  availability: '',
  nativeSpeaker: false,
  category: '',
  sortBy: 'default',
  search: '',
};
```

- [ ] **Find `getFiltersFromSearchParams` (around line 41). Remove the `specialty` line:**

```ts
// Before
return {
  subject: searchParams.get('subject') || '',
  minPrice: minPrice ? Number(minPrice) : '',
  maxPrice: maxPrice ? Number(maxPrice) : '',
  language: searchParams.get('language') || '',
  country: searchParams.get('country') || '',
  availability: searchParams.get('availability') || '',
  specialty: searchParams.get('specialty') || '',   // ← remove
  nativeSpeaker: searchParams.get('nativeSpeaker') === 'true',
  category: searchParams.get('category') || '',
  sortBy: searchParams.get('sortBy') || 'default',
  search: searchParams.get('search') || '',
};

// After
return {
  subject: searchParams.get('subject') || '',
  minPrice: minPrice ? Number(minPrice) : '',
  maxPrice: maxPrice ? Number(maxPrice) : '',
  language: searchParams.get('language') || '',
  country: searchParams.get('country') || '',
  availability: searchParams.get('availability') || '',
  nativeSpeaker: searchParams.get('nativeSpeaker') === 'true',
  category: searchParams.get('category') || '',
  sortBy: searchParams.get('sortBy') || 'default',
  search: searchParams.get('search') || '',
};
```

### 5b — api/tutors/route.ts

- [ ] **Find the `filters` object (around line 32). Remove the `specialty` line:**

```ts
// Before
const filters = {
  subject: searchParams.get('subject') || undefined,
  minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
  maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
  minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
  sortBy: searchParams.get('sortBy') || undefined,
  language: searchParams.get('language') || undefined,
  isVerified: searchParams.get('isVerified') === 'true',
  country: searchParams.get('country') || undefined,
  search: searchParams.get('search') || undefined,
  availability: searchParams.get('availability') || undefined,
  specialty: searchParams.get('specialty') || undefined,   // ← remove
  nativeSpeaker: searchParams.get('nativeSpeaker') === 'true',
};

// After
const filters = {
  subject: searchParams.get('subject') || undefined,
  minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
  maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
  minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
  sortBy: searchParams.get('sortBy') || undefined,
  language: searchParams.get('language') || undefined,
  isVerified: searchParams.get('isVerified') === 'true',
  country: searchParams.get('country') || undefined,
  search: searchParams.get('search') || undefined,
  availability: searchParams.get('availability') || undefined,
  nativeSpeaker: searchParams.get('nativeSpeaker') === 'true',
};
```

### 5c — lib/admin-dashboard.ts

- [ ] **Find the `getPublicTutorCards` function signature (around line 965). Remove `specialty?` from the parameter type:**

```ts
// Before
export async function getPublicTutorCards(filters: {
  subject?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: string;
  language?: string;
  isVerified?: boolean;
  country?: string;
  search?: string;
  availability?: string;
  specialty?: string;   // ← remove this line
  nativeSpeaker?: boolean;
}, viewerContext?: { ... }) {

// After
export async function getPublicTutorCards(filters: {
  subject?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: string;
  language?: string;
  isVerified?: boolean;
  country?: string;
  search?: string;
  availability?: string;
  nativeSpeaker?: boolean;
}, viewerContext?: { preferredCurrency?: string | null; countryCode?: string | null; timezone?: string | null }) {
```

- [ ] **Verify no remaining specialty references in these three files:**

```bash
grep -n "specialty" src/app/tutors/page.tsx src/app/api/tutors/route.ts src/lib/admin-dashboard.ts
```

Expected: no output.

- [ ] **Commit:**

```bash
git add src/app/tutors/page.tsx src/app/api/tutors/route.ts src/lib/admin-dashboard.ts
git commit -m "refactor(filters): remove dead specialty filter field from type, params, and API"
```

---

## Task 6: Fix language filter — remove incorrect additionalLanguages exclusion

**Files:**
- Modify: `src/lib/admin-dashboard.ts` (inside `getPublicTutorCards`, post-filter `.filter()` block)

The current filter hides tutors who speak only the searched language because `additionalLanguages` (array minus first element) is empty for single-language tutors.

- [ ] **Find this block inside the `.filter()` callback of `hydratedProfiles` (around line 1148):**

```ts
if (filters.language) {
  const speaksLanguage = (profile.languages || []).includes(filters.language);
  if (!speaksLanguage || profile.additionalLanguages.length === 0) {
    return false;
  }
}
```

- [ ] **Replace with:**

```ts
if (filters.language) {
  const speaksLanguage = (profile.languages || []).includes(filters.language);
  if (!speaksLanguage) return false;
}
```

- [ ] **Verify the old clause is gone:**

```bash
grep -n "additionalLanguages.length" src/lib/admin-dashboard.ts
```

Expected: no output.

- [ ] **Run TypeScript check:**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `admin-dashboard.ts`.

- [ ] **Commit:**

```bash
git add src/lib/admin-dashboard.ts
git commit -m "fix(search): language filter no longer hides single-language tutors"
```

---

## Task 7: Install SWR

**Files:**
- Modify: `package.json`

- [ ] **Install the package:**

```bash
npm install swr
```

- [ ] **Verify it's in package.json:**

```bash
grep '"swr"' package.json
```

Expected output: `"swr": "^2.x.x"` (exact version may differ).

- [ ] **Commit:**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): add swr for dashboard data fetching"
```

---

## Task 8: SWR migration — Student Dashboard

**Files:**
- Modify: `src/app/dashboard/student/page.tsx`

**Strategy:** Replace the `data` useState + `loadData` function + data-fetch `useEffect` with four `useSWR` calls. Reassemble a `data` object from SWR results so all downstream `data.xxx` JSX references are unchanged. Replace every `void loadData()` / `await loadData()` call site with the appropriate `mutate*()` call.

### 8a — Add import

- [ ] **Find the existing imports at the top of the file. Add `useSWR` import after the last import line:**

```ts
import useSWR from 'swr';
```

### 8b — Replace data state + loadData + data-fetch useEffect

- [ ] **Find and remove this block (lines ~37–80):**

```ts
const [data, setData] = useState({
  bookings: [] as any[],
  packages: [] as any[],
  favorites: [] as any[],
  payments: [] as any[],
  referral: null as any,
  isLoading: true,
});

async function loadData() {
  try {
    const [bookingsRes, referralRes, favoritesRes, paymentsRes] = await Promise.all([
      fetch('/api/bookings?role=STUDENT', { cache: 'no-store' }),
      fetch('/api/student/referral', { cache: 'no-store' }),
      fetch('/api/student/favorites', { cache: 'no-store' }),
      fetch('/api/payments', { cache: 'no-store' }),
    ]);

    const bookingsJson = await bookingsRes.json();
    const referralJson = await referralRes.json();
    const favoritesJson = await favoritesRes.json();
    const paymentsJson = await paymentsRes.json();

    setData({
      bookings: bookingsJson.data || [],
      packages: bookingsJson.packages || [],
      favorites: favoritesJson.data || [],
      payments: paymentsJson.data || [],
      referral: referralJson.data || null,
      isLoading: false,
    });
  } catch (error) {
    console.error('Error loading student dashboard:', error);
    setData((prev) => ({ ...prev, isLoading: false }));
  }
}

useEffect(() => {
  if (!session?.user) return;
  void loadData();
  // Bug 4.1: Auto-refresh every 30s so bookings/payments stay current without F5
  const intervalId = window.setInterval(() => { void loadData(); }, 30000);
  return () => window.clearInterval(intervalId);
}, [session]);
```

- [ ] **In the exact same location, insert this replacement block:**

```ts
const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json());

const { data: bookingsJson, mutate: mutateBookings } = useSWR(
  session?.user ? '/api/bookings?role=STUDENT' : null,
  fetcher,
  { refreshInterval: 15000, revalidateOnFocus: true }
);
const { data: favoritesJson } = useSWR(
  session?.user ? '/api/student/favorites' : null,
  fetcher,
  { revalidateOnFocus: true }
);
const { data: paymentsJson } = useSWR(
  session?.user ? '/api/payments' : null,
  fetcher,
  { refreshInterval: 15000, revalidateOnFocus: true }
);
const { data: referralJson } = useSWR(
  session?.user ? '/api/student/referral' : null,
  fetcher,
  { revalidateOnFocus: true }
);

const data = {
  bookings: (bookingsJson?.data ?? []) as any[],
  packages: (bookingsJson?.packages ?? []) as any[],
  favorites: (favoritesJson?.data ?? []) as any[],
  payments: (paymentsJson?.data ?? []) as any[],
  referral: (referralJson?.data ?? null) as any,
  isLoading: !bookingsJson && !paymentsJson,
};
```

### 8c — Update the Stripe success handler

- [ ] **Find the Stripe success handler (around line 131):**

```ts
if (stripeStatus === 'success') {
  toast.success('Stripe payment completed. Updating your billing history...');
  void loadData();
  return;
}
```

- [ ] **Replace `void loadData()` with:**

```ts
if (stripeStatus === 'success') {
  toast.success('Stripe payment completed. Updating your billing history...');
  void mutateBookings();
  return;
}
```

### 8d — Update the mock payment handler

- [ ] **Find `handleMockPayNow` (around line 230):**

```ts
toast.success('Mock payment successful!');
void loadData(); // Refresh UI
```

- [ ] **Replace with:**

```ts
toast.success('Mock payment successful!');
void mutateBookings();
```

### 8e — Update the PayPal capture handler

- [ ] **Find the PayPal capture success block (around line 654):**

```ts
if (captureData.success) {
  toast.success("PayPal payment successful!");
  void loadData();
```

- [ ] **Replace with:**

```ts
if (captureData.success) {
  toast.success("PayPal payment successful!");
  void mutateBookings();
```

### 8f — Update the review submitted callback

- [ ] **Find the review modal `onSubmitted` callback (around line 715):**

```ts
onSubmitted={() => {
  setSelectedReviewBooking(null);
  void loadData();
}}
```

- [ ] **Replace with:**

```ts
onSubmitted={() => {
  setSelectedReviewBooking(null);
  void mutateBookings();
}}
```

### 8g — Verify no remaining loadData references

- [ ] **Check for stale references:**

```bash
grep -n "loadData" src/app/dashboard/student/page.tsx
```

Expected: no output. If any remain, replace them with `mutateBookings()`.

- [ ] **TypeScript check:**

```bash
npx tsc --noEmit 2>&1 | grep "student/page"
```

Expected: no output.

- [ ] **Commit:**

```bash
git add src/app/dashboard/student/page.tsx
git commit -m "feat(student): migrate dashboard data fetching to SWR with post-mutation invalidation"
```

---

## Task 9: SWR migration — Tutor Dashboard

**Files:**
- Modify: `src/app/dashboard/tutor/page.tsx`

**Strategy:** Same approach as Task 8. Replace `loadDashboardData` + data states + setInterval useEffect with four `useSWR` calls. The tutor dashboard uses individual state variables (`verificationData`, `availability`, `bookings`, `stats`) rather than a single `data` object, so we derive each from SWR directly.

### 9a — Add import

- [ ] **Add `useSWR` import at the top of the file after existing imports:**

```ts
import useSWR from 'swr';
```

### 9b — Replace data states + loadDashboardData + data-fetch useEffect

- [ ] **Find and remove these state declarations (around lines 32–48):**

```ts
const [verificationData, setVerificationData] = useState<{
  status: string;
  certifications: any[];
  documents: any[];
  notes?: string | null;
} | null>(null);
const [availability, setAvailability] = useState<any[] | null>(null);
const [bookings, setBookings] = useState<any[] | null>(null);
const [stats, setStats] = useState<any>(null);
```

- [ ] **Also remove the `isLoading` useState:**

```ts
const [isLoading, setIsLoading] = useState(true);
```

- [ ] **Remove the entire `loadDashboardData` function (lines ~49–90):**

```ts
async function loadDashboardData() {
  try {
    const [verifyRes, availRes, bookingsRes, statsRes] = await Promise.all([
      fetch('/api/tutor/verify', { cache: 'no-store' }),
      fetch('/api/tutor/availability', { cache: 'no-store' }),
      fetch('/api/tutor/bookings', { cache: 'no-store' }),
      fetch('/api/tutor/stats', { cache: 'no-store' }),
    ]);

    if (verifyRes.ok) {
      const verifyData = await verifyRes.json();
      setVerificationData(verifyData);
    }

    if (availRes.ok) {
      const availData = await availRes.json();
      setAvailability(availData.slots);
    }

    if (bookingsRes.ok) {
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData);
    }

    if (statsRes.ok) {
      const statsData = await statsRes.json();
      setStats(statsData.data);
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  } finally {
    setIsLoading(false);
  }
}

useEffect(() => {
  if (!session?.user) return;
  void loadDashboardData();
  // Bug 4.1: Auto-refresh every 30s so sessions/stats stay current without F5
  const intervalId = window.setInterval(() => { void loadDashboardData(); }, 30000);
  return () => window.clearInterval(intervalId);
}, [session]);
```

- [ ] **In their place, insert:**

```ts
const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json());

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
const { data: bookingsRaw, mutate: mutateBookings } = useSWR(
  session?.user ? '/api/tutor/bookings' : null,
  fetcher,
  { refreshInterval: 15000, revalidateOnFocus: true }
);
const { data: statsRaw, mutate: mutateStats } = useSWR(
  session?.user ? '/api/tutor/stats' : null,
  fetcher,
  { refreshInterval: 30000, revalidateOnFocus: true }
);

const verificationData = (verifyData ?? null) as { status: string; certifications: any[]; documents: any[]; notes?: string | null } | null;
const availability = (availData?.slots ?? null) as any[] | null;
const bookings = (bookingsRaw ?? null) as any[] | null;
const stats = (statsRaw?.data ?? null) as any;
const isLoading = !verifyData && !bookingsRaw;
```

### 9c — Update handleDeleteDocument

- [ ] **Find `handleDeleteDocument` (around line 156):**

```ts
toast.success('Document deleted');
await loadDashboardData();
```

- [ ] **Replace with:**

```ts
toast.success('Document deleted');
await mutateVerify();
```

### 9d — Update handleCompleteSession

- [ ] **Find `handleCompleteSession` (around line 188):**

```ts
toast.success(json.message || 'Session marked as complete');
setSelectedNotesBooking(null);
await loadDashboardData();
```

- [ ] **Replace with:**

```ts
toast.success(json.message || 'Session marked as complete');
setSelectedNotesBooking(null);
await Promise.all([mutateBookings(), mutateStats()]);
```

### 9e — Update handleBookingDecision

- [ ] **Find `handleBookingDecision` (around line 224):**

```ts
toast.success(json.message || `Booking ${action}ed`);
await loadDashboardData();
```

- [ ] **Replace with:**

```ts
toast.success(json.message || `Booking ${action}ed`);
await Promise.all([mutateBookings(), mutateStats()]);
```

### 9f — Verify and commit

- [ ] **Check for stale references:**

```bash
grep -n "loadDashboardData\|setVerificationData\|setAvailability\|setBookings\|setStats\|setIsLoading" src/app/dashboard/tutor/page.tsx
```

Expected: no output.

- [ ] **TypeScript check:**

```bash
npx tsc --noEmit 2>&1 | grep "tutor/page"
```

Expected: no output.

- [ ] **Commit:**

```bash
git add src/app/dashboard/tutor/page.tsx
git commit -m "feat(tutor): migrate dashboard data fetching to SWR with post-mutation invalidation"
```

---

## Task 10: SWR migration — Admin Dashboard

**Files:**
- Modify: `src/app/dashboard/admin/page.tsx`

**Strategy:** The admin dashboard uses a single `/api/admin/dashboard` endpoint. One `useSWR` call replaces `fetchDashboard` + `useState` + `setInterval`. The `analyticsPeriod` is embedded in the SWR key so changing period automatically triggers a refetch. The `onRefresh` prop passed to child components calls `mutateDashboard()`.

### 10a — Add import

- [ ] **Add `useSWR` import after existing imports:**

```ts
import useSWR from 'swr';
```

### 10b — Replace dashboard state + fetch function + useEffect

- [ ] **Find and remove (around lines 30–55):**

```ts
const [dashboard, setDashboard] = useState<DashboardData | null>(null);
const [isLoading, setIsLoading] = useState(true);

const fetchDashboard = async (period = analyticsPeriod) => {
  try {
    const response = await fetch(`/api/admin/dashboard?t=${Date.now()}&period=${period}`, { cache: 'no-store' });
    const json = await parseResponse(response);
    setDashboard(json.data);
  } catch (error) {
    console.error(error);
    toast.error(error instanceof Error ? error.message : 'Failed to load admin dashboard');
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  void fetchDashboard();
  // Bug 4.1: Auto-refresh every 30s so admin data stays current without F5
  const intervalId = window.setInterval(() => { void fetchDashboard(); }, 30000);
  return () => window.clearInterval(intervalId);
}, [analyticsPeriod]);
```

- [ ] **In their place, insert:**

```ts
const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
};

const { data: dashboardJson, mutate: mutateDashboard, error: dashboardError } = useSWR(
  `/api/admin/dashboard?period=${analyticsPeriod}`,
  fetcher,
  { refreshInterval: 15000, revalidateOnFocus: true }
);

const dashboard = (dashboardJson?.data ?? null) as DashboardData | null;
const isLoading = !dashboardJson && !dashboardError;

useEffect(() => {
  if (dashboardError) {
    toast.error(dashboardError.message || 'Failed to load admin dashboard');
  }
}, [dashboardError]);
```

### 10c — Remove parseResponse helper

- [ ] **Find and remove the `parseResponse` function (around line 24):**

```ts
async function parseResponse(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || 'Request failed');
  return json;
}
```

This logic is now handled inside the `fetcher` function.

### 10d — Update onRefresh props

- [ ] **Find where `<Verifications>` and `<Reports>` receive their `onRefresh` prop. They currently pass:**

```tsx
onRefresh={fetchDashboard}
```

- [ ] **Replace both occurrences with:**

```tsx
onRefresh={async () => { await mutateDashboard(); }}
```

- [ ] **Verify `fetchDashboard` is gone:**

```bash
grep -n "fetchDashboard\|parseResponse\|setDashboard\|setIsLoading" src/app/dashboard/admin/page.tsx
```

Expected: no output.

- [ ] **TypeScript check:**

```bash
npx tsc --noEmit 2>&1 | grep "admin/page"
```

Expected: no output.

- [ ] **Commit:**

```bash
git add src/app/dashboard/admin/page.tsx
git commit -m "feat(admin): migrate dashboard data fetching to SWR with post-mutation invalidation"
```

---

## Task 11: Final TypeScript and build verification

- [ ] **Run full TypeScript check:**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors. If errors appear, fix them before proceeding.

- [ ] **Run Next.js build to catch any remaining issues:**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with no errors.

- [ ] **If build passes, commit any fixes and tag the completion:**

```bash
git log --oneline -10
```

Confirm all 10 feature commits appear cleanly in the log.

---

## Verification Checklist (manual smoke test)

After the build passes, verify these flows work end-to-end in `npm run dev`:

- [ ] Admin can verify a certification only after ticking all 3 checkboxes (try submitting with 1–2 ticked — should be blocked)
- [ ] Admin can dismiss a report without typing a note — it succeeds with "Dismissed by admin" as the stored note
- [ ] Student can submit a report of any type (`NO_SHOW_TUTOR`, `TECHNICAL_ISSUE`, `INAPPROPRIATE_CONDUCT`, `PAYMENT_DISPUTE`) — all succeed
- [ ] Find Tutors language filter shows 33 languages in alphabetical order
- [ ] Find Tutors language filter returns tutors who speak only the selected language (not just multi-language tutors)
- [ ] Student dashboard updates immediately after mock payment (no F5 needed)
- [ ] Tutor dashboard updates immediately after accepting/completing a booking
- [ ] Admin dashboard refreshes after verifying a cert (Verifications tab) or resolving a report (Reports tab)
- [ ] Admin dashboard auto-refreshes every 15 seconds without user action
