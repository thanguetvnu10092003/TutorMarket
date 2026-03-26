'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const SUBJECTS = [
  { id: 'GMAT', label: 'GMAT', icon: '📊' },
  { id: 'GRE', label: 'GRE', icon: '📝' },
  { id: 'CFA_LEVEL_1', label: 'CFA Level 1', icon: '📈' },
  { id: 'CFA_LEVEL_2', label: 'CFA Level 2', icon: '📉' },
  { id: 'CFA_LEVEL_3', label: 'CFA Level 3', icon: '🏛️' },
];

export default function StudentOnboardingSurvey() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [examDates, setExamDates] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleSubject = (id: string) => {
    setSelectedSubjects(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleExamDateChange = (subjectId: string, date: string) => {
    setExamDates(prev => ({ ...prev, [subjectId]: date }));
  };

  const handleSubmit = async () => {
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/student/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSubjects: selectedSubjects,
          examDates,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) throw new Error('Failed to save preferences');

      toast.success('Welcome to TutorMarket!');
      router.push('/tutors');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white dark:bg-navy-700 rounded-3xl p-8 shadow-glass border border-white/20">
        {/* Progress Bar */}
        <div className="w-full bg-cream-200 dark:bg-navy-600 h-2 rounded-full mb-8">
          <motion.div 
            className="h-full bg-gold-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200 mb-2">
                What are you studying for?
              </h2>
              <p className="text-navy-300 dark:text-cream-400/60 mb-8">
                Select the exams you&apos;re planning to take. We&apos;ll help find the best tutors for you.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SUBJECTS.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => handleToggleSubject(subject.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      selectedSubjects.includes(subject.id)
                        ? 'border-gold-500 bg-gold-50 dark:bg-gold-500/10'
                        : 'border-cream-300 dark:border-navy-500 hover:border-gold-300'
                    }`}
                  >
                    <span className="text-2xl">{subject.icon}</span>
                    <span className="font-semibold text-navy-600 dark:text-cream-200">
                      {subject.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-10 flex justify-between items-center">
                <button 
                  onClick={() => router.push('/tutors')}
                  className="text-sm font-semibold text-navy-300 hover:text-navy-400"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedSubjects.length === 0}
                  className="btn-primary px-8 py-3 disabled:opacity-50"
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200 mb-2">
                When is your exam?
              </h2>
              <p className="text-navy-300 dark:text-cream-400/60 mb-8">
                This helps us track your progress and send timely reminders.
              </p>

              <div className="space-y-6">
                {selectedSubjects.map((subjectId) => {
                  const subject = SUBJECTS.find(s => s.id === subjectId);
                  return (
                    <div key={subjectId} className="space-y-2">
                      <label className="block text-sm font-bold text-navy-600 dark:text-cream-300">
                        {subject?.label} Exam Date
                      </label>
                      <input
                        type="month"
                        value={examDates[subjectId] || ''}
                        onChange={(e) => handleExamDateChange(subjectId, e.target.value)}
                        className="input-field"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 flex justify-between items-center">
                <button 
                  onClick={() => setStep(1)}
                  className="text-sm font-semibold text-navy-300 hover:text-navy-400"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-primary px-8 py-3 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Complete Setup'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
