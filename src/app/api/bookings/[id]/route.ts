import { NextRequest, NextResponse } from 'next/server';
import { bookings } from '@/lib/mock-data';

// PATCH /api/bookings/:id — Cancel or complete
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { action } = body; // 'cancel' or 'complete'
  const booking = bookings.find(b => b.id === params.id);

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (action === 'cancel') {
    const scheduledTime = new Date(booking.scheduledAt).getTime();
    const now = Date.now();
    const hoursUntil = (scheduledTime - now) / (1000 * 60 * 60);

    let refundPercentage = 0;
    if (hoursUntil > 24) {
      refundPercentage = 100; // Full refund
    } else if (hoursUntil > 0) {
      refundPercentage = 50; // 50% refund
    }

    return NextResponse.json({
      data: { ...booking, status: 'CANCELLED', cancelledAt: new Date().toISOString() },
      refund: { percentage: refundPercentage, message: `${refundPercentage}% refund will be processed` },
    });
  }

  if (action === 'complete') {
    return NextResponse.json({
      data: { ...booking, status: 'COMPLETED', completedAt: new Date().toISOString() },
      message: 'Session marked as complete. Student will be prompted to leave a review.',
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
