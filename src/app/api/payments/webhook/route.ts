import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { getCommissionSplit } from '@/lib/platform-settings';
import {
  createStudentPaymentNotification,
  createTutorPaymentNotification,
} from '@/lib/payment-notifications';
import Stripe from 'stripe';

export async function POST(request: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook is not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid Stripe webhook signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.paymentId || session.client_reference_id;

        if (paymentId) {
          const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
              booking: {
                include: {
                  student: {
                    select: {
                      name: true,
                    },
                  },
                  tutorProfile: {
                    select: {
                      userId: true,
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
                  student: {
                    select: {
                      name: true,
                    },
                  },
                  tutorProfile: {
                    select: {
                      userId: true,
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

          if (!payment || payment.status === 'CAPTURED') {
            break;
          }

          const split = await getCommissionSplit(payment.amount);
          const paidAt = new Date();

          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: 'CAPTURED',
              paidAt,
              platformFee: split.platformFee,
              tutorPayout: split.tutorPayout,
              stripePaymentIntentId:
                typeof session.payment_intent === 'string'
                  ? session.payment_intent
                  : undefined,
            },
          });

          if (payment.bookingId) {
            await prisma.bookingEvent.create({
              data: {
                bookingId: payment.bookingId,
                eventType: 'PAYMENT_CAPTURED',
                title: 'Payment captured',
                details: 'Student payment was captured successfully. Waiting for tutor confirmation if required.',
              },
            });
          }

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

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentId = paymentIntent.metadata?.paymentId;

        if (paymentId) {
          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              stripePaymentIntentId: paymentIntent.id,
            },
          });
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    return NextResponse.json({ error: 'Failed to process Stripe webhook' }, { status: 500 });
  }
}
