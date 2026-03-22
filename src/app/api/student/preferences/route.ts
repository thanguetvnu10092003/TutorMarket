import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const preferencesSchema = z.object({
  targetSubjects: z.array(z.string()).optional(),
  examDates: z.record(z.string(), z.string()).optional(),
  timezone: z.string().optional(),
  preferredCurrency: z.string().optional(),
});

const PREFERRED_CURRENCY_KEY = '__preferredCurrency';

function extractExamDates(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, string>;
}

function extractPreferredCurrency(examDates: Record<string, string>) {
  return examDates[PREFERRED_CURRENCY_KEY] || null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await prisma.studentPreference.findUnique({
      where: { userId: session.user.id },
    });

    const examDates = extractExamDates(preferences?.examDates);

    return NextResponse.json({
      ...preferences,
      examDates: Object.fromEntries(
        Object.entries(examDates).filter(([key]) => key !== PREFERRED_CURRENCY_KEY)
      ),
      preferredCurrency: extractPreferredCurrency(examDates),
    });
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
    const existing = await prisma.studentPreference.findUnique({
      where: { userId: session.user.id },
      select: {
        examDates: true,
        targetSubjects: true,
      },
    });
    const nextExamDates = {
      ...extractExamDates(existing?.examDates),
      ...(validatedData.examDates || {}),
    };

    if (validatedData.preferredCurrency) {
      nextExamDates[PREFERRED_CURRENCY_KEY] = validatedData.preferredCurrency.toUpperCase();
    }

    const preferences = await prisma.studentPreference.upsert({
      where: { userId: session.user.id },
      update: {
        targetSubjects: (validatedData.targetSubjects || existing?.targetSubjects || []) as any,
        examDates: nextExamDates,
        timezone: validatedData.timezone || 'UTC',
      },
      create: {
        userId: session.user.id,
        targetSubjects: (validatedData.targetSubjects || []) as any,
        examDates: nextExamDates,
        timezone: validatedData.timezone || 'UTC',
      },
    });

    return NextResponse.json({
      ...preferences,
      examDates: Object.fromEntries(
        Object.entries(extractExamDates(preferences.examDates)).filter(([key]) => key !== PREFERRED_CURRENCY_KEY)
      ),
      preferredCurrency: extractPreferredCurrency(extractExamDates(preferences.examDates)),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error saving student preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
