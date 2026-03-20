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

    const payments = await prisma.payment.findMany({
      where:
        session.user.role === 'STUDENT'
          ? {
              OR: [
                {
                  booking: {
                    studentId: session.user.id,
                  },
                },
                {
                  package: {
                    studentId: session.user.id,
                  },
                },
              ],
            }
          : {
              OR: [
                {
                  booking: {
                    tutorProfile: {
                      userId: session.user.id,
                    },
                  },
                },
                {
                  package: {
                    tutorProfile: {
                      userId: session.user.id,
                    },
                  },
                },
              ],
            },
      include: {
        booking: {
          include: {
            tutorProfile: {
              include: {
                user: {
                  select: { name: true, avatarUrl: true },
                },
              },
            },
            student: {
              select: { name: true, avatarUrl: true },
            },
          },
        },
        package: {
          include: {
            tutorProfile: {
              include: {
                user: {
                  select: { name: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      data: payments.map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        refundedAmount: payment.refundedAmount,
        currency: 'USD',
        paymentMethod: payment.amount === 0 ? 'FREE_TRIAL' : 'STRIPE_CHECKOUT',
        status: payment.amount === 0 ? 'FREE_TRIAL' : payment.status,
        payoutStatus: payment.payoutStatus,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        refundedAt: payment.refundedAt,
        canPayNow: session.user.role === 'STUDENT' && payment.status === 'PENDING' && payment.amount > 0,
        kind: payment.bookingId ? 'BOOKING' : 'PACKAGE',
        subject: payment.booking?.subject || null,
        tutorName: payment.booking?.tutorProfile?.user?.name || payment.package?.tutorProfile?.user?.name || null,
        tutorAvatarUrl: payment.booking?.tutorProfile?.user?.avatarUrl || payment.package?.tutorProfile?.user?.avatarUrl || null,
        packageSessions: payment.package?.totalSessions || null,
      })),
    });
  } catch (error) {
    console.error('Payment history fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment history' }, { status: 500 });
  }
}
