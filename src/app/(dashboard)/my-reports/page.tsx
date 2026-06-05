'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Download, Trash2, AlertCircle, FileText } from 'lucide-react';

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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Only mothers can access this page
  useEffect(() => {
    if (session && session.user.role !== 'MOTHER') {
      router.push('/');
    }
  }, [session, router]);

  // Fetch documents
  useEffect(() => {
    if (session?.user?.motherId) {
      fetchDocuments();
    }
  }, [session]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/documents/${session?.user?.motherId}`);
      
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data || []);
      } else {
        setError('Failed to load documents');
      }
    } catch (err) {
      setError('Error loading documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (fileUrl: string) => {
    // Open the PDF stream endpoint in a new tab natively
    window.open(fileUrl, '_blank');
  };

  const formatDate = (dateString: string) => {
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
          <p className="text-gray-600">Loading your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6 lg:px-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">My Health Documents</h1>
          </div>
          <p className="text-gray-600">
            View and manage your health documents and medical records
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 lg:px-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Documents Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Your health documents will appear here once they've been uploaded by your midwife or healthcare provider.
            </p>
            <p className="text-sm text-gray-500">
              Documents may include health reports, scan results, vaccination records, and other medical files.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Document Icon and Type */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                        {doc.documentType.name}
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1 truncate" title={doc.fileName}>
                        {doc.fileName.replace(/\.[^/.]+$/, '')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload Date */}
                <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                  <span>Uploaded on {formatDate(doc.uploadedAt)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(doc.fileUrl)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download / View PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {documents.length > 0 && (
          <div className="mt-8 bg-teal-50 border border-teal-200 rounded-lg p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-teal-700 font-medium">Total Documents</p>
                <p className="text-2xl font-bold text-teal-900 mt-1">
                  {documents.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-teal-700 font-medium">Document Types</p>
                <p className="text-2xl font-bold text-teal-900 mt-1">
                  {new Set(documents.map(d => d.documentType.id)).size}
                </p>
              </div>
              <div>
                <p className="text-sm text-teal-700 font-medium">Most Recent</p>
                <p className="text-sm text-teal-900 mt-1">
                  {formatDate(documents[0]?.uploadedAt || new Date().toISOString())}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
