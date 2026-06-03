import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET - Retrieve all documents for a specific mother
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ motherId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { motherId } = await params;

    // Security: Mothers can only view their own documents
    if (session.user.role === 'MOTHER' && session.user.motherId !== motherId) {
      return NextResponse.json({ 
        error: 'You do not have permission to view these documents' 
      }, { status: 403 });
    }

    // Verify mother exists
    const mother = await prisma.mother.findUnique({
      where: { id: motherId }
    });

    if (!mother) {
      return NextResponse.json({ 
        error: 'Mother not found' 
      }, { status: 404 });
    }

    // Fetch documents with document type information
    const documents = await prisma.document.findMany({
      where: { motherId },
      include: {
        documentType: true
      },
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json({ data: documents });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a document (ADMIN, MIDWIFE, or MOTHER)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ motherId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { motherId } = await params;
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ 
        error: 'Document ID is required' 
      }, { status: 400 });
    }

    // Find the document
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return NextResponse.json({ 
        error: 'Document not found' 
      }, { status: 404 });
    }

    // Security: Verify ownership and permissions
    if (document.motherId !== motherId) {
      return NextResponse.json({ 
        error: 'Invalid mother ID for this document' 
      }, { status: 400 });
    }

    // Mothers can only delete their own documents
    if (session.user.role === 'MOTHER' && session.user.motherId !== motherId) {
      return NextResponse.json({ 
        error: 'You do not have permission to delete this document' 
      }, { status: 403 });
    }

    // Delete document
    await prisma.document.delete({
      where: { id: documentId }
    });

    return NextResponse.json({ 
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
