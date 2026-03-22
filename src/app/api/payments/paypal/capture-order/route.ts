import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import checkoutNodeJssdk from '@paypal/checkout-server-sdk';
import { paypalClient } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderID, paymentId } = await req.json();

    if (!orderID || !paymentId) {
      return NextResponse.json({ error: 'Order ID and Payment ID are required' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: true,
        package: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Verify it's their payment
    if (
      (payment.booking && payment.booking.studentId !== session.user.id) ||
      (payment.package && payment.package.studentId !== session.user.id)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payment already processed' }, { status: 400 });
    }

    // Verify order capture directly with PayPal so the client can't fake it
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID);
    request.requestBody({} as any);

    const capture = await paypalClient().execute(request);

    // If the payment didn't successfully capture, return an error
    if (capture.result.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Payment was not completed by PayPal' }, { status: 400 });
    }

    // 1. Mark payment as CAPTURED in our database
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CAPTURED',
        paidAt: new Date(),
        // We could store the capture.result.id as the provider charge ID if we had a field,
        // but currently we just rely on status.
      },
    });

    // 2. Fulfill the purchase based on type
    if (payment.bookingId) {
      // Single Lesson: Update booking status to CONFIRMED
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });
    } else if (payment.packageId) {
      // Package: It just becomes active since Payment is CAPTURED
    }

    return NextResponse.json({ success: true, data: updatedPayment });

  } catch (error: any) {
    console.error('PayPal capture-order error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
