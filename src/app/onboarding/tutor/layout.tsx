import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');
  if ((session.user as any).role !== 'TUTOR') redirect('/dashboard/student');

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 to-cream-200 dark:from-navy-700 dark:to-navy-800">
      {/* Brand header */}
      <div className="border-b border-navy-100 dark:border-navy-500/30 bg-white/70 dark:bg-navy-600/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-display font-bold text-xl text-navy-600 dark:text-cream-200">
            Prep<span className="text-gold-400">Pass</span>
          </span>
          <span className="text-sm text-navy-300 dark:text-cream-400/50">Setting up your tutor profile</span>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
