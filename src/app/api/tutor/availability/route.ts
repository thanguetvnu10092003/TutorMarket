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
           orderBy: { date: 'asc' }
        },
        bookings: {
          where: { 
            scheduledAt: { gte: new Date() },
            status: 'CONFIRMED'
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
        timezone: tutorProfile.availability[0]?.timezone || 'Asia/Ho_Chi_Minh',
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

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    await prisma.$transaction([
      // Delete old slots and overrides
      prisma.availability.deleteMany({ where: { tutorProfileId: tutorProfile.id } }),
      prisma.availabilityOverride.deleteMany({ where: { tutorProfileId: tutorProfile.id } }),
      
      // Create new slots
      prisma.availability.createMany({
        data: slots.map((s: any) => ({
          tutorProfileId: tutorProfile.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          timezone: timezone || 'Asia/Ho_Chi_Minh',
          isRecurring: true
        }))
      }),

      // Create new overrides
      prisma.availabilityOverride.createMany({
        data: (overrides || []).map((o: any) => ({
          tutorProfileId: tutorProfile.id,
          date: new Date(o.date),
          reason: o.reason || 'Blocked'
        }))
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
