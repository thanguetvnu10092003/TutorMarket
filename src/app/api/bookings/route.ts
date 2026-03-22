import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createCheckoutSessionForStudentPayment } from '@/lib/payment-checkout';
import { buildBookingRoomUrl, formatDateTime } from '@/lib/utils';
import { createInAppNotification } from '@/lib/in-app-notifications';
import { getPrimaryPriceOption } from '@/lib/currency';
import { isSlotBookable } from '@/lib/availability';
import { notifyTutorAboutBookingRequest } from '@/lib/admin';
import { z } from 'zod';

const bookingSchema = z.object({
  tutorProfileId: z.string(),
  scheduledAt: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  type: z.enum(['TRIAL', 'SINGLE', 'PACKAGE']),
  subject: z.string(),
  notes: z.string().trim().max(1500).optional(),
  packageSessions: z.number().int().positive().optional(),
  discount: z.number().min(0).max(1).optional(),
});

function hasConflictStatus(status?: string | null) {
  return status === 'PENDING' || status === 'CONFIRMED';
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tutorProfileId, scheduledAt, durationMinutes, type, subject, notes, packageSessions, discount } = bookingSchema.parse(body);

    const studentId = session.user.id;
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        pricing: {
          where: { isEnabled: true },
          orderBy: { durationMinutes: 'asc' },
        },
        availability: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        overrides: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        },
        bookings: {
          where: {
            scheduledAt: { gte: new Date() },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          select: {
            scheduledAt: true,
            durationMinutes: true,
            status: true,
          },
        },
      },
    });

    if (!tutorProfile || tutorProfile.hiddenFromSearch || tutorProfile.verificationStatus === 'REJECTED') {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const selectedPricingOption =
      type === 'TRIAL'
        ? null
        : tutorProfile.pricing.find((option) => option.durationMinutes === durationMinutes) ||
          getPrimaryPriceOption(tutorProfile.pricing);

    const selectedDurationMinutes =
      type === 'TRIAL'
        ? 30
        : durationMinutes || selectedPricingOption?.durationMinutes || 60;

    if (type !== 'TRIAL' && !selectedPricingOption) {
      return NextResponse.json({ error: 'Tutor does not offer the selected duration' }, { status: 400 });
    }

    const previousSessionsCount = await prisma.booking.count({
      where: {
        studentId,
        tutorProfileId,
        status: { not: 'CANCELLED' },
      },
    });

    if (type === 'PACKAGE') {
      if (!packageSessions) {
        return NextResponse.json({ error: 'Package sessions count is required' }, { status: 400 });
      }

      if (!selectedPricingOption) {
        return NextResponse.json({ error: 'Tutor does not offer package sessions for this duration' }, { status: 400 });
      }

      const pricePerSession = selectedPricingOption.price;
      const rawTotalAmount = pricePerSession * packageSessions * (1 - (discount || 0));
      const exchangeRate = 25500;
      const isVnd = selectedPricingOption.currency === 'VND';
      const usdTotalAmount = isVnd ? Math.round((rawTotalAmount / exchangeRate) * 100) / 100 : rawTotalAmount;

      const pkg = await prisma.bookingPackage.create({
        data: {
          studentId,
          tutorProfileId,
          totalSessions: packageSessions,
          sessionsRemaining: packageSessions,
          pricePerSession,
          totalPaid: rawTotalAmount,
          currency: selectedPricingOption.currency,
          packageDiscount: discount || 0,
          payment: {
            create: {
              amount: usdTotalAmount,
              status: 'PENDING',
              platformFee: 0,
              tutorPayout: 0,
            },
          },
        },
        include: {
          payment: true,
        },
      });

      let checkoutUrl: string | null = null;

      if (pkg.payment && pkg.payment.amount > 0) {
        try {
          const { session: checkoutSession } = await createCheckoutSessionForStudentPayment({
            paymentId: pkg.payment.id,
            studentId,
            studentEmail: session.user.email,
          });

          checkoutUrl = checkoutSession.url || null;
        } catch (checkoutError) {
          console.error('Package Stripe checkout creation error:', checkoutError);
        }
      }

      return NextResponse.json({
        success: true,
        data: pkg,
        checkoutUrl,
      });
    }

    if (!scheduledAt) {
      return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);

    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Scheduled time is invalid' }, { status: 400 });
    }

    if (scheduledDate.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Please choose a future time slot' }, { status: 400 });
    }

    if (type === 'TRIAL') {
      const existingTrial = await prisma.booking.findFirst({
        where: {
          studentId,
          tutorProfileId,
          isFreeSession: true,
          status: { not: 'CANCELLED' },
        },
        select: { id: true },
      });

      if (existingTrial) {
        return NextResponse.json({ error: 'You have already had a trial session with this tutor.' }, { status: 400 });
      }
    }

    const slotBookable = isSlotBookable({
      scheduledAt: scheduledDate,
      durationMinutes: selectedDurationMinutes,
      availability: tutorProfile.availability,
      overrides: tutorProfile.overrides,
      bookings: tutorProfile.bookings.filter((booking) => hasConflictStatus(booking.status)),
    });

    if (!slotBookable) {
      return NextResponse.json({ error: 'Tutor is not available on this date', code: 'SLOT_UNAVAILABLE' }, { status: 409 });
    }

    const rawPrice = type === 'TRIAL' ? 0 : selectedPricingOption?.price || 0;
    const isFreeSession = type === 'TRIAL';
    const exchangeRate = 25500;
    const isVnd = selectedPricingOption?.currency === 'VND';
    const usdPrice = isVnd ? Math.round((rawPrice / exchangeRate) * 100) / 100 : rawPrice;

    const booking = await prisma.booking.create({
      data: {
        studentId,
        tutorProfileId,
        scheduledAt: scheduledDate,
        durationMinutes: selectedDurationMinutes,
        status: 'PENDING',
        sessionNumber: previousSessionsCount + 1,
        isFreeSession,
        subject: subject as any,
        meetingLink: buildBookingRoomUrl(`pending-${Date.now()}`),
        notes,
        payment: {
          create: {
            amount: usdPrice,
            status: usdPrice === 0 ? 'CAPTURED' : 'PENDING',
            platformFee: 0,
            tutorPayout: 0,
          },
        },
      },
      include: {
        payment: true,
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        meetingLink: buildBookingRoomUrl(booking.id),
      },
    });

    await prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        eventType: 'BOOKING_REQUESTED',
        title: 'Booking request created',
        details: `${session.user.name || 'A student'} requested a ${selectedDurationMinutes}-minute lesson.`,
      },
    });

    await createInAppNotification({
      userId: studentId,
      preferenceType: 'SESSION_UPDATES',
      type: 'BOOKING_CREATED',
      title: type === 'TRIAL' ? 'Trial lesson requested' : 'Booking request created',
      body:
        rawPrice === 0
          ? `Your ${type === 'TRIAL' ? 'trial lesson' : 'lesson'} with ${tutorProfile.user.name} for ${subject.replace(/_/g, ' ')} was requested for ${formatDateTime(booking.scheduledAt.toISOString())}. Waiting for tutor confirmation.`
          : `Your lesson with ${tutorProfile.user.name} for ${subject.replace(/_/g, ' ')} was requested for ${formatDateTime(booking.scheduledAt.toISOString())}. Complete payment, then wait for tutor confirmation.`,
      link: '/dashboard/student?tab=bookings',
    });

    await notifyTutorAboutBookingRequest({
      tutorUserId: tutorProfile.user.id,
      tutorEmail: tutorProfile.user.email,
      tutorName: tutorProfile.user.name,
      studentName: session.user.name || 'A student',
      subject,
      scheduledAt: booking.scheduledAt,
      durationMinutes: selectedDurationMinutes,
    });

    let checkoutUrl: string | null = null;

    if (booking.payment && booking.payment.amount > 0) {
      try {
        const { session: checkoutSession } = await createCheckoutSessionForStudentPayment({
          paymentId: booking.payment.id,
          studentId,
          studentEmail: session.user.email,
        });

        checkoutUrl = checkoutSession.url || null;
      } catch (checkoutError) {
        console.error('Booking Stripe checkout creation error:', checkoutError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...booking,
        meetingLink: buildBookingRoomUrl(booking.id),
      },
      checkoutUrl,
    });
  } catch (error: any) {
    console.error('Booking error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || session.user.role;
    const tutorProfile = session.user.role === 'TUTOR'
      ? await prisma.tutorProfile.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        })
      : null;

    const bookings = await prisma.booking.findMany({
      where:
        role === 'STUDENT'
          ? { studentId: session.user.id }
          : { tutorProfileId: tutorProfile?.id || 'missing' },
      include: {
        tutorProfile: {
          include: {
            user: true,
            pricing: true,
          },
        },
        student: {
          select: { id: true, name: true, avatarUrl: true, email: true },
        },
        payment: true,
        review: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    let packages: any[] = [];
    if (role === 'STUDENT') {
      packages = await prisma.bookingPackage.findMany({
        where: { studentId: session.user.id, sessionsRemaining: { gt: 0 } },
        include: {
          tutorProfile: {
            include: {
              user: true,
              pricing: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      data: bookings,
      packages,
    });
  } catch (error: any) {
    console.error('GET bookings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
