// src/app/api/tutors/[id]/weekly-availability/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { expandWindowsToSlots, getOpenTimeWindowsForDate, timeToMinutes } from '@/lib/availability';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get('weekStart'); // "2026-03-31"

    if (!weekStartParam) {
      return NextResponse.json({ error: 'weekStart is required' }, { status: 400 });
    }

    const [y, m, d] = weekStartParam.split('-').map(Number);
    const weekStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (isNaN(weekStart.getTime())) {
      return NextResponse.json({ error: 'Invalid weekStart' }, { status: 400 });
    }

    // Build 7 dates
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(y, m - 1, d + i, 0, 0, 0, 0);
      dates.push(dt);
    }
    const weekEnd = dates[6];

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
            date: { gte: weekStart, lte: weekEnd },
          },
        },
        bookings: {
          where: {
            scheduledAt: { gte: weekStart, lt: new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate() + 1, 0, 0, 0, 0) },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          select: { scheduledAt: true, durationMinutes: true, status: true },
        },
      },
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const slots: Array<{
      day: string;
      date: string;
      startTime: string;
      endTime: string;
      status: 'available' | 'booked';
    }> = [];

    for (const date of dates) {
      const dateKey = formatDateKey(date);

      // All available 30-min slots for this day (ignoring bookings)
      const allWindows = getOpenTimeWindowsForDate({
        date,
        durationMinutes: 30,
        availability: tutorProfile.availability,
        overrides: tutorProfile.overrides,
        bookings: [],
      });
      const allSlots = expandWindowsToSlots(allWindows, 30);

      // Build set of booked start-times (minute values) for this date
      const bookedMinutes = new Set<number>();
      for (const booking of tutorProfile.bookings) {
        const bDate = new Date(booking.scheduledAt);
        const bDateKey = formatDateKey(bDate);
        if (bDateKey !== dateKey) continue;
        const bStart = bDate.getHours() * 60 + bDate.getMinutes();
        const bEnd = bStart + booking.durationMinutes;
        // Mark every 30-min slot covered by this booking
        for (let t = bStart; t < bEnd; t += 30) {
          bookedMinutes.add(t);
        }
      }

      for (const slot of allSlots) {
        const startMins = timeToMinutes(slot.startTime);
        slots.push({
          day: DAY_NAMES[date.getDay()],
          date: dateKey,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: bookedMinutes.has(startMins) ? 'booked' : 'available',
        });
      }
    }

    return NextResponse.json({
      weekStart: weekStartParam,
      weekEnd: formatDateKey(weekEnd),
      timezone: tutorProfile.timezone || 'UTC',
      slots,
    });
  } catch (error) {
    console.error('weekly-availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
