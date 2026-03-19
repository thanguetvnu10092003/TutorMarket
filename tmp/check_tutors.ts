import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true }
  });
  const profiles = await prisma.tutorProfile.findMany({
    include: {
      user: { select: { name: true, email: true, role: true } }
    }
  });

  console.log('--- ALL USERS ---');
  console.table(users);
  
  console.log('--- TUTOR PROFILES ---');
  console.log(JSON.stringify(profiles, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
