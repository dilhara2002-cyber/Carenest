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
    
    // Determine content type based on extension (case-insensitive)
    let contentType = 'application/octet-stream';
    const lowerName = document.fileName.toLowerCase();
    
    if (lowerName.endsWith('.pdf')) contentType = 'application/pdf';
    else if (lowerName.endsWith('.png')) contentType = 'image/png';
    else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (lowerName.endsWith('.doc')) contentType = 'application/msword';
    else if (lowerName.endsWith('.docx')) contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Some browsers have issues rendering inline if content-type is octet-stream, 
    // so we force download (attachment) if we don't know the type, otherwise inline.
    const disposition = contentType === 'application/octet-stream' ? 'attachment' : 'inline';

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${document.fileName}"`,
        'Content-Length': buffer.length.toString(),
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
