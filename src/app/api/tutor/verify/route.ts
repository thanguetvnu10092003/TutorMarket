import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
        }
      }
    });

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      status: tutorProfile.verificationStatus,
      notes: tutorProfile.verificationNotes,
      credentials: tutorProfile.certifications 
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

    const { subject, credentialType, files } = await request.json();

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

    // Create credentials using raw SQL to bypass Prisma Client's outdated validation
    // (Since prisma generate fails on Windows when the server is running)
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
