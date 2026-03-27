import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminSession();
    const { decision, adminResponse } = await req.json();

    if (!['ACCEPTED', 'REJECTED'].includes(decision)) {
      return NextResponse.json({ error: 'Decision must be ACCEPTED or REJECTED' }, { status: 400 });
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id: params.id },
      include: { penalty: true },
    });

    if (!appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    if (appeal.status !== 'PENDING') {
      return NextResponse.json({ error: 'This appeal has already been processed' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.appeal.update({
        where: { id: params.id },
        data: {
          status: decision,
          adminResponse: adminResponse || null,
          reviewedAt: new Date(),
        },
      });

      if (decision === 'ACCEPTED') {
        await tx.userPenalty.update({
          where: { id: appeal.penaltyId },
          data: { status: 'REVOKED', revokedAt: new Date() },
        });

        const penalty = appeal.penalty;
        if (penalty.type === 'SUSPEND_7D' || penalty.type === 'SUSPEND_30D') {
          await tx.user.update({
            where: { id: penalty.userId },
            data: { suspendedUntil: null, suspensionReason: null },
          });
        } else if (penalty.type === 'PERMANENT_BAN') {
          await tx.user.update({
            where: { id: penalty.userId },
            data: { isBanned: false, banReason: null },
          });
        }
      } else {
        await tx.userPenalty.update({
          where: { id: appeal.penaltyId },
          data: { status: 'ACTIVE' },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Process appeal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
