'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Upload, X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

interface DocumentType {
  id: string;
  name: string;
}

interface UploadFile {
  file: File;
  id: string;
}

export default function DocumentUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Status states
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'partial_failure' | 'error'>('idle');
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);

  // Client-side security guardrail: only allow admins and midwives
  useEffect(() => {
    if (session && session.user.role !== 'ADMIN' && session.user.role !== 'MIDWIFE') {
      router.push('/');
    }
  }, [session, router]);

  // Fetch document types
  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        const res = await fetch('/api/documents/types');
        if (res.ok) {
          const data = await res.json();
          setDocumentTypes(data.data || []);
        } else {
          setError('Failed to load document types from API');
        }
      } catch (err) {
        setError('Failed to connect to API to fetch document types');
      }
    };

    fetchDocumentTypes();
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading) return;
    const files = Array.from(e.dataTransfer.files);
    handleFilesSelected(files);
  };

  const handleFilesSelected = (files: File[]) => {
    setError('');
    setUploadStatus('idle');
    
    const validFiles = files.filter(file => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setError(prev => prev + `${file.name}: Only PDF files are allowed. `);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      const newFiles = validFiles.map(file => ({
        file,
        id: Math.random().toString(36).substring(2, 9)
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelected(Array.from(e.target.files));
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    if (!selectedType) {
      setError('Please select a document type.');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one PDF file.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setUploadStatus('idle');

    try {
      const formData = new FormData();
      formData.append('documentTypeId', selectedType);
      selectedFiles.forEach(({ file }) => {
        formData.append('files', file);
      });

      const xhr = new XMLHttpRequest();

      // Live Tailwind CSS progress loading bar updates
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        setUploading(false);
        
        if (xhr.status === 200) {
          // 100% Success
          const res = JSON.parse(xhr.responseText);
          setSuccessCount(res.successCount || selectedFiles.length);
          setFailureCount(0);
          setUploadStatus('success');
          setSelectedFiles([]);
          setSelectedType('');
          
          setTimeout(() => {
            router.refresh();
            router.push('/mothers');
          }, 2500);

        } else if (xhr.status === 207) {
          // Partial Failure (returns CSV download stream)
          const sCount = parseInt(xhr.getResponseHeader('X-Success-Count') || '0', 10);
          const fCount = parseInt(xhr.getResponseHeader('X-Failure-Count') || '0', 10);
          setSuccessCount(sCount);
          setFailureCount(fCount);
          setUploadStatus('partial_failure');
          
          // Trigger automatic Excel-compatible CSV download
          const csvContent = xhr.responseText;
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `mismatched_mother_files_${Date.now()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clear files that were successfully uploaded
          setSelectedFiles([]);
          
        } else {
          // Complete Error
          let errorMessage = 'Upload failed';
          try {
            const res = JSON.parse(xhr.responseText);
            errorMessage = res.error || errorMessage;
          } catch (e) {
            errorMessage = xhr.statusText || errorMessage;
          }
          setError(errorMessage);
          setUploadStatus('error');
        }
      });

      xhr.addEventListener('error', () => {
        setError('Network error occurred during upload.');
        setUploadStatus('error');
        setUploading(false);
      });

      xhr.open('POST', '/api/upload/bulk');
      xhr.send(formData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
      setUploadStatus('error');
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Document Upload</h1>
        <p className="text-gray-500">Upload health documents for mothers. Files must be named as the mother's MOH registration number or NIC number (e.g. 2026-MAH-102.pdf).</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Document Type Dropdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Choose Document Type</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">-- Select Document Type --</option>
              {documentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Drag and Drop Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Drag & Drop PDF Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-teal-500 bg-teal-50/50'
                  : 'border-gray-300 bg-gray-50 hover:border-teal-500/50'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Click to upload or drag and drop your PDFs here
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Only PDF files are accepted.
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileInput}
                disabled={uploading}
                className="hidden"
              />
            </div>

            {/* Error alerts */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2 text-red-700 text-sm">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Files list */}
        {selectedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex justify-between items-center">
                <span>Selected Files ({selectedFiles.length})</span>
                <button
                  onClick={() => setSelectedFiles([])}
                  disabled={uploading}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  Clear All
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto space-y-2">
              {selectedFiles.map(({ file, id }) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                      PDF
                    </span>
                    <span className="font-medium text-gray-700 truncate block">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(id);
                    }}
                    disabled={uploading}
                    className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Live Upload Progress Loading Bar */}
        {uploading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  Uploading documents...
                </span>
                <span className="text-sm font-bold text-teal-600">
                  {Math.round(uploadProgress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success / Partial Failure Banners */}
        {uploadStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-800">Upload Complete!</h3>
              <p className="text-sm text-green-700">
                Successfully registered all {successCount} files to their respective mothers. Redirecting...
              </p>
            </div>
          </div>
        )}

        {uploadStatus === 'partial_failure' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <FileSpreadsheet className="h-6 w-6 text-yellow-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-800">Upload Processed with Errors</h3>
              <p className="text-sm text-yellow-700">
                Uploaded: <strong className="text-green-700">{successCount} files</strong>. 
                Failed: <strong className="text-red-700">{failureCount} files</strong>.
              </p>
              <p className="text-xs text-yellow-600 mt-2">
                An Excel-compatible CSV failure report has been automatically downloaded to your device containing the mismatched filenames and error logs.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => router.push('/mothers')}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0 || !selectedType}
          >
            Upload files ({selectedFiles.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
