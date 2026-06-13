import { NextRequest, NextResponse } from 'next/server';
import { payos } from '@/lib/payos';
import prisma from '@/lib/prisma';
import { getCommissionSplit } from '@/lib/platform-settings';
import {
  createStudentPaymentNotification,
  createTutorPaymentNotification,
} from '@/lib/payment-notifications';
import type { Webhook } from '@payos/node';

export async function POST(request: NextRequest) {
  if (!payos) return NextResponse.json({ error: 'PayOS not configured' }, { status: 503 });

  const body = await request.json();

  let webhookData: Awaited<ReturnType<typeof payos.webhooks.verify>> | null = null;
  try {
    webhookData = await payos.webhooks.verify(body as Webhook);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const { orderCode, code } = webhookData;

  if (code === '00' && orderCode) {
    const payment = await prisma.payment.findFirst({
      where: { payosOrderCode: orderCode.toString() },
      include: {
        booking: {
          include: {
            student: { select: { name: true } },
            tutorProfile: {
              select: {
                userId: true,
                user: { select: { name: true } },
              },
            },
          },
        },
        package: {
          include: {
            student: { select: { name: true } },
            tutorProfile: {
              select: {
                userId: true,
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (payment && payment.status === 'PENDING') {
      const split = await getCommissionSplit(payment.amount);
      const paidAt = new Date();

      await prisma.$transaction(async tx => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            paidAt,
            platformFee: split.platformFee,
            tutorPayout: split.tutorPayout,
          },
        });
        if (payment.booking) {
          await tx.booking.update({
            where: { id: payment.booking.id },
            data: { status: 'CONFIRMED', confirmedAt: paidAt },
          });
        }
      });

      await createTutorPaymentNotification({
        paymentAmount: payment.amount,
        tutorPayout: split.tutorPayout,
        paidAt,
        booking: payment.booking
          ? {
              id: payment.booking.id,
              studentId: payment.booking.studentId,
              subject: payment.booking.subject,
              scheduledAt: payment.booking.scheduledAt,
              student: payment.booking.student,
              tutorProfile: payment.booking.tutorProfile,
            }
          : null,
        package: payment.package
          ? {
              id: payment.package.id,
              studentId: payment.package.studentId,
              totalSessions: payment.package.totalSessions,
              student: payment.package.student,
              tutorProfile: payment.package.tutorProfile,
            }
          : null,
      });

      await createStudentPaymentNotification({
        paymentAmount: payment.amount,
        tutorPayout: split.tutorPayout,
        paidAt,
        booking: payment.booking
          ? {
              id: payment.booking.id,
              studentId: payment.booking.studentId,
              subject: payment.booking.subject,
              scheduledAt: payment.booking.scheduledAt,
              student: payment.booking.student,
              tutorProfile: payment.booking.tutorProfile,
            }
          : null,
        package: payment.package
          ? {
              id: payment.package.id,
              studentId: payment.package.studentId,
              totalSessions: payment.package.totalSessions,
              student: payment.package.student,
              tutorProfile: payment.package.tutorProfile,
            }
          : null,
      });
    }
  }

  return NextResponse.json({ success: true });
}
