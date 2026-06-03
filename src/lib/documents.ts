/**
 * Document Management Utilities
 * Helper functions for document operations across the CareNest application
 */

import { Document, DocumentType, BulkUploadFailure } from '@/types';

/**
 * Extract MOH registration number from filename
 * Expects format like: "2026-MAH-102.pdf" or similar
 */
export function extractMohNumberFromFilename(filename: string): string | null {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  return nameWithoutExt.trim() || null;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate PDF file
 */
export function isValidPdf(file: File): boolean {
  return file.type === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Generate CSV content from bulk upload errors
 */
export function generateErrorReportCsv(failures: BulkUploadFailure[]): string {
  let csv = 'Mother Registration Number,Error Description\n';
  
  failures.forEach(failure => {
    const mohNumber = failure.fileName.replace(/\.pdf$/i, '');
    const errorSafe = failure.error.replace(/"/g, '""');
    csv += `"${mohNumber}","${errorSafe}"\n`;
  });
  
  return csv;
}

/**
 * Download file from blob
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const element = document.createElement('a');
  const file = new Blob([content], { type: mimeType });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
}

/**
 * Group documents by type
 */
export function groupDocumentsByType(documents: Document[]): Map<string, Document[]> {
  const grouped = new Map<string, Document[]>();
  
  documents.forEach(doc => {
    const typeName = doc.documentType.name;
    if (!grouped.has(typeName)) {
      grouped.set(typeName, []);
    }
    grouped.get(typeName)!.push(doc);
  });
  
  return grouped;
}

/**
 * Get most recently uploaded document
 */
export function getMostRecentDocument(documents: Document[]): Document | null {
  if (documents.length === 0) return null;
  
  return documents.reduce((latest, current) => {
    const latestDate = new Date(latest.uploadedAt);
    const currentDate = new Date(current.uploadedAt);
    return currentDate > latestDate ? current : latest;
  });
}

/**
 * Format upload progress percentage
 */
export function formatUploadProgress(loaded: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((loaded / total) * 100);
}

/**
 * Safe filename for download
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9._-]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 255);
}

/**
 * Get document type badge color
 */
export function getDocumentTypeBadgeColor(documentTypeName: string): {
  bg: string;
  text: string;
  border: string;
} {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'H15 Card': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'Blood Report': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'Anomaly Scan': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    'Growth Scan': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'Vaccination Record': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    'Lab Results': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  };

  return colorMap[documentTypeName] || {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200'
  };
}

/**
 * Validate document file before upload
 */
export interface DocumentValidationError {
  valid: boolean;
  error?: string;
}

export function validateDocumentFile(file: File): DocumentValidationError {
  // Check file type
  if (!isValidPdf(file)) {
    return {
      valid: false,
      error: 'Only PDF files are allowed'
    };
  }

  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than 50MB (current: ${formatFileSize(file.size)})`
    };
  }

  // Check filename
  if (!file.name || file.name.length === 0) {
    return {
      valid: false,
      error: 'File must have a valid name'
    };
  }

  return { valid: true };
}
