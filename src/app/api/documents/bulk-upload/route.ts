import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface UploadFailure {
  fileName: string;
  error: string;
}

interface UploadResult {
  successCount: number;
  failureCount: number;
  failures: UploadFailure[];
}

/**
 * Generate Excel/CSV content for failed uploads
 */
function generateErrorReport(failures: UploadFailure[]): string {
  // Create CSV format (Excel-compatible)
  let csv = 'Mother Registration Number,Error Description\n';
  
  failures.forEach(failure => {
    const mohNumber = failure.fileName.replace(/\.pdf$/i, '').replace(/^[^_]*_/, '');
    csv += `"${mohNumber}","${failure.error}"\n`;
  });
  
  return csv;
}

/**
 * Extract MOH registration number from filename
 * Expected format: REG_NO.pdf or similar
 */
function extractMohNumber(filename: string): string | null {
  const match = filename.match(/(.+?)(?:\.[^.]+)?$/);
  if (match) {
    return match[1].trim();
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verify authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role - only ADMIN and MIDWIFE can upload
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MIDWIFE') {
      return NextResponse.json({ 
        error: 'Only administrators and midwives can upload documents' 
      }, { status: 403 });
    }

    // Parse FormData
    const formData = await req.formData();
    const documentTypeId = formData.get('documentTypeId') as string;
    const files = formData.getAll('files') as File[];

    if (!documentTypeId) {
      return NextResponse.json({ 
        error: 'Document type is required' 
      }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ 
        error: 'No files provided' 
      }, { status: 400 });
    }

    // Verify document type exists
    const docType = await prisma.documentType.findUnique({
      where: { id: documentTypeId }
    });

    if (!docType) {
      return NextResponse.json({ 
        error: 'Invalid document type' 
      }, { status: 400 });
    }

    // Process files
    const failures: UploadFailure[] = [];
    let successCount = 0;

    for (const file of files) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        failures.push({
          fileName: file.name,
          error: 'Only PDF files are allowed'
        });
        continue;
      }

      // Extract MOH number from filename
      const mohNumber = extractMohNumber(file.name);
      
      if (!mohNumber) {
        failures.push({
          fileName: file.name,
          error: 'Could not extract registration number from filename'
        });
        continue;
      }

      // Find mother by MOH registration number
      const mother = await prisma.mother.findFirst({
        where: {
          OR: [
            { mohRegistrationNumber: mohNumber },
            { nicNumber: mohNumber }
          ]
        }
      });

      if (!mother) {
        failures.push({
          fileName: file.name,
          error: `MOH registration number not found in system: ${mohNumber}`
        });
        continue;
      }

      try {
        // TODO: Upload file to Supabase storage
        // For now, we'll use a placeholder file path
        // In production, implement Supabase upload logic here
        
        const fileName = `${Date.now()}-${file.name}`;
        const fileUrl = `/documents/${mother.id}/${fileName}`;
        
        // Create document record in database
        await prisma.document.create({
          data: {
            fileUrl,
            fileName: file.name,
            documentTypeId,
            motherId: mother.id
          }
        });

        successCount++;
      } catch (error) {
        failures.push({
          fileName: file.name,
          error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    // Prepare response
    const result: UploadResult = {
      successCount,
      failureCount: failures.length,
      failures
    };

    // If there are failures, include error report
    if (failures.length > 0) {
      const csvContent = generateErrorReport(failures);
      
      // Return both status and error data
      return NextResponse.json(
        { 
          ...result,
          hasFailures: true,
          errorReport: csvContent
        },
        { status: 207 } // 207 Multi-Status for partial success
      );
    }

    // All files uploaded successfully
    return NextResponse.json({
      ...result,
      message: `Successfully uploaded ${successCount} document(s)`,
      hasFailures: false
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve document types for dropdown
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentTypes = await prisma.documentType.findMany({
      orderBy: { name: 'asc' }
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
