import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { refreshExchangeRates } from '@/lib/currency-server';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await refreshExchangeRates();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[currency/refresh]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
