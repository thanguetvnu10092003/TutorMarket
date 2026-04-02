import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      select: { id: true, tutorProfileId: true },
    });

    if (!booking || booking.tutorProfileId !== tutorProfile.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    await prisma.booking.update({
      where: { id: params.id },
      data: { hasConflict: false, conflictReason: null, conflictAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resolve conflict error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
