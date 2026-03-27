import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const appealSchema = z.object({
  penaltyId: z.string(),
  reason: z.string().min(10).max(2000),
  evidence: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { penaltyId, reason, evidence } = appealSchema.parse(body);

    const penalty = await prisma.userPenalty.findFirst({
      where: { id: penaltyId, userId: session.user.id, status: 'ACTIVE' },
    });

    if (!penalty) {
      return NextResponse.json({ error: 'Penalty not found or not active' }, { status: 404 });
    }

    const existingAppeal = await prisma.appeal.findFirst({
      where: { penaltyId, userId: session.user.id, status: 'PENDING' },
    });

    if (existingAppeal) {
      return NextResponse.json({ error: 'You already have a pending appeal for this penalty' }, { status: 400 });
    }

    const appeal = await prisma.$transaction(async (tx) => {
      const created = await tx.appeal.create({
        data: {
          penaltyId,
          userId: session.user.id,
          reason,
          evidence: evidence || null,
          status: 'PENDING',
        },
      });

      await tx.userPenalty.update({
        where: { id: penaltyId },
        data: { status: 'APPEALED' },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: appeal });
  } catch (error: any) {
    console.error('Create appeal error:', error);
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
