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

    const bookingPaymentsPromise = prisma.payment.findMany({
      where:
        session.user.role === 'STUDENT'
          ? { booking: { studentId: session.user.id } }
          : { booking: { tutorProfile: { userId: session.user.id } } },
      include: {
        booking: {
          include: {
            tutorProfile: { include: { user: { select: { name: true, avatarUrl: true } } } },
            student: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });

    const packagePaymentsPromise = prisma.payment.findMany({
      where:
        session.user.role === 'STUDENT'
          ? { package: { studentId: session.user.id } }
          : { package: { tutorProfile: { userId: session.user.id } } },
      include: {
        package: {
          include: {
            tutorProfile: { include: { user: { select: { name: true, avatarUrl: true } } } },
          },
        },
      },
    });

    const [bookingPayments, packagePayments] = await Promise.all([bookingPaymentsPromise, packagePaymentsPromise]);

    const payments = [...bookingPayments, ...packagePayments].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return NextResponse.json({
      data: payments.map((payment: any) => {
        const isCancelledBooking = payment.booking?.status === 'CANCELLED';
        const displayStatus = isCancelledBooking
          ? 'CANCELLED'
          : payment.amount === 0 ? 'FREE_TRIAL' : payment.status;
        const canPay = !isCancelledBooking && session.user.role === 'STUDENT' && payment.status === 'PENDING' && payment.amount > 0;

        return {
          id: payment.id,
          amount: payment.amount,
          refundedAmount: payment.refundedAmount,
          currency: 'USD',
          paymentMethod: payment.amount === 0 ? 'FREE_TRIAL' : 'STRIPE_CHECKOUT',
          status: displayStatus,
          payoutStatus: payment.payoutStatus,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
          refundedAt: payment.refundedAt,
          canPayNow: canPay,
          kind: payment.bookingId ? 'BOOKING' : 'PACKAGE',
          bookingId: payment.bookingId,
          packageId: payment.package?.id || null,
          subject: payment.booking?.subject || null,
          tutorName: payment.booking?.tutorProfile?.user?.name || payment.package?.tutorProfile?.user?.name || null,
          tutorAvatarUrl: payment.booking?.tutorProfile?.user?.avatarUrl || payment.package?.tutorProfile?.user?.avatarUrl || null,
          packageSessions: payment.package?.totalSessions || null,
        };
      }),
    });
  } catch (error) {
    console.error('Payment history fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment history' }, { status: 500 });
  }
}
