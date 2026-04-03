'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Props { onNext: () => void; onBack: () => void; }

const CURRENCIES = [
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', name: 'British Pound' },
  { code: 'VND', symbol: '₫', flag: '🇻🇳', name: 'Vietnamese Dong' },
  { code: 'AUD', symbol: 'A$', flag: '🇦🇺', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', flag: '🇸🇬', name: 'Singapore Dollar' },
];

const DURATIONS = [
  { minutes: 30, label: '30 minutes' },
  { minutes: 60, label: '60 minutes' },
  { minutes: 90, label: '90 minutes' },
  { minutes: 120, label: '120 minutes' },
];

interface PricingRow {
  durationMinutes: number;
  price: string;
  isEnabled: boolean;
  currency: string;
}

export default function Step8Pricing({ onNext, onBack }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [pricing, setPricing] = useState<PricingRow[]>(
    DURATIONS.map(d => ({ durationMinutes: d.minutes, price: '', isEnabled: d.minutes === 60, currency: 'USD' }))
  );

  useEffect(() => {
    fetch('/api/onboarding/step/8').then(r => r.json()).then(d => {
      if (d.data?.pricing?.length > 0) {
        const cur = d.data.pricing[0]?.currency || 'USD';
        setCurrency(cur);
        setPricing(DURATIONS.map(dur => {
          const existing = d.data.pricing.find((p: any) => p.durationMinutes === dur.minutes);
          return {
            durationMinutes: dur.minutes,
            price: existing ? existing.price.toString() : '',
            isEnabled: existing ? existing.isEnabled : dur.minutes === 60,
            currency: cur,
          };
        }));
      }
    }).finally(() => setIsLoading(false));
  }, []);

  const updateRow = (index: number, field: keyof PricingRow, value: any) => {
    setPricing(prev => prev.map((r, i) => i === index ? { ...r, [field]: value, currency } : r));
  };

  const handleCurrencyChange = (code: string) => {
    setCurrency(code);
    setPricing(prev => prev.map(r => ({ ...r, currency: code })));
  };

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';

  // Format a raw price string as an international number with thousands separators
  const formatPrice = (raw: string): string => {
    const num = parseFloat(raw.replace(/,/g, ''));
    if (!raw || isNaN(num)) return raw;
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const handlePriceInput = (index: number, inputVal: string) => {
    // Strip commas so the raw value in state is always a plain number string
    const raw = inputVal.replace(/,/g, '');
    if (/^\d*\.?\d*$/.test(raw)) {
      updateRow(index, 'price', raw);
    }
  };
  const handleSave = async () => {
    const enabled = pricing.filter(p => p.isEnabled);
    if (enabled.length === 0) {
      toast.error('Please enable at least one session duration');
      return;
    }
    for (const p of enabled) {
      if (!p.price || parseFloat(p.price) <= 0) {
        toast.error('Please set a price for all enabled session types');
        return;
      }
    }

    setIsSaving(true);
    try {
      await fetch('/api/onboarding/step/8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing: pricing.map(p => ({ ...p, currency })) }),
      });
      toast.success('🎉 Your tutor profile is ready!');
      onNext(); // This will trigger session update and redirect to dashboard
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="glass-card p-8 text-center text-navy-400">Loading...</div>;

  return (
    <div className="glass-card p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Pricing</h2>
        <p className="text-navy-400 dark:text-cream-400/60 mt-1">Set your session rates. You can change these anytime from your dashboard.</p>
      </div>

      {/* Currency selector */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Currency</label>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => handleCurrencyChange(c.code)}
              className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
                currency === c.code
                  ? 'border-gold-400 bg-gold-400/10 text-gold-500'
                  : 'border-navy-100 dark:border-navy-400/30 text-navy-400 hover:border-gold-300'
              }`}
            >
              {c.flag} {c.code} <span className="text-navy-300 font-normal">({c.symbol})</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-navy-300 dark:text-cream-400/40">Displayed to students in their local currency using live exchange rates.</p>
      </div>

      {/* Session packages table */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-navy-500 dark:text-cream-300">Session Packages</label>
        <div className="rounded-2xl border border-navy-100 dark:border-navy-400/20 overflow-hidden">
          <div className="grid grid-cols-3 bg-navy-50 dark:bg-navy-600/40 px-6 py-3">
            <span className="text-xs font-bold text-navy-400 uppercase tracking-wider">Duration</span>
            <span className="text-xs font-bold text-navy-400 uppercase tracking-wider">Price ({currencySymbol})</span>
            <span className="text-xs font-bold text-navy-400 uppercase tracking-wider text-center">Active</span>
          </div>
          {pricing.map((row, idx) => (
            <div key={row.durationMinutes} className={`grid grid-cols-3 items-center px-6 py-4 border-t border-navy-100 dark:border-navy-400/10 ${!row.isEnabled ? 'opacity-40' : ''}`}>
              <span className="font-bold text-navy-600 dark:text-cream-200">{DURATIONS[idx].label}</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 font-bold text-sm">{currencySymbol}</span>
                <input
                  type="text"
                  disabled={!row.isEnabled}
                  className="input-field pl-8 w-32 disabled:opacity-50"
                  placeholder="0"
                  value={formatPrice(row.price)}
                  onChange={e => handlePriceInput(idx, e.target.value)}
                />
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => updateRow(idx, 'isEnabled', !row.isEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${row.isEnabled ? 'bg-sage-500' : 'bg-navy-200 dark:bg-navy-500'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${row.isEnabled ? 'translate-x-5 left-0' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trial info box */}
      <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-2">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">Free Trial Policy</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Your first session with each new student is always <strong>FREE</strong> (trial session). From session 2 onward, the prices above apply.
          <br/><span className="text-xs mt-1 block opacity-80">Platform fee: 20% up to a $500 cap per student-tutor pair.</span>
        </p>
      </div>

      {/* Final CTA */}
      <div className="flex justify-between items-center pt-4 border-t border-navy-100 dark:border-navy-400/20">
        <button onClick={onBack} className="btn-outline px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2 text-base">
          {isSaving ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving...</>
          ) : (
            <>🎉 Complete Profile</>
          )}
        </button>
      </div>
    </div>
  );
}
