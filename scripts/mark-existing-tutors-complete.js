const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.tutorProfile.updateMany({
    where: {},
    data: { onboardingCompleted: true, onboardingStep: 8 }
  });
  console.log('Updated', result.count, 'existing tutor profiles → onboardingCompleted = true');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
