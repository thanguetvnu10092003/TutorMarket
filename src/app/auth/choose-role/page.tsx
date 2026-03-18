'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

export default function ChooseRolePage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = async (selectedRole: 'STUDENT' | 'TUTOR') => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/choose-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }

      // Update local session
      await update({ 
        role: selectedRole, 
        hasChosenRole: true,
        ...(selectedRole === 'TUTOR' ? { onboardingCompleted: false } : {})
      });
      
      toast.success(`You are now registered as a ${selectedRole.toLowerCase()}!`);
      router.push(`/dashboard/${selectedRole.toLowerCase()}`);
      router.refresh();
      
    } catch (error: any) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-200 dark:bg-navy-600 px-4 py-20">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200 mb-2">
          One Last Step, {session?.user?.name?.split(' ')[0] || 'There'}!
        </h1>
        <p className="text-navy-300 dark:text-cream-400/60 mb-10 max-w-sm mx-auto">
          Please choose how you want to use the platform. Are you here to learn or to teach?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Student Choice */}
          <button
            onClick={() => handleRoleSelect('STUDENT')}
            disabled={isLoading}
            className="glass-card p-8 text-center group hover:border-gold-400 transition-all duration-300 hover:shadow-gold-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 rounded-2xl bg-cream-100 dark:bg-navy-500 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-glass">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold-500">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-3">I want to Learn</h3>
            <p className="text-sm text-navy-300 dark:text-cream-400/60 mb-8">Access top-tier tutors, schedule sessions, and achieve your learning goals.</p>
            <span className="btn-primary py-3 px-6 text-sm mx-auto block w-fit">Join as Student</span>
          </button>

          {/* Tutor Choice */}
          <button
            onClick={() => handleRoleSelect('TUTOR')}
            disabled={isLoading}
            className="glass-card p-8 text-center group hover:border-sage-400 transition-all duration-300 hover:shadow-sage disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 rounded-2xl bg-cream-100 dark:bg-navy-500 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-glass">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sage-500">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-3">I want to Teach</h3>
            <p className="text-sm text-navy-300 dark:text-cream-400/60 mb-8">Set your rates, share your expertise globally, and build your tutoring business.</p>
            <span className="bg-sage-600 hover:bg-sage-700 text-white py-3 px-6 rounded-xl text-sm font-bold shadow-sage transition-all mx-auto block w-fit">Join as Tutor</span>
          </button>
        </div>
      </div>
    </div>
  );
}
