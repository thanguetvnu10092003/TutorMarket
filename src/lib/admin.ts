import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  sendBanEmail,
  sendBookingRequestEmail,
  sendSuspensionEmail,
  sendRefundDecisionEmail,
  sendVerificationApprovalEmail,
  sendVerificationRejectionEmail,
  sendWarningEmail,
} from '@/lib/mail';
import { createInAppNotification } from '@/lib/in-app-notifications';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
    })
  : null;

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export function isSuspended(suspendedUntil?: Date | null) {
  return !!suspendedUntil && suspendedUntil.getTime() > Date.now();
}

export function getUserStatus(user: { isBanned: boolean; suspendedUntil?: Date | null }): UserStatus {
  if (user.isBanned) return 'BANNED';
  if (isSuspended(user.suspendedUntil)) return 'SUSPENDED';
  return 'ACTIVE';
}

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('UNAUTHORIZED');
  }

  return session;
}

export async function recordAdminAction(input: {
  adminId: string;
  targetUserId?: string | null;
  actionType: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  return prisma.adminAction.create({
    data: {
      adminId: input.adminId,
      targetUserId: input.targetUserId ?? null,
      actionType: input.actionType,
      reason: input.reason ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });
}

export async function issueWarning(input: {
  adminId: string;
  userId: string;
  reason: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      strikeCount: true,
      warningCount: true,
      isBanned: true,
    },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // Create the strike record
  // @ts-ignore
  await prisma.userStrike.create({
    data: {
      userId: user.id,
      issuedById: input.adminId,
      reason: input.reason,
    },
  });

  // Calculate strikes in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // @ts-ignore
  const recentStrikeCount = await prisma.userStrike.count({
    where: {
      userId: user.id,
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  const nextWarningCount = user.warningCount + 1;
  const shouldAutoSuspend = !user.isBanned && recentStrikeCount >= 3;
  const suspendedUntil = shouldAutoSuspend ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      warningCount: nextWarningCount,
      strikeCount: recentStrikeCount, // sync the count
      suspendedUntil: suspendedUntil ?? undefined,
      suspensionReason: shouldAutoSuspend ? 'Auto-suspended after 3 strikes in 30 days.' : undefined,
    },
  });

  await sendWarningEmail(updatedUser.email, input.reason, recentStrikeCount);
  await createInAppNotification({
    userId: updatedUser.id,
    preferenceType: 'SESSION_UPDATES',
    type: 'ACCOUNT_WARNING',
    title: 'Account warning issued',
    body: `Your account received a warning: ${input.reason}`,
    link: '/settings?tab=account',
  });

  await recordAdminAction({
    adminId: input.adminId,
    targetUserId: user.id,
    actionType: shouldAutoSuspend ? 'WARN_AND_AUTO_SUSPEND' : 'WARN_USER',
    reason: input.reason,
    metadata: {
      strikeCount: recentStrikeCount,
      warningCount: nextWarningCount,
      autoSuspended: shouldAutoSuspend,
      suspendedUntil: suspendedUntil?.toISOString(),
    },
  });

  return updatedUser;
}

export async function suspendUser(input: {
  adminId: string;
  userId: string;
  reason: string;
  suspendedUntil: Date | null;
}) {
  const user = await prisma.user.update({
    where: { id: input.userId },
    data: {
      suspendedUntil: input.suspendedUntil,
      suspensionReason: input.reason,
      isBanned: false,
    },
  });

  if (user.role === 'TUTOR') {
    await prisma.tutorProfile.updateMany({
      where: { userId: user.id },
      data: {
        suspendedAt: input.suspendedUntil ? new Date() : null,
      },
    });
  }

  if (input.suspendedUntil) {
    await sendSuspensionEmail(user.email, input.reason, input.suspendedUntil);
  } else {
    await sendBanEmail(user.email, input.reason, false);
  }
  await createInAppNotification({
    userId: user.id,
    preferenceType: 'SESSION_UPDATES',
    type: input.suspendedUntil ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_RESTORED',
    title: input.suspendedUntil ? 'Account suspended' : 'Account restored',
    body: input.suspendedUntil
      ? `Your account is suspended until ${input.suspendedUntil.toLocaleString('en-US')}. Reason: ${input.reason}`
      : 'Your account suspension has been lifted.',
    link: '/settings?tab=account',
  });

  await recordAdminAction({
    adminId: input.adminId,
    targetUserId: user.id,
    actionType: input.suspendedUntil ? 'SUSPEND_ACCOUNT' : 'UNSUSPEND_ACCOUNT',
    reason: input.reason,
    metadata: {
      suspendedUntil: input.suspendedUntil?.toISOString() ?? null,
    },
  });

  return user;
}

export async function banUser(input: {
  adminId: string;
  userId: string;
  reason: string;
}) {
  const user = await prisma.user.update({
    where: { id: input.userId },
    data: {
      isBanned: true,
      banReason: input.reason,
      suspendedUntil: null,
      suspensionReason: null,
    },
  });

  if (user.role === 'TUTOR') {
    await prisma.tutorProfile.updateMany({
      where: { userId: user.id },
      data: {
        hiddenFromSearch: true,
        suspendedAt: new Date(),
      },
    });
  }

  await sendBanEmail(user.email, input.reason, true);

  await recordAdminAction({
    adminId: input.adminId,
    targetUserId: user.id,
    actionType: 'PERMANENT_BAN',
    reason: input.reason,
  });

  return user;
}

export async function toggleTutorSearchVisibility(input: {
  adminId: string;
  tutorProfileId: string;
  hidden: boolean;
  reason?: string | null;
}) {
  const tutor = await prisma.tutorProfile.update({
    where: { id: input.tutorProfileId },
    data: {
      hiddenFromSearch: input.hidden,
    },
    include: {
      user: {
        select: { id: true },
      },
    },
  });

  await recordAdminAction({
    adminId: input.adminId,
    targetUserId: tutor.user.id,
    actionType: input.hidden ? 'HIDE_PROFILE_FROM_SEARCH' : 'SHOW_PROFILE_IN_SEARCH',
    reason: input.reason,
    metadata: {
      tutorProfileId: tutor.id,
    },
  });

  return tutor;
}

export async function updateFeaturedTutors(input: {
  adminId: string;
  tutorProfileIds: string[];
}) {
  await prisma.$transaction(async (tx) => {
    await tx.tutorProfile.updateMany({
      where: {},
      data: {
        isFeatured: false,
        featuredRank: null,
      },
    });

    for (let index = 0; index < input.tutorProfileIds.length; index += 1) {
      const tutorProfileId = input.tutorProfileIds[index];
      await tx.tutorProfile.update({
        where: { id: tutorProfileId },
        data: {
          isFeatured: true,
          featuredRank: index + 1,
        },
      });
    }
  });

  await recordAdminAction({
    adminId: input.adminId,
    actionType: 'UPDATE_FEATURED_TUTORS',
    metadata: {
      tutorProfileIds: input.tutorProfileIds,
    },
  });
}

export async function processVerificationDecision(input: {
  adminId: string;
  tutorProfileId: string;
  decision: 'APPROVE' | 'REJECT';
  notes?: string;
  reasonCategory?: string;
  requestedDocument?: string;
  certificationChecklist?: Record<string, { scoreMatches: boolean; authentic: boolean; dateConsistent: boolean }>;
}) {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: input.tutorProfileId },
    include: {
      user: true,
      certifications: true,
    },
  });

  if (!tutor) {
    throw new Error('TUTOR_NOT_FOUND');
  }

  if (input.decision === 'APPROVE') {
    await prisma.$transaction(async (tx) => {
      await tx.tutorProfile.update({
        where: { id: tutor.id },
        data: {
          verificationStatus: 'APPROVED',
          verificationNotes: input.notes ?? null,
          badgeType: 'VERIFIED',
          hiddenFromSearch: false,
        },
      });

      await tx.user.update({
        where: { id: tutor.userId },
        data: {
          isVerified: true,
        },
      });

      for (const cert of tutor.certifications) {
        // Only verify if it was pending or self-reported, don't automatically override rejections
        if (cert.status === 'PENDING_VERIFICATION' || cert.status === 'SELF_REPORTED') {
          const nextStatus = cert.fileUrl ? 'VERIFIED' : 'SELF_REPORTED';
          await tx.tutorCertification.update({
            where: { id: cert.id },
            data: {
              status: nextStatus,
              verifiedAt: new Date(),
              verifiedById: input.adminId,
              notes: input.notes ?? cert.notes,
            },
          });
        }
      }

      await tx.tutorVerificationLog.create({
        data: {
          tutorProfileId: tutor.id,
          adminId: input.adminId,
          action: 'APPROVED',
          notes: input.notes,
          metadata: input.certificationChecklist,
        },
      });
    });

    await sendVerificationApprovalEmail(tutor.user.email, process.env.NEXT_PUBLIC_PLATFORM_NAME || 'TutorMarket');

    await recordAdminAction({
      adminId: input.adminId,
      targetUserId: tutor.userId,
      actionType: 'APPROVE_TUTOR_APPLICATION',
      reason: input.notes,
      metadata: input.certificationChecklist ?? null,
    });

    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.tutorProfile.update({
      where: { id: tutor.id },
      data: {
        verificationStatus: 'REJECTED',
        verificationNotes: input.notes ?? null,
        badgeType: 'NOT_VERIFIED',
        hiddenFromSearch: true,
      },
    });

    await tx.tutorCertification.updateMany({
      where: { tutorProfileId: tutor.id },
      data: {
        status: 'REJECTED',
        notes: input.notes ?? 'Rejected by admin',
      },
    });

    await tx.tutorVerificationLog.create({
      data: {
        tutorProfileId: tutor.id,
        adminId: input.adminId,
        action: 'REJECTED',
        reasonCategory: input.reasonCategory,
        notes: input.notes,
        requestedDocument: input.requestedDocument,
        metadata: input.certificationChecklist,
      },
    });
  });

  await sendVerificationRejectionEmail(tutor.user.email, input.notes || 'The application needs additional supporting documents.', input.requestedDocument);

  await recordAdminAction({
    adminId: input.adminId,
    targetUserId: tutor.userId,
    actionType: 'REJECT_TUTOR_APPLICATION',
    reason: input.notes,
    metadata: {
      reasonCategory: input.reasonCategory,
      requestedDocument: input.requestedDocument,
      certificationChecklist: input.certificationChecklist,
    },
  });
}

export async function issueRefund(input: {
  adminId: string;
  paymentId: string;
  amount: number;
  type: 'FULL' | 'PARTIAL';
  reason: string;
  notifyEmails: string[];
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: {
      booking: true,
    },
  });

  if (!payment) {
    throw new Error('PAYMENT_NOT_FOUND');
  }

  let stripeRefundId = `mock_ref_${payment.id}`;
  if (stripe && payment.stripePaymentIntentId) {
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: Math.round(input.amount * 100),
      reason: 'requested_by_customer',
      metadata: {
        paymentId: payment.id,
        adminReason: input.reason,
      },
    });
    stripeRefundId = refund.id;
  }

  const fullyRefunded = input.amount >= payment.amount;

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: fullyRefunded ? 'REFUNDED' : payment.status,
      refundedAmount: payment.refundedAmount + input.amount,
      refundReason: input.reason,
      refundedAt: new Date(),
    },
  });

  for (const email of input.notifyEmails) {
    await sendRefundDecisionEmail(email, {
      type: input.type,
      amount: input.amount,
      reason: input.reason,
    });
  }

  await recordAdminAction({
    adminId: input.adminId,
    actionType: input.type === 'FULL' ? 'ISSUE_FULL_REFUND' : 'ISSUE_PARTIAL_REFUND',
    reason: input.reason,
    metadata: {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      amount: input.amount,
      stripeRefundId,
    },
  });

  return updatedPayment;
}

export async function createGmatVerificationRequest(input: {
  tutorCertificationId: string;
  email: string;
  passwordHash: string;
  consentGiven: boolean;
}) {
  const { encrypt } = await import('./encryption');
  
  // @ts-ignore
  return prisma.gmatVerificationRequest.create({
    data: {
      tutorCertificationId: input.tutorCertificationId,
      encryptedEmail: encrypt(input.email),
      encryptedPassword: encrypt(input.passwordHash),
      consentGiven: input.consentGiven,
    },
  });
}

export async function getGmatCredentials(requestId: string) {
  const { decrypt } = await import('./encryption');
  
  // @ts-ignore
  const request = await prisma.gmatVerificationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new Error('REQUEST_NOT_FOUND');

  return {
    email: decrypt(request.encryptedEmail),
    password: decrypt(request.encryptedPassword),
  };
}

export async function deleteGmatCredentials(requestId: string) {
  // @ts-ignore
  return prisma.gmatVerificationRequest.delete({
    where: { id: requestId },
  });
}

export async function notifyTutorAboutBookingRequest(input: {
  tutorUserId: string;
  tutorEmail: string;
  tutorName: string;
  studentName: string;
  subject: string;
  scheduledAt: Date;
  durationMinutes: number;
}) {
  await createInAppNotification({
    userId: input.tutorUserId,
    preferenceType: 'SESSION_UPDATES',
    type: 'NEW_BOOKING_REQUEST',
    title: 'New booking request',
    body: `${input.studentName} requested a ${input.durationMinutes}-minute ${input.subject.replace(/_/g, ' ')} lesson for ${input.scheduledAt.toLocaleString('en-US')}.`,
    link: '/dashboard/tutor?tab=sessions',
  });

  await sendBookingRequestEmail({
    to: input.tutorEmail,
    tutorName: input.tutorName,
    studentName: input.studentName,
    subject: input.subject,
    scheduledAt: input.scheduledAt,
    durationMinutes: input.durationMinutes,
  });
}
