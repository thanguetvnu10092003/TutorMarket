import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('UNAUTHORIZED');
  }

  return session;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || '8');
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 20) : 8;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
      : [];

    await prisma.notification.updateMany({
      where: ids.length
        ? {
            userId: session.user.id,
            id: { in: ids },
          }
        : {
            userId: session.user.id,
            isRead: false,
          },
      data: {
        isRead: true,
      },
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Notifications update error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
