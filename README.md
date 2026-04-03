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
- **Auth**: NextAuth.js (Credentials + Google OAuth)
- **Payments**: Stripe & PayPal
- **Email**: Nodemailer

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
| `NEXTAUTH_URL` | App URL |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `PAYPAL_CLIENT_ID` | PayPal client ID |

## 📁 Project Structure

- `/src/app`: Page routes and server-side API endpoints.
- `/src/components`: UI components (including timezone-aware scheduling).
- `/src/lib`: Core utility functions (Timezone handling, formatting).
- `/prisma`: Schema definition and data seeding scripts.

## 👥 Contributors

| Name | GitHub | Role |
|------|--------|------|
| LeToanThang | [@thanguetvnu10092003](https://github.com/thanguetvnu10092003) | Lead Developer |
| Hoàng Sơn | [@sonhoang](https://github.com/sonhoang) | Developer |

---
Built with excellence at TutorMarket.
