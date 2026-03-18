import { NextRequest, NextResponse } from 'next/server';
import { reviews } from '@/lib/mock-data';
import { generateId } from '@/lib/utils';

// POST /api/reviews — Submit review after completed session
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { bookingId, studentId, tutorProfileId, rating, comment } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
  }

  const existingReview = reviews.find(r => r.bookingId === bookingId);
  if (existingReview) {
    return NextResponse.json({ error: 'Review already exists for this booking' }, { status: 409 });
  }

  const newReview = {
    id: generateId(),
    bookingId,
    studentId,
    tutorProfileId,
    rating,
    comment: comment || null,
    isPublic: true,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ data: newReview, message: 'Review submitted successfully' }, { status: 201 });
}
