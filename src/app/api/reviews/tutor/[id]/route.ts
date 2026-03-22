import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        tutorProfileId: params.id,
        isPublic: true,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        tags: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
        : 0;

    return NextResponse.json({
      data: reviews,
      meta: {
        total: reviews.length,
        averageRating: Number(averageRating.toFixed(1)),
      },
    });
  } catch (error) {
    console.error('Tutor public reviews fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
