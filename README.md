# TutorMarket — Premium CFA, GMAT & GRE Tutoring Marketplace

A two-sided marketplace connecting students with verified tutors specializing in CFA (all levels), GMAT, and GRE exam preparation. Built with Next.js 14, TypeScript, Tailwind CSS, and Framer Motion.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 16 (optional — the app works with mock data)
- Docker & Docker Compose (optional)

### Option 1: Local Development (No Database Required)

```bash
# Clone and install
cd WEB
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs with built-in mock data — no database setup needed.

### Option 2: Docker Compose (Full Stack)

```bash
docker-compose up -d
```

This starts Next.js + PostgreSQL + Redis. Then:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed sample data
npm run db:seed
```

## 📁 Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes
│   │   ├── admin/            # Admin endpoints
│   │   ├── auth/             # NextAuth config
│   │   ├── bookings/         # Booking CRUD
│   │   ├── conversations/    # Messaging
│   │   ├── messages/         # Message threads
│   │   ├── payments/         # Stripe webhooks
│   │   ├── reviews/          # Review system
│   │   └── tutors/           # Tutor search & profiles
│   ├── auth/                 # Login & Register pages
│   │   ├── login/
│   │   └── register/
│   ├── become-a-tutor/       # Tutor recruitment landing
│   ├── dashboard/
│   │   ├── admin/            # Admin dashboard
│   │   ├── student/          # Student dashboard
│   │   └── tutor/            # Tutor dashboard
│   ├── how-it-works/         # Explainer page
│   ├── tutors/
│   │   ├── [id]/             # Tutor profile page
│   │   └── page.tsx          # Tutor search/browse
│   ├── globals.css           # Design system
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/
│   ├── layout/               # Navbar, Footer
│   └── providers/            # ThemeProvider
├── lib/
│   ├── mock-data.ts          # Sample data store
│   └── utils.ts              # Utility functions
├── types/
│   └── index.ts              # TypeScript types
└── middleware.ts              # Route protection
```

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| Navy `#0A1628` | Primary dark | Backgrounds, text |
| Cream `#F5F0E8` | Primary light | Page backgrounds |
| Gold `#C9A84C` | Accent | CTAs, highlights |
| Sage `#4A7C6F` | Secondary | Success states, badges |

**Typography**: Playfair Display (headings) + DM Sans (body)  
**Components**: Glassmorphism cards, grain texture overlay, skeleton loaders  
**Theme**: Full dark/light mode via `ThemeProvider`

## 🔌 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tutors` | Search with filters |
| GET | `/api/tutors/:id` | Full tutor profile |
| PUT | `/api/tutors/:id` | Update profile |
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings` | List bookings |
| PATCH | `/api/bookings/:id` | Cancel/complete |
| POST | `/api/reviews` | Submit review |
| GET | `/api/reviews/tutor/:id` | Tutor reviews |
| GET | `/api/conversations` | List conversations |
| POST | `/api/messages` | Send message |
| GET | `/api/messages` | Load thread |
| GET | `/api/admin/verifications` | Pending verifications |
| POST | `/api/admin/verifications` | Approve/reject |
| GET | `/api/admin/analytics` | Platform stats |
| POST | `/api/payments` | Stripe webhooks |
| GET | `/api/payments` | Payment history |

## 💼 Business Logic

### Free Trial
First session between any student-tutor pair is free. No credit card required.

### Commission Structure
- **Sessions 1**: Free (no charge)
- **Sessions 2+**: 20% platform fee
- **Cap**: Once cumulative fees reach $500 per student-tutor pair, fee drops to 0%

### Cancellation Policy
- **>24h before**: 100% refund
- **<24h before**: 50% refund
- **Tutor no-show**: 100% refund + warning

## 🔐 Environment Variables

See `.env.example` for the full list. Required for production:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Session encryption key |
| `NEXTAUTH_URL` | App URL |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |

## 🚢 Deployment

### Vercel (Frontend)
1. Connect GitHub repo to Vercel
2. Set environment variables
3. Deploy — Vercel auto-detects Next.js

### Railway / Render (Database)
1. Create PostgreSQL instance
2. Copy connection string to `DATABASE_URL`
3. Run `npx prisma db push && npx prisma db seed`

## 📋 Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + custom design system
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (credentials + Google OAuth)
- **Payments**: Stripe Connect (stubbed)
- **Email**: Resend (stubbed)
- **Deployment**: Docker + Vercel + Railway

## License

MIT
