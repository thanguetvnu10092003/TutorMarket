'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

interface ContinueLearningPromptProps {
  bookings: any[];
  packages: any[];
}

export default function ContinueLearningPrompt({ bookings, packages }: ContinueLearningPromptProps) {
  // 1. Check for completed trials without paid sessions
  const completedTrials = bookings.filter(b => b.type === 'TRIAL' && b.status === 'COMPLETED');
  
  const prompts = completedTrials.map(trial => {
      // Check if there are any paid (non-trial) bookings with this tutor
      const hasPaidBooking = bookings.some(b => 
          b.tutorProfileId === trial.tutorProfileId && 
          b.type !== 'TRIAL' && 
          b.status !== 'CANCELLED'
      );
      
      const hasActivePackage = packages.some(p => p.tutorProfileId === trial.tutorProfileId && p.sessionsRemaining > 0);

      if (!hasPaidBooking && !hasActivePackage) {
          return {
              type: 'TRIAL_FOLLOWUP',
              tutor: trial.tutorProfile.user,
              tutorId: trial.tutorProfileId,
              message: `How was your trial with ${trial.tutorProfile.user.name.split(' ')[0]}? Keep the momentum going!`,
              cta: 'Book Next Lesson',
              link: `/tutors/${trial.tutorProfileId}`
          };
      }
      return null;
  }).filter(Boolean);

  // 2. Check for low package sessions
  const lowPackages = packages.filter(p => p.sessionsRemaining <= 2).map(pkg => ({
      type: 'LOW_PACKAGE',
      tutor: pkg.tutorProfile.user,
      tutorId: pkg.tutorProfileId,
      message: `You have ${pkg.sessionsRemaining} sessions left with ${pkg.tutorProfile.user.name.split(' ')[0]}. Top up now for a discount!`,
      cta: 'Buy Package',
      link: `/tutors/${pkg.tutorProfileId}`
  }));

  const allPrompts = [...prompts, ...lowPackages];

  if (allPrompts.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black text-navy-300 dark:text-cream-400/40 uppercase tracking-widest ml-1">Continue Learning</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allPrompts.slice(0, 2).map((prompt: any, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 bg-gradient-to-br from-gold-50/50 to-cream-50/50 dark:from-navy-700/50 dark:to-navy-800/50 border-gold-200/30 shadow-gold-sm flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-gold-400/10 flex items-center justify-center text-xl">
                  {prompt.type === 'TRIAL_FOLLOWUP' ? '⭐' : '🔋'}
               </div>
               <div>
                  <p className="text-xs font-bold text-navy-600 dark:text-cream-200 leading-relaxed max-w-[200px] line-clamp-2">
                    {prompt.message}
                  </p>
                  <Link 
                    href={prompt.link}
                    className="mt-2 inline-block text-[10px] font-black text-gold-600 dark:text-gold-400 uppercase tracking-widest hover:underline"
                  >
                    {prompt.cta} →
                  </Link>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
