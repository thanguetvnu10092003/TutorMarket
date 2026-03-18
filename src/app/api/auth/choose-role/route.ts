import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await req.json();

    if (!['STUDENT', 'TUTOR'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role selection' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.hasChosenRole) {
      return NextResponse.json({ error: 'Role already chosen' }, { status: 400 });
    }

    // Start transaction to update user and potentially create tutor profile
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          role: role,
          hasChosenRole: true,
        },
      });

      if (role === 'TUTOR') {
        const existingProfile = await tx.tutorProfile.findUnique({
          where: { userId: user.id },
        });

        if (!existingProfile) {
          await tx.tutorProfile.create({
            data: {
              userId: user.id,
              headline: 'Professional Profile',
              about: '',
              hourlyRate: 50,
              verificationStatus: 'PENDING',
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: `Successfully registered as ${role}` });
  } catch (error) {
    console.error('Role choice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
