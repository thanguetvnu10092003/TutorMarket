import { NextResponse } from 'next/server';
import { requireAdminSession, updateFeaturedTutors } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const tutorProfileIds = Array.isArray(body.tutorProfileIds) ? body.tutorProfileIds : [];

    await updateFeaturedTutors({
      adminId: session.user.id,
      tutorProfileIds,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Featured tutors update error:', error);
    return NextResponse.json({ error: 'Failed to update featured tutors' }, { status: 500 });
  }
}
