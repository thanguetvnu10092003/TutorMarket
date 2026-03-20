import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

function getCertificationMatch(subject?: string | null) {
  if (!subject) {
    return null;
  }

  if (subject.startsWith('CFA')) {
    return {
      type: 'CFA' as const,
      levelOrVariant: subject,
    };
  }

  if (subject === 'GMAT') {
    return {
      type: 'GMAT' as const,
      levelOrVariant: null,
    };
  }

  if (subject === 'GRE') {
    return {
      type: 'GRE' as const,
      levelOrVariant: null,
    };
  }

  return null;
}

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

    const credential = await prisma.tutorCredential.findUnique({
      where: { id },
      include: {
        tutorProfile: true,
      },
    });

    if (!credential) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (credential.tutorProfile.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.tutorCredential.delete({
        where: { id: credential.id },
      });

      const certificationMatch = getCertificationMatch(credential.subject || null);

      if (certificationMatch && credential.subject) {
        const remainingSubjectDocuments = await tx.tutorCredential.count({
          where: {
            tutorProfileId: credential.tutorProfileId,
            subject: credential.subject,
          },
        });

        if (remainingSubjectDocuments === 0) {
          await tx.tutorCertification.deleteMany({
            where: {
              tutorProfileId: credential.tutorProfileId,
              type: certificationMatch.type,
              ...(certificationMatch.levelOrVariant
                ? { levelOrVariant: certificationMatch.levelOrVariant }
                : {}),
            },
          });
        }
      }

      const remainingCertificationCount = await tx.tutorCertification.count({
        where: { tutorProfileId: credential.tutorProfileId },
      });

      if (remainingCertificationCount === 0) {
        await tx.tutorProfile.update({
          where: { id: credential.tutorProfileId },
          data: {
            verificationStatus: 'PENDING',
          },
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Tutor document delete error:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
