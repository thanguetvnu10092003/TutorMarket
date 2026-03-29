'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const DURATIONS = [30, 60, 90];

export default function PricingManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState('VND');
  const [prices, setPrices] = useState<Record<number, { price: number; isEnabled: boolean }>>({
    30: { price: 0, isEnabled: false },
    60: { price: 0, isEnabled: true },
    90: { price: 0, isEnabled: false },
  });
  const [discount5, setDiscount5] = useState<string>('');
  const [discount10, setDiscount10] = useState<string>('');
  const [discount20, setDiscount20] = useState<string>('');
  const [offerFreeTrial, setOfferFreeTrial] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const rates: Record<string, number> = { VND: 25000, USD: 1, SGD: 1.34 };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/tutor/pricing');
      if (res.ok) {
        const json = await res.json();
        const pMap: Record<number, { price: number; isEnabled: boolean }> = {
          30: { price: 0, isEnabled: false },
          60: { price: 250000, isEnabled: true },
          90: { price: 0, isEnabled: false },
        };
        DURATIONS.forEach((d) => {
          const found = json.data.find((item: any) => item.durationMinutes === d);
          if (found) pMap[d] = { price: found.price, isEnabled: found.isEnabled };
        });
        setPrices(pMap);
        setCurrency(json.data[0]?.currency || 'VND');
        setLastUpdated(json.data[0]?.updatedAt || null);
        setDiscount5(json.discount5 != null ? String(json.discount5) : '');
        setDiscount10(json.discount10 != null ? String(json.discount10) : '');
        setDiscount20(json.discount20 != null ? String(json.discount20) : '');
        setOfferFreeTrial(Boolean(json.offerFreeTrial));
      }
    } catch {
      toast.error('Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    const data = Object.entries(prices).map(([duration, details]) => ({
      durationMinutes: parseInt(duration),
      price: details.price,
      isEnabled: details.isEnabled,
      currency,
    }));

    setSaving(true);
    try {
      const res = await fetch('/api/tutor/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing: data,
          discount5: discount5 !== '' ? parseInt(discount5) : null,
          discount10: discount10 !== '' ? parseInt(discount10) : null,
          discount20: discount20 !== '' ? parseInt(discount20) : null,
          offerFreeTrial,
        }),
      });
      if (res.ok) {
        toast.success('Pricing updated!');
        fetchData();
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="glass-card p-12 animate-pulse text-center">Loading pricing manager...</div>;

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200">Pricing Manager</h2>
          <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-1">Set rates for different session lengths.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-1 bg-navy-50 dark:bg-navy-700 rounded-xl border border-navy-100 dark:border-navy-400/20">
            {['VND', 'USD'].map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                  currency === curr ? 'bg-white dark:bg-navy-500 text-navy-600 dark:text-cream-200 shadow-sm' : 'text-navy-300'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-6 py-2 text-xs font-bold shadow-gold/20 shadow-lg"
          >
            {saving ? 'Updating...' : 'Save Pricing'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Duration Pricing */}
        <div className="space-y-4">
          {DURATIONS.map((dur) => (
            <div
              key={dur}
              className={`p-4 rounded-2xl border transition-all ${
                prices[dur].isEnabled
                  ? 'border-gold-400/40 bg-gold-400/5'
                  : 'border-navy-100 dark:border-navy-400/10 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-navy-600 text-gold-400 flex items-center justify-center font-bold text-xs">
                    {dur}&apos;
                  </div>
                  <h4 className="text-sm font-bold text-navy-600 dark:text-cream-200">{dur} Minutes Session</h4>
                </div>
                <button
                  onClick={() => setPrices((p) => ({ ...p, [dur]: { ...p[dur], isEnabled: !p[dur].isEnabled } }))}
                  className={`relative w-8 h-4 rounded-full transition-colors ${prices[dur].isEnabled ? 'bg-gold-400' : 'bg-navy-200'}`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      prices[dur].isEnabled ? 'translate-x-4 left-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-navy-300">{currency}</span>
                  <input
                    type="number"
                    value={prices[dur].price}
                    onChange={(e) =>
                      setPrices((p) => ({ ...p, [dur]: { ...p[dur], price: parseFloat(e.target.value) || 0 } }))
                    }
                    disabled={!prices[dur].isEnabled}
                    className="input-field w-full pl-12 py-2 text-sm font-bold disabled:bg-transparent"
                  />
                </div>
                <div className="flex-1 px-3 py-2 rounded-xl bg-navy-50 dark:bg-navy-700/50 border border-navy-100 dark:border-navy-400/10">
                  <p className="text-[9px] text-navy-300 font-bold uppercase tracking-tighter mb-0.5">Conversion Preview</p>
                  <p className="text-xs font-black text-navy-600 dark:text-cream-200">
                    {currency === 'VND'
                      ? `$${(prices[dur].price / rates['VND']).toFixed(2)} USD`
                      : `${(prices[dur].price * rates['VND']).toLocaleString()} VND`}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Package Discounts */}
          <div className="p-4 rounded-2xl border border-navy-100 dark:border-navy-400/10 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-navy-400 dark:text-cream-400/60">Package Discounts (optional)</h4>
            {[
              { label: '5-lesson package', value: discount5, setter: setDiscount5 },
              { label: '10-lesson package', value: discount10, setter: setDiscount10 },
              { label: '20-lesson package', value: discount20, setter: setDiscount20 },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-navy-500 dark:text-cream-300 w-36">{label}</span>
                <div className="relative w-24">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder="0"
                    className="input-field w-full pr-8 py-1.5 text-sm font-bold text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-navy-300">%</span>
                </div>
                <span className="text-[10px] text-navy-300">off</span>
              </div>
            ))}
          </div>

          {/* Free Trial Toggle */}
          <div className="p-4 rounded-2xl border border-navy-100 dark:border-navy-400/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-navy-600 dark:text-cream-200">Offer Free Trial</p>
              <p className="text-[10px] text-navy-300 mt-0.5">First 30-min lesson free for new students</p>
            </div>
            <button
              onClick={() => setOfferFreeTrial((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${offerFreeTrial ? 'bg-gold-400' : 'bg-navy-200'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  offerFreeTrial ? 'translate-x-5 left-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Policy panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-navy-600 dark:bg-navy-700 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-gold-400">Policy & Impact</h3>
            <ul className="space-y-4 relative z-10">
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-400/20 flex items-center justify-center flex-shrink-0 text-gold-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <p className="text-xs text-cream-200/80 leading-relaxed">Price changes only apply to new bookings. Existing sessions keep their original rate.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-gold-400/20 flex items-center justify-center flex-shrink-0 text-gold-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <p className="text-xs text-cream-200/80 leading-relaxed">Students see rates converted to their local currency (approximate).</p>
              </li>
              {lastUpdated && (
                <li className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-[10px] uppercase font-black tracking-widest opacity-40">
                  <span>Last Updated</span>
                  <span>{new Date(lastUpdated).toLocaleDateString()}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
