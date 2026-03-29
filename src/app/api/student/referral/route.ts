import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
          id: true,
          referralCode: true,
          credits: {
              where: { usedAt: null },
              select: { amount: true }
          },
          referralsMade: {
              include: {
                  referredUser: {
                      select: { name: true, createdAt: true }
                  }
              }
          }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalCredits = user.credits.reduce((acc, curr) => acc + curr.amount, 0);

    return NextResponse.json({
      data: {
        referralCode: user.referralCode,
        referralLink: `${process.env.NEXT_PUBLIC_APP_URL || ''}/register?invite=${user.referralCode}`,
        totalCredits,
        referralCount: user.referralsMade.length,
        referrals: user.referralsMade
      }
    });

  } catch (error) {
    console.error('Referral API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
