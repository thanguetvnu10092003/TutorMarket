const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n====== TIMEZONE AUDIT REPORT ======\n');

  // 1. All TutorProfiles and their timezones
  const tutors = await prisma.tutorProfile.findMany({
    select: {
      id: true,
      timezone: true,
      user: { select: { name: true, email: true } }
    }
  });

  console.log('--- TutorProfile Timezones ---');
  tutors.forEach(t => {
    console.log(`  ${t.user.name} (${t.user.email}): ${t.timezone}`);
  });

  // 2. Sample availability records
  const avail = await prisma.availability.findMany({
    take: 10,
    include: {
      tutorProfile: {
        include: { user: { select: { name: true } } }
      }
    }
  });

  console.log('\n--- Sample Availability Slots ---');
  avail.forEach(a => {
    console.log(`  ${a.tutorProfile.user.name} | Day ${a.dayOfWeek} | ${a.startTime}-${a.endTime} | tz: ${a.timezone}`);
  });

  // 3. Recent bookings
  const bookings = await prisma.booking.findMany({
    take: 10,
    orderBy: { scheduledAt: 'desc' },
    include: {
      student: { select: { name: true } },
      tutorProfile: {
        include: { user: { select: { name: true } } }
      }
    }
  });

  console.log('\n--- Recent Bookings (scheduledAt = stored UTC) ---');
  bookings.forEach(b => {
    const utc = new Date(b.scheduledAt);
    const vietTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(utc);
    console.log(`  [${b.status}] ${b.student.name} -> ${b.tutorProfile.user.name}`);
    console.log(`    UTC:     ${utc.toISOString()}`);
    console.log(`    VN Time: ${vietTime} (treated as tutor local = Asia/Ho_Chi_Minh)`);
    console.log(`    Tutor TZ: ${b.tutorProfile.timezone}`);
  });

  console.log('\n====== END AUDIT ======\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
