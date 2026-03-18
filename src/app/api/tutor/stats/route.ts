import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: (session.user as any).id },
      include: {
        bookings: {
          where: { status: 'COMPLETED' },
          include: { payment: true },
        },
        reviews: true,
      },
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 1. Total hours taught
    const totalMinutes = tutorProfile.bookings.reduce((acc, b) => acc + (b.durationMinutes || 60), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // 2. Overall rating
    const totalReviews = tutorProfile.reviews.length;
    const avgRating = totalReviews > 0 
      ? Math.round((tutorProfile.reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    // 3. Total sessions completed
    const totalSessions = tutorProfile.bookings.length;

    // 4. Total earnings (net after platform fee)
    const totalEarnings = tutorProfile.bookings.reduce((acc, b) => {
      return acc + (b.payment?.tutorPayout || 0);
    }, 0);

    return NextResponse.json({
      data: {
        totalHours,
        avgRating,
        totalReviews,
        totalSessions,
        totalEarnings,
      }
    });
  } catch (error) {
    console.error('Tutor stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
