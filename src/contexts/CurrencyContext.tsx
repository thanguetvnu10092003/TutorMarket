'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getCurrencyForLocation,
  formatMoney,
  roundCurrencyAmount,
  CURRENCY_META,
  type CurrencyCode,
} from '@/lib/currency';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  rates: Record<string, number>;
  convert: (usdAmount: number) => number;
  format: (usdAmount: number) => string;
  symbol: string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  rates: { USD: 1 },
  convert: v => v,
  format: v => `$${v.toFixed(2)}`,
  symbol: '$',
  isLoading: true,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('preferred_currency') as CurrencyCode | null;
    const detected = saved || getCurrencyForLocation({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setCurrencyState(detected as CurrencyCode);

    fetch('/api/currency/rates')
      .then(r => r.json())
      .then(data => { if (data.rates) setRates(data.rates); })
      .catch((e) => { console.error('[CurrencyContext] Failed to fetch rates:', e); })
      .finally(() => setIsLoading(false));
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem('preferred_currency', code);
  };

  const convert = (usdAmount: number) => {
    const rate = rates[currency] ?? CURRENCY_META[currency]?.usdRate ?? 1;
    return roundCurrencyAmount(usdAmount * rate, currency);
  };

  const format = (usdAmount: number) =>
    formatMoney(convert(usdAmount), currency);

  const meta = CURRENCY_META[currency];
  const symbol = new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(0).replace(/[\d,.\s]/g, '').trim();

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convert, format, symbol, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
