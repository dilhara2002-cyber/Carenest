import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PDFReportGenerator, formatDateRange, getDateRangeFilter } from '@/lib/reports/pdf-generator';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'MOTHER' || !session.user.motherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { range = 'all', startDate, endDate } = body;

    // Get date range for filtering
    const dateFilter = getDateRangeFilter(range, startDate, endDate);
    const dateRangeText = formatDateRange(range, startDate, endDate);

    // Fetch mother info
    const mother = await prisma.mother.findUnique({
      where: { id: session.user.motherId },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    // Fetch all documents
    const documents = await prisma.document.findMany({
      where: {
        motherId: session.user.motherId,
        uploadedAt: {
          gte: dateFilter.startDate,
          lte: dateFilter.endDate,
        },
      },
      include: {
        documentType: {
          select: { name: true },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    // Calculate statistics
    const totalDocuments = documents.length;
    
    // Group by document type
    const documentsByType = documents.reduce((acc, doc) => {
      const typeName = doc.documentType.name;
      if (!acc[typeName]) {
        acc[typeName] = [];
      }
      acc[typeName].push(doc);
      return acc;
    }, {} as Record<string, typeof documents>);

    // Count by type
    const typeCounts = Object.entries(documentsByType).map(([type, docs]) => ({
      type,
      count: docs.length,
    })).sort((a, b) => b.count - a.count);

    // Recent uploads (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUploads = documents.filter(
      (doc) => new Date(doc.uploadedAt) >= thirtyDaysAgo
    ).length;

    // Generate PDF
    const pdf = new PDFReportGenerator();

    // Header
    pdf.addHeader({
      title: 'My Documents',
      subtitle: 'Medical Records Inventory',
      dateRange: dateRangeText,
      generatedBy: mother?.user.name || 'Mother',
    });

    // Statistics Cards
    pdf.addStatCards([
      { label: 'Total Documents', value: totalDocuments, color: '#14B8A6' },
      { label: 'Document Types', value: typeCounts.length, color: '#3B82F6' },
      { label: 'Recent Uploads', value: recentUploads, color: '#10B981' },
      { label: 'Last 30 Days', value: recentUploads, color: '#EC4899' },
    ]);

    pdf.addSpace(10);

    // Introduction
    pdf.addSectionTitle('About Your Documents');
    pdf.addParagraph(
      `This report provides a comprehensive inventory of all your medical documents stored in the CareNest system. ` +
      `These documents include test results, scan reports, health cards, and other important medical records uploaded by your healthcare provider. ` +
      `You can access and download these documents anytime through the CareNest portal.`
    );

    pdf.addSpace(10);

    // Documents by Type Summary
    if (typeCounts.length > 0) {
      pdf.addSectionTitle('Documents by Category');
      const typeRows = typeCounts.map((item, index) => [
        (index + 1).toString(),
        item.type,
        item.count.toString(),
        `${Math.round((item.count / totalDocuments) * 100)}%`,
      ]);
      
      pdf.addTable({
        headers: ['#', 'Document Type', 'Count', 'Percentage'],
        rows: typeRows,
      });

      pdf.addSpace(10);
    }

    // Detailed Document List by Type
    for (const [typeName, docs] of Object.entries(documentsByType)) {
      pdf.addSectionTitle(`${typeName} (${docs.length})`);
      
      const docRows = docs.map((doc, index) => [
        (index + 1).toString(),
        doc.fileName,
        new Date(doc.uploadedAt).toLocaleDateString(),
        new Date(doc.uploadedAt).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      ]);

      pdf.addTable({
        headers: ['#', 'File Name', 'Upload Date', 'Time'],
        rows: docRows,
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 80 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
        },
      });

      pdf.addSpace(8);
    }

    // Timeline of Uploads
    if (documents.length > 0) {
      pdf.addSectionTitle('Upload Timeline');
      
      // Group by month
      const monthlyUploads = documents.reduce((acc, doc) => {
        const date = new Date(doc.uploadedAt);
        const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        acc[monthYear] = (acc[monthYear] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const timelineRows = Object.entries(monthlyUploads).map(([month, count]) => [
        month,
        count.toString(),
        '█'.repeat(Math.min(count, 20)), // Visual bar
      ]);

      pdf.addTable({
        title: 'Monthly Upload Activity',
        headers: ['Month', 'Count', 'Activity'],
        rows: timelineRows,
      });

      pdf.addSpace(10);
    }

    // Summary and Guidance
    pdf.addSectionTitle('Document Management Summary');
    let summary = `You have ${totalDocuments} medical document(s) stored in your CareNest account covering the period ${dateRangeText}. `;
    
    if (typeCounts.length > 0) {
      summary += `These documents are organized into ${typeCounts.length} different categories. `;
      summary += `The most common type is "${typeCounts[0].type}" with ${typeCounts[0].count} document(s). `;
    }
    
    if (recentUploads > 0) {
      summary += `${recentUploads} document(s) were uploaded in the last 30 days. `;
    }
    
    summary += `All documents are securely stored and can be accessed or downloaded anytime through your patient portal.`;
    
    pdf.addParagraph(summary);

    // How to Access Documents
    pdf.addSpace(10);
    pdf.addSectionTitle('How to Access Your Documents');
    const accessSteps = [
      '1. Log in to your CareNest account at the patient portal',
      '2. Navigate to the "My Reports" or "Documents" section',
      '3. Browse documents by category or use the search function',
      '4. Click "View" to preview any document in your browser',
      '5. Click "Download" to save a copy to your device',
      '6. Documents are organized by type for easy navigation',
    ];

    accessSteps.forEach((step) => {
      pdf.addParagraph(step, 10);
    });

    // Important Notes
    pdf.addSpace(10);
    pdf.addSectionTitle('Important Information');
    const notes = [
      '• Keep copies of important documents for your personal records',
      '• Bring relevant documents to your appointments',
      '• Contact your midwife if you notice any missing or incorrect documents',
      '• New test results and scans will be uploaded by your healthcare provider',
      '• All documents are confidential and securely stored',
      '• You can view and download your documents anytime, 24/7',
    ];

    notes.forEach((note) => {
      pdf.addParagraph(note, 10);
    });

    if (totalDocuments === 0) {
      pdf.addSpace(10);
      pdf.addParagraph(
        'Note: No documents have been uploaded during this period. Documents will be uploaded by your healthcare provider as you complete tests, scans, and appointments.',
        10
      );
    }

    // Add footer
    pdf.addFooter(mother?.user.name || 'Mother');

    // Return PDF as response
    const pdfBuffer = Buffer.from(pdf.getArrayBuffer());

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="my-documents-inventory-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating mother documents report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
