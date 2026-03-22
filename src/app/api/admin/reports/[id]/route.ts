import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createInAppNotification } from '@/lib/in-app-notifications';
import {
  banUser,
  issueRefund,
  issueWarning,
  recordAdminAction,
  requireAdminSession,
  suspendUser,
} from '@/lib/admin';

export const dynamic = 'force-dynamic';

function getDurationDate(duration: string, customUntil?: string) {
  if (duration === 'custom' && customUntil) {
    return new Date(customUntil);
  }

  const durations: Record<string, number> = {
    '1d': 1,
    '3d': 3,
    '7d': 7,
    '30d': 30,
  };

  const days = durations[duration] || 0;
  return days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const { action, note, amount, duration, customUntil, targetUserId } = body;

    const report = await prisma.userReport.findUnique({
      where: { id: params.id },
      include: {
        booking: {
          include: {
            payment: true,
            student: true,
            tutorProfile: {
              include: {
                user: true,
              },
            },
          },
        },
        reporter: true,
        reportedUser: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    switch (action) {
      case 'ISSUE_FULL_REFUND': {
        if (!report.booking?.payment) {
          return NextResponse.json({ error: 'Report has no payment to refund' }, { status: 400 });
        }

        await issueRefund({
          adminId: session.user.id,
          paymentId: report.booking.payment.id,
          amount: report.booking.payment.amount,
          type: 'FULL',
          reason: note || 'Refund issued by admin',
          notifyEmails: [report.reporter.email, report.reportedUser.email],
        });

        await prisma.userReport.update({
          where: { id: report.id },
          data: {
            status: 'REFUNDED',
            adminNote: note ?? null,
            refundAmount: report.booking.payment.amount,
            resolvedByAdminId: session.user.id,
            resolvedAt: new Date(),
          },
        });
        break;
      }
      case 'ISSUE_PARTIAL_REFUND': {
        if (!report.booking?.payment || typeof amount !== 'number') {
          return NextResponse.json({ error: 'Refund amount is required' }, { status: 400 });
        }

        await issueRefund({
          adminId: session.user.id,
          paymentId: report.booking.payment.id,
          amount,
          type: 'PARTIAL',
          reason: note || 'Partial refund issued by admin',
          notifyEmails: [report.reporter.email, report.reportedUser.email],
        });

        await prisma.userReport.update({
          where: { id: report.id },
          data: {
            status: 'PARTIAL_REFUND',
            adminNote: note ?? null,
            refundAmount: amount,
            resolvedByAdminId: session.user.id,
            resolvedAt: new Date(),
          },
        });
        break;
      }
      case 'WARN_USER': {
        const userId = targetUserId || report.reportedUserId;
        await issueWarning({
          adminId: session.user.id,
          userId,
          reason: note || 'Warning issued after report investigation.',
        });
        await prisma.userReport.update({
          where: { id: report.id },
          data: {
            status: 'ACTION_TAKEN',
            adminNote: note ?? null,
            resolvedByAdminId: session.user.id,
            resolvedAt: new Date(),
          },
        });
        break;
      }
      case 'SUSPEND_ACCOUNT': {
        const until = getDurationDate(duration, customUntil);
        if (!until) {
          return NextResponse.json({ error: 'Suspension duration is required' }, { status: 400 });
        }

        await suspendUser({
          adminId: session.user.id,
          userId: targetUserId || report.reportedUserId,
          reason: note || 'Suspended after report investigation.',
          suspendedUntil: until,
        });
        await prisma.userReport.update({
          where: { id: report.id },
          data: {
            status: 'ACTION_TAKEN',
            adminNote: note ?? null,
            resolvedByAdminId: session.user.id,
            resolvedAt: new Date(),
          },
        });
        break;
      }
      case 'PERMANENT_BAN_ACCOUNT': {
        const userId = targetUserId || report.reportedUserId;
        if (!note) {
          return NextResponse.json({ error: 'Ban reason is required' }, { status: 400 });
        }

        await banUser({
          adminId: session.user.id,
          userId,
          reason: note,
        });
        await prisma.userReport.update({
          where: { id: report.id },
          data: {
            status: 'ACTION_TAKEN',
            adminNote: note,
            resolvedByAdminId: session.user.id,
            resolvedAt: new Date(),
          },
        });
        break;
      }
      case 'DISMISS_REPORT': {
        if (!note) {
          return NextResponse.json({ error: 'Dismiss reason is required' }, { status: 400 });
        }
        await prisma.userReport.update({
          where: { id: report.id },
          data: {
            status: 'DISMISSED',
            adminNote: note,
            resolvedByAdminId: session.user.id,
            resolvedAt: new Date(),
          },
        });
        await recordAdminAction({
          adminId: session.user.id,
          targetUserId: report.reportedUserId,
          actionType: 'DISMISS_REPORT',
          reason: note,
          metadata: { reportId: report.id },
        });
        break;
      }
      case 'RESOLVE_REPORT': {
        await prisma.userReport.update({
          where: { id: report.id },
          data: {
            status: 'RESOLVED',
            adminNote: note ?? null,
            resolvedByAdminId: session.user.id,
            resolvedAt: new Date(),
          },
        });
        await recordAdminAction({
          adminId: session.user.id,
          targetUserId: report.reportedUserId,
          actionType: 'RESOLVE_REPORT',
          reason: note,
          metadata: { reportId: report.id },
        });
        break;
      }
      default:
        return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    await Promise.all([
      createInAppNotification({
        userId: report.reporterId,
        preferenceType: 'SESSION_UPDATES',
        type: 'REPORT_UPDATED',
        title: 'Your report was updated',
        body: `Admin updated report ${report.id.slice(-8)} with action ${String(action).replaceAll('_', ' ').toLowerCase()}.`,
        link: '/dashboard/student?tab=bookings',
      }),
      createInAppNotification({
        userId: report.reportedUserId,
        preferenceType: 'SESSION_UPDATES',
        type: 'REPORT_UPDATED',
        title: 'A report involving your account was updated',
        body: `Admin reviewed report ${report.id.slice(-8)} and recorded action ${String(action).replaceAll('_', ' ').toLowerCase()}.`,
        link: '/settings?tab=account',
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Report action error:', error);
    return NextResponse.json({ error: 'Failed to process report' }, { status: 500 });
  }
}
