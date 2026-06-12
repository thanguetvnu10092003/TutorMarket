import 'server-only';
import prisma from '@/lib/prisma';
import { CURRENCY_META } from '@/lib/currency';

export async function getExchangeRatesFromDb(): Promise<Record<string, number>> {
  const rates = await prisma.exchangeRate.findMany();
  const map: Record<string, number> = { USD: 1 };
  for (const r of rates) {
    map[r.currency] = r.rateToUsd;
  }
  return map;
}

export async function refreshExchangeRates(): Promise<void> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) throw new Error('EXCHANGE_RATE_API_KEY not set');

  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);

  const data = await res.json();
  if (!data || typeof data.conversion_rates !== 'object') {
    throw new Error('Unexpected response shape from exchange rate API');
  }
  const apiRates = data.conversion_rates as Record<string, number>;

  const currencies = Object.keys(CURRENCY_META).filter(c => c !== 'USD');

  await prisma.$transaction(
    currencies.map(currency =>
      prisma.exchangeRate.upsert({
        where: { currency },
        update: { rateToUsd: apiRates[currency] ?? CURRENCY_META[currency as keyof typeof CURRENCY_META].usdRate },
        create: { currency, rateToUsd: apiRates[currency] ?? CURRENCY_META[currency as keyof typeof CURRENCY_META].usdRate },
      })
    )
  );
}
