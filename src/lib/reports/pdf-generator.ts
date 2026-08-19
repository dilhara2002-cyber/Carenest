import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable: {
      finalY: number;
    };
  }
}

export interface ReportConfig {
  title: string;
  subtitle?: string;
  dateRange?: string;
  generatedBy?: string;
  clinicInfo?: {
    name: string;
    address?: string;
    phone?: string;
  };
}

export interface StatCard {
  label: string;
  value: string | number;
  color: string;
}

export interface TableConfig {
  title?: string;
  headers: string[];
  rows: (string | number)[][];
  columnStyles?: { [key: number]: { cellWidth: number | 'auto' } };
}

export class PDFReportGenerator {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;

  // CareNest brand colors
  private colors = {
    primary: '#14B8A6', // Teal
    secondary: '#EC4899', // Pink
    dark: '#111827', // Dark gray
    light: '#F3F4F6', // Light gray
    text: '#374151', // Text gray
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Add branded header to the report
   */
  addHeader(config: ReportConfig): void {
    // Background gradient effect
    this.doc.setFillColor(20, 184, 166); // Teal
    this.doc.rect(0, 0, this.pageWidth, 45, 'F');

    // Logo/Brand name
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('🏥 CareNest', this.margin, 20);

    // Clinic info (if provided)
    if (config.clinicInfo) {
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(config.clinicInfo.name, this.margin, 28);
      if (config.clinicInfo.address) {
        this.doc.text(config.clinicInfo.address, this.margin, 33);
      }
      if (config.clinicInfo.phone) {
        this.doc.text(config.clinicInfo.phone, this.margin, 38);
      }
    } else {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text('Maternal Health Management System', this.margin, 30);
    }

    // Report title on right side
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    const titleWidth = this.doc.getTextWidth(config.title);
    this.doc.text(config.title, this.pageWidth - this.margin - titleWidth, 20);

    // Subtitle and date range
    if (config.subtitle) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      const subtitleWidth = this.doc.getTextWidth(config.subtitle);
      this.doc.text(config.subtitle, this.pageWidth - this.margin - subtitleWidth, 28);
    }

    if (config.dateRange) {
      this.doc.setFontSize(9);
      const dateWidth = this.doc.getTextWidth(config.dateRange);
      this.doc.text(config.dateRange, this.pageWidth - this.margin - dateWidth, 35);
    }

    // Generation info
    const generatedText = `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    const genWidth = this.doc.getTextWidth(generatedText);
    this.doc.text(generatedText, this.pageWidth - this.margin - genWidth, 40);

    this.currentY = 55;
  }

  /**
   * Add statistics cards section
   */
  addStatCards(stats: StatCard[]): void {
    const cardWidth = (this.pageWidth - this.margin * 2 - 10 * (stats.length - 1)) / stats.length;
    const cardHeight = 30;
    let xPos = this.margin;

    stats.forEach((stat) => {
      // Card background
      const rgb = this.hexToRgb(stat.color);
      this.doc.setFillColor(rgb.r, rgb.g, rgb.b, 0.1);
      this.doc.roundedRect(xPos, this.currentY, cardWidth, cardHeight, 3, 3, 'F');

      // Card border
      this.doc.setDrawColor(rgb.r, rgb.g, rgb.b);
      this.doc.setLineWidth(0.5);
      this.doc.roundedRect(xPos, this.currentY, cardWidth, cardHeight, 3, 3, 'S');

      // Value (large)
      this.doc.setTextColor(rgb.r, rgb.g, rgb.b);
      this.doc.setFontSize(20);
      this.doc.setFont('helvetica', 'bold');
      const valueText = stat.value.toString();
      const valueWidth = this.doc.getTextWidth(valueText);
      this.doc.text(valueText, xPos + cardWidth / 2 - valueWidth / 2, this.currentY + 15);

      // Label (small)
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(100, 100, 100);
      const labelWidth = this.doc.getTextWidth(stat.label);
      this.doc.text(stat.label, xPos + cardWidth / 2 - labelWidth / 2, this.currentY + 24);

      xPos += cardWidth + 10;
    });

    this.currentY += cardHeight + 15;
  }

  /**
   * Add a section title
   */
  addSectionTitle(title: string): void {
    this.checkPageBreak(20);
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(17, 24, 39); // Dark gray
    this.doc.text(title, this.margin, this.currentY);

    // Underline
    const titleWidth = this.doc.getTextWidth(title);
    this.doc.setDrawColor(20, 184, 166); // Teal
    this.doc.setLineWidth(2);
    this.doc.line(this.margin, this.currentY + 2, this.margin + titleWidth, this.currentY + 2);

    this.currentY += 12;
  }

  /**
   * Add a styled table
   */
  addTable(config: TableConfig): void {
    this.checkPageBreak(40);

    if (config.title) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(55, 65, 81);
      this.doc.text(config.title, this.margin, this.currentY);
      this.currentY += 8;
    }

    autoTable(this.doc, {
      startY: this.currentY,
      head: [config.headers],
      body: config.rows,
      margin: { left: this.margin, right: this.margin },
      theme: 'grid',
      headStyles: {
        fillColor: [20, 184, 166], // Teal
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
      },
      bodyStyles: {
        textColor: [55, 65, 81],
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251], // Very light gray
      },
      columnStyles: config.columnStyles || {},
    });

    this.currentY = this.doc.lastAutoTable.finalY + 10;
  }

  /**
   * Add a text paragraph
   */
  addParagraph(text: string, fontSize: number = 10): void {
    this.checkPageBreak(20);
    
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(75, 85, 99);
    
    const maxWidth = this.pageWidth - this.margin * 2;
    const lines = this.doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      this.checkPageBreak(10);
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += 6;
    });
    
    this.currentY += 5;
  }

  /**
   * Add a key-value pair
   */
  addKeyValue(key: string, value: string): void {
    this.checkPageBreak(10);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(55, 65, 81);
    this.doc.text(key + ':', this.margin, this.currentY);
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(107, 114, 128);
    const keyWidth = this.doc.getTextWidth(key + ': ');
    this.doc.text(value, this.margin + keyWidth, this.currentY);
    
    this.currentY += 8;
  }

  /**
   * Add a divider line
   */
  addDivider(): void {
    this.checkPageBreak(10);
    this.doc.setDrawColor(229, 231, 235);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
  }

  /**
   * Add empty space
   */
  addSpace(height: number = 10): void {
    this.currentY += height;
  }

  /**
   * Add footer to all pages
   */
  addFooter(generatedBy?: string): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Footer background
      this.doc.setFillColor(249, 250, 251);
      this.doc.rect(0, this.pageHeight - 15, this.pageWidth, 15, 'F');
      
      // Page number
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(107, 114, 128);
      const pageText = `Page ${i} of ${pageCount}`;
      this.doc.text(pageText, this.margin, this.pageHeight - 8);
      
      // Confidential notice
      const confidentialText = 'Confidential Medical Report';
      const confWidth = this.doc.getTextWidth(confidentialText);
      this.doc.text(confidentialText, this.pageWidth / 2 - confWidth / 2, this.pageHeight - 8);
      
      // Generated by
      if (generatedBy) {
        const genText = `By: ${generatedBy}`;
        const genWidth = this.doc.getTextWidth(genText);
        this.doc.text(genText, this.pageWidth - this.margin - genWidth, this.pageHeight - 8);
      }
    }
  }

  /**
   * Check if we need a page break
   */
  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 25) {
      this.doc.addPage();
      this.currentY = 20;
    }
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  /**
   * Get the PDF as base64 string
   */
  getBase64(): string {
    return this.doc.output('datauristring');
  }

  /**
   * Get the PDF as blob
   */
  getBlob(): Blob {
    return this.doc.output('blob');
  }

  /**
   * Get the PDF as array buffer
   */
  getArrayBuffer(): ArrayBuffer {
    return this.doc.output('arraybuffer');
  }

  /**
   * Save the PDF
   */
  save(filename: string): void {
    this.doc.save(filename);
  }
}

/**
 * Helper function to format date ranges
 */
export function formatDateRange(range: string, startDate?: string, endDate?: string): string {
  const now = new Date();
  
  switch (range) {
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return `${weekAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`;
    case 'month':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return `${monthAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`;
    case 'quarter':
      const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return `${quarterAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`;
    case 'year':
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return `${yearAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`;
    case 'custom':
      if (startDate && endDate) {
        return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
      }
      return 'Custom Range';
    case 'all':
      return 'All Time';
    default:
      return 'Custom Period';
  }
}

/**
 * Helper function to calculate date range for queries
 */
export function getDateRangeFilter(range: string, startDate?: string, endDate?: string): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  let start: Date;
  let end: Date = now;

  switch (range) {
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      start = startDate ? new Date(startDate) : new Date(0);
      end = endDate ? new Date(endDate) : now;
      break;
    case 'all':
      start = new Date(0); // Beginning of time
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { startDate: start, endDate: end };
}
