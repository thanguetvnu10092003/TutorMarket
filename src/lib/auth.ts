import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateOTP, sendOTP } from './mail';
import { addMinutes } from 'date-fns';

function isSuspendedUntil(suspendedUntil?: Date | null) {
  return !!suspendedUntil && suspendedUntil.getTime() > Date.now();
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'stub-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'stub-client-secret',
    }),

    // Email/Password
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) return null;

        if (user.isBanned) {
          throw new Error('Your account has been banned. Please contact support.');
        }
        if (isSuspendedUntil(user.suspendedUntil)) {
          const untilLabel = user.suspendedUntil?.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });
          throw new Error(`Your account is suspended until ${untilLabel}. Reason: ${user.suspensionReason || 'No reason provided.'}`);
        }

        // Verify password
        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordCorrect) return null;
        
        // Trigger OTP if not verified
        if (!user.isVerified) {
          const otp = generateOTP();
          const otpExpires = addMinutes(new Date(), 5);

          await prisma.user.update({
            where: { id: user.id },
            data: {
              otpCode: otp,
              otpExpires: otpExpires,
            },
          });

          await sendOTP(user.email, otp);
        }

        return {
          id: user.id,
          role: user.role,
          isVerified: user.isVerified,
          hasPassword: true,
          hasChosenRole: user.hasChosenRole,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const { cookies } = await import('next/headers');
        const cookieStore = cookies();
        const intentRole = cookieStore.get('next-auth.intent-role')?.value;
        
        console.log('--- AUTH DEBUG ---');
        console.log('Email:', user.email);
        console.log('Intent Role:', intentRole);

        // Explicitly block ADMIN role via social login
        if (intentRole === 'ADMIN') {
          console.log('BLOCKING ADMIN LOGIN VIA SOCIAL PROVIDER');
          return false;
        }

        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { tutorProfile: true }
        });

        // Also block existing ADMINs from using Google Login (unless we want to allow it if already admin? 
        // User said: "Platform Admin thì không được đăng nhập bằng google")
        if (existingUser?.role === 'ADMIN') {
          console.log('BLOCKING EXISTING ADMIN FROM USING SOCIAL LOGIN');
          return false;
        }

        if (existingUser?.isBanned) {
          console.log('BLOCKING BANNED USER FROM LOGIN');
          return false;
        }
        if (existingUser?.suspendedUntil && existingUser.suspendedUntil.getTime() > Date.now()) {
          console.log('BLOCKING SUSPENDED USER FROM LOGIN');
          return false;
        }

        if (!existingUser) {
          console.log('Creating new Google user without role');
          // Start all new Google users as STUDENTS but mark them as not having chosen a role
          const newUser = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name!,
              role: 'STUDENT',
              avatarUrl: (profile as any)?.picture || null,
              isVerified: false,
              hasChosenRole: false, // Must explicitly choose later
            },
          });

          (user as any).role = newUser.role;
          (user as any).id = newUser.id;
          (user as any).hasPassword = false;
          (user as any).hasChosenRole = false;
        } else {
          console.log('Existing user role:', existingUser.role);
          // Existing User
          let updatedUser: any = existingUser;
          
          // Define role hierarchy: ADMIN is top tier and cannot be changed by social intent
          const roleHierarchy: Record<string, number> = { 'STUDENT': 1, 'TUTOR': 2, 'ADMIN': 3 };
          const currentWeight = roleHierarchy[existingUser.role] || 0;
          const intentWeight = intentRole ? (roleHierarchy[intentRole] || 0) : 0;

          console.log(`Weight Check: Intent(${intentWeight}) > Current(${currentWeight})?`, intentWeight > currentWeight);

          // Only allow upgrade (STUDENT -> TUTOR) if weight increases and it's NOT an ADMIN
          // Only allow upgrade (STUDENT -> TUTOR) if weight increases and it's NOT an ADMIN
          if ((existingUser.role as string) !== 'ADMIN' && intentWeight > currentWeight && intentRole === 'TUTOR') {
            console.log('Upgrading user to:', intentRole);
            updatedUser = await prisma.user.update({
              where: { id: existingUser.id },
              data: { role: 'TUTOR' },
              include: { tutorProfile: true }
            });

            // Ensure tutor profile exists
            if (!updatedUser.tutorProfile) {
              await prisma.tutorProfile.create({
                data: {
                  userId: existingUser.id,
                  headline: 'Professional Profile',
                  about: '',
                  hourlyRate: 50,
                  verificationStatus: 'PENDING',
                },
              });
            }
          }

          (user as any).role = updatedUser.role;
          (user as any).id = updatedUser.id;
          (user as any).isVerified = updatedUser.isVerified;
          (user as any).hasChosenRole = updatedUser.hasChosenRole;
          (user as any).hasPassword = !!updatedUser.passwordHash;
        }

        // After creation or update, if still not verified, trigger OTP
        const finalUser = await prisma.user.findUnique({
          where: { email: user.email! }
        });

        if (finalUser && !finalUser.isVerified) {
          const otp = generateOTP();
          const otpExpires = addMinutes(new Date(), 5);

          await prisma.user.update({
            where: { id: finalUser.id },
            data: {
              otpCode: otp,
              otpExpires: otpExpires,
            },
          });

          await sendOTP(finalUser.email, otp);
          
          // Update the user object passed to JWT/Session
          (user as any).isVerified = false;
        }
        console.log('Final User Role:', (user as any).role);
        console.log('------------------');
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.hasPassword = (user as any).hasPassword;
        token.isVerified = (user as any).isVerified;
        token.hasChosenRole = (user as any).hasChosenRole;

        // Fetch onboardingCompleted for tutors from DB on first sign-in
        if ((user as any).role === 'TUTOR') {
          const tutorProfile = await prisma.tutorProfile.findUnique({
            where: { userId: user.id! },
            select: { onboardingCompleted: true }
          });
          token.onboardingCompleted = tutorProfile?.onboardingCompleted ?? false;
        } else {
          token.onboardingCompleted = true; // Non-tutors skip onboarding
        }
      }
      
      // Handle session update (e.g. after setting password, verifying OTP, choosing role, or completing onboarding)
      if (trigger === 'update' && session) {
        if (session.hasPassword !== undefined) token.hasPassword = session.hasPassword;
        if (session.isVerified !== undefined) token.isVerified = session.isVerified;
        if (session.hasChosenRole !== undefined) token.hasChosenRole = session.hasChosenRole;
        if (session.role !== undefined) token.role = session.role;
        if (session.onboardingCompleted !== undefined) token.onboardingCompleted = session.onboardingCompleted;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).hasPassword = token.hasPassword;
        (session.user as any).isVerified = token.isVerified;
        (session.user as any).hasChosenRole = token.hasChosenRole;
        (session.user as any).onboardingCompleted = token.onboardingCompleted;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/login',
    newUser: '/auth/register',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
