import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAdminAction, requireAdminSession } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const { code, type, value, expiryDate, usageLimit } = body;

    if (!code || !type || typeof value !== 'number' || !expiryDate || typeof usageLimit !== 'number') {
      return NextResponse.json({ error: 'Missing required campaign fields' }, { status: 400 });
    }

    const campaign = await prisma.discountCampaign.create({
      data: {
        code: code.toUpperCase(),
        type,
        value,
        expiryDate: new Date(expiryDate),
        usageLimit,
        createdById: session.user.id,
      },
    });

    await recordAdminAction({
      adminId: session.user.id,
      actionType: 'CREATE_DISCOUNT_CAMPAIGN',
      metadata: {
        campaignId: campaign.id,
        code: campaign.code,
        type: campaign.type,
        value: campaign.value,
      },
    });

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Campaign creation error:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
