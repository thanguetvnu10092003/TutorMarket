import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate a unique filename
      const uniqueId = Math.random().toString(36).substring(2, 11);
      const filename = `${uniqueId}-${file.name.replace(/\s+/g, '-')}`;
      
      // Path to public/uploads
      const path = join(process.cwd(), 'public', 'uploads', filename);
      
      await writeFile(path, buffer);
      
      uploadedFiles.push({
        name: file.name,
        url: `/uploads/${filename}`,
        size: file.size,
        type: file.type
      });
    }

    return NextResponse.json({ files: uploadedFiles });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}
