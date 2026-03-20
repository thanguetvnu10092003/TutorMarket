'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isBefore, 
  startOfDay,
  parse,
  addWeeks,
  subWeeks,
  isToday
} from 'date-fns';
import { formatCurrency, getInitials } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: {
    id: string;
    user: {
      name: string;
      avatarUrl?: string | null;
    };
    hourlyRate: number;
    specializations: string[];
    verifiedCertifications?: string[];
    availability: any[];
    timezone: string;
  };
}

const STEPS = {
  TYPE: 'type',
  PACKAGE_SELECT: 'package_select',
  TIME: 'time',
  CONFIRM: 'confirm',
};

const PACKAGES = [
    { sessions: 5, discount: 0.05, label: 'Starter Bundle' },
    { sessions: 10, discount: 0.10, label: 'Success Pack' },
    { sessions: 20, discount: 0.15, label: 'Elite Mastery' },
];

export default function BookingModal({ isOpen, onClose, tutor }: BookingModalProps) {
  const [step, setStep] = useState(STEPS.TYPE);
  const [selectedType, setSelectedType] = useState<'TRIAL' | 'SINGLE' | 'PACKAGE'>('SINGLE');
  const [selectedPackage, setSelectedPackage] = useState<typeof PACKAGES[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null); // "HH:mm"
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep(STEPS.TYPE);
      setSelectedDate(null);
      setSelectedSlot(null);
      setSelectedPackage(null);
    }
  }, [isOpen]);

  const daysInWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  const nextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const prevWeek = () => {
    const prev = subWeeks(currentWeekStart, 1);
    if (!isBefore(endOfWeek(prev), new Date())) {
        setCurrentWeekStart(prev);
    }
  };

  const handleBooking = async () => {
    if (selectedType !== 'PACKAGE' && (!selectedDate || !selectedSlot)) return;
    if (selectedType === 'PACKAGE' && !selectedPackage) return;

    setIsSubmitting(true);
    try {
      let scheduledAt = null;
      if (selectedDate && selectedSlot) {
        scheduledAt = new Date(selectedDate);
        const [hours, minutes] = selectedSlot.split(':').map(Number);
        scheduledAt.setHours(hours, minutes, 0, 0);
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorProfileId: tutor.id,
          scheduledAt: scheduledAt?.toISOString(),
          type: selectedType,
          subject: tutor.verifiedCertifications?.[0] || tutor.specializations[0],
          notes,
          packageSessions: selectedPackage?.sessions,
          discount: selectedPackage?.discount
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(selectedType === 'PACKAGE' ? 'Package purchased successfully!' : 'Booking requested successfully!');
        onClose();
      } else {
        throw new Error(data.error || 'Failed to process request');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-cream-100 dark:bg-navy-600 rounded-[32px] shadow-glass overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-navy-100/50 dark:border-navy-500/20 flex items-center justify-between bg-white dark:bg-navy-700/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gold-100 dark:bg-navy-500 flex items-center justify-center font-bold text-navy-600 dark:text-gold-400 overflow-hidden">
                {tutor.user?.avatarUrl ? (
                    <img src={tutor.user.avatarUrl} alt={tutor.user.name} className="w-full h-full object-cover" />
                ) : (
                    getInitials(tutor.user?.name || '')
                )}
             </div>
             <div>
                <h3 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest leading-none">Book with {tutor.user?.name?.split(' ')[0]}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                   <p className="text-[10px] font-bold text-navy-300 dark:text-cream-400/40 uppercase tracking-widest">
                       {selectedType === 'TRIAL' ? 'Free Trial Lesson (30m)' : selectedType === 'PACKAGE' ? 'Multi-Lesson Package' : 'Regular Session (60m)'}
                   </p>
                   {tutor.verifiedCertifications?.map(cert => (
                       <span key={cert} className="text-[8px] font-black text-blue-500 bg-blue-50 px-1 rounded uppercase tracking-tighter">
                           {cert} Verified
                       </span>
                   ))}
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-navy-50 dark:hover:bg-navy-500 rounded-full transition-colors text-navy-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
           <AnimatePresence mode="wait">
              {step === STEPS.TYPE && (
                <motion.div
                    key="step-type"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                >
                    <div className="text-center space-y-2 mb-8">
                        <h2 className="text-xl font-display font-bold text-navy-600 dark:text-cream-200">How would you like to start?</h2>
                        <p className="text-sm text-navy-400 dark:text-cream-300/60">Choose your lesson type to see available slots.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button 
                            onClick={() => { setSelectedType('TRIAL'); setStep(STEPS.TIME); }}
                            className="group p-5 rounded-3xl border-2 border-navy-100 dark:border-navy-500/20 hover:border-gold-400 dark:hover:border-gold-500/50 bg-white dark:bg-navy-700/30 text-left transition-all hover:shadow-gold-sm"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center text-lg mb-4 group-hover:scale-110 transition-transform">🎁</div>
                            <h4 className="font-bold text-navy-600 dark:text-cream-200 text-sm">Free Trial</h4>
                            <p className="text-[10px] text-navy-400 dark:text-cream-300/60 mt-1">30m intro.</p>
                            <div className="mt-4 text-[9px] font-black text-gold-600 uppercase tracking-widest">$0</div>
                        </button>

                        <button 
                            onClick={() => { setSelectedType('SINGLE'); setStep(STEPS.TIME); }}
                            className="group p-5 rounded-3xl border-2 border-navy-100 dark:border-navy-500/20 hover:border-blue-400 dark:hover:border-blue-500/50 bg-white dark:bg-navy-700/30 text-left transition-all hover:shadow-blue-sm"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-lg mb-4 group-hover:scale-110 transition-transform">📚</div>
                            <h4 className="font-bold text-navy-600 dark:text-cream-200 text-sm">Single Lesson</h4>
                            <p className="text-[10px] text-navy-400 dark:text-cream-300/60 mt-1">60m session.</p>
                            <div className="mt-4 text-[9px] font-black text-blue-600 uppercase tracking-widest">{formatCurrency(tutor.hourlyRate)}</div>
                        </button>

                        <button 
                            onClick={() => { setSelectedType('PACKAGE'); setStep(STEPS.PACKAGE_SELECT); }}
                            className="group p-5 rounded-3xl border-2 border-navy-100 dark:border-navy-500/20 hover:border-sage-400 dark:hover:border-sage-500/50 bg-white dark:bg-navy-700/30 text-left transition-all hover:shadow-sage-sm"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-sage-50 dark:bg-sage-500/10 flex items-center justify-center text-lg mb-4 group-hover:scale-110 transition-transform">💎</div>
                            <h4 className="font-bold text-navy-600 dark:text-cream-200 text-sm">Packages</h4>
                            <p className="text-[10px] text-navy-400 dark:text-cream-300/60 mt-1">Save up to 15%.</p>
                            <div className="mt-4 text-[9px] font-black text-sage-600 uppercase tracking-widest">BEST VALUE</div>
                        </button>
                    </div>

                    <div className="pt-8 text-center">
                        <p className="text-[10px] font-bold text-navy-300 dark:text-cream-400/40 uppercase tracking-widest leading-relaxed px-8">
                            UNSURE? BOOK A TRIAL FIRST. WE GUARANTEE 100% SATISFACTION OR YOUR MONEY BACK.
                        </p>
                    </div>
                </motion.div>
              )}

              {step === STEPS.PACKAGE_SELECT && (
                <motion.div
                    key="step-package"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setStep(STEPS.TYPE)} className="text-[10px] font-black uppercase tracking-widest text-navy-300 hover:text-navy-600 flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg> BACK
                        </button>
                        <h2 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Select your package</h2>
                    </div>

                    <div className="space-y-3">
                        {PACKAGES.map((pkg) => {
                            const totalPrice = (tutor.hourlyRate * pkg.sessions) * (1 - pkg.discount);
                            const perSession = totalPrice / pkg.sessions;
                            
                            return (
                                <button 
                                    key={pkg.sessions}
                                    onClick={() => { setSelectedPackage(pkg); setStep(STEPS.CONFIRM); }}
                                    className="w-full group p-6 rounded-3xl border-2 border-navy-100 dark:border-navy-500/20 hover:border-gold-400 bg-white dark:bg-navy-700/30 flex items-center justify-between transition-all hover:shadow-lg"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-navy-600 dark:text-cream-200">{pkg.sessions} Lessons</h4>
                                            <span className="px-2 py-0.5 rounded-full bg-sage-100 text-[9px] font-black text-sage-600 uppercase tracking-widest">{pkg.discount * 100}% OFF</span>
                                        </div>
                                        <p className="text-xs text-navy-300 mt-1">{pkg.label} • {formatCurrency(perSession)}/session</p>
                                    </div>
                                    <div className="text-xl font-black text-navy-600 dark:text-cream-200">
                                        {formatCurrency(totalPrice)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
              )}

              {step === STEPS.TIME && (
                <motion.div
                    key="step-time"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                >
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={() => setStep(STEPS.TYPE)} className="text-[10px] font-black uppercase tracking-widest text-navy-300 hover:text-navy-600 flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg> BACK
                        </button>
                        <div className="flex items-center gap-4">
                            <button onClick={prevWeek} className="p-1 rounded-full hover:bg-navy-50 text-navy-300"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg></button>
                            <span className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">{format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d')}</span>
                            <button onClick={nextWeek} className="p-1 rounded-full hover:bg-navy-50 text-navy-300"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 border-b border-navy-100/50 pb-2">
                        {daysInWeek.map((day) => (
                            <div key={day.toString()} className="text-center">
                                <div className="text-[9px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/30">{format(day, 'EEE')}</div>
                                <div className={`mt-1 text-xs font-black w-7 h-7 flex items-center justify-center mx-auto rounded-full ${isToday(day) ? 'bg-gold-400 text-navy-600' : 'text-navy-600 dark:text-cream-200'}`}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 h-[300px] overflow-y-auto pr-2 custom-scrollbar pt-2">
                        {daysInWeek.map((day) => {
                            const dayOfWeek = day.getDay();
                            const dayAvailability = tutor.availability?.filter(a => a.dayOfWeek === dayOfWeek) || [];
                            
                            // Generate hourly slots for each availability range
                            const slots: string[] = [];
                            dayAvailability.forEach((range: any) => {
                                const startHour = parseInt(range.startTime.split(':')[0]);
                                const endHour = parseInt(range.endTime.split(':')[0]);
                                for (let h = startHour; h < endHour; h++) {
                                    slots.push(`${h < 10 ? '0' : ''}${h}:00`);
                                }
                            });
                            
                            return (
                                <div key={day.toString()} className="flex flex-col gap-1">
                                    {slots.length > 0 && !isBefore(day, startOfDay(new Date())) ? (
                                        slots.map((time) => {
                                            const isSelected = selectedDate && isSameDay(selectedDate, day) && selectedSlot === time;
                                            
                                            // Don't show past slots for today
                                            if (isToday(day)) {
                                                const slotTime = parse(time, 'HH:mm', new Date());
                                                if (isBefore(slotTime, new Date())) return null;
                                            }

                                            return (
                                                <button 
                                                    key={time}
                                                    onClick={() => { setSelectedDate(day); setSelectedSlot(time); }}
                                                    className={`py-2 text-[10px] font-bold rounded-lg transition-all ${
                                                        isSelected 
                                                            ? 'bg-navy-600 text-white shadow-lg' 
                                                            : 'bg-navy-50/50 dark:bg-navy-700/50 text-navy-400 dark:text-cream-400/40 hover:bg-gold-50 hover:text-gold-600'
                                                    }`}
                                                >
                                                    {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="h-full flex items-center justify-center opacity-10">
                                            <div className="w-px h-8 bg-navy-100" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-navy-100/50">
                        <button 
                            disabled={!selectedDate || !selectedSlot}
                            onClick={() => setStep(STEPS.CONFIRM)}
                            className="flex-1 bg-navy-600 hover:bg-navy-700 disabled:bg-navy-100 disabled:text-navy-300 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all"
                        >
                            Next: Review & Confirm
                        </button>
                    </div>
                </motion.div>
              )}

              {step === STEPS.CONFIRM && (
                <motion.div
                    key="step-confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                >
                      <div className="glass-card p-6 bg-cream-50 dark:bg-navy-700/30">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Booking Summary</h3>
                            <button onClick={() => setStep(selectedType === 'PACKAGE' ? STEPS.PACKAGE_SELECT : STEPS.TIME)} className="text-[10px] font-bold text-navy-400 hover:text-navy-600 underline">Change</button>
                        </div>
                        <div className="space-y-4">
                            {selectedType !== 'PACKAGE' ? (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-navy-400 dark:text-cream-400/60 font-medium">Date & Time</span>
                                    <span className="text-navy-600 dark:text-cream-200 font-bold">
                                        {selectedDate && format(selectedDate, 'EEEE, MMM d')} at {selectedSlot ? format(parse(selectedSlot, 'HH:mm', new Date()), 'h:mm a') : ''}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-navy-400 dark:text-cream-400/60 font-medium">Package Details</span>
                                    <span className="text-navy-600 dark:text-cream-200 font-bold">{selectedPackage?.sessions} Lessons included</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-navy-400 dark:text-cream-400/60 font-medium">Session Type</span>
                                <span className="text-navy-600 dark:text-cream-200 font-bold">
                                    {selectedType === 'TRIAL' ? 'Free Trial (30m)' : selectedType === 'PACKAGE' ? 'Multi-Lesson Bundle' : 'Regular Lesson (60m)'}
                                </span>
                            </div>
                            <div className="pt-4 border-t border-navy-100/50 flex justify-between items-center">
                                <span className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">Total Price</span>
                                <span className="text-2xl font-display font-black text-gold-600">
                                    {selectedType === 'TRIAL' 
                                        ? '$0.00' 
                                        : selectedType === 'PACKAGE' 
                                            ? formatCurrency((tutor.hourlyRate * (selectedPackage?.sessions || 0)) * (1 - (selectedPackage?.discount || 0)))
                                            : formatCurrency(tutor.hourlyRate)
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/60 ml-1">Notes for {tutor.user.name.split(' ')[0]} (Optional)</label>
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="What would you like to focus on during this session?"
                            className="w-full bg-white dark:bg-navy-700 border-2 border-navy-100 dark:border-navy-500/20 rounded-2xl p-4 text-sm text-navy-600 dark:text-cream-200 focus:border-gold-400 outline-none transition-all resize-none h-24"
                        />
                    </div>

                    <div className="pt-4">
                        <p className="text-[10px] text-center text-navy-300 dark:text-cream-400/40 mb-4 px-8 leading-relaxed">
                            BY CLICKING CONFIRM, YOU AGREE TO OUR <span className="text-navy-400 dark:text-cream-200">CANCELLATION POLICY</span>. TRIAL SESSIONS CAN BE CANCELLED UP TO 12 HOURS BEFORE START.
                        </p>
                        <button 
                            disabled={isSubmitting}
                            onClick={handleBooking}
                            className="w-full bg-gold-400 hover:bg-gold-500 disabled:bg-navy-100 text-navy-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-gold transition-all flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
                            ) : null}
                            Confirm Booking
                        </button>
                    </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
