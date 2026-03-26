import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getPublicTutorCards } from '@/lib/admin-dashboard';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getCountryOptions } from '@/lib/intl-data';

export const dynamic = 'force-dynamic';

function resolveCountryCode(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length === 2) {
    return normalized.toUpperCase();
  }

  const match = getCountryOptions().find(
    (country) => country.name.toLowerCase() === normalized.toLowerCase()
  );

  return match?.code || null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);

    const filters = {
      subject: searchParams.get('subject') || undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      language: searchParams.get('language') || undefined,
      isVerified: searchParams.get('isVerified') === 'true',
      country: searchParams.get('country') || undefined,
      search: searchParams.get('search') || undefined,
      availability: searchParams.get('availability') || undefined,
      nativeSpeaker: searchParams.get('nativeSpeaker') === 'true',
    };
    const viewerPreference = session?.user?.role === 'STUDENT'
      ? await prisma.studentPreference.findUnique({
          where: { userId: session.user.id },
          select: {
            timezone: true,
            examDates: true,
          },
        })
      : null;
    const viewerUser = session?.user
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { country: true },
        })
      : null;
    const preferredCurrency = viewerPreference?.examDates && typeof viewerPreference.examDates === 'object'
      ? (viewerPreference.examDates as Record<string, string>).__preferredCurrency || null
      : null;

    const results = await getPublicTutorCards(filters, {
      preferredCurrency,
      countryCode: resolveCountryCode(viewerUser?.country) || null,
      timezone: viewerPreference?.timezone || null,
    });
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');
    const start = (page - 1) * limit;
    const paginated = results.slice(start, start + limit);

    let trialTutorIds = new Set<string>();

    if (session?.user?.role === 'STUDENT' && paginated.length > 0) {
      const trialBookings = await prisma.booking.findMany({
        where: {
          studentId: session.user.id,
          tutorProfileId: { in: paginated.map((tutor) => tutor.id) },
          isFreeSession: true,
          status: { not: 'CANCELLED' },
        },
        select: {
          tutorProfileId: true,
        },
        distinct: ['tutorProfileId'],
      });

      trialTutorIds = new Set(trialBookings.map((booking) => booking.tutorProfileId));
    }

    return NextResponse.json({
      data: paginated.map((tutor) => ({
        ...tutor,
        hasUsedTrialLesson: trialTutorIds.has(tutor.id),
      })),
      meta: {
        total: results.length,
        page,
        limit,
        totalPages: Math.ceil(results.length / limit),
      },
    });
  } catch (error) {
    console.error('Tutor search error:', error);
    return NextResponse.json({ error: 'Failed to search tutors' }, { status: 500 });
  }
}
