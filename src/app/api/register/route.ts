import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { generateOTP, sendOTP } from '@/lib/mail';
import { addMinutes } from 'date-fns';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['STUDENT', 'TUTOR', 'ADMIN']),
  adminSecret: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    const { name, email, password, role, adminSecret } = validatedData;

    // Check admin secret if registering as admin
    if (role === 'ADMIN') {
      const systemSecret = process.env.ADMIN_REGISTRATION_SECRET;
      if (!adminSecret || adminSecret !== systemSecret) {
        return NextResponse.json(
          { error: 'Invalid Admin Secret Key' },
          { status: 403 }
        );
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = addMinutes(new Date(), 5);

    // Create user and profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: hashedPassword,
          role,
          hasChosenRole: true,
          isVerified: false,
          otpCode: otp,
          otpExpires: otpExpires,
        },
      });

      // If user is a tutor or admin, create a profile
      if (role === 'TUTOR' || role === 'ADMIN') {
        await tx.tutorProfile.create({
          data: {
            userId: newUser.id,
            headline: role === 'ADMIN' ? 'Platform Administrator' : 'New Tutor',
            about: '',
            hourlyRate: 50,
            verificationStatus: role === 'ADMIN' ? 'APPROVED' : 'PENDING',
          },
        });
      }

      return newUser;
    });

    // Send the OTP email (async)
    await sendOTP(email, otp);

    const { passwordHash: _, otpCode: __, ...userWithoutSensitiveData } = result;

    return NextResponse.json(
      { 
        message: 'Registration successful. Please check your email for the verification code.', 
        user: userWithoutSensitiveData,
        requiresVerification: true 
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
