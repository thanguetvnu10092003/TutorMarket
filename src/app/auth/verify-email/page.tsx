'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    const emailParam = searchParams.get('email') || session?.user?.email;
    if (emailParam) {
      setEmail(emailParam);
    } else if (!isLoading && !session) {
      router.push('/auth/login');
    }
  }, [searchParams, session, router, isLoading]);

  // Countdown timer for code expiration
  useEffect(() => {
    if (expiresIn <= 0) return;
    const timer = setInterval(() => {
      setExpiresIn((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresIn]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Email verified successfully!');
        
        // Update session if user is logged in
        if (session) {
          await update({ isVerified: true });
          
          if (!session.user.hasPassword) {
            router.push('/auth/set-password');
          } else if (!(session.user as any).hasChosenRole) {
            router.push('/auth/choose-role');
          } else {
            const role = (session.user as any).role;
            router.push(`/dashboard/${role?.toLowerCase() || 'student'}`);
          }
        } else {
          router.push('/auth/login?verified=true');
        }
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('New code sent to your email');
        setResendCooldown(60);
        setExpiresIn(300);
        setOtp(['', '', '', '', '', '']);
      } else {
        toast.error(data.error || 'Failed to resend code');
      }
    } catch (error) {
      toast.error('Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass-card p-10 text-center"
      >
        <div className="mb-8">
          <div className="w-16 h-16 bg-gold-400/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200 mb-2">Verify your email</h1>
          <p className="text-sm text-navy-400 dark:text-cream-400/60 leading-relaxed">
            We&apos;ve sent a 6-digit verification code to <br />
            <span className="font-bold text-navy-600 dark:text-cream-200">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-between gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 bg-white dark:bg-navy-500 border-2 border-transparent focus:border-gold-400 rounded-xl text-center text-xl font-bold text-navy-600 dark:text-cream-200 transition-all outline-none"
                maxLength={1}
                required
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest px-1">
            <span className={expiresIn > 0 ? 'text-navy-300 dark:text-cream-400/40' : 'text-red-500'}>
              {expiresIn > 0 ? `Expires in ${formatTime(expiresIn)}` : 'Code expired'}
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isLoading}
              className={`transition-colors ${resendCooldown > 0 ? 'text-navy-300 dark:text-cream-400/40' : 'text-gold-500 hover:text-gold-600'}`}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || expiresIn <= 0}
            className="w-full bg-navy-600 dark:bg-gold-500 text-white dark:text-navy-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-navy-700 dark:hover:bg-gold-600 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Verify Account'
            )}
          </button>
        </form>

        <p className="mt-8 text-xs text-navy-300 dark:text-cream-400/40">
          Already verified? <button onClick={() => router.push('/auth/login')} className="text-gold-500 hover:text-gold-600 font-bold">Log in here</button>
        </p>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream-200 dark:bg-navy-600 flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-navy-200 border-t-gold-500 rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
