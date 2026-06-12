'use client';

import useSWR from 'swr';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatMoney } from '@/lib/currency';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const SOURCE_LABELS: Record<string, string> = {
  REFERRAL: '🎁 Referral Bonus',
  PROMO: '🏷 Promo Credit',
  REFUND: '↩ Booking Refund',
};

export default function StudentCreditsPage() {
  const { format, currency } = useCurrency();
  const { data } = useSWR('/api/student/credits', fetcher);

  const total = data?.total ?? 0;
  const credits = data?.credits ?? [];

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ color: '#F5F0E8', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        Store Credits
      </h1>
      <p style={{ color: '#8899aa', marginBottom: '28px' }}>
        Credits are applied automatically at checkout.
      </p>

      <div style={{
        background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
        border: '1px solid rgba(201,168,76,0.3)', borderRadius: '16px', padding: '24px',
        marginBottom: '32px',
      }}>
        <div style={{ color: '#C9A84C', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
          AVAILABLE CREDITS
        </div>
        <div style={{ color: '#F5F0E8', fontSize: '36px', fontWeight: 700 }}>
          {formatMoney(total, 'USD')}
        </div>
        {currency !== 'USD' && (
          <div style={{ color: '#8899aa', fontSize: '14px', marginTop: '4px' }}>
            ≈ {format(total)}
          </div>
        )}
      </div>

      <h2 style={{ color: '#F5F0E8', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
        Credit History
      </h2>

      {credits.length === 0 && <p style={{ color: '#8899aa' }}>No credits yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {credits.map((c: any) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderRadius: '10px',
            background: 'rgba(30,58,110,0.15)', border: '1px solid rgba(30,58,110,0.3)',
            opacity: c.usedAt ? 0.5 : 1,
          }}>
            <div>
              <div style={{ color: '#F5F0E8', fontSize: '14px', fontWeight: 500 }}>
                {SOURCE_LABELS[c.source] ?? c.source}
                {c.usedAt && <span style={{ color: '#8899aa', fontSize: '12px', marginLeft: '8px' }}>(used)</span>}
                {c.expiresAt && !c.usedAt && (
                  <span style={{ color: '#f59e0b', fontSize: '12px', marginLeft: '8px' }}>
                    Expires {new Date(c.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div style={{ color: '#8899aa', fontSize: '12px' }}>
                {new Date(c.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </div>
            </div>
            <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '15px' }}>
              +{formatMoney(c.amount, 'USD')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
