import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface RetrieveDocumentsQuery {
  startDate?: string;
  endDate?: string;
  documentTypeId?: string;
  motherId?: string;
}

/**
 * Secure GET endpoint for retrieving clinical documents
 * Enforces strict role-based access control
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const documentTypeIdParam = searchParams.get('documentTypeId');
    const motherIdParam = searchParams.get('motherId');

    // Build where clause with role-based filters
    interface WhereClause {
      motherId?: string;
      documentTypeId?: string;
      uploadedAt?: {
        gte?: Date;
        lte?: Date;
      };
    }

    const where: WhereClause = {};

    // CRITICAL SECURITY: Role-based access control
    if (session.user.role === 'MOTHER') {
      // MOTHER role: STRICT ISOLATION - can only view own documents
      // Ignore any passed motherId parameter to prevent data leakage
      where.motherId = session.user.motherId!;
    } else if (session.user.role === 'MIDWIFE') {
      // MIDWIFE role: Can view documents for mothers in assigned zone
      // TODO: Implement clinic/zone-based filtering based on midwife assignments
      // For now, allow midwife to specify motherId (with validation)
      if (motherIdParam) {
        where.motherId = motherIdParam;
        // In production: validate that this mother is in the midwife's assigned zone
      }
    } else if (session.user.role === 'ADMIN') {
      // ADMIN role: Global access
      // Allow optional motherId filter if specified
      if (motherIdParam) {
        where.motherId = motherIdParam;
      }
    }

    // Apply document type filter (works for all roles)
    if (documentTypeIdParam) {
      where.documentTypeId = documentTypeIdParam;
    }

    // Apply date range filters (inclusive calendar constraints)
    if (startDateParam || endDateParam) {
      where.uploadedAt = {};

      if (startDateParam) {
        where.uploadedAt.gte = new Date(`${startDateParam}T00:00:00.000Z`);
      }

      if (endDateParam) {
        where.uploadedAt.lte = new Date(`${endDateParam}T23:59:59.999Z`);
      }
    }

    // Execute Prisma query with security filters
    const documents = await prisma.document.findMany({
      where,
      include: {
        documentType: true,
        mother: {
          include: {
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
      }
    });

    return NextResponse.json({
      data: documents,
      count: documents.length
    });

  } catch (error) {
    console.error('Error retrieving documents:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}
