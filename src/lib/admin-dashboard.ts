import prisma from '@/lib/prisma';
import { getUserStatus, isSuspended } from '@/lib/admin';

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

export async function buildAdminDashboardData() {
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
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tutorProfile: {
          include: {
            certifications: true,
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
        certifications: true,
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
    prisma.adminAction.findMany({
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
  ]);

  const tutorMap = new Map(tutorProfiles.map((profile) => [profile.id, profile]));
  const conversationMap = new Map(
    conversations.map((conversation) => [`${conversation.studentId}:${conversation.tutorProfileId}`, conversation])
  );

  const nonAdminUsers = users.filter((user) => user.role !== 'ADMIN');
  const activeUsers = nonAdminUsers.filter((user) => getUserStatus(user) === 'ACTIVE');
  const totalGrossRevenue = sum(bookings.map((booking) => booking.payment?.amount || 0));
  const totalNetRevenue = sum(bookings.map((booking) => booking.payment?.platformFee || 0));
  const openTicketsCount =
    contentFlags.filter((flag) => flag.status === 'OPEN').length +
    reports.filter((report) => report.status === 'OPEN' || report.status === 'UNDER_REVIEW').length;

  const userRows = nonAdminUsers.map((user) => {
    const tutorProfile = user.tutorProfile;
    const status = getUserStatus(user);

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

  const studentBookings = bookings.filter((booking) => booking.student.role === 'STUDENT');
  const weekBuckets = getWeekBuckets();
  const monthBuckets = getMonthBuckets();
  const studentsBySubject = ['CFA', 'GMAT', 'GRE'].map((subject) => {
    const subjectBookings = studentBookings.filter((booking) => groupSubject(booking.subject) === subject);
    const studentIds = new Set(subjectBookings.map((booking) => booking.studentId));

    const weekly = weekBuckets.map((bucket) => ({
      label: bucket.label,
      value: new Set(
        subjectBookings
          .filter((booking) => booking.scheduledAt >= bucket.start && booking.scheduledAt < bucket.end)
          .map((booking) => booking.studentId)
      ).size,
    }));

    const monthly = monthBuckets.map((bucket) => ({
      label: bucket.label,
      value: new Set(
        subjectBookings
          .filter((booking) => booking.scheduledAt >= bucket.start && booking.scheduledAt < bucket.end)
          .map((booking) => booking.studentId)
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

  const activeStudentsPerTutor = tutorProfiles
    .map((profile) => {
      const relatedBookings = bookings.filter((booking) => booking.tutorProfileId === profile.id);
      return {
        tutorProfileId: profile.id,
        tutorName: profile.user.name,
        subject: profile.specializations[0],
        activeStudents: new Set(relatedBookings.map((booking) => booking.studentId)).size,
      };
    })
    .sort((a, b) => b.activeStudents - a.activeStudents)
    .slice(0, 10);

  const retainedStudents = new Set(
    bookings.filter((booking) => booking.sessionNumber >= 2).map((booking) => booking.studentId)
  );
  const studentsWithAnyBooking = new Set(bookings.map((booking) => booking.studentId));
  const recentStudentSignups = users
    .filter((user) => user.role === 'STUDENT' && user.createdAt.getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      joinedDate: user.createdAt,
      lastActive: user.lastActiveAt ?? user.updatedAt,
    }));

  const completedBookings = bookings.filter((booking) => booking.status === 'COMPLETED');
  const hoursTaughtPerTutor = tutorProfiles
    .map((profile) => {
      const hours = sum(
        completedBookings
          .filter((booking) => booking.tutorProfileId === profile.id)
          .map((booking) => booking.durationMinutes / 60)
      );
      return {
        tutorProfileId: profile.id,
        tutorName: profile.user.name,
        hoursTaught: Number(hours.toFixed(1)),
      };
    })
    .sort((a, b) => b.hoursTaught - a.hoursTaught);

  const studentBookingsPerTutor = tutorProfiles
    .map((profile) => {
      const relatedBookings = bookings.filter((booking) => booking.tutorProfileId === profile.id);
      const trialPairs = new Set(
        relatedBookings
          .filter((booking) => booking.isFreeSession)
          .map((booking) => `${booking.studentId}:${booking.tutorProfileId}`)
      );
      const convertedPairs = new Set(
        relatedBookings
          .filter((booking) => booking.sessionNumber >= 2)
          .map((booking) => `${booking.studentId}:${booking.tutorProfileId}`)
      );

      return {
        tutorProfileId: profile.id,
        tutorName: profile.user.name,
        totalBookings: relatedBookings.length,
        sessionTwoPlusConversionRate: trialPairs.size === 0 ? 0 : Number(((convertedPairs.size / trialPairs.size) * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.totalBookings - a.totalBookings);

  const trialSessions = bookings.filter((booking) => booking.isFreeSession);
  const freeToPaidPairs = new Set(
    bookings.filter((booking) => booking.sessionNumber >= 2).map((booking) => `${booking.studentId}:${booking.tutorProfileId}`)
  );
  const freeToPaidConversionRate = trialSessions.length === 0 ? 0 : Number(((freeToPaidPairs.size / trialSessions.length) * 100).toFixed(1));

  const newTutorSignupsPerWeek = getWeekBuckets(8).map((bucket) => ({
    label: bucket.label,
    value: users.filter(
      (user) =>
        user.role === 'TUTOR' &&
        user.createdAt >= bucket.start &&
        user.createdAt < bucket.end
    ).length,
  }));

  const gmv = sum(bookings.map((booking) => booking.payment?.amount || 0));
  const platformFees = sum(bookings.map((booking) => booking.payment?.platformFee || 0));
  const takeRate = gmv === 0 ? 0 : Number(((platformFees / gmv) * 100).toFixed(1));

  const payoutHistory = bookings
    .filter((booking) => booking.payment)
    .map((booking) => ({
      bookingId: booking.id,
      tutorName: booking.tutorProfile.user.name,
      studentName: booking.student.name,
      subject: booking.subject,
      payoutAmount: booking.payment?.tutorPayout || 0,
      payoutStatus: booking.payment?.payoutStatus || 'PENDING',
      payoutAt: booking.payment?.payoutAt || null,
      stripeTransferId: booking.payment?.stripeTransferId || null,
    }))
    .sort((a, b) => {
      const aTime = a.payoutAt ? new Date(a.payoutAt).getTime() : 0;
      const bTime = b.payoutAt ? new Date(b.payoutAt).getTime() : 0;
      return bTime - aTime;
    });

  const pricingSuggestions = ['CFA', 'GMAT', 'GRE'].map((subjectGroupName) => {
    const matchedProfiles = tutorProfiles.filter((profile) =>
      profile.specializations.some((subject) => groupSubject(subject) === subjectGroupName)
    );

    return {
      subject: subjectGroupName,
      averageHourlyRate:
        matchedProfiles.length === 0
          ? 0
          : Math.round(sum(matchedProfiles.map((profile) => profile.hourlyRate)) / matchedProfiles.length),
      tutorCount: matchedProfiles.length,
    };
  });

  const featuredTutors = tutorProfiles
    .filter((profile) => profile.isFeatured)
    .sort((a, b) => (a.featuredRank || 999) - (b.featuredRank || 999))
    .map((profile) => ({
      tutorProfileId: profile.id,
      tutorName: profile.user.name,
      featuredRank: profile.featuredRank,
      hiddenFromSearch: profile.hiddenFromSearch,
      verificationStatus: profile.verificationStatus,
    }));

  const verificationQueue = tutorProfiles
    .filter((profile) => profile.verificationStatus === 'PENDING')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((profile) => ({
      id: profile.id,
      tutorName: profile.user.name,
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
      certifications: profile.certifications.map((certification) => ({
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

  const contentFlagQueue = contentFlags.map((flag) => ({
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

  const reportsQueue = reports.map((report) => {
    const relatedConversation = report.booking
      ? conversationMap.get(`${report.booking.studentId}:${report.booking.tutorProfileId}`)
      : undefined;
    const previousBookings = report.booking
      ? bookings.filter(
          (booking) =>
            booking.studentId === report.booking?.studentId &&
            booking.tutorProfileId === report.booking?.tutorProfileId
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
        ? relatedConversation.messages.map((message) => ({
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
      previousBookings: previousBookings.map((booking) => ({
        id: booking.id,
        scheduledAt: booking.scheduledAt,
        status: booking.status,
        subject: booking.subject,
        sessionNumber: booking.sessionNumber,
      })),
    };
  });

  return {
    overview: {
      stats: {
        totalActiveUsers: activeUsers.length,
        tutorCounts: {
          verified: tutorProfiles.filter((profile) => profile.verificationStatus === 'APPROVED').length,
          pending: tutorProfiles.filter((profile) => profile.verificationStatus === 'PENDING').length,
          rejected: tutorProfiles.filter((profile) => profile.verificationStatus === 'REJECTED').length,
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
      tutorProfiles: tutorProfiles.map((profile) => ({
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
        newTutorSignupsPerWeek,
        gmv,
        takeRate,
        payoutHistory,
      },
      optimizationTools: {
        pricingSuggestions,
        featuredTutors,
        campaigns,
        seoMetadata,
      },
    },
    verifications: {
      queue: verificationQueue,
    },
    reports: {
      queue: reportsQueue,
    },
  };
}

export async function getPublicTutorCards(filters: {
  subject?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: string;
}) {
  const profiles = await prisma.tutorProfile.findMany({
    where: {
      verificationStatus: 'APPROVED',
      hiddenFromSearch: false,
      user: {
        isBanned: false,
        OR: [{ suspendedUntil: null }, { suspendedUntil: { lte: new Date() } }],
      },
      ...(filters.subject ? { specializations: { has: filters.subject as any } } : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? {
            hourlyRate: {
              ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
              ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
            },
          }
        : {}),
      ...(filters.minRating !== undefined ? { rating: { gte: filters.minRating } } : {}),
    },
    include: {
      user: true,
    },
  });

  const sortedProfiles = [...profiles].sort((left, right) => {
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
        return left.hourlyRate - right.hourlyRate;
      case 'price_desc':
        return right.hourlyRate - left.hourlyRate;
      case 'rating':
        return right.rating - left.rating;
      case 'experience':
        return right.yearsOfExperience - left.yearsOfExperience;
      case 'sessions':
        return right.totalSessions - left.totalSessions;
      default:
        return right.rating - left.rating;
    }
  });

  return sortedProfiles.map((profile) => ({
    id: profile.id,
    userId: profile.userId,
    name: profile.user.name,
    avatarUrl: profile.user.avatarUrl,
    headline: profile.headline,
    specializations: profile.specializations,
    hourlyRate: profile.hourlyRate,
    rating: profile.rating,
    totalReviews: profile.totalReviews,
    totalSessions: profile.totalSessions,
    responseTime: profile.responseTime,
    languages: profile.languages,
    verificationStatus: profile.verificationStatus,
    isFeatured: profile.isFeatured,
    yearsOfExperience: profile.yearsOfExperience,
  }));
}

export async function getPublicTutorProfile(tutorProfileId: string) {
  const profile = await prisma.tutorProfile.findFirst({
    where: {
      id: tutorProfileId,
      verificationStatus: 'APPROVED',
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
        },
        where: {
          isPublic: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      availability: true,
      education: true,
      certifications: true,
    },
  });

  if (!profile) {
    return null;
  }

  return profile;
}
