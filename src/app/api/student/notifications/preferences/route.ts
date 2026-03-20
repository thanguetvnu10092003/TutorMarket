import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/student/notifications/preferences
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ data: preferences });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/student/notifications/preferences
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { notificationType, emailEnabled, inAppEnabled } = body;

    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_notificationType: {
          userId: session.user.id,
          notificationType,
        },
      },
      update: {
        emailEnabled,
        inAppEnabled,
      },
      create: {
        userId: session.user.id,
        notificationType,
        emailEnabled,
        inAppEnabled,
      },
    });

    return NextResponse.json({ data: preference });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
