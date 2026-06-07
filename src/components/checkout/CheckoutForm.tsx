'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';

export default function CheckoutForm({ amount, isPackage }: { amount: number, isPackage: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/student?tab=payments&stripe=success`,
      },
    });

    if (error) {
       if (error.type === "card_error" || error.type === "validation_error") {
        toast.error(error.message || 'Payment processing failed');
       } else {
        toast.error('An unexpected error occurred.');
       }
       setIsLoading(false);
    } else {
       // Automatic redirect happens by Stripe here
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <PaymentElement />

      <button
        disabled={isLoading || !stripe || !elements}
        id="submit"
        className="w-full bg-gold-400 hover:bg-gold-500 disabled:bg-navy-100 dark:disabled:bg-navy-800 text-navy-600 disabled:text-navy-400 dark:disabled:text-cream-400/40 py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-gold disabled:shadow-none"
      >
        {isLoading ? <Spinner size="sm" className="text-navy-600" /> : null}
        <span>{isLoading ? 'Processing...' : `Book ${isPackage ? 'package' : 'lesson'} and pay $${amount.toFixed(2)}`}</span>
      </button>

      <div className="text-center">
        <button 
          type="button"
          onClick={() => router.push('/dashboard/student?tab=payments')} 
          className="text-sm font-bold text-navy-400 hover:text-navy-600 dark:text-cream-400/60 dark:hover:text-cream-200 transition-colors underline"
        >
          Cancel payment
        </button>
      </div>

      <div className="text-[10px] text-navy-400 dark:text-cream-400/60 leading-relaxed text-center">
        By pressing the &quot;Book and pay&quot; button, you agree to PrepPass&apos;s Refund and Payment Policy.
        It&apos;s safe to pay on PrepPass. All transactions are protected by SSL encryption.
      </div>
    </form>
  );
}
