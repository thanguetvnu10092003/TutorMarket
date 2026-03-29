// src/app/api/tutors/[id]/available-slots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSlotStatusForDate } from '@/lib/availability';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');    // "2026-03-31"
    const durationParam = searchParams.get('duration'); // "60"

    if (!dateParam || !durationParam) {
      return NextResponse.json({ error: 'date and duration are required' }, { status: 400 });
    }

    const duration = parseInt(durationParam, 10);
    if (![30, 60, 90].includes(duration)) {
      return NextResponse.json({ error: 'duration must be 30, 60, or 90' }, { status: 400 });
    }

    // Parse date as local calendar date (year-month-day only)
    const [year, month, day] = dateParam.split('-').map(Number);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const tutorProfile = await prisma.tutorProfile.findFirst({
      where: {
        id: params.id,
        hiddenFromSearch: false,
        verificationStatus: { in: ['APPROVED', 'PENDING'] },
      },
      include: {
        availability: { where: { isActive: true } },
        overrides: {
          where: {
            date: {
              gte: new Date(year, month - 1, day, 0, 0, 0, 0),
              lt: new Date(year, month - 1, day + 1, 0, 0, 0, 0),
            },
          },
        },
        bookings: {
          where: {
            scheduledAt: {
              gte: new Date(year, month - 1, day, 0, 0, 0, 0),
              lt: new Date(year, month - 1, day + 1, 0, 0, 0, 0),
            },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          select: { scheduledAt: true, durationMinutes: true, status: true },
        },
      },
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const slots = getSlotStatusForDate({
      date,
      durationMinutes: duration,
      availability: tutorProfile.availability,
      overrides: tutorProfile.overrides,
      bookings: tutorProfile.bookings.map((b) => ({
        scheduledAt: b.scheduledAt,
        durationMinutes: b.durationMinutes,
        status: b.status,
      })),
      now: new Date(),
    });

    return NextResponse.json({
      date: dateParam,
      duration,
      slots,
    });
  } catch (error) {
    console.error('available-slots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
