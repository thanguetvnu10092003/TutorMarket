const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Fixing Sunbin Hoàng timezone ---');

  // Find Sunbin's tutor profile
  const sunbin = await prisma.tutorProfile.findFirst({
    where: { user: { email: 'messison2003@gmail.com' } },
    select: { id: true, timezone: true }
  });

  if (!sunbin) {
    console.log('ERROR: Could not find Sunbin Hoàng tutorProfile');
    return;
  }

  console.log(`Found Sunbin TutorProfile id=${sunbin.id}, current timezone: ${sunbin.timezone}`);

  // Fix TutorProfile timezone
  await prisma.tutorProfile.update({
    where: { id: sunbin.id },
    data: { timezone: 'Asia/Ho_Chi_Minh' }
  });
  console.log('✓ TutorProfile.timezone updated to Asia/Ho_Chi_Minh');

  // Fix all Availability records for Sunbin
  const availResult = await prisma.availability.updateMany({
    where: { tutorProfileId: sunbin.id },
    data: { timezone: 'Asia/Ho_Chi_Minh' }
  });
  console.log(`✓ Updated ${availResult.count} Availability records to Asia/Ho_Chi_Minh`);

  // Verify
  const verified = await prisma.tutorProfile.findUnique({
    where: { id: sunbin.id },
    select: { timezone: true }
  });
  console.log(`✓ Verified: TutorProfile.timezone is now ${verified.timezone}`);

  // Show current bookings state
  const bookings = await prisma.booking.findMany({
    where: { tutorProfileId: sunbin.id },
    include: { student: { select: { name: true } } },
    orderBy: { scheduledAt: 'desc' }
  });

  console.log('\n--- Sunbin bookings (scheduledAt in UTC, display in VN) ---');
  bookings.forEach(b => {
    const utc = new Date(b.scheduledAt);
    const vn = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(utc);
    console.log(`  [${b.status}] ${b.student.name}`);
    console.log(`    UTC: ${utc.toISOString()} => VN: ${vn}`);
  });

  console.log('\n--- Done ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
