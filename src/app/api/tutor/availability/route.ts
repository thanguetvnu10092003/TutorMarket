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

// ─── Timezone shift helpers ───────────────────────────────────────────────────

/**
 * Returns the UTC offset in minutes for a given IANA timezone at a reference moment.
 * E.g. Europe/Berlin (CEST, UTC+2) → +120, Asia/Qatar (UTC+3) → +180
 */
function getTzOffsetMinutes(tz: string, ref: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  });
  const parts: Record<string, number> = {};
  for (const p of fmt.formatToParts(ref)) {
    if (p.type !== 'literal') parts[p.type] = parseInt(p.value);
  }
  const h = parts.hour === 24 ? 0 : parts.hour;
  const localMs = Date.UTC(parts.year, parts.month - 1, parts.day, h, parts.minute, parts.second);
  return (localMs - ref.getTime()) / 60000;
}

/**
 * Shifts a slot's startTime/endTime by shiftMins and adjusts dayOfWeek if crossing midnight.
 * Shift is always a multiple of 30 min (all practical tz offsets are multiples of 30).
 */
function shiftSlotTimes(
  slot: { dayOfWeek: number; startTime: string; endTime: string },
  shiftMins: number
): { dayOfWeek: number; startTime: string; endTime: string } {
  let startMins = timeToMinutes(slot.startTime) + shiftMins;
  let endMins   = timeToMinutes(slot.endTime)   + shiftMins;
  let dow = slot.dayOfWeek;

  // Handle crossing midnight (shift the day as well)
  if (startMins < 0) {
    dow = (dow - 1 + 7) % 7;
    startMins += 24 * 60;
    endMins   += 24 * 60;
  } else if (startMins >= 24 * 60) {
    dow = (dow + 1) % 7;
    startMins -= 24 * 60;
    endMins   -= 24 * 60;
  }

  return { ...slot, dayOfWeek: dow, startTime: minutesToTime(startMins), endTime: minutesToTime(endMins) };
}

// ─────────────────────────────────────────────────────────────────────────────

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

    // ── Timezone shift: preserve UTC teaching windows when TZ changes ──────────
    const oldTimezone = tutorProfile.timezone || 'UTC';
    const newTimezone = timezone || oldTimezone;

    let shiftMins = 0;
    if (newTimezone !== oldTimezone) {
      const ref = new Date();
      shiftMins = getTzOffsetMinutes(newTimezone, ref) - getTzOffsetMinutes(oldTimezone, ref);
    }

    // Shift slot times so the same UTC moments are preserved in the new timezone.
    // e.g. Berlin 09:00 (UTC+2 = UTC 07:00) → shift +60 min → Qatar 10:00 (UTC+3 = UTC 07:00) ✅
    const slotsToSave = shiftMins !== 0
      ? normalizedSlots.map((s: any) => shiftSlotTimes(s, shiftMins))
      : normalizedSlots;

    // Shift override window times as well (where present)
    const overridesToSave = shiftMins !== 0
      ? normalizedOverrides.map((o: any) => {
          if (!o.startTime || !o.endTime) return o;
          const shifted = shiftSlotTimes({ dayOfWeek: 0, startTime: o.startTime, endTime: o.endTime }, shiftMins);
          return { ...o, startTime: shifted.startTime, endTime: shifted.endTime };
        })
      : normalizedOverrides;
    // ─────────────────────────────────────────────────────────────────────────

    const slotsByDay = slotsToSave.reduce<Record<number, Array<{ startTime: string; endTime: string }>>>((accumulator, slot: any) => {
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
        timezone: newTimezone,
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
          timezone: newTimezone,
        },
      }),
      
      // Create new (shifted) slots
      ...(orderedSlots.length > 0
        ? [prisma.availability.createMany({ data: orderedSlots })]
        : []),

      // Create new (shifted) overrides
      ...(overridesToSave.length > 0
        ? [prisma.availabilityOverride.createMany({
            data: overridesToSave.map((override: any) => ({
              tutorProfileId: tutorProfile.id,
              date: new Date(override.date),
              startTime: override.startTime || null,
              endTime: override.endTime || null,
              isAvailable: override.isAvailable ?? false,
              reason: override.reason || 'Blocked',
              timezone: newTimezone,
            })),
          })]
        : []),
    ]);

    // ── Safety-net conflict scan (should be 0 after correct shift) ────────────
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
            conflictReason: 'Booking falls outside tutor availability after schedule change',
            conflictAt: new Date(),
          },
        });
      }

      // Clear stale conflict flags for bookings that are now fine
      await prisma.booking.updateMany({
        where: {
          tutorProfileId: tutorProfile.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          ...(conflictIds.length > 0 ? { id: { notIn: conflictIds } } : {}),
        },
        data: { hasConflict: false, conflictReason: null, conflictAt: null },
      });
    }

    return NextResponse.json({ success: true, conflictCount, conflictIds, timezoneShiftApplied: shiftMins });
  } catch (error) {
    console.error('Update availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
