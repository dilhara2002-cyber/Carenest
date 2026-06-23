'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Badge } from '@/components/ui';
import {
  Package, TrendingUp, Users, BarChart3, ArrowRight, Plus, Trash2,
  AlertCircle, Calendar, Shield, Activity, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface ReportData {
  month: number;
  year: number;
  totalDistributedKg: number;
  totalBeneficiaries: number;
  byRecipientType: Record<string, { count: number; totalKg: number }>;
  byMidwife: { midwifeName: string; count: number; totalKg: number }[];
  stockSummary: {
    totalReceivedKg: number;
    totalDistributedKg: number;
    remainingKg: number;
  };
  monthlyTrend: { month: number; year: number; totalKg: number; count: number; label: string }[];
}

interface StockRecord {
  id: string;
  receivedDate: string;
  quantity: number;
  batchNumber: string | null;
  supplier: string | null;
  expiryDate: string | null;
  notes: string | null;
}

interface StockData {
  records: StockRecord[];
  summary: {
    totalReceivedKg: number;
    totalDistributedKg: number;
    remainingKg: number;
  };
}

const RECIPIENT_LABELS: Record<string, string> = {
  PREGNANT_MOTHER: 'Pregnant Mothers',
  LACTATING_MOTHER: 'Lactating Mothers',
  CHILD_UNDER_5: 'Children Under 5',
};

const RECIPIENT_COLORS: Record<string, string> = {
  PREGNANT_MOTHER: '#F472B6',
  LACTATING_MOTHER: '#2563EB',
  CHILD_UNDER_5: '#10B981',
};

const CHART_COLORS = ['#2563EB', '#F472B6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ThriposhaReportsPage() {
  const { data: session } = useSession();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(true);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Stock form
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockForm, setStockForm] = useState({
    quantity: '',
    batchNumber: '',
    supplier: '',
    expiryDate: '',
    receivedDate: '',
    notes: '',
  });
  const [stockFormLoading, setStockFormLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReportData();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/thriposha/reports?month=${selectedMonth}&year=${selectedYear}`
      );
      if (res.ok) {
        const data = await res.json();
        setReportData(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockData = async () => {
    setStockLoading(true);
    try {
      const res = await fetch('/api/thriposha/stock');
      if (res.ok) {
        const data = await res.json();
        setStockData(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stock:', err);
    } finally {
      setStockLoading(false);
    }
  };

  const handleAddStock = async () => {
    const qty = parseInt(stockForm.quantity, 10);
    if (!stockForm.quantity || isNaN(qty) || qty <= 0 || Number(stockForm.quantity) !== qty) {
      setError('Please enter a valid whole number for quantity');
      return;
    }

    setStockFormLoading(true);
    setError('');

    try {
      const res = await fetch('/api/thriposha/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockForm),
      });

      if (res.ok) {
        setStockForm({ quantity: '', batchNumber: '', supplier: '', expiryDate: '', receivedDate: '', notes: '' });
        setShowStockForm(false);
        await fetchStockData();
        await fetchReportData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add stock');
      }
    } catch (err) {
      setError('Error adding stock');
    } finally {
      setStockFormLoading(false);
    }
  };

  const handleDeleteStock = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stock record?')) return;

    try {
      const res = await fetch(`/api/thriposha/stock?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchStockData();
        await fetchReportData();
      }
    } catch (err) {
      console.error('Error deleting stock:', err);
    }
  };

  const navigateMonth = (direction: number) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const monthLabel = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  if (loading && !reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#E5E7EB] border-t-[#2563EB]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-5 w-5 text-[#2563EB] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#F9FAFB] min-h-screen">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#111827] p-8 text-white">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#1E40AF]/25 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-r from-[#F472B6]/15 to-transparent pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1FAE5] mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
              </span>
              <span className="text-[#10B981] text-xs font-semibold tracking-widest uppercase">Thriposha Management</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              Thriposha Reports 📦
            </h1>
            <p className="text-[#6B7280] text-base max-w-lg leading-relaxed font-light">
              Monitor{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#F472B6] font-semibold">
                Thriposha distribution
              </span>{' '}
              across all midwives and beneficiaries.
            </p>
          </div>

          <div className="hidden lg:flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-xs text-[#6B7280] mb-0.5">Viewing</p>
              <p className="text-base font-semibold text-white">{monthLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#D1FAE5]/10 border border-[#10B981]/20 rounded-full">
                <Activity className="h-3.5 w-3.5 text-[#10B981] animate-pulse" />
                <span className="text-xs text-[#10B981] font-medium">Live Data</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-full">
                <Shield className="h-3.5 w-3.5 text-[#2563EB]" />
                <span className="text-xs text-[#3B82F6] font-medium">Admin</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Month Selector ── */}
      <div className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-2xl px-6 py-3 shadow-sm">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-[#2563EB]" />
          <span className="text-lg font-bold text-[#111827]">{monthLabel}</span>
        </div>
        <button
          onClick={() => navigateMonth(1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Distributed"
          value={`${reportData?.totalDistributedKg || 0} Packets`}
          icon={<Package className="h-5 w-5 text-[#2563EB]" />}
          iconBg="bg-blue-50"
          valueColor="text-[#2563EB]"
          barColor="bg-[#2563EB]"
          delay="stagger-1"
        />
        <StatCard
          title="Beneficiaries"
          value={String(reportData?.totalBeneficiaries || 0)}
          icon={<Users className="h-5 w-5 text-[#F472B6]" />}
          iconBg="bg-pink-50"
          valueColor="text-[#F472B6]"
          barColor="bg-[#F472B6]"
          delay="stagger-2"
        />
        <StatCard
          title="Stock Remaining"
          value={`${reportData?.stockSummary?.remainingKg || 0} Packets`}
          icon={<TrendingUp className="h-5 w-5 text-[#10B981]" />}
          iconBg="bg-emerald-50"
          valueColor="text-[#10B981]"
          barColor="bg-[#10B981]"
          delay="stagger-3"
        />
        <StatCard
          title="Total Received"
          value={`${reportData?.stockSummary?.totalReceivedKg || 0} Packets`}
          icon={<BarChart3 className="h-5 w-5 text-[#F59E0B]" />}
          iconBg="bg-amber-50"
          valueColor="text-[#F59E0B]"
          barColor="bg-[#F59E0B]"
          delay="stagger-4"
        />
      </div>

      {/* ── Distribution Breakdown + Monthly Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* By Recipient Type */}
        <div className="animate-fade-in-up bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#E5E7EB]">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-pink-50">
              <Users className="h-4 w-4 text-[#F472B6]" />
            </div>
            <span className="text-[#111827] font-semibold text-sm">Distribution by Recipient Type</span>
          </div>

          <div className="p-6">
            {reportData && Object.keys(reportData.byRecipientType).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(reportData.byRecipientType).map(([type, data]) => {
                  const maxKg = Math.max(
                    ...Object.values(reportData.byRecipientType).map((d) => d.totalKg)
                  );
                  const percentage = maxKg > 0 ? (data.totalKg / maxKg) * 100 : 0;

                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {RECIPIENT_LABELS[type] || type}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">{data.count} distributions</span>
                          <span className="text-sm font-bold" style={{ color: RECIPIENT_COLORS[type] }}>
                            {data.totalKg} Packets
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: RECIPIENT_COLORS[type] || '#6B7280',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center mx-auto mb-3">
                  <Package className="h-6 w-6 text-[#F472B6]" />
                </div>
                <p className="text-[#111827] text-sm font-semibold">No distributions this month</p>
                <p className="text-[#6B7280] text-xs mt-0.5 font-light">
                  Distributions will appear here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="animate-fade-in-up stagger-2 bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#E5E7EB]">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50">
              <BarChart3 className="h-4 w-4 text-[#2563EB]" />
            </div>
            <span className="text-[#111827] font-semibold text-sm">Monthly Distribution Trend</span>
          </div>

          <div className="p-6">
            {reportData?.monthlyTrend && reportData.monthlyTrend.some((t) => t.totalKg > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={reportData.monthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                    unit=" Packets"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                    formatter={(value: unknown) => [`${value} Packets`, 'Distributed']}
                  />
                  <Bar dataKey="totalKg" radius={[8, 8, 0, 0]} maxBarSize={40}>
                    {reportData.monthlyTrend.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-[#2563EB]" />
                </div>
                <p className="text-[#111827] text-sm font-semibold">No trend data yet</p>
                <p className="text-[#6B7280] text-xs mt-0.5 font-light">
                  Distribution history will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Per-Midwife Breakdown ── */}
      {reportData?.byMidwife && reportData.byMidwife.length > 0 && (
        <div className="animate-fade-in-up bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#E5E7EB]">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-50">
              <Users className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <span className="text-[#111827] font-semibold text-sm">Distribution by Midwife</span>
          </div>

          <div className="divide-y divide-[#F9FAFB]">
            {reportData.byMidwife.map((midwife, idx) => {
              const avatarStyles = [
                { bg: 'bg-blue-50', text: 'text-[#2563EB]', border: 'border-blue-100' },
                { bg: 'bg-pink-50', text: 'text-[#F472B6]', border: 'border-pink-100' },
                { bg: 'bg-emerald-50', text: 'text-[#10B981]', border: 'border-emerald-100' },
                { bg: 'bg-amber-50', text: 'text-[#F59E0B]', border: 'border-amber-100' },
                { bg: 'bg-red-50', text: 'text-[#EF4444]', border: 'border-red-100' },
              ];
              const style = avatarStyles[idx % avatarStyles.length];

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl border ${style.border} ${style.bg} flex items-center justify-center ${style.text} font-bold text-sm shrink-0`}
                    >
                      {midwife.midwifeName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{midwife.midwifeName}</p>
                      <p className="text-xs text-[#6B7280]">{midwife.count} distributions</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#2563EB]">{midwife.totalKg} Packets</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Stock Management ── */}
      <div className="animate-fade-in-up bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <span className="flex items-center gap-2.5 text-[#111827] font-semibold text-sm">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50">
              <Package className="h-4 w-4 text-[#10B981]" />
            </div>
            Stock Management
          </span>
          <button
            onClick={() => setShowStockForm(!showStockForm)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-[#2563EB] hover:text-white px-3 py-1.5 rounded-full transition-all duration-300"
          >
            <Plus className="h-3 w-3" />
            Add Stock
          </button>
        </div>

        {/* Stock Summary */}
        {stockData && (
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-[#E5E7EB]">
            <div className="text-center p-4 bg-emerald-50 rounded-xl">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider mb-1">Total Received</p>
              <p className="text-xl font-extrabold text-[#10B981]">{stockData.summary.totalReceivedKg} Packets</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider mb-1">Total Distributed</p>
              <p className="text-xl font-extrabold text-[#2563EB]">{stockData.summary.totalDistributedKg} Packets</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-xl">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider mb-1">Remaining</p>
              <p className={`text-xl font-extrabold ${stockData.summary.remainingKg < 10 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                {stockData.summary.remainingKg} Packets
              </p>
            </div>
          </div>
        )}

        {/* Add Stock Form */}
        {showStockForm && (
          <div className="p-6 border-b border-[#E5E7EB] bg-[#F9FAFB]">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity (Packets) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                  placeholder="e.g., 50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Batch Number</label>
                <input
                  type="text"
                  value={stockForm.batchNumber}
                  onChange={(e) => setStockForm({ ...stockForm, batchNumber: e.target.value })}
                  placeholder="e.g., BATCH-2026-06"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier</label>
                <input
                  type="text"
                  value={stockForm.supplier}
                  onChange={(e) => setStockForm({ ...stockForm, supplier: e.target.value })}
                  placeholder="e.g., MOH Supply Unit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Received Date</label>
                <input
                  type="date"
                  value={stockForm.receivedDate}
                  onChange={(e) => setStockForm({ ...stockForm, receivedDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={stockForm.expiryDate}
                  onChange={(e) => setStockForm({ ...stockForm, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <input
                  type="text"
                  value={stockForm.notes}
                  onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowStockForm(false)}>Cancel</Button>
              <Button onClick={handleAddStock} isLoading={stockFormLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Stock Record
              </Button>
            </div>
          </div>
        )}

        {/* Stock Records List */}
        <div className="divide-y divide-[#F9FAFB]">
          {stockData?.records && stockData.records.length > 0 ? (
            stockData.records.map((record, idx) => (
              <div
                key={record.id}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-[#F9FAFB] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#10B981] font-bold text-sm shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      {Number(record.quantity)} Packets
                      {record.batchNumber && (
                        <span className="text-xs text-[#6B7280] font-normal ml-2">
                          Batch: {record.batchNumber}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      Received: {new Date(record.receivedDate).toLocaleDateString()}
                      {record.supplier && ` • ${record.supplier}`}
                      {record.expiryDate && ` • Expires: ${new Date(record.expiryDate).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteStock(record.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete record"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-[#10B981]" />
              </div>
              <p className="text-[#111827] text-sm font-semibold">No stock records yet</p>
              <p className="text-[#6B7280] text-xs mt-0.5 font-light">
                Add stock records using the button above
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── StatCard ── */
function StatCard({
  title, value, icon, iconBg, valueColor, barColor, delay,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor: string;
  barColor: string;
  delay: string;
}) {
  return (
    <div
      className={`card-lift animate-fade-in-up ${delay} bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm`}
    >
      <div className={`h-1 w-full ${barColor} opacity-70`} />
      <div className="p-4 pt-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${iconBg}`}>
            {icon}
          </div>
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${barColor} animate-pulse`} />
            <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest">Live</span>
          </div>
        </div>
        <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-widest mb-1">{title}</p>
        <p className={`text-2xl font-extrabold ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}
