import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const RECALL_WINDOW_MINUTES = 10;
const RECALL_PLACEHOLDER = 'This message was unsent.';

const messageSchema = z.object({
  tutorProfileId: z.string(),
  content: z.string().trim().min(1, 'Message cannot be empty'),
});

const recallSchema = z.object({
  messageId: z.string().min(1),
});

type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  sentAt: Date;
  readAt: Date | null;
  recalledAt: Date | null;
};

type RecallCandidateRow = {
  id: string;
  senderId: string;
  sentAt: Date;
  recalledAt: Date | null;
  studentId: string;
  tutorUserId: string;
};

async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('UNAUTHORIZED');
  }

  return session;
}

async function getAccessibleConversation(sessionUserId: string, options: { conversationId?: string | null; tutorProfileId?: string | null }) {
  const accessWhere = {
    OR: [
      { studentId: sessionUserId },
      { tutorProfile: { userId: sessionUserId } },
    ],
  };

  if (options.conversationId) {
    return prisma.conversation.findFirst({
      where: {
        id: options.conversationId,
        ...accessWhere,
      },
      include: {
        tutorProfile: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });
  }

  if (options.tutorProfileId) {
    return prisma.conversation.findFirst({
      where: {
        tutorProfileId: options.tutorProfileId,
        ...accessWhere,
      },
      include: {
        tutorProfile: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });
  }

  return null;
}

function isWithinRecallWindow(sentAt: Date) {
  return Date.now() - sentAt.getTime() <= RECALL_WINDOW_MINUTES * 60 * 1000;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { tutorProfileId, content } = messageSchema.parse(body);

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
      select: { id: true, userId: true },
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    if (session.user.role === 'TUTOR' && tutorProfile.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const studentId =
      session.user.role === 'STUDENT'
        ? session.user.id
        : null;

    if (!studentId) {
      return NextResponse.json({ error: 'Only students can start a new conversation here right now' }, { status: 400 });
    }

    const conversation = await prisma.conversation.upsert({
      where: {
        studentId_tutorProfileId: {
          studentId,
          tutorProfileId,
        },
      },
      update: {
        lastMessageAt: new Date(),
      },
      create: {
        studentId,
        tutorProfileId,
        lastMessageAt: new Date(),
      },
    });

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: session.user.id,
        body: content,
      },
    });

    return NextResponse.json({
      success: true,
      data: message,
      meta: {
        recallWindowMinutes: RECALL_WINDOW_MINUTES,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const tutorProfileId = searchParams.get('tutorProfileId');

    const conversation = await getAccessibleConversation(session.user.id, { conversationId, tutorProfileId });

    if (!conversation) {
      return NextResponse.json({
        data: [],
        meta: {
          recallWindowMinutes: RECALL_WINDOW_MINUTES,
        },
      });
    }

    await prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        senderId: { not: session.user.id },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    const thread = await prisma.$queryRaw<MessageRow[]>`
      SELECT
        "id",
        "conversationId",
        "senderId",
        "body",
        "sentAt",
        "readAt",
        "recalledAt"
      FROM "Message"
      WHERE "conversationId" = ${conversation.id}
      ORDER BY "sentAt" ASC
    `;

    return NextResponse.json({
      data: thread,
      meta: {
        recallWindowMinutes: RECALL_WINDOW_MINUTES,
        recallPlaceholder: RECALL_PLACEHOLDER,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { messageId } = recallSchema.parse(body);

    const [message] = await prisma.$queryRaw<RecallCandidateRow[]>`
      SELECT
        m."id",
        m."senderId",
        m."sentAt",
        m."recalledAt",
        c."studentId",
        tp."userId" AS "tutorUserId"
      FROM "Message" m
      INNER JOIN "Conversation" c ON c."id" = m."conversationId"
      INNER JOIN "TutorProfile" tp ON tp."id" = c."tutorProfileId"
      WHERE m."id" = ${messageId}
      LIMIT 1
    `;

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const hasAccess =
      message.studentId === session.user.id ||
      message.tutorUserId === session.user.id;

    if (!hasAccess || message.senderId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (message.recalledAt) {
      return NextResponse.json({ error: 'Message has already been unsent' }, { status: 400 });
    }

    if (!isWithinRecallWindow(message.sentAt)) {
      return NextResponse.json(
        { error: `Messages can only be unsent within ${RECALL_WINDOW_MINUTES} minutes` },
        { status: 400 }
      );
    }

    const recalledAt = new Date();

    await prisma.$executeRaw`
      UPDATE "Message"
      SET
        "body" = ${RECALL_PLACEHOLDER},
        "recalledAt" = ${recalledAt}
      WHERE "id" = ${messageId}
    `;

    const [updatedMessage] = await prisma.$queryRaw<MessageRow[]>`
      SELECT
        "id",
        "conversationId",
        "senderId",
        "body",
        "sentAt",
        "readAt",
        "recalledAt"
      FROM "Message"
      WHERE "id" = ${messageId}
      LIMIT 1
    `;

    return NextResponse.json({
      success: true,
      data: updatedMessage,
      meta: {
        recallWindowMinutes: RECALL_WINDOW_MINUTES,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Recall message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
