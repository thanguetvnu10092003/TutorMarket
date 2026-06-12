# Wallet + Multi-Currency + PayOS Payment System
**Date:** 2026-06-12
**Project:** TutorMarket — Next.js 14 App Router + Prisma + Neon DB

---

## Context

- Framework: Next.js 14 App Router (`app/` directory)
- ORM: Prisma → Neon Serverless Postgres
- Auth: NextAuth.js (Supabase is storage only)
- Storage: Supabase Storage (`avatars`, `tutor-videos`)
- Payments: Stripe (existing, international) + PayOS (new, Vietnam)
- Styling: Vanilla CSS, custom utility classes (no Tailwind)
- All prices stored in USD; display currency is user-preference

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Wallet scope | Tutor-only | Students use existing `StudentCredit` model; only tutors need withdrawal |
| Student refunds | `StudentCredit` (source: REFUND) + Stripe API call where applicable | Avoids duplicate credit systems; Stripe refund for card payments |
| Refund policy | Early cancel + Stripe → card refund; last-minute or PayOS → store credit | Industry standard; protects tutors from last-minute cancels |
| Exchange rates | Dynamic DB via `ExchangeRate` model + exchangerate-api.com | PayOS charges VND — accurate rate required at checkout |
| Wallet atomicity | All wallet ops in `prisma.$transaction` with booking state change | Financial consistency; no orphaned booking-without-earnings |
| Existing `currency.ts` | Extend, not replace | Already has 26 currencies, `formatMoney`, `buildDisplayPrice` |

---

## Section 1: Database Schema

### New Enums

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
  STRIPE   // International card via Stripe
  PAYOS    // Vietnam QR/bank transfer via PayOS
  WALLET   // Reserved: pay with store credit (not implemented in this spec)
  FREE     // Reserved: free trial sessions (not implemented in this spec)
}
```

### New Models

**Wallet** — one per tutor user
- `id`, `userId` (unique), `balance` Float (USD), `frozen` Float (USD), `createdAt`, `updatedAt`
- `frozen` = funds reserved for a pending payout request; cannot be spent

**WalletTransaction** — immutable audit log
- `id`, `walletId`, `type` (WalletTransactionType), `amount` Float (positive = credit, negative = debit)
- `balanceAfter` Float — running balance snapshot after this transaction
- `bookingId?`, `payoutRequestId?` — optional links for traceability
- `description` String, `metadata` Json?, `createdAt`
- Indexes: `[walletId, createdAt]`, `[bookingId]`

**PayoutRequest** — tutor withdrawal request
- `id`, `tutorId`, `amountUsd`, `status` (PayoutRequestStatus, default PENDING)
- `bankAccountId?` — snapshot of bank account at time of request
- `processedById?`, `adminNote?`, `rejectionReason?`, `processedAt?`
- Indexes: `[tutorId, status]`, `[status, createdAt]`

**BankAccount** — tutor payout destination
- `id`, `userId`
- VN fields: `bankName?`, `accountNumber?`, `accountName?`, `bankBranch?`
- International fields: `swiftCode?`, `iban?`, `routingNumber?`
- `country` (default "VN"), `isPrimary` Boolean, `isVerified` Boolean
- Index: `[userId]`

**ExchangeRate** — one row per currency
- `currency` String (PK, ISO 4217 e.g. "VND")
- `rateToUsd` Float — units of this currency per 1 USD (e.g. VND: 25400)
- `updatedAt` DateTime @updatedAt

### Modified Models

**User** — add relations:
```prisma
wallet              Wallet?
bankAccounts        BankAccount[]
tutorPayoutRequests PayoutRequest[] @relation("TutorPayoutRequests")
processedPayouts    PayoutRequest[] @relation("AdminProcessedPayouts")
```

**Payment** — add fields:
```prisma
currency           String        @default("USD")
exchangeRate       Float         @default(1)
paymentMethod      PaymentMethod @default(STRIPE)
payosOrderCode     String?
stripeRefundFailed Boolean       @default(false)
```

---

## Section 2: Currency Engine

### Approach
Extend existing `src/lib/currency.ts` — do not replace it. It already provides `formatMoney()`, `buildDisplayPrice()`, `convertAmount()`, `getCurrencyForLocation()` for 26 currencies.

### Additions to `src/lib/currency.ts`
- `getExchangeRatesFromDb()` — server-side only; reads `ExchangeRate` table; returns `Record<string, number>` map
- `refreshExchangeRates()` — server-side only; calls `https://v6.exchangerate-api.com/v6/{key}/latest/USD`; upserts all rates in one `prisma.$transaction`

### New: `src/contexts/CurrencyContext.tsx`
- Client component; wraps app inside existing `SessionProvider` in `layout.tsx`
- On mount: reads `localStorage('preferred_currency')` → falls back to `getCurrencyForLocation()` (existing fn)
- Fetches live rates from `GET /api/currency/rates` (1h revalidate)
- Exposes: `currency`, `setCurrency`, `format(usdAmount)`, `convert(usdAmount)`, `symbol`, `isLoading`
- `format()` delegates to existing `formatMoney()` using live DB rates

### New API Routes
- `GET /api/currency/rates` — reads DB, returns `{ rates }`, `export const revalidate = 3600`
- `POST /api/currency/refresh` — admin-only; calls `refreshExchangeRates()`

### New UI: `src/components/ui/CurrencySwitcher.tsx`
- Trigger: flag emoji + currency code (e.g. `🇻🇳 VND`)
- Dropdown: all currencies with flag + code + name; selected highlighted in gold
- Slide-down animation; closes on outside click
- Placed in `Navbar.tsx` next to user avatar

---

## Section 3: Refund Flow Fix

Fixes existing gap: cancellations currently only update DB, no money moves.

### Cancel Action (`action = 'cancel'`)
```
If payment.status === CAPTURED:
  If hoursUntilSession > 24 AND payment.paymentMethod === STRIPE:
    stripe.refunds.create({ payment_intent: stripePaymentIntentId })
    payment.status = REFUNDED  ← inside prisma.$transaction
  Else (PayOS, last-minute, or no payment):
    StudentCredit.create({ source: 'REFUND', amount: payment.amount })  ← inside same tx
    payment.status = REFUNDED

All inside one prisma.$transaction([booking.update, payment.update, studentCredit.create?])
Stripe API call happens AFTER transaction commits (external API, not rollback-able)
If Stripe call fails: log error + set `payment.stripeRefundFailed = true` (new Boolean field, default false) for admin review; do not revert booking
```

### Decline Action (`action = 'decline'`)
```
If payment.status === CAPTURED:
  Always Stripe refund (tutor chose to decline — student entitled to full refund)
  stripe.refunds.create({ payment_intent: stripePaymentIntentId })
  payment.status = REFUNDED  ← inside prisma.$transaction
```

### PayOS Pending Cancellation
- Call PayOS cancel endpoint if payment not yet completed (no money moved)
- No refund needed; just close the payment link

---

## Section 4: Wallet System (Tutor-only)

### `src/lib/wallet.ts`
All functions operate in USD. All DB writes use `prisma.$transaction`.

| Function | Purpose |
|---|---|
| `getOrCreateWallet(userId)` | Upsert wallet row |
| `creditWallet(userId, amount, type, description, meta?)` | Add to balance + create WalletTransaction |
| `freezeFundsForPayout(userId, amount, payoutRequestId)` | balance → frozen; throws if insufficient |
| `completePayout(userId, amount, payoutRequestId)` | Remove from frozen permanently |
| `cancelPayout(userId, amount, payoutRequestId)` | frozen → balance |

Constants: `MINIMUM_PAYOUT_USD = 50`, `PLATFORM_COMMISSION_RATE = 0.20`

### Booking Completion Hook

`PATCH /api/bookings/[id]/route.ts` — action `complete` becomes one atomic transaction:

```ts
prisma.$transaction([
  prisma.booking.update({ status: COMPLETED, completedAt }),
  prisma.payment.update({ payoutStatus: PAID, payoutAt }),
  prisma.wallet.update({ balance: { increment: tutorPayout } }),
  prisma.walletTransaction.create({ type: BOOKING_EARNING, ... }),
  prisma.bookingEvent.create({ eventType: SESSION_COMPLETED }),
])
```

Tutor earnings = `payment.tutorPayout` (existing calculated field on Payment).

### API Routes
- `GET /api/wallet` — `{ balance, frozen, available, transactions[], pagination }`
- `POST /api/wallet/payout` — validates min $50, no existing PENDING request, creates `PayoutRequest`, calls `freezeFundsForPayout`, atomic
- `GET /api/wallet/bank-accounts` — list all bank accounts for current user
- `POST /api/wallet/bank-accounts` — create bank account
- `DELETE /api/wallet/bank-accounts/[id]` — blocked if has PENDING payout
- `GET /api/admin/payouts` — list all PayoutRequests with tutor + bank info
- `PATCH /api/admin/payouts/[id]` — update status; calls `completePayout` or `cancelPayout`

---

## Section 5: PayOS Integration

### Setup
```
npm install @payos/node
```

New env vars:
```
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
EXCHANGE_RATE_API_KEY=
```

### `src/lib/payos.ts`
Single shared client instance, matching pattern of existing `src/lib/stripe.ts`.

### `POST /api/checkout/payos`
1. Fetch payment from DB, verify ownership
2. Get live VND rate from `getExchangeRatesFromDb()`
3. Convert `payment.amount` USD → VND: `Math.round(amount * vndRate)`
4. Order code: `Number(Date.now().toString().slice(-9))` — 9 digits, reduces collision window
5. Call `payos.createPaymentLink({ orderCode, amount: amountVnd, ... })`
6. Save `payosOrderCode`, `currency: 'VND'`, `exchangeRate`, `paymentMethod: 'PAYOS'` to Payment
7. Return `{ checkoutUrl, qrCode, orderCode }`

### `POST /api/webhooks/payos`
- Verify signature: `payos.verifyPaymentWebhookData(body)`
- On `code === '00'`: single `prisma.$transaction([payment.update(CAPTURED), booking.update(CONFIRMED)])`
- Idempotent: skip if `payment.status !== 'PENDING'`

### Checkout Page Update
`src/app/checkout/[paymentId]/page.tsx`:
- If `currency === 'VND'` OR user clicks "Pay with VietQR": fetch from `POST /api/checkout/payos`, show QR + VND amount
- Otherwise: existing Stripe Elements flow unchanged
- Method toggle is per-session, not saved to DB

---

## Section 6: UI

### Price Display Updates
Wrap all USD price displays with `useCurrency().format(usdAmount)`:
- `src/components/tutors/TutorCard.tsx`
- `src/app/tutors/[id]/page.tsx`
- `src/components/student/BookingModal.tsx`
- `src/app/checkout/[paymentId]/page.tsx`
- `src/app/dashboard/tutor/page.tsx`
- `src/app/dashboard/student/page.tsx`

### Tutor Wallet Page — `src/app/dashboard/tutor/wallet/page.tsx`
- Balance cards: Available + Frozen, shown in USD and user's local currency equivalent
- Animated number counter on load, gold gradient design
- "Request Withdrawal" button — disabled if available < $50
- Payout modal: amount input + bank account selector + "Add Bank Account" link
- Transaction history: type icon, description, ±amount, balance snapshot, date, paginated

### Bank Details Page — `src/app/dashboard/tutor/wallet/bank-details/page.tsx`
- Country selector controls visible fields
- VN: bankName dropdown (Techcombank, MB Bank, Vietcombank, BIDV, Agribank, VPBank, TPBank, ACB, Sacombank, VietinBank) + accountNumber + accountName
- International: SWIFT + IBAN + routingNumber + accountName

### Student Credits Page — `src/app/dashboard/student/wallet/page.tsx`
- Reads `StudentCredit` model only (no new Wallet model for students)
- Shows total available credit + list of credit entries

### Dashboard Widgets
- Tutor dashboard: wallet card with available balance + link to wallet page
- Student dashboard: credits card shown only when `StudentCredit` balance > 0

### Admin Payouts — `src/app/dashboard/admin/payouts/page.tsx`
- Table: tutor name/email, amount USD, bank details, status badge, request date
- Per-row actions: Approve / Mark as Paid / Reject (with reason input)
- Export CSV for batch bank transfer
- Exchange rates table + "Refresh Rates Now" button

---

## Implementation Notes

- `src/lib/payos.ts` follows the same singleton pattern as `src/lib/stripe.ts`
- All wallet mutations are wrapped in `prisma.$transaction` — no partial state possible
- Stripe refund API calls happen after the DB transaction commits; failures are logged and flagged, not retried automatically in-process
- PayOS order codes use 9-digit timestamp suffix (not 8) to reduce collision probability
- `CurrencyContext` is a client component; server components use `getExchangeRatesFromDb()` directly

---

## Environment Variables to Add

```
# Exchange Rate API (free tier — 1500 req/month)
EXCHANGE_RATE_API_KEY=

# PayOS (register at payos.vn)
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
```

---

## Verification Checklist

- [ ] `prisma migrate dev` runs without errors
- [ ] `prisma generate` succeeds
- [ ] Currency switcher changes prices on tutor cards instantly
- [ ] Booking completion credits tutor wallet atomically
- [ ] Early Stripe cancellation triggers actual `stripe.refunds.create()` call
- [ ] Last-minute / PayOS cancellation writes to `StudentCredit`
- [ ] Tutor payout request freezes funds correctly
- [ ] Admin can mark payout PAID → frozen balance decreases
- [ ] Admin can reject payout → frozen returns to available
- [ ] PayOS creates QR code for VND payments
- [ ] PayOS webhook confirms payment atomically
- [ ] CSV export works on admin payouts page
