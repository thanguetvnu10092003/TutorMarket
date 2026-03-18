'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import PasswordInput from '@/components/ui/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'ADMIN_NOT_VERIFIED') {
          throw new Error('Your Admin account is pending email verification. Please check your inbox.');
        }
        throw new Error('Invalid email or password');
      }

      toast.success('Signed in successfully!');
      
      // Get the session to determine the user's role
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      
      const role = (session?.user as any)?.role;
      router.push(`/dashboard/${role?.toLowerCase() || 'student'}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-200 dark:bg-navy-600 pt-20 pb-16 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy-600">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/>
              </svg>
            </div>
          </Link>
          <h1 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200 mb-2">
            Welcome Back
          </h1>
          <p className="text-sm text-navy-300 dark:text-cream-400/60">
            Sign in to continue your learning journey
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8">
          {/* Google OAuth */}
          <button 
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full py-3 px-4 rounded-xl border-2 border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 font-semibold text-sm hover:bg-navy-50 dark:hover:bg-navy-500 transition-all flex items-center justify-center gap-3 mb-6"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-navy-100 dark:border-navy-400/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white dark:bg-navy-500/50 text-navy-300 dark:text-cream-400/60 font-medium rounded">
                or sign in with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-navy-500 dark:text-cream-300 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="you@example.com" required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-navy-500 dark:text-cream-300">Password</label>
                <a href="#" className="text-xs text-gold-500 hover:text-gold-600 font-medium transition-colors">Forgot password?</a>
              </div>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5 text-sm mt-2">
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-navy-300 dark:text-cream-400/60 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-gold-500 hover:text-gold-600 font-semibold transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
