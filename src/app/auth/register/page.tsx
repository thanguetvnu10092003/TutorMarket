'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import type { Role } from '@/types';
import PasswordInput from '@/components/ui/PasswordInput';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'choice' | 'form'>('choice');
  const [role, setRole] = useState<Role>('STUDENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          adminSecret: role === 'ADMIN' ? secretKey : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (data.requiresVerification) {
        toast.success(data.message || 'Please verify your email');
        // Auto-login so they don't have to enter credentials again after verifying OTP
        await signIn('credentials', { email, password, redirect: false });
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        toast.success('Registration successful! Please sign in.');
        router.push('/auth/login');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-cream-200 dark:bg-navy-600">
      {/* Left: Brand Panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-navy-600 to-navy-700 flex-col justify-between p-12 relative overflow-hidden auth-panel-enter">
        <div className="absolute inset-0 bg-dot-grid bg-[length:24px_24px] opacity-25 pointer-events-none" />
        <div className="absolute top-20 right-10 w-56 h-56 bg-gold-400/12 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-sage-400/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-gold-400/10 rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-14 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold group-hover:shadow-glow-gold transition-shadow duration-300">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy-700">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/>
              </svg>
            </div>
            <span className="text-xl font-display font-bold text-cream-200 group-hover:text-gold-300 transition-colors duration-300">
              Prep<span className="text-gold-400">Pass</span>
            </span>
          </Link>
          <h2 className="text-3xl font-display font-bold text-cream-200 mb-4 leading-tight">
            Join thousands of<br /><span className="text-gold-400">exam high-achievers</span>
          </h2>
          <p className="text-cream-400/55 text-sm leading-relaxed max-w-xs mb-8">
            Your first session with any tutor is completely free. No credit card required.
          </p>
          <ul className="space-y-3">
            {['Free first session with every tutor', 'Verified world-class experts', 'Track your progress live'].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-cream-400/70">
                <span className="w-5 h-5 rounded-full bg-gold-400/20 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gold-400">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {[
            { value: '2,500+', label: 'Students mentored' },
            { value: '95%',    label: 'Pass rate' },
            { value: '4.9/5',  label: 'Avg rating' },
            { value: '10k+',   label: 'Sessions done' },
          ].map((s, i) => (
            <div key={s.label}
              className="shimmer-hover p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold-400/25 transition-all duration-300"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-2xl font-display font-bold text-gold-400">{s.value}</div>
              <div className="label-xs text-cream-400/50 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center pt-20 pb-16 px-6 auth-form-enter">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <Link href="/" aria-label="PrepPass – Go to homepage" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy-600">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/>
              </svg>
            </div>
          </Link>
          <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200 mb-2">
            {step === 'choice' ? 'Choose Your Journey' : 'Create Your Account'}
          </h1>
          <p className="text-navy-300 dark:text-cream-400/60 max-w-sm mx-auto">
            {step === 'choice' 
              ? 'Join our premium community as a student or share your knowledge as a tutor.' 
              : `Fill in your details to start your journey as a ${role === 'TUTOR' ? 'Tutor' : 'Student'}.`}
          </p>
        </div>

        {step === 'choice' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Student Choice */}
            <button
              onClick={() => handleRoleSelect('STUDENT')}
              className="shimmer-hover glass-card p-6 text-center group hover:border-gold-400/60 hover:shadow-gold-lg transition-all duration-300 active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-2xl bg-cream-100 dark:bg-navy-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-glass">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold-500">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-navy-600 dark:text-cream-200 mb-2">I want to Learn</h3>
              <p className="text-xs text-navy-300 dark:text-cream-400/60 mb-6">Find expert tutors and achieve your goals.</p>
              <span className="btn-primary py-2 px-4 text-xs block w-full">Join as Student</span>
            </button>

            {/* Tutor Choice */}
            <button
              onClick={() => handleRoleSelect('TUTOR')}
              className="shimmer-hover glass-card p-6 text-center group hover:border-sage-400/60 hover:shadow-[0_8px_32px_rgba(74,124,111,0.25)] transition-all duration-300 active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-2xl bg-cream-100 dark:bg-navy-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-glass">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sage-500">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-navy-600 dark:text-cream-200 mb-2">I want to Teach</h3>
              <p className="text-xs text-navy-300 dark:text-cream-400/60 mb-6">Share expertise and grow your business.</p>
              <span className="bg-sage-600 hover:bg-sage-700 text-white py-2 px-4 rounded-xl text-xs font-bold shadow-sage transition-all block w-full">Join as Tutor</span>
            </button>

            {/* Admin Choice */}
            <button
              onClick={() => handleRoleSelect('ADMIN')}
              className="shimmer-hover glass-card p-6 text-center group hover:border-blue-400/60 hover:shadow-[0_8px_32px_rgba(59,130,246,0.2)] transition-all duration-300 active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-2xl bg-cream-100 dark:bg-navy-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-glass">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-navy-600 dark:text-cream-200 mb-2">Platform Admin</h3>
              <p className="text-xs text-navy-300 dark:text-cream-400/60 mb-6">Manage users, tutors, and platform data.</p>
              <span className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl text-xs font-bold shadow-blue transition-all block w-full">Join as Admin</span>
            </button>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="glass-card p-8">
              <button 
                onClick={() => setStep('choice')}
                className="flex items-center gap-2 text-xs font-bold text-gold-500 hover:text-gold-600 mb-6 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                BACK TO CHOICE
              </button>

              {/* Google - Hidden for Admins */}
              {role === 'ADMIN' && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-center mb-6">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Administrator accounts must be registered using email and password for security purposes.
                  </p>
                </div>
              )}

              {/* Main Form */}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy-500 dark:text-cream-300">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="John Smith" required />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy-500 dark:text-cream-300">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" required />
                </div>
                <PasswordInput
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />

                {role === 'ADMIN' && (
                  <PasswordInput
                    label="Admin Secret Key"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Enter platform secret"
                    required
                  />
                )}

                <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5 text-sm mt-4">
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : `Create ${role === 'TUTOR' ? 'Tutor' : role === 'ADMIN' ? 'Admin' : 'Student'} Account`}
                </button>
              </form>

              <p className="text-center text-sm text-navy-300 dark:text-cream-400/60 mt-6">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-gold-500 hover:text-gold-600 font-semibold transition-colors">Sign In</Link>
              </p>
            </div>
          </div>
        )}

        {step === 'choice' && (
          <p className="text-center text-sm text-navy-300 dark:text-cream-400/60 mt-8">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-gold-500 hover:text-gold-600 font-semibold transition-colors">Sign In</Link>
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
