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
      where: { userId: session.user.id },
      include: {
        education: true,
        certifications: true,
      }
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
    const { hourlyRate, languages, headline, about, yearsOfExperience, education, certifications } = data;

    // Basic validation
    if (hourlyRate !== undefined && (typeof hourlyRate !== 'number' || hourlyRate < 0)) {
       return NextResponse.json({ error: 'Invalid hourly rate' }, { status: 400 });
    }

    if (languages !== undefined && (!Array.isArray(languages) || languages.length === 0)) {
        return NextResponse.json({ error: 'Languages must be a non-empty array' }, { status: 400 });
    }

    // Use a transaction to update profile and nested relations
    const updatedProfile = await prisma.$transaction(async (tx) => {
      // 1. Update main profile fields
      const profile = await tx.tutorProfile.update({
        where: { userId: session.user.id },
        data: {
          hourlyRate: hourlyRate !== undefined ? hourlyRate : undefined,
          languages: languages !== undefined ? languages : undefined,
          headline: headline !== undefined ? headline : undefined,
          about: about !== undefined ? about : undefined,
          yearsOfExperience: yearsOfExperience !== undefined ? yearsOfExperience : undefined,
        }
      });

      // 2. Handle Education (Upsert strategy)
      if (education !== undefined && Array.isArray(education)) {
        const currentEducation = await tx.tutorEducation.findMany({
          where: { tutorProfileId: profile.id }
        });

        // Delete removed items
        const incomingIds = education.map((edu: any) => edu.id).filter(Boolean);
        await tx.tutorEducation.deleteMany({
          where: { 
            tutorProfileId: profile.id,
            id: { notIn: incomingIds }
          }
        });

        for (const edu of education) {
          if (edu.id) {
            await tx.tutorEducation.update({
              where: { id: edu.id },
              data: {
                degree: edu.degree,
                fieldOfStudy: edu.fieldOfStudy || '',
                institution: edu.institution || '',
                graduationYear: edu.graduationYear ? Number(edu.graduationYear) : null,
                displayOrder: edu.displayOrder || 0,
              }
            });
          } else {
            await tx.tutorEducation.create({
              data: {
                tutorProfileId: profile.id,
                degree: edu.degree,
                fieldOfStudy: edu.fieldOfStudy || '',
                institution: edu.institution || '',
                graduationYear: edu.graduationYear ? Number(edu.graduationYear) : null,
                displayOrder: edu.displayOrder || 0,
              }
            });
          }
        }
      }

      // 3. Handle Certifications (Upsert strategy)
      if (certifications !== undefined && Array.isArray(certifications)) {
        const currentCerts = await tx.tutorCertification.findMany({
          where: { tutorProfileId: profile.id }
        });

        // Identify which certs to keep/update vs delete
        // We use type + levelOrVariant as unique key for "matching" if ID is missing.
        // Actually, in the frontend we should probably pass the ID back.
        
        const incomingCerts = certifications.map((cert: any) => {
          const scoreValue = cert.score !== undefined && cert.score !== null && cert.score !== '' ? Number(cert.score) : null;
          return { ...cert, score: scoreValue };
        });

        // 1. Delete ones not in payload
        // Determine "Keys" in payload to decide what to delete
        const payloadKeys = incomingCerts.map(c => `${c.type}-${c.levelOrVariant || ''}`);
        await tx.tutorCertification.deleteMany({
          where: {
            tutorProfileId: profile.id,
            NOT: incomingCerts.map(c => ({
              type: c.type,
              levelOrVariant: c.levelOrVariant || null,
            }))
          }
        });

        // 2. Upsert
        for (const cert of incomingCerts) {
          const existing = currentCerts.find(c => 
            c.type === cert.type && 
            (c.levelOrVariant === cert.levelOrVariant || (!c.levelOrVariant && !cert.levelOrVariant))
          );

          if (existing) {
            // UPDATE: Preserve status, notes, verifiedAt, verifiedById
            await tx.tutorCertification.update({
              where: { id: existing.id },
              data: {
                score: cert.score,
                percentiles: cert.percentiles || existing.percentiles, // Sustain existing percentiles if not provided
                testDate: cert.testDate ? new Date(cert.testDate) : existing.testDate,
                // STATUS IS PRESERVED BY OMISSION
              }
            });
          } else {
            // CREATE NEW
            await tx.tutorCertification.create({
              data: {
                tutorProfileId: profile.id,
                type: cert.type,
                levelOrVariant: cert.levelOrVariant || null,
                score: cert.score,
                percentiles: cert.percentiles || null,
                testDate: cert.testDate ? new Date(cert.testDate) : null,
                status: 'SELF_REPORTED',
              }
            });
          }
        }
      }

      return profile;
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
