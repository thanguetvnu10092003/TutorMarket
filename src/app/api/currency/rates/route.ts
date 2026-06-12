import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getExchangeRatesFromDb } from '@/lib/currency-server';

const getCachedRates = unstable_cache(
  () => getExchangeRatesFromDb(),
  ['exchange-rates'],
  { revalidate: 3600 }
);

export async function GET() {
  try {
    const rates = await getCachedRates();
    return NextResponse.json({ rates });
  } catch (e) {
    console.error('[currency/rates] DB error:', e);
    return NextResponse.json({ rates: { USD: 1 }, degraded: true }, { status: 503 });
  }
}
