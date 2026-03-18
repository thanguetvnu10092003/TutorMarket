import { NextResponse } from 'next/server';
import { buildAdminDashboardData } from '@/lib/admin-dashboard';
import { requireAdminSession } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession();
    const data = await buildAdminDashboardData();
    return NextResponse.json({ data: data.analytics });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Admin analytics fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin analytics' }, { status: 500 });
  }
}
