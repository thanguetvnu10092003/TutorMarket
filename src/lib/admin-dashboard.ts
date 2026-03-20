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
    strikes,
    gmatRequests,
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
    // @ts-ignore
    prisma.userStrike.findMany({
      include: {
        issuer: { select: { name: true } },
      },
    }),
    // @ts-ignore
    prisma.gmatVerificationRequest.findMany({
      where: {
        tutorCertification: {
          status: 'PENDING_VERIFICATION',
        },
      },
      include: {
        tutorCertification: {
          include: {
            tutorProfile: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const nonAdminTutorProfiles = tutorProfiles.filter((p: any) => p.user?.role !== 'ADMIN');

  const tutorMap = new Map(tutorProfiles.map((profile: any) => [profile.id, profile]));
  const conversationMap = new Map(
    conversations.map((conversation: any) => [`${conversation.studentId}:${conversation.tutorProfileId}`, conversation])
  );

  const nonAdminUsers = users.filter((user: any) => user.role !== 'ADMIN');
  const activeUsers = nonAdminUsers.filter((user: any) => getUserStatus(user) === 'ACTIVE');
  const totalGrossRevenue = sum(bookings.map((booking: any) => booking.payment?.amount || 0));
  const totalNetRevenue = sum(bookings.map((booking: any) => booking.payment?.platformFee || 0));
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

  const studentBookings = bookings.filter((booking: any) => booking.student.role === 'STUDENT');
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

  const activeStudentsPerTutor = tutorProfiles
    .map((profile: any) => {
      const relatedBookings = bookings.filter((booking: any) => booking.tutorProfileId === profile.id);
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
    bookings.filter((booking: any) => booking.sessionNumber >= 2).map((booking: any) => booking.studentId)
  );
  const studentsWithAnyBooking = new Set(bookings.map((booking: any) => booking.studentId));
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

  const completedBookings = bookings.filter((booking: any) => booking.status === 'COMPLETED');
  const hoursTaughtPerTutor = tutorProfiles
    .map((profile: any) => {
      const hours = sum(
        completedBookings
          .filter((booking: any) => booking.tutorProfileId === profile.id)
          .map((booking: any) => booking.durationMinutes / 60)
      );
      return {
        tutorProfileId: profile.id,
        tutorName: profile.user.name,
        hoursTaught: Number(hours.toFixed(1)),
      };
    })
    .sort((a: any, b: any) => b.hoursTaught - a.hoursTaught);

  const studentBookingsPerTutor = tutorProfiles
    .map((profile: any) => {
      const relatedBookings = bookings.filter((booking: any) => booking.tutorProfileId === profile.id);
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
      };
    })
    .sort((a: any, b: any) => b.totalBookings - a.totalBookings);

  const trialSessions = bookings.filter((booking: any) => booking.isFreeSession);
  const freeToPaidPairs = new Set(
    bookings.filter((booking: any) => booking.sessionNumber >= 2).map((booking: any) => `${booking.studentId}:${booking.tutorProfileId}`)
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

  const gmv = sum(bookings.map((booking: any) => booking.payment?.amount || 0));
  const platformFees = sum(bookings.map((booking: any) => booking.payment?.platformFee || 0));
  const takeRate = gmv === 0 ? 0 : Number(((platformFees / gmv) * 100).toFixed(1));

  const payoutHistory = bookings
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
    tutorName: r.tutorCertification.tutorProfile.user.name,
    tutorId: r.tutorCertification.tutorProfileId,
    tutorCertificationId: r.tutorCertificationId,
    status: r.tutorCertification.status,
    portalVerifiedAt: r.portalVerifiedAt,
    documentReviewedAt: r.documentReviewedAt,
    reviewNotes: r.reviewNotes,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt,
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
      gmatRequests: formattedGmatRequests,
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
  language?: string;
  isVerified?: boolean;
  country?: string;
  search?: string;
  availability?: string;
}) {
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
            status: 'VERIFIED'
          }
        }
      } : {}),
      ...(filters.language ? { languages: { has: filters.language } } : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? {
            hourlyRate: {
              ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
              ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
            },
          }
        : {}),
      ...(filters.minRating !== undefined ? { rating: { gte: filters.minRating } } : {}),
      // @ts-ignore - Prisma types out of sync due to EPERM on Windows
      ...(filters.country ? { user: { country: filters.country } } : {}),
      ...(filters.search ? {
        OR: [
          { user: { name: { contains: filters.search, mode: 'insensitive' } } },
          { headline: { contains: filters.search, mode: 'insensitive' } },
          { about: { contains: filters.search, mode: 'insensitive' } },
        ]
      } : {}),
    },
    include: {
      user: true,
      certifications: true,
      availability: true,
    },
  });

  const sortedProfiles = [...profiles].sort((left: any, right: any) => {
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
    rating: profile.rating,
    totalReviews: profile.totalReviews,
    totalSessions: profile.totalSessions,
    totalStudents: Math.max(3, Math.ceil(profile.totalSessions / 4)), // Dynamic student count
    responseTime: profile.responseTime,
    languages: profile.languages,
    availability: profile.availability,
    timezone: profile.timezone,
    verificationStatus: profile.verificationStatus,
    isFeatured: profile.isFeatured,
    yearsOfExperience: profile.yearsOfExperience,
    country: profile.user.country,
    countryFlag: profile.user.countryFlag,
    videoUrl: profile.videoUrl,
    verifiedCertifications: profile.certifications
      .filter((c: any) => c.status === 'VERIFIED')
      .map((c: any) => c.type),
  }));
}

export async function getPublicTutorProfile(tutorProfileId: string) {
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
