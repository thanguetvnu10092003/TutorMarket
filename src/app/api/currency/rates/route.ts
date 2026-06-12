import { NextResponse } from 'next/server';
import { getExchangeRatesFromDb } from '@/lib/currency-server';

export const revalidate = 3600;

export async function GET() {
  try {
    const rates = await getExchangeRatesFromDb();
    return NextResponse.json({ rates });
  } catch {
    return NextResponse.json({ rates: { USD: 1 } });
  }
}
