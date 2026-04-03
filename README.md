# TutorMarket — Premium Exam Prep Marketplace

A professional marketplace connecting students with verified tutors for CFA, GMAT, and GRE preparation.

## 🌟 Key Features

- **Timezone Sync**: Automatic scheduling synchronization across global timezones.
- **Verified Tutors**: Multi-step onboarding with certification verification.
- **Booking Management**: Seamless scheduling with conflict detection.
- **Pricing & Formatting**: Professional rate setting with international number formatting.
- **Premium Design**: Modern, responsive UI with glassmorphism and HSL-tailored colors.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router) & TypeScript
- **Styling**: Tailwind CSS & Framer Motion
- **Database**: PostgreSQL (Neon) & Prisma ORM
- **Auth**: NextAuth.js
- **Payments**: Stripe (Integration Ready)

## 🚀 Quick Start

```bash
# 1. Clone & Install
npm install

# 2. Setup Environment
cp .env.example .env # Add your DATABASE_URL

# 3. Database Sync
npx prisma db push
npx prisma db seed

# 4. Run Dev
npm run dev
```

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Session encryption key |
| `NEXTAUTH_URL` | App URL (http://localhost:3000) |

## 📁 Project Structure

- `/src/app`: Page routes and server-side API endpoints.
- `/src/components`: UI components (including timezone-aware scheduling).
- `/src/lib`: Core utility functions (Timezone handling, formatting).
- `/prisma`: Schema definition and data seeding.

---
Built with excellence.
