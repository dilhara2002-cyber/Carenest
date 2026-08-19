import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document || !document.fileData) {
      return NextResponse.json({ error: 'Document or file data not found' }, { status: 404 });
    }

    // Role-based access control
    if (session.user.role === 'MOTHER' && document.motherId !== session.user.motherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    // Note: Midwives should ideally be restricted to their assigned mothers here too.

    const buffer = document.fileData;
    
    // Determine content type based on extension (simple implementation)
    let contentType = 'application/octet-stream';
    if (document.fileName.endsWith('.pdf')) contentType = 'application/pdf';
    else if (document.fileName.endsWith('.png')) contentType = 'image/png';
    else if (document.fileName.endsWith('.jpg') || document.fileName.endsWith('.jpeg')) contentType = 'image/jpeg';

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${document.fileName}"`
      }
    });

  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    );
  }
}
