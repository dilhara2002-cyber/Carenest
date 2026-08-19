import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET - Retrieve recent documents with role-based access control
 * Query params: limit (optional, default 10)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Build query based on role
    let whereClause: any = {};

    if (session.user.role === 'MOTHER') {
      // Mothers can only see their own documents
      whereClause.motherId = session.user.motherId;
    } else if (session.user.role === 'MIDWIFE') {
      // Midwives can see documents for their assigned mothers
      whereClause.mother = {
        assignedMidwifeId: session.user.midwifeId
      };
    }
    // ADMIN can see all documents (no filter)

    // Fetch recent documents
    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        documentType: {
          select: {
            id: true,
            name: true
          }
        },
        mother: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      },
      take: limit
    });

    return NextResponse.json({ 
      data: documents,
      count: documents.length
    });

  } catch (error) {
    console.error('Error fetching recent documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent documents' },
      { status: 500 }
    );
  }
}
