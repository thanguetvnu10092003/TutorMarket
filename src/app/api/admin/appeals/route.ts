import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession();

    const appeals = await prisma.appeal.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        penalty: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: appeals });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get appeals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
