import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Find the certification and ensure it belongs to the current tutor
    const certification = await prisma.tutorCertification.findUnique({
      where: { id },
      include: {
        tutorProfile: true
      }
    });

    if (!certification) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    if (certification.tutorProfile.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the certification
    await prisma.tutorCertification.delete({
      where: { id }
    });

    // Check if there are any certifications left
    const remainingCount = await prisma.tutorCertification.count({
      where: { tutorProfileId: certification.tutorProfileId }
    });

    // If no certifications left, reset the verification status
    if (remainingCount === 0) {
      await prisma.tutorProfile.update({
        where: { id: certification.tutorProfileId },
        data: { verificationStatus: 'PENDING' } 
      });
    }

    return NextResponse.json({ success: true, message: 'Certification deleted successfully' });
  } catch (error) {
    console.error('Tutor certification delete error:', error);
    return NextResponse.json({ error: 'Failed to delete certification' }, { status: 500 });
  }
}
