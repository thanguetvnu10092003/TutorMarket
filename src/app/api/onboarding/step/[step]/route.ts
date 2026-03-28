import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { encrypt } from '@/lib/encryption';
import { sortAvailabilitySlots, validateDailyAvailabilitySlots, timeToMinutes, minutesToTime } from '@/lib/availability';

// Encryption helpers for sensitive MBA.com credentials
const ALGORITHM = 'aes-256-cbc';

// Using encrypt from @/lib/encryption for consistency

// ─── GET: Load saved data for a step ─────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { step: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const stepNum = parseInt(params.step);

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId },
    include: {
      tutorLanguages: true,
      certifications: true,
      education: true,
      pricing: true,
    },
  });

  if (!tutorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: userId } });

  let data: any = {};

  switch (stepNum) {
    case 1: // About
      data = {
        firstName: user?.name?.split(' ')[0] || '',
        lastName: user?.name?.split(' ').slice(1).join(' ') || '',
        email: user?.email || '',
        countryOfBirth: tutorProfile.countryOfBirth || '',
        subjects: tutorProfile.specializations || [],
        languages: tutorProfile.tutorLanguages.length > 0
          ? tutorProfile.tutorLanguages.map(l => ({ language: l.language, proficiency: l.proficiency }))
          : [{ language: 'English', proficiency: 'NATIVE' }],
        phoneNumber: tutorProfile.phoneNumber || '',
      };
      break;
    case 2: // Photo
      data = { avatarUrl: user?.avatarUrl || '' };
      break;
    case 3: // Certification
      data = {
        subjects: tutorProfile.specializations || [],
        certifications: tutorProfile.certifications.map(c => ({
          id: c.id,
          type: c.type,
          levelOrVariant: c.levelOrVariant,
          score: c.score,
          percentiles: c.percentiles,
          testDate: c.testDate,
          status: c.status,
          fileUrl: c.fileUrl,
        })),
        noCertifications: tutorProfile.certifications.every(c => c.status === 'NONE'),
      };
      break;
    case 4: // Education
      data = {
        education: tutorProfile.education.map(e => ({
          id: e.id,
          degree: e.degree,
          fieldOfStudy: e.fieldOfStudy,
          institution: e.institution,
          graduationYear: e.graduationYear,
        })),
      };
      break;
    case 5: // Description
      data = {
        about: tutorProfile.about || '',
        experienceHighlight: tutorProfile.experienceHighlight || '',
      };
      break;
    case 6: // Video
      data = { videoUrl: tutorProfile.videoUrl || '' };
      break;
    case 7: // Availability
      const availability = await prisma.availability.findMany({ where: { tutorProfileId: tutorProfile.id } });
      const overrides = await prisma.availabilityOverride.findMany({ where: { tutorProfileId: tutorProfile.id } });
      data = {
        timezone: tutorProfile.timezone || 'UTC',
        slots: availability,
        overrides,
      };
      break;
    case 8: // Pricing
      data = {
        pricing: tutorProfile.pricing.length > 0
          ? tutorProfile.pricing
          : [
              { durationMinutes: 30, price: 0, isEnabled: false, currency: 'USD' },
              { durationMinutes: 60, price: 50, isEnabled: true, currency: 'USD' },
              { durationMinutes: 90, price: 0, isEnabled: false, currency: 'USD' },
              { durationMinutes: 120, price: 0, isEnabled: false, currency: 'USD' },
            ],
      };
      break;
  }

  return NextResponse.json({
    step: stepNum,
    currentStep: tutorProfile.onboardingStep,
    onboardingCompleted: tutorProfile.onboardingCompleted,
    data,
  });
}

// ─── POST: Save step data ─────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: { step: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const stepNum = parseInt(params.step);
  const body = await request.json();

  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!tutorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  try {
    switch (stepNum) {
      case 1: { // About
        const { firstName, lastName, email, countryOfBirth, subjects, languages, phoneNumber } = body;

        await prisma.user.update({
          where: { id: userId },
          data: { name: `${firstName} ${lastName}`.trim() },
        });

        // Replace languages
        await prisma.tutorLanguage.deleteMany({ where: { tutorProfileId: tutorProfile.id } });
        await prisma.tutorLanguage.createMany({
          data: languages.map((l: any) => ({
            tutorProfileId: tutorProfile.id,
            language: l.language,
            proficiency: l.proficiency,
          })),
        });

        await prisma.tutorProfile.update({
          where: { id: tutorProfile.id },
          data: {
            specializations: subjects,
            countryOfBirth,
            phoneNumber,
            // Simple languages array stored for backward compat
            languages: languages.map((l: any) => l.language),
            onboardingStep: Math.max(tutorProfile.onboardingStep, 1),
          },
        });
        break;
      }

      case 2: { // Photo
        const { avatarUrl } = body;
        if (avatarUrl) {
          await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
          });
        }
        await prisma.tutorProfile.update({
          where: { id: tutorProfile.id },
          data: { onboardingStep: Math.max(tutorProfile.onboardingStep, 2) },
        });
        break;
      }

      case 3: { // Certification
        const { certifications, noCertifications } = body;

        await prisma.tutorCertification.deleteMany({ where: { tutorProfileId: tutorProfile.id } });

        if (noCertifications) {
          await prisma.tutorProfile.update({
            where: { id: tutorProfile.id },
            data: { badgeType: 'NOT_VERIFIED', onboardingStep: Math.max(tutorProfile.onboardingStep, 3) },
          });
        } else {
          for (const cert of certifications) {
            const certData: any = {
              tutorProfileId: tutorProfile.id,
              type: cert.type,
              levelOrVariant: cert.levelOrVariant,
              score: cert.score ? parseFloat(cert.score) : null,
              percentiles: cert.percentiles || null,
              testDate: cert.testDate ? new Date(cert.testDate) : null,
              status: (cert.fileUrl || cert.mbaEmail) ? 'PENDING_VERIFICATION' : 'SELF_REPORTED',
              fileUrl: cert.fileUrl || null,
            };
            if (cert.mbaEmail) certData.mbaEmail = cert.mbaEmail;
            if (cert.mbaPassword) certData.mbaPasswordEncrypted = encrypt(cert.mbaPassword);
            const createdCert = await prisma.tutorCertification.create({ data: certData });

            // Mirror uploaded document to TutorCredential so dashboard "Submitted Documents" shows it
            if (certData.fileUrl) {
              const fileName = certData.fileUrl.split('/').pop() || String(cert.type);
              const subjectRaw = (cert.levelOrVariant || cert.type) as string;
              const credId = `cred_onb_${Math.random().toString(36).substring(2, 11)}`;
              await prisma.$executeRawUnsafe(
                `INSERT INTO "TutorCredential" ("id", "tutorProfileId", "type", "subject", "fileName", "fileUrl", "uploadedAt")
                 VALUES ($1, $2, 'SCORE_REPORT'::"CredentialType", $3::"Subject", $4, $5, NOW())
                 ON CONFLICT DO NOTHING`,
                credId,
                tutorProfile.id,
                subjectRaw,
                fileName,
                certData.fileUrl
              );
            }

            // Also create a GmatVerificationRequest for the new system
            if (cert.type === 'GMAT' && cert.mbaEmail && cert.mbaPassword) {
              // @ts-ignore
              await prisma.gmatVerificationRequest.upsert({
                where: { tutorCertificationId: createdCert.id },
                update: {
                  encryptedEmail: encrypt(cert.mbaEmail),
                  encryptedPassword: encrypt(cert.mbaPassword),
                  consentGiven: true, // Frontend validates this
                  portalVerifiedAt: null,
                  portalVerifiedById: null,
                  documentReviewedAt: null,
                  documentReviewedById: null,
                  reviewNotes: null,
                  rejectionReason: null,
                  usedAt: null,
                  deletedAt: null,
                },
                create: {
                  tutorCertificationId: createdCert.id,
                  encryptedEmail: encrypt(cert.mbaEmail),
                  encryptedPassword: encrypt(cert.mbaPassword),
                  consentGiven: true,
                }
              });
            }
          }
          await prisma.tutorProfile.update({
            where: { id: tutorProfile.id },
            data: { onboardingStep: Math.max(tutorProfile.onboardingStep, 3) },
          });
        }
        break;
      }

      case 4: { // Education
        const { education } = body;
        await prisma.tutorEducation.deleteMany({ where: { tutorProfileId: tutorProfile.id } });
        await prisma.tutorEducation.createMany({
          data: education.map((e: any) => ({
            tutorProfileId: tutorProfile.id,
            degree: e.degree,
            fieldOfStudy: e.fieldOfStudy,
            institution: e.institution,
            graduationYear: e.graduationYear ? parseInt(e.graduationYear) : null,
          })),
        });
        await prisma.tutorProfile.update({
          where: { id: tutorProfile.id },
          data: { onboardingStep: Math.max(tutorProfile.onboardingStep, 4) },
        });
        break;
      }

      case 5: { // Description
        const { about, experienceHighlight } = body;
        await prisma.tutorProfile.update({
          where: { id: tutorProfile.id },
          data: {
            about,
            experienceHighlight: experienceHighlight || null,
            onboardingStep: Math.max(tutorProfile.onboardingStep, 5),
          },
        });
        break;
      }

      case 6: { // Video
        const { videoUrl } = body;
        await prisma.tutorProfile.update({
          where: { id: tutorProfile.id },
          data: {
            videoUrl: videoUrl || null,
            onboardingStep: Math.max(tutorProfile.onboardingStep, 6),
          },
        });
        break;
      }

      case 7: { // Availability
        const { timezone, slots, overrides } = body;
        const normalizedSlots = Array.isArray(slots) ? slots : [];
        const normalizedOverrides = Array.isArray(overrides) ? overrides : [];

        // Validate: each slot must be on :00 or :30 boundary and exactly 30 minutes long
        for (const slot of normalizedSlots) {
          if (typeof slot.startTime !== 'string' || typeof slot.endTime !== 'string') {
            return NextResponse.json(
              { error: 'Each slot must include startTime and endTime strings' },
              { status: 400 }
            );
          }
          const startMins = timeToMinutes(slot.startTime);
          if (startMins % 30 !== 0) {
            return NextResponse.json(
              { error: 'Slot times must be on :00 or :30 boundaries' },
              { status: 400 }
            );
          }
          const expectedEnd = minutesToTime(startMins + 30);
          if (slot.endTime !== expectedEnd) {
            return NextResponse.json(
              { error: 'Each slot must be exactly 30 minutes' },
              { status: 400 }
            );
          }
        }

        const slotsByDay = normalizedSlots.reduce<Record<number, Array<{ startTime: string; endTime: string }>>>((accumulator, slot) => {
          const dayOfWeek = Number(slot.dayOfWeek);
          accumulator[dayOfWeek] = accumulator[dayOfWeek] || [];
          accumulator[dayOfWeek].push({
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
          return accumulator;
        }, {});

        for (const dailySlots of Object.values(slotsByDay)) {
          const validation = validateDailyAvailabilitySlots(dailySlots);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
        }

        const orderedSlots = Object.entries(slotsByDay).flatMap(([dayOfWeek, daySlots]) =>
          sortAvailabilitySlots(daySlots).map((slot) => ({
            tutorProfileId: tutorProfile.id,
            dayOfWeek: Number(dayOfWeek),
            startTime: slot.startTime,
            endTime: slot.endTime,
            timezone,
            isActive: true,
          }))
        );

        await prisma.$transaction(async (tx) => {
          await tx.availability.deleteMany({ where: { tutorProfileId: tutorProfile.id } });
          if (orderedSlots.length > 0) {
            await tx.availability.createMany({
              data: orderedSlots,
            });
          }

          await tx.availabilityOverride.deleteMany({ where: { tutorProfileId: tutorProfile.id } });
          if (normalizedOverrides.length > 0) {
            await tx.availabilityOverride.createMany({
              data: normalizedOverrides.map((o: any) => ({
                tutorProfileId: tutorProfile.id,
                date: new Date(o.date),
                startTime: o.startTime || null,
                endTime: o.endTime || null,
                reason: o.reason || 'Unavailable',
                isAvailable: o.isAvailable ?? false,
              })),
            });
          }

          await tx.tutorProfile.update({
            where: { id: tutorProfile.id },
            data: {
              timezone,
              onboardingStep: Math.max(tutorProfile.onboardingStep, 7),
            },
          });
        });
        break;
      }

      case 8: { // Pricing — final step
        const { pricing } = body;

        // Upsert each pricing row
        for (const p of pricing) {
          await prisma.tutorPricing.upsert({
            where: { tutorProfileId_durationMinutes: { tutorProfileId: tutorProfile.id, durationMinutes: p.durationMinutes } },
            update: { price: parseFloat(p.price), currency: p.currency, isEnabled: p.isEnabled },
            create: {
              tutorProfileId: tutorProfile.id,
              durationMinutes: p.durationMinutes,
              price: parseFloat(p.price),
              currency: p.currency || 'USD',
              isEnabled: p.isEnabled,
            },
          });
        }

        // Calculate default hourly rate from the 60-min pricing if enabled
        const sixtyMin = pricing.find((p: any) => p.durationMinutes === 60 && p.isEnabled);
        const hourlyRate = sixtyMin ? parseFloat(sixtyMin.price) : tutorProfile.hourlyRate;

        await prisma.tutorProfile.update({
          where: { id: tutorProfile.id },
          data: {
            hourlyRate,
            onboardingStep: 8,
            onboardingCompleted: true,
          },
        });
        break;
      }
    }

    return NextResponse.json({ success: true, step: stepNum });
  } catch (error: any) {
    console.error(`Onboarding step ${stepNum} error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to save step' }, { status: 500 });
  }
}
