import prisma from '@/lib/prisma';
import { getUserStatus, isSuspended } from '@/lib/admin';
import { buildDisplayPrice, getCurrencyForLocation, getPrimaryPriceOption } from '@/lib/currency';
import { hasAvailabilityWithinDays, sortAvailabilitySlots, countAvailableDaysWithinNextDays } from '@/lib/availability';
import { getCountryOptions } from '@/lib/intl-data';
import { getPlatformSettingsSnapshot } from '@/lib/platform-settings';

const SUBJECT_GROUPS: Record<string, 'CFA' | 'GMAT' | 'GRE'> = {
  CFA_LEVEL_1: 'CFA',
  CFA_LEVEL_2: 'CFA',
  CFA_LEVEL_3: 'CFA',
  GMAT: 'GMAT',
  GRE: 'GRE',
};

function groupSubject(subject: string) {
  return SUBJECT_GROUPS[subject] || 'CFA';
}

function getWeekBuckets(weeks = 6) {
  const now = new Date();
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = [];

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const end = new Date(now);
    end.setDate(now.getDate() - index * 7 + 1);
    end.setHours(0, 0, 0, 0);

    const start = new Date(end);
    start.setDate(end.getDate() - 7);

    buckets.push({
      key: `${start.toISOString()}:${end.toISOString()}`,
      label: `W${weeks - index}`,
      start,
      end,
    });
  }

  return buckets;
}

function getMonthBuckets(months = 6) {
  const now = new Date();
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = [];

  for (let index = months - 1; index >= 0; index -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - index + 1, 1);
    buckets.push({
      key: `${start.toISOString()}:${end.toISOString()}`,
      label: start.toLocaleDateString('en-US', { month: 'short' }),
      start,
      end,
    });
  }

  return buckets;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export type AnalyticsPeriod = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME';

function getAnalyticsPeriodStart(period: AnalyticsPeriod) {
  const now = new Date();

  if (period === 'TODAY') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === 'THIS_WEEK') {
    const start = new Date(now);
    const dayOfWeek = start.getDay();
    const distance = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - distance);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === 'THIS_MONTH') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return null;
}

export async function buildAdminDashboardData(period: AnalyticsPeriod = 'ALL_TIME') {
  const [
    users,
    tutorProfiles,
    bookings,
    contentFlags,
    reports,
    conversations,
    adminActions,
    campaigns,
    seoMetadata,
    packages,
    strikes,
    gmatRequests,
    platformSettings,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tutorProfile: {
          include: {
            certifications: {
              include: {
                gmatVerification: true,
              },
            },
            credentials: true,
            education: true,
            tutorLanguages: true,
            pricing: true,
          },
        },
      },
    }),
    prisma.tutorProfile.findMany({
      include: {
        user: true,
        certifications: {
          include: {
            gmatVerification: true,
          },
        },
        credentials: true,
        education: true,
        tutorLanguages: true,
        pricing: true,
        verificationLogs: {
          include: {
            admin: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ featuredRank: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.booking.findMany({
      include: {
        student: true,
        tutorProfile: {
          include: {
            user: true,
          },
        },
        payment: true,
        review: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    }),
    prisma.contentFlag.findMany({
      include: {
        reporter: true,
        targetUser: true,
        tutorProfile: {
          include: {
            user: true,
          },
        },
        resolvedByAdmin: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userReport.findMany({
      // Bug 5.2: Fetch all report statuses so admin can filter and view history
      include: {
        reporter: true,
        reportedUser: true,
        tutorProfile: {
          include: {
            user: true,
          },
        },
        resolvedByAdmin: {
          select: { id: true, name: true },
        },
        booking: {
          include: {
            payment: true,
            events: {
              orderBy: { createdAt: 'asc' },
            },
            student: true,
            tutorProfile: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.conversation.findMany({
      include: {
        student: true,
        tutorProfile: {
          include: {
            user: true,
          },
        },
        messages: {
          include: {
            sender: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { sentAt: 'asc' },
        },
      },
    }),
    // @ts-ignore
    prisma.adminAction.findMany({
      // @ts-ignore
      where: { isDismissed: false },
      include: {
        admin: {
          select: { id: true, name: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.discountCampaign.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.seoMetadata.findMany({
      orderBy: { subject: 'asc' },
    }),
    prisma.bookingPackage.findMany({
      include: {
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    // @ts-ignore
    prisma.userStrike.findMany({
      include: {
        issuer: { select: { name: true } },
      },
    }),
    // @ts-ignore
    prisma.gmatVerificationRequest.findMany({
      where: {
        deletedAt: null,
        tutorCertification: {
          type: 'GMAT',
          status: { in: ['PENDING_VERIFICATION', 'RESUBMITTED'] },
        },
      },
      include: {
        tutorCertification: {
          include: {
            tutorProfile: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    getPlatformSettingsSnapshot(),
  ]);

  const nonAdminTutorProfiles = tutorProfiles.filter((profile: any) => profile.user?.role === 'TUTOR');

  const tutorMap = new Map(tutorProfiles.map((profile: any) => [profile.id, profile]));
  const conversationMap = new Map(
    conversations.map((conversation: any) => [`${conversation.studentId}:${conversation.tutorProfileId}`, conversation])
  );

  const nonAdminUsers = users.filter((user: any) => user.role !== 'ADMIN');
  const activeUsers = nonAdminUsers.filter((user: any) => getUserStatus(user) === 'ACTIVE');
  const capturedBookings = bookings.filter((b: any) => b.payment && b.payment.status === 'CAPTURED');
  const capturedPackages = packages.filter((p: any) => p.payment && p.payment.status === 'CAPTURED');

  // Map tutorProfileId → package revenue for all captured packages
  const packageRevenueByTutor = new Map<string, number>();
  for (const pkg of capturedPackages) {
    const rev = Math.max((pkg.payment?.amount || 0) - (pkg.payment?.refundedAmount || 0), 0);
    packageRevenueByTutor.set(pkg.tutorProfileId, (packageRevenueByTutor.get(pkg.tutorProfileId) || 0) + rev);
  }

  const totalGrossRevenue = sum(capturedBookings.map((booking: any) => booking.payment?.amount || 0)) + sum(capturedPackages.map((pkg: any) => pkg.payment?.amount || 0));
  const totalNetRevenue = sum(capturedBookings.map((booking: any) => booking.payment?.platformFee || 0)) + sum(capturedPackages.map((pkg: any) => pkg.payment?.platformFee || 0));
  const openTicketsCount =
    contentFlags.filter((flag: any) => flag.status === 'OPEN').length +
    reports.filter((report: any) => report.status === 'OPEN' || report.status === 'UNDER_REVIEW').length;

  const userRows = nonAdminUsers.map((user: any) => {
    const tutorProfile = user.tutorProfile;
    const status = getUserStatus(user);
    const userStrikes = adminActions.filter((s: any) => s.targetUserId === user.id && s.actionType.startsWith('WARN'));

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status,
      joinedDate: user.createdAt,
      lastActive: user.lastActiveAt ?? user.updatedAt,
      isBanned: user.isBanned,
      suspendedUntil: user.suspendedUntil,
      suspensionReason: user.suspensionReason,
      warningCount: user.warningCount,
      strikeCount: user.strikeCount,
      strikes: userStrikes,
      tutorProfile: tutorProfile
        ? {
            id: tutorProfile.id,
            headline: tutorProfile.headline,
            about: tutorProfile.about,
            specializations: tutorProfile.specializations,
            verificationStatus: tutorProfile.verificationStatus,
            hiddenFromSearch: tutorProfile.hiddenFromSearch,
            featuredRank: tutorProfile.featuredRank,
            isFeatured: tutorProfile.isFeatured,
            credentials: tutorProfile.credentials,
            certifications: tutorProfile.certifications,
            education: tutorProfile.education,
            languages: tutorProfile.tutorLanguages,
            pricing: tutorProfile.pricing,
            badgeType: tutorProfile.badgeType,
          }
        : null,
    };
  });

  const analyticsStartDate = getAnalyticsPeriodStart(period);
  const analyticsBookings = analyticsStartDate
    ? bookings.filter((booking: any) => new Date(booking.scheduledAt) >= analyticsStartDate)
    : bookings;
  const studentBookings = analyticsBookings.filter((booking: any) => booking.student.role === 'STUDENT');
  const weekBuckets = getWeekBuckets();
  const monthBuckets = getMonthBuckets();
  const studentsBySubject = ['CFA', 'GMAT', 'GRE'].map((subject) => {
    const subjectBookings = studentBookings.filter((booking: any) => groupSubject(booking.subject) === subject);
    const studentIds = new Set(subjectBookings.map((booking: any) => booking.studentId));

    const weekly = weekBuckets.map((bucket) => ({
      label: bucket.label,
      value: new Set(
        subjectBookings
          .filter((booking: any) => booking.scheduledAt >= bucket.start && booking.scheduledAt < bucket.end)
          .map((booking: any) => booking.studentId)
      ).size,
    }));

    const monthly = monthBuckets.map((bucket) => ({
      label: bucket.label,
      value: new Set(
        subjectBookings
          .filter((booking: any) => booking.scheduledAt >= bucket.start && booking.scheduledAt < bucket.end)
          .map((booking: any) => booking.studentId)
      ).size,
    }));

    return {
      subject,
      totalStudents: studentIds.size,
      trend: {
        weekly,
        monthly,
      },
    };
  });

  const activeStudentsPerTutor = nonAdminTutorProfiles
    .map((profile: any) => {
      const relatedBookings = analyticsBookings.filter((booking: any) => booking.tutorProfileId === profile.id);
      return {
        tutorProfileId: profile.id,
        tutorName: profile.user.name,
        subject: profile.specializations[0],
        activeStudents: new Set(relatedBookings.map((booking: any) => booking.studentId)).size,
      };
    })
    .sort((a: any, b: any) => b.activeStudents - a.activeStudents)
    .slice(0, 10);

  const retainedStudents = new Set(
    analyticsBookings.filter((booking: any) => booking.sessionNumber >= 2).map((booking: any) => booking.studentId)
  );
  const studentsWithAnyBooking = new Set(analyticsBookings.map((booking: any) => booking.studentId));
  const recentStudentSignups = users
    .filter((user: any) => user.role === 'STUDENT' && user.createdAt.getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000)
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      joinedDate: user.createdAt,
      lastActive: user.lastActiveAt ?? user.updatedAt,
    }));

  const completedBookings = analyticsBookings.filter((booking: any) => booking.status === 'COMPLETED');
  const completedPaidBookings = completedBookings.filter((booking: any) =>
    booking.payment && ['CAPTURED', 'REFUNDED'].includes(booking.payment.status)
  );
  const getNetPaymentFactor = (payment: any) => {
    if (!payment || !payment.amount) {
      return 0;
    }

    return Math.max(payment.amount - (payment.refundedAmount || 0), 0) / payment.amount;
  };
  const grossRevenueBeforeRefunds = sum(completedPaidBookings.map((booking: any) => booking.payment?.amount || 0));
  const refundedRevenue = sum(completedPaidBookings.map((booking: any) => booking.payment?.refundedAmount || 0));
  const grossRevenue = Math.max(grossRevenueBeforeRefunds - refundedRevenue, 0);
  const platformProfit = sum(
    completedPaidBookings.map((booking: any) => (booking.payment?.platformFee || 0) * getNetPaymentFactor(booking.payment))
  );
  const tutorEarnings = sum(
    completedPaidBookings.map((booking: any) => (booking.payment?.tutorPayout || 0) * getNetPaymentFactor(booking.payment))
  );
  const realizedCommissionRate = grossRevenueBeforeRefunds === 0
    ? 0
    : Number(((
        sum(completedPaidBookings.map((booking: any) => booking.payment?.platformFee || 0)) /
        grossRevenueBeforeRefunds
      ) * 100).toFixed(1));
  const overallConversionRate = analyticsBookings.length === 0
    ? 0
    : Number(((completedBookings.length / analyticsBookings.length) * 100).toFixed(1));

  const hoursTaughtPerTutor = nonAdminTutorProfiles
    .map((profile: any) => {
      const tutorBookings = analyticsBookings.filter((booking: any) => booking.tutorProfileId === profile.id);
      const tutorCompleted = tutorBookings.filter((booking: any) => booking.status === 'COMPLETED');
      const hours = sum(
        tutorCompleted.map((booking: any) => booking.durationMinutes / 60)
      );
      const tutorGross = sum(
        tutorCompleted
          .filter((booking: any) => booking.payment && ['CAPTURED', 'REFUNDED'].includes(booking.payment.status))
          .map((booking: any) => (booking.payment?.amount || 0) - (booking.payment?.refundedAmount || 0))
      ) + (packageRevenueByTutor.get(profile.id) || 0);
      const tutorConversionRate = tutorBookings.length === 0
        ? 0
        : Number(((tutorCompleted.length / tutorBookings.length) * 100).toFixed(1));

      return {
        tutorProfileId: profile.id,
        tutorName: profile.user.name,
        hoursTaught: Number(hours.toFixed(1)),
        grossGenerated: Number(tutorGross.toFixed(2)),
        conversionRate: tutorConversionRate,
      };
    })
    .sort((a: any, b: any) => b.grossGenerated - a.grossGenerated)
    .slice(0, 10);

  const studentBookingsPerTutor = nonAdminTutorProfiles
    .map((profile: any) => {
      const relatedBookings = analyticsBookings.filter((booking: any) => booking.tutorProfileId === profile.id);
      const trialPairs = new Set(
        relatedBookings
          .filter((booking: any) => booking.isFreeSession)
          .map((booking: any) => `${booking.studentId}:${booking.tutorProfileId}`)
      );
      const convertedPairs = new Set(
        relatedBookings
          .filter((booking: any) => booking.sessionNumber >= 2)
          .map((booking: any) => `${booking.studentId}:${booking.tutorProfileId}`)
      );

      return {
        tutorProfileId: profile.id,
        tutorName: profile.user.name,
        totalBookings: relatedBookings.length,
        sessionTwoPlusConversionRate: trialPairs.size === 0 ? 0 : Number(((convertedPairs.size / trialPairs.size) * 100).toFixed(1)),
        bookingConversionRate:
          relatedBookings.length === 0
            ? 0
            : Number(((relatedBookings.filter((booking: any) => booking.status === 'COMPLETED').length / relatedBookings.length) * 100).toFixed(1)),
      };
    })
    .sort((a: any, b: any) => b.totalBookings - a.totalBookings);

  const trialSessions = analyticsBookings.filter((booking: any) => booking.isFreeSession);
  const freeToPaidPairs = new Set(
    analyticsBookings.filter((booking: any) => booking.sessionNumber >= 2).map((booking: any) => `${booking.studentId}:${booking.tutorProfileId}`)
  );
  const freeToPaidConversionRate = trialSessions.length === 0 ? 0 : Number(((freeToPaidPairs.size / trialSessions.length) * 100).toFixed(1));

  const newTutorSignupsPerWeek = getWeekBuckets(8).map((bucket) => ({
    label: bucket.label,
    value: users.filter(
      (user: any) =>
        user.role === 'TUTOR' &&
        user.createdAt >= bucket.start &&
        user.createdAt < bucket.end
    ).length,
  }));

  const gmv = grossRevenue;
  const platformFees = platformProfit;
  const takeRate = realizedCommissionRate;

  const payoutHistory = analyticsBookings
    .filter((booking: any) => booking.payment)
    .map((booking: any) => ({
      bookingId: booking.id,
      tutorName: booking.tutorProfile.user.name,
      studentName: booking.student.name,
      subject: booking.subject,
      payoutAmount: booking.payment?.tutorPayout || 0,
      payoutStatus: booking.payment?.payoutStatus || 'PENDING',
      payoutAt: booking.payment?.payoutAt || null,
      stripeTransferId: booking.payment?.stripeTransferId || null,
    }))
    .sort((a: any, b: any) => {
      const aTime = a.payoutAt ? new Date(a.payoutAt).getTime() : 0;
      const bTime = b.payoutAt ? new Date(b.payoutAt).getTime() : 0;
      return bTime - aTime;
    });

  const pricingSuggestions = ['CFA', 'GMAT', 'GRE'].map((subjectGroupName: any) => {
    const matchedProfiles = tutorProfiles.filter((profile: any) =>
      profile.specializations.some((subject: any) => groupSubject(subject) === subjectGroupName)
    );

    return {
      subject: subjectGroupName,
      averageHourlyRate:
        matchedProfiles.length === 0
          ? 0
          : Math.round(sum(matchedProfiles.map((profile: any) => profile.hourlyRate)) / matchedProfiles.length),
      tutorCount: matchedProfiles.length,
    };
  });

  const featuredTutors = tutorProfiles
    .filter((profile: any) => profile.isFeatured)
    .sort((a: any, b: any) => (a.featuredRank || 999) - (b.featuredRank || 999))
    .map((profile: any) => ({
      tutorProfileId: profile.id,
      tutorName: profile.user.name,
      featuredRank: profile.featuredRank,
      hiddenFromSearch: profile.hiddenFromSearch,
      verificationStatus: profile.verificationStatus,
    }));

  const verificationQueue = tutorProfiles
    .filter((profile: any) => {
      const hasPendingProfileReview = profile.verificationStatus === 'PENDING';
      const hasPendingCertificationReview = profile.certifications.some((certification: any) =>
        certification.status === 'PENDING_VERIFICATION' || certification.status === 'RESUBMITTED'
      );

      return hasPendingProfileReview || hasPendingCertificationReview;
    })
    .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((profile: any) => ({
      id: profile.id,
      name: profile.user.name,
      tutorEmail: profile.user.email,
      subjects: profile.specializations,
      submittedDate: profile.createdAt,
      credentialsCount: profile.certifications.length + profile.credentials.length,
      preview: {
        id: profile.id,
        name: profile.user.name,
        headline: profile.headline,
        about: profile.about,
        hourlyRate: profile.hourlyRate,
        specializations: profile.specializations,
        yearsOfExperience: profile.yearsOfExperience,
        rating: profile.rating,
        totalReviews: profile.totalReviews,
        totalSessions: profile.totalSessions,
      },
      certifications: profile.certifications.map((certification: any) => ({
        ...certification,
        viewerUrl: certification.fileUrl,
        checklist: {
          scoreMatches: certification.status === 'VERIFIED',
          authentic: certification.status === 'VERIFIED',
          dateConsistent: certification.status === 'VERIFIED',
        },
      })),
      credentials: profile.credentials,
      history: profile.verificationLogs,
    }));

  const contentFlagQueue = contentFlags.map((flag: any) => ({
    id: flag.id,
    reporter: {
      id: flag.reporter.id,
      name: flag.reporter.name,
      email: flag.reporter.email,
    },
    targetUser: flag.targetUser
      ? {
          id: flag.targetUser.id,
          name: flag.targetUser.name,
          email: flag.targetUser.email,
        }
      : null,
    tutorProfile: flag.tutorProfile
      ? {
          id: flag.tutorProfile.id,
          name: flag.tutorProfile.user.name,
        }
      : null,
    contentType: flag.contentType,
    contentId: flag.contentId,
    reason: flag.reason,
    contentSnapshot: flag.contentSnapshot,
    status: flag.status,
    createdAt: flag.createdAt,
    resolutionNote: flag.resolutionNote,
  }));

  const reportsQueue = reports.map((report: any) => {
    const relatedConversation = report.booking
      ? conversationMap.get(`${report.booking.studentId}:${report.booking.tutorProfileId}`)
      : undefined;

    const previousBookings = report.booking
      ? bookings.filter(
          (booking: any) =>
            booking.studentId === (report.reportedUser.id === report.booking?.studentId ? report.booking?.studentId : report.reportedUser.id) &&
            booking.tutorProfileId === (report.booking?.tutorProfileId || report.tutorProfileId)
        )
      : [];

    return {
      id: report.id,
      type: report.type,
      status: report.status,
      reporter: {
        id: report.reporter.id,
        name: report.reporter.name,
        email: report.reporter.email,
      },
      reportedParty: {
        id: report.reportedUser.id,
        name: report.reportedUser.name,
        email: report.reportedUser.email,
        role: report.reportedUser.role,
        suspendedUntil: report.reportedUser.suspendedUntil ?? null,
        isBanned: report.reportedUser.isBanned ?? false,
      },
      description: report.description,
      adminNote: report.adminNote,
      createdAt: report.createdAt,
      booking: report.booking
        ? {
            id: report.booking.id,
            subject: report.booking.subject,
            date: report.booking.scheduledAt,
            durationMinutes: report.booking.durationMinutes,
            amountPaid: report.booking.payment?.amount || 0,
            timeline: report.booking.events,
            paymentLog: report.booking.payment
              ? {
                  id: report.booking.payment.id,
                  chargeAmount: report.booking.payment.amount,
                  refundedAmount: report.booking.payment.refundedAmount,
                  platformFee: report.booking.payment.platformFee,
                  payoutStatus: report.booking.payment.payoutStatus,
                  stripePaymentIntentId: report.booking.payment.stripePaymentIntentId,
                }
              : null,
          }
        : null,
      conversationThread: relatedConversation
        ? (relatedConversation as any).messages.map((message: any) => ({
            id: message.id,
            sender: {
              id: message.sender.id,
              name: message.sender.name,
              role: message.sender.role,
            },
            body: message.body,
            sentAt: message.sentAt,
          }))
        : [],
      previousBookings: previousBookings.map((booking: any) => ({
        id: booking.id,
        scheduledAt: booking.scheduledAt,
        status: booking.status,
        subject: booking.subject,
        sessionNumber: booking.sessionNumber,
      })),
    };
  });

  const formattedGmatRequests = gmatRequests.map((r: any) => ({
    id: r.id,
    tutorName: r.tutorCertification?.tutorProfile?.user?.name || 'Unknown Tutor',
    tutorEmail: r.tutorCertification?.tutorProfile?.user?.email || '',
    tutorId: r.tutorCertification?.tutorProfileId || 'Unknown',
    tutorCertificationId: r.tutorCertificationId,
    status: r.tutorCertification?.status || 'UNKNOWN',
    portalVerifiedAt: r.portalVerifiedAt,
    documentReviewedAt: r.documentReviewedAt,
    reviewNotes: r.reviewNotes,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt,
    certification: r.tutorCertification
      ? {
          id: r.tutorCertification.id,
          type: r.tutorCertification.type,
          levelOrVariant: r.tutorCertification.levelOrVariant,
          score: r.tutorCertification.score,
          percentiles: r.tutorCertification.percentiles,
          testDate: r.tutorCertification.testDate,
          status: r.tutorCertification.status,
          fileUrl: r.tutorCertification.fileUrl,
          selfReportedData: r.tutorCertification.selfReportedData,
          gmatVerification: {
            id: r.id,
            portalVerifiedAt: r.portalVerifiedAt,
            documentReviewedAt: r.documentReviewedAt,
            reviewNotes: r.reviewNotes,
            rejectionReason: r.rejectionReason,
          },
        }
      : null,
  }));

  return {
    overview: {
      stats: {
        totalActiveUsers: activeUsers.length,
        totalTutors: nonAdminTutorProfiles.length,
        tutorCounts: {
          verified: nonAdminTutorProfiles.filter((profile: any) => profile.verificationStatus === 'APPROVED').length,
          pending: nonAdminTutorProfiles.filter((profile: any) => profile.verificationStatus === 'PENDING').length,
          rejected: nonAdminTutorProfiles.filter((profile: any) => profile.verificationStatus === 'REJECTED').length,
        },
        revenue: {
          gross: totalGrossRevenue,
          netAfterPayouts: totalNetRevenue,
        },
        openTicketsAndReports: openTicketsCount,
      },
      auditLog: adminActions,
    },
    moderation: {
      users: userRows,
      tutorProfiles: nonAdminTutorProfiles.map((profile: any) => ({
        id: profile.id,
        userId: profile.userId,
        userName: profile.user.name,
        userEmail: profile.user.email,
        status: getUserStatus(profile.user),
        isTutorSuspended: isSuspended(profile.user.suspendedUntil),
        hiddenFromSearch: profile.hiddenFromSearch,
        specializations: profile.specializations,
        verificationStatus: profile.verificationStatus,
        preview: {
          id: profile.id,
          name: profile.user.name,
          headline: profile.headline,
          about: profile.about,
          hourlyRate: profile.hourlyRate,
          rating: profile.rating,
          totalReviews: profile.totalReviews,
          totalSessions: profile.totalSessions,
        },
        certifications: profile.certifications,
        credentials: profile.credentials,
        education: profile.education,
      })),
      contentFlags: contentFlagQueue,
    },
    analytics: {
      period,
      studentAnalytics: {
        studentsBySubject,
        activeStudentsPerTutor,
        retention: {
          studentsWithAnyBooking: studentsWithAnyBooking.size,
          retainedStudents: retainedStudents.size,
          paidConversionRate:
            studentsWithAnyBooking.size === 0
              ? 0
              : Number(((retainedStudents.size / studentsWithAnyBooking.size) * 100).toFixed(1)),
        },
        recentSignups: recentStudentSignups,
      },
      tutorAnalytics: {
        hoursTaughtPerTutor,
        studentBookingsPerTutor,
        freeToPaidConversionRate,
        overallConversionRate,
        newTutorSignupsPerWeek,
        gmv,
        takeRate,
        grossRevenue,
        platformProfit,
        tutorEarnings,
        commissionRate: platformSettings.commissionPercent,
        realizedCommissionRate,
        payoutHistory,
      },
      optimizationTools: {
        pricingSuggestions,
        featuredTutors,
        campaigns,
        seoMetadata,
      },
    },
    platformSettings,
    verifications: {
      queue: verificationQueue,
      gmatRequests: formattedGmatRequests,
    },
    reports: {
      queue: reportsQueue,
    },
  };
}

function resolveCountryCode(value?: string | null) {
  if (!value) {
    return null;
  }

  const options = getCountryOptions();
  const exactCode = options.find((country) => country.code === value.toUpperCase());
  if (exactCode) {
    return exactCode.code;
  }

  const exactName = options.find((country) => country.name.toLowerCase() === value.toLowerCase());
  return exactName?.code || null;
}

function getCertificationDisplayLabel(certification: any) {
  if (certification.type === 'CFA') {
    return certification.levelOrVariant?.replaceAll('_', ' ') || 'CFA';
  }

  return certification.type;
}

function getPercentileValue(percentiles: any, keys: string[]) {
  for (const key of keys) {
    const value = percentiles?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function buildCertificationSummary(certification: any) {
  // We show all except rejected or none
  if (certification.status === 'REJECTED' || certification.status === 'NONE') {
    return null;
  }

  const label = getCertificationDisplayLabel(certification);
  const percentiles = certification.percentiles || {};
  const isVerified = certification.status === 'VERIFIED';

  if (certification.type === 'GMAT') {
    const totalPercentile = getPercentileValue(percentiles, ['totalPercentile', 'totalPct', 'total']);
    const q = percentiles.quantScore ? `Q${percentiles.quantScore}` : null;
    const v = percentiles.verbalScore ? `V${percentiles.verbalScore}` : null;
    const di = percentiles.dataInsightsScore ? `DI${percentiles.dataInsightsScore}` : null;
    const subScores = [q, v, di].filter(Boolean).join(' ');
    
    return {
      id: certification.id,
      label,
      isVerified,
      type: 'GMAT',
      scoreText: certification.score ? `GMAT: ${certification.score}` : 'GMAT submitted',
      detailText: [
        totalPercentile ? `${totalPercentile}th percentile` : null,
        subScores ? `(${subScores})` : null
      ].filter(Boolean).join(' '),
      breakdown: {
        total: certification.score,
        totalPercentile,
        quant: percentiles.quantScore,
        quantPercentile: percentiles.quantPercentile,
        verbal: percentiles.verbalScore,
        verbalPercentile: percentiles.verbalPercentile,
        dataInsights: percentiles.dataInsightsScore,
        dataInsightsPercentile: percentiles.dataInsightsPercentile,
      }
    };
  }

  if (certification.type === 'GRE') {
    const verbal = percentiles?.verbal ?? percentiles?.verbalScore ?? null;
    const verbalPercentile = percentiles?.verbalPercentile ?? percentiles?.verbalPct ?? null;
    const quant = percentiles?.quant ?? percentiles?.quantScore ?? null;
    const quantPercentile = percentiles?.quantPercentile ?? percentiles?.quantPct ?? null;
    const writing = percentiles?.writing ?? percentiles?.writingScore ?? null;
    const writingPercentile = percentiles?.writingPercentile ?? percentiles?.writingPct ?? null;
    
    const combinedScore = [verbal ? `V${verbal}` : null, quant ? `Q${quant}` : null].filter(Boolean).join(' / ');
    const percentileSummary = [
      verbalPercentile ? `V ${verbalPercentile}%` : null, 
      quantPercentile ? `Q ${quantPercentile}%` : null, 
      writingPercentile ? `AWA ${writingPercentile}%` : null
    ].filter(Boolean).join(' • ');

    return {
      id: certification.id,
      label,
      isVerified,
      type: 'GRE',
      scoreText: combinedScore ? `GRE: ${combinedScore}` : 'GRE submitted',
      detailText: [writing ? `AWA ${writing}` : null, percentileSummary].filter(Boolean).join(' • ') || null,
      breakdown: {
        verbal,
        verbalPercentile,
        quant,
        quantPercentile,
        writing,
        writingPercentile
      }
    };
  }

  return {
    id: certification.id,
    label,
    isVerified,
    scoreText: certification.score ? `${label}: ${certification.score}` : `${label} submitted`,
    detailText: null,
  };
}

export async function getPublicTutorCards(filters: {
  subject?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: string;
  language?: string;
  isVerified?: boolean;
  country?: string;
  search?: string;
  availability?: string;
  nativeSpeaker?: boolean;
}, viewerContext?: { preferredCurrency?: string | null; countryCode?: string | null; timezone?: string | null }) {
  const selectedCountryCode = resolveCountryCode(filters.country);
  const viewerCurrency = getCurrencyForLocation({
    preferredCurrency: viewerContext?.preferredCurrency,
    countryCode: viewerContext?.countryCode,
    timezone: viewerContext?.timezone,
  });
  const profiles = await prisma.tutorProfile.findMany({
    where: {
      verificationStatus: filters.isVerified ? 'APPROVED' : { in: ['APPROVED', 'PENDING'] },
      hiddenFromSearch: false,
      user: {
        role: 'TUTOR',
        isBanned: false,
        OR: [{ suspendedUntil: null }, { suspendedUntil: { lte: new Date() } }],
      },
      ...(filters.subject ? {
        certifications: {
          some: {
            ...(filters.subject.startsWith('CFA')
              ? { type: 'CFA', levelOrVariant: filters.subject }
              : { type: filters.subject as any }),
            status: 'VERIFIED',
          },
        },
      } : {}),
      ...(filters.language ? { languages: { has: filters.language } } : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? { hourlyRate: { gte: 0 } }
        : {}),
      ...(filters.minRating !== undefined ? { rating: { gte: filters.minRating } } : {}),
      ...(filters.search ? {
        OR: [
          { user: { name: { contains: filters.search, mode: 'insensitive' } } },
          { headline: { contains: filters.search, mode: 'insensitive' } },
          { about: { contains: filters.search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: {
      user: true,
      certifications: true,
      availability: true,
      overrides: {
        where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      },
      bookings: {
        where: {
          scheduledAt: { gte: new Date() },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        select: { scheduledAt: true, durationMinutes: true, status: true },
      },
      tutorLanguages: true,
      pricing: {
        where: { isEnabled: true },
        orderBy: { durationMinutes: 'asc' },
      },
    },
  });

  // Bug 1.2 + 1.3: Batch-query actual booking counts, hours taught, and unique student counts
  const profileIds = profiles.map((p: any) => p.id);
  let bookingStatsMap = new Map<string, { count: number; minutes: number }>();
  let studentCountMap = new Map<string, number>();

  if (profileIds.length > 0) {
    const [bookingStats, distinctStudents] = await Promise.all([
      prisma.booking.groupBy({
        by: ['tutorProfileId'],
        where: {
          tutorProfileId: { in: profileIds },
          status: { in: ['COMPLETED', 'CONFIRMED'] },
        },
        _count: { id: true },
        _sum: { durationMinutes: true },
      }),
      prisma.booking.findMany({
        where: {
          tutorProfileId: { in: profileIds },
          status: { notIn: ['CANCELLED'] },
        },
        select: { tutorProfileId: true, studentId: true },
        distinct: ['tutorProfileId', 'studentId'],
      }),
    ]);

    bookingStatsMap = new Map(
      bookingStats.map((stat: any) => [
        stat.tutorProfileId,
        { count: stat._count.id, minutes: stat._sum.durationMinutes || 0 },
      ])
    );

    for (const row of distinctStudents) {
      studentCountMap.set(row.tutorProfileId, (studentCountMap.get(row.tutorProfileId) || 0) + 1);
    }
  }

  const hydratedProfiles = profiles
    .map((profile: any) => {
      const primaryPricingOption =
        getPrimaryPriceOption(profile.pricing) ||
        (profile.hourlyRate > 0
          ? {
              durationMinutes: 60,
              price: profile.hourlyRate,
              isEnabled: true,
              currency: 'USD',
            }
          : null);
      const priceDisplay = primaryPricingOption
        ? buildDisplayPrice({
            amount: primaryPricingOption.price,
            originalCurrency: primaryPricingOption.currency,
            viewerCurrency,
          })
        : null;
      // Bug 1.1: Filter verifiedResults by current subject filter to avoid cross-subject badge confusion
      const subjectCertType = filters.subject
        ? (filters.subject.startsWith('CFA') ? 'CFA' : filters.subject)
        : null;
      const allVerifiedResults = profile.certifications
        .map((certification: any) => {
          const summary = buildCertificationSummary(certification);
          if (!summary) return null;
          // Always attach certType for filtering
          return { ...summary, certType: certification.type };
        })
        .filter(Boolean);
      const verifiedResults = subjectCertType
        ? allVerifiedResults.filter((r: any) => r.certType === subjectCertType)
        : allVerifiedResults;

      const countryCode = resolveCountryCode(profile.countryOfBirth) || resolveCountryCode(profile.user.country);
      const additionalLanguages = (profile.languages || []).filter((language: string) => language !== (profile.languages || [])[0]);
      const hasNextWeekAvailability = hasAvailabilityWithinDays({
        availability: profile.availability,
        overrides: profile.overrides,
        bookings: profile.bookings,
        durationMinutes: primaryPricingOption?.durationMinutes || 60,
        timeBucket:
          filters.availability && filters.availability !== 'NEXT_7_DAYS'
            ? (filters.availability as any)
            : null,
      });

      const availableDaysCount = countAvailableDaysWithinNextDays({
        availability: profile.availability,
        overrides: profile.overrides,
        bookings: profile.bookings,
        durationMinutes: primaryPricingOption?.durationMinutes || 60,
      });

      // Bug 1.2 + 1.3: Use actual booking/student counts
      const bookingData = bookingStatsMap.get(profile.id) || { count: 0, minutes: 0 };
      const studentCount = studentCountMap.get(profile.id) || 0;

      return {
        ...profile,
        primaryPricingOption,
        priceDisplay,
        viewerCurrency,
        verifiedResults,
        publicCountryCode: countryCode,
        publicCountry: profile.countryOfBirth || profile.user.country,
        additionalLanguages,
        hasNextWeekAvailability,
        availableDaysCount,
        actualBookingCount: bookingData.count,
        actualHoursTaught: Math.round((bookingData.minutes / 60) * 10) / 10,
        actualStudentCount: studentCount,
      };
    })
    .filter((profile: any) => {
      if (selectedCountryCode && profile.publicCountryCode !== selectedCountryCode) {
        return false;
      }

      if (filters.language) {
        const speaksLanguage = (profile.languages || []).includes(filters.language);
        if (!speaksLanguage) return false;
      }

      if (filters.nativeSpeaker) {
        const hasNativeLanguage = (profile.tutorLanguages || []).some((language: any) => language.proficiency === 'NATIVE');
        if (!hasNativeLanguage) {
          return false;
        }
      }

      if (filters.availability && !profile.hasNextWeekAvailability) {
        return false;
      }

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const displayAmount = profile.priceDisplay?.displayAmount ?? null;
        if (displayAmount === null) {
          return false;
        }

        if (filters.minPrice !== undefined && displayAmount < filters.minPrice) {
          return false;
        }

        if (filters.maxPrice !== undefined && displayAmount > filters.maxPrice) {
          return false;
        }
      }

      return true;
    });

  const sortedProfiles = [...hydratedProfiles].sort((left: any, right: any) => {
    if (left.isFeatured !== right.isFeatured) {
      return left.isFeatured ? -1 : 1;
    }

    const leftRank = left.featuredRank || 999;
    const rightRank = right.featuredRank || 999;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    switch (filters.sortBy) {
      case 'price_asc':
        return (left.priceDisplay?.displayAmount || 0) - (right.priceDisplay?.displayAmount || 0);
      case 'price_desc':
        return (right.priceDisplay?.displayAmount || 0) - (left.priceDisplay?.displayAmount || 0);
      case 'rating':
        return right.rating - left.rating;
      case 'experience': {
        const bookingDiff = (right.actualBookingCount || 0) - (left.actualBookingCount || 0);
        if (bookingDiff !== 0) return bookingDiff;
        return (right.actualHoursTaught || 0) - (left.actualHoursTaught || 0);
      }
      case 'sessions':
        return (right.actualBookingCount || 0) - (left.actualBookingCount || 0);
      default: {
        // Weighted scoring for "Recommended"
        const getScore = (p: any) => {
          const ratingScore = p.rating * 10; // 0-50
          const sessionScore = Math.min(p.totalSessions / 5, 20); // 0-20
          const expScore = Math.min(p.yearsOfExperience * 2, 20); // 0-20
          const responseScore = p.responseTime <= 60 ? 10 : 0; // 0-10
          return ratingScore + sessionScore + expScore + responseScore;
        };
        return getScore(right) - getScore(left);
      }
    }
  });

  return sortedProfiles.map((profile: any) => ({
    id: profile.id,
    userId: profile.userId,
    user: {
      name: profile.user.name,
      avatarUrl: profile.user.avatarUrl,
    },
    name: profile.user.name,
    avatarUrl: profile.user.avatarUrl,
    headline: profile.headline,
    bio: profile.about,
    about: profile.about,
    specializations: profile.specializations,
    hourlyRate: profile.hourlyRate,
    pricingOptions: profile.pricing.map((option: any) => ({
      ...option,
      priceDisplay: buildDisplayPrice({
        amount: option.price,
        originalCurrency: option.currency,
        viewerCurrency,
      }),
    })),
    primaryPrice: profile.priceDisplay,
    rating: profile.rating,
    totalReviews: profile.totalReviews,
    totalSessions: profile.actualBookingCount,
    totalHoursTaught: profile.actualHoursTaught,
    totalStudents: profile.actualStudentCount,
    responseTime: profile.responseTime,
    languages: profile.languages,
    availability: sortAvailabilitySlots(profile.availability),
    timezone: profile.timezone,
    verificationStatus: profile.verificationStatus,
    isFeatured: profile.isFeatured,
    yearsOfExperience: profile.yearsOfExperience,
    country: profile.publicCountry,
    countryCode: profile.publicCountryCode,
    countryFlag: profile.publicCountryCode ? getCountryOptions().find((country) => country.code === profile.publicCountryCode)?.flag || profile.user.countryFlag : profile.user.countryFlag,
    videoUrl: profile.videoUrl,
    availableWithin7Days: profile.hasNextWeekAvailability,
    availableDaysCount: profile.availableDaysCount,
    verifiedResults: profile.verifiedResults,
    // Bug 1.1: When subject filter is active, return only that subject's certifications
    verifiedCertifications: profile.certifications
      .filter((c: any) => {
        if (c.status !== 'VERIFIED') return false;
        if (!filters.subject) return true;
        const certType = filters.subject.startsWith('CFA') ? 'CFA' : filters.subject;
        return c.type === certType;
      })
      .map((c: any) => c.levelOrVariant || c.type),
  }));
}

export async function getPublicTutorProfile(tutorProfileId: string, viewerContext?: { preferredCurrency?: string | null; countryCode?: string | null; timezone?: string | null }) {
  const profile = await prisma.tutorProfile.findFirst({
    where: {
      id: tutorProfileId,
      verificationStatus: { in: ['APPROVED', 'PENDING'] },
      hiddenFromSearch: false,
      user: {
        isBanned: false,
        OR: [{ suspendedUntil: null }, { suspendedUntil: { lte: new Date() } }],
      },
    },
    include: {
      user: true,
      reviews: {
        include: {
          student: true,
          tags: true,
        },
        where: {
          isPublic: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      availability: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
      overrides: {
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      },
      bookings: {
        where: {
          scheduledAt: {
            gte: new Date(),
          },
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
        },
        select: {
          scheduledAt: true,
          durationMinutes: true,
          status: true,
        },
      },
      education: true,
      certifications: true,
      tutorLanguages: true,
      pricing: {
        where: { isEnabled: true },
        orderBy: { durationMinutes: 'asc' },
      },
    },
  });

  if (!profile) {
    return null;
  }

  const viewerCurrency = getCurrencyForLocation({
    preferredCurrency: viewerContext?.preferredCurrency,
    countryCode: viewerContext?.countryCode,
    timezone: viewerContext?.timezone,
  });
  const verifiedResults = profile.certifications
    .map((certification: any) => buildCertificationSummary(certification))
    .filter(Boolean);
  const publicCountryCode = resolveCountryCode(profile.countryOfBirth) || resolveCountryCode(profile.user.country);
  const primaryPricingOption =
    getPrimaryPriceOption(profile.pricing) ||
    (profile.hourlyRate > 0
      ? {
          durationMinutes: 60,
          price: profile.hourlyRate,
          isEnabled: true,
          currency: 'USD',
        }
      : null);

  return {
    ...profile,
    availability: sortAvailabilitySlots(profile.availability),
    pricingOptions: profile.pricing.map((option: any) => ({
      ...option,
      priceDisplay: buildDisplayPrice({
        amount: option.price,
        originalCurrency: option.currency,
        viewerCurrency,
      }),
    })),
    primaryPrice: primaryPricingOption
      ? buildDisplayPrice({
          amount: primaryPricingOption.price,
          originalCurrency: primaryPricingOption.currency,
          viewerCurrency,
        })
      : null,
    publicCountry: profile.countryOfBirth || profile.user.country,
    publicCountryCode,
    countryFlag: publicCountryCode ? getCountryOptions().find((country) => country.code === publicCountryCode)?.flag || profile.user.countryFlag : profile.user.countryFlag,
    blockedDates: profile.overrides,
    bookedSlots: profile.bookings,
    verifiedCertifications: profile.certifications
      .filter((c: any) => c.status === 'VERIFIED')
      .map((c: any) => c.levelOrVariant || c.type),
    verifiedResults,
  };
}
