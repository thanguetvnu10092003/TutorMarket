import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function requireStudentSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'STUDENT') {
    throw new Error('UNAUTHORIZED');
  }

  return session;
}

export async function GET() {
  try {
    const session = await requireStudentSession();

    const savedTutors = await prisma.studentSavedTutor.findMany({
      where: { studentId: session.user.id },
      include: {
        tutorProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            certifications: true,
            availability: true,
          },
        },
      },
      orderBy: { savedAt: 'desc' },
    });

    return NextResponse.json({
      data: savedTutors.map((savedTutor: any) => ({
        id: savedTutor.tutorProfile.id,
        savedAt: savedTutor.savedAt,
        userId: savedTutor.tutorProfile.userId,
        user: savedTutor.tutorProfile.user,
        name: savedTutor.tutorProfile.user.name,
        avatarUrl: savedTutor.tutorProfile.user.avatarUrl,
        headline: savedTutor.tutorProfile.headline,
        bio: savedTutor.tutorProfile.about,
        about: savedTutor.tutorProfile.about,
        specializations: savedTutor.tutorProfile.specializations,
        hourlyRate: savedTutor.tutorProfile.hourlyRate,
        rating: savedTutor.tutorProfile.rating,
        totalReviews: savedTutor.tutorProfile.totalReviews,
        totalSessions: savedTutor.tutorProfile.totalSessions,
        totalStudents: Math.max(3, Math.ceil(savedTutor.tutorProfile.totalSessions / 4)),
        responseTime: savedTutor.tutorProfile.responseTime,
        languages: savedTutor.tutorProfile.languages,
        availability: savedTutor.tutorProfile.availability,
        verifiedCertifications: savedTutor.tutorProfile.certifications
          .filter((certification: any) => certification.status === 'VERIFIED')
          .map((certification: any) => certification.type),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Favorite tutors fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch favorite tutors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireStudentSession();
    const { tutorProfileId } = await request.json();

    if (!tutorProfileId) {
      return NextResponse.json({ error: 'Tutor profile is required' }, { status: 400 });
    }

    await prisma.studentSavedTutor.upsert({
      where: {
        studentId_tutorProfileId: {
          studentId: session.user.id,
          tutorProfileId,
        },
      },
      update: {},
      create: {
        studentId: session.user.id,
        tutorProfileId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Favorite tutor save error:', error);
    return NextResponse.json({ error: 'Failed to save favorite tutor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireStudentSession();
    const { tutorProfileId } = await request.json();

    if (!tutorProfileId) {
      return NextResponse.json({ error: 'Tutor profile is required' }, { status: 400 });
    }

    await prisma.studentSavedTutor.deleteMany({
      where: {
        studentId: session.user.id,
        tutorProfileId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Favorite tutor remove error:', error);
    return NextResponse.json({ error: 'Failed to remove favorite tutor' }, { status: 500 });
  }
}
