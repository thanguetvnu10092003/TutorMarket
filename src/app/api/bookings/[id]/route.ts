import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { buildBookingRoomUrl } from '@/lib/utils';
import { createInAppNotification } from '@/lib/in-app-notifications';

const VALID_ACTIONS = ['accept', 'cancel', 'complete', 'decline'] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body?.action;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        payment: true,
        tutorProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const isStudentOwner = booking.studentId === session.user.id;
    const isTutorOwner = booking.tutorProfile.userId === session.user.id;

    if (!isStudentOwner && !isTutorOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'cancel') {
      if (booking.status === 'CANCELLED') {
        return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
      }
      if (booking.status === 'COMPLETED') {
        return NextResponse.json({ error: 'Completed bookings cannot be cancelled' }, { status: 400 });
      }

      const CANCEL_THRESHOLD_HOURS = 24;
      const hoursUntilSession = (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilSession < CANCEL_THRESHOLD_HOURS) {
        return NextResponse.json(
          { error: `Cannot cancel within ${CANCEL_THRESHOLD_HOURS} hours of scheduled time` },
          { status: 400 }
        );
      }

      const payment = booking.payment;
      const now = new Date();
      const ops: any[] = [
        prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED', cancelledAt: now } }),
        prisma.bookingEvent.create({
          data: {
            bookingId: booking.id,
            eventType: 'BOOKING_CANCELLED',
            title: 'Booking cancelled',
            details: `${isTutorOwner ? 'Tutor' : 'Student'} cancelled the session.`,
          },
        }),
      ];

      let isStripeRefund = false;

      if (payment && payment.amount > 0 && payment.status === 'CAPTURED') {
        const isStripePayment = (payment as any).paymentMethod === 'STRIPE' || !(payment as any).paymentMethod;
        if (isStripePayment) {
          isStripeRefund = true;
        } else {
          // Store credit refund for PayOS payments
          ops.push(
            prisma.studentCredit.create({
              data: {
                studentId: booking.studentId,
                amount: payment.amount,
                source: 'REFUND',
              },
            })
          );
        }
        ops.push(
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'REFUNDED',
              refundedAmount: payment.amount,
              refundedAt: now,
              refundReason: 'Booking cancelled',
            },
          })
        );
      }

      const [updatedBooking] = await prisma.$transaction(ops);

      // Stripe refund happens AFTER DB transaction commits
      if (isStripeRefund && payment?.stripePaymentIntentId && stripe) {
        try {
          await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
        } catch (err) {
          console.error('Stripe refund failed for payment', payment.id, err);
          await prisma.payment.update({
            where: { id: payment!.id },
            data: { stripeRefundFailed: true },
          }).catch(() => {});
        }
      }

      await createInAppNotification({
        userId: isTutorOwner ? booking.studentId : booking.tutorProfile.userId,
        preferenceType: 'SESSION_UPDATES',
        type: 'BOOKING_CANCELLED',
        title: 'Session cancelled',
        body: `Your session has been cancelled.${payment?.amount ? ' A refund has been issued.' : ''}`,
        link: isTutorOwner ? '/dashboard/student?tab=bookings' : '/dashboard/tutor?tab=sessions',
      });

      return NextResponse.json({ data: updatedBooking, message: 'Booking cancelled successfully' });
    }

    if (!isTutorOwner) {
      return NextResponse.json({ error: 'Only the tutor can manage this booking action' }, { status: 403 });
    }

    if (action === 'accept') {
      if (booking.status !== 'PENDING') {
        return NextResponse.json({ error: 'Only pending bookings can be accepted' }, { status: 400 });
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          meetingLink: booking.meetingLink || buildBookingRoomUrl(booking.id),
        },
      });

      await prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          eventType: 'BOOKING_ACCEPTED',
          title: 'Booking accepted',
          details: `${booking.tutorProfile.user.name} accepted the booking request.`,
        },
      });

      await createInAppNotification({
        userId: booking.studentId,
        preferenceType: 'SESSION_UPDATES',
        type: 'BOOKING_CONFIRMED',
        title: 'Your booking is confirmed',
        body: `${booking.tutorProfile.user.name} accepted your booking request. Your session is now confirmed.`,
        link: '/dashboard/student?tab=bookings',
      });

      return NextResponse.json({
        data: updatedBooking,
        message: 'Booking accepted and student notified.',
      });
    }

    if (action === 'decline') {
      if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
        return NextResponse.json({ error: 'This booking can no longer be declined' }, { status: 400 });
      }

      const now = new Date();
      const payment = booking.payment;
      const operations: any[] = [
        prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED', cancelledAt: now },
        }),
        prisma.bookingEvent.create({
          data: {
            bookingId: booking.id,
            eventType: 'BOOKING_DECLINED',
            title: 'Booking declined',
            details: `${booking.tutorProfile.user.name} declined the booking request.`,
          },
        }),
      ];

      if (payment && payment.amount > 0 && payment.status !== 'REFUNDED') {
        operations.push(
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'REFUNDED',
              refundedAmount: payment.amount,
              refundedAt: now,
              refundReason: 'Tutor declined the booking request',
            },
          })
        );
      }

      const [updatedBooking] = await prisma.$transaction(operations);

      // Always Stripe refund when tutor declines — student entitled to full refund
      if (payment?.stripePaymentIntentId && payment.status === 'CAPTURED' && stripe) {
        try {
          await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
        } catch (err) {
          console.error('Stripe refund failed for declined booking', payment.id, err);
          await prisma.payment.update({
            where: { id: payment.id },
            data: { stripeRefundFailed: true },
          }).catch(() => {});
        }
      }

      await createInAppNotification({
        userId: booking.studentId,
        preferenceType: 'SESSION_UPDATES',
        type: 'BOOKING_DECLINED',
        title: 'Booking request declined',
        body: payment?.amount
          ? `${booking.tutorProfile.user.name} declined your booking. A refund has been issued.`
          : `${booking.tutorProfile.user.name} declined your booking request.`,
        link: '/dashboard/student?tab=bookings',
      });

      return NextResponse.json({ data: updatedBooking, message: 'Booking declined and student notified.' });
    }

    if (booking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Booking is already completed' }, { status: 400 });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        eventType: 'SESSION_COMPLETED',
        title: 'Session completed',
        details: `Tutor marked the session with ${booking.student.name} as completed.`,
      },
    });

    await createInAppNotification({
      userId: booking.studentId,
      preferenceType: 'SESSION_UPDATES',
      type: 'SESSION_COMPLETED',
      title: 'Your session is complete',
      body: `Your lesson with ${booking.tutorProfile.user.name} has been marked as completed. You can now leave a review.`,
      link: '/dashboard/student?tab=bookings',
    });

    return NextResponse.json({
      data: updatedBooking,
      message: 'Session marked as complete. The student can now leave a review.',
    });
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
