import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPublicTutorProfile } from '@/lib/admin-dashboard';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await getPublicTutorProfile(params.id);
    if (!profile) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('Tutor profile fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tutor profile' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const profile = await prisma.tutorProfile.findUnique({
      where: { id: params.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const updatedProfile = await prisma.tutorProfile.update({
      where: { id: params.id },
      data: {
        headline: body.headline ?? profile.headline,
        about: body.about ?? profile.about,
        hourlyRate: body.hourlyRate ?? profile.hourlyRate,
        languages: Array.isArray(body.languages) ? body.languages : profile.languages,
      },
    });

    return NextResponse.json({
      data: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Tutor profile update error:', error);
    return NextResponse.json({ error: 'Failed to update tutor profile' }, { status: 500 });
  }
}
