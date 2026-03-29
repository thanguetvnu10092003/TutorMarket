import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { paymentId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId } = params;

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        OR: [
          { booking: { studentId: session.user.id } },
          { package: { studentId: session.user.id } },
        ],
      },
      include: {
        booking: {
          include: {
            tutorProfile: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
            },
          },
        },
        package: {
          include: {
            tutorProfile: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
            },
            bookings: {
              orderBy: { sessionNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const isPackage = !!payment.package;
    const tutorProfile = isPackage ? payment.package?.tutorProfile : payment.booking?.tutorProfile;
    
    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor data missing' }, { status: 500 });
    }

    // Fetch dynamic stats for the tutor
    const aggregateData = await prisma.booking.aggregate({
      where: {
        tutorProfileId: tutorProfile.id,
        status: { in: ['COMPLETED'] }, // depending on logic, you might include CONFIRMED
      },
      _count: { id: true },
      _sum: { durationMinutes: true },
    });

    const uniqueStudents = await prisma.booking.findMany({
      where: {
        tutorProfileId: tutorProfile.id,
        status: { in: ['COMPLETED', 'CONFIRMED'] },
      },
      distinct: ['studentId'],
      select: { studentId: true },
    });

    const studentsCount = uniqueStudents.length;
    const lessonsCount = aggregateData._count.id || 0;
    const hoursTaught = Math.round((aggregateData._sum.durationMinutes || 0) / 60);

    const TOTAL = payment.amount;
    const PROCESSING_FEE = 0.30;
    const SUBTOTAL = Math.max(0, TOTAL - PROCESSING_FEE);
    
    let bookingsInfo;
    if (isPackage) {
      bookingsInfo = payment.package!.bookings.map((b) => ({
        id: b.id,
        scheduledAt: b.scheduledAt.toISOString(),
        durationMinutes: b.durationMinutes,
        subject: b.subject,
      }));
    } else {
      bookingsInfo = [{
        id: payment.booking!.id,
        scheduledAt: payment.booking!.scheduledAt.toISOString(),
        durationMinutes: payment.booking!.durationMinutes,
        subject: payment.booking!.subject,
      }];
    }

    return NextResponse.json({
      data: {
        id: payment.id,
        status: payment.status,
        amount: TOTAL,
        subtotal: SUBTOTAL,
        processingFee: PROCESSING_FEE,
        isPackage,
        packageSessions: isPackage ? payment.package!.totalSessions : 1,
        tutor: {
          id: tutorProfile.id,
          name: tutorProfile.user.name,
          avatarUrl: tutorProfile.user.avatarUrl,
          rating: tutorProfile.rating,
          totalReviews: tutorProfile.totalReviews,
          students: studentsCount,
          lessons: lessonsCount,
          hoursTaught: hoursTaught,
        },
        bookings: bookingsInfo,
      }
    });

  } catch (error) {
    console.error('Checkout GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch checkout details' }, { status: 500 });
  }
}
