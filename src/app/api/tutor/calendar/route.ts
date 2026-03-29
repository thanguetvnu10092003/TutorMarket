// src/app/api/tutor/calendar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start'); // "2026-03-31"
    const endParam = searchParams.get('end');     // "2026-04-06"

    if (!startParam || !endParam) {
      return NextResponse.json({ error: 'start and end are required' }, { status: 400 });
    }

    const [sy, sm, sd] = startParam.split('-').map(Number);
    const [ey, em, ed] = endParam.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const endDate = new Date(ey, em - 1, ed, 23, 59, 59, 999);

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        availability: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        overrides: {
          where: { date: { gte: startDate, lte: endDate } },
        },
        bookings: {
          where: {
            scheduledAt: { gte: startDate, lte: endDate },
            status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
          },
          include: {
            student: {
              select: { name: true, avatarUrl: true },
            },
          },
          orderBy: { scheduledAt: 'asc' },
        },
      },
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      availability: tutorProfile.availability.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
      bookings: tutorProfile.bookings.map((b) => ({
        id: b.id,
        scheduledAt: b.scheduledAt.toISOString(),
        durationMinutes: b.durationMinutes,
        status: b.status,
        student: b.student,
        subject: b.subject,
        meetingLink: b.meetingLink,
        notes: b.notes,
      })),
      overrides: tutorProfile.overrides.map((o) => ({
        date: o.date.toISOString(),
        startTime: o.startTime,
        endTime: o.endTime,
        isAvailable: o.isAvailable,
        reason: o.reason,
      })),
      timezone: tutorProfile.timezone || 'UTC',
    });
  } catch (error) {
    console.error('tutor calendar error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
