import { NextRequest, NextResponse } from 'next/server';
import { payos } from '@/lib/payos';
import prisma from '@/lib/prisma';
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
      include: { booking: true, package: true },
    });

    if (payment && payment.status === 'PENDING') {
      await prisma.$transaction(async tx => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'CAPTURED', paidAt: new Date() },
        });
        if (payment.booking) {
          await tx.booking.update({
            where: { id: payment.booking.id },
            data: { status: 'CONFIRMED', confirmedAt: new Date() },
          });
        }
      });
    }
  }

  return NextResponse.json({ success: true });
}
