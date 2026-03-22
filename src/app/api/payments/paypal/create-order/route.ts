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

    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
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

    if (
      (payment.booking && payment.booking.studentId !== session.user.id) ||
      (payment.package && payment.package.studentId !== session.user.id)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payment is already processed' }, { status: 400 });
    }

    // Call PayPal to set up an authorization
    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: payment.id,
          amount: {
            currency_code: 'USD',
            value: payment.amount.toFixed(2),
          },
          description: payment.packageId 
            ? `${payment.package?.totalSessions} Lesson Package` 
            : `Lesson Booking`,
        },
      ],
    });

    const response = await paypalClient().execute(request);

    return NextResponse.json({ 
      success: true, 
      id: response.result.id, // This is the PayPal order ID
    });

  } catch (error: any) {
    console.error('PayPal create-order error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
