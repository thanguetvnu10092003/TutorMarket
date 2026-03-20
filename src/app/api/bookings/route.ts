import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createCheckoutSessionForStudentPayment } from '@/lib/payment-checkout';
import { buildBookingRoomUrl, formatDateTime } from '@/lib/utils';
import { createInAppNotification } from '@/lib/in-app-notifications';
import { z } from 'zod';

const bookingSchema = z.object({
  tutorProfileId: z.string(),
  scheduledAt: z.string().optional(), // Optional for packages
  type: z.enum(['TRIAL', 'SINGLE', 'PACKAGE']),
  subject: z.string(),
  notes: z.string().optional(),
  packageSessions: z.number().optional(),
  discount: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tutorProfileId, scheduledAt, type, subject, notes, packageSessions, discount } = bookingSchema.parse(body);

    const studentId = session.user.id;

    // 1. Fetch tutor profile
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    // 2. Handle Package Purchase
    if (type === 'PACKAGE') {
      if (!packageSessions) {
        return NextResponse.json({ error: 'Package sessions count is required' }, { status: 400 });
      }

      const totalAmount = (tutorProfile.hourlyRate * packageSessions) * (1 - (discount || 0));

      const pkg = await prisma.bookingPackage.create({
        data: {
          studentId,
          tutorProfileId,
          totalSessions: packageSessions,
          sessionsRemaining: packageSessions,
          pricePerSession: totalAmount / packageSessions,
          totalPaid: totalAmount,
          packageDiscount: discount || 0,
          payment: {
            create: {
              amount: totalAmount,
              status: 'PENDING',
              platformFee: 0,
              tutorPayout: 0,
            }
          }
        },
        include: {
          payment: true
        }
      });

      const packagePayment = pkg.payment;
      let checkoutUrl: string | null = null;

      if (packagePayment && packagePayment.amount > 0) {
        try {
          const { session: checkoutSession } = await createCheckoutSessionForStudentPayment({
            paymentId: packagePayment.id,
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

    // 3. Handle Single or Trial Booking
    if (!scheduledAt) {
      return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 });
    }
    const scheduledDate = new Date(scheduledAt);

    // If it's a trial session, check eligibility
    if (type === 'TRIAL') {
      const existingTrial = await prisma.booking.findFirst({
        where: {
          studentId,
          tutorProfileId,
          isFreeSession: true,
          status: { not: 'CANCELLED' }
        }
      });

      if (existingTrial) {
        return NextResponse.json({ 
          error: 'You have already had a trial session with this tutor.' 
        }, { status: 400 });
      }
    }

    // Calculate price
    let price = 0;
    let isFreeSession = false;

    if (type === 'TRIAL') {
      price = 0;
      isFreeSession = true;
    } else {
      price = tutorProfile.hourlyRate;
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        studentId,
        tutorProfileId,
        scheduledAt: scheduledDate,
        durationMinutes: type === 'TRIAL' ? 30 : 60,
        status: 'PENDING',
        isFreeSession,
        subject: subject as any,
        notes,
        payment: {
          create: {
            amount: price,
            status: price === 0 ? 'CAPTURED' : 'PENDING',
            platformFee: 0,
            tutorPayout: 0,
          }
        }
      },
      include: {
        payment: true
      }
    });

    if (!booking.meetingLink) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          meetingLink: buildBookingRoomUrl(booking.id),
        },
      });
      booking.meetingLink = buildBookingRoomUrl(booking.id);
    }

    await createInAppNotification({
      userId: studentId,
      preferenceType: 'SESSION_UPDATES',
      type: 'BOOKING_CREATED',
      title: type === 'TRIAL' ? 'Trial lesson booked' : 'Booking created',
      body:
        price === 0
          ? `Your ${type === 'TRIAL' ? 'trial lesson' : 'lesson'} with ${tutorProfile.user.name} for ${subject.replace(/_/g, ' ')} is scheduled for ${formatDateTime(booking.scheduledAt.toISOString())}. Payment status: free trial.`
          : `Your lesson with ${tutorProfile.user.name} for ${subject.replace(/_/g, ' ')} is scheduled for ${formatDateTime(booking.scheduledAt.toISOString())}. Payment status: pending Stripe checkout.`,
      link: '/dashboard/student?tab=bookings',
    });

    const bookingPayment = booking.payment;
    let checkoutUrl: string | null = null;

    if (bookingPayment && bookingPayment.amount > 0) {
      try {
        const { session: checkoutSession } = await createCheckoutSessionForStudentPayment({
          paymentId: bookingPayment.id,
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
      data: booking,
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
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const role = searchParams.get('role') || session.user.role;

        const bookings = await prisma.booking.findMany({
            where: role === 'STUDENT' ? { studentId: session.user.id } : { tutorProfileId: session.user.id },
            include: {
                tutorProfile: {
                    include: { user: true }
                },
                student: {
                    select: { id: true, name: true, avatarUrl: true, email: true }
                },
                payment: true
            },
            orderBy: { scheduledAt: 'desc' }
        });

        // Also fetch active packages if student
        let packages: any[] = [];
        if (role === 'STUDENT') {
            packages = await prisma.bookingPackage.findMany({
                where: { studentId: session.user.id, sessionsRemaining: { gt: 0 } },
                include: {
                    tutorProfile: { include: { user: true } }
                }
            });
        }

        return NextResponse.json({ 
            data: bookings,
            packages: packages
        });
    } catch (error: any) {
        console.error('GET bookings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
