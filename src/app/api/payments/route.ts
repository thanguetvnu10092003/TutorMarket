import { NextResponse } from 'next/server';

// POST /api/payments/webhook — Stripe webhook handler (stub)
export async function POST(request: Request) {
  const body = await request.text();
  
  // In production: verify Stripe signature
  // const sig = request.headers.get('stripe-signature');
  // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);

  // Stub: parse as JSON
  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      // Update payment status to CAPTURED
      // Send confirmation email to student
      // Notify tutor
      console.log('Payment succeeded:', event.data?.object?.id);
      break;
    case 'payment_intent.payment_failed':
      // Update payment status
      // Notify student of failure
      console.log('Payment failed:', event.data?.object?.id);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }

  return NextResponse.json({ received: true });
}

// GET /api/payments/history — Payment history
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    data: [
      { id: 'pay-1', date: '2026-03-12', amount: 150, subject: 'CFA_LEVEL_1', tutor: 'Dr. James Wright', status: 'CAPTURED' },
      { id: 'pay-2', date: '2026-03-08', amount: 150, subject: 'CFA_LEVEL_1', tutor: 'Dr. James Wright', status: 'CAPTURED' },
      { id: 'pay-3', date: '2024-06-10', amount: 0, subject: 'CFA_LEVEL_1', tutor: 'Dr. James Wright', status: 'FREE_TRIAL' },
    ],
  });
}
