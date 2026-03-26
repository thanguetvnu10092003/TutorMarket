'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface ReportIssueModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportIssueModal({ booking, isOpen, onClose }: ReportIssueModalProps) {
  const [type, setType] = useState('NO_SHOW_TUTOR');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.length < 10) {
        toast.error('Please provide more details.');
        return;
    }

    setIsSubmitting(true);
    try {
        const res = await fetch(`/api/bookings/${booking.id}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, description }),
        });

        if (res.ok) {
            toast.success('Your report has been submitted. Our team will review it shortly.');
            onClose();
            setDescription('');
        } else {
            const err = await res.json();
            toast.error(err.error || 'Failed to submit report.');
        }
    } catch (error) {
        toast.error('Something went wrong.');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-navy-800 rounded-[32px] shadow-2xl overflow-hidden border border-white/20"
          >
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-display font-black text-navy-600 dark:text-cream-200">Report an Issue</h2>
                        <p className="text-xs font-bold text-navy-300 dark:text-cream-400/40 uppercase tracking-widest mt-1">Booking with {booking.tutorProfile.user.name}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-navy-50 dark:bg-navy-700 flex items-center justify-center text-navy-400 hover:text-navy-600 transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-navy-300 dark:text-cream-400/40 uppercase tracking-widest mb-2 block">Issue Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: 'NO_SHOW_TUTOR', label: 'Lesson Issue' },
                              { value: 'TECHNICAL_ISSUE', label: 'Technical Issue' },
                              { value: 'INAPPROPRIATE_CONDUCT', label: 'Misconduct' },
                              { value: 'PAYMENT_DISPUTE', label: 'Payment Issue' },
                            ].map(({ value: t, label }) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                                        type === t
                                            ? 'bg-navy-600 border-navy-600 text-white shadow-lg'
                                            : 'border-navy-100 dark:border-navy-700 text-navy-400 hover:border-navy-200'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-navy-300 dark:text-cream-400/40 uppercase tracking-widest mb-2 block">Tell us what happened</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Please describe the issue in detail..."
                            className="w-full bg-navy-50/50 dark:bg-navy-900/50 border-2 border-navy-100 dark:border-navy-700 rounded-2xl p-4 text-sm focus:border-gold-400 outline-none transition-all min-h-[120px]"
                            required
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            disabled={isSubmitting}
                            type="submit"
                            className="w-full btn-primary py-4 font-black tracking-widest uppercase disabled:opacity-50"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                        <p className="text-[10px] text-center text-navy-300 dark:text-cream-400/40 font-bold mt-4 uppercase tracking-widest">Reports are reviewed within 24 hours.</p>
                    </div>
                </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
