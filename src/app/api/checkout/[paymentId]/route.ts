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

    // Since we're separating out a processing fee purely for the UI match, 
    // we'll say processing fee is exactly $0.30 fixed as requested, and subtract to find "subtotal"
    // (Or we can consider the total amount from DB to be exactly what we charge).
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
          students: tutorProfile.actualStudentCount,
          lessons: tutorProfile.actualBookingCount,
          yearsTeaching: tutorProfile.yearsOfExperience,
        },
        bookings: bookingsInfo,
      }
    });

  } catch (error) {
    console.error('Checkout GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch checkout details' }, { status: 500 });
  }
}
