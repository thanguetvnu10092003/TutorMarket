import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { avatarUrl } = await request.json();

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: avatarUrl || null },
    });

    return NextResponse.json({ success: true, avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error('Update avatar error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
