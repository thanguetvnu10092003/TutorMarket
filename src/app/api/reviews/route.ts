import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { createInAppNotification } from '@/lib/in-app-notifications';

const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

async function syncTutorReviewStats(tutorProfileId: string, tx: Prisma.TransactionClient) {
  const aggregate = await tx.review.aggregate({
    where: { tutorProfileId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await tx.tutorProfile.update({
    where: { id: tutorProfileId },
    data: {
      rating: Number((aggregate._avg.rating || 0).toFixed(1)),
      totalReviews: aggregate._count._all,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, rating, comment } = reviewSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        review: true,
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
      },
    });

    if (!booking || booking.studentId !== session.user.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'You can only review completed sessions' }, { status: 400 });
    }

    if (booking.review) {
      return NextResponse.json({ error: 'Review already exists for this booking' }, { status: 409 });
    }

    const review = await prisma.$transaction(async (tx) => {
      const createdReview = await tx.review.create({
        data: {
          bookingId,
          studentId: session.user.id,
          tutorProfileId: booking.tutorProfileId,
          rating,
          comment: comment || null,
          isPublic: true,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          booking: {
            select: {
              subject: true,
              scheduledAt: true,
            },
          },
        },
      });

      await syncTutorReviewStats(booking.tutorProfileId, tx);

      await tx.bookingEvent.create({
        data: {
          bookingId,
          eventType: 'REVIEW_SUBMITTED',
          title: 'Review submitted',
          details: `${session.user.name || 'Student'} left a ${rating}-star review.`,
        },
      });

      return createdReview;
    });

    await createInAppNotification({
      userId: booking.tutorProfile.user.id,
      preferenceType: 'SESSION_UPDATES',
      type: 'NEW_REVIEW',
      title: 'New student review',
      body: `${session.user.name || 'A student'} left you a ${rating}-star review.`,
      link: '/dashboard/tutor?tab=reviews',
    });

    return NextResponse.json({ data: review, message: 'Review submitted successfully' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Review submission error:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
