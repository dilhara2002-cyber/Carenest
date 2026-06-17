'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Download, AlertCircle, FileText, Filter, Calendar, Layers, Clock } from 'lucide-react';

interface DocumentType {
  id: string;
  name: string;
}

interface Document {
  id: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  documentType: DocumentType;
}

export default function MyReportsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Base master data states
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [uniqueTypes, setUniqueTypes] = useState<DocumentType[]>([]);

  // Step-by-Step UI Control States
  const [selectedType, setSelectedType] = useState<string>(''); // Stage 1
  const [dateRange, setDateRange] = useState<string>('all');    // Stage 2
  const [startDate, setStartDate] = useState<string>('');       // Stage 3 (Custom Pickers)
  const [endDate, setEndDate] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [downloading, setDownloading] = useState(false);

  // Enforce access control: Only mothers can access this view
  useEffect(() => {
    if (session && session.user.role !== 'MOTHER') {
      router.push('/');
    }
  }, [session, router]);

  // Initial fetch of master document records
  useEffect(() => {
    if (session?.user?.motherId) {
      fetchDocuments();
    }
  }, [session]);

  // Client-Side filtering engine enforcing sequential selection criteria
  useEffect(() => {
    if (!selectedType) {
      setFilteredDocuments([]);
      return;
    }

    let docs = [...allDocuments];

    // 1. Filter by Selected Document Type
    if (selectedType !== 'all') {
      docs = docs.filter(doc => doc.documentType.id === selectedType);
    }

    // 2. Filter by Selected Date Range Window
    if (dateRange !== 'all') {
      const now = new Date();
      const startBoundary = new Date();

      if (dateRange === 'week') {
        startBoundary.setDate(now.getDate() - 7);
        docs = docs.filter(doc => new Date(doc.uploadedAt) >= startBoundary);
      } else if (dateRange === 'month') {
        startBoundary.setMonth(now.getMonth() - 1);
        docs = docs.filter(doc => new Date(doc.uploadedAt) >= startBoundary);
      } else if (dateRange === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Capture records late that day

        docs = docs.filter(doc => {
          const uploadTime = new Date(doc.uploadedAt);
          return uploadTime >= start && uploadTime <= end;
        });
      }
    }

    setFilteredDocuments(docs);
  }, [selectedType, dateRange, startDate, endDate, allDocuments]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/documents/${session?.user?.motherId}`);

      if (res.ok) {
        const data = await res.json();
        const docsList: Document[] = data.data || [];
        setAllDocuments(docsList);

        // Extract distinct available Document Types for Selection Dropdown
        const uniqueTypesMap = new Map<string, string>();
        docsList.forEach(doc => {
          uniqueTypesMap.set(doc.documentType.id, doc.documentType.name);
        });

        const extractedTypes: DocumentType[] = Array.from(uniqueTypesMap.entries()).map(([id, name]) => ({
          id,
          name
        }));
        setUniqueTypes(extractedTypes);
      } else {
        setError('Failed to load records from repository.');
      }
    } catch (err) {
      setError('Error parsing connected database files.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
    setDateRange('all'); // Clear subsequent selections when primary anchor switches
    setStartDate('');
    setEndDate('');
  };

  const handleIndividualDownload = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  // Bulk dynamic report downloader execution handler
  const handleBulkDownload = async () => {
    if (filteredDocuments.length === 0) return;
    setDownloading(true);
    try {
      // Direct file delivery if single entry meets criteria
      if (filteredDocuments.length === 1) {
        window.open(filteredDocuments[0].fileUrl, '_blank');
        return;
      }

      // If multiple reports are discovered within the range, route request to bulk streaming handler
      let bulkUrl = `/api/documents/download/bulk?range=${dateRange}&type=${selectedType}&motherId=${session?.user?.motherId}`;
      if (dateRange === 'custom') {
        bulkUrl += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(bulkUrl);
      if (!res.ok) throw new Error('Dynamic compilation compression failure');

      const blob = await res.blob();
      const clientUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = clientUrl;
      anchor.download = `Health_Documents_Batch_${dateRange}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to construct server compiled document payload.');
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="text-gray-600 font-medium">Synchronizing medical data logs...</p>
        </div>
      </div>
    );
  }

  // Derived dashboard metrics based on filtered results
  const totalTypesCount = new Set(filteredDocuments.map(d => d.documentType.id)).size;
  const rawMostRecent = filteredDocuments[0]?.uploadedAt;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Branding Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8">
          <div className="flex items-center gap-3 mb-1">
            <FileText className="h-8 w-8 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Health Documents</h1>
          </div>
          <p className="text-sm text-gray-500">
            Securely review, filter, and archive your healthcare records, scans, and verified clinician documents.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 lg:px-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex gap-3 animate-fadeIn">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Communication Error</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* 👈 LEFT COLUMN: SEQUENTIAL STEP FILTER SELECTION INTERFACE */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <Filter className="h-4 w-4 text-teal-600" />
                <h2 className="font-semibold text-gray-900">Document Download</h2>
              </div>

              {/* STAGE 1: CHOOSE DOCUMENT ARCHIVE ENTRY TYPE */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Document Type <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow"
                  value={selectedType}
                  onChange={handleTypeChange}
                >
                  <option value="" disabled>-- Select Document Type --</option>
                  <option value="all">All Document Categories</option>
                  {uniqueTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* STAGE 2: DATE CHRONOLOGY HORIZON FIELD */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${!selectedType ? 'text-gray-300' : 'text-gray-700'}`}>
                  Date Range
                </label>
                <select
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-shadow disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    setStartDate('');
                    setEndDate('');
                  }}
                  disabled={!selectedType} // Enforces configuration step lock
                >
                  <option value="all">All Timelines</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">Past 30 Days</option>
                  <option value="custom">Custom Calendar Picker 📅</option>
                </select>
              </div>

              {/* STAGE 3: ISOLATED CALENDAR BOUNDARY ASSIGNMENTS */}
              {dateRange === 'custom' && selectedType && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-dashed border-gray-100 animate-slideDown">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-gray-500">From Date</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-gray-500">To Date</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* BATCH CONTROL SYSTEM DOWNLOAD EXECUTION BUTTON */}
              <button
                onClick={handleBulkDownload}
                disabled={filteredDocuments.length === 0 || downloading || !selectedType}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-transparent text-white border border-transparent rounded-lg text-sm font-semibold transition-all shadow-sm shadow-teal-900/10 active:scale-[0.99]"
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Compiling Package...' : `Download Batch (${filteredDocuments.length})`}
              </button>
            </div>
          </div>

          {/* 👉 RIGHT COLUMN: STATS ROW followed by INTERACTIVE CARD CONTAINER */}
          <div className="lg:col-span-2 space-y-6">

            {/* Horizontal Metric Stats Panel Row */}
            <div className="grid grid-cols-3 gap-4 bg-teal-50/50 border border-teal-500/10 rounded-xl p-4">
              <div className="bg-white rounded-lg border border-gray-100 p-3.5 shadow-sm flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-teal-50 flex items-center justify-center text-teal-600"><FileText className="h-4 w-4" /></div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Docs</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{filteredDocuments.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-100 p-3.5 shadow-sm flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-purple-50 flex items-center justify-center text-purple-600"><Layers className="h-4 w-4" /></div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Doc Types</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{totalTypesCount}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-100 p-3.5 shadow-sm flex items-center gap-3 overflow-hidden">
                <div className="h-9 w-9 rounded-md bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Most Recent</p>
                  <p className="text-xs font-bold text-gray-900 mt-1 truncate">{rawMostRecent ? formatDate(rawMostRecent) : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Document Content Output Stage area */}
            {!selectedType ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                  <Filter className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Awaiting Step Selection</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Please select a targeted Document Type on the left configuration panel to look up your reports.
                </p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">No Matching Files</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  There are no medical documents registered to your account matching this exact structural criteria or timeframe constraint.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between h-full shadow-sm hover:shadow-md hover:border-gray-300 transition-all group"
                  >
                    <div className="flex items-start gap-3.5 mb-4">
                      <div className="h-10 w-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 transition-colors">
                        <FileText className="h-5 w-5 text-rose-600" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="inline-block text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-md px-1.5 py-0.5 uppercase tracking-wide">
                          {doc.documentType.name}
                        </span>
                        <h4 className="text-sm font-semibold text-gray-900 truncate pt-1" title={doc.fileName}>
                          {doc.fileName.replace(/\.[^/.]+$/, '')}
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          Uploaded: {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleIndividualDownload(doc.fileUrl)}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-teal-50 border border-gray-200 hover:border-teal-200 rounded-lg text-xs font-semibold text-gray-700 hover:text-teal-700 transition-all active:scale-[0.985]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      View / Download PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
