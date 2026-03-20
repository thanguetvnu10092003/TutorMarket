import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCheckoutSessionForStudentPayment } from '@/lib/payment-checkout';
import { z } from 'zod';

const checkoutSchema = z.object({
  paymentId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { paymentId } = checkoutSchema.parse(body);

    const { session: checkoutSession, payment } = await createCheckoutSessionForStudentPayment({
      paymentId,
      studentId: session.user.id,
      studentEmail: session.user.email,
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        checkoutUrl: checkoutSession.url,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    if (error instanceof Error) {
      if (error.message === 'STRIPE_NOT_CONFIGURED') {
        return NextResponse.json({ error: 'Stripe is not configured yet' }, { status: 503 });
      }

      if (error.message === 'PAYMENT_NOT_FOUND') {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      if (error.message === 'PAYMENT_NOT_REQUIRED') {
        return NextResponse.json({ error: 'This payment does not require checkout' }, { status: 400 });
      }

      if (error.message === 'PAYMENT_ALREADY_CAPTURED') {
        return NextResponse.json({ error: 'This payment has already been completed' }, { status: 400 });
      }
    }

    console.error('Stripe checkout creation error:', error);
    return NextResponse.json({ error: 'Failed to create Stripe checkout session' }, { status: 500 });
  }
}
