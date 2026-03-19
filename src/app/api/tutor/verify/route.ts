import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'TUTOR' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        certifications: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        credentials: {
          orderBy: {
            uploadedAt: 'desc'
          }
        }
      }
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      status: tutorProfile.verificationStatus,
      notes: tutorProfile.verificationNotes,
      certifications: tutorProfile.certifications,
      documents: tutorProfile.credentials
    });
  } catch (error) {
    console.error('Tutor verification fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'TUTOR' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, credentialType, files, mbaEmail, mbaPassword, mbaConsent } = await request.json();

    if (!credentialType || !files || files.length === 0) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Use the type directly if it matches our enum, otherwise fallback
    const validTypes = ['CERTIFICATE', 'SCORE_REPORT', 'TRANSCRIPT', 'OTHER'];
    const enumType = validTypes.includes(credentialType) ? credentialType : 'OTHER';

    // Find tutor profile
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    // Update verification status
    await prisma.tutorProfile.update({
      where: { id: tutorProfile.id },
      data: { verificationStatus: 'PENDING' }
    });

    // Sync with TutorCertification if it's a specialized exam
    const isSpecialized = subject && ['CFA_LEVEL_1', 'CFA_LEVEL_2', 'CFA_LEVEL_3', 'GMAT', 'GRE'].includes(subject);
    if (isSpecialized) {
      let certType: 'CFA' | 'GMAT' | 'GRE' = 'CFA';
      if (subject === 'GMAT') certType = 'GMAT';
      else if (subject === 'GRE') certType = 'GRE';

      // Find if certification already exists
      const existingCert = await prisma.tutorCertification.findFirst({
        where: { 
          tutorProfileId: tutorProfile.id,
          OR: [
            { type: certType, levelOrVariant: subject },
            { type: certType, levelOrVariant: null }
          ]
        }
      });

      if (existingCert) {
        await prisma.tutorCertification.update({
          where: { id: existingCert.id },
          data: {
            status: 'PENDING_VERIFICATION',
            fileUrl: files[0].url,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.tutorCertification.create({
          data: {
            tutorProfileId: tutorProfile.id,
            type: certType,
            levelOrVariant: subject.startsWith('CFA') ? subject : null,
            status: 'PENDING_VERIFICATION',
            fileUrl: files[0].url
          }
        });
      }

      // Handle GMAT Credentials
      if (subject === 'GMAT' && mbaEmail && mbaPassword) {
        const certId = existingCert ? existingCert.id : (await prisma.tutorCertification.findFirst({
          where: { tutorProfileId: tutorProfile.id, type: 'GMAT' }
        }))?.id;

        if (certId) {
          const encEmail = encrypt(mbaEmail);
          const encPass = encrypt(mbaPassword);
          const requestId = `gmat_${Math.random().toString(36).substring(2, 11)}`;
          
          await prisma.$executeRawUnsafe(
            `INSERT INTO "GmatVerificationRequest" ("id", "tutorCertificationId", "encryptedEmail", "encryptedPassword", "consentGiven", "createdAt")
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT ("tutorCertificationId") DO UPDATE SET
             "encryptedEmail" = EXCLUDED."encryptedEmail",
             "encryptedPassword" = EXCLUDED."encryptedPassword",
             "consentGiven" = EXCLUDED."consentGiven"`,
            requestId,
            certId,
            encEmail,
            encPass,
            mbaConsent || false
          );
        }
      }
    }

    // Create credentials using raw SQL to bypass Prisma Client's outdated validation
    for (const file of files) {
      const id = `cred_${Math.random().toString(36).substring(2, 11)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "TutorCredential" ("id", "tutorProfileId", "type", "subject", "fileName", "fileUrl", "uploadedAt") 
         VALUES ($1, $2, $3::"CredentialType", $4::"Subject", $5, $6, NOW())`,
        id,
        tutorProfile.id,
        enumType,
        subject,
        file.name,
        file.url || 'https://placeholder-url.com'
      );
    }

    return NextResponse.json({ success: true, message: 'Verification submitted successfully' });
  } catch (error) {
    console.error('Tutor verification submission error:', error);
    return NextResponse.json({ error: 'Failed to submit verification' }, { status: 500 });
  }
}
