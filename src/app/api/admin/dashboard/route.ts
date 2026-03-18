import { NextResponse } from 'next/server';
import { buildAdminDashboardData } from '@/lib/admin-dashboard';
import { requireAdminSession } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession();
    const data = await buildAdminDashboardData();
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Admin dashboard fetch error:', error);
    return NextResponse.json({ error: 'Failed to load admin dashboard' }, { status: 500 });
  }
}
