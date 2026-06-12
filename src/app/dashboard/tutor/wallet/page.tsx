'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'react-hot-toast';
import { formatMoney } from '@/lib/currency';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TRANSACTION_ICONS: Record<string, string> = {
  BOOKING_EARNING: '↑',
  REFUND_CREDIT: '↩',
  WITHDRAWAL_REQUEST: '↓',
  WITHDRAWAL_PAID: '↓',
  WITHDRAWAL_CANCELLED: '↩',
  BONUS: '★',
};

const TRANSACTION_COLORS: Record<string, string> = {
  BOOKING_EARNING: '#22c55e',
  REFUND_CREDIT: '#3b82f6',
  WITHDRAWAL_REQUEST: '#f59e0b',
  WITHDRAWAL_PAID: '#ef4444',
  WITHDRAWAL_CANCELLED: '#22c55e',
  BONUS: '#C9A84C',
};

export default function TutorWalletPage() {
  const { format, currency } = useCurrency();
  const [page, setPage] = useState(1);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const { data: walletData, mutate } = useSWR(`/api/wallet?page=${page}`, fetcher);
  const { data: bankData } = useSWR('/api/wallet/bank-accounts', fetcher);

  const available = walletData?.available ?? 0;
  const frozen = walletData?.frozen ?? 0;
  const banks = bankData?.accounts ?? [];

  async function handlePayoutSubmit() {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount < 50) { toast.error('Minimum withdrawal is $50'); return; }
    if (!selectedBankId) { toast.error('Please select a bank account'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: amount, bankAccountId: selectedBankId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Withdrawal request submitted!');
      setShowPayoutModal(false);
      setPayoutAmount('');
      mutate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ color: '#F5F0E8', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        My Wallet
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
          border: '1px solid rgba(201,168,76,0.3)', borderRadius: '16px', padding: '24px',
        }}>
          <div style={{ color: '#C9A84C', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            💰 AVAILABLE BALANCE
          </div>
          <div style={{ color: '#F5F0E8', fontSize: '32px', fontWeight: 700 }}>
            {formatMoney(available, 'USD')}
          </div>
          {currency !== 'USD' && (
            <div style={{ color: '#8899aa', fontSize: '14px', marginTop: '4px' }}>
              ≈ {format(available)}
            </div>
          )}
          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={available < 50}
            style={{
              marginTop: '16px', padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: available >= 50 ? '#C9A84C' : 'rgba(201,168,76,0.2)',
              color: available >= 50 ? '#0A1628' : 'rgba(201,168,76,0.5)',
              fontWeight: 700, cursor: available >= 50 ? 'pointer' : 'not-allowed', fontSize: '14px',
            }}
          >
            {available < 50 ? `Min. $50 to withdraw` : 'Request Withdrawal'}
          </button>
        </div>

        <div style={{
          background: 'rgba(30,58,110,0.2)', border: '1px solid rgba(30,58,110,0.4)',
          borderRadius: '16px', padding: '24px',
        }}>
          <div style={{ color: '#8899aa', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            🔒 FROZEN (PENDING WITHDRAWAL)
          </div>
          <div style={{ color: '#F5F0E8', fontSize: '32px', fontWeight: 700 }}>
            {formatMoney(frozen, 'USD')}
          </div>
          {currency !== 'USD' && (
            <div style={{ color: '#8899aa', fontSize: '14px', marginTop: '4px' }}>
              ≈ {format(frozen)}
            </div>
          )}
          <div style={{ color: '#8899aa', fontSize: '13px', marginTop: '16px' }}>
            Awaiting admin approval
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/dashboard/tutor/wallet/bank-details"
          style={{ color: '#C9A84C', fontSize: '14px', textDecoration: 'none', fontWeight: 600 }}
        >
          ⚙ Manage Bank Accounts →
        </Link>
      </div>

      <h2 style={{ color: '#F5F0E8', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
        Transaction History
      </h2>

      {!walletData && <p style={{ color: '#8899aa' }}>Loading...</p>}

      {walletData?.transactions?.length === 0 && (
        <p style={{ color: '#8899aa' }}>No transactions yet. Complete sessions to earn.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {walletData?.transactions?.map((tx: any) => (
          <div key={tx.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderRadius: '10px',
            background: 'rgba(30,58,110,0.15)', border: '1px solid rgba(30,58,110,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: `${TRANSACTION_COLORS[tx.type]}20`,
                color: TRANSACTION_COLORS[tx.type],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '16px',
              }}>
                {TRANSACTION_ICONS[tx.type] ?? '•'}
              </span>
              <div>
                <div style={{ color: '#F5F0E8', fontSize: '14px', fontWeight: 500 }}>
                  {tx.description}
                </div>
                <div style={{ color: '#8899aa', fontSize: '12px' }}>
                  {new Date(tx.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                color: tx.amount >= 0 ? '#22c55e' : '#ef4444',
                fontWeight: 700, fontSize: '15px',
              }}>
                {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount, 'USD')}
              </div>
              <div style={{ color: '#8899aa', fontSize: '12px' }}>
                Balance: {formatMoney(tx.balanceAfter, 'USD')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {walletData?.pagination?.pages > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'center' }}>
          {Array.from({ length: walletData.pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: p === page ? '#C9A84C' : 'rgba(201,168,76,0.1)',
              color: p === page ? '#0A1628' : '#C9A84C', fontWeight: 600,
            }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {showPayoutModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#0A1628', border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '16px', padding: '32px', width: '420px', maxWidth: '90vw',
          }}>
            <h3 style={{ color: '#F5F0E8', marginBottom: '20px', fontSize: '20px', fontWeight: 700 }}>
              Request Withdrawal
            </h3>
            <label style={{ display: 'block', color: '#8899aa', fontSize: '13px', marginBottom: '6px' }}>
              Amount (USD)
            </label>
            <input
              type="number"
              value={payoutAmount}
              onChange={e => setPayoutAmount(e.target.value)}
              min={50}
              max={available}
              placeholder="50.00"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid rgba(30,58,110,0.5)', background: 'rgba(30,58,110,0.3)',
                color: '#F5F0E8', fontSize: '16px', marginBottom: '16px', boxSizing: 'border-box',
              }}
            />
            <label style={{ display: 'block', color: '#8899aa', fontSize: '13px', marginBottom: '6px' }}>
              Pay to bank account
            </label>
            {banks.length === 0 ? (
              <Link
                href="/dashboard/tutor/wallet/bank-details"
                style={{ color: '#C9A84C', fontSize: '14px' }}
              >
                + Add a bank account first
              </Link>
            ) : (
              <select
                value={selectedBankId}
                onChange={e => setSelectedBankId(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  border: '1px solid rgba(30,58,110,0.5)', background: 'rgba(30,58,110,0.3)',
                  color: '#F5F0E8', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box',
                }}
              >
                <option value="">Select bank account</option>
                {banks.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName ? `${b.bankName} — ${b.accountNumber}` : b.accountName}
                  </option>
                ))}
              </select>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button onClick={() => setShowPayoutModal(false)} style={{
                flex: 1, padding: '10px', borderRadius: '8px',
                border: '1px solid rgba(30,58,110,0.5)', background: 'transparent',
                color: '#8899aa', cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={handlePayoutSubmit} disabled={submitting} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                background: '#C9A84C', color: '#0A1628', fontWeight: 700, cursor: 'pointer',
              }}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
