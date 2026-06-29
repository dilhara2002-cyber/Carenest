import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface UploadFailure {
  fileName: string;
  error: string;
}

/**
 * Normalize a registration number by stripping non-alphanumeric characters
 * and converting to uppercase to ensure flexible matching.
 */
function normalizeRegNumber(regNum: string): string {
  return regNum.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Generate CSV content for failed uploads (Excel-compatible)
 */
function generateErrorReport(failures: UploadFailure[]): string {
  let csv = '\uFEFF'; // UTF-8 BOM for proper Excel encoding
  csv += 'Mother Registration Number,Error Description\n';
  
  failures.forEach(failure => {
    const regNo = failure.fileName.replace(/\.pdf$/i, '').trim();
    const escapedError = failure.error.replace(/"/g, '""');
    csv += `"${regNo}","${escapedError}"\n`;
  });
  
  return csv;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // 1. Verify authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based access control: only ADMIN and MIDWIFE can upload
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MIDWIFE') {
      return NextResponse.json({ 
        error: 'Only administrators and midwives can upload documents' 
      }, { status: 403 });
    }

    // 2. Parse FormData
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

    // 3. Fetch all mothers and cache normalized MOH/NIC numbers for matching
    const mothers = await prisma.mother.findMany({
      select: {
        id: true,
        mohRegistrationNumber: true,
        nicNumber: true
      }
    });

    const motherMap = new Map<string, string>(); // normalizedReg -> motherId
    for (const m of mothers) {
      if (m.mohRegistrationNumber) {
        const norm = normalizeRegNumber(m.mohRegistrationNumber);
        if (norm) motherMap.set(norm, m.id);
      }
      if (m.nicNumber) {
        const norm = normalizeRegNumber(m.nicNumber);
        if (norm) motherMap.set(norm, m.id);
      }
    }

    const failures: UploadFailure[] = [];
    let successCount = 0;

    // 4. Process each uploaded file
    for (const file of files) {
      // Validate file type
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        failures.push({
          fileName: file.name,
          error: 'Only PDF files are allowed'
        });
        continue;
      }

      // Extract filename without extension
      const fileNameBase = file.name.replace(/\.pdf$/i, '').trim();
      const normalizedFileName = normalizeRegNumber(fileNameBase);

      if (!normalizedFileName) {
        failures.push({
          fileName: file.name,
          error: 'Filename does not contain a valid registration number'
        });
        continue;
      }

      // Find matching mother by normalized registration number
      const motherId = motherMap.get(normalizedFileName);

      if (!motherId) {
        failures.push({
          fileName: file.name,
          error: 'MOH registration number not found in system'
        });
        continue;
      }

      try {
        // Read file content as Buffer
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Create document record in database, storing fileData as BLOB
        const doc = await prisma.document.create({
          data: {
            fileName: file.name,
            fileUrl: '', // Will populate with exact download path below
            documentTypeId,
            motherId,
            fileData: fileBuffer
          }
        });

        // Set secure internal download URL referencing the document ID
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            fileUrl: `/api/documents/download/${doc.id}`
          }
        });

        successCount++;
      } catch (error) {
        failures.push({
          fileName: file.name,
          error: `Database write failure: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    // 5. Response logic
    if (failures.length > 0) {
      const csvContent = generateErrorReport(failures);
      
      // Return the CSV file directly as an immediate download stream
      return new NextResponse(csvContent, {
        status: 207, // Multi-Status for partial success
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="document_upload_errors_${Date.now()}.csv"`,
          'X-Success-Count': successCount.toString(),
          'X-Failure-Count': failures.length.toString(),
          'Access-Control-Expose-Headers': 'X-Success-Count, X-Failure-Count'
        }
      });
    }

    // 100% of files succeeded
    return NextResponse.json({
      success: true,
      successCount,
      failureCount: 0,
      message: `Successfully uploaded ${successCount} document(s)`
    }, { status: 200 });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    );
  }
}
