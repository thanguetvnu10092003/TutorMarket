const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Correction Start ---');

  // 1. Update TutorProfiles and Availabilities where timezone is 'UTC'
  // and we assume they should be 'Asia/Ho_Chi_Minh' for this fix
  const tutors = await prisma.tutorProfile.updateMany({
    where: { timezone: 'UTC' },
    data: { timezone: 'Asia/Ho_Chi_Minh' }
  });
  console.log(`Updated ${tutors.count} TutorProfiles from UTC to Asia/Ho_Chi_Minh`);

  const avail = await prisma.availability.updateMany({
    where: { timezone: 'UTC' },
    data: { timezone: 'Asia/Ho_Chi_Minh' }
  });
  console.log(`Updated ${avail.count} Availabilities from UTC to Asia/Ho_Chi_Minh`);

  // 2. Adjust "Student Test" bookings
  // We subtract 7 hours from the UTC timestamp to align with the intended local time
  const testBookings = await prisma.booking.findMany({
    where: { student: { name: 'Student test' } }
  });

  console.log(`Found ${testBookings.length} bookings for "Student test"`);

  for (const b of testBookings) {
    const oldDate = new Date(b.scheduledAt);
    const newDate = new Date(oldDate.getTime() - 7 * 60 * 60 * 1000);
    
    await prisma.booking.update({
      where: { id: b.id },
      data: { scheduledAt: newDate }
    });
    console.log(`Updated Booking ${b.id}: ${oldDate.toISOString()} -> ${newDate.toISOString()}`);
  }

  console.log('--- Database Correction End ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
