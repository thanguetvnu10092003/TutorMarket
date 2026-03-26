import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    // Include sessions from the last 30 days so tutors can still mark them
    // complete even if the scheduled time has already passed.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const bookings = await prisma.booking.findMany({
      where: {
        tutorProfileId: tutorProfile.id,
        status: {
          in: ['CONFIRMED', 'PENDING'],
        },
        scheduledAt: {
          gte: thirtyDaysAgo, // Show sessions from the past 30 days onwards
        },
      },
      include: {
        student: {
          select: {
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'asc' // Closest bookings first
      },
      take: 10 // Limit for dashboard preview
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Fetch tutor bookings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
