import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const now = new Date();

function daysFromNow(days: number, hour = 10) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function daysAgo(days: number, hour = 10) {
  return daysFromNow(-days, hour);
}

async function main() {
  console.log('Starting database seed...');

  await prisma.contentFlag.deleteMany();
  await prisma.userReport.deleteMany();
  await prisma.adminAction.deleteMany();
  await prisma.tutorVerificationLog.deleteMany();
  await prisma.discountCampaign.deleteMany();
  await prisma.seoMetadata.deleteMany();
  await prisma.bookingEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availabilityOverride.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.tutorPricing.deleteMany();
  await prisma.tutorEducation.deleteMany();
  await prisma.tutorLanguage.deleteMany();
  await prisma.tutorCertification.deleteMany();
  await prisma.tutorCredential.deleteMany();
  await prisma.tutorProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@tutormarket.com',
      passwordHash,
      role: 'ADMIN',
      name: 'Platform Admin',
      isVerified: true,
      hasChosenRole: true,
      lastActiveAt: now,
    },
  });

  const studentInputs = [
    {
      email: 'sarah.chen@email.com',
      name: 'Sarah Chen',
      bio: 'Finance student preparing for CFA Level I.',
      createdAt: daysAgo(20),
      lastActiveAt: daysAgo(1, 20),
    },
    {
      email: 'michael.nguyen@email.com',
      name: 'Michael Nguyen',
      bio: 'MBA applicant targeting 740+ GMAT.',
      createdAt: daysAgo(12),
      lastActiveAt: daysAgo(0, 21),
    },
    {
      email: 'emily.johnson@email.com',
      name: 'Emily Johnson',
      bio: 'GRE verbal focused applicant.',
      createdAt: daysAgo(6),
      lastActiveAt: daysAgo(0, 18),
    },
    {
      email: 'david.park@email.com',
      name: 'David Park',
      bio: 'CFA Level II candidate.',
      createdAt: daysAgo(3),
      lastActiveAt: daysAgo(2, 14),
    },
    {
      email: 'anna.martinez@email.com',
      name: 'Anna Martinez',
      bio: 'Pre-MBA candidate looking for trial sessions.',
      createdAt: daysAgo(2),
      lastActiveAt: daysAgo(0, 16),
    },
    {
      email: 'ryan.taylor@email.com',
      name: 'Ryan Taylor',
      bio: 'Student account under review.',
      createdAt: daysAgo(14),
      lastActiveAt: daysAgo(5, 11),
      suspendedUntil: daysFromNow(3, 23),
      suspensionReason: 'Three conduct complaints under investigation.',
    },
  ];

  const students = [] as Awaited<ReturnType<typeof prisma.user.create>>[];
  for (const input of studentInputs) {
    students.push(
      await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: 'STUDENT',
          name: input.name,
          bio: input.bio,
          isVerified: true,
          lastActiveAt: input.lastActiveAt,
          createdAt: input.createdAt,
          suspendedUntil: input.suspendedUntil,
          suspensionReason: input.suspensionReason,
        },
      })
    );
  }

  const tutorInputs = [
    {
      email: 'james.wright@email.com',
      name: 'Dr. James Wright',
      bio: 'CFA charterholder and former portfolio manager.',
      headline: 'CFA mentor for Levels I and II',
      specializations: ['CFA_LEVEL_1', 'CFA_LEVEL_2'],
      hourlyRate: 150,
      yearsOfExperience: 12,
      rating: 4.9,
      totalReviews: 127,
      totalSessions: 342,
      verificationStatus: 'APPROVED' as const,
      badgeType: 'VERIFIED',
      featuredRank: 1,
      isFeatured: true,
      hiddenFromSearch: false,
      createdAt: daysAgo(70),
      lastActiveAt: daysAgo(0, 17),
    },
    {
      email: 'priya.sharma@email.com',
      name: 'Priya Sharma',
      bio: 'GMAT 780 and Harvard MBA tutor.',
      headline: 'GMAT strategy and mock interview coach',
      specializations: ['GMAT'],
      hourlyRate: 175,
      yearsOfExperience: 7,
      rating: 4.95,
      totalReviews: 89,
      totalSessions: 256,
      verificationStatus: 'APPROVED' as const,
      badgeType: 'VERIFIED',
      featuredRank: 2,
      isFeatured: true,
      hiddenFromSearch: false,
      createdAt: daysAgo(55),
      lastActiveAt: daysAgo(0, 19),
    },
    {
      email: 'robert.kim@email.com',
      name: 'Robert Kim',
      bio: 'GRE 340/340 with Stanford PhD.',
      headline: 'GRE quant and verbal deep dives',
      specializations: ['GRE'],
      hourlyRate: 160,
      yearsOfExperience: 8,
      rating: 4.85,
      totalReviews: 156,
      totalSessions: 410,
      verificationStatus: 'APPROVED' as const,
      badgeType: 'VERIFIED',
      featuredRank: 3,
      isFeatured: true,
      hiddenFromSearch: false,
      createdAt: daysAgo(64),
      lastActiveAt: daysAgo(1, 21),
    },
    {
      email: 'lisa.chen@email.com',
      name: 'Lisa Chen',
      bio: 'CFA Level III and hedge fund PM.',
      headline: 'Advanced CFA case-based coaching',
      specializations: ['CFA_LEVEL_2', 'CFA_LEVEL_3'],
      hourlyRate: 200,
      yearsOfExperience: 10,
      rating: 4.92,
      totalReviews: 74,
      totalSessions: 198,
      verificationStatus: 'PENDING' as const,
      badgeType: 'NOT_VERIFIED',
      featuredRank: null,
      isFeatured: false,
      hiddenFromSearch: false,
      createdAt: daysAgo(8),
      lastActiveAt: daysAgo(0, 15),
    },
    {
      email: 'alex.thompson@email.com',
      name: 'Alex Thompson',
      bio: 'GMAT instructor with former prep company background.',
      headline: 'GMAT quant bootcamp tutor',
      specializations: ['GMAT'],
      hourlyRate: 120,
      yearsOfExperience: 8,
      rating: 4.78,
      totalReviews: 203,
      totalSessions: 567,
      verificationStatus: 'APPROVED' as const,
      badgeType: 'VERIFIED',
      featuredRank: null,
      isFeatured: false,
      hiddenFromSearch: true,
      createdAt: daysAgo(90),
      lastActiveAt: daysAgo(4, 13),
      suspendedUntil: daysFromNow(7, 23),
      suspensionReason: 'Investigation pending for repeated no-show reports.',
    },
    {
      email: 'maria.gonzalez@email.com',
      name: 'Maria Gonzalez',
      bio: 'GRE verbal tutor with Columbia PhD.',
      headline: 'GRE verbal score jump specialist',
      specializations: ['GRE'],
      hourlyRate: 110,
      yearsOfExperience: 5,
      rating: 4.82,
      totalReviews: 91,
      totalSessions: 234,
      verificationStatus: 'REJECTED' as const,
      badgeType: 'NOT_VERIFIED',
      featuredRank: null,
      isFeatured: false,
      hiddenFromSearch: true,
      createdAt: daysAgo(18),
      lastActiveAt: daysAgo(2, 12),
    },
  ];

  const tutorUsers: Array<{
    user: Awaited<ReturnType<typeof prisma.user.create>>;
    profile: Awaited<ReturnType<typeof prisma.tutorProfile.create>>;
  }> = [];

  for (const input of tutorInputs) {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: 'TUTOR',
        name: input.name,
        bio: input.bio,
        isVerified: true,
        createdAt: input.createdAt,
        lastActiveAt: input.lastActiveAt,
        suspendedUntil: input.suspendedUntil,
        suspensionReason: input.suspensionReason,
      },
    });

    const profile = await prisma.tutorProfile.create({
      data: {
        userId: user.id,
        specializations: input.specializations as any,
        headline: input.headline,
        about: `${input.bio} Focused on ${input.specializations.join(', ').replaceAll('_', ' ')} outcomes.`,
        experienceHighlight: 'Delivers structured prep plans and post-session follow-up.',
        yearsOfExperience: input.yearsOfExperience,
        hourlyRate: input.hourlyRate,
        languages: ['English'],
        timezone: 'UTC',
        badgeType: input.badgeType,
        verificationStatus: input.verificationStatus,
        verificationNotes: input.verificationStatus === 'REJECTED' ? 'Need a clearer official report before approval.' : null,
        rating: input.rating,
        totalReviews: input.totalReviews,
        totalSessions: input.totalSessions,
        isFeatured: input.isFeatured,
        featuredRank: input.featuredRank ?? undefined,
        hiddenFromSearch: input.hiddenFromSearch,
        suspendedAt: input.suspendedUntil ? now : null,
        responseTime: 45,
        onboardingCompleted: true,
        createdAt: input.createdAt,
      },
    });

    await prisma.tutorLanguage.createMany({
      data: [
        { tutorProfileId: profile.id, language: 'English', proficiency: 'FLUENT' },
        { tutorProfileId: profile.id, language: 'Vietnamese', proficiency: 'CONVERSATIONAL' },
      ],
    });

    await prisma.tutorEducation.create({
      data: {
        tutorProfileId: profile.id,
        degree: input.specializations.includes('GMAT') ? 'MBA' : 'MASTERS',
        fieldOfStudy: input.specializations.includes('GRE') ? 'Economics' : 'Finance',
        institution: input.specializations.includes('GMAT') ? 'Harvard Business School' : 'Columbia University',
        graduationYear: 2018,
      },
    });

    await prisma.tutorPricing.createMany({
      data: [
        {
          tutorProfileId: profile.id,
          currency: 'USD',
          durationMinutes: 60,
          price: input.hourlyRate,
          isEnabled: true,
        },
        {
          tutorProfileId: profile.id,
          currency: 'USD',
          durationMinutes: 90,
          price: input.hourlyRate * 1.45,
          isEnabled: true,
        },
      ],
    });

    await prisma.availability.createMany({
      data: [
        { tutorProfileId: profile.id, dayOfWeek: 1, startTime: '09:00', endTime: '13:00', timezone: 'UTC' },
        { tutorProfileId: profile.id, dayOfWeek: 3, startTime: '10:00', endTime: '16:00', timezone: 'UTC' },
        { tutorProfileId: profile.id, dayOfWeek: 5, startTime: '08:00', endTime: '12:00', timezone: 'UTC' },
      ],
    });

    const subjectType = input.specializations.includes('GMAT')
      ? { type: 'GMAT', levelOrVariant: 'GMAT', score: 760 }
      : input.specializations.includes('GRE')
        ? { type: 'GRE', levelOrVariant: 'GRE', score: 332 }
        : { type: 'CFA', levelOrVariant: input.specializations[0], score: 88 };

    await prisma.tutorCertification.create({
      data: {
        tutorProfileId: profile.id,
        type: subjectType.type as any,
        levelOrVariant: subjectType.levelOrVariant,
        score: subjectType.score,
        percentiles: {
          total: 95,
          verbal: input.specializations.includes('GRE') ? 94 : 90,
          quant: input.specializations.includes('GMAT') ? 97 : 89,
        },
        testDate: daysAgo(400),
        fileUrl: input.verificationStatus === 'REJECTED' ? '/uploads/unreadable-score-report.pdf' : '/uploads/official-score-report.pdf',
        status:
          input.verificationStatus === 'APPROVED'
            ? 'VERIFIED'
            : input.verificationStatus === 'PENDING'
              ? 'PENDING_VERIFICATION'
              : 'REJECTED',
        verifiedAt: input.verificationStatus === 'APPROVED' ? daysAgo(30) : null,
        verifiedById: input.verificationStatus === 'APPROVED' ? admin.id : null,
        notes: input.verificationStatus === 'REJECTED' ? 'Resubmit a higher resolution file.' : null,
      },
    });

    await prisma.tutorCredential.create({
      data: {
        tutorProfileId: profile.id,
        type: 'SCORE_REPORT',
        subject: input.specializations[0] as any,
        fileName: `${input.name.toLowerCase().replaceAll(' ', '-')}-credential.pdf`,
        fileUrl: '/uploads/tutor-credential.pdf',
        uploadedAt: daysAgo(10),
        verifiedAt: input.verificationStatus === 'APPROVED' ? daysAgo(30) : null,
        verifiedById: input.verificationStatus === 'APPROVED' ? admin.id : null,
      },
    });

    tutorUsers.push({ user, profile });
  }

  const bookingInputs = [
    {
      student: students[0],
      tutor: tutorUsers[0],
      subject: 'CFA_LEVEL_1',
      scheduledAt: daysAgo(18, 9),
      status: 'COMPLETED',
      sessionNumber: 1,
      isFreeSession: true,
      amount: 0,
      platformFee: 0,
      tutorPayout: 0,
      payoutStatus: 'PAID',
    },
    {
      student: students[0],
      tutor: tutorUsers[0],
      subject: 'CFA_LEVEL_1',
      scheduledAt: daysAgo(11, 10),
      status: 'COMPLETED',
      sessionNumber: 2,
      isFreeSession: false,
      amount: 150,
      platformFee: 22.5,
      tutorPayout: 127.5,
      payoutStatus: 'PAID',
    },
    {
      student: students[1],
      tutor: tutorUsers[1],
      subject: 'GMAT',
      scheduledAt: daysAgo(8, 11),
      status: 'COMPLETED',
      sessionNumber: 1,
      isFreeSession: true,
      amount: 0,
      platformFee: 0,
      tutorPayout: 0,
      payoutStatus: 'PAID',
    },
    {
      student: students[1],
      tutor: tutorUsers[1],
      subject: 'GMAT',
      scheduledAt: daysAgo(4, 11),
      status: 'COMPLETED',
      sessionNumber: 2,
      isFreeSession: false,
      amount: 175,
      platformFee: 26.25,
      tutorPayout: 148.75,
      payoutStatus: 'PAID',
    },
    {
      student: students[2],
      tutor: tutorUsers[2],
      subject: 'GRE',
      scheduledAt: daysAgo(3, 14),
      status: 'NO_SHOW',
      sessionNumber: 1,
      isFreeSession: true,
      amount: 0,
      platformFee: 0,
      tutorPayout: 0,
      payoutStatus: 'HELD',
    },
    {
      student: students[4],
      tutor: tutorUsers[4],
      subject: 'GMAT',
      scheduledAt: daysAgo(2, 16),
      status: 'COMPLETED',
      sessionNumber: 3,
      isFreeSession: false,
      amount: 120,
      platformFee: 18,
      tutorPayout: 102,
      payoutStatus: 'PENDING',
    },
    {
      student: students[3],
      tutor: tutorUsers[3],
      subject: 'CFA_LEVEL_3',
      scheduledAt: daysFromNow(2, 9),
      status: 'CONFIRMED',
      sessionNumber: 1,
      isFreeSession: true,
      amount: 0,
      platformFee: 0,
      tutorPayout: 0,
      payoutStatus: 'PENDING',
    },
    {
      student: students[4],
      tutor: tutorUsers[2],
      subject: 'GRE',
      scheduledAt: daysFromNow(4, 13),
      status: 'CONFIRMED',
      sessionNumber: 1,
      isFreeSession: true,
      amount: 0,
      platformFee: 0,
      tutorPayout: 0,
      payoutStatus: 'PENDING',
    },
  ];

  const bookings: Awaited<ReturnType<typeof prisma.booking.create>>[] = [];
  for (const input of bookingInputs) {
    const booking = await prisma.booking.create({
      data: {
        studentId: input.student.id,
        tutorProfileId: input.tutor.profile.id,
        scheduledAt: input.scheduledAt,
        durationMinutes: 60,
        status: input.status as any,
        sessionNumber: input.sessionNumber,
        isFreeSession: input.isFreeSession,
        subject: input.subject as any,
        meetingLink: 'https://meet.example.com/demo-room',
        notes: input.isFreeSession ? 'Trial session' : 'Paid follow-up session',
        confirmedAt: input.status === 'CONFIRMED' || input.status === 'COMPLETED' || input.status === 'NO_SHOW' ? new Date(input.scheduledAt.getTime() - 24 * 60 * 60 * 1000) : null,
        startedAt: input.status === 'COMPLETED' || input.status === 'NO_SHOW' ? new Date(input.scheduledAt.getTime() + 5 * 60 * 1000) : null,
        completedAt: input.status === 'COMPLETED' ? new Date(input.scheduledAt.getTime() + 60 * 60 * 1000) : null,
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        stripePaymentIntentId: `pi_${booking.id.slice(-12)}`,
        amount: input.amount,
        platformFee: input.platformFee,
        tutorPayout: input.tutorPayout,
        status: input.amount > 0 ? 'CAPTURED' : 'PENDING',
        payoutStatus: input.payoutStatus as any,
        paidAt: input.amount > 0 ? new Date(input.scheduledAt.getTime() - 2 * 60 * 60 * 1000) : null,
        payoutAt: input.payoutStatus === 'PAID' ? new Date(input.scheduledAt.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
        stripeTransferId: input.payoutStatus === 'PAID' ? `tr_${booking.id.slice(-12)}` : null,
      },
    });

    await prisma.bookingEvent.createMany({
      data: [
        {
          bookingId: booking.id,
          eventType: 'CREATED',
          title: 'Booking created',
          details: 'Student requested a session.',
          createdAt: new Date(input.scheduledAt.getTime() - 48 * 60 * 60 * 1000),
        },
        {
          bookingId: booking.id,
          eventType: 'CONFIRMED',
          title: 'Booking confirmed',
          details: 'Tutor confirmed the booking.',
          createdAt: new Date(input.scheduledAt.getTime() - 24 * 60 * 60 * 1000),
        },
        {
          bookingId: booking.id,
          eventType: input.status,
          title:
            input.status === 'COMPLETED'
              ? 'Session completed'
              : input.status === 'NO_SHOW'
                ? 'Session marked as no-show'
                : 'Session scheduled',
          details: input.status === 'NO_SHOW' ? 'Student reported tutor absence.' : 'System generated event.',
          createdAt:
            input.status === 'COMPLETED' || input.status === 'NO_SHOW'
              ? new Date(input.scheduledAt.getTime() + 60 * 60 * 1000)
              : input.scheduledAt,
        },
      ],
    });

    bookings.push(booking);
  }

  const reviewOne = await prisma.review.create({
    data: {
      bookingId: bookings[1].id,
      studentId: students[0].id,
      tutorProfileId: tutorUsers[0].profile.id,
      rating: 5,
      comment: 'Clear framework for ethics and FRA. Worth the paid follow-up.',
      isPublic: true,
      createdAt: daysAgo(10),
    },
  });

  const reviewTwo = await prisma.review.create({
    data: {
      bookingId: bookings[3].id,
      studentId: students[1].id,
      tutorProfileId: tutorUsers[1].profile.id,
      rating: 4,
      comment: 'Helpful GMAT planning, though the session started late.',
      tutorReply: 'Thanks for the honest feedback. I have adjusted my calendar buffers.',
      repliedAt: daysAgo(3),
      isPublic: true,
      createdAt: daysAgo(4),
    },
  });

  const conversationOne = await prisma.conversation.create({
    data: {
      studentId: students[2].id,
      tutorProfileId: tutorUsers[2].profile.id,
      lastMessageAt: daysAgo(3),
    },
  });

  const conversationTwo = await prisma.conversation.create({
    data: {
      studentId: students[4].id,
      tutorProfileId: tutorUsers[4].profile.id,
      lastMessageAt: daysAgo(2),
    },
  });

  const messageFlagged = await prisma.message.create({
    data: {
      conversationId: conversationTwo.id,
      senderId: tutorUsers[4].user.id,
      body: 'Please pay today or I will cancel every future session.',
      sentAt: daysAgo(2, 17),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversationOne.id,
        senderId: students[2].id,
        body: 'I waited 15 minutes and could not join the room.',
        sentAt: daysAgo(3, 15),
      },
      {
        conversationId: conversationOne.id,
        senderId: tutorUsers[2].user.id,
        body: 'I had a browser issue. Let me know if you want to reschedule.',
        sentAt: daysAgo(3, 15),
      },
      {
        conversationId: conversationTwo.id,
        senderId: students[4].id,
        body: 'Could you send the homework recap from our last session?',
        sentAt: daysAgo(2, 16),
      },
    ],
  });

  await prisma.contentFlag.createMany({
    data: [
      {
        reporterId: students[1].id,
        targetUserId: tutorUsers[1].user.id,
        tutorProfileId: tutorUsers[1].profile.id,
        contentType: 'REVIEW',
        contentId: reviewTwo.id,
        reason: 'Tutor reply discloses private scheduling details.',
        contentSnapshot: {
          comment: reviewTwo.comment,
          tutorReply: reviewTwo.tutorReply,
        },
        status: 'OPEN',
        createdAt: daysAgo(1, 11),
      },
      {
        reporterId: students[4].id,
        targetUserId: tutorUsers[4].user.id,
        tutorProfileId: tutorUsers[4].profile.id,
        contentType: 'MESSAGE',
        contentId: messageFlagged.id,
        reason: 'Threatening tone in direct messages.',
        contentSnapshot: {
          message: messageFlagged.body,
        },
        status: 'OPEN',
        createdAt: daysAgo(1, 13),
      },
      {
        reporterId: students[0].id,
        targetUserId: tutorUsers[5].user.id,
        tutorProfileId: tutorUsers[5].profile.id,
        contentType: 'PROFILE',
        contentId: tutorUsers[5].profile.id,
        reason: 'Profile claims scores that are not supported by the uploaded file.',
        contentSnapshot: {
          headline: tutorUsers[5].profile.headline,
          about: tutorUsers[5].profile.about,
        },
        status: 'OPEN',
        createdAt: daysAgo(5, 12),
      },
    ],
  });

  const paymentDisputeBooking = bookings[5];
  const noShowBooking = bookings[4];

  await prisma.userReport.createMany({
    data: [
      {
        type: 'NO_SHOW_TUTOR',
        reporterId: students[2].id,
        reportedUserId: tutorUsers[2].user.id,
        tutorProfileId: tutorUsers[2].profile.id,
        bookingId: noShowBooking.id,
        description: 'Tutor never appeared in the video room and did not respond until later.',
        status: 'OPEN',
        createdAt: daysAgo(3, 16),
      },
      {
        type: 'PAYMENT_DISPUTE',
        reporterId: students[4].id,
        reportedUserId: tutorUsers[4].user.id,
        tutorProfileId: tutorUsers[4].profile.id,
        bookingId: paymentDisputeBooking.id,
        description: 'I was charged for a shortened session after the tutor ended early.',
        status: 'UNDER_REVIEW',
        createdAt: daysAgo(1, 14),
      },
      {
        type: 'INAPPROPRIATE_CONDUCT',
        reporterId: students[4].id,
        reportedUserId: tutorUsers[4].user.id,
        tutorProfileId: tutorUsers[4].profile.id,
        bookingId: paymentDisputeBooking.id,
        description: 'Messages became aggressive when I asked about a refund.',
        status: 'OPEN',
        createdAt: daysAgo(1, 15),
      },
      {
        type: 'TECHNICAL_ISSUE',
        reporterId: students[3].id,
        reportedUserId: tutorUsers[3].user.id,
        tutorProfileId: tutorUsers[3].profile.id,
        bookingId: bookings[6].id,
        description: 'Video room link expires immediately when opened.',
        status: 'OPEN',
        createdAt: daysAgo(0, 9),
      },
    ],
  });

  await prisma.discountCampaign.createMany({
    data: [
      {
        code: 'WELCOME15',
        type: 'PERCENTAGE',
        value: 15,
        expiryDate: daysFromNow(20),
        usageLimit: 200,
        usageCount: 38,
        isActive: true,
        createdById: admin.id,
      },
      {
        code: 'CFA50',
        type: 'FIXED',
        value: 50,
        expiryDate: daysFromNow(10),
        usageLimit: 50,
        usageCount: 12,
        isActive: true,
        createdById: admin.id,
      },
    ],
  });

  await prisma.seoMetadata.createMany({
    data: [
      {
        subject: 'CFA_LEVEL_1',
        title: 'CFA Level I Tutors for Trial and Paid Coaching',
        description: 'Compare verified CFA Level I tutors, rates, and free session conversion performance.',
        updatedById: admin.id,
      },
      {
        subject: 'GMAT',
        title: 'GMAT Tutors with Verified Scores and Trial Sessions',
        description: 'Browse featured GMAT tutors, pricing bands, and student conversion insights.',
        updatedById: admin.id,
      },
      {
        subject: 'GRE',
        title: 'GRE Tutors Ranked by Reviews, Rate, and Availability',
        description: 'Find GRE tutors with verified documents, conversion performance, and recent availability.',
        updatedById: admin.id,
      },
    ],
  });

  await prisma.tutorVerificationLog.createMany({
    data: [
      {
        tutorProfileId: tutorUsers[3].profile.id,
        adminId: admin.id,
        action: 'SUBMITTED',
        notes: 'Application entered admin queue.',
        createdAt: daysAgo(8, 10),
      },
      {
        tutorProfileId: tutorUsers[5].profile.id,
        adminId: admin.id,
        action: 'REQUEST_MORE_INFO',
        reasonCategory: 'Unreadable document',
        notes: 'Need a clearer GRE score report.',
        requestedDocument: 'Official score PDF with visible date.',
        createdAt: daysAgo(6, 15),
      },
      {
        tutorProfileId: tutorUsers[5].profile.id,
        adminId: admin.id,
        action: 'REJECTED',
        reasonCategory: 'Insufficient proof',
        notes: 'Re-upload an official document before resubmitting.',
        createdAt: daysAgo(4, 9),
      },
    ],
  });

  await prisma.adminAction.createMany({
    data: [
      {
        adminId: admin.id,
        targetUserId: tutorUsers[4].user.id,
        actionType: 'SUSPEND_ACCOUNT',
        reason: 'Temporary suspension while no-show and payment reports are reviewed.',
        metadata: { durationDays: 7 },
        createdAt: daysAgo(1, 18),
      },
      {
        adminId: admin.id,
        targetUserId: tutorUsers[5].user.id,
        actionType: 'REJECT_TUTOR_APPLICATION',
        reason: 'Verification file did not match the claimed score report.',
        metadata: { category: 'Insufficient proof' },
        createdAt: daysAgo(4, 9),
      },
      {
        adminId: admin.id,
        targetUserId: students[5].id,
        actionType: 'WARN_USER',
        reason: 'Repeated abusive messages in support thread.',
        metadata: { strikesAfterAction: 2 },
        createdAt: daysAgo(2, 12),
      },
    ],
  });

  console.log('Seed completed.');
  console.log(`Created 1 admin, ${students.length} students, ${tutorUsers.length} tutors.`);
  console.log(`Created ${bookings.length} bookings, 3 content flags, 4 reports, 2 discount campaigns.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
