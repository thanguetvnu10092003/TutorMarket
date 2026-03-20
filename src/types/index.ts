// ─── Type Definitions for Tutor Marketplace ─────────

export type Role = 'STUDENT' | 'TUTOR' | 'ADMIN';

export type Subject = 'CFA_LEVEL_1' | 'CFA_LEVEL_2' | 'CFA_LEVEL_3' | 'GMAT' | 'GRE';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export type PaymentStatus = 'PENDING' | 'CAPTURED' | 'REFUNDED';

export type CredentialType = 'CERTIFICATE' | 'SCORE_REPORT' | 'TRANSCRIPT' | 'OTHER';

// ─── User ─────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  role: Role;
  name: string;
  avatarUrl?: string;
  bio?: string;
  isVerified: boolean;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Tutor Profile ────────────────────────────────

export interface TutorProfile {
  id: string;
  userId: string;
  user?: User;
  specializations: Subject[];
  headline?: string;
  about?: string;
  yearsOfExperience: number;
  hourlyRate: number;
  languages: string[];
  timezone: string;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  rating: number;
  totalReviews: number;
  totalSessions: number;
  linkedinUrl?: string;
  websiteUrl?: string;
  isFeatured: boolean;
  responseTime: number;
  createdAt: string;
  updatedAt: string;
  credentials?: TutorCredential[];
  availability?: Availability[];
  reviews?: Review[];
}

// ─── Tutor Credential ────────────────────────────

export interface TutorCredential {
  id: string;
  tutorProfileId: string;
  type: CredentialType;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  verifiedAt?: string;
  verifiedById?: string;
}

// ─── Availability ─────────────────────────────────

export interface Availability {
  id: string;
  tutorProfileId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

export interface AvailabilityOverride {
  id: string;
  tutorProfileId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  isAvailable: boolean;
}

// ─── Booking ──────────────────────────────────────

export interface Booking {
  id: string;
  studentId: string;
  student?: User;
  tutorProfileId: string;
  tutorProfile?: TutorProfile;
  scheduledAt: string;
  durationMinutes: number;
  status: BookingStatus;
  sessionNumber: number;
  isFreeSession: boolean;
  subject: Subject;
  meetingLink?: string;
  notes?: string;
  cancelledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  payment?: Payment;
  review?: Review;
}

// ─── Payment ──────────────────────────────────────

export interface Payment {
  id: string;
  bookingId: string;
  stripePaymentIntentId?: string;
  amount: number;
  platformFee: number;
  tutorPayout: number;
  status: PaymentStatus;
  paidAt?: string;
  refundedAt?: string;
  createdAt: string;
}

// ─── Review ───────────────────────────────────────

export interface Review {
  id: string;
  bookingId: string;
  studentId: string;
  student?: User;
  tutorProfileId: string;
  rating: number;
  comment?: string;
  isPublic: boolean;
  createdAt: string;
}

// ─── Messaging ────────────────────────────────────

export interface Conversation {
  id: string;
  studentId: string;
  student?: User;
  tutorProfileId: string;
  tutorProfile?: TutorProfile;
  lastMessageAt: string;
  createdAt: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  body: string;
  sentAt: string;
  readAt?: string;
}

// ─── Notification ─────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// ─── Search / Filter Types ────────────────────────

export interface TutorSearchFilters {
  subject?: Subject;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  language?: string;
  availability?: string;
  country?: string;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'experience' | 'sessions';
  page?: number;
  limit?: number;
}

export interface TutorCardData {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  headline?: string;
  specializations: Subject[];
  hourlyRate: number;
  rating: number;
  totalReviews: number;
  totalSessions: number;
  responseTime: number;
  languages: string[];
  verificationStatus: VerificationStatus;
  isFeatured: boolean;
  yearsOfExperience: number;
  country?: string;
  countryFlag?: string;
  videoUrl?: string;
}

// ─── Subject Labels ───────────────────────────────

export const SUBJECT_LABELS: Record<Subject, string> = {
  CFA_LEVEL_1: 'CFA Level I',
  CFA_LEVEL_2: 'CFA Level II',
  CFA_LEVEL_3: 'CFA Level III',
  GMAT: 'GMAT',
  GRE: 'GRE',
};

export const SUBJECT_COLORS: Record<Subject, { bg: string; text: string }> = {
  CFA_LEVEL_1: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  CFA_LEVEL_2: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
  CFA_LEVEL_3: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  GMAT: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  GRE: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
};
