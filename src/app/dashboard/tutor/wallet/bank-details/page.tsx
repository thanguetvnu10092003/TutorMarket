'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

const VN_BANKS = [
  'Techcombank', 'MB Bank', 'Vietcombank', 'BIDV', 'Agribank',
  'VPBank', 'TPBank', 'ACB', 'Sacombank', 'VietinBank',
];

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function BankDetailsPage() {
  const router = useRouter();
  const { data, mutate } = useSWR('/api/wallet/bank-accounts', fetcher);
  const accounts = data?.accounts ?? [];

  const [country, setCountry] = useState('VN');
  const [form, setForm] = useState({
    bankName: '', accountNumber: '', accountName: '', bankBranch: '',
    swiftCode: '', iban: '', routingNumber: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/wallet/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, ...form }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error); return; }
      toast.success('Bank account added!');
      setForm({ bankName: '', accountNumber: '', accountName: '', bankBranch: '', swiftCode: '', iban: '', routingNumber: '' });
      mutate();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/wallet/bank-accounts/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error); return; }
      toast.success('Account removed');
      mutate();
    } finally {
      setDeleting(null);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid rgba(30,58,110,0.5)', background: 'rgba(30,58,110,0.3)',
    color: '#F5F0E8', fontSize: '14px', boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block', color: '#8899aa', fontSize: '13px',
    marginBottom: '4px', marginTop: '14px',
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 20px' }}>
      <button onClick={() => router.back()} style={{
        background: 'none', border: 'none', color: '#C9A84C',
        cursor: 'pointer', fontSize: '14px', marginBottom: '20px',
      }}>
        ← Back to Wallet
      </button>
      <h1 style={{ color: '#F5F0E8', fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
        Bank Accounts
      </h1>

      {accounts.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          {accounts.map((acc: any) => (
            <div key={acc.id} style={{
              padding: '16px', borderRadius: '10px', marginBottom: '10px',
              border: `1px solid ${acc.isPrimary ? 'rgba(201,168,76,0.4)' : 'rgba(30,58,110,0.4)'}`,
              background: 'rgba(30,58,110,0.15)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: '#F5F0E8', fontWeight: 600 }}>
                    {acc.bankName ?? acc.swiftCode ?? 'Bank Account'}
                    {acc.isPrimary && <span style={{ color: '#C9A84C', fontSize: '12px', marginLeft: '8px' }}>Primary</span>}
                  </div>
                  <div style={{ color: '#8899aa', fontSize: '13px', marginTop: '4px' }}>
                    {acc.accountNumber && `Account: ${acc.accountNumber} · `}
                    {acc.accountName}
                  </div>
                  <div style={{ color: '#8899aa', fontSize: '12px' }}>{acc.country}</div>
                </div>
                <button
                  onClick={() => handleDelete(acc.id)}
                  disabled={deleting === acc.id}
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444', padding: '6px 12px', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '12px',
                  }}
                >
                  {deleting === acc.id ? '...' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ color: '#F5F0E8', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
        Add Bank Account
      </h2>

      <label style={labelStyle}>Country</label>
      <select value={country} onChange={e => setCountry(e.target.value)} style={inputStyle}>
        <option value="VN">🇻🇳 Vietnam</option>
        <option value="US">🇺🇸 United States</option>
        <option value="GB">🇬🇧 United Kingdom</option>
        <option value="EU">🇪🇺 Europe (IBAN)</option>
        <option value="SG">🇸🇬 Singapore</option>
        <option value="AU">🇦🇺 Australia</option>
        <option value="OTHER">🌐 Other International</option>
      </select>

      {country === 'VN' ? (
        <>
          <label style={labelStyle}>Bank Name *</label>
          <select value={form.bankName} onChange={e => set('bankName', e.target.value)} style={inputStyle}>
            <option value="">Select bank</option>
            {VN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <label style={labelStyle}>Account Number *</label>
          <input value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)}
            placeholder="e.g. 19034567890123" style={inputStyle} />

          <label style={labelStyle}>Account Name (as on bank card) *</label>
          <input value={form.accountName} onChange={e => set('accountName', e.target.value)}
            placeholder="e.g. NGUYEN VAN A" style={inputStyle} />

          <label style={labelStyle}>Bank Branch (optional)</label>
          <input value={form.bankBranch} onChange={e => set('bankBranch', e.target.value)}
            placeholder="e.g. Ho Chi Minh City" style={inputStyle} />
        </>
      ) : (
        <>
          <label style={labelStyle}>Account Name *</label>
          <input value={form.accountName} onChange={e => set('accountName', e.target.value)}
            placeholder="Full name on account" style={inputStyle} />

          <label style={labelStyle}>SWIFT / BIC Code</label>
          <input value={form.swiftCode} onChange={e => set('swiftCode', e.target.value)}
            placeholder="e.g. DEUTDEDB" style={inputStyle} />

          <label style={labelStyle}>IBAN (Europe)</label>
          <input value={form.iban} onChange={e => set('iban', e.target.value)}
            placeholder="e.g. DE89 3704 0044 0532 0130 00" style={inputStyle} />

          <label style={labelStyle}>Routing Number (US ACH)</label>
          <input value={form.routingNumber} onChange={e => set('routingNumber', e.target.value)}
            placeholder="e.g. 021000021" style={inputStyle} />
        </>
      )}

      <button onClick={handleSave} disabled={saving} style={{
        marginTop: '24px', padding: '12px 28px', borderRadius: '8px', border: 'none',
        background: '#C9A84C', color: '#0A1628', fontWeight: 700,
        cursor: saving ? 'not-allowed' : 'pointer', fontSize: '15px',
      }}>
        {saving ? 'Saving...' : 'Save Bank Account'}
      </button>
    </div>
  );
}
