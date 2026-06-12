import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const credits = await prisma.studentCredit.findMany({
    where: { studentId: userId },
    orderBy: { createdAt: 'desc' },
  });

  const total = credits
    .filter(c => !c.usedAt && (!c.expiresAt || new Date(c.expiresAt) > new Date()))
    .reduce((sum, c) => sum + c.amount, 0);

  return NextResponse.json({ total, credits });
}
