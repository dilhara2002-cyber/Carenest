import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET - Retrieve all document types
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentTypes = await prisma.documentType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { documents: true }
        }
      }
    });

    return NextResponse.json({ data: documentTypes });

  } catch (error) {
    console.error('Error fetching document types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document types' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new document type (ADMIN only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verify authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Only administrators can create document types' 
      }, { status: 403 });
    }

    const { name } = await req.json();

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ 
        error: 'Document type name is required' 
      }, { status: 400 });
    }

    // Check if document type already exists
    const existing = await prisma.documentType.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return NextResponse.json({ 
        error: 'Document type already exists' 
      }, { status: 409 });
    }

    // Create new document type
    const documentType = await prisma.documentType.create({
      data: {
        name: name.trim()
      }
    });

    return NextResponse.json({ 
      data: documentType,
      message: `Document type "${documentType.name}" created successfully`
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating document type:', error);
    return NextResponse.json(
      { error: 'Failed to create document type' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a document type (ADMIN only)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verify authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Only administrators can delete document types' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: 'Document type ID is required' 
      }, { status: 400 });
    }

    // Check if document type exists
    const documentType = await prisma.documentType.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } }
    });

    if (!documentType) {
      return NextResponse.json({ 
        error: 'Document type not found' 
      }, { status: 404 });
    }

    if (documentType._count.documents > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete document type with existing documents' 
      }, { status: 400 });
    }

    // Delete document type
    await prisma.documentType.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: `Document type deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting document type:', error);
    return NextResponse.json(
      { error: 'Failed to delete document type' },
      { status: 500 }
    );
  }
}
