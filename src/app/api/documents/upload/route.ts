import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    let motherId = formData.get('motherId') as string | null;
    const documentTypeId = formData.get('documentTypeId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    if (!documentTypeId) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
    }

    // Determine the motherId based on the role
    if (session.user.role === 'MOTHER') {
      motherId = session.user.motherId!;
    } else if (session.user.role === 'MIDWIFE') {
      // In a real application, check if the midwife manages this mother
      if (!motherId) {
         return NextResponse.json({ error: 'Mother ID is required for Midwife' }, { status: 400 });
      }
    } else if (session.user.role === 'ADMIN') {
      if (!motherId) {
        return NextResponse.json({ error: 'Mother ID is required for Admin' }, { status: 400 });
      }
    }

    if (!motherId) {
       return NextResponse.json({ error: 'Mother ID could not be determined' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to Database
    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileUrl: `/api/documents/download/file`, // placeholder, we will append ID later
        fileData: buffer,
        documentTypeId,
        motherId,
      }
    });

    // Update the fileUrl to point to the actual ID
    await prisma.document.update({
      where: { id: document.id },
      data: { fileUrl: `/api/documents/download/file?id=${document.id}` }
    });

    return NextResponse.json({ message: 'File uploaded successfully', data: document }, { status: 201 });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
