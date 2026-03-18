import { NextRequest, NextResponse } from 'next/server';
import { messages } from '@/lib/mock-data';
import { generateId } from '@/lib/utils';

// POST /api/messages — Send message
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { conversationId, senderId, content } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message body cannot be empty' }, { status: 400 });
  }

  const newMessage = {
    id: generateId(),
    conversationId,
    senderId,
    body: content.trim(),
    sentAt: new Date().toISOString(),
    readAt: null,
  };

  return NextResponse.json({ data: newMessage }, { status: 201 });
}

// GET /api/messages — Load thread by conversationId
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
  }

  const thread = messages
    .filter(m => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  return NextResponse.json({ data: thread });
}
