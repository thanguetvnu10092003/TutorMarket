-- AlterTable: add hasConflict, conflictReason, conflictAt to Booking
ALTER TABLE "Booking" ADD COLUMN "hasConflict" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "conflictReason" TEXT;
ALTER TABLE "Booking" ADD COLUMN "conflictAt" TIMESTAMP(3);

-- AlterTable: add timezone to AvailabilityOverride
ALTER TABLE "AvailabilityOverride" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

CREATE INDEX "Booking_tutorProfileId_hasConflict_idx" ON "Booking"("tutorProfileId", "hasConflict");
