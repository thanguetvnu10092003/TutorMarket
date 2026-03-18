import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateOTP, sendOTP } from '@/lib/mail';
import { addMinutes, differenceInSeconds } from 'date-fns';
import { z } from 'zod';

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = resendSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ error: 'User is already verified' }, { status: 400 });
    }

    // Check cooldown (60 seconds)
    if (user.otpLastResent) {
      const secondsSinceLastResend = differenceInSeconds(new Date(), user.otpLastResent);
      if (secondsSinceLastResend < 60) {
        return NextResponse.json(
          { error: `Please wait ${60 - secondsSinceLastResend} seconds before resending.` },
          { status: 429 }
        );
      }
    }

    const otp = generateOTP();
    const otpExpires = addMinutes(new Date(), 5);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpires: otpExpires,
        otpLastResent: new Date(),
      },
    });

    await sendOTP(email, otp);

    return NextResponse.json(
      { message: 'Verification code resent successfully' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    console.error('OTP Resend Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
