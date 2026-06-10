import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(`Missing Supabase env vars: URL=${!!url}, SERVICE_KEY=${!!key}`);
  }

  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, RATE_LIMITS.upload);
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    if (files.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 files per request' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const uploadedFiles = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type not allowed: ${file.type}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.name} (max 5MB)` },
          { status: 400 }
        );
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const safeName = `certifications/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const bytes = await file.arrayBuffer();
      const { error } = await supabase.storage
        .from('avatars')
        .upload(safeName, bytes, { contentType: file.type, upsert: false });

      if (error) {
        console.error('Supabase storage upload error:', error);
        return NextResponse.json(
          { error: `Storage error: ${error.message}` },
          { status: 500 }
        );
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(safeName);

      uploadedFiles.push({ name: file.name, url: publicUrl, size: file.size, type: file.type });
    }

    return NextResponse.json({ files: uploadedFiles });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload files' },
      { status: 500 }
    );
  }
}
