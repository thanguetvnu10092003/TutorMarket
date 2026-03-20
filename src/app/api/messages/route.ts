import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const messageSchema = z.object({
  tutorProfileId: z.string(),
  content: z.string().min(1, 'Message cannot be empty'),
});

// POST /api/messages — Send message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tutorProfileId, content } = messageSchema.parse(body);
    const studentId = session.user.id;

    // 1. Find or Create Conversation
    const conversation = await prisma.conversation.upsert({
      where: {
        studentId_tutorProfileId: {
          studentId,
          tutorProfileId,
        }
      },
      update: {
        lastMessageAt: new Date(),
      },
      create: {
        studentId,
        tutorProfileId,
        lastMessageAt: new Date(),
      }
    });

    // 2. Create the message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: studentId,
        body: content,
      }
    });

    return NextResponse.json({ success: true, data: message });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/messages — Load thread by conversationId or tutorProfileId
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const tutorProfileId = searchParams.get('tutorProfileId');

    let thread: any[] = [];

    if (conversationId) {
      thread = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { sentAt: 'asc' }
      });
    } else if (tutorProfileId) {
      const conv = await prisma.conversation.findUnique({
        where: {
          studentId_tutorProfileId: {
            studentId: session.user.id,
            tutorProfileId,
          }
        },
        include: {
          messages: {
            orderBy: { sentAt: 'asc' }
          }
        }
      });
      thread = conv?.messages || [];
    }

    return NextResponse.json({ data: thread });

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
