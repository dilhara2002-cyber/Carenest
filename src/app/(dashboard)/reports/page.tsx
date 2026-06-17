'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Button, Select } from '@/components/ui';
import { FileText, Download, Calendar, Users, Syringe, BarChart3, Plus, Trash2, AlertCircle } from 'lucide-react';

export default function ReportsPage() {
  const { data: session } = useSession();
  const [reportType, setReportType] = useState('mothers');
  const [dateRange, setDateRange] = useState('month');

  // Custom Date Picker States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<{
    id: string;
    name: string;
    createdAt: string;
  }[]>([]);
  const [newDocTypeName, setNewDocTypeName] = useState('');
  const [docTypeLoading, setDocTypeLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch document types
  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchDocumentTypes();
    }
  }, [session]);

  const fetchDocumentTypes = async () => {
    try {
      const res = await fetch('/api/documents/types');
      if (res.ok) {
        const data = await res.json();
        setDocumentTypes(data.data || []);
      }
    } catch (err) {
      setError('Failed to load document types');
    }
  };

  const handleCreateDocumentType = async () => {
    if (!newDocTypeName.trim()) {
      setError('Document type name is required');
      return;
    }

    setDocTypeLoading(true);
    setError('');

    try {
      const res = await fetch('/api/documents/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDocTypeName.trim() })
      });

      if (res.ok || res.status === 201) {
        setNewDocTypeName('');
        await fetchDocumentTypes();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create document type');
      }
    } catch (err) {
      setError('Error creating document type');
    } finally {
      setDocTypeLoading(false);
    }
  };

  const handleDeleteDocumentType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document type?')) return;

    try {
      const res = await fetch(`/api/documents/types?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchDocumentTypes();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete document type');
      }
    } catch (err) {
      setError('Error deleting document type');
    }
  };

  const reportTypes = [
    { value: 'mothers', label: 'Mothers Report', icon: Users },
    { value: 'visits', label: 'Visits Report', icon: Calendar },
    { value: 'vaccinations', label: 'Vaccinations Report', icon: Syringe },
    { value: 'summary', label: 'Summary Report', icon: BarChart3 },
  ];

  const generateReport = async () => {
    // Basic frontend validation for custom range selection
    if (dateRange === 'custom' && (!startDate || !endDate)) {
      alert('Please select both a start date and an end date.');
      return;
    }

    setLoading(true);

    try {
      // Build request query string parameters dynamically
      let url = `/api/${reportType}?range=${dateRange}`;
      if (dateRange === 'custom') {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        // Handle PDF generation stream or download links here when ready
        alert('Report generated successfully with your selected date range!');
      } else {
        alert('Failed to generate report. Please check API connections.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while generating your report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500">Generate and download system reports</p>
      </div>

      {/* Document Type Management - ADMIN Only */}
      {session?.user?.role === 'ADMIN' && (
        <Card>
          <CardHeader>
            <CardTitle>Document Type Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Create New Document Type */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900">
                Add New Document Type
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDocTypeName}
                  onChange={(e) => setNewDocTypeName(e.target.value)}
                  placeholder="e.g., H15 Card, Blood Report, Anomaly Scan"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateDocumentType()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <Button
                  onClick={handleCreateDocumentType}
                  isLoading={docTypeLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Type
                </Button>
              </div>
            </div>

            {/* Document Types List */}
            {documentTypes.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <label className="block text-sm font-medium text-gray-900">
                  Existing Document Types
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {documentTypes.map((docType: { id: string; name: string; _count?: { documents: number } }) => (
                    <div
                      key={docType.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{docType.name}</p>
                        {docType._count?.documents > 0 && (
                          <p className="text-xs text-gray-500">
                            {docType._count.documents} document(s)
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteDocumentType(docType.id)}
                        disabled={docType._count?.documents > 0}
                        className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={docType._count?.documents > 0 ? 'Cannot delete - has documents' : 'Delete type'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Report Type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={reportTypes.map(r => ({ value: r.value, label: r.label }))}
            />
            <Select
              label="Date Range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: 'week', label: 'Last 7 Days' },
                { value: 'month', label: 'Last 30 Days' },
                { value: 'quarter', label: 'Last 3 Months' },
                { value: 'year', label: 'Last Year' },
                { value: 'all', label: 'All Time' },
                { value: 'custom', label: 'Custom Range 📅' },
              ]}
            />

            {/* Custom Date Pickers render conditionally with smooth CSS transitions */}
            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 block">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 block">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
                  />
                </div>
              </div>
            )}

            <Button className="w-full mt-2" onClick={generateReport} isLoading={loading}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        {/* Report Types Grid Preview Selector */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Available Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {reportTypes.map((report) => {
                const Icon = report.icon;
                return (
                  <div
                    key={report.value}
                    onClick={() => setReportType(report.value)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${reportType === report.value
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <Icon className={`h-8 w-8 mb-2 ${reportType === report.value ? 'text-teal-600' : 'text-gray-400'
                      }`} />
                    <h4 className="font-medium">{report.label}</h4>
                    <p className="text-sm text-gray-500">
                      {report.value === 'mothers' && 'List of registered mothers with details'}
                      {report.value === 'visits' && 'Visit history and statistics'}
                      {report.value === 'vaccinations' && 'Vaccination coverage report'}
                      {report.value === 'summary' && 'Overall system summary'}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports history dashboard tracking logic card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Monthly Summary - March 2026', date: '2026-03-31', type: 'Summary' },
              { name: 'Vaccination Report - Q1 2026', date: '2026-03-15', type: 'Vaccinations' },
              { name: 'Mother Registration Report', date: '2026-03-01', type: 'Mothers' },
            ].map((report, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-sm text-gray-500">{report.type} • {report.date}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}