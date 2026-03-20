import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    if (!action || !['cancel', 'complete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        tutorProfile: true,
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

      const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          userId: isTutorOwner ? booking.studentId : booking.tutorProfile.userId,
          type: 'BOOKING_CANCELLED',
          title: 'Session cancelled',
          body: `${booking.student.name}'s session has been cancelled.`,
          link: '/dashboard/student?tab=bookings',
        },
      });

      return NextResponse.json({
        data: updatedBooking,
        message: 'Booking cancelled successfully',
      });
    }

    if (!isTutorOwner) {
      return NextResponse.json({ error: 'Only the tutor can mark a session as complete' }, { status: 403 });
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

    await prisma.notification.create({
      data: {
        userId: booking.studentId,
        type: 'SESSION_COMPLETED',
        title: 'Your session is complete',
        body: `Your lesson with ${booking.tutorProfile.headline || 'your tutor'} has been marked as completed. You can now leave a review.`,
        link: '/dashboard/student?tab=bookings',
      },
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
