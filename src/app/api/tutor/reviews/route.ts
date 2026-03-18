import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rating = searchParams.get('rating'); // "All", "5", "4", etc.
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;
    const skip = (page - 1) * limit;

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: (session.user as any).id },
    });

    if (!tutorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const where: any = { tutorProfileId: tutorProfile.id };
    if (rating && rating !== 'All') {
      where.rating = parseInt(rating);
    }

    const [reviews, totalCount, allReviews] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          student: { select: { name: true, avatarUrl: true } },
          booking: { select: { subject: true, scheduledAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.findMany({
        where: { tutorProfileId: tutorProfile.id },
        select: { rating: true },
      }),
    ]);

    // Star distribution
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allReviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        (distribution as any)[r.rating]++;
      }
    });

    return NextResponse.json({
      data: {
        reviews,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        distribution,
      }
    });
  } catch (error) {
    console.error('Tutor reviews fetch error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reviewId, reply } = await req.json();
    if (!reviewId || !reply) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: (session.user as any).id },
    });

    if (!tutorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Verify review belongs to this tutor
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.tutorProfileId !== tutorProfile.id) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        tutorReply: reply,
        repliedAt: new Date(),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Tutor reply error:', error);
    return NextResponse.json({ error: 'Failed to reply' }, { status: 500 });
  }
}
