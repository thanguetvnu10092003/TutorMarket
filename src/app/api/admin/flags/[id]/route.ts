import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { banUser, issueWarning, recordAdminAction, requireAdminSession } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const { action, note } = body;

    const flag = await prisma.contentFlag.findUnique({
      where: { id: params.id },
      include: {
        targetUser: true,
      },
    });

    if (!flag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    switch (action) {
      case 'DISMISS':
        await prisma.contentFlag.update({
          where: { id: flag.id },
          data: {
            status: 'DISMISSED',
            resolvedByAdminId: session.user.id,
            resolutionNote: note ?? null,
          },
        });
        await recordAdminAction({
          adminId: session.user.id,
          targetUserId: flag.targetUserId,
          actionType: 'DISMISS_CONTENT_FLAG',
          reason: note,
          metadata: { flagId: flag.id },
        });
        break;
      case 'REMOVE_CONTENT':
        await prisma.contentFlag.update({
          where: { id: flag.id },
          data: {
            status: 'REMOVED',
            resolvedByAdminId: session.user.id,
            resolutionNote: note ?? 'Content removed by admin.',
          },
        });
        await recordAdminAction({
          adminId: session.user.id,
          targetUserId: flag.targetUserId,
          actionType: 'REMOVE_FLAGGED_CONTENT',
          reason: note,
          metadata: { flagId: flag.id, contentType: flag.contentType, contentId: flag.contentId },
        });
        break;
      case 'WARN_USER':
        if (!flag.targetUserId || !flag.targetUser) {
          return NextResponse.json({ error: 'No target user attached to flag' }, { status: 400 });
        }
        await issueWarning({
          adminId: session.user.id,
          userId: flag.targetUserId,
          reason: note || 'Warning issued after flagged content review.',
        });
        await prisma.contentFlag.update({
          where: { id: flag.id },
          data: {
            status: 'WARNED',
            resolvedByAdminId: session.user.id,
            resolutionNote: note ?? null,
          },
        });
        break;
      case 'BAN_USER':
        if (!flag.targetUserId || !flag.targetUser) {
          return NextResponse.json({ error: 'No target user attached to flag' }, { status: 400 });
        }
        await banUser({
          adminId: session.user.id,
          userId: flag.targetUserId,
          reason: note || 'Permanent ban after flagged content review.',
        });
        await prisma.contentFlag.update({
          where: { id: flag.id },
          data: {
            status: 'BANNED',
            resolvedByAdminId: session.user.id,
            resolutionNote: note ?? null,
          },
        });
        break;
      default:
        return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Content flag action error:', error);
    return NextResponse.json({ error: 'Failed to process content flag' }, { status: 500 });
  }
}
