import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin';
import { createInAppNotification } from '@/lib/in-app-notifications';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const { status, remarks, checklistCompleted } = body;

    if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Bug 6.1: Require all 3 checklist items before verifying
    if (status === 'VERIFIED' && !checklistCompleted) {
      return NextResponse.json(
        { error: 'All 3 checklist items (Document Authentic, Score Matches Claims, Date In Range) must be ticked before verifying.' },
        { status: 400 }
      );
    }

    let certification: any;
    let tutorUserId: string | null = null;
    let shouldNotifyTutorApproval = false;

    await prisma.$transaction(async (tx) => {
      const existingCertification: any = await tx.tutorCertification.findUnique({
        where: { id: params.id },
        include: {
          tutorProfile: true,
          gmatVerification: true,
        },
      });

      if (!existingCertification) {
        throw new Error('CERTIFICATION_NOT_FOUND');
      }

      const isGmatCertification = existingCertification.type === 'GMAT' && existingCertification.gmatVerification;
      tutorUserId = existingCertification.tutorProfile.userId;

      if (isGmatCertification && status === 'VERIFIED') {
        const documentReviewedAt = new Date();
        const portalVerifiedAt = existingCertification.gmatVerification?.portalVerifiedAt;
        const isFullyVerified = !!portalVerifiedAt;

        // @ts-ignore - new GMAT review fields are added in the latest Prisma schema
        await tx.gmatVerificationRequest.update({
          where: { tutorCertificationId: existingCertification.id },
          data: {
            documentReviewedAt,
            documentReviewedById: session.user.id,
            reviewNotes: remarks || 'Document review completed by admin',
            rejectionReason: null,
          },
        });

        certification = await tx.tutorCertification.update({
          where: { id: existingCertification.id },
          data: {
            status: isFullyVerified ? 'VERIFIED' : 'PENDING_VERIFICATION',
            rejectionReason: null,
            verifiedAt: isFullyVerified ? documentReviewedAt : null,
            verifiedById: isFullyVerified ? session.user.id : null,
            notes: isFullyVerified
              ? 'GMAT verified via document review and MBA.com'
              : 'Document reviewed. Awaiting MBA.com verification.',
          },
          include: {
            tutorProfile: true,
            gmatVerification: true,
          },
        });
      } else {
        if (isGmatCertification) {
          // @ts-ignore - new GMAT review fields are added in the latest Prisma schema
          await tx.gmatVerificationRequest.update({
            where: { tutorCertificationId: existingCertification.id },
            data: {
              reviewNotes: remarks || null,
              rejectionReason: status === 'REJECTED' ? remarks || 'Rejected during document review' : null,
            },
          });
        }

        certification = await tx.tutorCertification.update({
          where: { id: existingCertification.id },
          data: {
            status,
            rejectionReason: status === 'REJECTED' ? remarks : null,
            verifiedAt: status === 'VERIFIED' ? new Date() : null,
            verifiedById: status === 'VERIFIED' ? session.user.id : null,
            notes:
              status === 'VERIFIED'
                ? remarks || existingCertification.notes || null
                : remarks || existingCertification.notes || null,
          },
          include: {
            tutorProfile: true,
            gmatVerification: true,
          },
        });
      }

      // Log the action
      // @ts-ignore
      await tx.tutorVerificationLog.create({
        data: {
          tutorProfileId: certification.tutorProfileId,
          adminId: session.user.id,
          action: `${status}_CERTIFICATION`,
          notes: `${certification.type}: ${remarks || ''}`,
          metadata: { certificationId: params.id }
        }
      });

      // Update overall tutor verification status based on individual certifications
      const allCerts = await tx.tutorCertification.findMany({
        where: { tutorProfileId: certification.tutorProfileId }
      });
      
      const hasVerifiedCert = allCerts.some((c: any) => c.status === 'VERIFIED');
      const allRejected = allCerts.length > 0 && allCerts.every((c: any) => c.status === 'REJECTED');
      
      // Determine overall status:
      // - At least one VERIFIED cert => tutor is APPROVED with VERIFIED badge
      // - All certs REJECTED => tutor is REJECTED with NOT_VERIFIED badge  
      // - Otherwise (some pending) => stay PENDING
      const newVerificationStatus = hasVerifiedCert ? 'APPROVED' : allRejected ? 'REJECTED' : 'PENDING';
      const newBadgeType = hasVerifiedCert ? 'VERIFIED' : allRejected ? 'NOT_VERIFIED' : 'NONE';
      
      await tx.tutorProfile.update({
        where: { id: certification.tutorProfileId },
        data: {
          verificationStatus: newVerificationStatus,
          badgeType: newBadgeType,
        }
      });

      shouldNotifyTutorApproval =
        existingCertification.tutorProfile.verificationStatus !== 'APPROVED' &&
        newVerificationStatus === 'APPROVED';
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

    return NextResponse.json({
      success: true,
      data: certification,
      message:
        certification?.type === 'GMAT' && certification?.status !== 'VERIFIED' && status === 'VERIFIED'
          ? 'GMAT document reviewed. Final verification will complete after MBA.com review.'
          : 'Certification updated successfully.',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'CERTIFICATION_NOT_FOUND') {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    console.error('Certification update error:', error);
    return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 });
  }
}
