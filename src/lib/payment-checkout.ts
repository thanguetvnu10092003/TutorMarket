import prisma from '@/lib/prisma';
import { getAppUrl, stripe } from '@/lib/stripe';

function toStripeAmount(amount: number) {
  return Math.round(amount * 100);
}

export async function createCheckoutSessionForStudentPayment(input: {
  paymentId: string;
  studentId: string;
  studentEmail?: string | null;
}) {
  if (!stripe) {
    throw new Error('STRIPE_NOT_CONFIGURED');
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id: input.paymentId,
      OR: [
        {
          booking: {
            studentId: input.studentId,
          },
        },
        {
          package: {
            studentId: input.studentId,
          },
        },
      ],
    },
    include: {
      booking: {
        include: {
          tutorProfile: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      package: {
        include: {
          tutorProfile: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new Error('PAYMENT_NOT_FOUND');
  }

  if (payment.amount <= 0) {
    throw new Error('PAYMENT_NOT_REQUIRED');
  }

  if (payment.status === 'CAPTURED') {
    throw new Error('PAYMENT_ALREADY_CAPTURED');
  }

  const description =
    payment.booking
      ? `${payment.booking.tutorProfile.user.name} | ${payment.booking.subject}`
      : payment.package
        ? `${payment.package.totalSessions} lesson package with ${payment.package.tutorProfile.user.name}`
        : 'TutorMarket payment';

  const productName = payment.booking
    ? 'TutorMarket Lesson Payment'
    : 'TutorMarket Lesson Package';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: input.studentEmail || undefined,
    client_reference_id: payment.id,
    metadata: {
      paymentId: payment.id,
    },
    payment_intent_data: {
      metadata: {
        paymentId: payment.id,
      },
    },
    success_url: `${getAppUrl()}/dashboard/student?tab=payments&stripe=success`,
    cancel_url: `${getAppUrl()}/dashboard/student?tab=payments&stripe=cancelled`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: toStripeAmount(payment.amount),
          product_data: {
            name: productName,
            description,
          },
        },
      },
    ],
  });

  if (typeof session.payment_intent === 'string') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripePaymentIntentId: session.payment_intent,
      },
    });
  }

  return {
    session,
    payment,
  };
}
