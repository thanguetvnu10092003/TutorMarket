import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { completePayout, cancelPayout } from '@/lib/wallet';
import { createInAppNotification } from '@/lib/in-app-notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminId = (session.user as any).id;
  const { status, adminNote, rejectionReason } = await request.json();

  const payout = await prisma.payoutRequest.findUnique({
    where: { id: params.id },
    include: { tutor: { select: { id: true, name: true } } },
  });
  if (!payout) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (payout.status === 'PAID' || payout.status === 'REJECTED') {
    return NextResponse.json({ error: 'This request has already been processed' }, { status: 400 });
  }

  const now = new Date();

  if (status === 'PAID') {
    await prisma.payoutRequest.update({
      where: { id: params.id },
      data: { status: 'PAID', processedById: adminId, adminNote, processedAt: now },
    });
    await completePayout(payout.tutorId, Number(payout.amountUsd), payout.id);
    await createInAppNotification({
      userId: payout.tutorId,
      preferenceType: 'SESSION_UPDATES',
      type: 'PAYOUT_PAID',
      title: 'Withdrawal confirmed',
      body: `Your withdrawal of $${Number(payout.amountUsd).toFixed(2)} has been sent.`,
      link: '/dashboard/tutor/wallet',
    });
  } else if (status === 'REJECTED') {
    await prisma.payoutRequest.update({
      where: { id: params.id },
      data: { status: 'REJECTED', processedById: adminId, rejectionReason, processedAt: now },
    });
    await cancelPayout(payout.tutorId, Number(payout.amountUsd), payout.id);
    await createInAppNotification({
      userId: payout.tutorId,
      preferenceType: 'SESSION_UPDATES',
      type: 'PAYOUT_REJECTED',
      title: 'Withdrawal request rejected',
      body: `Your withdrawal of $${Number(payout.amountUsd).toFixed(2)} was rejected. Funds returned to your balance.`,
      link: '/dashboard/tutor/wallet',
    });
  } else if (status === 'APPROVED') {
    await prisma.payoutRequest.update({
      where: { id: params.id },
      data: { status: 'APPROVED', processedById: adminId, adminNote },
    });
  } else {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
