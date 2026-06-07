# PrepPass UI/UX Overhaul — Design Spec
**Date:** 2026-06-07  
**Status:** Approved  
**Scope:** Sub-project 1 of 2 (UI/UX overhaul + icon system + cleanup)  
**Deferred:** VietQR / ZaloPay / ShopeePay payment integration (Sub-project 2, separate spec)

---

## Overview

PrepPass is a tutor marketplace for CFA/GMAT/GRE exam prep. The site is live at [prepass.vercel.app](https://prepass.vercel.app). The current design system (navy/cream/gold, glass-card) is a solid foundation. This overhaul upgrades it to a premium fintech/edtech aesthetic without changing the brand palette.

**Target market:** International (USD/Stripe) with a Vietnamese segment (VietQR/ZaloPay/ShopeePay added in sub-project 2).

**Approach:** Shared components first (design tokens → Navbar/Footer/buttons/cards → pages), then page-by-page fine-tuning. This creates a ripple-effect improvement across the entire site before touching individual pages.

---

## Section 1: Design Foundations

### Typography
- Enforce a clear 3-level hierarchy: `display` (headings), `body` (readable prose), `label` (metadata/badges)
- Eliminate overuse of `text-[10px] font-black uppercase tracking-widest` — replace with consistent utility classes `label-xs` and `label-sm` defined in Tailwind config
- Line-height: increase body text to `leading-relaxed` everywhere for readability

### Spacing & Layout
- Card padding standard: `p-8` for primary content sections, `p-6` for secondary, `p-4` for compact
- Border-radius standard: `rounded-2xl` for cards, `rounded-xl` for inputs/buttons, `rounded-full` for badges/chips
- Page container: consistent `max-w-6xl mx-auto px-4 sm:px-6` across all pages

### Shadow & Depth
- Cards: `shadow-sm` for default, `shadow-lg shadow-navy-900/10` on hover/elevated
- Modals/dropdowns: `shadow-xl shadow-navy-900/20`
- Glass cards dark mode: upgrade to `bg-navy-800/40` (from `bg-navy-700/30`) for better depth
- Consistent `backdrop-blur-xl` on all glassmorphism surfaces

### Animations & Transitions
- All interactive elements: `transition-all duration-200` as baseline
- Card hover: `hover:-translate-y-0.5 hover:shadow-lg`
- Button hover: subtle shine via `before:` pseudo-element gradient sweep
- Tab transitions: fade-in between dashboard tabs
- Scroll-triggered: count-up on stats, connector line draw on "How It Works" steps (Intersection Observer)
- Page-level: fade-in on mount for major sections

### Icon System
- Install `lucide-react` as primary icon library (stroke-based, consistent with current inline SVG style)
- Use Lucide for all generic icons: arrows, search, bell, user, star, check, calendar, credit card, etc.
- Keep custom inline SVG for brand-specific elements: PrepPass logo, exam category icons, award/tutor badge
- Icon size standard: `16` for inline text, `20` for buttons, `24` for section headers

### Toast Notifications
- Customize `react-hot-toast` to match design system:
  - Success: gold accent border, navy background
  - Error: red-500 accent
  - Info: blue-500 accent
  - Consistent `rounded-2xl` shape, `shadow-lg`

---

## Section 2: Shared Components

### Navbar
- On scroll: add `border-b border-white/10` separator (in addition to existing backdrop blur)
- Active nav link: animated underline via `after:` pseudo-element instead of color-only change
- Mobile menu: slide-down animation (`max-h` transition), dark backdrop overlay
- Notification/Favorites dropdowns: scale+fade enter/exit animation, arrow indicator pointing up
- User avatar: `ring-2 ring-gold-400/30 hover:ring-gold-400/60 transition-all`

### Footer
- Audit content on implementation; preserve layout but upgrade spacing to `py-16` and enforce typography hierarchy

### Buttons
- `btn-primary`: add shine sweep on hover (`before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent`)
- `btn-outline`: animated border color transition on hover
- Loading state: single standardized spinner (`w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin`) — used consistently across all buttons
- Disabled state: `opacity-50 cursor-not-allowed` everywhere, no exceptions

### Glass Cards
- `glass-card`: `backdrop-blur-xl`, `border border-white/20 dark:border-white/10`, `shadow-sm`
- `glass-card` dark mode: `bg-navy-800/40`
- Hover variant (`glass-card` with `group`): `hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`

### Badges
- `badge-gold`, `badge-sage`, `badge-navy`: add optional leading icon slot (Lucide)
- Verified badge: add `title="Credential verified by PrepPass"` tooltip

### Form Inputs
- Focus ring: `ring-2 ring-gold-400/50 ring-offset-1`
- Error state: `border-red-400 ring-red-400/30` + Lucide `AlertCircle` icon inline
- Select elements: custom Lucide `ChevronDown` arrow, remove browser default `appearance-none` inconsistencies
- `PasswordInput`: replace inline SVG eye toggle with Lucide `Eye`/`EyeOff`

---

## Section 3: Core Pages

### Home (`/`)
- Hero: add subtle grid dot pattern overlay on gradient; refine floating orb animations
- Search bar: Lucide `Search` icon animated on focus, custom-styled select
- Featured Tutor cards: `hover:-translate-y-1` + shadow deepening; avatar ring transition on hover
- Stats bar: count-up animation via Intersection Observer when scrolled into view
- "How It Works" connector: SVG line draw animation on scroll
- CTA section: slow animated gradient hue shift (`@keyframes gradient-shift`)

### Auth Pages (`/auth/*`)
- Login & Register: split 2-column layout on desktop (left: form, right: brand panel with stats and social proof — "Join 2,500+ students")
- Currently single-column; right panel adds conversion context without changing form logic
- Form validation: inline error messages with Lucide `AlertCircle`, smooth fade-in
- `PasswordInput`: Lucide eye toggle (already a component — just replace the SVG)

### Tutors Search (`/tutors`)
- Filter bar: sticky on scroll, active filter chips with Lucide `X` to remove individual filters
- Tutor cards: cleaner hierarchy — rating and price more prominent, "Available today" badge when applicable
- Empty state: Lucide `SearchX` icon + actionable copy ("Try removing filters")
- Loading: shimmer skeleton animation instead of spinner

### Tutor Profile (`/tutors/[id]`)
- Desktop: sticky booking panel in right column (scrolls with user)
- Video: ensure `VideoPlayer` component is wired into the profile page correctly
- Reviews: rating breakdown (star distribution bars), pagination or load-more
- Booking modal: visual multi-step flow (Date → Time → Confirm) with clear step indicator

---

## Section 4: Dashboards

### Student Dashboard (`/dashboard/student`)
- Tab bar icons (Lucide): Overview→`LayoutDashboard`, Bookings→`Calendar`, Messages→`MessageSquare`, Payments→`CreditCard`, Referral→`Gift`
- Overview: "Learning Pulse" card — add mini bar chart (sessions per month, last 4 weeks) using CSS/inline SVG bars — no charting library needed
- Upcoming lessons: countdown badge ("Starts in 2h 30m") for the next lesson
- Messages empty state: replace `<div>M</div>` with Lucide `MessageSquare` icon + "Select a conversation to start messaging"
- Payments tab: payment method badges (Stripe/PayPal logos), Mock Pay styled as dev-mode (gray, "Test only" label)
- Referral tab: share buttons (copy link), progress indicator

### Tutor Dashboard (`/dashboard/tutor`)
- Audit all sub-components: `StatsOverview`, `ReviewsSection`, `CertificationStatus`, `PricingManager`, `WeeklyAvailabilityGrid`
- Apply consistent spacing (`p-8`), typography hierarchy, Lucide icons
- Analytics page: if currently skeleton, implement basic earnings chart (bar: earnings/month) and sessions chart (line: sessions/week)
- Calendar page: audit; if unimplemented, defer to sub-project 3
- Students page: table with avatar + status badge, sortable columns

### Admin Dashboard (`/dashboard/admin`)
- Audit `StatsCards`, `AdminOverview`, `Moderation`, `Reports`, `Analytics`, `Verifications`
- Replace tab navigation with sidebar navigation (more appropriate for admin-density pages)
- Data tables: consistent status badge colors, sort indicators

### Settings Page (`/settings`)
- Audit full file on implementation
- Tab structure: Profile | Security | Notifications | Preferences
- Form save states: `isSaving` spinner + success toast, consistent across all settings sections

---

## Section 5: Checkout & Cleanup

### Checkout Page (`/checkout/[paymentId]`)
- Payment method area: tab switcher ("Card" | "PayPal") with clear active state; placeholder slot for VietQR (sub-project 2)
- Trust signals: Lucide `ShieldCheck` + "SSL Secured", `Lock` icon prominent
- Tutor stats (Students/Lessons/Hours): replace inline SVGs with Lucide `Users`, `BookOpen`, `Clock`
- Static review: remove non-functional prev/next carousel buttons; show single best review card

### Elements to Remove
| Element | Location | Action |
|---|---|---|
| "Save this card" checkbox | `CheckoutForm.tsx` | Remove |
| "Have a promo code?" button | `checkout/[paymentId]/page.tsx` | Remove |
| Review carousel prev/next buttons | `checkout/[paymentId]/page.tsx` | Remove, show single static review |
| `<div>M</div>` empty state | `dashboard/student/page.tsx` | Replace with Lucide icon |

### Mock Pay Button
- Keep for testing purposes
- Restyle: gray background, italic "Test only" label, `opacity-70`
- Do not show prominently alongside real payment options

---

## Architecture Notes

### Icon Migration Strategy
1. Install `lucide-react`
2. Create `src/components/ui/icons.ts` re-export file to centralize icon imports
3. Replace inline SVGs component by component (start with shared, then pages)
4. Never mix icon libraries — Lucide only (except brand SVGs)

### Tailwind Config Additions
Add to `tailwind.config.js`:
- Custom utility classes: `label-xs` (`text-[10px] font-bold uppercase tracking-widest`) and `label-sm` (`text-xs font-bold uppercase tracking-widest`) via Tailwind plugin — replace all ad-hoc occurrences
- Extended `boxShadow`: `glass`, `gold`, `navy-sm` tokens
- Extended `animation`: `gradient-shift`, `count-up`, `shimmer`

### Component File Size
If any component exceeds ~300 lines during upgrade, split into sub-components. Dashboard pages are already large — extract tab content into separate files during the upgrade pass.

---

## Out of Scope (Sub-project 2)
- VietQR payment integration
- ZaloPay integration
- ShopeePay integration
- Banking transfer (manual) flow
- Currency switching (VND/USD)

These will be designed in a separate spec after this UI/UX overhaul is complete and deployed.

---

## Deployment
- Vercel auto-deploys on push to `main`
- No additional config needed (site already live at prepass.vercel.app)
- Deploy after each major batch: shared components, core pages, dashboards, checkout cleanup
