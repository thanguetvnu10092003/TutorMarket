import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPrimaryPriceOption } from '@/lib/currency';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        pricing: {
          orderBy: { durationMinutes: 'asc' },
        },
      }
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
    const normalizedPricing = Array.isArray(pricing) ? pricing : [];

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    for (const priceOption of normalizedPricing) {
      if (!priceOption.durationMinutes || Number(priceOption.durationMinutes) <= 0) {
        return NextResponse.json({ error: 'Each pricing option needs a valid duration' }, { status: 400 });
      }

      if (priceOption.isEnabled && (priceOption.price === undefined || Number(priceOption.price) < 0)) {
        return NextResponse.json({ error: 'Enabled pricing options need a valid price' }, { status: 400 });
      }
    }

    const primaryOption = getPrimaryPriceOption(
      normalizedPricing.map((item: any) => ({
        durationMinutes: Number(item.durationMinutes),
        price: Number(item.price || 0),
        isEnabled: Boolean(item.isEnabled),
        currency: item.currency || 'USD',
      }))
    );

    // Update pricing using a transaction or multiple upserts
    await prisma.$transaction([
      prisma.tutorPricing.deleteMany({
        where: {
          tutorProfileId: tutorProfile.id,
          durationMinutes: {
            notIn: normalizedPricing.map((item: any) => Number(item.durationMinutes)),
          },
        },
      }),
      prisma.tutorProfile.update({
        where: { id: tutorProfile.id },
        data: {
          hourlyRate: primaryOption?.price || tutorProfile.hourlyRate,
        },
      }),
      ...normalizedPricing.map((p: any) =>
        prisma.tutorPricing.upsert({
          where: {
            tutorProfileId_durationMinutes: {
              tutorProfileId: tutorProfile.id,
              durationMinutes: Number(p.durationMinutes)
            }
          },
          update: {
            price: Number(p.price || 0),
            isEnabled: Boolean(p.isEnabled),
            currency: (p.currency || 'USD').toUpperCase()
          },
          create: {
            tutorProfileId: tutorProfile.id,
            durationMinutes: Number(p.durationMinutes),
            price: Number(p.price || 0),
            isEnabled: Boolean(p.isEnabled),
            currency: (p.currency || 'USD').toUpperCase()
          }
        })
      ),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update pricing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
