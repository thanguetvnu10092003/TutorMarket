'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import { toast } from 'react-hot-toast';

// Make sure to call `loadStripe` outside of a component’s render to avoid recreating the `Stripe` object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function CheckoutPage({ params }: { params: { paymentId: string } }) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState('');
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch booking/tutor details
    fetch(`/api/checkout/${params.paymentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          router.push('/dashboard/student');
          return;
        }
        setCheckoutData(data.data);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to parse checkout details.');
      });

    // Create PaymentIntent
    fetch(`/api/checkout/${params.paymentId}/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
        } else {
          setClientSecret(data.clientSecret);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, [params.paymentId, router]);

  useEffect(() => {
    if (clientSecret && checkoutData) {
      setLoading(false);
    }
  }, [clientSecret, checkoutData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-navy-900 pt-24 px-6 flex items-center justify-center">
        <div className="animate-pulse text-navy-400 font-bold dark:text-cream-400">Loading secure checkout...</div>
      </div>
    );
  }

  const { tutor, bindings, amount, subtotal, processingFee, isPackage } = checkoutData;

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#d4af37', // gold-500 equivalent roughly
      colorBackground: '#ffffff',
      colorText: '#1e293b',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };
  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-navy-900 pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Summary */}
        <div className="flex-1 space-y-6">
          
          {/* Tutor Card */}
          <div className="glass-card p-6 border-t-4 border-pink-200 dark:border-pink-800">
            <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200 mb-6">Your tutor</h3>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-navy-600 dark:text-white mb-1">{tutor.name}</h2>
                <div className="flex items-center gap-2 text-sm text-navy-400 dark:text-cream-400/60 mb-6">
                  <span className="flex items-center gap-1">★ {tutor.rating.toFixed(1)}</span>
                  <span>({tutor.totalReviews} reviews)</span>
                </div>
              </div>
              {tutor.avatarUrl && (
                <img src={tutor.avatarUrl} alt={tutor.name} className="w-16 h-16 rounded-2xl object-cover bg-navy-100 dark:bg-navy-800" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-navy-100 dark:border-navy-400/20 pt-4">
               <div>
                  <div className="text-lg font-black text-navy-600 dark:text-cream-200 flex items-center gap-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                    {tutor.students}
                  </div>
                  <div className="text-[10px] text-navy-300 dark:text-cream-400/50 mt-1 uppercase tracking-widest">students</div>
               </div>
               <div>
                  <div className="text-lg font-black text-navy-600 dark:text-cream-200 flex items-center gap-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    {tutor.lessons}
                  </div>
                  <div className="text-[10px] text-navy-300 dark:text-cream-400/50 mt-1 uppercase tracking-widest">lessons</div>
               </div>
               <div>
                  <div className="text-lg font-black text-navy-600 dark:text-cream-200 flex items-center gap-1">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                     {tutor.yearsTeaching}
                  </div>
                  <div className="text-[10px] text-navy-300 dark:text-cream-400/50 mt-1 uppercase tracking-widest">years teaching</div>
               </div>
            </div>
          </div>

          {/* Details */}
          <div className="glass-card p-0 overflow-hidden">
             <div className="p-6">
                <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200 mb-6">{isPackage ? 'Package Details' : 'Lesson Details'}</h3>
                
                {checkoutData.bookings.slice(0, 3).map((b: any) => {
                  const d = new Date(b.scheduledAt);
                  const endTime = new Date(d.getTime() + b.durationMinutes * 60000);
                  return (
                    <div key={b.id} className="flex gap-4 mb-4">
                       <div className="w-12 h-12 bg-navy-50 dark:bg-navy-800 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                         <div className="text-[10px] font-bold text-pink-500">
                           {d.toLocaleString('default', { month: 'short' }).toUpperCase()}
                         </div>
                         <div className="text-lg font-black text-navy-600 dark:text-cream-200">{d.getDate()}</div>
                       </div>
                       <div>
                         <div className="text-sm font-bold text-navy-600 dark:text-cream-200">
                           {d.toLocaleString('default', { weekday: 'long' })}, {d.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })} — {endTime.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                         </div>
                         <div className="text-xs text-navy-400 dark:text-cream-400/60 mt-1">Time is based on your location</div>
                       </div>
                    </div>
                  );
                })}
                {checkoutData.bookings.length > 3 && (
                  <div className="text-xs text-navy-400 dark:text-cream-400/60 font-bold mb-4">
                    + {checkoutData.bookings.length - 3} more sessions in package
                  </div>
                )}
             </div>
             <div className="bg-teal-50 dark:bg-teal-900/20 px-6 py-4 border-t border-teal-100 dark:border-teal-900 text-xs font-bold text-teal-700 dark:text-teal-300">
                Cancel or reschedule for free up to 24 hours in advance
             </div>
          </div>

          {/* Checkout info */}
          <div className="glass-card p-0 overflow-hidden">
             <div className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200">Checkout info</h3>
                
                <div className="flex bg-navy-50 dark:bg-navy-800 rounded-xl p-1">
                  <div className="flex-1 text-center py-2 bg-white dark:bg-navy-600 rounded-lg shadow-sm font-bold text-sm text-navy-600 dark:text-cream-200">
                    {checkoutData.bookings[0]?.durationMinutes} mins • ${subtotal.toFixed(2)}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-navy-500 dark:text-cream-300">{isPackage ? `${checkoutData.packageSessions} lessons` : `${checkoutData.bookings[0]?.durationMinutes}-min lesson`}</span>
                  <span className="font-bold text-navy-600 dark:text-cream-200">${subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-navy-500 dark:text-cream-300 flex items-center gap-1">
                    Processing fee
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </span>
                  <span className="font-bold text-navy-600 dark:text-cream-200">${processingFee.toFixed(2)}</span>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex justify-between items-center">
                  <span className="text-lg font-black text-navy-600 dark:text-cream-200">Total</span>
                  <span className="text-lg font-black text-navy-600 dark:text-cream-200">${amount.toFixed(2)}</span>
                </div>
                
                <button className="text-xs font-bold underline text-navy-600 dark:text-cream-200 hover:text-navy-900 dark:hover:text-white transition-colors">
                  Have a promo code?
                </button>
             </div>
             
             <div className="bg-teal-50 dark:bg-teal-900/20 px-6 py-4 flex items-start gap-4">
               <svg className="flex-shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10zM12 16v-4M12 8h.01"/></svg>
               <div>
                  <h4 className="text-sm font-bold text-teal-800 dark:text-teal-300">Free tutor replacement</h4>
                  <p className="text-xs text-teal-700/80 dark:text-teal-400/80 mt-1">If this tutor isn’t a match, try another for free.</p>
               </div>
             </div>
          </div>
        </div>

        {/* Right Column: Payment */}
        <div className="flex-1 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-xl font-black text-navy-600 dark:text-cream-200 mb-6">Choose how to pay</h3>
            
            {clientSecret && stripePromise && (
              <Elements options={options} stripe={stripePromise}>
                <CheckoutForm amount={amount} isPackage={isPackage} />
              </Elements>
            )}
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-navy-600 dark:text-cream-200 mb-4">{tutor.name?.split(' ')[0] || 'Tutor'} is a great choice</h3>
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 <div className="px-3 py-1 bg-gray-50 dark:bg-navy-800 rounded font-bold text-sm text-navy-600 dark:text-cream-200">★ {tutor.rating.toFixed(1)}</div>
                 <div className="text-sm text-navy-400 dark:text-cream-400/60">{tutor.totalReviews} reviews</div>
               </div>
               <div className="flex gap-2">
                 <button className="p-2 border border-gray-200 dark:border-navy-600 rounded bg-gray-50 dark:bg-navy-800 text-navy-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                 </button>
                 <button className="p-2 border border-gray-200 dark:border-navy-600 rounded bg-white dark:bg-navy-700">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                 </button>
               </div>
            </div>
            
            <div className="p-4 border border-navy-100 dark:border-navy-400/20 rounded-xl relative">
              <p className="text-sm text-navy-500 dark:text-cream-300/80 leading-relaxed mb-4">
                 &quot;Very excellent tutor, when she is teaching I feel she is very concentrated so I love it. She is nice when I have many questions to ask in the lesson. I hope I can improve my skills with her. Finally, the price is reasonable to study.&quot;
              </p>
              <button className="text-xs font-bold underline text-navy-600 dark:text-cream-200">Read more</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
