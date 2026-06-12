import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payouts = await prisma.payoutRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tutor: { select: { id: true, name: true, email: true } },
      bankAccount: true,
      processedBy: { select: { name: true } },
    },
  });
  return NextResponse.json({ payouts });
}
