import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { payos, getAppUrl } from '@/lib/payos';
import { getExchangeRatesFromDb } from '@/lib/currency-server';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!payos) return NextResponse.json({ error: 'PayOS not configured' }, { status: 503 });

  const { paymentId } = await request.json();
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      OR: [
        { booking: { studentId: (session.user as any).id } },
        { package: { studentId: (session.user as any).id } },
      ],
    },
  });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  if (payment.status === 'CAPTURED') {
    return NextResponse.json({ error: 'Payment already captured' }, { status: 400 });
  }

  const rates = await getExchangeRatesFromDb();
  const vndRate = rates['VND'] ?? 25400;
  const amountVnd = Math.round(payment.amount * vndRate);

  const orderCode = parseInt(Date.now().toString().slice(-9));
  const appUrl = getAppUrl();

  const payosPayment = await payos.paymentRequests.create({
    orderCode,
    amount: amountVnd,
    description: 'TutorMarket booking',
    returnUrl: `${appUrl}/checkout/success?paymentId=${paymentId}`,
    cancelUrl: `${appUrl}/checkout/cancel?paymentId=${paymentId}`,
  });

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      payosOrderCode: orderCode.toString(),
      currency: 'VND',
      exchangeRate: vndRate,
      paymentMethod: 'PAYOS',
    },
  });

  return NextResponse.json({
    checkoutUrl: payosPayment.checkoutUrl,
    qrCode: payosPayment.qrCode ?? null,
    orderCode,
    amountVnd,
  });
}
