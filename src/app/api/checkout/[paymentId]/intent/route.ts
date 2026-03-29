import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

function toStripeAmount(amount: number) {
  return Math.round(amount * 100);
}

export async function POST(req: NextRequest, { params }: { params: { paymentId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const { paymentId } = params;

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        OR: [
          { booking: { studentId: session.user.id } },
          { package: { studentId: session.user.id } },
        ],
      },
      include: {
        booking: {
          include: { tutorProfile: { include: { user: { select: { name: true } } } } },
        },
        package: {
          include: { tutorProfile: { include: { user: { select: { name: true } } } } },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'CAPTURED') {
      return NextResponse.json({ error: 'Payment already captured' }, { status: 400 });
    }

    const description = payment.booking
      ? `${payment.booking.tutorProfile.user.name} | ${payment.booking.subject}`
      : payment.package
        ? `${payment.package.totalSessions} lesson package with ${payment.package.tutorProfile.user.name}`
        : 'PrepPass payment';

    // If a PaymentIntent already exists and matches the amount, we can optionally reuse it.
    // However, creating a new one or updating the existing one is safest if the payment hasn't completed.
    
    let paymentIntent;
    
    if (payment.stripePaymentIntentId) {
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
        
        // Update amount if it somehow changed (though our UI doesn't allow changing an existing payment intent's DB amount usually)
        if (paymentIntent.status !== 'requires_payment_method' && paymentIntent.status !== 'requires_confirmation') {
           // If it was captured, it shouldn't hit here due to the DB status check above, 
           // but fallback just in case
        } else if (paymentIntent.amount !== toStripeAmount(payment.amount)) {
          paymentIntent = await stripe.paymentIntents.update(payment.stripePaymentIntentId, {
            amount: toStripeAmount(payment.amount),
          });
        }
      } catch (e) {
        console.warn('Could not retrieve existing intent, creating new:', e);
      }
    }

    if (!paymentIntent || paymentIntent.status === 'succeeded' || paymentIntent.status === 'canceled') {
      paymentIntent = await stripe.paymentIntents.create({
        amount: toStripeAmount(payment.amount),
        currency: 'usd',
        metadata: {
          paymentId: payment.id,
        },
        description,
        automatic_payment_methods: {
          enabled: true,
        },
        receipt_email: session.user.email || undefined,
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
        },
      });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error('Checkout Intent POST error:', error);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}
