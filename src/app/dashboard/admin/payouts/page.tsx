'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#3b82f6',
  PAID: '#22c55e',
  REJECTED: '#ef4444',
};

function exportCsv(payouts: any[]) {
  const pending = payouts.filter(p => p.status === 'PENDING' || p.status === 'APPROVED');
  const rows = [
    ['Tutor Name', 'Email', 'Amount USD', 'Bank', 'Account Number', 'Account Name', 'Country', 'Requested At'],
    ...pending.map(p => [
      p.tutor.name, p.tutor.email, Number(p.amountUsd).toFixed(2),
      p.bankAccount?.bankName ?? p.bankAccount?.swiftCode ?? '',
      p.bankAccount?.accountNumber ?? p.bankAccount?.iban ?? '',
      p.bankAccount?.accountName ?? '',
      p.bankAccount?.country ?? '',
      new Date(p.createdAt).toLocaleDateString(),
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPayoutsPage() {
  const { data, mutate } = useSWR('/api/admin/payouts', fetcher);
  const payouts = data?.payouts ?? [];
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [refreshingRates, setRefreshingRates] = useState(false);
  const { data: ratesData, mutate: mutateRates } = useSWR('/api/currency/rates', fetcher);

  async function updateStatus(id: string, status: string, extra: Record<string, string> = {}) {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error); return; }
      toast.success(`Payout marked as ${status}`);
      mutate();
    } finally {
      setProcessing(null);
    }
  }

  async function handleRefreshRates() {
    setRefreshingRates(true);
    try {
      const res = await fetch('/api/currency/refresh', { method: 'POST' });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error); return; }
      toast.success('Exchange rates refreshed!');
      mutateRates();
    } finally {
      setRefreshingRates(false);
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#F5F0E8', fontSize: '28px', fontWeight: 700 }}>Payout Requests</h1>
        <button onClick={() => exportCsv(payouts)} style={{
          padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)',
          background: 'rgba(201,168,76,0.1)', color: '#C9A84C', cursor: 'pointer', fontWeight: 600,
        }}>
          Export CSV
        </button>
      </div>

      {/* Exchange rates panel */}
      <div style={{ marginBottom: '28px', padding: '16px 20px', borderRadius: '12px',
        border: '1px solid rgba(30,58,110,0.4)', background: 'rgba(30,58,110,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ color: '#F5F0E8', fontWeight: 600 }}>Exchange Rates (USD base)</span>
          <button onClick={handleRefreshRates} disabled={refreshingRates} style={{
            padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(201,168,76,0.3)',
            background: 'rgba(201,168,76,0.1)', color: '#C9A84C', cursor: 'pointer', fontSize: '13px',
          }}>
            {refreshingRates ? 'Refreshing...' : 'Refresh Rates Now'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ratesData?.rates && Object.entries(ratesData.rates)
            .filter(([code]) => code !== 'USD')
            .slice(0, 12)
            .map(([code, rate]) => (
              <span key={code} style={{ padding: '4px 10px', borderRadius: '20px',
                background: 'rgba(30,58,110,0.3)', color: '#8899aa', fontSize: '12px' }}>
                {code}: {(rate as number).toLocaleString()}
              </span>
            ))}
        </div>
      </div>

      {payouts.length === 0 && <p style={{ color: '#8899aa' }}>No payout requests yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {payouts.map((p: any) => (
          <div key={p.id} style={{
            padding: '20px', borderRadius: '12px',
            border: '1px solid rgba(30,58,110,0.4)',
            background: 'rgba(30,58,110,0.12)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#F5F0E8', fontWeight: 600 }}>{p.tutor.name}</div>
                <div style={{ color: '#8899aa', fontSize: '13px' }}>{p.tutor.email}</div>
                <div style={{ color: '#8899aa', fontSize: '12px', marginTop: '4px' }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div>
                {p.bankAccount ? (
                  <>
                    <div style={{ color: '#F5F0E8', fontSize: '13px' }}>
                      {p.bankAccount.bankName ?? p.bankAccount.swiftCode ?? 'Bank'}
                    </div>
                    <div style={{ color: '#8899aa', fontSize: '12px' }}>
                      {p.bankAccount.accountNumber ?? p.bankAccount.iban}
                    </div>
                    <div style={{ color: '#8899aa', fontSize: '12px' }}>
                      {p.bankAccount.accountName} · {p.bankAccount.country}
                    </div>
                  </>
                ) : (
                  <span style={{ color: '#f59e0b', fontSize: '13px' }}>No bank account</span>
                )}
              </div>

              <div>
                <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '18px' }}>
                  ${Number(p.amountUsd).toFixed(2)}
                </div>
                <span style={{
                  display: 'inline-block', padding: '3px 8px', borderRadius: '20px',
                  fontSize: '11px', fontWeight: 600, marginTop: '4px',
                  background: `${STATUS_COLORS[p.status]}20`,
                  color: STATUS_COLORS[p.status],
                }}>
                  {p.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {p.status === 'PENDING' && (
                  <button onClick={() => updateStatus(p.id, 'APPROVED')}
                    disabled={processing === p.id}
                    style={{ padding: '7px 12px', borderRadius: '6px', border: 'none',
                      background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    Approve
                  </button>
                )}
                {(p.status === 'PENDING' || p.status === 'APPROVED') && (
                  <button onClick={() => updateStatus(p.id, 'PAID')}
                    disabled={processing === p.id}
                    style={{ padding: '7px 12px', borderRadius: '6px', border: 'none',
                      background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    Mark Paid
                  </button>
                )}
                {(p.status === 'PENDING' || p.status === 'APPROVED') && (
                  <button onClick={() => { setRejectId(p.id); setRejectReason(''); }}
                    disabled={processing === p.id}
                    style={{ padding: '7px 12px', borderRadius: '6px', border: 'none',
                      background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>
                    Reject
                  </button>
                )}
              </div>
            </div>

            {p.adminNote && (
              <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px',
                background: 'rgba(59,130,246,0.1)', color: '#8899aa', fontSize: '13px' }}>
                Note: {p.adminNote}
              </div>
            )}
            {p.rejectionReason && (
              <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px',
                background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px' }}>
                Rejected: {p.rejectionReason}
              </div>
            )}
          </div>
        ))}
      </div>

      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0A1628', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '14px', padding: '28px', width: '400px' }}>
            <h3 style={{ color: '#F5F0E8', marginBottom: '14px' }}>Reason for Rejection</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Explain why this request is being rejected..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', boxSizing: 'border-box',
                border: '1px solid rgba(30,58,110,0.5)', background: 'rgba(30,58,110,0.3)',
                color: '#F5F0E8', fontSize: '14px', resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button onClick={() => setRejectId(null)} style={{ flex: 1, padding: '10px',
                borderRadius: '8px', border: '1px solid rgba(30,58,110,0.5)',
                background: 'transparent', color: '#8899aa', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => { updateStatus(rejectId, 'REJECTED', { rejectionReason: rejectReason }); setRejectId(null); }}
                disabled={!rejectReason.trim()}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
