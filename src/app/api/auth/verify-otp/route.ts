import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateOTP, sendOTP } from '@/lib/mail';
import { addMinutes, differenceInSeconds } from 'date-fns';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifySchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.otpCode || !user.otpExpires) {
      return NextResponse.json(
        { error: 'Invalid verification request' },
        { status: 400 }
      );
    }

    if (new Date() > user.otpExpires) {
      return NextResponse.json(
        { error: 'Verification code has expired' },
        { status: 400 }
      );
    }

    if (user.otpCode !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Success - mark user as verified and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpires: null,
      },
    });

    return NextResponse.json(
      { message: 'Email verified successfully' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('OTP Verification Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
