import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession, recordAdminAction } from '@/lib/admin';
import { decrypt } from '@/lib/encryption';
import { createInAppNotification } from '@/lib/in-app-notifications';
import { formatDateTime } from '@/lib/utils';

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
        },
        certification: {
          id: request.tutorCertification.id,
          type: request.tutorCertification.type,
          levelOrVariant: request.tutorCertification.levelOrVariant,
          score: request.tutorCertification.score,
          percentiles: request.tutorCertification.percentiles,
          testDate: request.tutorCertification.testDate,
          fileUrl: request.tutorCertification.fileUrl,
          status: request.tutorCertification.status,
          selfReportedData: request.tutorCertification.selfReportedData,
        },
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
    const { action, remarks } = await req.json();

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // @ts-ignore
    const gmatRequest = await prisma.gmatVerificationRequest.findUnique({
      where: { id: params.id },
      include: {
        tutorCertification: {
          include: {
            tutorProfile: {
              select: {
                userId: true,
                verificationStatus: true,
              },
            },
          },
        },
      }
    });

    if (!gmatRequest) {
      return NextResponse.json({ error: 'GMAT Request not found' }, { status: 404 });
    }

    let finalCertificationStatus = gmatRequest.tutorCertification.status;
    let tutorUserId: string | null = gmatRequest.tutorCertification.tutorProfile?.userId || null;
    let previousVerificationStatus = gmatRequest.tutorCertification.tutorProfile?.verificationStatus || null;
    let shouldNotifyTutorApproval = false;

    await prisma.$transaction(async (tx) => {
      const freshRequest: any = await tx.gmatVerificationRequest.findUnique({
        where: { id: params.id },
      });

      if (!freshRequest) {
        throw new Error('GMAT_REQUEST_NOT_FOUND');
      }

      if (action === 'APPROVE') {
        const portalVerifiedAt = new Date();
        const documentReviewedAt = freshRequest.documentReviewedAt;
        const isFullyVerified = !!documentReviewedAt;

        // @ts-ignore
        await tx.gmatVerificationRequest.update({
          where: { id: params.id },
          data: {
            usedAt: portalVerifiedAt,
            portalVerifiedAt,
            portalVerifiedById: session.user.id,
            reviewNotes: remarks || 'MBA.com review completed by admin',
            rejectionReason: null,
          }
        });

        finalCertificationStatus = isFullyVerified ? 'VERIFIED' : 'PENDING_VERIFICATION';

        await tx.tutorCertification.update({
          where: { id: gmatRequest.tutorCertificationId },
          data: {
            status: finalCertificationStatus,
            rejectionReason: null,
            verifiedAt: isFullyVerified ? portalVerifiedAt : null,
            verifiedById: isFullyVerified ? session.user.id : null,
            notes: isFullyVerified
              ? 'GMAT verified via MBA.com and document review'
              : 'MBA.com credentials verified. Awaiting document review.',
          }
        });
      } else {
        // @ts-ignore
        await tx.gmatVerificationRequest.update({
          where: { id: params.id },
          data: {
            usedAt: new Date(),
            rejectionReason: remarks || 'GMAT verification failed',
            reviewNotes: remarks || 'Rejected during MBA.com verification',
          }
        });

        finalCertificationStatus = 'REJECTED';

        await tx.tutorCertification.update({
          where: { id: gmatRequest.tutorCertificationId },
          data: {
            status: 'REJECTED',
            rejectionReason: remarks || 'GMAT verification failed',
            verifiedAt: null,
            verifiedById: null,
            notes: remarks || 'GMAT verification failed',
          }
        });
      }

      const allCerts = await tx.tutorCertification.findMany({
        where: { tutorProfileId: gmatRequest.tutorCertification.tutorProfileId },
      });

      const hasVerifiedCert = allCerts.some((cert: any) => cert.status === 'VERIFIED');
      const allRejected = allCerts.length > 0 && allCerts.every((cert: any) => cert.status === 'REJECTED');

      await tx.tutorProfile.update({
        where: { id: gmatRequest.tutorCertification.tutorProfileId },
        data: {
          verificationStatus: hasVerifiedCert ? 'APPROVED' : allRejected ? 'REJECTED' : 'PENDING',
          badgeType: hasVerifiedCert ? 'VERIFIED' : allRejected ? 'NOT_VERIFIED' : 'NONE',
        },
      });

      shouldNotifyTutorApproval =
        previousVerificationStatus !== 'APPROVED' &&
        hasVerifiedCert;
    });

    if (shouldNotifyTutorApproval && tutorUserId) {
      await createInAppNotification({
        userId: tutorUserId,
        type: 'TUTOR_VERIFIED',
        title: 'Your tutor profile is verified',
        body: `Your tutor profile was approved on ${formatDateTime(new Date().toISOString())}. Your verified badge is active and students can now find you in search.`,
        link: '/dashboard/tutor?tab=overview',
      });
    }

    await recordAdminAction({
      adminId: session.user.id,
      actionType: action === 'APPROVE' ? 'APPROVE_GMAT_VERIFICATION' : 'REJECT_GMAT_VERIFICATION',
      metadata: { requestId: params.id }
    });

    return NextResponse.json({
      success: true,
      message:
        action === 'APPROVE' && finalCertificationStatus !== 'VERIFIED'
          ? 'MBA.com verification completed. Final GMAT approval will finish after document review.'
          : action === 'APPROVE'
          ? 'GMAT fully verified.'
          : 'GMAT rejected.',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'GMAT_REQUEST_NOT_FOUND') {
      return NextResponse.json({ error: 'GMAT Request not found' }, { status: 404 });
    }
    console.error('GMAT status update error:', error);
    return NextResponse.json({ error: 'Failed to update GMAT status' }, { status: 500 });
  }
}
