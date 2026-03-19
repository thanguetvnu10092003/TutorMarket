import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const { status, remarks } = body;

    if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // @ts-ignore
    const certification = await prisma.tutorCertification.update({
      where: { id: params.id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? remarks : undefined,
        verifiedAt: status === 'VERIFIED' ? new Date() : undefined,
        verifiedById: status === 'VERIFIED' ? session.user.id : undefined,
      },
      include: {
        tutorProfile: true
      }
    });

    // Log the action
    // @ts-ignore
    await prisma.tutorVerificationLog.create({
      data: {
        tutorProfileId: certification.tutorProfileId,
        adminId: session.user.id,
        action: `${status}_CERTIFICATION`,
        notes: `${certification.type}: ${remarks || ''}`,
        metadata: { certificationId: params.id }
      }
    });

    // Update overall tutor verification status based on individual certifications
    const allCerts = await prisma.tutorCertification.findMany({
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
    
    await prisma.tutorProfile.update({
      where: { id: certification.tutorProfileId },
      data: {
        verificationStatus: newVerificationStatus,
        badgeType: newBadgeType,
      }
    });

    return NextResponse.json({ success: true, data: certification });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Certification update error:', error);
    return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 });
  }
}
