'use client';

import { useState, useRef, useEffect } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CURRENCY_META, type CurrencyCode } from '@/lib/currency';

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', VND: '🇻🇳', JPY: '🇯🇵',
  AUD: '🇦🇺', CAD: '🇨🇦', SGD: '🇸🇬', KRW: '🇰🇷', CNY: '🇨🇳',
  HKD: '🇭🇰', INR: '🇮🇳', THB: '🇹🇭', MYR: '🇲🇾', IDR: '🇮🇩',
  PHP: '🇵🇭', CHF: '🇨🇭', AED: '🇦🇪', SAR: '🇸🇦', NZD: '🇳🇿',
  MXN: '🇲🇽', BRL: '🇧🇷', QAR: '🇶🇦', KWD: '🇰🇼', BHD: '🇧🇭',
  OMR: '🇴🇲', ARS: '🇦🇷',
};

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currencies = Object.keys(CURRENCY_META) as CurrencyCode[];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(201,168,76,0.25)',
          background: 'rgba(201,168,76,0.08)',
          color: '#C9A84C',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{CURRENCY_FLAGS[currency] ?? '💱'}</span>
        <span>{currency}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 9999,
            background: '#0A1628',
            border: '1px solid rgba(30,58,110,0.5)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            minWidth: '220px',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '6px',
          }}
        >
          {currencies.map(code => (
            <button
              key={code}
              onClick={() => { setCurrency(code); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                background: code === currency ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: code === currency ? '#C9A84C' : '#F5F0E8',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>{CURRENCY_FLAGS[code] ?? '💱'}</span>
              <span style={{ fontWeight: 600 }}>{code}</span>
              <span style={{ opacity: 0.6, fontSize: '12px' }}>
                {new Intl.DisplayNames(['en'], { type: 'currency' }).of(code)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
