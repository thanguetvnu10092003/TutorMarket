import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateCommission } from '@/lib/utils';

function getCapturedPaymentSplit(amount: number) {
  if (amount <= 0) {
    return { platformFee: 0, tutorPayout: 0 };
  }

  return calculateCommission(amount, 2, 0);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Find the pending payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: true,
        package: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Security check: Ensure payment belongs to the current user
    if (
      (payment.booking && payment.booking.studentId !== session.user.id) ||
      (payment.package && payment.package.studentId !== session.user.id)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payment is already processed' }, { status: 400 });
    }

    // 1. Mark payment as CAPTURED
    const split = getCapturedPaymentSplit(payment.amount);

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CAPTURED',
        paidAt: new Date(),
        platformFee: split.platformFee,
        tutorPayout: split.tutorPayout,
      },
    });

    // 2. Fulfill the purchase based on type
    if (payment.bookingId) {
      // Single Lesson: Update booking status to CONFIRMED
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });
    } else if (payment.packageId) {
      // Package: The package is effectively "active" once paid.
      // In this system, BookingPackage tracks remaining sessions. 
      // We don't need to change its status, it's just available to use.
      // But we could optionally update a 'status' field if it had one.
      
      // Update tutor's total students/sessions stats optionally, or just wait for completed sessions.
    }

    return NextResponse.json({ success: true, data: updatedPayment });

  } catch (error: any) {
    console.error('Mock payment error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
