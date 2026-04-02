import { PrismaClient } from '@prisma/client';
import { detectBookingConflicts, toWallClockDate } from '../../src/lib/availability';

const prisma = new PrismaClient();

async function main() {
  const tutors = await prisma.tutorProfile.findMany({
    select: { id: true, timezone: true },
  });

  console.log(`Scanning conflicts for ${tutors.length} tutors...`);
  let totalFlagged = 0;

  for (const tutor of tutors) {
    const tz = tutor.timezone || 'UTC';

    const activeBookings = await prisma.booking.findMany({
      where: {
        tutorProfileId: tutor.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { gte: new Date() },
      },
      select: { id: true, scheduledAt: true, durationMinutes: true },
    });

    if (activeBookings.length === 0) continue;

    const availability = await prisma.availability.findMany({
      where: { tutorProfileId: tutor.id, isActive: true },
    });
    const overrides = await prisma.availabilityOverride.findMany({
      where: { tutorProfileId: tutor.id, date: { gte: new Date() } },
    });

    const localBookings = activeBookings.map((b) => ({
      ...b,
      scheduledAt: toWallClockDate(b.scheduledAt, tz),
    }));
    const localOverrides = overrides.map((o) => ({
      ...o,
      date: toWallClockDate(o.date, tz),
    }));

    const conflictIds = detectBookingConflicts({
      bookings: localBookings,
      availability,
      overrides: localOverrides,
    });

    if (conflictIds.length > 0) {
      await prisma.booking.updateMany({
        where: { id: { in: conflictIds } },
        data: {
          hasConflict: true,
          conflictReason: 'Pre-existing conflict detected during initial timezone scan',
          conflictAt: new Date(),
        },
      });
      console.log(`  Tutor ${tutor.id} (${tz}): flagged ${conflictIds.length} conflicts`);
      totalFlagged += conflictIds.length;
    }
  }

  console.log(`Done. Total flagged: ${totalFlagged}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
