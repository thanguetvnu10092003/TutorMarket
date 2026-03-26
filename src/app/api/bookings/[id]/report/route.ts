import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Must match Prisma ReportType enum exactly
const reportSchema = z.object({
  type: z.enum(['NO_SHOW_TUTOR', 'NO_SHOW_STUDENT', 'INAPPROPRIATE_CONDUCT', 'PAYMENT_DISPUTE', 'TECHNICAL_ISSUE']),
  description: z.string().min(10, 'Please provide more details (min 10 characters)'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.id;
    const body = await req.json();
    const { type, description } = reportSchema.parse(body);

    // 1. Fetch booking to ensure it belongs to the student
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutorProfile: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.studentId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Create the UserReport
    const report = await prisma.userReport.create({
      data: {
        type: type as any,
        reporterId: session.user.id,
        reportedUserId: booking.tutorProfile.userId,
        tutorProfileId: booking.tutorProfileId,
        bookingId: booking.id,
        description,
        status: 'OPEN',
      }
    });

    // 3. Create a notification for admins (Optional: could also notify the tutor or send email)
    await prisma.notification.create({
        data: {
            userId: booking.tutorProfile.userId, // This is just an example, usually admins are notified differently
            type: 'REPORT_FILED',
            title: 'Issue Reported',
            body: `An issue was reported for your lesson on ${booking.scheduledAt.toLocaleDateString()}.`,
        }
    });

    return NextResponse.json({
      success: true,
      data: report
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Report Issue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
