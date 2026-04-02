import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sortAvailabilitySlots, validateDailyAvailabilitySlots, timeToMinutes, minutesToTime, detectBookingConflicts, toWallClockDate } from '@/lib/availability';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        availability: {
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
          ]
        },
        overrides: {
           where: { date: { gte: new Date() } },
           orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
        },
        bookings: {
          where: { 
            scheduledAt: { gte: new Date() },
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          select: {
            scheduledAt: true,
            durationMinutes: true
          }
        }
      }
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    // Map bookings to "bookedSlots" format for the frontend
    const bookedSlots = tutorProfile.bookings.map(b => ({
        start: b.scheduledAt,
        end: new Date(b.scheduledAt.getTime() + b.durationMinutes * 60000)
    }));

    return NextResponse.json({
        timezone: tutorProfile.timezone || tutorProfile.availability[0]?.timezone || 'UTC',
        slots: tutorProfile.availability,
        overrides: tutorProfile.overrides,
        bookedSlots
    });
  } catch (error) {
    console.error('Fetch availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timezone, slots, overrides } = await request.json();
    const normalizedSlots = Array.isArray(slots) ? slots : [];
    const normalizedOverrides = Array.isArray(overrides) ? overrides : [];

    // Validate: each slot must be on :00 or :30 boundary and exactly 30 minutes long
    for (const slot of normalizedSlots) {
      if (typeof slot.startTime !== 'string' || typeof slot.endTime !== 'string') {
        return NextResponse.json(
          { error: 'Each slot must include startTime and endTime strings' },
          { status: 400 }
        );
      }
      const startMins = timeToMinutes(slot.startTime);
      if (startMins % 30 !== 0) {
        return NextResponse.json(
          { error: 'Slot times must be on :00 or :30 boundaries' },
          { status: 400 }
        );
      }
      const expectedEnd = minutesToTime(startMins + 30);
      if (slot.endTime !== expectedEnd) {
        return NextResponse.json(
          { error: 'Each slot must be exactly 30 minutes' },
          { status: 400 }
        );
      }
    }

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    const slotsByDay = normalizedSlots.reduce<Record<number, Array<{ startTime: string; endTime: string }>>>((accumulator, slot) => {
      const dayOfWeek = Number(slot.dayOfWeek);
      accumulator[dayOfWeek] = accumulator[dayOfWeek] || [];
      accumulator[dayOfWeek].push({
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      return accumulator;
    }, {});

    for (const dailySlots of Object.values(slotsByDay)) {
      const validation = validateDailyAvailabilitySlots(dailySlots);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    const orderedSlots = Object.entries(slotsByDay).flatMap(([dayOfWeek, daySlots]) =>
      sortAvailabilitySlots(daySlots).map((slot) => ({
        tutorProfileId: tutorProfile.id,
        dayOfWeek: Number(dayOfWeek),
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: timezone || 'Asia/Ho_Chi_Minh',
        isRecurring: true,
      }))
    );

    await prisma.$transaction([
      // Delete old slots and overrides
      prisma.availability.deleteMany({ where: { tutorProfileId: tutorProfile.id } }),
      prisma.availabilityOverride.deleteMany({ where: { tutorProfileId: tutorProfile.id } }),
      prisma.tutorProfile.update({
        where: { id: tutorProfile.id },
        data: {
          timezone: timezone || tutorProfile.timezone || 'Asia/Ho_Chi_Minh',
        },
      }),
      
      // Create new slots
      ...(orderedSlots.length > 0
        ? [prisma.availability.createMany({ data: orderedSlots })]
        : []),

      // Create new overrides
      ...(normalizedOverrides.length > 0
        ? [prisma.availabilityOverride.createMany({
            data: normalizedOverrides.map((override: any) => ({
              tutorProfileId: tutorProfile.id,
              date: new Date(override.date),
              startTime: override.startTime || null,
              endTime: override.endTime || null,
              isAvailable: override.isAvailable ?? false,
              reason: override.reason || 'Blocked',
              timezone: timezone || tutorProfile.timezone || 'UTC',
            })),
          })]
        : []),
    ]);

    // --- Conflict scan after availability save ---
    const newTimezone = timezone || tutorProfile.timezone || 'UTC';

    const activeBookings = await prisma.booking.findMany({
      where: {
        tutorProfileId: tutorProfile.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { gte: new Date() },
      },
      select: { id: true, scheduledAt: true, durationMinutes: true },
    });

    let conflictCount = 0;
    let conflictIds: string[] = [];

    if (activeBookings.length > 0) {
      const freshAvailability = await prisma.availability.findMany({
        where: { tutorProfileId: tutorProfile.id, isActive: true },
      });
      const freshOverrides = await prisma.availabilityOverride.findMany({
        where: { tutorProfileId: tutorProfile.id, date: { gte: new Date() } },
      });

      const localBookings = activeBookings.map((b) => ({
        ...b,
        scheduledAt: toWallClockDate(b.scheduledAt, newTimezone),
      }));
      const localOverrides = freshOverrides.map((o) => ({
        ...o,
        date: toWallClockDate(o.date, newTimezone),
      }));

      conflictIds = detectBookingConflicts({
        bookings: localBookings,
        availability: freshAvailability,
        overrides: localOverrides,
      });
      conflictCount = conflictIds.length;

      if (conflictIds.length > 0) {
        await prisma.booking.updateMany({
          where: { id: { in: conflictIds } },
          data: {
            hasConflict: true,
            conflictReason: 'Booking falls outside tutor availability after timezone change',
            conflictAt: new Date(),
          },
        });
      }

      // Clear stale flags for bookings that are now fine
      await prisma.booking.updateMany({
        where: {
          tutorProfileId: tutorProfile.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          ...(conflictIds.length > 0 ? { id: { notIn: conflictIds } } : {}),
        },
        data: { hasConflict: false, conflictReason: null, conflictAt: null },
      });
    }

    return NextResponse.json({ success: true, conflictCount, conflictIds });
  } catch (error) {
    console.error('Update availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
