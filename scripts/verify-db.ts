import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        banReason: true,
      },
    });
    console.log('Successfully queried User.banReason:', user === null ? 'No users found, but query worked' : 'Query worked');
  } catch (error) {
    console.error('Error querying User.banReason:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
