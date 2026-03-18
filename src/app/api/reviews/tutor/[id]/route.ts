import { NextRequest, NextResponse } from 'next/server';
import { getTutorReviews } from '@/lib/mock-data';

// GET /api/reviews/tutor/:id — Public reviews for a tutor
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const reviews = getTutorReviews(params.id);
  return NextResponse.json({
    data: reviews,
    meta: { total: reviews.length, averageRating: reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0 },
  });
}
