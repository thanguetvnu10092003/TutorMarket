import { NextRequest, NextResponse } from 'next/server';
import { getPublicTutorCards } from '@/lib/admin-dashboard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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
    };

    const results = await getPublicTutorCards(filters);
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');
    const start = (page - 1) * limit;
    const paginated = results.slice(start, start + limit);

    return NextResponse.json({
      data: paginated,
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
