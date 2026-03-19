import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession, recordAdminAction } from '@/lib/admin';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(_req.url);
    const byCertificationId = searchParams.get('byCertificationId') === 'true';

    // @ts-ignore
    const request = await prisma.gmatVerificationRequest.findFirst({
      where: byCertificationId 
        ? { tutorCertificationId: params.id } 
        : { id: params.id },
      include: {
        tutorCertification: {
          include: {
            tutorProfile: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!request) {
      return NextResponse.json({ error: 'GMAT Request not found' }, { status: 404 });
    }

    try {
      const email = decrypt(request.encryptedEmail);
      const password = decrypt(request.encryptedPassword);

      return NextResponse.json({
        credentials: {
          email,
          password,
          tutorName: request.tutorCertification.tutorProfile.user.name
        }
      });
    } catch (decryptError) {
      console.error('Decryption error:', decryptError);
      return NextResponse.json({ error: 'Failed to decrypt credentials' }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GMAT fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();
    const { action } = await req.json();

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // @ts-ignore
    const gmatRequest = await prisma.gmatVerificationRequest.findUnique({
      where: { id: params.id },
      include: {
        tutorCertification: true
      }
    });

    if (!gmatRequest) {
      return NextResponse.json({ error: 'GMAT Request not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Update the GMAT request status
      // @ts-ignore
      await tx.gmatVerificationRequest.update({
        where: { id: params.id },
        data: {
          usedAt: new Date(),
          // We don't have a status field on GmatVerificationRequest itself, 
          // it's handled via the certification status
        }
      });

      // Update the certification
      await tx.tutorCertification.update({
        where: { id: gmatRequest.tutorCertificationId },
        data: {
          status: action === 'APPROVE' ? 'VERIFIED' : 'REJECTED',
          verifiedAt: action === 'APPROVE' ? new Date() : null,
          verifiedById: action === 'APPROVE' ? session.user.id : null,
          notes: action === 'APPROVE' ? 'Verified via MBA.com' : 'GMAT verification failed'
        }
      });
    });

    await recordAdminAction({
      adminId: session.user.id,
      actionType: action === 'APPROVE' ? 'APPROVE_GMAT_VERIFICATION' : 'REJECT_GMAT_VERIFICATION',
      metadata: { requestId: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GMAT status update error:', error);
    return NextResponse.json({ error: 'Failed to update GMAT status' }, { status: 500 });
  }
}
