import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAdminAction, requireAdminSession } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: { subject: string } }
) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const { title, description } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const seoMetadata = await prisma.seoMetadata.upsert({
      where: {
        subject: params.subject as any,
      },
      update: {
        title,
        description,
        updatedById: session.user.id,
      },
      create: {
        subject: params.subject as any,
        title,
        description,
        updatedById: session.user.id,
      },
    });

    await recordAdminAction({
      adminId: session.user.id,
      actionType: 'UPDATE_SEO_METADATA',
      metadata: {
        subject: params.subject,
      },
    });

    return NextResponse.json({ data: seoMetadata });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('SEO metadata update error:', error);
    return NextResponse.json({ error: 'Failed to update SEO metadata' }, { status: 500 });
  }
}
