import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getCommissionSplit } from '@/lib/platform-settings';
import {
  createStudentPaymentNotification,
  createTutorPaymentNotification,
} from '@/lib/payment-notifications';

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
        booking: {
          include: {
            student: {
              select: {
                name: true,
              },
            },
            tutorProfile: {
              select: {
                userId: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        package: {
          include: {
            student: {
              select: {
                name: true,
              },
            },
            tutorProfile: {
              select: {
                userId: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
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
    const split = await getCommissionSplit(payment.amount);
    const paidAt = new Date();

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CAPTURED',
        paidAt,
        platformFee: split.platformFee,
        tutorPayout: split.tutorPayout,
      },
    });

    // 2. Fulfill the purchase based on type
    if (payment.bookingId) {
      await prisma.bookingEvent.create({
        data: {
          bookingId: payment.bookingId,
          eventType: 'PAYMENT_CAPTURED',
          title: 'Payment captured',
          details: 'Student payment was captured successfully. Waiting for tutor confirmation if required.',
        },
      });
    } else if (payment.packageId) {
      // Package: The package is effectively "active" once paid.
      // In this system, BookingPackage tracks remaining sessions. 
      // We don't need to change its status, it's just available to use.
      // But we could optionally update a 'status' field if it had one.
      
      // Update tutor's total students/sessions stats optionally, or just wait for completed sessions.
    }

    await createTutorPaymentNotification({
      paymentAmount: payment.amount,
      tutorPayout: split.tutorPayout,
      paidAt,
      booking: payment.booking
        ? {
            id: payment.booking.id,
            studentId: payment.booking.studentId,
            subject: payment.booking.subject,
            scheduledAt: payment.booking.scheduledAt,
            student: payment.booking.student,
            tutorProfile: payment.booking.tutorProfile,
          }
        : null,
      package: payment.package
        ? {
            id: payment.package.id,
            studentId: payment.package.studentId,
            totalSessions: payment.package.totalSessions,
            student: payment.package.student,
            tutorProfile: payment.package.tutorProfile,
          }
        : null,
    });

    await createStudentPaymentNotification({
      paymentAmount: payment.amount,
      tutorPayout: split.tutorPayout,
      paidAt,
      booking: payment.booking
        ? {
            id: payment.booking.id,
            studentId: payment.booking.studentId,
            subject: payment.booking.subject,
            scheduledAt: payment.booking.scheduledAt,
            student: payment.booking.student,
            tutorProfile: payment.booking.tutorProfile,
          }
        : null,
      package: payment.package
        ? {
            id: payment.package.id,
            studentId: payment.package.studentId,
            totalSessions: payment.package.totalSessions,
            student: payment.package.student,
            tutorProfile: payment.package.tutorProfile,
          }
        : null,
    });
    return NextResponse.json({ success: true, data: updatedPayment });

  } catch (error: any) {
    console.error('Mock payment error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
