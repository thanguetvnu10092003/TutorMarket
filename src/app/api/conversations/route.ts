import { NextRequest, NextResponse } from 'next/server';
import { conversations, users, tutorProfiles } from '@/lib/mock-data';

// GET /api/conversations — List own conversations
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'student-001';

  const userConvos = conversations
    .filter(c => c.studentId === userId || tutorProfiles.some(p => p.id === c.tutorProfileId && p.userId === userId))
    .map(c => {
      const student = users.find(u => u.id === c.studentId);
      const profile = tutorProfiles.find(p => p.id === c.tutorProfileId);
      const tutor = profile ? users.find(u => u.id === profile.userId) : null;
      return { ...c, student, tutor };
    })
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return NextResponse.json({ data: userConvos });
}
