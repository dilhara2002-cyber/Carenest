'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { FileText, Download, Eye, AlertCircle, Calendar, FolderOpen, Heart, ClipboardList, Files } from 'lucide-react';

export default function MotherReportsPage() {
  const { data: session } = useSession();
  const [myDocuments, setMyDocuments] = useState<any[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('all');
  const [documentTypes, setDocumentTypes] = useState<{ id: string; name: string; count: number }[]>([]);
  
  // Report generation states
  const [reportType, setReportType] = useState('health');
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.motherId) {
      fetchMyDocuments();
      fetchRecentDocuments();
      fetchDocumentTypes();
    }
  }, [session]);

  const fetchMyDocuments = async () => {
    if (!session?.user?.motherId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${session.user.motherId}`);
      if (res.ok) {
        const data = await res.json();
        setMyDocuments(data.data || []);
      } else {
        console.error('Failed to load documents');
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentDocuments = async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch('/api/documents/recent?limit=10');
      if (res.ok) {
        const data = await res.json();
        setRecentDocuments(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load recent documents');
    } finally {
      setLoadingRecent(false);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      const res = await fetch('/api/documents/types');
      if (res.ok) {
        const data = await res.json();
        const types = data.data || [];
        
        // Count documents per type for this mother
        const typesWithCount = types.map((type: any) => ({
          id: type.id,
          name: type.name,
          count: 0 // Will be calculated from myDocuments
        }));
        
        setDocumentTypes(typesWithCount);
      }
    } catch (err) {
      console.error('Failed to load document types');
    }
  };

  // Update document type counts when myDocuments changes
  useEffect(() => {
    if (myDocuments.length > 0 && documentTypes.length > 0) {
      const updatedTypes = documentTypes.map(type => ({
        ...type,
        count: myDocuments.filter(doc => doc.documentTypeId === type.id).length
      }));
      setDocumentTypes(updatedTypes);
    }
  }, [myDocuments]);

  const filteredDocuments = selectedDocType === 'all' 
    ? myDocuments 
    : myDocuments.filter(doc => doc.documentTypeId === selectedDocType);

  // Report types available for mothers
  const reportTypes = [
    { 
      value: 'health', 
      label: 'My Health Report', 
      description: 'Pregnancy journey & health records', 
      IconComponent: Heart 
    },
    { 
      value: 'appointments', 
      label: 'My Appointments', 
      description: 'Visit schedule & history', 
      IconComponent: ClipboardList 
    },
    { 
      value: 'documents', 
      label: 'Documents Inventory', 
      description: 'All my medical documents', 
      IconComponent: Files 
    },
  ];

  // Generate report function
  const generateReport = async () => {
    if (!session?.user?.motherId) {
      alert('Session error: Please log in again.');
      return;
    }

    setReportLoading(true);

    try {
      const apiEndpoint = `/api/reports/generate`;
      
      console.log('Generating report:', { reportType, apiEndpoint });
      
      const requestBody = {
        reportType: reportType,
        range: 'all',
      };

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Report response status:', res.status);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert('Report downloaded successfully!');
      } else {
        let errorMessage = 'Unknown error';
        try {
          const error = await res.json();
          errorMessage = error.error || error.message || 'Unknown error';
        } catch (e) {
          errorMessage = `Server error (${res.status})`;
        }
        console.error('Report generation failed:', errorMessage);
        alert(`Failed to generate report: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Report generation error:', err);
      alert('An error occurred while generating your report. Please check the console and try again.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Health Reports</h1>
        <p className="text-gray-500">View documents and generate health reports</p>
      </div>

      {/* Generate Reports Section */}
      <Card className="bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            Generate My Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-700">
            Download comprehensive PDF reports about your pregnancy journey, appointments, and medical documents.
          </p>
          
          {/* Report Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {reportTypes.map((type) => {
              const Icon = type.IconComponent;
              return (
                <button
                  key={type.value}
                  onClick={() => setReportType(type.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    reportType === type.value
                      ? 'border-teal-500 bg-white shadow-md'
                      : 'border-gray-200 bg-white/50 hover:border-teal-300'
                  }`}
                >
                  <Icon className={`h-8 w-8 mb-2 ${reportType === type.value ? 'text-teal-600' : 'text-gray-400'}`} />
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{type.label}</h4>
                  <p className="text-xs text-gray-600">{type.description}</p>
                </button>
              );
            })}
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateReport}
            isLoading={reportLoading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            {reportLoading ? 'Generating Report...' : 'Generate & Download Report'}
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Reports include all your health information and can be shared with healthcare providers
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{myDocuments.length}</p>
              </div>
              <div className="p-3 bg-teal-50 rounded-lg">
                <FileText className="h-8 w-8 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Document Types</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{documentTypes.filter(t => t.count > 0).length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <FolderOpen className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-pink-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Uploads</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{recentDocuments.length}</p>
              </div>
              <div className="p-3 bg-pink-50 rounded-lg">
                <Calendar className="h-8 w-8 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-teal-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading recent documents...</p>
            </div>
          ) : recentDocuments.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No recent documents</p>
              <p className="text-sm mt-1">Your recently uploaded documents will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50/50 to-transparent rounded-lg border border-teal-100 hover:from-teal-50 transition-all">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2.5 bg-teal-100 rounded-lg shrink-0">
                      <FileText className="h-5 w-5 text-teal-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate" title={doc.fileName}>
                        {doc.fileName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <span className="font-semibold text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full text-xs">
                          {doc.documentType.name}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(doc.uploadedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(doc.fileUrl, '_blank')}
                      title="View document in new tab"
                      className="hover:bg-teal-50 hover:border-teal-300"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <a
                      href={doc.fileUrl}
                      download={doc.fileName}
                      className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-200 bg-white hover:bg-teal-50 hover:border-teal-300 transition-colors"
                      title="Download document"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Documents Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All My Documents</CardTitle>
            {documentTypes.length > 0 && (
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Types ({myDocuments.length})</option>
                {documentTypes.filter(t => t.count > 0).map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.count})
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-teal-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-3">Loading your documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-12 text-center">
              <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-10 w-10 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-900 mb-1">
                {selectedDocType === 'all' ? 'No documents yet' : 'No documents in this category'}
              </p>
              <p className="text-sm text-gray-500">
                Your healthcare provider will upload documents here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocuments.map((doc) => (
                <div 
                  key={doc.id} 
                  className="group relative p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-teal-300 hover:shadow-lg transition-all duration-300"
                >
                  {/* Document Type Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                      {doc.documentType.name}
                    </span>
                  </div>

                  {/* Document Icon */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                      <FileText className="h-7 w-7 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 
                        className="font-bold text-gray-900 truncate text-base mb-1" 
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(doc.fileUrl, '_blank')}
                      className="flex-1 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <a
                      href={doc.fileUrl}
                      download={doc.fileName}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-gray-200 bg-white hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-all"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">About Your Documents</h4>
              <p className="text-sm text-blue-800 leading-relaxed">
                These documents are uploaded by your assigned midwife or healthcare provider. 
                They include important health records such as test results, scan reports, and other medical documentation. 
                You can view and download these documents anytime. If you have questions about any document, 
                please contact your healthcare provider through the chat feature.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
