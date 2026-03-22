import { NextResponse } from 'next/server';
import { buildAdminDashboardData, type AnalyticsPeriod } from '@/lib/admin-dashboard';
import { requireAdminSession } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const VALID_PERIODS = new Set<AnalyticsPeriod>(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'ALL_TIME']);

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const url = new URL(request.url);
    const requestedPeriod = (url.searchParams.get('period') || 'ALL_TIME') as AnalyticsPeriod;
    const period = VALID_PERIODS.has(requestedPeriod) ? requestedPeriod : 'ALL_TIME';
    const data = await buildAdminDashboardData(period);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Admin dashboard fetch error:', error);
    return NextResponse.json({ error: 'Failed to load admin dashboard' }, { status: 500 });
  }
}
