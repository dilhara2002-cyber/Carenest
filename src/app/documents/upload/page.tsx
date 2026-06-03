'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, CheckCircle, AlertCircle, Download } from 'lucide-react';

interface DocumentType {
  id: string;
  name: string;
}

interface UploadFile {
  file: File;
  id: string;
}

interface UploadResponse {
  successCount: number;
  failureCount: number;
  failures: Array<{ fileName: string; error: string }>;
  hasFailures: boolean;
  errorReport?: string;
  message?: string;
}

export default function DocumentUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Fetch document types on mount
  useEffect(() => {
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

    fetchDocumentTypes();
  }, []);

  // Handle drag and drop
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

    const files = Array.from(e.dataTransfer.files);
    handleFilesSelected(files);
  };

  const handleFilesSelected = (files: File[]) => {
    setError('');
    
    const validFiles = files.filter(file => {
      if (file.type !== 'application/pdf') {
        setError(prev => prev + `${file.name}: Only PDF files are allowed\n`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      const newFiles = validFiles.map(file => ({
        file,
        id: Math.random().toString(36)
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
      setError('Please select a document type');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError('');
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('documentTypeId', selectedType);
      
      selectedFiles.forEach(({ file }) => {
        formData.append('files', file);
      });

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 207) {
          const response = JSON.parse(xhr.responseText);
          setUploadResult(response);
          setUploadProgress(100);
          
          if (!response.hasFailures) {
            setSelectedFiles([]);
            setSelectedType('');
            // Reset after 2 seconds
            setTimeout(() => {
              router.refresh();
              router.push('/mothers');
            }, 2000);
          }
        } else {
          const response = JSON.parse(xhr.responseText);
          setError(response.error || 'Upload failed');
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        setError('Upload failed due to network error');
        setUploading(false);
      });

      xhr.open('POST', '/api/documents/bulk-upload');
      xhr.send(formData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  const downloadErrorReport = () => {
    if (!uploadResult?.errorReport) return;

    const element = document.createElement('a');
    const file = new Blob([uploadResult.errorReport], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = `document-upload-errors-${Date.now()}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6 lg:px-6">
          <div className="flex items-center gap-3 mb-2">
            <Upload className="h-8 w-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">Bulk Document Upload</h1>
          </div>
          <p className="text-gray-600">Upload health documents for mothers using their MOH registration numbers as filenames</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 lg:px-6">
        {/* Document Type Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Select Document Type <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            disabled={uploading}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Choose a document type...</option>
            {documentTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Drag and Drop Zone */}
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
            isDragging
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
              <Upload className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drag and drop PDF files here
              </p>
              <p className="text-sm text-gray-600 mt-1">
                or click to select files from your computer
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Filenames should contain the mother's MOH registration number (e.g., "2026-MAH-102.pdf")
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
            onClick={(e) => {
              if (uploading) e.preventDefault();
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Select PDF Files
          </button>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          </div>
        )}

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Selected Files ({selectedFiles.length})
            </h3>
            <div className="space-y-2">
              {selectedFiles.map(({ file, id }) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-8 w-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-red-700">PDF</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(id)}
                    disabled={uploading}
                    className="ml-4 p-1 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-900">Uploading files...</p>
              <p className="text-sm font-bold text-teal-600">{Math.round(uploadProgress)}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Results */}
        {uploadResult && (
          <div className={`bg-white rounded-lg shadow-sm border ${
            uploadResult.hasFailures
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-green-200 bg-green-50'
          } p-6 mb-6`}>
            <div className="flex gap-3">
              {uploadResult.hasFailures ? (
                <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${
                  uploadResult.hasFailures
                    ? 'text-yellow-900'
                    : 'text-green-900'
                }`}>
                  {uploadResult.hasFailures
                    ? 'Upload Completed with Errors'
                    : 'Upload Successful'}
                </h3>
                <p className={`text-sm mt-1 ${
                  uploadResult.hasFailures
                    ? 'text-yellow-800'
                    : 'text-green-800'
                }`}>
                  {uploadResult.message || `${uploadResult.successCount} file(s) uploaded successfully`}
                </p>
                
                {uploadResult.hasFailures && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-yellow-900">
                      Failed uploads: {uploadResult.failureCount}
                    </p>
                    {uploadResult.failures.slice(0, 5).map((failure, idx) => (
                      <p key={idx} className="text-xs text-yellow-800 ml-4">
                        • {failure.fileName}: {failure.error}
                      </p>
                    ))}
                    {uploadResult.failures.length > 5 && (
                      <p className="text-xs text-yellow-700 ml-4">
                        ... and {uploadResult.failures.length - 5} more
                      </p>
                    )}
                    {uploadResult.errorReport && (
                      <button
                        onClick={downloadErrorReport}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download Error Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => router.back()}
            disabled={uploading}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0 || !selectedType}
            className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Files ({selectedFiles.length})
          </button>
        </div>
      </div>
    </div>
  );
}
