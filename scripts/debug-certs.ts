import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const certifications = await prisma.tutorCertification.findMany({
    include: {
      tutorProfile: {
        select: {
          verificationStatus: true,
          user: { select: { email: true, name: true } }
        }
      }
    }
  });

  console.log(JSON.stringify(certifications, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
