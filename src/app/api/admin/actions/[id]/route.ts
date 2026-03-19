import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession, recordAdminAction } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const { dismissed } = body;

    const action = await (prisma.adminAction as any).update({
      where: { id: params.id },
      data: { isDismissed: !!dismissed },
    });

    await prisma.adminAction.create({
      data: {
        adminId: session.user.id,
        actionType: 'DISMISS_AUDIT_LOG',
        metadata: { dismissedActionId: params.id },
        isDismissed: true,
      },
    });

    return NextResponse.json({ data: action });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Admin action update error:', error);
    return NextResponse.json({ error: 'Failed to update action' }, { status: 500 });
  }
}
