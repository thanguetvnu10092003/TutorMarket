export type AvailabilitySlotLike = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
};

export type AvailabilityOverrideLike = {
  date: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  isAvailable?: boolean;
};

export type BookingLike = {
  scheduledAt: string | Date;
  durationMinutes: number;
  status?: string;
};

export type OpenTimeWindow = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function sortAvailabilitySlots<T extends { startTime: string; endTime: string }>(slots: T[]) {
  return [...slots].sort((left, right) => {
    const startDiff = timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
    if (startDiff !== 0) {
      return startDiff;
    }

    return timeToMinutes(left.endTime) - timeToMinutes(right.endTime);
  });
}

export function normalizeDateKey(value: string | Date) {
  const date = toDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export function validateDailyAvailabilitySlots(slots: Array<{ startTime: string; endTime: string }>) {
  const sorted = sortAvailabilitySlots(slots);

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const currentStart = timeToMinutes(current.startTime);
    const currentEnd = timeToMinutes(current.endTime);

    if (currentEnd <= currentStart) {
      return {
        valid: false,
        error: 'Each availability slot must end after it starts.',
      };
    }

    const previous = sorted[index - 1];
    if (previous && rangesOverlap(timeToMinutes(previous.startTime), timeToMinutes(previous.endTime), currentStart, currentEnd)) {
      return {
        valid: false,
        error: 'Availability slots on the same day cannot overlap.',
      };
    }
  }

  return { valid: true as const };
}

function subtractBlockedRanges(
  start: number,
  end: number,
  blockedRanges: Array<{ start: number; end: number }>
) {
  let segments = [{ start, end }];

  for (const blocked of blockedRanges) {
    segments = segments.flatMap((segment) => {
      if (!rangesOverlap(segment.start, segment.end, blocked.start, blocked.end)) {
        return [segment];
      }

      const nextSegments: Array<{ start: number; end: number }> = [];

      if (blocked.start > segment.start) {
        nextSegments.push({ start: segment.start, end: Math.min(blocked.start, segment.end) });
      }

      if (blocked.end < segment.end) {
        nextSegments.push({ start: Math.max(blocked.end, segment.start), end: segment.end });
      }

      return nextSegments;
    });
  }

  return segments.filter((segment) => segment.end > segment.start);
}

function getBlockedRangesForDate(date: Date, overrides: AvailabilityOverrideLike[], bookings: BookingLike[]) {
  const dateKey = normalizeDateKey(date);
  const blockedRanges: Array<{ start: number; end: number }> = [];
  let blocksWholeDay = false;

  for (const override of overrides) {
    if (normalizeDateKey(override.date) !== dateKey || override.isAvailable === true) {
      continue;
    }

    if (!override.startTime || !override.endTime) {
      blocksWholeDay = true;
      break;
    }

    blockedRanges.push({
      start: timeToMinutes(override.startTime),
      end: timeToMinutes(override.endTime),
    });
  }

  if (blocksWholeDay) {
    return { blocksWholeDay, blockedRanges: [{ start: 0, end: 24 * 60 }] };
  }

  for (const booking of bookings) {
    const scheduledAt = toDate(booking.scheduledAt);

    if (normalizeDateKey(scheduledAt) !== dateKey) {
      continue;
    }

    const start = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
    blockedRanges.push({
      start,
      end: start + booking.durationMinutes,
    });
  }

  return {
    blocksWholeDay,
    blockedRanges: blockedRanges.sort((left, right) => left.start - right.start),
  };
}

export function getOpenTimeWindowsForDate(input: {
  date: Date;
  durationMinutes: number;
  availability: AvailabilitySlotLike[];
  overrides?: AvailabilityOverrideLike[];
  bookings?: BookingLike[];
}) {
  const { date, durationMinutes, availability } = input;
  const overrides = input.overrides || [];
  const bookings = input.bookings || [];

  const dailyAvailability = sortAvailabilitySlots(
    availability.filter((slot) => slot.dayOfWeek === date.getDay() && slot.isActive !== false)
  );

  if (dailyAvailability.length === 0) {
    return [];
  }

  const blocked = getBlockedRangesForDate(date, overrides, bookings);
  if (blocked.blocksWholeDay) {
    return [];
  }

  const windows: OpenTimeWindow[] = [];

  for (const slot of dailyAvailability) {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    const freeSegments = subtractBlockedRanges(slotStart, slotEnd, blocked.blockedRanges);

    for (const segment of freeSegments) {
      if (segment.end - segment.start < durationMinutes) {
        continue;
      }

      windows.push({
        startTime: minutesToTime(segment.start),
        endTime: minutesToTime(segment.end),
        durationMinutes,
      });
    }
  }

  return sortAvailabilitySlots(windows);
}

export function hasAvailabilityWithinDays(input: {
  availability: AvailabilitySlotLike[];
  overrides?: AvailabilityOverrideLike[];
  bookings?: BookingLike[];
  durationMinutes: number;
  days?: number;
  timeBucket?: 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
}) {
  const days = input.days || 7;
  const today = new Date();

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() + offset);

    const windows = getOpenTimeWindowsForDate({
      date,
      durationMinutes: input.durationMinutes,
      availability: input.availability,
      overrides: input.overrides,
      bookings: input.bookings,
    }).filter((window) => {
      if (!input.timeBucket) {
        return true;
      }

      const startMinutes = timeToMinutes(window.startTime);
      if (input.timeBucket === 'MORNING') {
        return startMinutes < 12 * 60;
      }
      if (input.timeBucket === 'AFTERNOON') {
        return startMinutes >= 12 * 60 && startMinutes < 17 * 60;
      }
      return startMinutes >= 17 * 60;
    });

    if (windows.length > 0) {
      return true;
    }
  }

  return false;
}

export function countAvailableDaysWithinNextDays(input: {
  availability: AvailabilitySlotLike[];
  overrides: AvailabilityOverrideLike[];
  bookings: BookingLike[];
  durationMinutes: number;
  days?: number;
}): number {
  const { availability, overrides, bookings, durationMinutes, days = 7 } = input;
  const now = new Date();
  const distinctDays = new Set<string>();

  for (let d = 0; d < days; d++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + d);
    checkDate.setHours(0, 0, 0, 0);

    const windows = getOpenTimeWindowsForDate({
      date: checkDate,
      durationMinutes,
      availability,
      overrides,
      bookings,
    });

    for (const w of windows) {
      const startMins = timeToMinutes(w.startTime);
      const endMins = timeToMinutes(w.endTime);
      if (endMins - startMins >= durationMinutes) {
        distinctDays.add(normalizeDateKey(checkDate));
        break;
      }
    }
  }

  return distinctDays.size;
}

export function isSlotBookable(input: {
  scheduledAt: Date;
  durationMinutes: number;
  availability: AvailabilitySlotLike[];
  overrides?: AvailabilityOverrideLike[];
  bookings?: BookingLike[];
}) {
  const startTime = minutesToTime(input.scheduledAt.getHours() * 60 + input.scheduledAt.getMinutes());
  const endTime = minutesToTime(timeToMinutes(startTime) + input.durationMinutes);

  return getOpenTimeWindowsForDate({
    date: input.scheduledAt,
    durationMinutes: input.durationMinutes,
    availability: input.availability,
    overrides: input.overrides,
    bookings: input.bookings,
  }).some((window) => window.startTime === startTime && timeToMinutes(window.endTime) >= timeToMinutes(endTime));
}
