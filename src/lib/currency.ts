export type CurrencyCode =
  | 'USD'
  | 'VND'
  | 'EUR'
  | 'GBP'
  | 'SGD'
  | 'AUD'
  | 'CAD'
  | 'JPY'
  | 'KRW'
  | 'CNY'
  | 'HKD'
  | 'INR'
  | 'THB'
  | 'MYR'
  | 'IDR'
  | 'PHP'
  | 'CHF'
  | 'AED'
  | 'SAR'
  | 'QAR'
  | 'KWD'
  | 'BHD'
  | 'OMR'
  | 'NZD'
  | 'MXN'
  | 'BRL'
  | 'ARS';

type CurrencyMeta = {
  locale: string;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
  usdRate: number;
};

const EURO_COUNTRY_CODES = new Set([
  'AT',
  'BE',
  'CY',
  'DE',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PT',
  'SI',
  'SK',
]);

const COUNTRY_CURRENCY_MAP: Partial<Record<string, CurrencyCode>> = {
  AE: 'AED',
  AR: 'ARS',
  AU: 'AUD',
  BH: 'BHD',
  BR: 'BRL',
  CA: 'CAD',
  CH: 'CHF',
  CN: 'CNY',
  GB: 'GBP',
  HK: 'HKD',
  ID: 'IDR',
  IN: 'INR',
  JP: 'JPY',
  KR: 'KRW',
  KW: 'KWD',
  MX: 'MXN',
  MY: 'MYR',
  NZ: 'NZD',
  OM: 'OMR',
  PH: 'PHP',
  QA: 'QAR',
  SA: 'SAR',
  SG: 'SGD',
  TH: 'THB',
  US: 'USD',
  VN: 'VND',
};

const TIMEZONE_CURRENCY_HINTS: Array<{ prefix: string; currency: CurrencyCode }> = [
  { prefix: 'Asia/Ho_Chi_Minh', currency: 'VND' },
  { prefix: 'Asia/Bangkok', currency: 'THB' },
  { prefix: 'Asia/Singapore', currency: 'SGD' },
  { prefix: 'Asia/Tokyo', currency: 'JPY' },
  { prefix: 'Asia/Seoul', currency: 'KRW' },
  { prefix: 'Asia/Shanghai', currency: 'CNY' },
  { prefix: 'Europe/', currency: 'EUR' },
  { prefix: 'America/', currency: 'USD' },
  { prefix: 'Pacific/Auckland', currency: 'NZD' },
  { prefix: 'Australia/', currency: 'AUD' },
];

export const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  USD: { locale: 'en-US', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 1 },
  VND: { locale: 'vi-VN', minimumFractionDigits: 0, maximumFractionDigits: 0, usdRate: 25500 },
  EUR: { locale: 'de-DE', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 0.92 },
  GBP: { locale: 'en-GB', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 0.79 },
  SGD: { locale: 'en-SG', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 1.34 },
  AUD: { locale: 'en-AU', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 1.52 },
  CAD: { locale: 'en-CA', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 1.36 },
  JPY: { locale: 'ja-JP', minimumFractionDigits: 0, maximumFractionDigits: 0, usdRate: 150 },
  KRW: { locale: 'ko-KR', minimumFractionDigits: 0, maximumFractionDigits: 0, usdRate: 1330 },
  CNY: { locale: 'zh-CN', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 7.18 },
  HKD: { locale: 'zh-HK', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 7.82 },
  INR: { locale: 'en-IN', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 83.1 },
  THB: { locale: 'th-TH', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 35.9 },
  MYR: { locale: 'ms-MY', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 4.72 },
  IDR: { locale: 'id-ID', minimumFractionDigits: 0, maximumFractionDigits: 0, usdRate: 15800 },
  PHP: { locale: 'en-PH', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 57.3 },
  CHF: { locale: 'de-CH', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 0.89 },
  AED: { locale: 'en-AE', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 3.67 },
  SAR: { locale: 'ar-SA', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 3.75 },
  QAR: { locale: 'en-QA', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 3.64 },
  KWD: { locale: 'en-KW', minimumFractionDigits: 0, maximumFractionDigits: 3, usdRate: 0.31 },
  BHD: { locale: 'en-BH', minimumFractionDigits: 0, maximumFractionDigits: 3, usdRate: 0.38 },
  OMR: { locale: 'en-OM', minimumFractionDigits: 0, maximumFractionDigits: 3, usdRate: 0.38 },
  NZD: { locale: 'en-NZ', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 1.65 },
  MXN: { locale: 'es-MX', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 16.9 },
  BRL: { locale: 'pt-BR', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 5.05 },
  ARS: { locale: 'es-AR', minimumFractionDigits: 0, maximumFractionDigits: 2, usdRate: 1060 },
};

function normalizeCurrencyCode(currency?: string | null): CurrencyCode {
  const upper = currency?.toUpperCase() as CurrencyCode | undefined;

  if (upper && upper in CURRENCY_META) {
    return upper;
  }

  return 'USD';
}

export function getCurrencyForLocation(input: {
  preferredCurrency?: string | null;
  countryCode?: string | null;
  timezone?: string | null;
}) {
  const explicit = normalizeCurrencyCode(input.preferredCurrency);

  if (input.preferredCurrency && explicit) {
    return explicit;
  }

  const countryCode = input.countryCode?.toUpperCase();

  if (countryCode) {
    if (EURO_COUNTRY_CODES.has(countryCode)) {
      return 'EUR';
    }

    const countryCurrency = COUNTRY_CURRENCY_MAP[countryCode];
    if (countryCurrency) {
      return countryCurrency;
    }
  }

  if (input.timezone) {
    const matched = TIMEZONE_CURRENCY_HINTS.find((entry) => input.timezone?.startsWith(entry.prefix));
    if (matched) {
      return matched.currency;
    }
  }

  return 'USD';
}

export function convertAmount(amount: number, fromCurrency?: string | null, toCurrency?: string | null) {
  const source = CURRENCY_META[normalizeCurrencyCode(fromCurrency)];
  const target = CURRENCY_META[normalizeCurrencyCode(toCurrency)];

  if (!source || !target) {
    return amount;
  }

  const amountInUsd = amount / source.usdRate;
  return amountInUsd * target.usdRate;
}

export function roundCurrencyAmount(amount: number, currency?: string | null) {
  const normalized = normalizeCurrencyCode(currency);
  const meta = CURRENCY_META[normalized];
  const precision = meta.maximumFractionDigits;
  const factor = Math.pow(10, precision);
  return Math.round(amount * factor) / factor;
}

export function formatMoney(
  amount: number,
  currency?: string | null,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
) {
  const normalized = normalizeCurrencyCode(currency);
  const meta = CURRENCY_META[normalized];

  return new Intl.NumberFormat(options?.locale || meta.locale, {
    style: 'currency',
    currency: normalized,
    minimumFractionDigits: options?.minimumFractionDigits ?? meta.minimumFractionDigits,
    maximumFractionDigits: options?.maximumFractionDigits ?? meta.maximumFractionDigits,
  }).format(amount);
}

export function formatApproximateMoney(
  amount: number,
  currency?: string | null,
  options?: {
    locale?: string;
  }
) {
  return `~${formatMoney(roundCurrencyAmount(amount, currency), currency, options)}`;
}

export function getPrimaryPriceOption<T extends { durationMinutes: number; price: number; isEnabled: boolean; currency?: string | null }>(
  pricingOptions: T[] | undefined | null
) {
  const enabled = (pricingOptions || []).filter((option) => option.isEnabled && option.price > 0);

  if (enabled.length === 0) {
    return null;
  }

  const exactHour = enabled.find((option) => option.durationMinutes === 60);
  if (exactHour) {
    return exactHour;
  }

  return [...enabled].sort((left, right) => left.durationMinutes - right.durationMinutes)[0];
}

export function buildDisplayPrice(input: {
  amount: number;
  originalCurrency?: string | null;
  viewerCurrency?: string | null;
}) {
  const originalCurrency = normalizeCurrencyCode(input.originalCurrency);
  const viewerCurrency = normalizeCurrencyCode(input.viewerCurrency);
  const convertedAmount = roundCurrencyAmount(
    convertAmount(input.amount, originalCurrency, viewerCurrency),
    viewerCurrency
  );
  const usesConversion = originalCurrency !== viewerCurrency;

  return {
    originalAmount: input.amount,
    originalCurrency,
    convertedAmount,
    convertedCurrency: viewerCurrency,
    displayAmount: usesConversion ? convertedAmount : input.amount,
    displayCurrency: usesConversion ? viewerCurrency : originalCurrency,
    usesConversion,
    formatted: formatMoney(usesConversion ? convertedAmount : input.amount, usesConversion ? viewerCurrency : originalCurrency),
    originalFormatted: formatMoney(input.amount, originalCurrency),
    approximateFormatted: usesConversion ? formatApproximateMoney(convertedAmount, viewerCurrency) : null,
  };
}
