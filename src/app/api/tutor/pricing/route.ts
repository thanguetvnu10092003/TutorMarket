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

    return NextResponse.json({
      data: tutorProfile.pricing,
      discount5: tutorProfile.discount5 ?? null,
      discount10: tutorProfile.discount10 ?? null,
      discount20: tutorProfile.discount20 ?? null,
      offerFreeTrial: tutorProfile.offerFreeTrial,
    });
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

    const { pricing, discount5, discount10, discount20, offerFreeTrial } = await request.json();
    const normalizedPricing = Array.isArray(pricing) ? pricing : [];

    // Validate discount values (0-100 integer or null)
    for (const [key, val] of Object.entries({ discount5, discount10, discount20 })) {
      if (val !== null && val !== undefined) {
        const n = Number(val);
        if (!Number.isInteger(n) || n < 0 || n > 100) {
          return NextResponse.json({ error: `${key} must be an integer between 0 and 100` }, { status: 400 });
        }
      }
    }

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
          discount5: discount5 != null ? Number(discount5) : null,
          discount10: discount10 != null ? Number(discount10) : null,
          discount20: discount20 != null ? Number(discount20) : null,
          offerFreeTrial: typeof offerFreeTrial === 'boolean' ? offerFreeTrial : tutorProfile.offerFreeTrial,
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
