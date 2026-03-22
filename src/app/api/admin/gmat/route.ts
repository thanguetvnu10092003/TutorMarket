import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession();

    const requests = await prisma.gmatVerificationRequest.findMany({
      where: {
        deletedAt: null,
        tutorCertification: {
          type: 'GMAT',
          status: { in: ['PENDING_VERIFICATION', 'RESUBMITTED'] },
        },
      },
      include: {
        tutorCertification: {
          include: {
            tutorProfile: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      requests: requests.map((request: any) => ({
        id: request.id,
        tutorName: request.tutorCertification?.tutorProfile?.user?.name || 'Unknown Tutor',
        tutorEmail: request.tutorCertification?.tutorProfile?.user?.email || '',
        tutorId: request.tutorCertification?.tutorProfileId || 'Unknown',
        tutorCertificationId: request.tutorCertificationId,
        status: request.tutorCertification?.status || 'UNKNOWN',
        portalVerifiedAt: request.portalVerifiedAt,
        documentReviewedAt: request.documentReviewedAt,
        reviewNotes: request.reviewNotes,
        rejectionReason: request.rejectionReason,
        createdAt: request.createdAt,
        certification: request.tutorCertification
          ? {
              id: request.tutorCertification.id,
              type: request.tutorCertification.type,
              levelOrVariant: request.tutorCertification.levelOrVariant,
              score: request.tutorCertification.score,
              percentiles: request.tutorCertification.percentiles,
              testDate: request.tutorCertification.testDate,
              status: request.tutorCertification.status,
              fileUrl: request.tutorCertification.fileUrl,
              selfReportedData: request.tutorCertification.selfReportedData,
              gmatVerification: {
                id: request.id,
                portalVerifiedAt: request.portalVerifiedAt,
                documentReviewedAt: request.documentReviewedAt,
                reviewNotes: request.reviewNotes,
                rejectionReason: request.rejectionReason,
              },
            }
          : null,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('GMAT queue fetch error:', error);
    return NextResponse.json({ error: 'Failed to load GMAT requests' }, { status: 500 });
  }
}
