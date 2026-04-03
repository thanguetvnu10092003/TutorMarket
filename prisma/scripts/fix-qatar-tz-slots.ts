/**
 * One-time fix: tutor changed timezone from Berlin (UTC+2) to Qatar (UTC+3)
 * without the shift logic. Slots are stored as Berlin wall-clock times
 * but labeled as Qatar. This script shifts them +60 minutes to correct.
 *
 * Run: npx tsx prisma/scripts/fix-qatar-tz-slots.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minsToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

async function main() {
  // Find tutors whose timezone is "Asia/Qatar" (or similar +3h names)
  // but whose slots appear to be shifted relative to expected UTC
  const qatarTutors = await prisma.tutorProfile.findMany({
    where: { timezone: { in: ['Asia/Qatar', 'Asia/Bahrain', 'Asia/Kuwait'] } },
    include: {
      availability: true,
      bookings: {
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          scheduledAt: { gte: new Date() },
          hasConflict: true,
        },
        select: { id: true, scheduledAt: true },
      },
    },
  });

  console.log(`Found ${qatarTutors.length} Qatar-timezone tutors to inspect...`);

  for (const tutor of qatarTutors) {
    if (tutor.bookings.length === 0) {
      console.log(`  Tutor ${tutor.id}: no conflict bookings, skipping.`);
      continue;
    }

    console.log(`  Tutor ${tutor.id}: has ${tutor.bookings.length} conflict bookings — shifting slots +60 min`);

    // Shift all availability slots +60 minutes (Qatar +3 was Berlin +2 before → Δ = +1h)
    for (const slot of tutor.availability) {
      let startMins = timeToMins(slot.startTime) + 60;
      let endMins   = timeToMins(slot.endTime)   + 60;
      let dow       = slot.dayOfWeek;

      if (startMins >= 24 * 60) {
        dow = (dow + 1) % 7;
        startMins -= 24 * 60;
        endMins   -= 24 * 60;
      }

      await prisma.availability.update({
        where: { id: slot.id },
        data: {
          startTime:  minsToTime(startMins),
          endTime:    minsToTime(endMins),
          dayOfWeek:  dow,
        },
      });
      console.log(`    Slot ${slot.id}: ${slot.startTime}-${slot.endTime} → ${minsToTime(startMins)}-${minsToTime(endMins)}`);
    }

    // Clear conflict flags — the slots are now correct
    await prisma.booking.updateMany({
      where: {
        tutorProfileId: tutor.id,
        hasConflict: true,
      },
      data: { hasConflict: false, conflictReason: null, conflictAt: null },
    });
    console.log(`    Cleared conflict flags for ${tutor.bookings.length} bookings.`);
  }

  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
