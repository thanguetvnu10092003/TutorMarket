import { formatCurrency, formatDateTime } from '@/lib/utils';
import { createInAppNotification } from '@/lib/in-app-notifications';

type PaymentNotificationPayload = {
  paymentAmount: number;
  tutorPayout: number;
  paidAt: Date;
  booking?: {
    id: string;
    studentId: string;
    subject: string;
    scheduledAt: Date;
    student: {
      name: string;
    };
    tutorProfile: {
      userId: string;
      user: {
        name: string;
      };
    };
  } | null;
  package?: {
    id: string;
    studentId: string;
    totalSessions: number;
    student: {
      name: string;
    };
    tutorProfile: {
      userId: string;
      user: {
        name: string;
      };
    };
  } | null;
};

export async function createTutorPaymentNotification(payload: PaymentNotificationPayload) {
  if (payload.tutorPayout <= 0) {
    return;
  }

  const tutorUserId = payload.booking?.tutorProfile.userId || payload.package?.tutorProfile.userId;

  if (!tutorUserId) {
    return;
  }

  const paidAtLabel = formatDateTime(payload.paidAt.toISOString());
  const title = `New earnings: ${formatCurrency(payload.tutorPayout)}`;
  const body = payload.booking
    ? `${payload.booking.student.name} paid for the ${payload.booking.subject.replace(/_/g, ' ')} session scheduled ${formatDateTime(payload.booking.scheduledAt.toISOString())}. Net payout ${formatCurrency(payload.tutorPayout)} recorded ${paidAtLabel}.`
    : `${payload.package?.student.name || 'A student'} paid for a ${payload.package?.totalSessions || 0}-lesson package. Net payout ${formatCurrency(payload.tutorPayout)} recorded ${paidAtLabel}.`;

  await createInAppNotification({
    userId: tutorUserId,
    preferenceType: 'PAYMENT_ALERTS',
    type: 'PAYMENT_CAPTURED',
    title,
    body,
    link: '/dashboard/tutor?tab=overview',
  });
}

export async function createStudentPaymentNotification(payload: PaymentNotificationPayload) {
  const studentUserId = payload.booking?.studentId || payload.package?.studentId;

  if (!studentUserId) {
    return;
  }

  const paidAtLabel = formatDateTime(payload.paidAt.toISOString());
  const title = payload.booking ? 'Payment successful for your lesson' : 'Payment successful for your package';
  const body = payload.booking
    ? `Your payment of ${formatCurrency(payload.paymentAmount)} for the ${payload.booking.subject.replace(/_/g, ' ')} lesson with ${payload.booking.tutorProfile.user.name} was captured ${paidAtLabel}. Scheduled time: ${formatDateTime(payload.booking.scheduledAt.toISOString())}.`
    : `Your payment for the ${payload.package?.totalSessions || 0}-lesson package with ${payload.package?.tutorProfile.user.name || 'your tutor'} was captured ${paidAtLabel}.`;

  await createInAppNotification({
    userId: studentUserId,
    preferenceType: 'PAYMENT_ALERTS',
    type: 'PAYMENT_SUCCESS',
    title,
    body,
    link: '/dashboard/student?tab=payments',
  });
}

export async function createStudentBookingConfirmedNotification(payload: PaymentNotificationPayload) {
  if (!payload.booking) {
    return;
  }

  await createInAppNotification({
    userId: payload.booking.studentId,
    preferenceType: 'SESSION_UPDATES',
    type: 'BOOKING_CONFIRMED',
    title: 'Your booking is confirmed',
    body: `Your ${payload.booking.subject.replace(/_/g, ' ')} lesson with ${payload.booking.tutorProfile.user.name} is confirmed for ${formatDateTime(payload.booking.scheduledAt.toISOString())}.`,
    link: '/dashboard/student?tab=bookings',
  });
}
