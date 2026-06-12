import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const account = await prisma.bankAccount.findFirst({ where: { id: params.id, userId } });
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const pendingPayout = await prisma.payoutRequest.findFirst({
    where: { bankAccountId: params.id, status: 'PENDING' },
  });
  if (pendingPayout) {
    return NextResponse.json({ error: 'Cannot delete a bank account with a pending payout request' }, { status: 400 });
  }

  await prisma.bankAccount.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
