// ─── Mock Data Store ─────────────────────────────
// This module provides realistic sample data for development
// Replace with Prisma queries when connecting to a real database

import { User, TutorProfile, TutorCredential, Booking, Review, Conversation, Message, Notification, TutorCardData } from '@/types';

// ─── USERS ────────────────────────────────────────

export const users: User[] = [
  // Admin
  {
    id: 'admin-001',
    email: 'admin@preppass.com',
    role: 'ADMIN',
    name: 'Platform Admin',
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0A1628&color=C9A84C&size=200',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  // Students
  {
    id: 'student-001',
    email: 'sarah.chen@email.com',
    role: 'STUDENT',
    name: 'Sarah Chen',
    avatarUrl: 'https://ui-avatars.com/api/?name=Sarah+Chen&background=4A7C6F&color=F5F0E8&size=200',
    bio: 'Finance student preparing for CFA Level I',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'student-002',
    email: 'michael.nguyen@email.com',
    role: 'STUDENT',
    name: 'Michael Nguyen',
    avatarUrl: 'https://ui-avatars.com/api/?name=Michael+Nguyen&background=C9A84C&color=0A1628&size=200',
    bio: 'MBA applicant targeting 750+ GMAT score',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'student-003',
    email: 'emily.johnson@email.com',
    role: 'STUDENT',
    name: 'Emily Johnson',
    avatarUrl: 'https://ui-avatars.com/api/?name=Emily+Johnson&background=0F2847&color=F5F0E8&size=200',
    bio: 'Graduate school applicant studying for GRE',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: '2024-03-10T00:00:00Z',
  },
  {
    id: 'student-004',
    email: 'david.park@email.com',
    role: 'STUDENT',
    name: 'David Park',
    avatarUrl: 'https://ui-avatars.com/api/?name=David+Park&background=3D6A5E&color=F5F0E8&size=200',
    bio: 'CFA Level II candidate',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-03-15T00:00:00Z',
    updatedAt: '2024-03-15T00:00:00Z',
  },
  {
    id: 'student-005',
    email: 'anna.martinez@email.com',
    role: 'STUDENT',
    name: 'Anna Martinez',
    avatarUrl: 'https://ui-avatars.com/api/?name=Anna+Martinez&background=7A5F23&color=F5F0E8&size=200',
    bio: 'Pre-MBA candidate preparing for GMAT',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2024-04-01T00:00:00Z',
  },
  // Tutors (users)
  {
    id: 'tutor-user-001',
    email: 'james.wright@email.com',
    role: 'TUTOR',
    name: 'Dr. James Wright',
    avatarUrl: 'https://ui-avatars.com/api/?name=James+Wright&background=0A1628&color=C9A84C&size=200&bold=true',
    bio: 'CFA Charterholder with 12 years of Wall Street experience',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'tutor-user-002',
    email: 'priya.sharma@email.com',
    role: 'TUTOR',
    name: 'Priya Sharma',
    avatarUrl: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=4A7C6F&color=F5F0E8&size=200&bold=true',
    bio: 'GMAT 780 scorer, Harvard MBA, 500+ students mentored',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'tutor-user-003',
    email: 'robert.kim@email.com',
    role: 'TUTOR',
    name: 'Robert Kim',
    avatarUrl: 'https://ui-avatars.com/api/?name=Robert+Kim&background=C9A84C&color=0A1628&size=200&bold=true',
    bio: 'GRE 340/340, Stanford PhD, former ETS question writer',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  {
    id: 'tutor-user-004',
    email: 'lisa.chen@email.com',
    role: 'TUTOR',
    name: 'Lisa Chen, CFA',
    avatarUrl: 'https://ui-avatars.com/api/?name=Lisa+Chen&background=0F2847&color=F5F0E8&size=200&bold=true',
    bio: 'CFA Level III expert, portfolio manager at a top hedge fund',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'tutor-user-005',
    email: 'alex.thompson@email.com',
    role: 'TUTOR',
    name: 'Alex Thompson',
    avatarUrl: 'https://ui-avatars.com/api/?name=Alex+Thompson&background=3D6A5E&color=F5F0E8&size=200&bold=true',
    bio: 'GMAT instructor with 8 years of teaching experience',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-02-05T00:00:00Z',
    updatedAt: '2024-02-05T00:00:00Z',
  },
  {
    id: 'tutor-user-006',
    email: 'maria.gonzalez@email.com',
    role: 'TUTOR',
    name: 'Maria Gonzalez',
    avatarUrl: 'https://ui-avatars.com/api/?name=Maria+Gonzalez&background=7A5F23&color=F5F0E8&size=200&bold=true',
    bio: 'GRE verbal specialist, Columbia PhD in English Literature',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-02-10T00:00:00Z',
    updatedAt: '2024-02-10T00:00:00Z',
  },
  {
    id: 'tutor-user-007',
    email: 'william.zhang@email.com',
    role: 'TUTOR',
    name: 'William Zhang, CFA',
    avatarUrl: 'https://ui-avatars.com/api/?name=William+Zhang&background=0A1628&color=C9A84C&size=200&bold=true',
    bio: 'CFA charterholder, fixed income specialist, 15+ years in finance',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'tutor-user-008',
    email: 'jennifer.wilson@email.com',
    role: 'TUTOR',
    name: 'Dr. Jennifer Wilson',
    avatarUrl: 'https://ui-avatars.com/api/?name=Jennifer+Wilson&background=4A7C6F&color=F5F0E8&size=200&bold=true',
    bio: 'GMAT quant expert, MIT Math PhD, 10+ years tutoring',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-02-20T00:00:00Z',
    updatedAt: '2024-02-20T00:00:00Z',
  },
  {
    id: 'tutor-user-009',
    email: 'kevin.patel@email.com',
    role: 'TUTOR',
    name: 'Kevin Patel',
    avatarUrl: 'https://ui-avatars.com/api/?name=Kevin+Patel&background=C9A84C&color=0A1628&size=200&bold=true',
    bio: 'GRE 335, Berkeley PhD, specializes in GRE math strategies',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-02-25T00:00:00Z',
    updatedAt: '2024-02-25T00:00:00Z',
  },
  {
    id: 'tutor-user-010',
    email: 'diana.ross@email.com',
    role: 'TUTOR',
    name: 'Diana Ross, CFA',
    avatarUrl: 'https://ui-avatars.com/api/?name=Diana+Ross&background=0F2847&color=F5F0E8&size=200&bold=true',
    bio: 'CFA Level I & II specialist, BlackRock alum, passed all levels first attempt',
    isVerified: true,
    isBanned: false,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
];

// ─── TUTOR PROFILES ───────────────────────────────

export const tutorProfiles: TutorProfile[] = [
  {
    id: 'tutor-001',
    userId: 'tutor-user-001',
    specializations: ['CFA_LEVEL_1', 'CFA_LEVEL_2'],
    headline: 'CFA Charterholder & Wall Street Veteran — Master Financial Analysis',
    about: 'With over 12 years of experience on Wall Street and a CFA charter earned on my first attempt at every level, I bring real-world financial expertise to every tutoring session. My approach combines deep theoretical understanding with practical application, ensuring students not only pass their exams but truly understand the material. I\'ve helped 200+ candidates achieve their CFA dreams with a 92% first-attempt pass rate.',
    yearsOfExperience: 12,
    hourlyRate: 150,
    languages: ['English'],
    timezone: 'America/New_York',
    verificationStatus: 'APPROVED',
    rating: 4.9,
    totalReviews: 127,
    totalSessions: 342,
    linkedinUrl: 'https://linkedin.com/in/jameswright',
    isFeatured: true,
    responseTime: 15,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'tutor-002',
    userId: 'tutor-user-002',
    specializations: ['GMAT'],
    headline: 'GMAT 780 Scorer — Your Path to 700+ Starts Here',
    about: 'Scoring in the 99th percentile on the GMAT and graduating from Harvard Business School gave me a unique perspective on what it takes to excel. Over the past 6 years, I\'ve mentored 500+ students, with an average score improvement of 120 points. My structured approach breaks down complex problems into manageable strategies, helping students from all backgrounds reach their target scores.',
    yearsOfExperience: 6,
    hourlyRate: 175,
    languages: ['English', 'Hindi'],
    timezone: 'America/Chicago',
    verificationStatus: 'APPROVED',
    rating: 4.95,
    totalReviews: 89,
    totalSessions: 256,
    linkedinUrl: 'https://linkedin.com/in/priyasharma',
    isFeatured: true,
    responseTime: 10,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'tutor-003',
    userId: 'tutor-user-003',
    specializations: ['GRE'],
    headline: 'Perfect GRE Scorer & Former ETS Writer — Unlock Your Potential',
    about: 'As a former ETS question writer with a perfect 340/340 GRE score and a Stanford PhD, I understand the test from the inside out. I know exactly what the examiners are looking for and how to approach every question type systematically. My students see an average improvement of 15+ points, and many achieve scores above 330.',
    yearsOfExperience: 8,
    hourlyRate: 160,
    languages: ['English', 'Korean'],
    timezone: 'America/Los_Angeles',
    verificationStatus: 'APPROVED',
    rating: 4.85,
    totalReviews: 156,
    totalSessions: 410,
    linkedinUrl: 'https://linkedin.com/in/robertkim',
    websiteUrl: 'https://robertkim-gre.com',
    isFeatured: true,
    responseTime: 20,
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  {
    id: 'tutor-004',
    userId: 'tutor-user-004',
    specializations: ['CFA_LEVEL_2', 'CFA_LEVEL_3'],
    headline: 'Advanced CFA Specialist — Conquer Level II & III with Confidence',
    about: 'As a portfolio manager at a top hedge fund and CFA charterholder, I specialize in the advanced levels that most students find challenging. Level II\'s item sets and Level III\'s essay questions require a different approach, and I\'ve developed proven frameworks for tackling both. My 95% pass rate for Level III candidates speaks for itself.',
    yearsOfExperience: 10,
    hourlyRate: 200,
    languages: ['English', 'Mandarin'],
    timezone: 'Asia/Hong_Kong',
    verificationStatus: 'APPROVED',
    rating: 4.92,
    totalReviews: 74,
    totalSessions: 198,
    isFeatured: false,
    responseTime: 30,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'tutor-005',
    userId: 'tutor-user-005',
    specializations: ['GMAT'],
    headline: 'Veteran GMAT Instructor — Proven Strategies for Every Score Range',
    about: 'With 8 years of dedicated GMAT instruction and experience at top test prep companies, I\'ve developed a methodology that works for students at every level. Whether you\'re starting at 500 or aiming to break 750, I have tailored strategies for your specific needs. My holistic approach covers quant, verbal, IR, and AWA with equal depth.',
    yearsOfExperience: 8,
    hourlyRate: 120,
    languages: ['English', 'Spanish'],
    timezone: 'America/New_York',
    verificationStatus: 'APPROVED',
    rating: 4.78,
    totalReviews: 203,
    totalSessions: 567,
    isFeatured: false,
    responseTime: 25,
    createdAt: '2024-02-05T00:00:00Z',
    updatedAt: '2024-02-05T00:00:00Z',
  },
  {
    id: 'tutor-006',
    userId: 'tutor-user-006',
    specializations: ['GRE'],
    headline: 'GRE Verbal Maestro — From 150 to 165+ in Verbal Reasoning',
    about: 'As a Columbia PhD in English Literature, I bring a unique literary perspective to GRE verbal preparation. Understanding complex texts, strengthening vocabulary in context, and mastering analytical writing are my specialties. If verbal reasoning is holding you back, I can help you make it your strongest section.',
    yearsOfExperience: 5,
    hourlyRate: 110,
    languages: ['English', 'Spanish', 'Portuguese'],
    timezone: 'America/New_York',
    verificationStatus: 'APPROVED',
    rating: 4.82,
    totalReviews: 91,
    totalSessions: 234,
    isFeatured: false,
    responseTime: 20,
    createdAt: '2024-02-10T00:00:00Z',
    updatedAt: '2024-02-10T00:00:00Z',
  },
  {
    id: 'tutor-007',
    userId: 'tutor-user-007',
    specializations: ['CFA_LEVEL_1'],
    headline: 'Fixed Income Expert & CFA Coach — Build Your Foundation Right',
    about: 'Specializing in CFA Level I with 15+ years in the fixed income markets, I help candidates build the strong analytical foundation that carries them through all three levels. My deep expertise in quantitative methods, economics, and fixed income analysis makes even the most complex topics approachable and memorable.',
    yearsOfExperience: 15,
    hourlyRate: 130,
    languages: ['English', 'Mandarin'],
    timezone: 'Asia/Shanghai',
    verificationStatus: 'APPROVED',
    rating: 4.75,
    totalReviews: 45,
    totalSessions: 156,
    isFeatured: false,
    responseTime: 45,
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'tutor-008',
    userId: 'tutor-user-008',
    specializations: ['GMAT'],
    headline: 'MIT Math PhD — GMAT Quant Perfection Guaranteed',
    about: 'With a PhD in Mathematics from MIT and 10+ years of dedicated GMAT tutoring, I specialize in taking students from good to exceptional on the quantitative section. My approach combines number theory shortcuts, pattern recognition techniques, and data sufficiency mastery to consistently produce 50+ quant scores.',
    yearsOfExperience: 10,
    hourlyRate: 185,
    languages: ['English', 'French'],
    timezone: 'America/New_York',
    verificationStatus: 'APPROVED',
    rating: 4.88,
    totalReviews: 112,
    totalSessions: 389,
    linkedinUrl: 'https://linkedin.com/in/jenniferwilson',
    isFeatured: false,
    responseTime: 15,
    createdAt: '2024-02-20T00:00:00Z',
    updatedAt: '2024-02-20T00:00:00Z',
  },
  {
    id: 'tutor-009',
    userId: 'tutor-user-009',
    specializations: ['GRE'],
    headline: 'GRE Math Strategist — Master Quantitative Reasoning with Ease',
    about: 'Berkeley PhD with a passion for making math accessible to everyone. I\'ve developed a unique set of mental math shortcuts and problem-solving frameworks specifically designed for GRE quantitative reasoning. My students consistently score 165+ on the quant section, even those who started with math anxiety.',
    yearsOfExperience: 7,
    hourlyRate: 135,
    languages: ['English', 'Hindi', 'Gujarati'],
    timezone: 'America/Los_Angeles',
    verificationStatus: 'APPROVED',
    rating: 4.80,
    totalReviews: 67,
    totalSessions: 201,
    isFeatured: false,
    responseTime: 35,
    createdAt: '2024-02-25T00:00:00Z',
    updatedAt: '2024-02-25T00:00:00Z',
  },
  {
    id: 'tutor-010',
    userId: 'tutor-user-010',
    specializations: ['CFA_LEVEL_1', 'CFA_LEVEL_2'],
    headline: 'BlackRock Alum — Pass CFA on Your First Attempt',
    about: 'Having passed all three CFA levels on the first attempt while working at BlackRock, I understand the challenge of balancing exam prep with a demanding career. My efficient study strategies and real-world examples from investment management make the curriculum come alive. I specialize in Level I and II, focusing on the areas that matter most for scoring.',
    yearsOfExperience: 9,
    hourlyRate: 145,
    languages: ['English'],
    timezone: 'Europe/London',
    verificationStatus: 'APPROVED',
    rating: 4.87,
    totalReviews: 58,
    totalSessions: 178,
    isFeatured: false,
    responseTime: 20,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
];

// ─── REVIEWS ──────────────────────────────────────

export const reviews: Review[] = [
  {
    id: 'review-001', bookingId: 'booking-001', studentId: 'student-001', tutorProfileId: 'tutor-001',
    rating: 5, comment: 'Dr. Wright is absolutely phenomenal! His real-world examples from Wall Street made the CFA Level I ethics section come alive. I went from struggling to scoring above 70th percentile in ethics. Highly recommend!',
    isPublic: true, createdAt: '2024-06-15T00:00:00Z',
  },
  {
    id: 'review-002', bookingId: 'booking-002', studentId: 'student-002', tutorProfileId: 'tutor-002',
    rating: 5, comment: 'Priya transformed my GMAT preparation entirely. Her structured approach to sentence correction and critical reasoning helped me improve my verbal score from 35 to 42. Her strategies are genuinely game-changing.',
    isPublic: true, createdAt: '2024-06-20T00:00:00Z',
  },
  {
    id: 'review-003', bookingId: 'booking-003', studentId: 'student-003', tutorProfileId: 'tutor-003',
    rating: 5, comment: 'Robert\'s insider knowledge as a former ETS writer is invaluable. He taught me patterns in the GRE that I never would have spotted on my own. My score jumped from 310 to 332!',
    isPublic: true, createdAt: '2024-07-01T00:00:00Z',
  },
  {
    id: 'review-004', bookingId: 'booking-004', studentId: 'student-004', tutorProfileId: 'tutor-001',
    rating: 5, comment: 'Second round with Dr. Wright for Level II. His item set strategies are masterful. He breaks down complex vignettes into manageable pieces. Couldn\'t have passed without him.',
    isPublic: true, createdAt: '2024-07-10T00:00:00Z',
  },
  {
    id: 'review-005', bookingId: 'booking-005', studentId: 'student-005', tutorProfileId: 'tutor-002',
    rating: 4, comment: 'Great tutor with deep knowledge. The only reason for 4 stars instead of 5 is that sessions sometimes ran late, but the quality of instruction was top-notch. My GMAT score went from 620 to 720.',
    isPublic: true, createdAt: '2024-07-15T00:00:00Z',
  },
  {
    id: 'review-006', bookingId: 'booking-006', studentId: 'student-001', tutorProfileId: 'tutor-004',
    rating: 5, comment: 'Lisa\'s expertise in derivatives and portfolio management for CFA Level III essay questions is unmatched. Her mock essay grading and feedback were incredibly detailed and helpful.',
    isPublic: true, createdAt: '2024-07-20T00:00:00Z',
  },
  {
    id: 'review-007', bookingId: 'booking-007', studentId: 'student-003', tutorProfileId: 'tutor-006',
    rating: 5, comment: 'Maria\'s literary approach to GRE verbal made reading comprehension passages actually enjoyable. Her vocabulary strategies using word roots and context are brilliant. Verbal went from 152 to 166!',
    isPublic: true, createdAt: '2024-08-01T00:00:00Z',
  },
  {
    id: 'review-008', bookingId: 'booking-008', studentId: 'student-002', tutorProfileId: 'tutor-008',
    rating: 5, comment: 'Dr. Wilson\'s math background is exceptional. She helped me see GMAT quant problems from angles I never considered. My quant score went from 42 to 50. Worth every penny!',
    isPublic: true, createdAt: '2024-08-05T00:00:00Z',
  },
];

// ─── BOOKINGS ─────────────────────────────────────

export const bookings: Booking[] = [
  {
    id: 'booking-001', studentId: 'student-001', tutorProfileId: 'tutor-001',
    scheduledAt: '2024-06-10T14:00:00Z', durationMinutes: 60,
    status: 'COMPLETED', sessionNumber: 1, isFreeSession: true,
    subject: 'CFA_LEVEL_1', meetingLink: 'https://meet.google.com/abc-defg-hij',
    createdAt: '2024-06-08T00:00:00Z', updatedAt: '2024-06-10T15:00:00Z',
  },
  {
    id: 'booking-002', studentId: 'student-002', tutorProfileId: 'tutor-002',
    scheduledAt: '2024-06-15T10:00:00Z', durationMinutes: 90,
    status: 'COMPLETED', sessionNumber: 1, isFreeSession: true,
    subject: 'GMAT', notes: 'Focus on sentence correction strategies',
    createdAt: '2024-06-13T00:00:00Z', updatedAt: '2024-06-15T11:30:00Z',
  },
  {
    id: 'booking-upcoming-001', studentId: 'student-001', tutorProfileId: 'tutor-001',
    scheduledAt: '2026-03-20T14:00:00Z', durationMinutes: 60,
    status: 'CONFIRMED', sessionNumber: 5, isFreeSession: false,
    subject: 'CFA_LEVEL_1', meetingLink: 'https://meet.google.com/xyz-uvwx-yz',
    createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'booking-upcoming-002', studentId: 'student-002', tutorProfileId: 'tutor-002',
    scheduledAt: '2026-03-22T16:00:00Z', durationMinutes: 90,
    status: 'CONFIRMED', sessionNumber: 8, isFreeSession: false,
    subject: 'GMAT', notes: 'Practice test review',
    createdAt: '2026-03-11T00:00:00Z', updatedAt: '2026-03-11T00:00:00Z',
  },
];

// ─── CONVERSATIONS ────────────────────────────────

export const conversations: Conversation[] = [
  {
    id: 'conv-001', studentId: 'student-001', tutorProfileId: 'tutor-001',
    lastMessageAt: '2026-03-12T10:30:00Z', createdAt: '2024-06-08T00:00:00Z',
  },
  {
    id: 'conv-002', studentId: 'student-002', tutorProfileId: 'tutor-002',
    lastMessageAt: '2026-03-11T15:45:00Z', createdAt: '2024-06-13T00:00:00Z',
  },
];

export const messages: Message[] = [
  {
    id: 'msg-001', conversationId: 'conv-001', senderId: 'student-001',
    body: 'Hi Dr. Wright! I\'m preparing for CFA Level I and would love your guidance on the ethics section.',
    sentAt: '2024-06-08T10:00:00Z', readAt: '2024-06-08T10:05:00Z',
  },
  {
    id: 'msg-002', conversationId: 'conv-001', senderId: 'tutor-user-001',
    body: 'Hello Sarah! I\'d be happy to help. Ethics is one of the most important sections and often the difference between pass and fail. Let\'s schedule our first session to discuss your current preparation level.',
    sentAt: '2024-06-08T10:10:00Z', readAt: '2024-06-08T10:15:00Z',
  },
  {
    id: 'msg-003', conversationId: 'conv-001', senderId: 'student-001',
    body: 'That sounds great! I\'m available most afternoons this week. Also, should I start reading the CFA Institute\'s Code of Ethics before our session?',
    sentAt: '2024-06-08T10:20:00Z', readAt: '2024-06-08T10:25:00Z',
  },
  {
    id: 'msg-004', conversationId: 'conv-001', senderId: 'tutor-user-001',
    body: 'Yes, definitely start with the Code and Standards of Professional Conduct. Just do a first read-through — don\'t worry about memorizing anything yet. We\'ll build a systematic framework for understanding and applying each standard in our session.',
    sentAt: '2026-03-12T10:30:00Z',
  },
];

// ─── NOTIFICATIONS ────────────────────────────────

export const notifications: Notification[] = [
  {
    id: 'notif-001', userId: 'student-001', type: 'BOOKING_CONFIRMED',
    title: 'Session Confirmed', body: 'Your session with Dr. James Wright on Mar 20 at 2:00 PM has been confirmed.',
    isRead: false, link: '/dashboard/student', createdAt: '2026-03-10T12:00:00Z',
  },
  {
    id: 'notif-002', userId: 'tutor-user-001', type: 'NEW_BOOKING',
    title: 'New Booking', body: 'Sarah Chen has booked a CFA Level I session on Mar 20 at 2:00 PM.',
    isRead: true, link: '/dashboard/tutor', createdAt: '2026-03-10T12:00:00Z',
  },
  {
    id: 'notif-003', userId: 'student-001', type: 'NEW_MESSAGE',
    title: 'New Message', body: 'Dr. James Wright sent you a message.',
    isRead: false, link: '/dashboard/student', createdAt: '2026-03-12T10:30:00Z',
  },
];

// ─── HELPER FUNCTIONS ─────────────────────────────

export function getTutorCardData(profile: TutorProfile): TutorCardData {
  const user = users.find(u => u.id === profile.userId);
  return {
    id: profile.id,
    userId: profile.userId,
    name: user?.name || 'Unknown Tutor',
    avatarUrl: user?.avatarUrl,
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
  };
}

export function getTutorWithUser(profileId: string) {
  const profile = tutorProfiles.find(p => p.id === profileId);
  if (!profile) return null;
  const user = users.find(u => u.id === profile.userId);
  return { ...profile, user: user || undefined };
}

export function getTutorReviews(tutorProfileId: string) {
  return reviews
    .filter(r => r.tutorProfileId === tutorProfileId)
    .map(r => ({
      ...r,
      student: users.find(u => u.id === r.studentId),
    }));
}

export function searchTutors(filters: {
  subject?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  language?: string;
  sortBy?: string;
}) {
  let results = tutorProfiles.filter(p => p.verificationStatus === 'APPROVED');

  if (filters.subject) {
    results = results.filter(p => p.specializations.includes(filters.subject as any));
  }
  if (filters.minPrice !== undefined) {
    results = results.filter(p => p.hourlyRate >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    results = results.filter(p => p.hourlyRate <= filters.maxPrice!);
  }
  if (filters.minRating !== undefined) {
    results = results.filter(p => p.rating >= filters.minRating!);
  }
  if (filters.language) {
    results = results.filter(p => p.languages.some(l => l.toLowerCase().includes(filters.language!.toLowerCase())));
  }

  switch (filters.sortBy) {
    case 'price_asc': results.sort((a, b) => a.hourlyRate - b.hourlyRate); break;
    case 'price_desc': results.sort((a, b) => b.hourlyRate - a.hourlyRate); break;
    case 'rating': results.sort((a, b) => b.rating - a.rating); break;
    case 'experience': results.sort((a, b) => b.yearsOfExperience - a.yearsOfExperience); break;
    case 'sessions': results.sort((a, b) => b.totalSessions - a.totalSessions); break;
    default: results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || b.rating - a.rating);
  }

  return results.map(getTutorCardData);
}
