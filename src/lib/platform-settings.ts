import prisma from '@/lib/prisma';
import { calculateCommission } from '@/lib/utils';

const COMMISSION_SETTING_KEY = 'commissionRate';
const DEFAULT_COMMISSION_RATE = 0.2;

async function ensurePlatformSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlatformSetting" (
      "key" TEXT PRIMARY KEY,
      "value" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function getPlatformCommissionRate() {
  await ensurePlatformSettingsTable();

  const rows = await prisma.$queryRawUnsafe<Array<{ value: unknown }>>(
    `SELECT "value" FROM "PlatformSetting" WHERE "key" = $1 LIMIT 1`,
    COMMISSION_SETTING_KEY
  );

  const storedValue = rows[0]?.value;
  if (storedValue && typeof storedValue === 'object' && 'rate' in (storedValue as Record<string, unknown>)) {
    const rate = Number((storedValue as Record<string, unknown>).rate);
    if (!Number.isNaN(rate) && rate >= 0 && rate <= 1) {
      return rate;
    }
  }

  return DEFAULT_COMMISSION_RATE;
}

export async function updatePlatformCommissionRate(rate: number) {
  await ensurePlatformSettingsTable();

  const normalizedRate = Math.max(0, Math.min(1, rate));

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "PlatformSetting" ("key", "value", "createdAt", "updatedAt")
      VALUES ($1, jsonb_build_object('rate', $2), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("key")
      DO UPDATE SET "value" = jsonb_build_object('rate', $2), "updatedAt" = CURRENT_TIMESTAMP
    `,
    COMMISSION_SETTING_KEY,
    normalizedRate
  );

  return normalizedRate;
}

export async function getPlatformSettingsSnapshot() {
  const commissionRate = await getPlatformCommissionRate();
  return {
    commissionRate,
    commissionPercent: Number((commissionRate * 100).toFixed(1)),
  };
}

export async function getCommissionSplit(amount: number) {
  if (amount <= 0) {
    return { platformFee: 0, tutorPayout: 0, commissionRate: 0 };
  }

  const commissionRate = await getPlatformCommissionRate();
  const split = calculateCommission(amount, 2, 0, commissionRate);

  return {
    ...split,
    commissionRate,
  };
}
