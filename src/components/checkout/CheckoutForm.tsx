'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

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
      
      {/* Save card checkbox to mimic design (handled by Stripe Link mostly, but visually present) */}
      <div className="flex items-center gap-2 mt-4">
        <input type="checkbox" id="save-card" className="w-4 h-4 rounded border-gray-300 text-gold-500 focus:ring-gold-500" />
        <label htmlFor="save-card" className="text-sm text-navy-600 dark:text-cream-200">
          Save this card for future payments
        </label>
      </div>

      <button
        disabled={isLoading || !stripe || !elements}
        id="submit"
        className="w-full bg-navy-100 hover:bg-navy-200 dark:bg-navy-700 dark:hover:bg-navy-600 text-navy-600 dark:text-cream-200 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        <span>{isLoading ? 'Processing...' : `Book ${isPackage ? 'package' : 'lesson'} and pay $${amount.toFixed(2)}`}</span>
      </button>

      <div className="text-[10px] text-navy-400 dark:text-cream-400/60 leading-relaxed text-center">
        By pressing the &quot;Book and pay&quot; button, you agree to PrepPass&apos;s Refund and Payment Policy.
        It&apos;s safe to pay on PrepPass. All transactions are protected by SSL encryption.
      </div>
    </form>
  );
}
