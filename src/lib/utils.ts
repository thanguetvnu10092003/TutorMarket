import { clsx, type ClassValue } from 'clsx';
import { formatMoney } from '@/lib/currency';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return formatMoney(amount, currency);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(dateString: string): string {
  return `${formatDate(dateString)} at ${formatTime(dateString)}`;
}

export function formatDateInTz(dateString: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(new Date(dateString));
}

export function formatTimeInTz(dateString: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(new Date(dateString));
}

export function formatDateTimeInTz(dateString: string, timeZone: string): string {
  return `${formatDateInTz(dateString, timeZone)} at ${formatTimeInTz(dateString, timeZone)}`;
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

export function buildBookingRoomUrl(bookingId: string): string {
  return `https://meet.jit.si/tutormarket-${bookingId}`;
}

/**
 * Calculates whether a session room is joinable based on a time-window policy.
 *
 * The room is accessible between:
 *   - Open:  scheduledAt - EARLY_ENTRY_MINUTES (15 min before)
 *   - Close: scheduledAt + durationMinutes + GRACE_PERIOD_MINUTES (30 min after session should end)
 *
 * This prevents abuse where a tutor never marks a session complete to keep
 * using the room indefinitely, while still allowing flexible same-day access.
 */
const EARLY_ENTRY_MINUTES = 15;
const GRACE_PERIOD_MINUTES = 30;

export type SessionJoinStatus =
  | { canJoin: true }
  | { canJoin: false; reason: 'too_early'; opensAt: Date }
  | { canJoin: false; reason: 'expired'; closedAt: Date }
  | { canJoin: false; reason: 'not_confirmed' };

export function getSessionJoinStatus(
  scheduledAt: string | Date,
  durationMinutes: number,
  status: string,
): SessionJoinStatus {
  if (status !== 'CONFIRMED') {
    return { canJoin: false, reason: 'not_confirmed' };
  }

  const now = Date.now();
  const start = new Date(scheduledAt).getTime();
  const opensAt = new Date(start - EARLY_ENTRY_MINUTES * 60 * 1000);
  const closedAt = new Date(start + (durationMinutes + GRACE_PERIOD_MINUTES) * 60 * 1000);

  if (now < opensAt.getTime()) {
    return { canJoin: false, reason: 'too_early', opensAt };
  }

  if (now > closedAt.getTime()) {
    return { canJoin: false, reason: 'expired', closedAt };
  }

  return { canJoin: true };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getInitials(name?: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function calculateCommission(
  amount: number,
  sessionNumber: number,
  cumulativeFees: number,
  rate: number = 0.20,
  cap: number = 500
): { platformFee: number; tutorPayout: number } {
  if (sessionNumber === 1) {
    return { platformFee: 0, tutorPayout: 0 }; // Free session
  }

  if (cumulativeFees >= cap) {
    return { platformFee: 0, tutorPayout: amount }; // Cap reached
  }

  let fee = amount * rate;
  if (cumulativeFees + fee > cap) {
    fee = cap - cumulativeFees; // Partial fee to reach cap
  }

  return {
    platformFee: Math.round(fee * 100) / 100,
    tutorPayout: Math.round((amount - fee) * 100) / 100,
  };
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || '';
}

export function getStarDisplay(rating: number): string {
  return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
}

export function generateReferralCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
}
