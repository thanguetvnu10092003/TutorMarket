import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding approved tutors with pending certifications...');

  // Find all TutorProfiles that are APPROVED
  const approvedProfiles = await prisma.tutorProfile.findMany({
    where: { verificationStatus: 'APPROVED' },
    select: { id: true, userId: true }
  });

  console.log(`Found ${approvedProfiles.length} approved tutor profiles.`);

  let updatedCount = 0;

  for (const profile of approvedProfiles) {
    // Update their pending certifications to VERIFIED
    const result = await prisma.tutorCertification.updateMany({
      where: { 
        tutorProfileId: profile.id,
        status: { in: ['PENDING_VERIFICATION', 'SELF_REPORTED'] }
      },
      data: { 
        status: 'VERIFIED',
        verifiedAt: new Date(),
        // Just use the system or the tutor's own ID as the verifier for retroactive sync
        verifiedById: profile.userId
      }
    });

    if (result.count > 0) {
      console.log(`Updated ${result.count} certifications to VERIFIED for tutor profile ${profile.id}`);
      updatedCount += result.count;
    }
  }

  console.log(`Done. Total certifications retroactively verified: ${updatedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
