import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const preferencesSchema = z.object({
  targetSubjects: z.array(z.string()),
  examDates: z.record(z.string(), z.string()).optional(),
  timezone: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await prisma.studentPreference.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching student preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = preferencesSchema.parse(body);

    const preferences = await prisma.studentPreference.upsert({
      where: { userId: session.user.id },
      update: {
        targetSubjects: validatedData.targetSubjects as any,
        examDates: validatedData.examDates || {},
        timezone: validatedData.timezone || 'UTC',
      },
      create: {
        userId: session.user.id,
        targetSubjects: validatedData.targetSubjects as any,
        examDates: validatedData.examDates || {},
        timezone: validatedData.timezone || 'UTC',
      },
    });

    return NextResponse.json(preferences, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error saving student preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
