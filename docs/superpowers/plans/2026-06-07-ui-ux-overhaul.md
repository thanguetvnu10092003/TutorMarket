# PrepPass UI/UX Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade PrepPass's UI/UX to a premium fintech/edtech aesthetic — shared components first, then pages, then dashboards, then checkout cleanup.

**Architecture:** Approach A — upgrade design tokens and shared components (Navbar, Footer, buttons, cards) first so changes ripple across the entire site, then fine-tune individual pages. Install `lucide-react` as the icon library; replace all generic inline SVGs with Lucide icons while keeping brand-specific custom SVGs intact.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, `lucide-react`, `react-hot-toast`, Framer Motion (already installed), Intersection Observer API (native), Vercel (auto-deploy on push to `main`)

> **Note on testing:** This project has no test framework configured. Each task's verification step is: run `npm run dev`, navigate to the affected page(s), and visually confirm the changes look correct. Commit only after visual verification passes.

---

## File Map

**Create:**
- `src/components/ui/icons.ts` — centralized Lucide icon re-exports
- `src/components/ui/Spinner.tsx` — standardized loading spinner component
- `src/components/ui/useCountUp.ts` — Intersection Observer count-up hook

**Modify:**
- `tailwind.config.ts` — add `gradient-shift` keyframe, `shadow-navy` token, label plugin
- `src/app/globals.css` — add `label-xs`/`label-sm` utilities, upgrade `glass-card` dark mode, add `gradient-shift` animation, grid dot pattern util
- `src/components/ui/PasswordInput.tsx` — replace inline SVG with Lucide `Eye`/`EyeOff`
- `src/components/providers/Providers.tsx` — customize `Toaster` style
- `src/components/layout/Navbar.tsx` — active link underline, dropdown enter/exit animation, avatar ring, mobile menu overlay
- `src/components/layout/Footer.tsx` — replace generic SVG circles with Lucide social icons, spacing upgrade
- `src/app/page.tsx` — count-up stats, connector line animation, hero dot-grid texture, CTA gradient-shift
- `src/app/auth/login/page.tsx` — 2-column layout (form + brand panel)
- `src/app/auth/register/page.tsx` — 2-column layout (form + brand panel)
- `src/app/tutors/page.tsx` — `SearchX` empty state
- `src/components/tutors/TutorFilterBar.tsx` — active filter chips with `X` remove button
- `src/components/tutors/HorizontalTutorCard.tsx` — card hierarchy upgrade, Lucide icons
- `src/app/tutors/[id]/page.tsx` — sticky booking panel, Lucide icons, reviews pagination
- `src/app/dashboard/student/page.tsx` — tab icons, countdown badge, fix messages empty state, restyle Mock Pay, remove non-functional elements
- `src/app/dashboard/tutor/page.tsx` — Lucide icons, spacing
- `src/components/dashboard/tutor/StatsOverview.tsx` — Lucide icons, card spacing
- `src/components/dashboard/tutor/ReviewsSection.tsx` — upgrade
- `src/components/dashboard/tutor/CertificationStatus.tsx` — upgrade
- `src/components/dashboard/tutor/PricingManager.tsx` — upgrade
- `src/components/dashboard/tutor/WeeklyAvailabilityGrid.tsx` — upgrade
- `src/app/dashboard/tutor/analytics/page.tsx` — CSS/SVG bar charts
- `src/app/dashboard/tutor/students/page.tsx` — table upgrade, status badges
- `src/app/dashboard/admin/page.tsx` — sidebar navigation
- `src/app/settings/page.tsx` — tab structure, save states
- `src/app/checkout/[paymentId]/page.tsx` — payment method tabs, remove non-functional elements, trust signals
- `src/components/checkout/CheckoutForm.tsx` — remove "Save this card" checkbox, standardize spinner

---

## Task 1: Install lucide-react and create icon infrastructure

**Files:**
- Create: `src/components/ui/icons.ts`
- Create: `src/components/ui/Spinner.tsx`

- [ ] **Step 1: Install lucide-react**

```bash
npm install lucide-react
```

Expected: `lucide-react` appears in `package.json` dependencies.

- [ ] **Step 2: Create centralized icon re-exports**

Create `src/components/ui/icons.ts`:

```typescript
export {
  Search,
  SearchX,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Bell,
  BellOff,
  Heart,
  Star,
  StarHalf,
  Check,
  CheckCircle,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  User,
  Users,
  MessageSquare,
  Calendar,
  Clock,
  CreditCard,
  Gift,
  LayoutDashboard,
  BookOpen,
  ShieldCheck,
  Lock,
  Upload,
  Download,
  LogOut,
  Settings,
  Menu,
  Moon,
  Sun,
  ExternalLink,
  Copy,
  Twitter,
  Linkedin,
  Instagram,
  Mail,
  Phone,
  Globe,
  Award,
  TrendingUp,
  BarChart2,
  Loader2,
} from 'lucide-react';
```

- [ ] **Step 3: Create standardized Spinner component**

Create `src/components/ui/Spinner.tsx`:

```tsx
import { Loader2 } from '@/components/ui/icons';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  return <Loader2 className={[sizeClass, 'animate-spin', className].filter(Boolean).join(' ')} />;
}
```

- [ ] **Step 4: Verify build compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: No TypeScript errors related to `lucide-react` or new files.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/icons.ts src/components/ui/Spinner.tsx package.json package-lock.json
git commit -m "feat: install lucide-react and create icon/spinner infrastructure"
```

---

## Task 2: Tailwind config — add animations and token upgrades

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Add gradient-shift keyframe, shadow-navy token, and label plugin**

In `tailwind.config.ts`, update the file to:

```typescript
import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#E8EBF0",
          100: "#C5CCD9",
          200: "#8B99B3",
          300: "#51668D",
          400: "#1E3A6E",
          500: "#0F2847",
          600: "#0A1628",
          700: "#070F1C",
          800: "#050A13",
          900: "#020509",
        },
        cream: {
          50: "#FDFCFA",
          100: "#FAF8F4",
          200: "#F5F0E8",
          300: "#EDE5D6",
          400: "#E0D4BD",
          500: "#D3C3A4",
        },
        gold: {
          50: "#FBF6E9",
          100: "#F5EAC9",
          200: "#ECD58F",
          300: "#DBBF5C",
          400: "#C9A84C",
          500: "#B8933A",
          600: "#A07D2E",
          700: "#7A5F23",
          800: "#544118",
          900: "#2E230D",
        },
        sage: {
          50: "#EDF4F1",
          100: "#D4E5DE",
          200: "#A9CBBD",
          300: "#7EB19C",
          400: "#4A7C6F",
          500: "#3D6A5E",
          600: "#30584D",
          700: "#23413A",
          800: "#172B26",
          900: "#0B1613",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        shimmer: "shimmer 2s linear infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "scale-in": "scaleIn 0.3s ease-out",
        "gradient-shift": "gradientShift 8s ease infinite",
        "shine": "shine 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shine: {
          "0%": { transform: "translateX(-100%) skewX(-15deg)" },
          "100%": { transform: "translateX(200%) skewX(-15deg)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "dot-grid": "radial-gradient(circle, rgba(201,168,76,0.15) 1px, transparent 1px)",
      },
      backgroundSize: {
        "dot-grid": "24px 24px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(10, 22, 40, 0.12)",
        "glass-lg": "0 16px 48px 0 rgba(10, 22, 40, 0.16)",
        gold: "0 4px 20px 0 rgba(201, 168, 76, 0.25)",
        "navy-sm": "0 2px 8px 0 rgba(10, 22, 40, 0.08)",
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".label-xs": {
          fontSize: "0.625rem",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          lineHeight: "1rem",
        },
        ".label-sm": {
          fontSize: "0.75rem",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          lineHeight: "1rem",
        },
      });
    }),
  ],
};

export default config;
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | head -20
```

Expected: Clean build, no errors.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat: upgrade Tailwind config with gradient-shift, dot-grid, label utilities, shine animation"
```

---

## Task 3: globals.css — upgrade glass-card dark mode and add toast styles

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Upgrade glass-card dark mode and add toast layer**

In `src/app/globals.css`, find the `.dark .glass-card` rule and replace it, then add toast overrides at the end of `@layer components`:

Find:
```css
  .dark .glass-card {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .dark .glass-card:hover {
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  }
```

Replace with:
```css
  .dark .glass-card {
    background: rgba(5, 10, 19, 0.6);
    border-color: rgba(30, 58, 110, 0.4);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .dark .glass-card:hover {
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    border-color: rgba(201, 168, 76, 0.15);
  }
```

- [ ] **Step 2: Add toast component styles**

At the end of `@layer components` block (before the closing `}`), add:

```css
  /* Toast overrides */
  .toast-success {
    @apply !rounded-2xl !border !border-gold-400/30 !bg-navy-600 !text-cream-200 !shadow-glass;
  }

  .toast-error {
    @apply !rounded-2xl !border !border-red-500/30 !bg-navy-600 !text-cream-200 !shadow-glass;
  }

  .toast-loading {
    @apply !rounded-2xl !border !border-navy-400/30 !bg-navy-600 !text-cream-200 !shadow-glass;
  }
```

- [ ] **Step 3: Start dev server and verify glass cards look correct in dark mode**

```bash
npm run dev
```

Navigate to `http://localhost:3000`, toggle dark mode, confirm glass cards have deeper dark background and gold border on hover.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: upgrade glass-card dark mode depth and add toast styles"
```

---

## Task 4: Customize Toaster and upgrade PasswordInput

**Files:**
- Modify: `src/components/providers/Providers.tsx`
- Modify: `src/components/ui/PasswordInput.tsx`

- [ ] **Step 1: Customize Toaster in Providers.tsx**

Replace the contents of `src/components/providers/Providers.tsx`:

```tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './ThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '16px',
              background: '#0A1628',
              color: '#F5F0E8',
              border: '1px solid rgba(30,58,110,0.4)',
              boxShadow: '0 8px 32px rgba(10,22,40,0.3)',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              iconTheme: { primary: '#C9A84C', secondary: '#0A1628' },
              style: {
                border: '1px solid rgba(201,168,76,0.3)',
              },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0A1628' },
              style: {
                border: '1px solid rgba(239,68,68,0.3)',
              },
            },
          }}
        />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 2: Replace inline SVGs in PasswordInput with Lucide**

Replace the contents of `src/components/ui/PasswordInput.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Eye, EyeOff } from '@/components/ui/icons';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function PasswordInput({ label, className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-navy-500 dark:text-cream-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          type={showPassword ? 'text' : 'password'}
          className={`input-field pr-12 ${className || ''}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-navy-300 hover:text-navy-500 dark:text-cream-400/60 dark:hover:text-cream-200 transition-colors"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Visual verify**

Navigate to `http://localhost:3000/auth/login`, trigger a toast (wrong credentials), confirm toast has dark navy style. Confirm password eye toggle uses Lucide icons.

- [ ] **Step 4: Commit**

```bash
git add src/components/providers/Providers.tsx src/components/ui/PasswordInput.tsx
git commit -m "feat: customize Toaster styling and replace PasswordInput SVGs with Lucide"
```

---

## Task 5: Navbar upgrades — active link, dropdown animations, avatar ring, mobile overlay

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Read the full current Navbar**

Read `src/components/layout/Navbar.tsx` in full before making changes. Note all existing dropdown/menu logic to avoid breaking it.

- [ ] **Step 2: Add Lucide imports and upgrade active link, avatar ring, mobile overlay**

At the top of `src/components/layout/Navbar.tsx`, add the Lucide import after existing imports:

```tsx
import { Bell, Heart, Sun, Moon, Menu, X, ChevronDown } from '@/components/ui/icons';
```

Find every inline SVG used for: bell, heart/bookmark, sun, moon, hamburger menu, X close, chevron-down — replace each with the corresponding Lucide component above (same size `20` for nav icons).

For the active nav link, find the className applied to active `<Link>` elements and add an underline indicator. Replace the active link className pattern with:

```tsx
className={`relative text-sm font-medium transition-colors duration-200 ${
  pathname === link.href
    ? 'text-gold-500 after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-gold-400 after:rounded-full'
    : 'text-navy-300 dark:text-cream-400/60 hover:text-navy-600 dark:hover:text-cream-200'
}`}
```

For the user avatar element, add `ring-2 ring-gold-400/30 hover:ring-gold-400/60 transition-all`:

```tsx
className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-gold-400/30 hover:ring-gold-400/60 transition-all duration-200"
```

For the mobile menu container, add a full-screen dark overlay behind the slide-down panel:

```tsx
{/* Mobile overlay */}
{isMobileMenuOpen && (
  <div
    className="fixed inset-0 bg-navy-900/50 backdrop-blur-sm z-40 md:hidden"
    onClick={() => setIsMobileMenuOpen(false)}
  />
)}
```

Place this overlay `<div>` just before the mobile menu panel in the JSX.

For dropdown panels (notifications, favorites, user menu), add `animate-scale-in` class:

```tsx
className="... animate-scale-in origin-top-right"
```

- [ ] **Step 3: Visual verify**

Run dev server. Navigate through pages — confirm active link shows gold underline. Open mobile menu — confirm overlay appears. Confirm avatar has gold ring on hover. Confirm Bell/Heart icons are Lucide.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: upgrade Navbar — active link underline, Lucide icons, avatar ring, mobile overlay"
```

---

## Task 6: Footer upgrades — real social icons, spacing

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Replace generic circle SVG social icons with Lucide**

In `src/components/layout/Footer.tsx`, add import at the top:

```tsx
import { Twitter, Linkedin, Instagram } from '@/components/ui/icons';
```

Find the social icons section that maps over `['twitter', 'linkedin', 'instagram']` with a generic `<circle>` SVG. Replace the entire map with:

```tsx
<div className="flex gap-3">
  {[
    { icon: <Twitter size={16} />, label: 'Twitter', href: '#' },
    { icon: <Linkedin size={16} />, label: 'LinkedIn', href: '#' },
    { icon: <Instagram size={16} />, label: 'Instagram', href: '#' },
  ].map(({ icon, label, href }) => (
    <a
      key={label}
      href={href}
      aria-label={label}
      className="w-9 h-9 rounded-xl bg-navy-500 hover:bg-gold-400/20 hover:text-gold-400 flex items-center justify-center text-cream-400/60 transition-all duration-200"
    >
      {icon}
    </a>
  ))}
</div>
```

- [ ] **Step 2: Upgrade footer column heading style**

Find all `<h4 className="text-sm font-bold text-cream-200 mb-4 uppercase tracking-wider">` in the footer and replace `font-bold` + inline classes with `label-sm text-cream-200 mb-5`:

```tsx
<h4 className="label-sm text-cream-200 mb-5">Platform</h4>
```

Apply to all four column headings (Platform, Subjects, Company, Legal).

- [ ] **Step 3: Visual verify**

Navigate to any page with the footer. Confirm social icons show Twitter/LinkedIn/Instagram Lucide icons with hover gold effect. Confirm column headings look consistent.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat: upgrade Footer — real Lucide social icons, label-sm headings"
```

---

## Task 7: Home page — count-up, connector line, hero texture, CTA gradient animation

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/ui/useCountUp.ts`

- [ ] **Step 1: Create useCountUp hook**

Create `src/components/ui/useCountUp.ts`:

```typescript
import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 1500, startOnVisible = true) {
  const [count, setCount] = useState(startOnVisible ? 0 : target);
  const ref = useRef<HTMLElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!startOnVisible) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, startOnVisible]);

  return { count, ref };
}
```

- [ ] **Step 2: Apply count-up to stats section in Home page**

In `src/app/page.tsx`, add import:

```tsx
import { useCountUp } from '@/components/ui/useCountUp';
```

The `stats` array has string values like `'2,500+'`. Create a helper component above `HomePage` that renders a single animated stat:

```tsx
function AnimatedStat({ value, label }: { value: string; label: string }) {
  const numericPart = parseInt(value.replace(/[^0-9]/g, ''), 10);
  const suffix = value.replace(/[0-9,]/g, '');
  const { count, ref } = useCountUp(numericPart);
  return (
    <div className="text-center group" ref={ref as any}>
      <div className="text-3xl md:text-4xl font-display font-bold text-navy-600 dark:text-cream-200 mb-1 group-hover:text-gold-500 transition-colors duration-300">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="label-xs text-navy-300 dark:text-cream-400/60">{label}</div>
    </div>
  );
}
```

In the stats section, replace `{stat.value}` / `{stat.label}` divs with:

```tsx
{stats.map((stat, i) => (
  <AnimatedStat key={i} value={stat.value} label={stat.label} />
))}
```

- [ ] **Step 3: Add dot-grid texture to hero section**

In the hero `<section>`, after the existing `<div className="absolute inset-0 ...">` gradient div, add:

```tsx
<div className="absolute inset-0 bg-dot-grid bg-dot-grid opacity-40 pointer-events-none" />
```

- [ ] **Step 4: Animate the CTA section gradient**

Find the CTA section gradient background div:

```tsx
<div className="absolute inset-0 bg-gradient-to-br from-navy-600 via-navy-600 to-navy-500 ..." />
```

Replace with an animated version:

```tsx
<div
  className="absolute inset-0 animate-gradient-shift"
  style={{
    background: 'linear-gradient(135deg, #0A1628, #0F2847, #0A1628, #1E3A6E)',
    backgroundSize: '300% 300%',
  }}
/>
```

- [ ] **Step 5: Add connector line animation on "How It Works" step connector**

Find the connector line in the `howItWorks` section:

```tsx
<div className="hidden lg:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-gold-400/30 to-transparent" />
```

Replace with:

```tsx
<div className="hidden lg:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-gold-400/50 to-transparent animate-shimmer" />
```

- [ ] **Step 6: Visual verify**

Navigate to `http://localhost:3000`. Scroll — confirm stats count up when they enter the viewport. Confirm hero has subtle dot-grid texture. Confirm CTA section has animated gradient. Confirm connector line has shimmer effect.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components/ui/useCountUp.ts
git commit -m "feat: Home page — count-up stats, dot-grid hero, animated CTA gradient, shimmer connector"
```

---

## Task 8: Auth pages — 2-column layout with brand panel

**Files:**
- Modify: `src/app/auth/login/page.tsx`
- Modify: `src/app/auth/register/page.tsx`

- [ ] **Step 1: Read full login page**

Read `src/app/auth/login/page.tsx` in full to understand the existing form structure.

- [ ] **Step 2: Wrap login form in 2-column layout**

In `src/app/auth/login/page.tsx`, replace the outer container div:

```tsx
// Replace:
<div className="min-h-screen flex items-center justify-center bg-cream-200 dark:bg-navy-600 pt-20 pb-16 px-4">
  <div className="w-full max-w-md">
    {/* ...existing form content... */}
  </div>
</div>

// With:
<div className="min-h-screen flex bg-cream-200 dark:bg-navy-600">
  {/* Left: Brand Panel */}
  <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-navy-600 to-navy-700 flex-col justify-between p-12 relative overflow-hidden">
    <div className="absolute inset-0 bg-dot-grid bg-dot-grid opacity-30 pointer-events-none" />
    <div className="absolute bottom-0 right-0 w-64 h-64 bg-gold-400/10 rounded-full blur-3xl" />
    <div className="relative z-10">
      <Link href="/" className="inline-flex items-center gap-2 mb-16">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy-600">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/>
          </svg>
        </div>
        <span className="text-xl font-display font-bold text-cream-200">Prep<span className="text-gold-400">Pass</span></span>
      </Link>
      <h2 className="text-3xl font-display font-bold text-cream-200 mb-4 leading-tight">
        Welcome back to<br />your exam prep hub
      </h2>
      <p className="text-cream-400/60 text-sm leading-relaxed max-w-xs">
        Pick up where you left off. Your tutors, sessions, and progress are waiting.
      </p>
    </div>
    <div className="relative z-10 grid grid-cols-2 gap-4">
      {[
        { value: '2,500+', label: 'Students mentored' },
        { value: '95%', label: 'Pass rate' },
        { value: '4.9/5', label: 'Avg rating' },
        { value: '10k+', label: 'Sessions done' },
      ].map((s) => (
        <div key={s.label} className="glass-card p-4 !bg-white/5">
          <div className="text-2xl font-display font-bold text-gold-400">{s.value}</div>
          <div className="label-xs text-cream-400/50 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  </div>

  {/* Right: Form */}
  <div className="flex-1 flex items-center justify-center pt-20 pb-16 px-6">
    <div className="w-full max-w-md">
      {/* Keep all existing form content here, REMOVE the logo/link that was at the top since it's now in the brand panel */}
      {/* ...existing form content (from the original <div className="w-full max-w-md"> inward)... */}
    </div>
  </div>
</div>
```

> Keep all existing form logic (state, handlers, form fields) intact inside the right column. Only the outer layout wrapper changes.

- [ ] **Step 3: Apply same 2-column layout to register page**

Read `src/app/auth/register/page.tsx` in full, then apply the same pattern with a slightly different brand panel headline:

```tsx
// Brand panel headline for register:
<h2 className="text-3xl font-display font-bold text-cream-200 mb-4 leading-tight">
  Join thousands of<br />exam high-achievers
</h2>
<p className="text-cream-400/60 text-sm leading-relaxed max-w-xs">
  Your first session with any tutor is completely free. No credit card required.
</p>
```

- [ ] **Step 4: Visual verify**

Navigate to `http://localhost:3000/auth/login` and `http://localhost:3000/auth/register`. On desktop: confirm 2-column layout. On mobile: confirm form-only view (brand panel hidden). Confirm form still works (submit produces correct toast).

- [ ] **Step 5: Commit**

```bash
git add src/app/auth/login/page.tsx src/app/auth/register/page.tsx
git commit -m "feat: auth pages — 2-column layout with brand social-proof panel"
```

---

## Task 9: Tutors search — empty state, filter chips, shimmer loading

**Files:**
- Modify: `src/app/tutors/page.tsx`
- Modify: `src/components/tutors/TutorFilterBar.tsx`
- Modify: `src/components/tutors/HorizontalTutorCard.tsx`

- [ ] **Step 1: Read all three files in full**

Read `src/app/tutors/page.tsx`, `src/components/tutors/TutorFilterBar.tsx`, and `src/components/tutors/HorizontalTutorCard.tsx` before making changes.

- [ ] **Step 2: Upgrade empty state in tutors/page.tsx**

Find the empty-state render (when no tutors match filters) and replace it with:

```tsx
import { SearchX } from '@/components/ui/icons';

// Empty state:
<div className="col-span-full flex flex-col items-center justify-center py-24 gap-4">
  <div className="w-16 h-16 rounded-2xl bg-navy-50 dark:bg-navy-500 flex items-center justify-center">
    <SearchX size={28} className="text-navy-300 dark:text-cream-400/40" />
  </div>
  <h3 className="text-base font-bold text-navy-600 dark:text-cream-200">No tutors found</h3>
  <p className="text-sm text-navy-300 dark:text-cream-400/60 text-center max-w-xs">
    Try adjusting your filters or search term to find available tutors.
  </p>
  <button
    onClick={() => {/* call the reset-filters handler */}}
    className="btn-outline text-sm px-5 py-2.5"
  >
    Clear all filters
  </button>
</div>
```

Wire the `onClick` to whatever existing handler resets filters in the page.

- [ ] **Step 3: Upgrade TutorFilterBar — active filter chips**

In `src/components/tutors/TutorFilterBar.tsx`, add import:

```tsx
import { X } from '@/components/ui/icons';
```

After the main filter controls, add an active-filters chips row. Check which filters are active (non-default) and render a chip for each:

```tsx
{/* Active filter chips */}
{hasActiveFilters && (
  <div className="flex flex-wrap gap-2 pt-3 border-t border-navy-100/50 dark:border-navy-500/20">
    <span className="label-xs text-navy-300 dark:text-cream-400/40 self-center">Active:</span>
    {filters.subject && (
      <button
        onClick={() => onFilterChange({ ...filters, subject: '' })}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-300 text-xs font-semibold hover:bg-gold-100 transition-colors"
      >
        {SUBJECT_LABELS[filters.subject as Subject]}
        <X size={12} />
      </button>
    )}
    {/* Repeat pattern for other active filters: minPrice, maxPrice, language, country, availability */}
    <button
      onClick={onResetFilters}
      className="label-xs text-navy-400 dark:text-cream-400/40 hover:text-red-500 transition-colors self-center ml-auto"
    >
      Clear all
    </button>
  </div>
)}
```

> `hasActiveFilters` is a boolean derived from comparing `filters` to `DEFAULT_FILTERS`. `onFilterChange` and `onResetFilters` are props passed from `tutors/page.tsx` — ensure these props exist or add them.

- [ ] **Step 4: Add shimmer skeleton loading state**

In `src/app/tutors/page.tsx`, find the loading state (when `isLoading` is true). Replace any spinner with a shimmer grid:

```tsx
{isLoading && (
  <div className="grid grid-cols-1 gap-6">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="glass-card p-6 flex gap-4">
        <div className="skeleton w-20 h-20 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="skeleton h-5 w-1/3 rounded-lg" />
          <div className="skeleton h-4 w-2/3 rounded-lg" />
          <div className="skeleton h-4 w-1/2 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 5: Visual verify**

Navigate to `http://localhost:3000/tutors`. Apply a subject filter — confirm chip appears with X button. Click X — confirm filter clears. Navigate to a search with no results — confirm `SearchX` empty state. Reload the page with a slow network (DevTools throttle) — confirm shimmer appears.

- [ ] **Step 6: Commit**

```bash
git add src/app/tutors/page.tsx src/components/tutors/TutorFilterBar.tsx src/components/tutors/HorizontalTutorCard.tsx
git commit -m "feat: tutors search — SearchX empty state, active filter chips, shimmer loading"
```

---

## Task 10: Student Dashboard — tab icons, countdown, messages empty state fix, Mock Pay restyle, remove non-functional elements

**Files:**
- Modify: `src/app/dashboard/student/page.tsx`

- [ ] **Step 1: Add Lucide imports**

At the top of `src/app/dashboard/student/page.tsx`, add:

```tsx
import { LayoutDashboard, Calendar, MessageSquare, CreditCard, Gift } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
```

- [ ] **Step 2: Add icons to tabs array**

Replace the `tabs` array:

```tsx
const tabs = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'bookings', label: 'Bookings', icon: <Calendar size={16} /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare size={16} /> },
  { id: 'payments', label: 'Payments', icon: <CreditCard size={16} /> },
  { id: 'referral', label: 'Referral', icon: <Gift size={16} /> },
];
```

Update the tab button render to show the icon:

```tsx
<button
  key={tab.id}
  onClick={() => setActiveTab(tab.id)}
  className={`px-5 py-3 rounded-[18px] label-xs transition-all inline-flex items-center gap-2 justify-center ${
    activeTab === tab.id
      ? 'bg-navy-600 text-white shadow-xl scale-105'
      : 'text-navy-400 dark:text-cream-400/60 hover:text-navy-600 dark:hover:text-cream-200 hover:bg-white dark:hover:bg-navy-700/50'
  }`}
>
  {tab.icon}
  <span>{tab.label}</span>
  {tab.id === 'messages' && messageUnreadCount > 0 && (
    <span className="min-w-5 h-5 px-1 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center">
      {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
    </span>
  )}
</button>
```

- [ ] **Step 3: Add countdown badge to upcoming lessons**

Find the upcoming lesson cards in the overview tab. After the time display, add:

```tsx
{(() => {
  const minutesUntil = Math.floor((new Date(booking.scheduledAt).getTime() - Date.now()) / 60000);
  if (minutesUntil > 0 && minutesUntil <= 1440) {
    const hours = Math.floor(minutesUntil / 60);
    const mins = minutesUntil % 60;
    const label = hours > 0 ? `Starts in ${hours}h ${mins}m` : `Starts in ${mins}m`;
    return (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gold-50 dark:bg-gold-900/20 text-gold-600 dark:text-gold-400">
        {label}
      </span>
    );
  }
  return null;
})()}
```

- [ ] **Step 4: Fix messages empty state — replace "M" placeholder**

Find:

```tsx
<div className="text-4xl text-gold-400">M</div>
```

Replace with:

```tsx
<MessageSquare size={40} className="text-gold-400/60" />
```

- [ ] **Step 5: Restyle Mock Pay as dev-mode**

Find the Mock Pay button in the payments section and restyle it:

```tsx
<button
  onClick={() => void handleMockPayNow(payment.id)}
  disabled={payingPaymentId === payment.id || mockPayingId === payment.id || paypalPayingId === payment.id}
  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-200 dark:border-navy-500 px-4 py-2.5 label-xs text-navy-300 dark:text-cream-400/40 italic transition-all hover:bg-navy-50 dark:hover:bg-navy-700/30 disabled:opacity-40"
>
  {mockPayingId === payment.id ? <Spinner size="sm" /> : null}
  Mock Pay · Test only
</button>
```

- [ ] **Step 6: Visual verify**

Navigate to `http://localhost:3000/dashboard/student`. Confirm tabs show icons. Go to messages tab with no conversation selected — confirm `MessageSquare` icon replaces "M". Confirm Mock Pay looks like a dev mode button.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/student/page.tsx
git commit -m "feat: student dashboard — tab icons, countdown badge, fix messages empty state, restyle Mock Pay"
```

---

## Task 11: Checkout page — remove non-functional elements, payment method tabs, trust signals

**Files:**
- Modify: `src/app/checkout/[paymentId]/page.tsx`
- Modify: `src/components/checkout/CheckoutForm.tsx`

- [ ] **Step 1: Remove non-functional elements from checkout page**

In `src/app/checkout/[paymentId]/page.tsx`:

**Remove** the "Have a promo code?" button entirely:

```tsx
// DELETE this block:
<button className="text-xs font-bold underline text-navy-600 dark:text-cream-200 hover:text-navy-900 dark:hover:text-white transition-colors">
  Have a promo code?
</button>
```

**Remove** the review carousel prev/next buttons. Replace the entire review section with a single static review card:

```tsx
{/* Replace carousel with single static review */}
<div className="p-4 border border-navy-100 dark:border-navy-400/20 rounded-xl">
  <p className="text-sm text-navy-500 dark:text-cream-300/80 leading-relaxed">
    &quot;Very excellent tutor, very concentrated and nice when I have many questions. The price is reasonable and I feel I&apos;m improving. Highly recommend.&quot;
  </p>
  <p className="text-xs text-navy-400 dark:text-cream-400/50 mt-3 font-medium">— Verified Student</p>
</div>
```

**Add trust signals** with Lucide icons. In the right column, above the `<Elements>` block, add:

```tsx
import { ShieldCheck, Lock } from '@/components/ui/icons';

// Trust signal bar:
<div className="flex items-center gap-4 p-4 rounded-xl bg-sage-50 dark:bg-sage-900/20 border border-sage-100 dark:border-sage-800/30 mb-4">
  <ShieldCheck size={20} className="text-sage-600 dark:text-sage-400 flex-shrink-0" />
  <div>
    <p className="text-xs font-bold text-sage-700 dark:text-sage-300">SSL Secured Checkout</p>
    <p className="text-[10px] text-sage-600/70 dark:text-sage-400/60 mt-0.5">Your payment details are encrypted and never stored.</p>
  </div>
  <Lock size={16} className="text-sage-500 dark:text-sage-400 ml-auto flex-shrink-0" />
</div>
```

**Replace inline SVGs** for Students/Lessons/Hours in the tutor stats section with Lucide:

```tsx
import { Users, BookOpen, Clock } from '@/components/ui/icons';

// Students stat:
<div className="flex items-center gap-1.5">
  <Users size={18} className="text-navy-400 dark:text-cream-400/40" />
  {tutor.students || 0}
</div>

// Lessons stat:
<div className="flex items-center gap-1.5">
  <BookOpen size={18} className="text-navy-400 dark:text-cream-400/40" />
  {tutor.lessons || 0}
</div>

// Hours stat:
<div className="flex items-center gap-1.5">
  <Clock size={18} className="text-navy-400 dark:text-cream-400/40" />
  {tutor.hoursTaught || 0}
</div>
```

- [ ] **Step 2: Remove "Save this card" checkbox from CheckoutForm**

In `src/components/checkout/CheckoutForm.tsx`, remove entirely:

```tsx
// DELETE:
<div className="flex items-center gap-2 mt-4">
  <input type="checkbox" id="save-card" className="w-4 h-4 rounded border-gray-300 text-gold-500 focus:ring-gold-500" />
  <label htmlFor="save-card" className="text-sm text-navy-600 dark:text-cream-200">
    Save this card for future payments
  </label>
</div>
```

Also replace the inline spinner in the pay button with the `Spinner` component:

```tsx
import Spinner from '@/components/ui/Spinner';

// In the button:
{isLoading ? <Spinner size="sm" className="text-navy-600" /> : null}
```

- [ ] **Step 3: Visual verify**

Navigate to any checkout page (you may need to create a test booking first). Confirm: no "promo code" button, no carousel buttons, SSL trust badge visible, "Save card" checkbox gone, tutor stats show Lucide icons.

- [ ] **Step 4: Commit**

```bash
git add src/app/checkout/[paymentId]/page.tsx src/components/checkout/CheckoutForm.tsx
git commit -m "feat: checkout — remove non-functional elements, add trust signals, Lucide icons"
```

---

## Task 12: Tutor dashboard components — Lucide icons and spacing upgrades

**Files:**
- Modify: `src/app/dashboard/tutor/page.tsx`
- Modify: `src/components/dashboard/tutor/StatsOverview.tsx`
- Modify: `src/components/dashboard/tutor/ReviewsSection.tsx`
- Modify: `src/components/dashboard/tutor/CertificationStatus.tsx`

- [ ] **Step 1: Read all four files**

Read each file in full before modifying.

- [ ] **Step 2: Replace inline SVGs with Lucide throughout all four files**

For each file, add relevant Lucide imports from `@/components/ui/icons` and replace every generic inline SVG (arrows, check, star, user, award, etc.) with the Lucide equivalent at `size={20}` for card-level icons, `size={16}` for inline text icons.

Common replacements:
- Star/rating → `Star` from Lucide
- Check/verified → `Check` or `CheckCircle`
- User/students → `Users`
- Award/certification → `Award`
- TrendingUp/analytics → `TrendingUp`
- Calendar/sessions → `Calendar`
- Arrow → `ArrowRight` or `ChevronRight`

- [ ] **Step 3: Replace `text-[10px] font-black uppercase tracking-widest` with `label-xs`**

In all four files, do a find-and-replace:
- `text-[10px] font-black uppercase tracking-widest` → `label-xs`
- `text-xs font-black uppercase tracking-widest` → `label-sm`
- `text-[10px] font-bold uppercase tracking-widest` → `label-xs`

- [ ] **Step 4: Visual verify**

Navigate to `http://localhost:3000/dashboard/tutor`. Click through sub-pages. Confirm icons are Lucide, labels are consistent.

- [ ] **Step 4b: Apply same icon + label-xs/label-sm pass to PricingManager and WeeklyAvailabilityGrid**

Read `src/components/dashboard/tutor/PricingManager.tsx` and `src/components/dashboard/tutor/WeeklyAvailabilityGrid.tsx`. Apply the same substitutions:
- Inline SVGs → Lucide equivalents (DollarSign for pricing, Calendar/Clock for availability grid)
- `text-[10px] font-black uppercase tracking-widest` → `label-xs`
- `text-xs font-black uppercase tracking-widest` → `label-sm`

Add to git staging after editing both files.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/tutor/page.tsx src/components/dashboard/tutor/StatsOverview.tsx src/components/dashboard/tutor/ReviewsSection.tsx src/components/dashboard/tutor/CertificationStatus.tsx src/components/dashboard/tutor/PricingManager.tsx src/components/dashboard/tutor/WeeklyAvailabilityGrid.tsx
git commit -m "feat: tutor dashboard — Lucide icons, label-xs/label-sm consistency across all sub-components"
```

---

## Task 13: Tutor analytics — CSS/SVG bar charts

**Files:**
- Modify: `src/app/dashboard/tutor/analytics/page.tsx`

- [ ] **Step 1: Read the current analytics page**

Read `src/app/dashboard/tutor/analytics/page.tsx` in full.

- [ ] **Step 2: Add earnings bar chart component**

If the page fetches earnings data, add a bar chart using CSS flexbox bars (no library):

```tsx
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-lg bg-gold-400/80 hover:bg-gold-400 transition-all duration-300"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '4px' : '0' }}
            title={`$${d.value}`}
          />
          <span className="label-xs text-navy-300 dark:text-cream-400/40">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
```

Wire `BarChart` to real data from the existing API call. If no data exists, show empty state with `BarChart2` Lucide icon.

- [ ] **Step 3: Visual verify**

Navigate to `http://localhost:3000/dashboard/tutor/analytics`. Confirm chart renders with real or empty state.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/tutor/analytics/page.tsx
git commit -m "feat: tutor analytics — CSS/SVG bar chart, no external library"
```

---

## Task 14: Admin dashboard — sidebar navigation

**Files:**
- Modify: `src/app/dashboard/admin/page.tsx`

- [ ] **Step 1: Read the full admin page**

Read `src/app/dashboard/admin/page.tsx` in full.

- [ ] **Step 2: Replace tab bar with sidebar navigation**

Wrap the existing content in a 2-column grid layout (sidebar + content):

```tsx
import { LayoutDashboard, Users, ShieldCheck, BarChart2, Settings, Flag, Award } from '@/components/ui/icons';

const adminNav = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'users', label: 'Users', icon: <Users size={18} /> },
  { id: 'verifications', label: 'Verifications', icon: <Award size={18} /> },
  { id: 'reports', label: 'Reports', icon: <Flag size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={18} /> },
  { id: 'moderation', label: 'Moderation', icon: <ShieldCheck size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

// Layout:
<div className="flex gap-8 min-h-screen pt-24 pb-16">
  {/* Sidebar */}
  <aside className="w-56 flex-shrink-0">
    <nav className="glass-card p-2 sticky top-24 space-y-1">
      {adminNav.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === item.id
              ? 'bg-navy-600 text-white shadow-md'
              : 'text-navy-400 dark:text-cream-400/60 hover:bg-navy-50 dark:hover:bg-navy-700/30 hover:text-navy-600 dark:hover:text-cream-200'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  </aside>

  {/* Content */}
  <main className="flex-1 min-w-0">
    {/* ...existing tab content panels... */}
  </main>
</div>
```

Keep all existing tab content panels inside `<main>` — only the navigation structure changes.

- [ ] **Step 3: Visual verify**

Navigate to `http://localhost:3000/dashboard/admin`. Confirm sidebar shows on desktop. Confirm clicking sidebar items switches content correctly.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/admin/page.tsx
git commit -m "feat: admin dashboard — sidebar navigation with Lucide icons"
```

---

## Task 15: Settings page — tab structure and save states

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Read the full settings page**

Read `src/app/settings/page.tsx` in full before modifying.

- [ ] **Step 2: Add Lucide icons to settings tabs and standardize save states**

Add import:

```tsx
import { User, Lock, Bell, Globe } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
```

Ensure the settings tabs array includes icons (or add them):

```tsx
const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
  { id: 'security', label: 'Security', icon: <Lock size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'preferences', label: 'Preferences', icon: <Globe size={16} /> },
];
```

For every save/submit button in the settings page, replace any ad-hoc loading indicator with:

```tsx
{isSaving ? <Spinner size="sm" /> : null}
{isSaving ? 'Saving...' : 'Save Changes'}
```

Replace any `text-[10px] font-black uppercase tracking-widest` with `label-xs` and `text-xs font-black uppercase tracking-widest` with `label-sm`.

- [ ] **Step 3: Visual verify**

Navigate to `http://localhost:3000/settings`. Confirm tabs show icons. Trigger a save — confirm spinner appears, then success toast.

- [ ] **Step 4: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: settings — Lucide tab icons, standardized save/spinner states"
```

---

## Task 16: Tutor profile — sticky booking panel and Lucide icons

**Files:**
- Modify: `src/app/tutors/[id]/page.tsx`

- [ ] **Step 1: Read the full tutor profile page**

Read `src/app/tutors/[id]/page.tsx` in full.

- [ ] **Step 2: Make booking panel sticky on desktop**

Find the right-column booking panel element. Add `sticky top-24` to its container:

```tsx
// Find the booking panel wrapper (right column) and add sticky positioning:
<div className="lg:sticky lg:top-24 lg:self-start space-y-4">
  {/* ...existing booking panel content... */}
</div>
```

Ensure the parent layout uses `lg:items-start` so sticky works correctly:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-start">
  {/* Left content: spans 2 cols */}
  {/* Right: booking panel (sticky) */}
</div>
```

- [ ] **Step 3: Replace inline SVGs with Lucide**

Find all inline SVGs in the tutor profile page and replace:
- Star → `Star`
- Users/students → `Users`
- Clock/hours → `Clock`
- Calendar → `Calendar`
- Check → `Check`
- Globe/language → `Globe`
- Any arrow → `ChevronRight` or `ArrowRight`

Add import: `import { Star, Users, Clock, Calendar, Globe, ChevronRight } from '@/components/ui/icons';`

- [ ] **Step 4: Visual verify**

Navigate to any tutor profile (`http://localhost:3000/tutors/[id]`). On desktop, scroll down — confirm booking panel stays visible. Confirm Lucide icons render correctly.

- [ ] **Step 5: Commit**

```bash
git add src/app/tutors/[id]/page.tsx
git commit -m "feat: tutor profile — sticky booking panel, Lucide icon replacements"
```

---

## Task 17: Final global label-xs/label-sm pass and deploy check

**Files:**
- Modify: any remaining files with `text-[10px] font-black uppercase tracking-widest` or `text-xs font-black uppercase tracking-widest`

- [ ] **Step 1: Find all remaining ad-hoc label patterns**

```bash
grep -r "text-\[10px\] font-black uppercase tracking-widest" src/ --include="*.tsx" -l
grep -r "text-xs font-black uppercase tracking-widest" src/ --include="*.tsx" -l
```

- [ ] **Step 2: Replace in each file**

For each file listed, open it and replace:
- `text-[10px] font-black uppercase tracking-widest` → `label-xs`
- `text-xs font-black uppercase tracking-widest` → `label-sm`

> Do not change instances where additional classes like `text-gold-600` or `text-red-500` are appended — just replace the base typography classes within that className string.

- [ ] **Step 3: Run build to confirm no TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: `Route (app)` table printed with no errors. Note any build warnings but don't block on them.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: replace ad-hoc label patterns with label-xs/label-sm throughout"
```

- [ ] **Step 5: Push to main and verify Vercel deploy**

```bash
git push origin main
```

Navigate to the Vercel dashboard or watch the Vercel CLI. The deploy should trigger automatically. After deploy completes (~2-3 min), visit `https://prepass.vercel.app` and verify:

- [ ] Home page loads, stats animate on scroll
- [ ] Login page shows 2-column layout on desktop
- [ ] Tutors page shows shimmer on load, filter chips work
- [ ] Student dashboard tabs show icons
- [ ] Checkout page has no promo code button, no save card checkbox, SSL trust badge visible
- [ ] Dark mode toggle works across all pages
- [ ] No console errors on any page

- [ ] **Step 6: Final commit (if any hotfixes needed)**

```bash
git add -A
git commit -m "fix: post-deploy hotfixes"
git push origin main
```

---

## Summary

| Task | Scope | Key change |
|---|---|---|
| 1 | Infrastructure | Install lucide-react, create icons.ts and Spinner |
| 2 | Config | Tailwind tokens: gradient-shift, dot-grid, label plugin |
| 3 | CSS | glass-card dark upgrade, toast styles |
| 4 | UI primitives | Toaster customization, PasswordInput Lucide |
| 5 | Navbar | Active link, dropdown animations, avatar ring |
| 6 | Footer | Real social icons, label-sm headings |
| 7 | Home | Count-up stats, dot-grid, connector shimmer, CTA animation |
| 8 | Auth | 2-column layout with brand panel |
| 9 | Tutors search | Empty state, filter chips, shimmer loading |
| 10 | Student dashboard | Tab icons, countdown, messages fix, Mock Pay restyle |
| 11 | Checkout | Remove non-functional elements, trust signals |
| 12 | Tutor dashboard | Lucide icons, label consistency |
| 13 | Tutor analytics | CSS bar chart |
| 14 | Admin dashboard | Sidebar navigation |
| 15 | Settings | Tab icons, save states |
| 16 | Tutor profile | Sticky booking panel |
| 17 | Cleanup + deploy | Global label pass, push to Vercel, verify live |
