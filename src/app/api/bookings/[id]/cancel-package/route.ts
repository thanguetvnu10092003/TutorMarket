import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createInAppNotification } from '@/lib/in-app-notifications';

const CANCEL_THRESHOLD_HOURS = 24;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // params.id is the bookingPackage id
    const pkg = await prisma.bookingPackage.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          include: { payment: true },
        },
        payment: true,
        tutorProfile: {
          include: { user: { select: { id: true, name: true } } },
        },
        student: { select: { id: true, name: true } },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const isStudentOwner = pkg.studentId === session.user.id;
    const isTutorOwner = pkg.tutorProfile.userId === session.user.id;

    if (!isStudentOwner && !isTutorOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const upcomingBookings = pkg.bookings.filter(
      (b) => b.status === 'PENDING' || b.status === 'CONFIRMED'
    );

    if (upcomingBookings.length === 0) {
      return NextResponse.json({ error: 'No upcoming sessions to cancel' }, { status: 400 });
    }

    const nearestSession = upcomingBookings.reduce((min, b) =>
      b.scheduledAt < min.scheduledAt ? b : min
    );
    const hoursUntilNearest =
      (nearestSession.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilNearest < CANCEL_THRESHOLD_HOURS) {
      return NextResponse.json(
        {
          error: `Cannot cancel package: the next session is within ${CANCEL_THRESHOLD_HOURS} hours of its scheduled time`,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.booking.updateMany({
        where: {
          packageId: pkg.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        data: { status: 'CANCELLED', cancelledAt: now },
      }),
      ...(pkg.payment && pkg.payment.status === 'CAPTURED'
        ? [
            prisma.payment.update({
              where: { id: pkg.payment.id },
              data: {
                status: 'REFUNDED',
                refundedAmount: pkg.payment.amount,
                refundedAt: now,
                refundReason: `Package cancelled by ${isStudentOwner ? 'student' : 'tutor'}`,
              },
            }),
          ]
        : []),
    ]);

    const notifyUserId = isStudentOwner ? pkg.tutorProfile.user.id : pkg.studentId;
    const actorName = isStudentOwner ? pkg.student.name : pkg.tutorProfile.user.name;
    await createInAppNotification({
      userId: notifyUserId,
      preferenceType: 'SESSION_UPDATES',
      type: 'BOOKING_CANCELLED',
      title: 'Lesson package cancelled',
      body: `${actorName} cancelled the lesson package. All upcoming sessions have been cancelled.`,
      link: isStudentOwner
        ? '/dashboard/tutor?tab=sessions'
        : '/dashboard/student?tab=bookings',
    });

    return NextResponse.json({ success: true, message: 'Package cancelled successfully' });
  } catch (error) {
    console.error('Package cancel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
