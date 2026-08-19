'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FileText, 
  Download, 
  Heart, 
  ClipboardList, 
  Files 
} from 'lucide-react';

export default function MyReportsPage() {
  const { data: session } = useSession();
  const [reportType, setReportType] = useState('health');
  const [reportLoading, setReportLoading] = useState(false);

  // Report types available for mothers
  const reportTypes = [
    { 
      value: 'health', 
      label: 'My Health Report', 
      description: 'Pregnancy journey & health records', 
      icon: Heart 
    },
    { 
      value: 'appointments', 
      label: 'My Appointments', 
      description: 'Visit schedule & history', 
      icon: ClipboardList 
    },
    { 
      value: 'documents', 
      label: 'Documents Inventory', 
      description: 'All my medical documents', 
      icon: Files 
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
        alert(`Failed to generate report: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Report generation error:', err);
      alert('An error occurred while generating your report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Health Reports</h1>
        <p className="text-gray-600">Generate and download your personalized health reports</p>
      </div>

      {/* Generate Reports Section */}
      <div className="bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-200 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-6 w-6 text-teal-600" />
          <h2 className="text-xl font-semibold text-gray-900">Generate My Reports</h2>
        </div>
        
        <p className="text-gray-700 mb-6">
          Download comprehensive PDF reports about your pregnancy journey, appointments, and medical documents.
        </p>
        
        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {reportTypes.map((type) => {
            const IconComponent = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setReportType(type.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  reportType === type.value
                    ? 'border-teal-500 bg-white shadow-lg'
                    : 'border-gray-200 bg-white/50 hover:border-teal-300'
                }`}
              >
                <IconComponent className={`h-8 w-8 mb-3 ${reportType === type.value ? 'text-teal-600' : 'text-gray-400'}`} />
                <h3 className="font-semibold text-gray-900 mb-1">{type.label}</h3>
                <p className="text-sm text-gray-600">{type.description}</p>
              </button>
            );
          })}
        </div>

        {/* Generate Button */}
        <button
          onClick={generateReport}
          disabled={reportLoading}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3 text-lg"
        >
          <Download className="h-5 w-5" />
          {reportLoading ? 'Generating Report...' : 'Generate & Download Report'}
        </button>
        
        <p className="text-sm text-gray-500 text-center mt-4">
          Reports include all your health information and can be shared with healthcare providers
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Pregnancy Week</p>
              <p className="text-2xl font-bold text-teal-600">Week 24</p>
            </div>
            <Heart className="h-8 w-8 text-teal-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Completed Visits</p>
              <p className="text-2xl font-bold text-blue-600">8</p>
            </div>
            <ClipboardList className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Documents</p>
              <p className="text-2xl font-bold text-green-600">12</p>
            </div>
            <Files className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">About Your Health Reports</h3>
            <p className="text-blue-800 leading-relaxed">
              These personalized reports contain comprehensive information about your pregnancy journey, 
              including visit history, health metrics, appointment schedules, and document inventory. 
              You can download and share these reports with your healthcare providers as needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
