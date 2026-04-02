import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tutors = await prisma.tutorProfile.findMany({
    select: { id: true, timezone: true },
  });

  console.log(`Backfilling timezone for overrides of ${tutors.length} tutors...`);

  for (const tutor of tutors) {
    const tz = tutor.timezone || 'UTC';
    const result = await prisma.availabilityOverride.updateMany({
      where: { tutorProfileId: tutor.id },
      data: { timezone: tz },
    });
    console.log(`  Tutor ${tutor.id} (${tz}): updated ${result.count} overrides`);
  }

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
