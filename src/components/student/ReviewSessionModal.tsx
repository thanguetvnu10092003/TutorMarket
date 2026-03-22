'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface ReviewSessionModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function ReviewSessionModal({ booking, isOpen, onClose, onSubmitted }: ReviewSessionModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          rating,
          comment,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to submit review');
      }

      toast.success('Review submitted');
      setComment('');
      setRating(5);
      onClose();
      onSubmitted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="relative w-full max-w-xl rounded-[32px] border border-white/20 bg-white shadow-2xl dark:bg-navy-800"
          >
            <div className="border-b border-navy-100/50 px-8 py-6 dark:border-navy-500/20">
              <h2 className="text-2xl font-display font-black text-navy-600 dark:text-cream-200">Write a Review</h2>
              <p className="mt-2 text-sm text-navy-400 dark:text-cream-300/70">
                Share feedback about your lesson with {booking.tutorProfile.user.name}.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-8 py-8">
              <div>
                <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">
                  Rating
                </label>
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const starValue = index + 1;
                    const isActive = starValue <= rating;

                    return (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setRating(starValue)}
                        className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                          isActive
                            ? 'bg-gold-400 text-navy-600'
                            : 'bg-navy-50 text-navy-400 dark:bg-navy-700 dark:text-cream-300/70'
                        }`}
                      >
                        {starValue} Star
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-navy-300 dark:text-cream-400/40">
                  Review
                </label>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="What went well in the session? What should other students know?"
                  className="min-h-[140px] w-full rounded-2xl border-2 border-navy-100 bg-navy-50/40 p-4 text-sm text-navy-600 outline-none transition-all focus:border-gold-400 dark:border-navy-500/20 dark:bg-navy-900/30 dark:text-cream-200"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-navy-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-navy-500 dark:border-navy-500/20 dark:text-cream-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-gold-400 px-5 py-3 text-xs font-black uppercase tracking-widest text-navy-600 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
