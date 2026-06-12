# Wallet + Multi-Currency + PayOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tutor-only USD wallet with payout requests, dynamic multi-currency display, proper booking refund flows (Stripe refund or StudentCredit), and PayOS VietQR checkout for Vietnamese students.

**Architecture:** All wallet mutations are atomic `prisma.$transaction(async tx => {...})` interactive transactions so booking state and wallet balance can never diverge. Currency conversion uses dynamic rates stored in `ExchangeRate` DB table, fetched from exchangerate-api.com. PayOS is a parallel checkout path to Stripe; the existing Stripe flow is untouched. Server-only currency DB functions live in `currency-server.ts` (separate from the client-safe `currency.ts`).

**Tech Stack:** Next.js 14 App Router, Prisma 5 (Neon Postgres), @payos/node, Stripe SDK v15, SWR, framer-motion, react-hot-toast, NextAuth v4

---

## File Map

### New Files
| File | Responsibility |
|---|---|
| `src/lib/currency-server.ts` | Server-only: read/refresh ExchangeRate from DB |
| `src/lib/wallet.ts` | Tutor wallet mutations (all atomic) |
| `src/lib/payos.ts` | PayOS singleton client |
| `src/contexts/CurrencyContext.tsx` | Client currency state, live rates, format helper |
| `src/components/ui/CurrencySwitcher.tsx` | Navbar currency picker dropdown |
| `src/app/api/currency/rates/route.ts` | Serve exchange rates to browser |
| `src/app/api/currency/refresh/route.ts` | Admin: trigger rate refresh from external API |
| `src/app/api/wallet/route.ts` | GET wallet balance + transactions |
| `src/app/api/wallet/payout/route.ts` | POST payout request |
| `src/app/api/wallet/bank-accounts/route.ts` | GET/POST bank accounts |
| `src/app/api/wallet/bank-accounts/[id]/route.ts` | DELETE bank account |
| `src/app/api/student/credits/route.ts` | GET student credit balance + history |
| `src/app/api/checkout/payos/route.ts` | Create PayOS payment link |
| `src/app/api/webhooks/payos/route.ts` | Handle PayOS payment confirmation webhook |
| `src/app/api/admin/payouts/route.ts` | GET all payout requests |
| `src/app/api/admin/payouts/[id]/route.ts` | PATCH payout status (approve/pay/reject) |
| `src/app/dashboard/tutor/wallet/page.tsx` | Tutor wallet page |
| `src/app/dashboard/tutor/wallet/bank-details/page.tsx` | Bank account management form |
| `src/app/dashboard/student/wallet/page.tsx` | Student credits history page |
| `src/app/dashboard/admin/payouts/page.tsx` | Admin payout management table |

### Modified Files
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add enums + 5 new models + modify User + Payment |
| `src/components/providers/Providers.tsx` | Wrap with CurrencyProvider |
| `src/app/api/bookings/[id]/route.ts` | Atomic completion + Stripe/credit refund on cancel/decline |
| `src/components/layout/Navbar.tsx` | Add CurrencySwitcher |
| `src/components/tutors/HorizontalTutorCard.tsx` | Use `useCurrency().format()` for prices |
| `src/app/tutors/[id]/page.tsx` | Use `useCurrency().format()` for prices |
| `src/app/checkout/[paymentId]/page.tsx` | Add PayOS tab + format prices |
| `src/app/dashboard/tutor/page.tsx` | Add wallet widget |
| `src/app/dashboard/student/page.tsx` | Add credits widget |

---

## Task 1: Install @payos/node and run Prisma schema migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Install the PayOS SDK**

```bash
npm install @payos/node
```

Expected: package added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Add new enums to `prisma/schema.prisma`**

Find the comment `// ─── MODELS ─────────────────────────────────────────` (around line 129) and insert these enums **before** it:

```prisma
enum WalletTransactionType {
  BOOKING_EARNING
  REFUND_CREDIT
  WITHDRAWAL_REQUEST
  WITHDRAWAL_PAID
  WITHDRAWAL_CANCELLED
  BONUS
}

enum PayoutRequestStatus {
  PENDING
  APPROVED
  PAID
  REJECTED
}

enum PaymentMethod {
  STRIPE
  PAYOS
  WALLET
  FREE
}
```

- [ ] **Step 3: Add new models at the END of `prisma/schema.prisma`** (after `model PlatformSetting`)

```prisma
// ─── WALLET SYSTEM ──────────────────────────────────

model Wallet {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  balance   Float    @default(0)
  frozen    Float    @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions WalletTransaction[]
}

model WalletTransaction {
  id              String                @id @default(cuid())
  walletId        String
  wallet          Wallet                @relation(fields: [walletId], references: [id], onDelete: Cascade)
  type            WalletTransactionType
  amount          Float
  balanceAfter    Float
  bookingId       String?
  payoutRequestId String?
  description     String
  metadata        Json?
  createdAt       DateTime              @default(now())

  @@index([walletId, createdAt])
  @@index([bookingId])
}

model PayoutRequest {
  id              String              @id @default(cuid())
  tutorId         String
  tutor           User                @relation("TutorPayoutRequests", fields: [tutorId], references: [id], onDelete: Cascade)
  amountUsd       Float
  status          PayoutRequestStatus @default(PENDING)
  bankAccountId   String?
  bankAccount     BankAccount?        @relation(fields: [bankAccountId], references: [id])
  processedById   String?
  processedBy     User?               @relation("AdminProcessedPayouts", fields: [processedById], references: [id])
  adminNote       String?
  rejectionReason String?
  processedAt     DateTime?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([tutorId, status])
  @@index([status, createdAt])
}

model BankAccount {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankName      String?
  accountNumber String?
  accountName   String?
  bankBranch    String?
  swiftCode     String?
  iban          String?
  routingNumber String?
  country       String   @default("VN")
  isPrimary     Boolean  @default(true)
  isVerified    Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  payoutRequests PayoutRequest[]

  @@index([userId])
}

// ─── EXCHANGE RATES ──────────────────────────────────

model ExchangeRate {
  currency  String   @id
  rateToUsd Float
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 4: Add relations to `model User`**

Find the `// Student Experience Relations` comment block inside `model User` and add these lines **just before** the `@@index` lines:

```prisma
  wallet              Wallet?
  bankAccounts        BankAccount[]
  tutorPayoutRequests PayoutRequest[]    @relation("TutorPayoutRequests")
  processedPayouts    PayoutRequest[]    @relation("AdminProcessedPayouts")
```

- [ ] **Step 5: Add fields to `model Payment`**

Find `model Payment` and add these fields after the existing `paidAt` field:

```prisma
  currency           String        @default("USD")
  exchangeRate       Float         @default(1)
  paymentMethod      PaymentMethod @default(STRIPE)
  payosOrderCode     String?
  stripeRefundFailed Boolean       @default(false)
```

- [ ] **Step 6: Run the migration**

```bash
npx prisma migrate dev --name add_wallet_multicurrency_payos
```

Expected output ends with: `✔ Generated Prisma Client`

- [ ] **Step 7: Verify Prisma client types are available**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add wallet, exchange rate, PayOS schema"
```

---

## Task 2: Create server-only currency DB functions

**Files:**
- Create: `src/lib/currency-server.ts`

- [ ] **Step 1: Create `src/lib/currency-server.ts`**

```typescript
import prisma from '@/lib/prisma';
import { CURRENCY_META } from '@/lib/currency';

export async function getExchangeRatesFromDb(): Promise<Record<string, number>> {
  const rates = await prisma.exchangeRate.findMany();
  const map: Record<string, number> = { USD: 1 };
  for (const r of rates) {
    map[r.currency] = r.rateToUsd;
  }
  return map;
}

export async function refreshExchangeRates(): Promise<void> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) throw new Error('EXCHANGE_RATE_API_KEY not set');

  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);

  const data = await res.json();
  const apiRates = data.conversion_rates as Record<string, number>;

  const currencies = Object.keys(CURRENCY_META).filter(c => c !== 'USD');

  await prisma.$transaction(
    currencies.map(currency =>
      prisma.exchangeRate.upsert({
        where: { currency },
        update: { rateToUsd: apiRates[currency] ?? CURRENCY_META[currency as keyof typeof CURRENCY_META].usdRate },
        create: { currency, rateToUsd: apiRates[currency] ?? CURRENCY_META[currency as keyof typeof CURRENCY_META].usdRate },
      })
    )
  );
}
```

- [ ] **Step 2: Create currency API routes — `src/app/api/currency/rates/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getExchangeRatesFromDb } from '@/lib/currency-server';

export const revalidate = 3600;

export async function GET() {
  try {
    const rates = await getExchangeRatesFromDb();
    return NextResponse.json({ rates });
  } catch {
    return NextResponse.json({ rates: { USD: 1 } });
  }
}
```

- [ ] **Step 3: Create `src/app/api/currency/refresh/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { refreshExchangeRates } from '@/lib/currency-server';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await refreshExchangeRates();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/currency-server.ts src/app/api/currency/
git commit -m "feat: add currency-server DB functions and rates API routes"
```

---

## Task 3: CurrencyContext + Providers wiring

**Files:**
- Create: `src/contexts/CurrencyContext.tsx`
- Modify: `src/components/providers/Providers.tsx`

- [ ] **Step 1: Create `src/contexts/CurrencyContext.tsx`**

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getCurrencyForLocation,
  convertAmount,
  formatMoney,
  roundCurrencyAmount,
  CURRENCY_META,
  type CurrencyCode,
} from '@/lib/currency';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  rates: Record<string, number>;
  convert: (usdAmount: number) => number;
  format: (usdAmount: number) => string;
  symbol: string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  rates: { USD: 1 },
  convert: v => v,
  format: v => `$${v.toFixed(2)}`,
  symbol: '$',
  isLoading: true,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('preferred_currency') as CurrencyCode | null;
    const detected = saved || getCurrencyForLocation({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setCurrencyState(detected as CurrencyCode);

    fetch('/api/currency/rates')
      .then(r => r.json())
      .then(data => { if (data.rates) setRates(data.rates); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem('preferred_currency', code);
  };

  const convert = (usdAmount: number) =>
    roundCurrencyAmount(convertAmount(usdAmount, 'USD', currency), currency);

  const format = (usdAmount: number) =>
    formatMoney(convert(usdAmount), currency);

  const meta = CURRENCY_META[currency];
  const symbol = new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(0).replace(/[\d,.\s]/g, '').trim();

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convert, format, symbol, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
```

- [ ] **Step 2: Add CurrencyProvider to `src/components/providers/Providers.tsx`**

Add the import at the top:
```typescript
import { CurrencyProvider } from '@/contexts/CurrencyContext';
```

Wrap `{children}` with `CurrencyProvider` inside the existing `ThemeProvider`:
```tsx
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <CurrencyProvider>
          <Toaster ... />
          {children}
        </CurrencyProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/CurrencyContext.tsx src/components/providers/Providers.tsx
git commit -m "feat: add CurrencyContext with live DB rates"
```

---

## Task 4: CurrencySwitcher component + Navbar integration

**Files:**
- Create: `src/components/ui/CurrencySwitcher.tsx`
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Create `src/components/ui/CurrencySwitcher.tsx`**

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CURRENCY_META, type CurrencyCode } from '@/lib/currency';

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', VND: '🇻🇳', JPY: '🇯🇵',
  AUD: '🇦🇺', CAD: '🇨🇦', SGD: '🇸🇬', KRW: '🇰🇷', CNY: '🇨🇳',
  HKD: '🇭🇰', INR: '🇮🇳', THB: '🇹🇭', MYR: '🇲🇾', IDR: '🇮🇩',
  PHP: '🇵🇭', CHF: '🇨🇭', AED: '🇦🇪', SAR: '🇸🇦', NZD: '🇳🇿',
  MXN: '🇲🇽', BRL: '🇧🇷', QAR: '🇶🇦', KWD: '🇰🇼', BHD: '🇧🇭',
  OMR: '🇴🇲', ARS: '🇦🇷',
};

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currencies = Object.keys(CURRENCY_META) as CurrencyCode[];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(201,168,76,0.25)',
          background: 'rgba(201,168,76,0.08)',
          color: '#C9A84C',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{CURRENCY_FLAGS[currency] ?? '💱'}</span>
        <span>{currency}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 9999,
            background: '#0A1628',
            border: '1px solid rgba(30,58,110,0.5)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            minWidth: '220px',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '6px',
          }}
        >
          {currencies.map(code => (
            <button
              key={code}
              onClick={() => { setCurrency(code); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                background: code === currency ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: code === currency ? '#C9A84C' : '#F5F0E8',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>{CURRENCY_FLAGS[code] ?? '💱'}</span>
              <span style={{ fontWeight: 600 }}>{code}</span>
              <span style={{ opacity: 0.6, fontSize: '12px' }}>
                {new Intl.DisplayNames(['en'], { type: 'currency' }).of(code)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add CurrencySwitcher to `src/components/layout/Navbar.tsx`**

Add import at the top of the file:
```typescript
import CurrencySwitcher from '@/components/ui/CurrencySwitcher';
```

Find the area in the JSX where the notification bell (`Bell`) and user avatar icons are rendered for logged-in users and add `<CurrencySwitcher />` immediately before the bell icon:

```tsx
{session?.user && (
  <>
    <CurrencySwitcher />
    {/* existing Bell / favorites / avatar buttons */}
  </>
)}
```

For logged-out users, add it alongside the existing sign-in button area as well (currency should be visible to everyone browsing tutor listings).

- [ ] **Step 3: Start dev server and verify the switcher appears in the Navbar**

```bash
npm run dev
```

Open `http://localhost:3000` — confirm the currency pill (e.g. 🇻🇳 VND or 🇺🇸 USD depending on your timezone) appears in the Navbar. Click it — confirm dropdown opens with all currencies. Select EUR — confirm it saves and shows 🇪🇺 EUR.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/CurrencySwitcher.tsx src/components/layout/Navbar.tsx
git commit -m "feat: add CurrencySwitcher to Navbar"
```

---

## Task 5: Fix booking cancellation and decline refund flows

**Files:**
- Modify: `src/app/api/bookings/[id]/route.ts`

- [ ] **Step 1: Add imports at the top of `src/app/api/bookings/[id]/route.ts`**

```typescript
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
```

(`prisma` is already imported as default — ensure the import is `import prisma from '@/lib/prisma'`, not a named import.)

- [ ] **Step 2: Replace the `cancel` action block**

Find the `if (action === 'cancel')` block and replace it entirely with:

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

  const payment = booking.payment;
  const now = new Date();
  const ops: Parameters<typeof prisma.$transaction>[0] extends (tx: any) => any ? never : any[] = [
    prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED', cancelledAt: now } }),
    prisma.bookingEvent.create({
      data: { bookingId: booking.id, eventType: 'BOOKING_CANCELLED', title: 'Booking cancelled',
        details: `${isTutorOwner ? 'Tutor' : 'Student'} cancelled the session.` },
    }),
  ];

  let isStipeRefund = false;

  if (payment && payment.amount > 0 && payment.status === 'CAPTURED') {
    const isStripePayment = payment.paymentMethod === 'STRIPE' || !payment.paymentMethod;
    if (isStripePayment && hoursUntilSession > CANCEL_THRESHOLD_HOURS) {
      isStipeRefund = true;
    } else {
      // Store credit refund (PayOS payments or last-minute)
      ops.push(
        prisma.studentCredit.create({
          data: {
            studentId: booking.studentId,
            amount: payment.amount,
            source: 'REFUND',
          },
        })
      );
    }
    ops.push(
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED', refundedAmount: payment.amount, refundedAt: now, refundReason: 'Booking cancelled' },
      })
    );
  }

  const [updatedBooking] = await prisma.$transaction(ops);

  // Stripe refund happens AFTER DB transaction commits
  if (isStipeRefund && payment?.stripePaymentIntentId && stripe) {
    try {
      await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
    } catch (err) {
      console.error('Stripe refund failed for payment', payment.id, err);
      await prisma.payment.update({
        where: { id: payment!.id },
        data: { stripeRefundFailed: true },
      }).catch(() => {});
    }
  }

  await createInAppNotification({
    userId: isTutorOwner ? booking.studentId : booking.tutorProfile.userId,
    preferenceType: 'SESSION_UPDATES',
    type: 'BOOKING_CANCELLED',
    title: 'Session cancelled',
    body: `Your session has been cancelled.${payment?.amount ? ' A refund has been issued.' : ''}`,
    link: isTutorOwner ? '/dashboard/student?tab=bookings' : '/dashboard/tutor?tab=sessions',
  });

  return NextResponse.json({ data: updatedBooking, message: 'Booking cancelled successfully' });
}
```

- [ ] **Step 3: Replace the `decline` action block**

Find the `if (action === 'decline')` block and replace it entirely with:

```typescript
if (action === 'decline') {
  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
    return NextResponse.json({ error: 'This booking can no longer be declined' }, { status: 400 });
  }

  const now = new Date();
  const payment = booking.payment;

  const ops: any[] = [
    prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED', cancelledAt: now } }),
    prisma.bookingEvent.create({
      data: { bookingId: booking.id, eventType: 'BOOKING_DECLINED', title: 'Booking declined',
        details: `${booking.tutorProfile.user.name} declined the booking request.` },
    }),
  ];

  if (payment && payment.amount > 0 && payment.status !== 'REFUNDED') {
    ops.push(
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED', refundedAmount: payment.amount, refundedAt: now, refundReason: 'Tutor declined the booking request' },
      })
    );
  }

  const [updatedBooking] = await prisma.$transaction(ops);

  // Stripe refund for declined bookings — always refund to card
  if (payment?.stripePaymentIntentId && payment.status === 'CAPTURED' && stripe) {
    try {
      await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
    } catch (err) {
      console.error('Stripe refund failed for declined booking', payment.id, err);
      await prisma.payment.update({
        where: { id: payment.id },
        data: { stripeRefundFailed: true },
      }).catch(() => {});
    }
  }

  await createInAppNotification({
    userId: booking.studentId,
    preferenceType: 'SESSION_UPDATES',
    type: 'BOOKING_DECLINED',
    title: 'Booking request declined',
    body: payment?.amount
      ? `${booking.tutorProfile.user.name} declined your booking. A refund has been issued.`
      : `${booking.tutorProfile.user.name} declined your booking request.`,
    link: '/dashboard/student?tab=bookings',
  });

  return NextResponse.json({ data: updatedBooking, message: 'Booking declined and student notified.' });
}
```

- [ ] **Step 4: Ensure `booking` query includes `payment.paymentMethod`**

The `prisma.booking.findUnique` at the top of the route includes `payment: true`. Since we added `paymentMethod` as a new field on `Payment`, it is automatically included. No query changes needed.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/bookings/[id]/route.ts
git commit -m "fix: add actual Stripe refunds and StudentCredit on booking cancel/decline"
```

---

## Task 6: Create wallet service

**Files:**
- Create: `src/lib/wallet.ts`

- [ ] **Step 1: Create `src/lib/wallet.ts`**

```typescript
import prisma from '@/lib/prisma';
import { WalletTransactionType, Prisma } from '@prisma/client';

export const MINIMUM_PAYOUT_USD = 50;
export const PLATFORM_COMMISSION_RATE = 0.20;

export async function getOrCreateWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0, frozen: 0 },
  });
}

export async function creditWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  type: WalletTransactionType,
  description: string,
  metadata?: Record<string, unknown>
) {
  const wallet = await tx.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0, frozen: 0 },
  });
  const newBalance = wallet.balance + amount;

  await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });
  return tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type,
      amount,
      balanceAfter: newBalance,
      description,
      metadata: metadata ?? undefined,
    },
  });
}

export async function freezeFundsForPayout(
  userId: string,
  amount: number,
  payoutRequestId: string
) {
  return prisma.$transaction(async tx => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');
    const available = wallet.balance - wallet.frozen;
    if (available < amount) throw new Error('Insufficient available balance');

    await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount }, frozen: { increment: amount } },
    });
    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.WITHDRAWAL_REQUEST,
        amount: -amount,
        balanceAfter: wallet.balance - amount,
        description: `Withdrawal request of $${amount.toFixed(2)} USD pending approval`,
        payoutRequestId,
      },
    });
  });
}

export async function completePayout(
  userId: string,
  amount: number,
  payoutRequestId: string
) {
  return prisma.$transaction(async tx => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');

    await tx.wallet.update({ where: { userId }, data: { frozen: { decrement: amount } } });
    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.WITHDRAWAL_PAID,
        amount: -amount,
        balanceAfter: wallet.balance,
        description: `Withdrawal of $${amount.toFixed(2)} USD confirmed paid`,
        payoutRequestId,
      },
    });
  });
}

export async function cancelPayout(
  userId: string,
  amount: number,
  payoutRequestId: string
) {
  return prisma.$transaction(async tx => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');

    await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amount }, frozen: { decrement: amount } },
    });
    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.WITHDRAWAL_CANCELLED,
        amount,
        balanceAfter: wallet.balance + amount,
        description: `Withdrawal cancelled — $${amount.toFixed(2)} returned to balance`,
        payoutRequestId,
      },
    });
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/wallet.ts
git commit -m "feat: add wallet service with atomic credit/freeze/payout functions"
```

---

## Task 7: Make booking completion atomic with wallet credit

**Files:**
- Modify: `src/app/api/bookings/[id]/route.ts`

- [ ] **Step 1: Add wallet import to `src/app/api/bookings/[id]/route.ts`**

```typescript
import { creditWallet } from '@/lib/wallet';
import { WalletTransactionType } from '@prisma/client';
```

- [ ] **Step 2: Replace the `complete` action block**

Find the block starting with `if (booking.status === 'COMPLETED')` (the complete action at the bottom of the route) and replace it:

```typescript
// action === 'complete'
if (booking.status === 'COMPLETED') {
  return NextResponse.json({ error: 'Booking is already completed' }, { status: 400 });
}

const payment = booking.payment;
const now = new Date();

await prisma.$transaction(async tx => {
  await tx.booking.update({
    where: { id: booking.id },
    data: { status: 'COMPLETED', completedAt: now },
  });

  if (payment && payment.tutorPayout > 0) {
    await tx.payment.update({
      where: { id: payment.id },
      data: { payoutStatus: 'PAID', payoutAt: now },
    });

    await creditWallet(
      tx,
      booking.tutorProfile.userId,
      payment.tutorPayout,
      WalletTransactionType.BOOKING_EARNING,
      `Earned from session on ${booking.scheduledAt.toLocaleDateString()}`,
      { bookingId: booking.id, platformFee: payment.platformFee }
    );
  }

  await tx.bookingEvent.create({
    data: {
      bookingId: booking.id,
      eventType: 'SESSION_COMPLETED',
      title: 'Session completed',
      details: `Tutor marked the session with ${booking.student.name} as completed.`,
    },
  });
});

await createInAppNotification({
  userId: booking.studentId,
  preferenceType: 'SESSION_UPDATES',
  type: 'SESSION_COMPLETED',
  title: 'Your session is complete',
  body: `Your lesson with ${booking.tutorProfile.user.name} has been marked as completed. You can now leave a review.`,
  link: '/dashboard/student?tab=bookings',
});

return NextResponse.json({
  message: 'Session marked as complete. The student can now leave a review.',
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/bookings/[id]/route.ts
git commit -m "feat: atomic booking completion with tutor wallet credit"
```

---

## Task 8: Wallet API routes

**Files:**
- Create: `src/app/api/wallet/route.ts`
- Create: `src/app/api/wallet/payout/route.ts`
- Create: `src/app/api/wallet/bank-accounts/route.ts`
- Create: `src/app/api/wallet/bank-accounts/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/wallet/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const page = parseInt(new URL(request.url).searchParams.get('page') ?? '1');
  const limit = 20;

  const [wallet, transactions, total] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.walletTransaction.findMany({
      where: { wallet: { userId } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.walletTransaction.count({ where: { wallet: { userId } } }),
  ]);

  return NextResponse.json({
    balance: wallet?.balance ?? 0,
    frozen: wallet?.frozen ?? 0,
    available: (wallet?.balance ?? 0) - (wallet?.frozen ?? 0),
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
```

- [ ] **Step 2: Create `src/app/api/wallet/payout/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { freezeFundsForPayout, MINIMUM_PAYOUT_USD } from '@/lib/wallet';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'TUTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { amountUsd, bankAccountId } = await request.json();
  const userId = (session.user as any).id;

  if (!amountUsd || amountUsd < MINIMUM_PAYOUT_USD) {
    return NextResponse.json({ error: `Minimum withdrawal is $${MINIMUM_PAYOUT_USD}` }, { status: 400 });
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  const available = (wallet?.balance ?? 0) - (wallet?.frozen ?? 0);
  if (available < amountUsd) {
    return NextResponse.json({ error: 'Insufficient available balance' }, { status: 400 });
  }

  const existing = await prisma.payoutRequest.findFirst({
    where: { tutorId: userId, status: 'PENDING' },
  });
  if (existing) {
    return NextResponse.json({ error: 'You already have a pending withdrawal request' }, { status: 400 });
  }

  const payoutRequest = await prisma.payoutRequest.create({
    data: { tutorId: userId, amountUsd, bankAccountId: bankAccountId ?? null, status: 'PENDING' },
  });

  await freezeFundsForPayout(userId, amountUsd, payoutRequest.id);

  return NextResponse.json({ success: true, payoutRequest });
}
```

- [ ] **Step 3: Create `src/app/api/wallet/bank-accounts/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const accounts = await prisma.bankAccount.findMany({
    where: { userId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'TUTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const { country = 'VN', bankName, accountNumber, accountName, bankBranch,
          swiftCode, iban, routingNumber, isPrimary = true } = body;

  if (country === 'VN') {
    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: 'Bank name, account number, and account name are required for VN accounts' }, { status: 400 });
    }
  } else {
    if (!accountName) {
      return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
    }
  }

  if (isPrimary) {
    await prisma.bankAccount.updateMany({ where: { userId }, data: { isPrimary: false } });
  }

  const account = await prisma.bankAccount.create({
    data: { userId, country, bankName, accountNumber, accountName, bankBranch,
            swiftCode, iban, routingNumber, isPrimary },
  });
  return NextResponse.json({ account }, { status: 201 });
}
```

- [ ] **Step 4: Create `src/app/api/wallet/bank-accounts/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const account = await prisma.bankAccount.findFirst({ where: { id: params.id, userId } });
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const pendingPayout = await prisma.payoutRequest.findFirst({
    where: { bankAccountId: params.id, status: 'PENDING' },
  });
  if (pendingPayout) {
    return NextResponse.json({ error: 'Cannot delete a bank account with a pending payout request' }, { status: 400 });
  }

  await prisma.bankAccount.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/wallet/
git commit -m "feat: add wallet balance, payout, and bank account API routes"
```

---

## Task 9: Admin payout management API

**Files:**
- Create: `src/app/api/admin/payouts/route.ts`
- Create: `src/app/api/admin/payouts/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/admin/payouts/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payouts = await prisma.payoutRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tutor: { select: { id: true, name: true, email: true } },
      bankAccount: true,
      processedBy: { select: { name: true } },
    },
  });
  return NextResponse.json({ payouts });
}
```

- [ ] **Step 2: Create `src/app/api/admin/payouts/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { completePayout, cancelPayout } from '@/lib/wallet';
import { createInAppNotification } from '@/lib/in-app-notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminId = (session.user as any).id;
  const { status, adminNote, rejectionReason } = await request.json();

  const payout = await prisma.payoutRequest.findUnique({
    where: { id: params.id },
    include: { tutor: { select: { id: true, name: true } } },
  });
  if (!payout) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (payout.status === 'PAID' || payout.status === 'REJECTED') {
    return NextResponse.json({ error: 'This request has already been processed' }, { status: 400 });
  }

  const now = new Date();

  if (status === 'PAID') {
    await prisma.payoutRequest.update({
      where: { id: params.id },
      data: { status: 'PAID', processedById: adminId, adminNote, processedAt: now },
    });
    await completePayout(payout.tutorId, payout.amountUsd, payout.id);
    await createInAppNotification({
      userId: payout.tutorId,
      preferenceType: 'SESSION_UPDATES',
      type: 'PAYOUT_PAID',
      title: 'Withdrawal confirmed',
      body: `Your withdrawal of $${payout.amountUsd.toFixed(2)} has been sent.`,
      link: '/dashboard/tutor/wallet',
    });
  } else if (status === 'REJECTED') {
    await prisma.payoutRequest.update({
      where: { id: params.id },
      data: { status: 'REJECTED', processedById: adminId, rejectionReason, processedAt: now },
    });
    await cancelPayout(payout.tutorId, payout.amountUsd, payout.id);
    await createInAppNotification({
      userId: payout.tutorId,
      preferenceType: 'SESSION_UPDATES',
      type: 'PAYOUT_REJECTED',
      title: 'Withdrawal request rejected',
      body: `Your withdrawal of $${payout.amountUsd.toFixed(2)} was rejected. Funds returned to your balance.`,
      link: '/dashboard/tutor/wallet',
    });
  } else if (status === 'APPROVED') {
    await prisma.payoutRequest.update({
      where: { id: params.id },
      data: { status: 'APPROVED', processedById: adminId, adminNote },
    });
  } else {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/payouts/
git commit -m "feat: add admin payout management API routes"
```

---

## Task 10: PayOS client + checkout route

**Files:**
- Create: `src/lib/payos.ts`
- Create: `src/app/api/checkout/payos/route.ts`

- [ ] **Step 1: Create `src/lib/payos.ts`**

```typescript
import PayOS from '@payos/node';

export const payos =
  process.env.PAYOS_CLIENT_ID &&
  process.env.PAYOS_API_KEY &&
  process.env.PAYOS_CHECKSUM_KEY
    ? new PayOS(
        process.env.PAYOS_CLIENT_ID,
        process.env.PAYOS_API_KEY,
        process.env.PAYOS_CHECKSUM_KEY
      )
    : null;

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  );
}
```

- [ ] **Step 2: Create `src/app/api/checkout/payos/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { payos, getAppUrl } from '@/lib/payos';
import { getExchangeRatesFromDb } from '@/lib/currency-server';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!payos) return NextResponse.json({ error: 'PayOS not configured' }, { status: 503 });

  const { paymentId } = await request.json();
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      OR: [
        { booking: { studentId: (session.user as any).id } },
        { package: { studentId: (session.user as any).id } },
      ],
    },
  });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  if (payment.status === 'CAPTURED') {
    return NextResponse.json({ error: 'Payment already captured' }, { status: 400 });
  }

  const rates = await getExchangeRatesFromDb();
  const vndRate = rates['VND'] ?? 25400;
  const amountVnd = Math.round(payment.amount * vndRate);

  // 9-digit order code — lower collision risk than 8-digit
  const orderCode = parseInt(Date.now().toString().slice(-9));
  const appUrl = getAppUrl();

  const payosPayment = await payos.createPaymentLink({
    orderCode,
    amount: amountVnd,
    description: 'TutorMarket booking',
    returnUrl: `${appUrl}/checkout/success?paymentId=${paymentId}`,
    cancelUrl: `${appUrl}/checkout/cancel?paymentId=${paymentId}`,
  });

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      payosOrderCode: orderCode.toString(),
      currency: 'VND',
      exchangeRate: vndRate,
      paymentMethod: 'PAYOS',
    },
  });

  return NextResponse.json({
    checkoutUrl: payosPayment.checkoutUrl,
    qrCode: (payosPayment as any).qrCode ?? null,
    orderCode,
    amountVnd,
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/payos.ts src/app/api/checkout/payos/
git commit -m "feat: add PayOS client and checkout route"
```

---

## Task 11: PayOS webhook handler

**Files:**
- Create: `src/app/api/webhooks/payos/route.ts`

- [ ] **Step 1: Create `src/app/api/webhooks/payos/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { payos } from '@/lib/payos';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  if (!payos) return NextResponse.json({ error: 'PayOS not configured' }, { status: 503 });

  const body = await request.json();

  let isValid = false;
  try {
    isValid = payos.verifyPaymentWebhookData(body);
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const { orderCode, code } = body.data ?? {};

  if (code === '00' && orderCode) {
    const payment = await prisma.payment.findFirst({
      where: { payosOrderCode: orderCode.toString() },
      include: { booking: true, package: true },
    });

    if (payment && payment.status === 'PENDING') {
      await prisma.$transaction(async tx => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'CAPTURED', paidAt: new Date() },
        });
        if (payment.booking) {
          await tx.booking.update({
            where: { id: payment.booking.id },
            data: { status: 'CONFIRMED', confirmedAt: new Date() },
          });
        }
      });
    }
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/payos/
git commit -m "feat: add PayOS payment confirmation webhook"
```

---

## Task 12: Update checkout page with PayOS tab

**Files:**
- Modify: `src/app/checkout/[paymentId]/page.tsx`

- [ ] **Step 1: Add PayOS state and imports**

At the top of `src/app/checkout/[paymentId]/page.tsx`, add these imports alongside the existing ones:

```typescript
import { useCurrency } from '@/contexts/CurrencyContext';
```

Inside the `CheckoutPage` component, add state for PayOS and currency:

```typescript
const { currency, format } = useCurrency();
const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'payos'>('stripe');
const [payosData, setPayosData] = useState<{
  checkoutUrl: string;
  qrCode: string | null;
  amountVnd: number;
} | null>(null);
const [payosLoading, setPayosLoading] = useState(false);
```

- [ ] **Step 2: Add a function to initialize PayOS**

Inside the component, before the return statement:

```typescript
async function initPayos() {
  setPayosLoading(true);
  try {
    const res = await fetch('/api/checkout/payos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: params.paymentId }),
    });
    const data = await res.json();
    if (data.error) { toast.error(data.error); return; }
    setPayosData(data);
  } catch {
    toast.error('Failed to initialize PayOS payment.');
  } finally {
    setPayosLoading(false);
  }
}
```

- [ ] **Step 3: Add payment method tab toggle + PayOS panel to the JSX**

In the JSX, after the loading check and before the `<Elements>` stripe wrapper, add a payment method selector:

```tsx
{/* Payment method selector */}
<div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
  <button
    onClick={() => setPaymentMethod('stripe')}
    style={{
      padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
      background: paymentMethod === 'stripe' ? '#C9A84C' : 'rgba(201,168,76,0.1)',
      color: paymentMethod === 'stripe' ? '#0A1628' : '#C9A84C',
      fontWeight: 600, fontSize: '14px',
    }}
  >
    💳 Card (Stripe)
  </button>
  <button
    onClick={() => { setPaymentMethod('payos'); if (!payosData) initPayos(); }}
    style={{
      padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
      background: paymentMethod === 'payos' ? '#C9A84C' : 'rgba(201,168,76,0.1)',
      color: paymentMethod === 'payos' ? '#0A1628' : '#C9A84C',
      fontWeight: 600, fontSize: '14px',
    }}
  >
    🏦 VietQR (PayOS)
  </button>
</div>

{/* Stripe panel */}
{paymentMethod === 'stripe' && clientSecret && (
  <Elements stripe={stripePromise} options={{ clientSecret }}>
    <CheckoutForm paymentId={params.paymentId} amount={checkoutData?.amount} />
  </Elements>
)}

{/* PayOS panel */}
{paymentMethod === 'payos' && (
  <div style={{ textAlign: 'center', padding: '20px 0' }}>
    {payosLoading && <p style={{ color: '#C9A84C' }}>Generating QR code...</p>}
    {payosData && (
      <>
        <p style={{ color: '#F5F0E8', marginBottom: '12px' }}>
          Amount: <strong style={{ color: '#C9A84C' }}>
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payosData.amountVnd)}
          </strong>
        </p>
        {payosData.qrCode && (
          <img src={payosData.qrCode} alt="VietQR" style={{ width: 220, height: 220, borderRadius: '12px' }} />
        )}
        <div style={{ marginTop: '16px' }}>
          <a href={payosData.checkoutUrl} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-block', padding: '12px 28px', borderRadius: '8px',
              background: '#C9A84C', color: '#0A1628', fontWeight: 700, textDecoration: 'none',
            }}
          >
            Open PayOS →
          </a>
        </div>
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Update price display to use `format()`**

Find any hardcoded price display in the checkout page (e.g. `${checkoutData?.amount}`) and replace with `format(checkoutData?.amount ?? 0)`.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/checkout/[paymentId]/page.tsx
git commit -m "feat: add PayOS VietQR tab to checkout page"
```

---

## Task 13: Tutor wallet page

**Files:**
- Create: `src/app/dashboard/tutor/wallet/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/tutor/wallet/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'react-hot-toast';
import { formatMoney } from '@/lib/currency';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TRANSACTION_ICONS: Record<string, string> = {
  BOOKING_EARNING: '↑',
  REFUND_CREDIT: '↩',
  WITHDRAWAL_REQUEST: '↓',
  WITHDRAWAL_PAID: '↓',
  WITHDRAWAL_CANCELLED: '↩',
  BONUS: '★',
};

const TRANSACTION_COLORS: Record<string, string> = {
  BOOKING_EARNING: '#22c55e',
  REFUND_CREDIT: '#3b82f6',
  WITHDRAWAL_REQUEST: '#f59e0b',
  WITHDRAWAL_PAID: '#ef4444',
  WITHDRAWAL_CANCELLED: '#22c55e',
  BONUS: '#C9A84C',
};

export default function TutorWalletPage() {
  const { format, currency } = useCurrency();
  const [page, setPage] = useState(1);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const { data: walletData, mutate } = useSWR(`/api/wallet?page=${page}`, fetcher);
  const { data: bankData } = useSWR('/api/wallet/bank-accounts', fetcher);

  const available = walletData?.available ?? 0;
  const frozen = walletData?.frozen ?? 0;
  const balance = walletData?.balance ?? 0;
  const banks = bankData?.accounts ?? [];

  async function handlePayoutSubmit() {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount < 50) { toast.error('Minimum withdrawal is $50'); return; }
    if (!selectedBankId) { toast.error('Please select a bank account'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: amount, bankAccountId: selectedBankId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Withdrawal request submitted!');
      setShowPayoutModal(false);
      setPayoutAmount('');
      mutate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ color: '#F5F0E8', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        My Wallet
      </h1>

      {/* Balance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
          border: '1px solid rgba(201,168,76,0.3)', borderRadius: '16px', padding: '24px',
        }}>
          <div style={{ color: '#C9A84C', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            💰 AVAILABLE BALANCE
          </div>
          <div style={{ color: '#F5F0E8', fontSize: '32px', fontWeight: 700 }}>
            {formatMoney(available, 'USD')}
          </div>
          {currency !== 'USD' && (
            <div style={{ color: '#8899aa', fontSize: '14px', marginTop: '4px' }}>
              ≈ {format(available)}
            </div>
          )}
          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={available < 50}
            style={{
              marginTop: '16px', padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: available >= 50 ? '#C9A84C' : 'rgba(201,168,76,0.2)',
              color: available >= 50 ? '#0A1628' : 'rgba(201,168,76,0.5)',
              fontWeight: 700, cursor: available >= 50 ? 'pointer' : 'not-allowed', fontSize: '14px',
            }}
          >
            {available < 50 ? `Min. $50 to withdraw` : 'Request Withdrawal'}
          </button>
        </div>

        <div style={{
          background: 'rgba(30,58,110,0.2)', border: '1px solid rgba(30,58,110,0.4)',
          borderRadius: '16px', padding: '24px',
        }}>
          <div style={{ color: '#8899aa', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            🔒 FROZEN (PENDING WITHDRAWAL)
          </div>
          <div style={{ color: '#F5F0E8', fontSize: '32px', fontWeight: 700 }}>
            {formatMoney(frozen, 'USD')}
          </div>
          {currency !== 'USD' && (
            <div style={{ color: '#8899aa', fontSize: '14px', marginTop: '4px' }}>
              ≈ {format(frozen)}
            </div>
          )}
          <div style={{ color: '#8899aa', fontSize: '13px', marginTop: '16px' }}>
            Awaiting admin approval
          </div>
        </div>
      </div>

      {/* Bank accounts link */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/dashboard/tutor/wallet/bank-details"
          style={{ color: '#C9A84C', fontSize: '14px', textDecoration: 'none', fontWeight: 600 }}
        >
          ⚙ Manage Bank Accounts →
        </Link>
      </div>

      {/* Transaction History */}
      <h2 style={{ color: '#F5F0E8', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
        Transaction History
      </h2>

      {!walletData && <p style={{ color: '#8899aa' }}>Loading...</p>}

      {walletData?.transactions?.length === 0 && (
        <p style={{ color: '#8899aa' }}>No transactions yet. Complete sessions to earn.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {walletData?.transactions?.map((tx: any) => (
          <div key={tx.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderRadius: '10px',
            background: 'rgba(30,58,110,0.15)', border: '1px solid rgba(30,58,110,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: `${TRANSACTION_COLORS[tx.type]}20`,
                color: TRANSACTION_COLORS[tx.type],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '16px',
              }}>
                {TRANSACTION_ICONS[tx.type] ?? '•'}
              </span>
              <div>
                <div style={{ color: '#F5F0E8', fontSize: '14px', fontWeight: 500 }}>
                  {tx.description}
                </div>
                <div style={{ color: '#8899aa', fontSize: '12px' }}>
                  {new Date(tx.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                color: tx.amount >= 0 ? '#22c55e' : '#ef4444',
                fontWeight: 700, fontSize: '15px',
              }}>
                {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount, 'USD')}
              </div>
              <div style={{ color: '#8899aa', fontSize: '12px' }}>
                Balance: {formatMoney(tx.balanceAfter, 'USD')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {walletData?.pagination?.pages > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'center' }}>
          {Array.from({ length: walletData.pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: p === page ? '#C9A84C' : 'rgba(201,168,76,0.1)',
              color: p === page ? '#0A1628' : '#C9A84C', fontWeight: 600,
            }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#0A1628', border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '16px', padding: '32px', width: '420px', maxWidth: '90vw',
          }}>
            <h3 style={{ color: '#F5F0E8', marginBottom: '20px', fontSize: '20px', fontWeight: 700 }}>
              Request Withdrawal
            </h3>
            <label style={{ display: 'block', color: '#8899aa', fontSize: '13px', marginBottom: '6px' }}>
              Amount (USD)
            </label>
            <input
              type="number"
              value={payoutAmount}
              onChange={e => setPayoutAmount(e.target.value)}
              min={50}
              max={available}
              placeholder="50.00"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid rgba(30,58,110,0.5)', background: 'rgba(30,58,110,0.3)',
                color: '#F5F0E8', fontSize: '16px', marginBottom: '16px', boxSizing: 'border-box',
              }}
            />
            <label style={{ display: 'block', color: '#8899aa', fontSize: '13px', marginBottom: '6px' }}>
              Pay to bank account
            </label>
            {banks.length === 0 ? (
              <Link
                href="/dashboard/tutor/wallet/bank-details"
                style={{ color: '#C9A84C', fontSize: '14px' }}
              >
                + Add a bank account first
              </Link>
            ) : (
              <select
                value={selectedBankId}
                onChange={e => setSelectedBankId(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  border: '1px solid rgba(30,58,110,0.5)', background: 'rgba(30,58,110,0.3)',
                  color: '#F5F0E8', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box',
                }}
              >
                <option value="">Select bank account</option>
                {banks.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName ? `${b.bankName} — ${b.accountNumber}` : b.accountName}
                  </option>
                ))}
              </select>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button onClick={() => setShowPayoutModal(false)} style={{
                flex: 1, padding: '10px', borderRadius: '8px',
                border: '1px solid rgba(30,58,110,0.5)', background: 'transparent',
                color: '#8899aa', cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={handlePayoutSubmit} disabled={submitting} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                background: '#C9A84C', color: '#0A1628', fontWeight: 700, cursor: 'pointer',
              }}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/tutor/wallet/
git commit -m "feat: add tutor wallet page with balance cards and payout modal"
```

---

## Task 14: Bank details page

**Files:**
- Create: `src/app/dashboard/tutor/wallet/bank-details/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/tutor/wallet/bank-details/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

const VN_BANKS = [
  'Techcombank', 'MB Bank', 'Vietcombank', 'BIDV', 'Agribank',
  'VPBank', 'TPBank', 'ACB', 'Sacombank', 'VietinBank',
];

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function BankDetailsPage() {
  const router = useRouter();
  const { data, mutate } = useSWR('/api/wallet/bank-accounts', fetcher);
  const accounts = data?.accounts ?? [];

  const [country, setCountry] = useState('VN');
  const [form, setForm] = useState({
    bankName: '', accountNumber: '', accountName: '', bankBranch: '',
    swiftCode: '', iban: '', routingNumber: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/wallet/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, ...form }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error); return; }
      toast.success('Bank account added!');
      setForm({ bankName: '', accountNumber: '', accountName: '', bankBranch: '', swiftCode: '', iban: '', routingNumber: '' });
      mutate();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/wallet/bank-accounts/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error); return; }
      toast.success('Account removed');
      mutate();
    } finally {
      setDeleting(null);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid rgba(30,58,110,0.5)', background: 'rgba(30,58,110,0.3)',
    color: '#F5F0E8', fontSize: '14px', boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block', color: '#8899aa', fontSize: '13px',
    marginBottom: '4px', marginTop: '14px',
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 20px' }}>
      <button onClick={() => router.back()} style={{
        background: 'none', border: 'none', color: '#C9A84C',
        cursor: 'pointer', fontSize: '14px', marginBottom: '20px',
      }}>
        ← Back to Wallet
      </button>
      <h1 style={{ color: '#F5F0E8', fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
        Bank Accounts
      </h1>

      {/* Existing accounts */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          {accounts.map((acc: any) => (
            <div key={acc.id} style={{
              padding: '16px', borderRadius: '10px', marginBottom: '10px',
              border: `1px solid ${acc.isPrimary ? 'rgba(201,168,76,0.4)' : 'rgba(30,58,110,0.4)'}`,
              background: 'rgba(30,58,110,0.15)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#F5F0E8', fontWeight: 600 }}>
                    {acc.bankName ?? acc.swiftCode ?? 'Bank Account'}
                    {acc.isPrimary && <span style={{ color: '#C9A84C', fontSize: '12px', marginLeft: '8px' }}>Primary</span>}
                  </div>
                  <div style={{ color: '#8899aa', fontSize: '13px', marginTop: '4px' }}>
                    {acc.accountNumber && `Account: ${acc.accountNumber} · `}
                    {acc.accountName}
                  </div>
                  <div style={{ color: '#8899aa', fontSize: '12px' }}>
                    {acc.country}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(acc.id)}
                  disabled={deleting === acc.id}
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444', padding: '6px 12px', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '12px',
                  }}
                >
                  {deleting === acc.id ? '...' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new account form */}
      <h2 style={{ color: '#F5F0E8', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
        Add Bank Account
      </h2>

      <label style={labelStyle}>Country</label>
      <select value={country} onChange={e => setCountry(e.target.value)} style={inputStyle}>
        <option value="VN">🇻🇳 Vietnam</option>
        <option value="US">🇺🇸 United States</option>
        <option value="GB">🇬🇧 United Kingdom</option>
        <option value="EU">🇪🇺 Europe (IBAN)</option>
        <option value="SG">🇸🇬 Singapore</option>
        <option value="AU">🇦🇺 Australia</option>
        <option value="OTHER">🌐 Other International</option>
      </select>

      {country === 'VN' ? (
        <>
          <label style={labelStyle}>Bank Name *</label>
          <select value={form.bankName} onChange={e => set('bankName', e.target.value)} style={inputStyle}>
            <option value="">Select bank</option>
            {VN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <label style={labelStyle}>Account Number *</label>
          <input value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)}
            placeholder="e.g. 19034567890123" style={inputStyle} />

          <label style={labelStyle}>Account Name (as on bank card) *</label>
          <input value={form.accountName} onChange={e => set('accountName', e.target.value)}
            placeholder="e.g. NGUYEN VAN A" style={inputStyle} />

          <label style={labelStyle}>Bank Branch (optional)</label>
          <input value={form.bankBranch} onChange={e => set('bankBranch', e.target.value)}
            placeholder="e.g. Ho Chi Minh City" style={inputStyle} />
        </>
      ) : (
        <>
          <label style={labelStyle}>Account Name *</label>
          <input value={form.accountName} onChange={e => set('accountName', e.target.value)}
            placeholder="Full name on account" style={inputStyle} />

          <label style={labelStyle}>SWIFT / BIC Code</label>
          <input value={form.swiftCode} onChange={e => set('swiftCode', e.target.value)}
            placeholder="e.g. DEUTDEDB" style={inputStyle} />

          <label style={labelStyle}>IBAN (Europe)</label>
          <input value={form.iban} onChange={e => set('iban', e.target.value)}
            placeholder="e.g. DE89 3704 0044 0532 0130 00" style={inputStyle} />

          <label style={labelStyle}>Routing Number (US ACH)</label>
          <input value={form.routingNumber} onChange={e => set('routingNumber', e.target.value)}
            placeholder="e.g. 021000021" style={inputStyle} />
        </>
      )}

      <button onClick={handleSave} disabled={saving} style={{
        marginTop: '24px', padding: '12px 28px', borderRadius: '8px', border: 'none',
        background: '#C9A84C', color: '#0A1628', fontWeight: 700,
        cursor: saving ? 'not-allowed' : 'pointer', fontSize: '15px',
      }}>
        {saving ? 'Saving...' : 'Save Bank Account'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/tutor/wallet/bank-details/
git commit -m "feat: add bank account management page"
```

---

## Task 15: Student credits page

**Files:**
- Create: `src/app/dashboard/student/wallet/page.tsx`

- [ ] **Step 1: Create `src/app/api/student/credits/route.ts`** first (needed by the page)

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const credits = await prisma.studentCredit.findMany({
    where: { studentId: userId },
    orderBy: { createdAt: 'desc' },
  });

  const total = credits
    .filter(c => !c.usedAt && (!c.expiresAt || new Date(c.expiresAt) > new Date()))
    .reduce((sum, c) => sum + c.amount, 0);

  return NextResponse.json({ total, credits });
}
```

- [ ] **Step 2: Create `src/app/dashboard/student/wallet/page.tsx`**

```typescript
'use client';

import useSWR from 'swr';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatMoney } from '@/lib/currency';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const SOURCE_LABELS: Record<string, string> = {
  REFERRAL: '🎁 Referral Bonus',
  PROMO: '🏷 Promo Credit',
  REFUND: '↩ Booking Refund',
};

export default function StudentCreditsPage() {
  const { format, currency } = useCurrency();
  const { data } = useSWR('/api/student/credits', fetcher);

  const total = data?.total ?? 0;
  const credits = data?.credits ?? [];

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ color: '#F5F0E8', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        Store Credits
      </h1>
      <p style={{ color: '#8899aa', marginBottom: '28px' }}>
        Credits are applied automatically at checkout.
      </p>

      <div style={{
        background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
        border: '1px solid rgba(201,168,76,0.3)', borderRadius: '16px', padding: '24px',
        marginBottom: '32px',
      }}>
        <div style={{ color: '#C9A84C', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
          AVAILABLE CREDITS
        </div>
        <div style={{ color: '#F5F0E8', fontSize: '36px', fontWeight: 700 }}>
          {formatMoney(total, 'USD')}
        </div>
        {currency !== 'USD' && (
          <div style={{ color: '#8899aa', fontSize: '14px', marginTop: '4px' }}>
            ≈ {format(total)}
          </div>
        )}
      </div>

      <h2 style={{ color: '#F5F0E8', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
        Credit History
      </h2>

      {credits.length === 0 && (
        <p style={{ color: '#8899aa' }}>No credits yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {credits.map((c: any) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderRadius: '10px',
            background: 'rgba(30,58,110,0.15)', border: '1px solid rgba(30,58,110,0.3)',
            opacity: c.usedAt ? 0.5 : 1,
          }}>
            <div>
              <div style={{ color: '#F5F0E8', fontSize: '14px', fontWeight: 500 }}>
                {SOURCE_LABELS[c.source] ?? c.source}
                {c.usedAt && <span style={{ color: '#8899aa', fontSize: '12px', marginLeft: '8px' }}>(used)</span>}
                {c.expiresAt && !c.usedAt && (
                  <span style={{ color: '#f59e0b', fontSize: '12px', marginLeft: '8px' }}>
                    Expires {new Date(c.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div style={{ color: '#8899aa', fontSize: '12px' }}>
                {new Date(c.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </div>
            </div>
            <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '15px' }}>
              +{formatMoney(c.amount, 'USD')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/student/credits/ src/app/dashboard/student/wallet/
git commit -m "feat: add student credits page"
```

---

## Task 16: Admin payouts page

**Files:**
- Create: `src/app/dashboard/admin/payouts/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/admin/payouts/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#3b82f6',
  PAID: '#22c55e',
  REJECTED: '#ef4444',
};

function exportCsv(payouts: any[]) {
  const pending = payouts.filter(p => p.status === 'PENDING' || p.status === 'APPROVED');
  const rows = [
    ['Tutor Name', 'Email', 'Amount USD', 'Bank', 'Account Number', 'Account Name', 'Country', 'Requested At'],
    ...pending.map(p => [
      p.tutor.name, p.tutor.email, p.amountUsd.toFixed(2),
      p.bankAccount?.bankName ?? p.bankAccount?.swiftCode ?? '',
      p.bankAccount?.accountNumber ?? p.bankAccount?.iban ?? '',
      p.bankAccount?.accountName ?? '',
      p.bankAccount?.country ?? '',
      new Date(p.createdAt).toLocaleDateString(),
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPayoutsPage() {
  const { data, mutate } = useSWR('/api/admin/payouts', fetcher);
  const payouts = data?.payouts ?? [];
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function updateStatus(id: string, status: string, extra: Record<string, string> = {}) {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error); return; }
      toast.success(`Payout marked as ${status}`);
      mutate();
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#F5F0E8', fontSize: '28px', fontWeight: 700 }}>Payout Requests</h1>
        <button onClick={() => exportCsv(payouts)} style={{
          padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)',
          background: 'rgba(201,168,76,0.1)', color: '#C9A84C', cursor: 'pointer', fontWeight: 600,
        }}>
          Export CSV
        </button>
      </div>

      {payouts.length === 0 && <p style={{ color: '#8899aa' }}>No payout requests yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {payouts.map((p: any) => (
          <div key={p.id} style={{
            padding: '20px', borderRadius: '12px',
            border: '1px solid rgba(30,58,110,0.4)',
            background: 'rgba(30,58,110,0.12)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#F5F0E8', fontWeight: 600 }}>{p.tutor.name}</div>
                <div style={{ color: '#8899aa', fontSize: '13px' }}>{p.tutor.email}</div>
                <div style={{ color: '#8899aa', fontSize: '12px', marginTop: '4px' }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div>
                {p.bankAccount ? (
                  <>
                    <div style={{ color: '#F5F0E8', fontSize: '13px' }}>
                      {p.bankAccount.bankName ?? p.bankAccount.swiftCode ?? 'Bank'}
                    </div>
                    <div style={{ color: '#8899aa', fontSize: '12px' }}>
                      {p.bankAccount.accountNumber ?? p.bankAccount.iban}
                    </div>
                    <div style={{ color: '#8899aa', fontSize: '12px' }}>
                      {p.bankAccount.accountName} · {p.bankAccount.country}
                    </div>
                  </>
                ) : (
                  <span style={{ color: '#f59e0b', fontSize: '13px' }}>No bank account</span>
                )}
              </div>

              <div>
                <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '18px' }}>
                  ${p.amountUsd.toFixed(2)}
                </div>
                <span style={{
                  display: 'inline-block', padding: '3px 8px', borderRadius: '20px',
                  fontSize: '11px', fontWeight: 600, marginTop: '4px',
                  background: `${STATUS_COLORS[p.status]}20`,
                  color: STATUS_COLORS[p.status],
                }}>
                  {p.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {p.status === 'PENDING' && (
                  <button onClick={() => updateStatus(p.id, 'APPROVED')}
                    disabled={processing === p.id}
                    style={{ padding: '7px 12px', borderRadius: '6px', border: 'none',
                      background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    Approve
                  </button>
                )}
                {(p.status === 'PENDING' || p.status === 'APPROVED') && (
                  <button onClick={() => updateStatus(p.id, 'PAID')}
                    disabled={processing === p.id}
                    style={{ padding: '7px 12px', borderRadius: '6px', border: 'none',
                      background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    Mark Paid
                  </button>
                )}
                {(p.status === 'PENDING' || p.status === 'APPROVED') && (
                  <button onClick={() => { setRejectId(p.id); setRejectReason(''); }}
                    disabled={processing === p.id}
                    style={{ padding: '7px 12px', borderRadius: '6px', border: 'none',
                      background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>
                    Reject
                  </button>
                )}
              </div>
            </div>

            {p.adminNote && (
              <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px',
                background: 'rgba(59,130,246,0.1)', color: '#8899aa', fontSize: '13px' }}>
                Note: {p.adminNote}
              </div>
            )}
            {p.rejectionReason && (
              <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px',
                background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px' }}>
                Rejected: {p.rejectionReason}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0A1628', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '14px', padding: '28px', width: '400px' }}>
            <h3 style={{ color: '#F5F0E8', marginBottom: '14px' }}>Reason for Rejection</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Explain why this request is being rejected..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', boxSizing: 'border-box',
                border: '1px solid rgba(30,58,110,0.5)', background: 'rgba(30,58,110,0.3)',
                color: '#F5F0E8', fontSize: '14px', resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button onClick={() => setRejectId(null)} style={{ flex: 1, padding: '10px',
                borderRadius: '8px', border: '1px solid rgba(30,58,110,0.5)',
                background: 'transparent', color: '#8899aa', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => { updateStatus(rejectId, 'REJECTED', { rejectionReason: rejectReason }); setRejectId(null); }}
                disabled={!rejectReason.trim()}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/admin/payouts/
git commit -m "feat: add admin payout management page with CSV export"
```

---

## Task 17: Dashboard widgets + price display updates

**Files:**
- Modify: `src/app/dashboard/tutor/page.tsx`
- Modify: `src/app/dashboard/student/page.tsx`
- Modify: `src/components/tutors/HorizontalTutorCard.tsx`

- [ ] **Step 1: Add wallet widget to tutor dashboard `src/app/dashboard/tutor/page.tsx`**

Add this import:
```typescript
import { useCurrency } from '@/contexts/CurrencyContext';
```

Inside the component, add a wallet SWR fetch:
```typescript
const { format } = useCurrency();
const { data: walletData } = useSWR(session?.user ? '/api/wallet' : null, fetcher);
const walletAvailable = walletData?.available ?? 0;
```

In the Overview tab JSX, add a wallet card alongside existing stat cards:
```tsx
<div style={{
  padding: '20px 24px', borderRadius: '14px',
  border: '1px solid rgba(201,168,76,0.3)',
  background: 'linear-gradient(135deg, rgba(201,168,76,0.1), transparent)',
}}>
  <div style={{ color: '#C9A84C', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
    💳 MY WALLET
  </div>
  <div style={{ color: '#F5F0E8', fontSize: '22px', fontWeight: 700 }}>
    ${walletAvailable.toFixed(2)}
  </div>
  <div style={{ color: '#8899aa', fontSize: '13px', marginTop: '2px' }}>
    {format(walletAvailable)}
  </div>
  <a href="/dashboard/tutor/wallet" style={{
    display: 'inline-block', marginTop: '10px', color: '#C9A84C',
    fontSize: '13px', textDecoration: 'none', fontWeight: 600,
  }}>
    View Wallet & Withdraw →
  </a>
</div>
```

- [ ] **Step 2: Add credits widget to student dashboard `src/app/dashboard/student/page.tsx`**

Add import:
```typescript
import { useCurrency } from '@/contexts/CurrencyContext';
```

Add SWR fetch inside the component:
```typescript
const { format } = useCurrency();
const { data: creditsData } = useSWR(session?.user ? '/api/student/credits' : null, fetcher);
const creditsTotal = creditsData?.total ?? 0;
```

In the Overview tab JSX, conditionally show credits card when `creditsTotal > 0`:
```tsx
{creditsTotal > 0 && (
  <div style={{
    padding: '20px 24px', borderRadius: '14px',
    border: '1px solid rgba(34,197,94,0.3)',
    background: 'rgba(34,197,94,0.05)',
  }}>
    <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
      🎁 STORE CREDITS
    </div>
    <div style={{ color: '#F5F0E8', fontSize: '22px', fontWeight: 700 }}>
      ${creditsTotal.toFixed(2)}
    </div>
    <div style={{ color: '#8899aa', fontSize: '13px', marginTop: '2px' }}>
      {format(creditsTotal)} · Applied at checkout
    </div>
    <a href="/dashboard/student/wallet" style={{
      display: 'inline-block', marginTop: '10px', color: '#22c55e',
      fontSize: '13px', textDecoration: 'none', fontWeight: 600,
    }}>
      View History →
    </a>
  </div>
)}
```

- [ ] **Step 3: Update price display in `src/components/tutors/HorizontalTutorCard.tsx`**

The card currently uses `tutor.primaryPrice.formatted` (pre-formatted by the API). To support dynamic currency, we need the raw USD amount. In the card component:

Add import:
```typescript
import { useCurrency } from '@/contexts/CurrencyContext';
```

Inside the component:
```typescript
const { format } = useCurrency();
```

Find where `tutor.primaryPrice?.formatted` or `option.priceDisplay?.formatted` is rendered and replace with:
```tsx
{/* Instead of: {option.priceDisplay?.formatted} */}
{format(option.price ?? tutor.primaryPrice?.amount ?? 0)}
```

If the API already returns pre-formatted strings and the raw USD amount isn't included in the tutor object, add `priceUsd` to the API response for the tutors listing endpoint. Check what `/api/tutors` returns and ensure each pricing option includes the raw `price` field in USD.

- [ ] **Step 4: Update price display in `src/app/tutors/[id]/page.tsx`**

Find the file and add the import + hook:
```typescript
import { useCurrency } from '@/contexts/CurrencyContext';
// inside the component:
const { format } = useCurrency();
```

Replace any hardcoded price renders (e.g. `${tutor.hourlyRate}/hr` or `formatCurrency(price)`) with `{format(price)}`.

- [ ] **Step 5: Add exchange rate refresh panel to `src/app/dashboard/admin/payouts/page.tsx`**

Add a SWR fetch for current rates and a refresh button at the top of the admin page, after the `<h1>`:

```tsx
const { data: ratesData, mutate: mutateRates } = useSWR('/api/currency/rates', fetcher);
const [refreshingRates, setRefreshingRates] = useState(false);

async function handleRefreshRates() {
  setRefreshingRates(true);
  try {
    const res = await fetch('/api/currency/refresh', { method: 'POST' });
    const result = await res.json();
    if (!res.ok) { toast.error(result.error); return; }
    toast.success('Exchange rates refreshed!');
    mutateRates();
  } finally {
    setRefreshingRates(false);
  }
}
```

Add this panel between the title and the payouts list:
```tsx
<div style={{ marginBottom: '28px', padding: '16px 20px', borderRadius: '12px',
  border: '1px solid rgba(30,58,110,0.4)', background: 'rgba(30,58,110,0.1)' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
    <span style={{ color: '#F5F0E8', fontWeight: 600 }}>Exchange Rates (USD base)</span>
    <button onClick={handleRefreshRates} disabled={refreshingRates} style={{
      padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(201,168,76,0.3)',
      background: 'rgba(201,168,76,0.1)', color: '#C9A84C', cursor: 'pointer', fontSize: '13px',
    }}>
      {refreshingRates ? 'Refreshing...' : 'Refresh Rates Now'}
    </button>
  </div>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
    {ratesData?.rates && Object.entries(ratesData.rates)
      .filter(([code]) => code !== 'USD')
      .slice(0, 12)
      .map(([code, rate]) => (
        <span key={code} style={{ padding: '4px 10px', borderRadius: '20px',
          background: 'rgba(30,58,110,0.3)', color: '#8899aa', fontSize: '12px' }}>
          {code}: {(rate as number).toLocaleString()}
        </span>
      ))}
  </div>
</div>
```

- [ ] **Step 6: Verify TypeScript compiles and run build check**

```bash
npx tsc --noEmit
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/tutor/page.tsx src/app/dashboard/student/page.tsx src/components/tutors/HorizontalTutorCard.tsx src/app/tutors/ src/app/dashboard/admin/payouts/
git commit -m "feat: add wallet/credits widgets, live currency on tutor listings, exchange rate UI"
```

---

## Task 18: Add environment variables + final verification

- [ ] **Step 1: Add env vars to `.env`**

```
# Exchange Rate API — free tier at exchangerate-api.com (1500 req/month)
EXCHANGE_RATE_API_KEY=your_key_here

# PayOS — register at payos.vn
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key
```

- [ ] **Step 2: Seed initial exchange rates** (run once to populate the ExchangeRate table)

```bash
curl -X POST http://localhost:3000/api/currency/refresh \
  -H "Cookie: next-auth.session-token=<your-admin-session-token>"
```

Or visit `http://localhost:3000/dashboard/admin/payouts` as admin and trigger from the UI (added in Task 16 — add a "Refresh Rates" button to admin page if not already present).

- [ ] **Step 3: Run the full verification checklist**

```bash
npm run dev
```

Manually verify each item:

- [ ] Currency switcher in Navbar works — switch USD → VND → EUR, prices on tutor cards update
- [ ] Booking completion credits tutor wallet — check `/api/wallet` returns positive balance after a test completion
- [ ] Cancel booking (>24h Stripe) — verify `stripe.refunds.create` is called (check Stripe dashboard)
- [ ] Cancel booking (PayOS) — verify `StudentCredit` row created with `source: REFUND`
- [ ] Tutor submits payout request ≥ $50 — wallet shows frozen amount
- [ ] Admin marks payout PAID — frozen balance decreases to 0
- [ ] Admin rejects payout — frozen returns to available balance
- [ ] PayOS checkout page shows QR code for VND (requires real PayOS keys)
- [ ] Admin payouts CSV export downloads correctly

- [ ] **Step 4: Final build check**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Final commit**

```bash
git add .env.example
git commit -m "docs: add required env vars for PayOS and exchange rate API"
```
