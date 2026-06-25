import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // 1. Verify authentication
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { documentId } = await params;

    if (!documentId) {
      return new NextResponse('Document ID is required', { status: 400 });
    }

    // 2. Fetch the document metadata and binary data
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        mother: true
      }
    });

    if (!document) {
      return new NextResponse('Document not found', { status: 404 });
    }

    // 3. Security Guardrail: Role-based access control check
    const userRole = session.user.role;
    
    if (userRole === 'MOTHER') {
      // Mothers can only view/download their own documents
      if (session.user.motherId !== document.motherId) {
        return new NextResponse('You do not have permission to access this document', { status: 403 });
      }
    } else if (userRole !== 'MIDWIFE' && userRole !== 'ADMIN') {
      // Unrecognized role
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check if the file data exists in the database
    if (!document.fileData) {
      return new NextResponse('File content is empty or corrupted', { status: 500 });
    }

    // 4. Stream file back to the browser
    // Content-Disposition "inline" allows opening natively, "attachment" forces download
    const disposition = req.nextUrl.searchParams.get('download') === 'true' ? 'attachment' : 'inline';
    
    return new NextResponse(Buffer.from(document.fileData), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(document.fileName)}"`,
        'Content-Length': document.fileData.length.toString(),
        'Cache-Control': 'private, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Error streaming document download:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
