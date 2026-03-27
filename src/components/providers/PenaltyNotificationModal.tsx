'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const PENALTY_TYPE_LABELS: Record<string, string> = {
  WARNING: 'Account Warning',
  SUSPEND_7D: 'Account Suspended (7 Days)',
  SUSPEND_30D: 'Account Suspended (30 Days)',
  PERMANENT_BAN: 'Account Permanently Banned',
};

export function PenaltyNotificationModal() {
  const { data: session, status } = useSession();
  const [activePenalty, setActivePenalty] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealEvidence, setAppealEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    const sessionKey = `penalty-seen-${session.user.id}`;
    const alreadySeen = sessionStorage.getItem(sessionKey);

    async function fetchPenalties() {
      try {
        const res = await fetch('/api/user/penalties');
        if (!res.ok) return;
        const json = await res.json();
        const active = (json.data || []);
        if (active.length > 0) {
          const ban = active.find((p: any) => p.type === 'PERMANENT_BAN');
          const penalty = ban || active[0];
          if (penalty.type === 'PERMANENT_BAN' || !alreadySeen) {
            setActivePenalty(penalty);
          }
        }
      } catch {
        // Silently fail — don't block login
      }
    }

    void fetchPenalties();
  }, [status, session?.user?.id]);

  function handleDismiss() {
    if (!activePenalty || activePenalty.type === 'PERMANENT_BAN') return;
    const sessionKey = `penalty-seen-${session?.user?.id}`;
    sessionStorage.setItem(sessionKey, '1');
    setDismissed(true);
    setActivePenalty(null);
  }

  async function handleSubmitAppeal() {
    if (!activePenalty || !appealReason.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/user/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          penaltyId: activePenalty.id,
          reason: appealReason,
          evidence: appealEvidence || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit appeal');
      setAppealSubmitted(true);
      toast.success('Appeal submitted successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Could not submit appeal');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!activePenalty || dismissed) return null;

  const isBan = activePenalty.type === 'PERMANENT_BAN';
  const isSuspend = activePenalty.type === 'SUSPEND_7D' || activePenalty.type === 'SUSPEND_30D';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-navy-900/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg rounded-[32px] bg-white dark:bg-navy-600 shadow-2xl p-8 space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isBan ? 'bg-red-100' : isSuspend ? 'bg-orange-100' : 'bg-yellow-100'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isBan ? 'text-red-600' : isSuspend ? 'text-orange-600' : 'text-yellow-600'}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-navy-600 dark:text-cream-200">
              {PENALTY_TYPE_LABELS[activePenalty.type] || 'Account Action'}
            </h2>
            <p className="text-xs text-navy-400 dark:text-cream-400/60">
              Applied on {new Date(activePenalty.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-navy-50/80 dark:bg-navy-700/40 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-navy-300 mb-2">Reason</p>
          <p className="text-sm text-navy-600 dark:text-cream-200">{activePenalty.reason}</p>
          {isSuspend && activePenalty.expiresAt && (
            <p className="mt-3 text-xs font-bold text-orange-600">
              Suspension ends: {new Date(activePenalty.expiresAt).toLocaleDateString()}
            </p>
          )}
          {isBan && (
            <p className="mt-3 text-xs font-bold text-red-600">
              This ban is permanent. You may appeal below.
            </p>
          )}
        </div>

        {appealSubmitted ? (
          <div className="rounded-2xl bg-sage-50 dark:bg-sage-500/10 p-4 text-center">
            <p className="text-sm font-bold text-sage-700 dark:text-sage-300">
              Your appeal has been submitted. We will review within 48 hours.
            </p>
          </div>
        ) : showAppealForm ? (
          <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-navy-300">Submit an Appeal</p>
            <textarea
              value={appealReason}
              onChange={e => setAppealReason(e.target.value)}
              placeholder="Explain why this decision should be reconsidered..."
              className="w-full bg-white dark:bg-navy-700 border-2 border-navy-100 dark:border-navy-500/20 rounded-2xl p-4 text-sm text-navy-600 dark:text-cream-200 focus:border-gold-400 outline-none resize-none h-28"
            />
            <input
              type="text"
              value={appealEvidence}
              onChange={e => setAppealEvidence(e.target.value)}
              placeholder="Evidence link or description (optional)"
              className="w-full bg-white dark:bg-navy-700 border-2 border-navy-100 dark:border-navy-500/20 rounded-2xl px-4 py-3 text-sm text-navy-600 dark:text-cream-200 focus:border-gold-400 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAppealForm(false)}
                className="flex-1 border border-navy-200 dark:border-navy-500/20 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-navy-600 dark:text-cream-200 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmitAppeal()}
                disabled={isSubmitting || appealReason.trim().length < 10}
                className="flex-1 bg-gold-400 hover:bg-gold-500 disabled:opacity-50 text-navy-600 py-3 rounded-2xl text-xs font-black uppercase tracking-widest"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {!isBan && (
              <button
                onClick={handleDismiss}
                className="w-full bg-navy-600 hover:bg-navy-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                I Understand
              </button>
            )}
            <button
              onClick={() => setShowAppealForm(true)}
              className="w-full border-2 border-navy-200 dark:border-navy-500/20 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-navy-600 dark:text-cream-200 hover:border-gold-400"
            >
              Appeal This Decision
            </button>
            {isBan && (
              <button
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="w-full border border-red-200 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
