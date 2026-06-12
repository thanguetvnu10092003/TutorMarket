import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { freezeFundsForPayout, MINIMUM_PAYOUT_USD } from '@/lib/wallet';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'TUTOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { amountUsd, bankAccountId } = await request.json();
  const userId = (session.user as any).id;

  if (!amountUsd || amountUsd < MINIMUM_PAYOUT_USD) {
    return NextResponse.json({ error: `Minimum withdrawal is $${MINIMUM_PAYOUT_USD}` }, { status: 400 });
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  const available = Number(wallet?.balance ?? 0) - Number(wallet?.frozen ?? 0);
  if (available < amountUsd) {
    return NextResponse.json({ error: 'Insufficient available balance' }, { status: 400 });
  }

  const existing = await prisma.payoutRequest.findFirst({
    where: { tutorId: userId, status: 'PENDING' },
  });
  if (existing) {
    return NextResponse.json({ error: 'You already have a pending withdrawal request' }, { status: 400 });
  }

  const payoutRequest = await prisma.payoutRequest.create({
    data: { tutorId: userId, amountUsd, bankAccountId: bankAccountId ?? null, status: 'PENDING' },
  });

  await freezeFundsForPayout(userId, amountUsd, payoutRequest.id);

  return NextResponse.json({ success: true, payoutRequest });
}
