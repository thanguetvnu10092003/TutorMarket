import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function toNumberOrNull(value: unknown) {
  if (!hasValue(value)) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toDateOrNull(value: unknown) {
  if (!hasValue(value)) {
    return null;
  }

  const parsedDate = new Date(String(value));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function buildCertificationPayload(subject: string, certificationData: any) {
  const payload = certificationData && typeof certificationData === 'object' ? certificationData : {};

  if (subject.startsWith('CFA')) {
    const score = toNumberOrNull(payload.score);
    const yearValue = hasValue(payload.year) ? Number(payload.year) : null;

    if (score === null) {
      return { error: 'Please enter the CFA score before submitting for review.' };
    }

    if (yearValue !== null && (!Number.isInteger(yearValue) || yearValue < 1900 || yearValue > 2100)) {
      return { error: 'Please enter a valid CFA year.' };
    }

    return {
      score,
      percentiles: null,
      testDate: yearValue ? new Date(`${yearValue}-01-01T00:00:00.000Z`) : null,
      selfReportedData: {
        score,
        year: yearValue,
      },
    };
  }

  if (subject === 'GMAT') {
    const percentiles = {
      totalPercentile: toNumberOrNull(payload.percentiles?.totalPercentile ?? payload.totalPercentile),
      quantScore: toNumberOrNull(payload.percentiles?.quantScore ?? payload.quantScore),
      quantPercentile: toNumberOrNull(payload.percentiles?.quantPercentile ?? payload.quantPercentile),
      verbalScore: toNumberOrNull(payload.percentiles?.verbalScore ?? payload.verbalScore),
      verbalPercentile: toNumberOrNull(payload.percentiles?.verbalPercentile ?? payload.verbalPercentile),
      dataInsightsScore: toNumberOrNull(payload.percentiles?.dataInsightsScore ?? payload.dataInsightsScore),
      dataInsightsPercentile: toNumberOrNull(payload.percentiles?.dataInsightsPercentile ?? payload.dataInsightsPercentile),
    };
    const score = toNumberOrNull(payload.score ?? payload.totalScore);

    if (
      score === null ||
      Object.values(percentiles).some((value) => value === null)
    ) {
      return { error: 'Please fill in the full GMAT score breakdown before submitting for review.' };
    }

    return {
      score,
      percentiles,
      testDate: toDateOrNull(payload.testDate),
      selfReportedData: {
        totalScore: score,
        ...percentiles,
        testDate: hasValue(payload.testDate) ? String(payload.testDate) : null,
      },
    };
  }

  if (subject === 'GRE') {
    const percentiles = {
      verbal: toNumberOrNull(payload.percentiles?.verbal ?? payload.verbalScore),
      verbalPercentile: toNumberOrNull(payload.percentiles?.verbalPercentile ?? payload.verbalPercentile),
      quant: toNumberOrNull(payload.percentiles?.quant ?? payload.quantScore),
      quantPercentile: toNumberOrNull(payload.percentiles?.quantPercentile ?? payload.quantPercentile),
      writing: toNumberOrNull(payload.percentiles?.writing ?? payload.writingScore),
      writingPercentile: toNumberOrNull(payload.percentiles?.writingPercentile ?? payload.writingPercentile),
    };

    if (Object.values(percentiles).some((value) => value === null)) {
      return { error: 'Please fill in the full GRE score breakdown before submitting for review.' };
    }

    return {
      score: null,
      percentiles,
      testDate: toDateOrNull(payload.testDate),
      selfReportedData: {
        ...percentiles,
        testDate: hasValue(payload.testDate) ? String(payload.testDate) : null,
      },
    };
  }

  return {
    score: null,
    percentiles: null,
    testDate: null,
    selfReportedData: null,
  };
}

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

    const { subject, credentialType, files, mbaEmail, mbaPassword, mbaConsent, certificationData } = await request.json();

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

    if (subject === 'GMAT' && (hasValue(mbaEmail) || hasValue(mbaPassword))) {
      if (!hasValue(mbaEmail) || !hasValue(mbaPassword)) {
        return NextResponse.json(
          { error: 'Please provide both your MBA.com email and password.' },
          { status: 400 }
        );
      }

      if (!mbaConsent) {
        return NextResponse.json(
          { error: 'Please authorize MBA.com credential verification before submitting.' },
          { status: 400 }
        );
      }
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
      const payload = buildCertificationPayload(subject, certificationData);

      if ('error' in payload) {
        return NextResponse.json({ error: payload.error }, { status: 400 });
      }

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
      const nextStatus = existingCert?.status === 'REJECTED' ? 'RESUBMITTED' : 'PENDING_VERIFICATION';
      let targetCertificationId = existingCert?.id || null;

      if (existingCert) {
        const updatedCert = await prisma.tutorCertification.update({
          where: { id: existingCert.id },
          data: {
            status: nextStatus,
            levelOrVariant: subject,
            fileUrl: files[0].url,
            score: payload.score,
            percentiles: payload.percentiles ?? Prisma.DbNull,
            testDate: payload.testDate,
            selfReportedData: payload.selfReportedData ?? Prisma.DbNull,
            mbaEmail: subject === 'GMAT' && hasValue(mbaEmail) ? String(mbaEmail) : existingCert.mbaEmail,
            mbaPasswordEncrypted:
              subject === 'GMAT' && hasValue(mbaPassword)
                ? encrypt(String(mbaPassword))
                : existingCert.mbaPasswordEncrypted,
            resubmittedAt: nextStatus === 'RESUBMITTED' ? new Date() : existingCert.resubmittedAt,
            verifiedAt: null,
            verifiedById: null,
            rejectionReason: null,
            notes: null
          }
        });
        targetCertificationId = updatedCert.id;
      } else {
        const createdCert = await prisma.tutorCertification.create({
          data: {
            tutorProfileId: tutorProfile.id,
            type: certType,
            levelOrVariant: subject,
            status: 'PENDING_VERIFICATION',
            fileUrl: files[0].url,
            score: payload.score,
            percentiles: payload.percentiles ?? Prisma.DbNull,
            testDate: payload.testDate,
            selfReportedData: payload.selfReportedData ?? Prisma.DbNull,
            mbaEmail: subject === 'GMAT' && hasValue(mbaEmail) ? String(mbaEmail) : null,
            mbaPasswordEncrypted:
              subject === 'GMAT' && hasValue(mbaPassword)
                ? encrypt(String(mbaPassword))
                : null
          }
        });
        targetCertificationId = createdCert.id;
      }

      // Handle GMAT Credentials
      if (subject === 'GMAT' && hasValue(mbaEmail) && hasValue(mbaPassword) && targetCertificationId) {
          const encEmail = encrypt(String(mbaEmail));
          const encPass = encrypt(String(mbaPassword));
          const requestId = `gmat_${Math.random().toString(36).substring(2, 11)}`;
          
          await prisma.$executeRawUnsafe(
            `INSERT INTO "GmatVerificationRequest" ("id", "tutorCertificationId", "encryptedEmail", "encryptedPassword", "consentGiven", "createdAt")
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT ("tutorCertificationId") DO UPDATE SET
             "encryptedEmail" = EXCLUDED."encryptedEmail",
             "encryptedPassword" = EXCLUDED."encryptedPassword",
             "consentGiven" = EXCLUDED."consentGiven",
             "portalVerifiedAt" = NULL,
             "portalVerifiedById" = NULL,
             "documentReviewedAt" = NULL,
             "documentReviewedById" = NULL,
             "reviewNotes" = NULL,
             "rejectionReason" = NULL,
             "usedAt" = NULL,
             "deletedAt" = NULL`,
            requestId,
            targetCertificationId,
            encEmail,
            encPass,
            true
          );
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
