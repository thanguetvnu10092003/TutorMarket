import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
          take: 1,
          select: {
            id: true,
            body: true,
            recalledAt: true,
            senderId: true,
            sentAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    const conversationIds = conversations.map((conversation) => conversation.id);
    const unreadCounts = conversationIds.length > 0
      ? await prisma.message.groupBy({
          by: ['conversationId'],
          where: {
            conversationId: { in: conversationIds },
            senderId: { not: session.user.id },
            readAt: null,
          },
          _count: {
            _all: true,
          },
        })
      : [];

    const unreadCountByConversation = new Map(
      unreadCounts.map((item) => [item.conversationId, item._count._all])
    );

    const data = conversations.map((conversation) => ({
      ...conversation,
      unreadCount: unreadCountByConversation.get(conversation.id) || 0,
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
    }));

    return NextResponse.json({
      data,
      unreadCount: data.reduce((total, conversation) => total + conversation.unreadCount, 0),
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
