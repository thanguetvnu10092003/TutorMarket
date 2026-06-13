'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import { toast } from 'react-hot-toast';
import { ShieldCheck, Lock, Users, BookOpen, Clock } from '@/components/ui/icons';
import { useCurrency } from '@/contexts/CurrencyContext';
import QRCode from 'react-qr-code';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function CheckoutPage({ params }: { params: { paymentId: string } }) {
  const router = useRouter();
  const { format } = useCurrency();
  const [clientSecret, setClientSecret] = useState('');
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'payos'>('payos');
  const [payosData, setPayosData] = useState<{
    checkoutUrl: string;
    qrCode: string | null;
    amountVnd: number;
  } | null>(null);
  const [payosLoading, setPayosLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch(`/api/checkout/${params.paymentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          router.push('/dashboard/student');
          return;
        }
        setCheckoutData(data.data);
        setLoading(false);
        // Auto-init PayOS since it's the default tab
        initPayosWithId(params.paymentId);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load checkout details.');
        setLoading(false);
      });
  }, [params.paymentId, router]);

  async function initPayosWithId(paymentId: string) {
    setPayosLoading(true);
    try {
      const res = await fetch('/api/checkout/payos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setPayosData(data);
    } catch {
      toast.error('Failed to initialize PayOS payment.');
    } finally {
      setPayosLoading(false);
    }
  }

  async function initStripe() {
    if (clientSecret) return;
    try {
      const res = await fetch(`/api/checkout/${params.paymentId}/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setClientSecret(data.clientSecret);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to initialize card payment.');
    }
  }

  async function initPayos() {
    if (payosData) return;
    await initPayosWithId(params.paymentId);
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-6 flex items-center justify-center" style={{ background: 'var(--bg-primary, #F8F6F2)' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse-fade { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid rgba(201,168,76,0.2)',
            borderTopColor: '#C9A84C',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#C9A84C', fontWeight: 700, fontSize: 14, animation: 'pulse-fade 1.5s ease-in-out infinite' }}>
            Loading secure checkout...
          </p>
        </div>
      </div>
    );
  }

  const { tutor, bindings, amount, subtotal, isPackage } = checkoutData;

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#C9A84C',
      colorBackground: '#ffffff',
      colorText: '#1e293b',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-secondary, #F0EDE6)', paddingTop: '88px' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes qrReveal {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .co-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(10,22,40,0.07), 0 1px 3px rgba(10,22,40,0.04);
          overflow: hidden;
        }
        .co-card-dark {
          background: #0A1628;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(10,22,40,0.3);
          overflow: hidden;
        }
        .pay-tab {
          flex: 1; padding: 12px 8px; border: 2px solid transparent;
          border-radius: 10px; cursor: pointer; font-weight: 700;
          font-size: 13px; letter-spacing: 0.01em; transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          background: transparent;
        }
        .pay-tab:hover { transform: translateY(-1px); }
        .pay-tab.active {
          background: #C9A84C; color: #0A1628;
          border-color: #C9A84C;
          box-shadow: 0 4px 16px rgba(201,168,76,0.35);
        }
        .pay-tab.inactive {
          background: rgba(201,168,76,0.08);
          color: #C9A84C; border-color: rgba(201,168,76,0.25);
        }
        .pay-tab.inactive:hover {
          background: rgba(201,168,76,0.15);
          border-color: rgba(201,168,76,0.4);
        }
        .qr-skeleton {
          width: 220px; height: 220px; border-radius: 12px;
          background: linear-gradient(90deg, #1a2a44 25%, #1e3050 50%, #1a2a44 75%);
          background-size: 400px 100%;
          animation: shimmer 1.4s infinite;
        }
        .stat-badge {
          display: flex; flex-direction: column; align-items: center;
          padding: 12px 8px; border-radius: 12px;
          background: rgba(10,22,40,0.04);
          transition: background 0.2s;
        }
        .dark .stat-badge { background: rgba(245,240,232,0.06); }
        .checkout-anim-1 { animation: fadeInUp 0.5s ease both; animation-delay: 0.05s; }
        .checkout-anim-2 { animation: fadeInUp 0.5s ease both; animation-delay: 0.15s; }
        .checkout-anim-3 { animation: fadeInUp 0.5s ease both; animation-delay: 0.25s; }
        .checkout-anim-4 { animation: fadeInUp 0.5s ease both; animation-delay: 0.1s; }
        .checkout-anim-5 { animation: fadeInUp 0.5s ease both; animation-delay: 0.2s; }
        .checkout-anim-6 { animation: fadeInUp 0.5s ease both; animation-delay: 0.3s; }
        .step-dot {
          width: 24px; height: 24px; border-radius: 50%;
          background: rgba(201,168,76,0.15); color: #C9A84C;
          font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
      `}</style>

      {/* Back link */}
      <div className="max-w-6xl mx-auto px-6 mb-6" style={{ animation: 'fadeIn 0.4s ease' }}>
        <button
          onClick={() => router.push('/dashboard/student?tab=payments')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 700, color: '#8A8F9A',
            background: 'none', border: 'none', cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#0A1628')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8A8F9A')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          Cancel and return to dashboard
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}
          className="checkout-grid">
          <style>{`
            @media (max-width: 900px) {
              .checkout-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Tutor card */}
            <div className="co-card checkout-anim-1" style={{ borderTop: '4px solid #C9A84C' }}>
              <div style={{ padding: '24px 24px 0' }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#8A8F9A', textTransform: 'uppercase', marginBottom: 16 }}>
                  Your tutor
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0A1628', marginBottom: 4 }}>{tutor.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8A8F9A' }}>
                      <span style={{ color: '#F59E0B' }}>★</span>
                      <span style={{ fontWeight: 700, color: '#0A1628' }}>{tutor.rating.toFixed(1)}</span>
                      <span>({tutor.totalReviews} reviews)</span>
                    </div>
                  </div>
                  {tutor.avatarUrl ? (
                    <img
                      src={tutor.avatarUrl} alt={tutor.name}
                      style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
                    />
                  ) : (
                    <div style={{
                      width: 64, height: 64, borderRadius: 16,
                      background: 'linear-gradient(135deg, #C9A84C, #e8c97a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 900, color: '#0A1628',
                    }}>
                      {tutor.name?.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                borderTop: '1px solid rgba(10,22,40,0.07)', padding: '16px 24px',
                gap: 8,
              }}>
                {[
                  { icon: <Users size={16} />, value: tutor.students || 0, label: 'Students' },
                  { icon: <BookOpen size={16} />, value: tutor.lessons || 0, label: 'Lessons' },
                  { icon: <Clock size={16} />, value: tutor.hoursTaught || 0, label: 'Hours' },
                ].map(({ icon, value, label }) => (
                  <div key={label} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '10px 4px', borderRadius: 10, background: 'rgba(10,22,40,0.03)',
                  }}>
                    <div style={{ color: '#C9A84C', marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0A1628' }}>{value}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#8A8F9A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lesson details */}
            <div className="co-card checkout-anim-2">
              <div style={{ padding: '24px' }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#8A8F9A', textTransform: 'uppercase', marginBottom: 16 }}>
                  {isPackage ? 'Package Details' : 'Lesson Details'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {checkoutData.bookings.slice(0, 3).map((b: any, i: number) => {
                    const d = new Date(b.scheduledAt);
                    const endTime = new Date(d.getTime() + b.durationMinutes * 60000);
                    return (
                      <div key={b.id} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{
                          width: 48, height: 52, borderRadius: 12, overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(10,22,40,0.1)', flexShrink: 0,
                        }}>
                          <div style={{ background: '#EC4899', padding: '3px 0', textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.06em' }}>
                            {d.toLocaleString('default', { month: 'short' }).toUpperCase()}
                          </div>
                          <div style={{ background: '#fff', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 34 }}>
                            <span style={{ fontSize: 18, fontWeight: 900, color: '#0A1628' }}>{d.getDate()}</span>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>
                            {d.toLocaleString('default', { weekday: 'long' })}, {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ fontSize: 12, color: '#8A8F9A', marginTop: 2 }}>Based on your local time</div>
                        </div>
                      </div>
                    );
                  })}
                  {checkoutData.bookings.length > 3 && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#8A8F9A', paddingLeft: 62 }}>
                      + {checkoutData.bookings.length - 3} more sessions in package
                    </div>
                  )}
                </div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf9, #ecfdf5)',
                borderTop: '1px solid rgba(16,185,129,0.15)',
                padding: '12px 24px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>Free cancellation up to 24 hours in advance</span>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="co-card checkout-anim-3">
              <div style={{ padding: '24px' }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#8A8F9A', textTransform: 'uppercase', marginBottom: 16 }}>
                  Checkout Summary
                </p>

                {/* Pill */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.04))',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: 10, padding: '10px 16px',
                  textAlign: 'center', marginBottom: 16,
                  fontSize: 14, fontWeight: 800, color: '#0A1628',
                }}>
                  {checkoutData.bookings[0]?.durationMinutes} mins •{' '}
                  <span style={{ color: '#C9A84C' }}>
                    {paymentMethod === 'payos' && payosData
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payosData.amountVnd)
                      : `$${subtotal.toFixed(2)}`}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: '#6B7280' }}>
                      {isPackage ? `${checkoutData.packageSessions} lessons` : `${checkoutData.bookings[0]?.durationMinutes}-min lesson`}
                    </span>
                    <span style={{ fontWeight: 700, color: '#0A1628' }}>
                      {paymentMethod === 'payos' && payosData
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payosData.amountVnd)
                        : `$${subtotal.toFixed(2)}`}
                    </span>
                  </div>
                  <div style={{
                    borderTop: '2px dashed rgba(10,22,40,0.08)',
                    marginTop: 4, paddingTop: 14,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#0A1628' }}>Total</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#C9A84C' }}>
                      {paymentMethod === 'payos' && payosData
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payosData.amountVnd)
                        : format(amount)}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff, #ebf5ff)',
                borderTop: '1px solid rgba(59,130,246,0.15)',
                padding: '14px 24px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(59,130,246,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1E40AF' }}>Free tutor replacement</div>
                  <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>If this tutor isn&apos;t a match, try another for free.</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Payment panel */}
            <div className="co-card checkout-anim-4">
              <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0A1628', marginBottom: 20 }}>
                  Choose how to pay
                </h3>

                {/* SSL badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.03))',
                  border: '1px solid rgba(16,185,129,0.2)',
                  marginBottom: 20,
                }}>
                  <ShieldCheck size={18} style={{ color: '#10B981', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#065F46' }}>SSL Secured Checkout</div>
                    <div style={{ fontSize: 11, color: '#6EE7B7', marginTop: 1 }}>Your payment details are encrypted and never stored.</div>
                  </div>
                  <Lock size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                </div>

                {/* Payment tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'rgba(10,22,40,0.04)', padding: 4, borderRadius: 12 }}>
                  <button
                    className={`pay-tab ${paymentMethod === 'payos' ? 'active' : 'inactive'}`}
                    onClick={() => { setPaymentMethod('payos'); initPayos(); }}
                  >
                    <span style={{ fontSize: 16 }}>🏦</span>
                    VietQR (PayOS)
                  </button>
                  <button
                    className={`pay-tab ${paymentMethod === 'stripe' ? 'active' : 'inactive'}`}
                    onClick={() => { setPaymentMethod('stripe'); initStripe(); }}
                  >
                    <span style={{ fontSize: 16 }}>💳</span>
                    Card (Stripe)
                  </button>
                </div>

                {/* ── PayOS Panel ── */}
                {paymentMethod === 'payos' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    {payosLoading && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 16 }}>
                        <div className="qr-skeleton" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                          {[180, 140, 160].map((w, i) => (
                            <div key={i} style={{
                              height: 14, borderRadius: 7, margin: '0 auto',
                              width: w,
                              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
                              backgroundSize: '400px 100%',
                              animation: 'shimmer 1.4s infinite',
                            }} />
                          ))}
                        </div>
                      </div>
                    )}

                    {!payosLoading && payosData && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                        {/* Amount badge */}
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          background: 'linear-gradient(135deg, #0A1628, #112240)',
                          borderRadius: 12, padding: '10px 20px',
                          marginBottom: 20,
                        }}>
                          <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.6)', fontWeight: 600 }}>Số tiền thanh toán</span>
                          <span style={{ fontSize: 18, fontWeight: 900, color: '#C9A84C' }}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payosData.amountVnd)}
                          </span>
                        </div>

                        {/* QR Code */}
                        {payosData.qrCode && (
                          <div style={{
                            position: 'relative',
                            padding: 16,
                            background: '#fff',
                            borderRadius: 20,
                            boxShadow: '0 8px 40px rgba(201,168,76,0.2), 0 2px 8px rgba(10,22,40,0.1)',
                            border: '2px solid rgba(201,168,76,0.25)',
                            animation: 'qrReveal 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
                            marginBottom: 20,
                          }}>
                            {/* Pulse ring */}
                            <div style={{
                              position: 'absolute', inset: -4, borderRadius: 24,
                              border: '2px solid rgba(201,168,76,0.4)',
                              animation: 'pulse-ring 2s ease-out infinite',
                            }} />
                            <QRCode
                              value={payosData.qrCode}
                              size={220}
                              style={{ display: 'block', borderRadius: 8 }}
                            />
                            {/* VietQR label */}
                            <div style={{
                              position: 'absolute', bottom: 8, right: 8,
                              background: 'rgba(10,22,40,0.75)', borderRadius: 6,
                              padding: '3px 7px', fontSize: 10, fontWeight: 800, color: '#C9A84C',
                              letterSpacing: '0.04em',
                            }}>VIETQR</div>
                          </div>
                        )}

                        {/* Steps */}
                        <div style={{
                          width: '100%', background: 'rgba(10,22,40,0.03)',
                          borderRadius: 12, padding: '16px 18px',
                          display: 'flex', flexDirection: 'column', gap: 10,
                          marginBottom: 16,
                        }}>
                          {[
                            'Mở app ngân hàng của bạn',
                            'Quét mã QR bên trên',
                            'Xác nhận thanh toán trong app',
                          ].map((step, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="step-dot">{i + 1}</div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{step}</span>
                            </div>
                          ))}
                        </div>

                        {/* Open PayOS button */}
                        <a
                          href={payosData.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            width: '100%', padding: '14px', borderRadius: 12,
                            background: 'linear-gradient(135deg, #C9A84C, #e8c97a)',
                            color: '#0A1628', fontWeight: 800, fontSize: 15,
                            textDecoration: 'none',
                            boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 28px rgba(201,168,76,0.5)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(201,168,76,0.4)'; }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          Mở PayOS để thanh toán
                        </a>

                        <p style={{ marginTop: 10, fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
                          Thanh toán qua PayOS • Hỗ trợ tất cả ngân hàng Việt Nam
                        </p>
                      </div>
                    )}

                    {!payosLoading && !payosData && (
                      <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 16 }}>Không thể tải QR code</p>
                        <button
                          onClick={() => initPayosWithId(params.paymentId)}
                          style={{
                            padding: '10px 24px', borderRadius: 10, border: '2px solid #C9A84C',
                            background: 'transparent', color: '#C9A84C',
                            fontWeight: 700, fontSize: 14, cursor: 'pointer',
                          }}
                        >
                          Thử lại
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Stripe Panel ── */}
                {paymentMethod === 'stripe' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    {!clientSecret && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          border: '3px solid rgba(201,168,76,0.2)',
                          borderTopColor: '#C9A84C',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                        <p style={{ color: '#9CA3AF', fontSize: 13 }}>Đang khởi tạo thanh toán card...</p>
                      </div>
                    )}
                    {clientSecret && stripePromise && (
                      <Elements options={{ clientSecret, appearance }} stripe={stripePromise}>
                        <CheckoutForm amount={amount} isPackage={isPackage} />
                      </Elements>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Social proof card */}
            <div className="co-card checkout-anim-5">
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  {tutor.avatarUrl ? (
                    <img src={tutor.avatarUrl} alt={tutor.name} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #C9A84C, #e8c97a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0A1628' }}>
                      {tutor.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0A1628' }}>{tutor.name?.split(' ')[0] || 'Tutor'} is a great choice</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i < Math.round(tutor.rating) ? '#F59E0B' : '#E5E7EB'} stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      ))}
                      <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 2 }}>{tutor.totalReviews} reviews</span>
                    </div>
                  </div>
                </div>
                <div style={{
                  background: 'rgba(10,22,40,0.03)', borderRadius: 12,
                  padding: '14px 16px', borderLeft: '3px solid #C9A84C',
                }}>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, fontStyle: 'italic' }}>
                    &quot;Very excellent tutor, very concentrated and nice when I have many questions. The price is reasonable and I feel I&apos;m improving. Highly recommend.&quot;
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#10B981',
                    }} />
                    <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 700 }}>Verified Student</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="checkout-anim-6" style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
            }}>
              {[
                { icon: '🔒', title: 'Secure', desc: 'SSL encrypted' },
                { icon: '↩️', title: 'Refundable', desc: '24h policy' },
                { icon: '🎓', title: 'Verified', desc: 'All tutors checked' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{
                  background: '#fff', borderRadius: 12, padding: '12px 8px',
                  textAlign: 'center',
                  boxShadow: '0 1px 6px rgba(10,22,40,0.05)',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0A1628' }}>{title}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
