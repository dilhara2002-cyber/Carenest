'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Select } from '@/components/ui';
import { FileText, Download, Calendar, Users, Syringe, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('mothers');
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    { value: 'mothers', label: 'Mothers Report', icon: Users },
    { value: 'visits', label: 'Visits Report', icon: Calendar },
    { value: 'vaccinations', label: 'Vaccinations Report', icon: Syringe },
    { value: 'summary', label: 'Summary Report', icon: BarChart3 },
  ];

  const generateReport = async () => {
    setLoading(true);
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    alert('Report generated! (PDF export coming soon)');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500">Generate and download system reports</p>
      </div>

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
              ]}
            />
            <Button className="w-full" onClick={generateReport} isLoading={loading}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        {/* Report Types */}
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
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      reportType === report.value
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-8 w-8 mb-2 ${
                      reportType === report.value ? 'text-teal-600' : 'text-gray-400'
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

      {/* Recent Reports */}
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
