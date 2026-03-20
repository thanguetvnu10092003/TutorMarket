import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || session.user.role;

    const conversations = await prisma.conversation.findMany({
      where: role === 'STUDENT' ? { studentId: session.user.id } : { tutorProfileId: session.user.id },
      include: {
        tutorProfile: {
          include: {
            user: {
              select: { name: true, avatarUrl: true }
            }
          }
        },
        student: {
            select: { name: true, avatarUrl: true }
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    return NextResponse.json({ data: conversations });

  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
