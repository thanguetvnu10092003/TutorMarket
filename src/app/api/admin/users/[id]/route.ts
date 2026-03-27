import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  banUser,
  issueWarning,
  recordAdminAction,
  requireAdminSession,
  suspendUser,
  toggleTutorSearchVisibility,
} from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminSession();

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        tutorProfile: {
          include: {
            certifications: true,
            credentials: true,
            education: true,
            tutorLanguages: true,
            pricing: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Admin user detail fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const { action, reason, suspendedUntil, hiddenFromSearch, tutorProfileId } = body;

    switch (action) {
      case 'SEND_WARNING': {
        if (!reason) {
          return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
        }
        const user = await issueWarning({
          adminId: session.user.id,
          userId: params.id,
          reason,
        });
        return NextResponse.json({ data: user });
      }
      case 'SUSPEND': {
        const until = suspendedUntil ? new Date(suspendedUntil) : null;
        const user = await suspendUser({
          adminId: session.user.id,
          userId: params.id,
          reason: reason || 'Suspended by admin',
          suspendedUntil: until,
        });
        return NextResponse.json({ data: user });
      }
      case 'PERMANENT_BAN': {
        if (!reason) {
          return NextResponse.json({ error: 'Ban reason is required' }, { status: 400 });
        }
        const user = await banUser({
          adminId: session.user.id,
          userId: params.id,
          reason,
        });
        return NextResponse.json({ data: user });
      }
      case 'TOGGLE_HIDE_PROFILE': {
        if (!tutorProfileId || typeof hiddenFromSearch !== 'boolean') {
          return NextResponse.json({ error: 'Tutor profile and hidden state are required' }, { status: 400 });
        }
        const tutor = await toggleTutorSearchVisibility({
          adminId: session.user.id,
          tutorProfileId,
          hidden: hiddenFromSearch,
          reason,
        });
        return NextResponse.json({ data: tutor });
      }
      case 'REVOKE_SUSPENSION': {
        await prisma.user.update({
          where: { id: params.id },
          data: { suspendedUntil: null, suspensionReason: null },
        });
        const updatedUser = await prisma.user.findUnique({ where: { id: params.id } });
        return NextResponse.json({ data: updatedUser });
      }
      case 'REVOKE_BAN': {
        if (!reason) {
          return NextResponse.json({ error: 'Reason is required for revoking a ban' }, { status: 400 });
        }
        await prisma.user.update({
          where: { id: params.id },
          data: { isBanned: false, banReason: null },
        });
        const updatedUser = await prisma.user.findUnique({ where: { id: params.id } });
        return NextResponse.json({ data: updatedUser });
      }
      default:
        return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Admin user action error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();

    if (params.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own admin account' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        tutorProfile: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            messagesSent: true,
            bookingsAsStudent: true,
            reviewsGiven: true,
            reportsFiled: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await recordAdminAction({
      adminId: session.user.id,
      targetUserId: null, // User will be deleted, so we can't reference their ID
      actionType: 'HARD_DELETE_USER',
      reason: 'Account permanently deleted by admin',
      metadata: {
        deletedUserId: user.id,
        deletedUserEmail: user.email,
        deletedUserName: user.name,
        messageCount: user._count.messagesSent,
        sessionCount: user._count.bookingsAsStudent,
        reviewCount: user._count.reviewsGiven,
        reportCount: user._count.reportsFiled,
      },
    });

    await prisma.user.delete({
      where: { id: user.id }
    });

    return NextResponse.json({
      message: 'User deleted successfully',
      data: {
        messageCount: user._count.messagesSent,
        sessionCount: user._count.bookingsAsStudent,
        reviewCount: user._count.reviewsGiven,
        reportCount: user._count.reportsFiled,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Admin user deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
