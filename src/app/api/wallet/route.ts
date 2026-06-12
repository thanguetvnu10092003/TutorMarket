import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const page = parseInt(new URL(request.url).searchParams.get('page') ?? '1');
  const limit = 20;

  const [wallet, transactions, total] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.walletTransaction.findMany({
      where: { wallet: { userId } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.walletTransaction.count({ where: { wallet: { userId } } }),
  ]);

  return NextResponse.json({
    balance: Number(wallet?.balance ?? 0),
    frozen: Number(wallet?.frozen ?? 0),
    available: Number(wallet?.balance ?? 0) - Number(wallet?.frozen ?? 0),
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
