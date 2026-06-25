'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Badge } from '@/components/ui';
import {
  Package, Plus, Calendar, Users, AlertCircle, CheckCircle, Trash2,
  Stethoscope, Activity,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Distribution {
  id: string;
  recipientType: string;
  packetType: 'RED' | 'ORANGE' | 'YELLOW';
  quantity: number;
  distributionDate: string;
  month: number;
  year: number;
  batchNumber: string | null;
  notes: string | null;
  mother?: {
    id: string;
    user: { name: string };
  } | null;
  child?: {
    id: string;
    name: string;
  } | null;
}

interface MotherOption {
  id: string;
  user: { name: string };
  children?: { id: string; name: string; birthDate: string }[];
}

const RECIPIENT_LABELS: Record<string, string> = {
  PREGNANT_MOTHER: 'Pregnant Mother',
  LACTATING_MOTHER: 'Lactating Mother',
  CHILD_UNDER_5: 'Child Under 5',
};

const RECIPIENT_BADGE_COLORS: Record<string, string> = {
  PREGNANT_MOTHER: 'info',
  LACTATING_MOTHER: 'success',
  CHILD_UNDER_5: 'warning',
};

const PACKET_COLOR_CONFIG: Record<string, { emoji: string; label: string; bg: string; text: string; border: string; barColor: string }> = {
  YELLOW: { emoji: '🟡', label: 'Yellow', bg: 'bg-amber-50', text: 'text-[#F59E0B]', border: 'border-amber-200', barColor: 'bg-[#F59E0B]' },
  ORANGE: { emoji: '🟠', label: 'Orange', bg: 'bg-orange-50', text: 'text-[#F97316]', border: 'border-orange-200', barColor: 'bg-[#F97316]' },
  RED:    { emoji: '🔴', label: 'Red',    bg: 'bg-red-50',    text: 'text-[#EF4444]', border: 'border-red-200', barColor: 'bg-[#EF4444]' },
};

const PACKET_COLOR_HINT: Record<string, string> = {
  YELLOW: 'For pregnant & lactating mothers',
  ORANGE: 'For children > 3 years',
  RED: 'For children 6 months – 3 years',
};

export default function ThriposhaPage() {
  const { data: session } = useSession();
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [mothers, setMothers] = useState<MotherOption[]>([]);

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    recipientType: 'PREGNANT_MOTHER',
    packetType: 'YELLOW' as string,
    motherId: '',
    childId: '',
    quantity: '',
    distributionDate: new Date().toISOString().split('T')[0],
    batchNumber: '',
    notes: '',
  });
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityHint, setEligibilityHint] = useState('');

  useEffect(() => {
    fetchDistributions();
  }, [filterMonth, filterYear]);

  useEffect(() => {
    fetchMothers();
  }, []);

  const fetchDistributions = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/thriposha/distributions?month=${filterMonth}&year=${filterYear}`
      );
      if (res.ok) {
        const data = await res.json();
        setDistributions(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch distributions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMothers = async () => {
    try {
      const res = await fetch('/api/mothers');
      if (res.ok) {
        const data = await res.json();
        setMothers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch mothers:', err);
    }
  };

  // Auto-detect packet color when recipient type or child changes
  const fetchEligibility = async (childId: string) => {
    if (!childId) return;
    setEligibilityLoading(true);
    setEligibilityHint('');
    try {
      const res = await fetch(`/api/thriposha/eligibility?childId=${childId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data?.packetType) {
          setForm(prev => ({ ...prev, packetType: data.data.packetType }));
          setEligibilityHint(
            data.data.eligible
              ? `✅ Eligible — ${data.data.reasons?.join(', ')}`
              : `⚠️ Not eligible — ${data.data.reasons?.join(', ')}`
          );
        }
      }
    } catch (err) {
      console.error('Failed to fetch eligibility:', err);
    } finally {
      setEligibilityLoading(false);
    }
  };

  // Auto-set packet color when recipient type changes
  const handleRecipientTypeChange = (newType: string) => {
    let autoColor = 'YELLOW';
    if (newType === 'PREGNANT_MOTHER' || newType === 'LACTATING_MOTHER') {
      autoColor = 'YELLOW';
    }
    // For children, the color will be auto-detected when child is selected
    setForm(prev => ({ ...prev, recipientType: newType, packetType: autoColor, childId: '' }));
    setEligibilityHint('');
  };

  // Auto-detect when child is selected
  const handleChildSelect = (childId: string) => {
    setForm(prev => ({ ...prev, childId }));
    if (childId) {
      fetchEligibility(childId);
    } else {
      setEligibilityHint('');
    }
  };

  const handleSubmit = async () => {
    const qty = parseInt(form.quantity, 10);
    if (!form.quantity || isNaN(qty) || qty <= 0 || Number(form.quantity) !== qty) {
      setError('Please enter a valid whole number for quantity');
      return;
    }

    if (form.recipientType === 'CHILD_UNDER_5' && !form.childId) {
      setError('Please select a child');
      return;
    }

    if (form.recipientType !== 'CHILD_UNDER_5' && !form.motherId) {
      setError('Please select a mother');
      return;
    }

    setFormLoading(true);
    setError('');
    setSuccess('');

    try {
      const body: Record<string, unknown> = {
        recipientType: form.recipientType,
        packetType: form.packetType,
        quantity: form.quantity,
        distributionDate: form.distributionDate,
        batchNumber: form.batchNumber || undefined,
        notes: form.notes || undefined,
      };

      if (form.recipientType === 'CHILD_UNDER_5') {
        body.childId = form.childId;
        // Also set motherId if available
        if (form.motherId) body.motherId = form.motherId;
      } else {
        body.motherId = form.motherId;
      }

      const res = await fetch('/api/thriposha/distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess('Distribution recorded successfully!');
        setForm({
          recipientType: 'PREGNANT_MOTHER',
          packetType: 'YELLOW',
          motherId: '',
          childId: '',
          quantity: '',
          distributionDate: new Date().toISOString().split('T')[0],
          batchNumber: '',
          notes: '',
        });
        setShowForm(false);
        setEligibilityHint('');
        await fetchDistributions();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to record distribution');
      }
    } catch (err) {
      setError('Error recording distribution');
    } finally {
      setFormLoading(false);
    }
  };

  // Get children for selected mother
  const selectedMother = mothers.find((m) => m.id === form.motherId);
  const availableChildren = selectedMother?.children || [];

  const monthLabel = new Date(filterYear, filterMonth - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Summary for the current view
  const totalKg = distributions.reduce((sum, d) => sum + Number(d.quantity), 0);
  const yellowCount = distributions.filter(d => d.packetType === 'YELLOW').reduce((sum, d) => sum + Number(d.quantity), 0);
  const orangeCount = distributions.filter(d => d.packetType === 'ORANGE').reduce((sum, d) => sum + Number(d.quantity), 0);
  const redCount = distributions.filter(d => d.packetType === 'RED').reduce((sum, d) => sum + Number(d.quantity), 0);

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
              <span className="text-[#10B981] text-xs font-semibold tracking-widest uppercase">Thriposha Distribution</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              Thriposha Management 📦
            </h1>
            <p className="text-[#6B7280] text-base max-w-lg leading-relaxed font-light">
              Record and track{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#F472B6] font-semibold">
                Thriposha distributions
              </span>{' '}
              to mothers and children in your care.
            </p>
          </div>

          <div className="hidden lg:flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-xs text-[#6B7280] mb-0.5">This Month</p>
              <p className="text-base font-semibold text-white">
                {totalKg} Packets distributed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#D1FAE5]/10 border border-[#10B981]/20 rounded-full">
                <Activity className="h-3.5 w-3.5 text-[#10B981] animate-pulse" />
                <span className="text-xs text-[#10B981] font-medium">System Online</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-full">
                <Stethoscope className="h-3.5 w-3.5 text-[#2563EB]" />
                <span className="text-xs text-[#3B82F6] font-medium">Midwife</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">{success}</p>
        </div>
      )}

      {/* ── Stats + Controls ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-lift bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
          <div className="h-1 w-full bg-[#2563EB] opacity-70" />
          <div className="p-4 pt-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50">
                <Package className="h-5 w-5 text-[#2563EB]" />
              </div>
            </div>
            <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-widest mb-1">Total Distributed</p>
            <p className="text-3xl font-extrabold text-[#2563EB]">{Math.round(totalKg * 100) / 100} Packets</p>
          </div>
        </div>

        <div className="card-lift bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
          <div className="h-1 w-full bg-[#F472B6] opacity-70" />
          <div className="p-4 pt-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-pink-50">
                <Users className="h-5 w-5 text-[#F472B6]" />
              </div>
            </div>
            <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-widest mb-1">Distributions</p>
            <p className="text-3xl font-extrabold text-[#F472B6]">{distributions.length}</p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Button
            onClick={() => setShowForm(!showForm)}
            className="w-full py-4 text-base font-bold rounded-2xl"
          >
            <Plus className="h-5 w-5 mr-2" />
            Record Distribution
          </Button>
        </div>
      </div>

      {/* ── Color-Based Distribution Breakdown ── */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { color: 'YELLOW' as const, count: yellowCount, emoji: '🟡', label: 'Yellow', accent: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-100' },
          { color: 'ORANGE' as const, count: orangeCount, emoji: '🟠', label: 'Orange', accent: '#F97316', bg: 'bg-orange-50', border: 'border-orange-100' },
          { color: 'RED' as const, count: redCount, emoji: '🔴', label: 'Red', accent: '#EF4444', bg: 'bg-red-50', border: 'border-red-100' },
        ]).map((item) => (
          <div key={item.color} className={`bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm`}>
            <div className="h-1 w-full" style={{ backgroundColor: item.accent }} />
            <div className="p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${item.bg} border ${item.border} flex items-center justify-center`}>
                <span className="text-base">{item.emoji}</span>
              </div>
              <div>
                <p className="text-[10px] text-[#6B7280] font-medium uppercase tracking-wider">{item.label} Packets</p>
                <p className="text-lg font-extrabold" style={{ color: item.accent }}>{item.count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Distribution Form ── */}
      {showForm && (
        <div className="animate-fade-in-up bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#E5E7EB]">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50">
              <Plus className="h-4 w-4 text-[#2563EB]" />
            </div>
            <span className="text-[#111827] font-semibold text-sm">New Thriposha Distribution</span>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Recipient Type *</label>
                <select
                  value={form.recipientType}
                  onChange={(e) => handleRecipientTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
                >
                  <option value="PREGNANT_MOTHER">Pregnant Mother</option>
                  <option value="LACTATING_MOTHER">Lactating Mother</option>
                  <option value="CHILD_UNDER_5">Child Under 5</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mother *</label>
                <select
                  value={form.motherId}
                  onChange={(e) => setForm({ ...form, motherId: e.target.value, childId: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
                >
                  <option value="">Select mother...</option>
                  {mothers.map((mother) => (
                    <option key={mother.id} value={mother.id}>
                      {mother.user.name}
                    </option>
                  ))}
                </select>
              </div>

              {form.recipientType === 'CHILD_UNDER_5' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Child *</label>
                  <select
                    value={form.childId}
                    onChange={(e) => handleChildSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
                  >
                    <option value="">Select child...</option>
                    {availableChildren.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name} (Born: {formatDate(child.birthDate)})
                      </option>
                    ))}
                  </select>
                  {form.motherId && availableChildren.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No children found for this mother</p>
                  )}
                  {eligibilityLoading && (
                    <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                      <span className="animate-spin inline-block h-3 w-3 border border-blue-400 border-t-transparent rounded-full"></span>
                      Checking eligibility...
                    </p>
                  )}
                  {eligibilityHint && !eligibilityLoading && (
                    <p className="text-xs text-gray-600 mt-1">{eligibilityHint}</p>
                  )}
                </div>
              )}

              {/* Packet Color Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Packet Color *</label>
                <div className="flex gap-2">
                  {(['YELLOW', 'ORANGE', 'RED'] as const).map((color) => {
                    const cc = PACKET_COLOR_CONFIG[color];
                    const isSelected = form.packetType === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setForm({ ...form, packetType: color })}
                        className={`flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? `${cc.bg} ${cc.border} ${cc.text} shadow-sm scale-[1.02]`
                            : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-lg">{cc.emoji}</span>
                        <span className={`text-xs font-bold ${isSelected ? cc.text : 'text-gray-500'}`}>{cc.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {PACKET_COLOR_HINT[form.packetType]}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity (Packets) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="e.g., 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Distribution Date *</label>
                <input
                  type="date"
                  value={form.distributionDate}
                  onChange={(e) => setForm({ ...form, distributionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Batch Number</label>
                <input
                  type="text"
                  value={form.batchNumber}
                  onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => { setShowForm(false); setError(''); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} isLoading={formLoading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Record Distribution
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Month Filter ── */}
      <div className="flex items-center gap-4 bg-white border border-[#E5E7EB] rounded-2xl px-6 py-3 shadow-sm">
        <Calendar className="h-5 w-5 text-[#2563EB]" />
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(parseInt(e.target.value))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2026, i).toLocaleDateString('en-US', { month: 'long' })}
            </option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(parseInt(e.target.value))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span className="text-sm font-semibold text-[#111827] ml-auto">{monthLabel}</span>
      </div>

      {/* ── Distribution History ── */}
      <div className="animate-fade-in-up bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#E5E7EB]">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50">
            <Package className="h-4 w-4 text-[#2563EB]" />
          </div>
          <span className="text-[#111827] font-semibold text-sm">Distribution History — {monthLabel}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E5E7EB] border-t-[#2563EB]"></div>
          </div>
        ) : distributions.length > 0 ? (
          <div className="divide-y divide-[#F9FAFB]">
            {distributions.map((dist, idx) => {
              const avatarStyles = [
                { bg: 'bg-blue-50', text: 'text-[#2563EB]', border: 'border-blue-100' },
                { bg: 'bg-pink-50', text: 'text-[#F472B6]', border: 'border-pink-100' },
                { bg: 'bg-emerald-50', text: 'text-[#10B981]', border: 'border-emerald-100' },
                { bg: 'bg-amber-50', text: 'text-[#F59E0B]', border: 'border-amber-100' },
              ];
              const style = avatarStyles[idx % avatarStyles.length];
              const recipientName = dist.child?.name || dist.mother?.user?.name || 'Unknown';
              const pktColor = PACKET_COLOR_CONFIG[dist.packetType] || PACKET_COLOR_CONFIG.YELLOW;

              return (
                <div
                  key={dist.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl border ${style.border} ${style.bg} flex items-center justify-center ${style.text} font-bold text-sm shrink-0`}
                    >
                      {recipientName.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{recipientName}</p>
                      <p className="text-xs text-[#6B7280]">
                        {formatDate(dist.distributionDate)}
                        {dist.batchNumber && ` • Batch: ${dist.batchNumber}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {/* Packet Color Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${pktColor.bg} ${pktColor.text} border ${pktColor.border}`}>
                      <span>{pktColor.emoji}</span>
                      {pktColor.label}
                    </span>
                    <Badge
                      variant={RECIPIENT_BADGE_COLORS[dist.recipientType] as 'info' | 'success' | 'warning' || 'info'}
                      className="font-semibold rounded-full px-2.5 py-0.5 text-[10px]"
                    >
                      {RECIPIENT_LABELS[dist.recipientType] || dist.recipientType}
                    </Badge>
                    <span className="text-sm font-bold text-[#2563EB]">{Number(dist.quantity)} Packets</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Package className="h-6 w-6 text-[#2563EB]" />
            </div>
            <p className="text-[#111827] text-sm font-semibold">No distributions for {monthLabel}</p>
            <p className="text-[#6B7280] text-xs mt-0.5 font-light">
              Use the button above to record a distribution
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
