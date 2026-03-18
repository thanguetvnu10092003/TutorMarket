'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import PasswordInput from '@/components/ui/PasswordInput';

export default function SetPasswordPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If user already has a password, redirect them away
  if (session?.user && (session.user as any).hasPassword) {
    if ((session.user as any).hasChosenRole === false) {
      router.push('/auth/choose-role');
    } else {
      const role = (session.user as any).role;
      router.push(`/dashboard/${role?.toLowerCase() || 'student'}`);
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Password set successfully!');
        
        // Update the session to reflect that the user now has a password
        await update({ hasPassword: true });
        
        // Redirect to choose role if needed, else to dashboard
        if ((session?.user as any).hasChosenRole === false) {
          router.push('/auth/choose-role');
        } else {
          const role = (session?.user as any).role;
          router.push(`/dashboard/${role?.toLowerCase() || 'student'}`);
        }
      } else {
        toast.error(data.error || 'Failed to set password');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 shadow-glass-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gold-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-gold">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-navy-600">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Set Your Password</h1>
            <p className="text-sm text-navy-300 dark:text-cream-400/60 mt-2">
              Since this is your first time logging in with Google, please set a password to enable manual login later.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <PasswordInput
              label="New Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <PasswordInput
              label="Confirm Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-navy-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
