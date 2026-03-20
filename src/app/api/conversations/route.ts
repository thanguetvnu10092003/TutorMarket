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

    const isStudent = session.user.role === 'STUDENT';

    const conversations = await prisma.conversation.findMany({
      where: isStudent
        ? { studentId: session.user.id }
        : { tutorProfile: { userId: session.user.id } },
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

    return NextResponse.json({
      data: conversations.map((conversation) => ({
        ...conversation,
        participant: isStudent
          ? {
              id: conversation.tutorProfile.userId,
              name: conversation.tutorProfile.user.name,
              avatarUrl: conversation.tutorProfile.user.avatarUrl,
            }
          : {
              id: conversation.studentId,
              name: conversation.student.name,
              avatarUrl: conversation.student.avatarUrl,
            },
      })),
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
