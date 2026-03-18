import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Fetch profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { hourlyRate, languages, headline, about, yearsOfExperience } = data;

    // Basic validation
    if (hourlyRate !== undefined && (typeof hourlyRate !== 'number' || hourlyRate < 0)) {
       return NextResponse.json({ error: 'Invalid hourly rate' }, { status: 400 });
    }

    if (languages !== undefined && (!Array.isArray(languages) || languages.length === 0)) {
        return NextResponse.json({ error: 'Languages must be a non-empty array' }, { status: 400 });
    }

    const updatedProfile = await prisma.tutorProfile.update({
      where: { userId: session.user.id },
      data: {
        hourlyRate: hourlyRate !== undefined ? hourlyRate : undefined,
        languages: languages !== undefined ? languages : undefined,
        headline: headline !== undefined ? headline : undefined,
        about: about !== undefined ? about : undefined,
        yearsOfExperience: yearsOfExperience !== undefined ? yearsOfExperience : undefined,
      }
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
