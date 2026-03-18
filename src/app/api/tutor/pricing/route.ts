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
      include: { pricing: true }
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    return NextResponse.json({ data: tutorProfile.pricing });
  } catch (error) {
    console.error('Fetch pricing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pricing } = await request.json();

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    // Update pricing using a transaction or multiple upserts
    await prisma.$transaction(
      pricing.map((p: any) => 
        prisma.tutorPricing.upsert({
          where: {
            tutorProfileId_durationMinutes: {
              tutorProfileId: tutorProfile.id,
              durationMinutes: p.durationMinutes
            }
          },
          update: {
            price: p.price,
            isEnabled: p.isEnabled,
            currency: p.currency || 'VND'
          },
          create: {
            tutorProfileId: tutorProfile.id,
            durationMinutes: p.durationMinutes,
            price: p.price,
            isEnabled: p.isEnabled,
            currency: p.currency || 'VND'
          }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update pricing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
