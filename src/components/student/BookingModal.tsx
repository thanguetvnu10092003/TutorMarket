'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isToday,
  startOfDay,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { toast } from 'react-hot-toast';
import { getInitials } from '@/lib/utils';
import { formatMoney, roundCurrencyAmount } from '@/lib/currency';
import { getOpenTimeWindowsForDate, minutesToTime, timeToMinutes } from '@/lib/availability';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: {
    id: string;
    user: { name: string; avatarUrl?: string | null };
    specializations: string[];
    verifiedCertifications?: string[];
    verifiedResults?: any[];
    availability: any[];
    hasUsedTrialLesson?: boolean;
    pricingOptions?: any[];
    primaryPrice?: any;
    blockedDates?: any[];
    bookedSlots?: any[];
    hourlyRate?: number;
    timezone?: string | null;
  };
}

const STEPS = { TYPE: 'type', PACKAGE: 'package', SCHEDULE: 'schedule', TIME: 'time', CONFIRM: 'confirm' } as const;
const PACKAGES = [
  { sessions: 5, discount: 0.05, label: 'Starter Bundle' },
  { sessions: 10, discount: 0.1, label: 'Success Pack' },
  { sessions: 20, discount: 0.15, label: 'Elite Mastery' },
];

function slotLabel(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, 'h:mm a');
}

function getPricingOptions(tutor: BookingModalProps['tutor']) {
  if (Array.isArray(tutor.pricingOptions) && tutor.pricingOptions.length > 0) {
    return [...tutor.pricingOptions].sort((a, b) => a.durationMinutes - b.durationMinutes);
  }

  if ((tutor.hourlyRate || 0) > 0) {
    return [{
      durationMinutes: 60,
      price: tutor.hourlyRate,
      currency: tutor.primaryPrice?.originalCurrency || 'USD',
      priceDisplay: tutor.primaryPrice || null,
    }];
  }

  return [];
}

function getPackagePrice(option: any, sessions: number, discount: number) {
  const multiplier = sessions * (1 - discount);
  const displayCurrency = option?.priceDisplay?.displayCurrency || option?.currency || 'USD';
  const originalCurrency = option?.priceDisplay?.originalCurrency || option?.currency || 'USD';
  const displayAmount = roundCurrencyAmount((option?.priceDisplay?.displayAmount ?? option?.price ?? 0) * multiplier, displayCurrency);
  const originalAmount = roundCurrencyAmount((option?.price ?? 0) * multiplier, originalCurrency);

  return {
    formatted: formatMoney(displayAmount, displayCurrency),
    originalFormatted: formatMoney(originalAmount, originalCurrency),
    usesConversion: Boolean(option?.priceDisplay?.usesConversion),
  };
}

/**
 * Convert a UTC Date to wall-clock time in tutorTz.
 * Returns a Date whose .getHours()/.getDate() reflect the local time in that timezone.
 */
function utcToTutorLocal(utcDate: Date, tutorTz: string): Date {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tutorTz,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(utcDate)) {
    parts[p.type] = p.value;
  }
  const h = parseInt(parts.hour);
  return new Date(
    parseInt(parts.year),
    parseInt(parts.month) - 1,
    parseInt(parts.day),
    h === 24 ? 0 : h,
    parseInt(parts.minute),
    0,
  );
}

/**
 * Given a calendar date and a slot time string "HH:MM" that represents wall-clock
 * time in tutorTz, return the equivalent UTC Date.
 */
function tutorLocalToUTC(date: Date, slotTime: string, tutorTz: string): Date {
  const [slotHour, slotMinute] = slotTime.split(':').map(Number);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const candidateUTC = new Date(Date.UTC(year, month - 1, day, slotHour, slotMinute, 0));

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tutorTz,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(candidateUTC)) {
    parts[p.type] = p.value;
  }
  const displayedH = parseInt(parts.hour) === 24 ? 0 : parseInt(parts.hour);
  const displayedMs = Date.UTC(
    parseInt(parts.year),
    parseInt(parts.month) - 1,
    parseInt(parts.day),
    displayedH,
    parseInt(parts.minute),
  );
  const targetMs = Date.UTC(year, month - 1, day, slotHour, slotMinute);
  return new Date(candidateUTC.getTime() + (targetMs - displayedMs));
}

export default function BookingModal({ isOpen, onClose, tutor }: BookingModalProps) {
  const pricingOptions = useMemo(() => getPricingOptions(tutor), [tutor]);
  const defaultDuration = pricingOptions[0]?.durationMinutes || 60;
  const [step, setStep] = useState<(typeof STEPS)[keyof typeof STEPS]>(STEPS.TYPE);
  const [selectedType, setSelectedType] = useState<'TRIAL' | 'SINGLE' | 'PACKAGE'>('SINGLE');
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration);
  const [selectedPackage, setSelectedPackage] = useState<(typeof PACKAGES)[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedPackageSlots, setSelectedPackageSlots] = useState<Array<{ date: Date; slot: string }>>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trialUnavailable = Boolean(tutor.hasUsedTrialLesson);
  const activeDuration = selectedType === 'TRIAL' ? 30 : selectedDuration;
  const selectedPricingOption =
    pricingOptions.find((option) => option.durationMinutes === selectedDuration) || pricingOptions[0] || null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setStep(STEPS.TYPE);
    setSelectedType(trialUnavailable ? 'SINGLE' : 'SINGLE');
    setSelectedDuration(pricingOptions[0]?.durationMinutes || 60);
    setSelectedPackage(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSelectedPackageSlots([]);
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setNotes('');
  }, [isOpen, pricingOptions, trialUnavailable]);

  const daysInWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  const getSlotsForDay = (day: Date) => {
    if (isBefore(day, startOfDay(new Date()))) {
      return [];
    }

    // Compute dayOfWeek in the tutor's timezone (availability slots are keyed by tutor's dayOfWeek)
    const tutorTz = tutor.timezone || 'UTC';
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tutorTz, weekday: 'short' });
    const dayName = fmt.format(day);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const tutorDayOfWeek = weekdays.indexOf(dayName);

    // Remap availability to student's local dayOfWeek so getOpenTimeWindowsForDate matches correctly
    const localDayOfWeek = day.getDay();
    const remappedAvailability = (tutor.availability || []).map((slot: any) => ({
      ...slot,
      dayOfWeek: slot.dayOfWeek === tutorDayOfWeek ? localDayOfWeek : slot.dayOfWeek,
    }));

    // Convert booked slots from UTC to tutor-local time so getBlockedRangesForDate
    // compares dates and hours in the same timezone as the availability slots.
    const localBookedSlots = (tutor.bookedSlots || []).map((b: any) => ({
      ...b,
      scheduledAt: utcToTutorLocal(new Date(b.scheduledAt), tutorTz),
    }));

    const windows = getOpenTimeWindowsForDate({
      date: day,
      durationMinutes: activeDuration,
      availability: remappedAvailability,
      overrides: tutor.blockedDates || [],
      bookings: localBookedSlots,
    });

    const slots = new Set<string>();
    for (const window of windows) {
      let currentStart = timeToMinutes(window.startTime);
      const latestStart = timeToMinutes(window.endTime) - activeDuration;

      while (currentStart <= latestStart) {
        const time = minutesToTime(currentStart);
        if (isToday(day)) {
          const currentSlotDate = new Date(day);
          currentSlotDate.setHours(Math.floor(currentStart / 60), currentStart % 60, 0, 0);
          if (isBefore(currentSlotDate, new Date())) {
            currentStart += activeDuration;
            continue;
          }
        }

        slots.add(time);
        currentStart += activeDuration;
      }
    }

    return Array.from(slots).sort((left, right) => timeToMinutes(left) - timeToMinutes(right));
  };

  const nextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const prevWeek = () => {
    const previousWeek = subWeeks(currentWeekStart, 1);
    if (!isBefore(endOfWeek(previousWeek), new Date())) {
      setCurrentWeekStart(previousWeek);
    }
  };

  async function handleBooking() {
    if (selectedType !== 'PACKAGE' && (!selectedDate || !selectedSlot)) {
      return;
    }

    if (selectedType === 'PACKAGE' && (!selectedPackage || selectedPackageSlots.length !== selectedPackage.sessions)) {
      return;
    }

    if ((selectedType === 'SINGLE' || selectedType === 'PACKAGE') && !selectedPricingOption) {
      toast.error('This tutor has no active pricing option yet.');
      return;
    }

    setIsSubmitting(true);
    try {
      let scheduledAt: Date | null = null;
      if (selectedDate && selectedSlot) {
        const tutorTz = tutor.timezone || 'UTC';
        scheduledAt = tutorLocalToUTC(selectedDate, selectedSlot, tutorTz);
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorProfileId: tutor.id,
          scheduledAt: scheduledAt?.toISOString(),
          type: selectedType,
          durationMinutes: activeDuration,
          subject: tutor.verifiedCertifications?.[0] || tutor.specializations[0],
          notes,
          packageSessions: selectedPackage?.sessions,
          discount: selectedPackage?.discount,
          packageScheduledSlots: selectedType === 'PACKAGE'
            ? selectedPackageSlots.map(s => {
                const tutorTz = tutor.timezone || 'UTC';
                return tutorLocalToUTC(s.date, s.slot, tutorTz).toISOString();
              })
            : undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            json.error ||
              'This time slot is no longer available. Please choose a different time.'
          );
        }
        throw new Error(json.error || 'Failed to process request');
      }

      if (json.checkoutUrl) {
        toast.success('Redirecting to Stripe checkout...');
        window.location.href = json.checkoutUrl;
        return;
      }

      toast.success(selectedType === 'PACKAGE' ? 'Package purchased successfully!' : 'Booking requested successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Could not create booking');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[32px] bg-cream-100 dark:bg-navy-600 shadow-glass flex flex-col">
        <div className="p-6 border-b border-navy-100/50 dark:border-navy-500/20 flex items-center justify-between bg-white dark:bg-navy-700/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gold-100 dark:bg-navy-500 flex items-center justify-center font-bold text-navy-600 dark:text-gold-400 overflow-hidden">
              {tutor.user?.avatarUrl ? <img src={tutor.user.avatarUrl} alt={tutor.user.name} className="w-full h-full object-cover" /> : getInitials(tutor.user?.name || '')}
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">Book with {tutor.user?.name?.split(' ')[0]}</h3>
              <p className="text-sm text-navy-400 dark:text-cream-300/70">
                {selectedType === 'TRIAL' ? 'Free trial lesson • 30 minutes' : selectedType === 'PACKAGE' ? 'Package checkout' : `${activeDuration}-minute lesson`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-navy-300 hover:text-navy-600">Close</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === STEPS.TYPE && (
              <motion.div key="type" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-6">
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Choose a booking option</h2>
                  <p className="text-base text-navy-400 dark:text-cream-300/70">Times and prices are based on this tutor&apos;s actual availability and pricing setup.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button disabled={trialUnavailable} onClick={() => { if (!trialUnavailable) { setSelectedType('TRIAL'); setStep(STEPS.TIME); } }} className={`rounded-3xl border-2 p-6 text-left ${trialUnavailable ? 'opacity-50 cursor-not-allowed border-navy-100 bg-navy-50/60' : 'border-navy-100 bg-white hover:border-gold-400'}`}>
                    <div className="text-sm font-black text-gold-600">TRIAL</div>
                    <h4 className="mt-4 text-base font-bold text-navy-600 dark:text-cream-200">Free Trial</h4>
                    <p className="mt-2 text-sm text-navy-400 dark:text-cream-300/70">{trialUnavailable ? 'Already used with this tutor.' : 'Short intro lesson before a paid booking.'}</p>
                    <div className="mt-5 text-sm font-black text-gold-600">{trialUnavailable ? 'Unavailable' : 'Free • 30m'}</div>
                  </button>
                  <button onClick={() => { setSelectedType('SINGLE'); setStep(STEPS.TIME); }} className="rounded-3xl border-2 border-navy-100 bg-white hover:border-blue-400 p-6 text-left">
                    <div className="text-sm font-black text-blue-600">LIVE</div>
                    <h4 className="mt-4 text-base font-bold text-navy-600 dark:text-cream-200">Single Lesson</h4>
                    <p className="mt-2 text-sm text-navy-400 dark:text-cream-300/70">Pick one of the durations this tutor offers.</p>
                    <div className="mt-5 text-sm font-black text-blue-600">{selectedPricingOption?.priceDisplay?.formatted || tutor.primaryPrice?.formatted || 'Choose duration next'}</div>
                  </button>
                  <button onClick={() => { setSelectedType('PACKAGE'); setStep(STEPS.PACKAGE); }} className="rounded-3xl border-2 border-navy-100 bg-white hover:border-sage-400 p-6 text-left">
                    <div className="text-sm font-black text-sage-600">SAVE</div>
                    <h4 className="mt-4 text-base font-bold text-navy-600 dark:text-cream-200">Lesson Package</h4>
                    <p className="mt-2 text-sm text-navy-400 dark:text-cream-300/70">Select a duration and buy a discounted bundle.</p>
                    <div className="mt-5 text-sm font-black text-sage-600">Bundle pricing</div>
                  </button>
                </div>
              </motion.div>
            )}

            {step === STEPS.PACKAGE && (
              <motion.div key="package" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <button onClick={() => setStep(STEPS.TYPE)} className="text-[11px] font-black uppercase tracking-widest text-navy-300 hover:text-navy-600">Back</button>
                  <h2 className="text-base md:text-lg font-bold text-navy-600 dark:text-cream-200">Select package and duration</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {pricingOptions.map((option) => (
                    <button key={option.durationMinutes} onClick={() => setSelectedDuration(option.durationMinutes)} className={`px-4 py-3 rounded-2xl border text-sm font-black ${selectedDuration === option.durationMinutes ? 'border-gold-400 bg-gold-50 text-gold-700' : 'border-navy-100 bg-white text-navy-600'}`}>
                      {option.durationMinutes}m • {option.priceDisplay?.formatted || option.price}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {PACKAGES.map((pkg) => {
                    const total = getPackagePrice(selectedPricingOption, pkg.sessions, pkg.discount);
                    return (
                      <button key={pkg.sessions} onClick={() => { setSelectedPackage(pkg); setSelectedPackageSlots([]); setStep(STEPS.SCHEDULE); }} className="w-full rounded-3xl border-2 border-navy-100 bg-white hover:border-gold-400 p-6 text-left flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-navy-600 dark:text-cream-200">{pkg.sessions} Lessons</h4>
                            <span className="px-2 py-0.5 rounded-full bg-sage-100 text-[10px] font-black text-sage-600 uppercase tracking-widest">{pkg.discount * 100}% off</span>
                          </div>
                          <p className="mt-2 text-sm text-navy-300">{pkg.label} • {selectedDuration}m</p>
                          {total.usesConversion && <p className="mt-2 text-xs text-navy-300">Original total: {total.originalFormatted}</p>}
                        </div>
                        <div className="text-xl font-black text-navy-600 dark:text-cream-200">{total.formatted}</div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === STEPS.TIME && (
              <motion.div key="time" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <button onClick={() => setStep(STEPS.TYPE)} className="text-[11px] font-black uppercase tracking-widest text-navy-300 hover:text-navy-600">Back</button>
                  <div className="flex items-center gap-4">
                    <button onClick={prevWeek} className="p-1 rounded-full hover:bg-navy-50 text-navy-300">◀</button>
                    <span className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">{format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d')}</span>
                    <button onClick={nextWeek} className="p-1 rounded-full hover:bg-navy-50 text-navy-300">▶</button>
                  </div>
                </div>

                {selectedType === 'SINGLE' && pricingOptions.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {pricingOptions.map((option) => (
                      <button key={option.durationMinutes} onClick={() => { setSelectedDuration(option.durationMinutes); setSelectedDate(null); setSelectedSlot(null); }} className={`px-4 py-3 rounded-2xl border text-sm font-black ${selectedDuration === option.durationMinutes ? 'border-gold-400 bg-gold-50 text-gold-700' : 'border-navy-100 bg-white text-navy-600'}`}>
                        {option.durationMinutes}m • {option.priceDisplay?.formatted || option.price}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-7 gap-1 border-b border-navy-100/50 pb-2">
                  {daysInWeek.map((day) => (
                    <div key={day.toString()} className="text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/30">{format(day, 'EEE')}</div>
                      <div className={`mt-1 text-xs font-black w-7 h-7 flex items-center justify-center mx-auto rounded-full ${isToday(day) ? 'bg-gold-400 text-navy-600' : 'text-navy-600 dark:text-cream-200'}`}>{format(day, 'd')}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 h-[320px] overflow-y-auto pr-2 custom-scrollbar pt-2">
                  {daysInWeek.map((day) => {
                    const slots = getSlotsForDay(day);
                    return (
                      <div key={day.toString()} className="flex flex-col gap-1">
                        {slots.length > 0 ? slots.map((time) => {
                          const selected = selectedDate && isSameDay(selectedDate, day) && selectedSlot === time;
                          return (
                            <button key={time} onClick={() => { setSelectedDate(day); setSelectedSlot(time); }} className={`py-2 text-[10px] font-bold rounded-lg transition-all ${selected ? 'bg-navy-600 text-white shadow-lg' : 'bg-navy-50/50 dark:bg-navy-700/50 text-navy-400 dark:text-cream-400/40 hover:bg-gold-50 hover:text-gold-600'}`}>
                              {slotLabel(time)}
                            </button>
                          );
                        }) : <div className="h-full flex items-center justify-center opacity-10"><div className="w-px h-8 bg-navy-100" /></div>}
                      </div>
                    );
                  })}
                </div>

                <button disabled={!selectedDate || !selectedSlot} onClick={() => setStep(STEPS.CONFIRM)} className="w-full bg-navy-600 hover:bg-navy-700 disabled:bg-navy-100 disabled:text-navy-300 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all">
                  Next: Review & Confirm
                </button>
              </motion.div>
            )}

            {step === STEPS.SCHEDULE && selectedPackage && (
              <motion.div key="schedule" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <button onClick={() => setStep(STEPS.PACKAGE)} className="text-[11px] font-black uppercase tracking-widest text-navy-300 hover:text-navy-600">Back</button>
                  <div className="flex items-center gap-4">
                    <button onClick={prevWeek} className="p-1 rounded-full hover:bg-navy-50 text-navy-300">◀</button>
                    <span className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">{format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d')}</span>
                    <button onClick={nextWeek} className="p-1 rounded-full hover:bg-navy-50 text-navy-300">▶</button>
                  </div>
                </div>

                <div className="rounded-2xl bg-navy-50/60 dark:bg-navy-700/30 p-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-600 dark:text-cream-200">Select {selectedPackage.sessions} slots</span>
                  <span className={`text-xs font-black ${selectedPackageSlots.length === selectedPackage.sessions ? 'text-sage-600' : 'text-gold-600'}`}>
                    {selectedPackageSlots.length} / {selectedPackage.sessions} chosen
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1 border-b border-navy-100/50 pb-2">
                  {daysInWeek.map((day) => (
                    <div key={day.toString()} className="text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/30">{format(day, 'EEE')}</div>
                      <div className={`mt-1 text-xs font-black w-7 h-7 flex items-center justify-center mx-auto rounded-full ${isToday(day) ? 'bg-gold-400 text-navy-600' : 'text-navy-600 dark:text-cream-200'}`}>{format(day, 'd')}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 h-[320px] overflow-y-auto pr-2 custom-scrollbar pt-2">
                  {daysInWeek.map((day) => {
                    const slots = getSlotsForDay(day);
                    return (
                      <div key={day.toString()} className="flex flex-col gap-1">
                        {slots.length > 0 ? slots.map((time) => {
                          const isSelected = selectedPackageSlots.some(s => isSameDay(s.date, day) && s.slot === time);
                          const isMaxReached = selectedPackageSlots.length >= selectedPackage.sessions && !isSelected;
                          return (
                            <button
                              key={time}
                              disabled={isMaxReached}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedPackageSlots(prev => prev.filter(s => !(isSameDay(s.date, day) && s.slot === time)));
                                } else if (selectedPackageSlots.length < selectedPackage.sessions) {
                                  setSelectedPackageSlots(prev => [...prev, { date: day, slot: time }]);
                                }
                              }}
                              className={`py-2 text-[10px] font-bold rounded-lg transition-all ${isSelected ? 'bg-sage-500 text-white shadow-lg' : isMaxReached ? 'opacity-30 cursor-not-allowed bg-navy-50/30 text-navy-300' : 'bg-navy-50/50 dark:bg-navy-700/50 text-navy-400 dark:text-cream-400/40 hover:bg-gold-50 hover:text-gold-600'}`}
                            >
                              {slotLabel(time)}
                            </button>
                          );
                        }) : <div className="h-full flex items-center justify-center opacity-10"><div className="w-px h-8 bg-navy-100" /></div>}
                      </div>
                    );
                  })}
                </div>

                {selectedPackageSlots.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-navy-300 ml-1">Selected sessions</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPackageSlots.map((s, i) => (
                        <span key={`${s.date.toISOString()}-${s.slot}`} className="px-3 py-1.5 rounded-xl bg-sage-50 dark:bg-sage-500/10 text-[10px] font-black text-sage-700 dark:text-sage-300 border border-sage-200/70">
                          {format(s.date, 'MMM d')} {slotLabel(s.slot)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  disabled={selectedPackageSlots.length !== selectedPackage.sessions}
                  onClick={() => setStep(STEPS.CONFIRM)}
                  className="w-full bg-navy-600 hover:bg-navy-700 disabled:bg-navy-100 disabled:text-navy-300 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all"
                >
                  {selectedPackageSlots.length === selectedPackage.sessions ? 'Next: Review & Confirm' : `Select ${selectedPackage.sessions - selectedPackageSlots.length} more slot(s)`}
                </button>
              </motion.div>
            )}

            {step === STEPS.CONFIRM && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-6">
                <div className="rounded-3xl border border-navy-100/60 bg-white dark:bg-navy-700/30 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Booking Summary</h3>
                    <button onClick={() => setStep(selectedType === 'PACKAGE' ? STEPS.SCHEDULE : STEPS.TIME)} className="text-[10px] font-bold text-navy-400 hover:text-navy-600 underline">Change</button>
                  </div>
                  <div className="mt-5 space-y-4 text-sm">
                    {selectedType !== 'PACKAGE' ? (
                      <div className="flex justify-between gap-4">
                        <span className="text-navy-400 dark:text-cream-400/60">Date & Time</span>
                        <span className="text-right font-bold text-navy-600 dark:text-cream-200">{selectedDate && format(selectedDate, 'EEEE, MMM d')} at {selectedSlot ? slotLabel(selectedSlot) : ''}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between gap-4">
                          <span className="text-navy-400 dark:text-cream-400/60">Package</span>
                          <span className="text-right font-bold text-navy-600 dark:text-cream-200">{selectedPackage?.sessions} lessons • {selectedDuration}m each</span>
                        </div>
                        {selectedPackageSlots.length > 0 && (
                          <div className="pl-2 space-y-1">
                            {selectedPackageSlots.map((s, i) => (
                              <div key={`${s.date.toISOString()}-${s.slot}`} className="flex justify-between text-xs">
                                <span className="text-navy-300">Session {i + 1}</span>
                                <span className="font-bold text-navy-500 dark:text-cream-300">{format(s.date, 'EEE, MMM d')} at {slotLabel(s.slot)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <span className="text-navy-400 dark:text-cream-400/60">Session Type</span>
                      <span className="text-right font-bold text-navy-600 dark:text-cream-200">{selectedType === 'TRIAL' ? 'Free Trial (30m)' : selectedType === 'PACKAGE' ? 'Lesson Package' : `Single Lesson (${selectedDuration}m)`}</span>
                    </div>
                    <div className="pt-4 border-t border-navy-100/50 flex justify-between gap-4">
                      <span className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Total Price</span>
                      <div className="text-right">
                        <div className="text-2xl font-display font-black text-gold-600">
                          {selectedType === 'TRIAL'
                            ? 'Free'
                            : selectedType === 'PACKAGE'
                              ? getPackagePrice(selectedPricingOption, selectedPackage?.sessions || 0, selectedPackage?.discount || 0).formatted
                              : selectedPricingOption?.priceDisplay?.formatted || selectedPricingOption?.price || 'N/A'}
                        </div>
                        {selectedType !== 'TRIAL' && selectedPricingOption?.priceDisplay?.usesConversion && (
                          <p className="text-xs font-bold text-navy-300 mt-1">
                            Original: {selectedType === 'PACKAGE'
                              ? getPackagePrice(selectedPricingOption, selectedPackage?.sessions || 0, selectedPackage?.discount || 0).originalFormatted
                              : selectedPricingOption.priceDisplay.originalFormatted}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/60 ml-1">Notes for {tutor.user.name.split(' ')[0]} (optional)</label>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What would you like to focus on during this session?" className="w-full bg-white dark:bg-navy-700 border-2 border-navy-100 dark:border-navy-500/20 rounded-2xl p-4 text-sm text-navy-600 dark:text-cream-200 focus:border-gold-400 outline-none transition-all resize-none h-24" />
                </div>

                <button disabled={isSubmitting} onClick={handleBooking} className="w-full bg-gold-400 hover:bg-gold-500 disabled:bg-navy-100 text-navy-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-gold transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <div className="w-4 h-4 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" /> : null}
                  Confirm Booking
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
