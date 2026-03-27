import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    // Auto-expire penalties that have passed their expiresAt
    await prisma.userPenalty.updateMany({
      where: {
        userId: session.user.id,
        status: 'ACTIVE',
        expiresAt: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });

    const penalties = await prisma.userPenalty.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['ACTIVE'] },
      },
      include: {
        appeals: {
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: penalties });
  } catch (error) {
    console.error('Get penalties error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
