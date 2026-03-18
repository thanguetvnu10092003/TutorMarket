import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processVerificationDecision, requireAdminSession } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminSession();

    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        certifications: true,
        credentials: true,
        education: true,
        tutorLanguages: true,
        pricing: true,
        verificationLogs: {
          include: {
            admin: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tutor) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ data: tutor });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Verification detail fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch application detail' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const { decision, notes, reasonCategory, requestedDocument, certificationChecklist } = body;

    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    if (decision === 'REJECT' && !notes) {
      return NextResponse.json({ error: 'Notes are required for rejection' }, { status: 400 });
    }

    await processVerificationDecision({
      adminId: session.user.id,
      tutorProfileId: params.id,
      decision,
      notes,
      reasonCategory,
      requestedDocument,
      certificationChecklist,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Admin verification update error:', error);
    return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 });
  }
}
