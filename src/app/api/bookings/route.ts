import { NextRequest, NextResponse } from 'next/server';
import { bookings } from '@/lib/mock-data';
import { calculateCommission, generateId } from '@/lib/utils';

// POST /api/bookings — Create booking
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId, tutorProfileId, scheduledAt, subject, durationMinutes = 60 } = body;

  // Determine session number for this student-tutor pair
  const existingBookings = bookings.filter(
    b => b.studentId === studentId && b.tutorProfileId === tutorProfileId
  );
  const sessionNumber = existingBookings.length + 1;
  const isFreeSession = sessionNumber === 1;

  const newBooking = {
    id: generateId(),
    studentId,
    tutorProfileId,
    scheduledAt,
    durationMinutes,
    status: 'PENDING' as const,
    sessionNumber,
    isFreeSession,
    subject,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Commission calculation (for paid sessions)
  let payment = null;
  if (!isFreeSession) {
    const hourlyRate = 150; // Would come from tutor profile
    const amount = (hourlyRate * durationMinutes) / 60;
    const cumulativeFees = 0; // Would come from DB
    const { platformFee, tutorPayout } = calculateCommission(amount, sessionNumber, cumulativeFees);

    payment = {
      id: generateId(),
      bookingId: newBooking.id,
      amount,
      platformFee,
      tutorPayout,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
    };
  }

  return NextResponse.json({
    data: newBooking,
    payment,
    message: isFreeSession
      ? 'Free trial session booked! No payment required.'
      : `Session booked. Amount: $${payment?.amount}`,
  }, { status: 201 });
}

// GET /api/bookings — List own bookings
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'student-001'; // Would come from session
  const role = searchParams.get('role') || 'STUDENT';

  const filtered = bookings.filter(b =>
    role === 'STUDENT' ? b.studentId === userId : b.tutorProfileId === userId
  );

  return NextResponse.json({ data: filtered });
}
