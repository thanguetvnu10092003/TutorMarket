-- Add packageId to Booking model
ALTER TABLE "Booking" ADD COLUMN "packageId" TEXT;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "BookingPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Booking_packageId_idx" ON "Booking"("packageId");

-- Create PenaltyType enum
CREATE TYPE "PenaltyType" AS ENUM ('WARNING', 'SUSPEND_7D', 'SUSPEND_30D', 'PERMANENT_BAN');

-- Create PenaltyStatus enum
CREATE TYPE "PenaltyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'APPEALED', 'REVOKED');

-- Create AppealStatus enum
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED');

-- Create UserPenalty model
CREATE TABLE "UserPenalty" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "adminId"   TEXT,
  "type"      "PenaltyType" NOT NULL,
  "reason"    TEXT NOT NULL,
  "status"    "PenaltyStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserPenalty_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserPenalty_userId_status_idx" ON "UserPenalty"("userId", "status");

ALTER TABLE "UserPenalty" ADD CONSTRAINT "UserPenalty_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPenalty" ADD CONSTRAINT "UserPenalty_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Appeal model
CREATE TABLE "Appeal" (
  "id"            TEXT NOT NULL,
  "penaltyId"     TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "reason"        TEXT NOT NULL,
  "evidence"      TEXT,
  "status"        "AppealStatus" NOT NULL DEFAULT 'PENDING',
  "adminResponse" TEXT,
  "reviewedAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Appeal_status_createdAt_idx" ON "Appeal"("status", "createdAt");

ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_penaltyId_fkey"
  FOREIGN KEY ("penaltyId") REFERENCES "UserPenalty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
