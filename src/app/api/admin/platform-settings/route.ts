import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession, recordAdminAction } from '@/lib/admin';
import { getPlatformSettingsSnapshot, updatePlatformCommissionRate } from '@/lib/platform-settings';

const updateSchema = z.object({
  commissionRate: z.number().min(0).max(1),
});

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession();
    const data = await getPlatformSettingsSnapshot();
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Platform settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to load platform settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();
    const { commissionRate } = updateSchema.parse(body);

    const normalizedRate = await updatePlatformCommissionRate(commissionRate);

    await recordAdminAction({
      adminId: session.user.id,
      actionType: 'UPDATE_PLATFORM_COMMISSION_RATE',
      metadata: {
        commissionRate: normalizedRate,
      },
    });

    return NextResponse.json({
      data: {
        commissionRate: normalizedRate,
        commissionPercent: Number((normalizedRate * 100).toFixed(1)),
      },
      message: 'Commission rate updated',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Platform settings update error:', error);
    return NextResponse.json({ error: 'Failed to update platform settings' }, { status: 500 });
  }
}
