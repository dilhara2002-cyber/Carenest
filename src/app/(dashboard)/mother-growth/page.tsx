'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Modal,
  Input,
  Select,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import {
  Activity,
  Plus,
  Edit,
  Weight,
  TrendingUp,
  Search,
  Calendar,
  User,
  ChevronRight,
  Users,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { MotherGrowthRecordData } from '@/types';

interface Mother {
  id: string;
  user: { name: string; email: string };
}

const emptyForm = {
  motherId: '',
  recordDate: new Date().toISOString().split('T')[0],
  weightKg: '',
  sfhCm: '',
  notes: '',
};

export default function MotherGrowthPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [records, setRecords] = useState<MotherGrowthRecordData[]>([]);
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MotherGrowthRecordData | null>(null);

  const [formData, setFormData] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMotherId, setFilterMotherId] = useState('');

  // Redirect mothers to their own history page
  useEffect(() => {
    if (session?.user?.role === 'MOTHER') {
      router.replace('/mother-growth/my-history');
    }
  }, [session, router]);

  // Read motherId query param from URL on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const mId = urlParams.get('motherId');
      if (mId) {
        setFilterMotherId(mId);
      }
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMotherId) params.set('motherId', filterMotherId);
      const res = await fetch(`/api/mother-growth${params.toString() ? `?${params}` : ''}`);
      const data = await res.json();
      setRecords(data.data || []);
    } catch (err) {
      console.error('Failed to fetch growth records:', err);
    } finally {
      setLoading(false);
    }
  }, [filterMotherId]);

  const fetchMothers = useCallback(async () => {
    try {
      const res = await fetch('/api/mothers');
      const data = await res.json();
      setMothers(
        (data.data || []).map((m: { id: string; user: { name: string; email: string } }) => ({
          id: m.id,
          user: { name: m.user.name, email: m.user.email },
        }))
      );
    } catch (err) {
      console.error('Failed to fetch mothers:', err);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchMothers();
  }, [fetchMothers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/mother-growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData(emptyForm);
        fetchRecords();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save record');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save record');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (record: MotherGrowthRecordData) => {
    setSelectedRecord(record);
    setFormData({
      motherId: record.motherId,
      recordDate: new Date(record.recordDate).toISOString().split('T')[0],
      weightKg: String(record.weightKg),
      sfhCm: record.sfhCm != null ? String(record.sfhCm) : '',
      notes: record.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/mother-growth/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordDate: formData.recordDate,
          weightKg: formData.weightKg,
          sfhCm: formData.sfhCm,
          notes: formData.notes,
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        setSelectedRecord(null);
        setFormData(emptyForm);
        fetchRecords();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update record');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update record');
    } finally {
      setActionLoading(false);
    }
  };

  // Derived stats
  const filtered = records.filter((r) => {
    if (!searchTerm) return true;
    const name = r.mother?.user?.name?.toLowerCase() || '';
    return name.includes(searchTerm.toLowerCase());
  });

  const avgWeight =
    records.length > 0
      ? (
          records.reduce((sum, r) => sum + parseFloat(String(r.weightKg)), 0) /
          records.length
        ).toFixed(1)
      : '—';

  const latestSfh = records.find((r) => r.sfhCm != null)?.sfhCm;

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedRecord(null);
  };

  if (session?.user?.role === 'MOTHER') return null; // redirecting

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link
          href="/mothers"
          className="flex items-center gap-1 hover:text-teal-600 transition-colors"
        >
          <Users className="h-3.5 w-3.5" />
          Mother Management
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-800 font-medium">Growth Tracker</span>
      </nav>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mother Growth Tracker</h1>
          <p className="text-gray-500">
            Record and monitor maternal weight &amp; belly growth (SFH)
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-full bg-teal-100 p-3">
              <Activity className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{records.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-full bg-purple-100 p-3">
              <Weight className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Weight</p>
              <p className="text-2xl font-bold text-gray-900">{avgWeight} kg</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-full bg-rose-100 p-3">
              <TrendingUp className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Latest SFH</p>
              <p className="text-2xl font-bold text-gray-900">
                {latestSfh != null ? `${latestSfh} cm` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by mother name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <Select
              value={filterMotherId}
              onChange={(e) => setFilterMotherId(e.target.value)}
              options={mothers.map((m) => ({ value: m.id, label: m.user.name }))}
              placeholder="Filter by mother"
            />
            {(searchTerm || filterMotherId) && (
              <Button
                variant="outline"
                onClick={() => { setSearchTerm(''); setFilterMotherId(''); }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Records table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-500" />
            Growth Records ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No growth records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Mother</TableHead>
                    <TableHead>Weight (kg)</TableHead>
                    <TableHead>SFH (cm)</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(record.recordDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-medium text-sm">
                            {record.mother?.user?.name || '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">
                          {parseFloat(String(record.weightKg)).toFixed(1)} kg
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.sfhCm != null ? (
                          <Badge variant="success">
                            {parseFloat(String(record.sfhCm)).toFixed(1)} cm
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm text-gray-600">
                        {record.notes || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {record.recordedBy?.user?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Edit record"
                          onClick={() => openEditModal(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Record Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title="Add Growth Record"
        size="lg"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Select
            label="Mother"
            value={formData.motherId}
            onChange={(e) => setFormData({ ...formData, motherId: e.target.value })}
            options={mothers.map((m) => ({ value: m.id, label: m.user.name }))}
            placeholder="Select mother"
            required
          />
          <Input
            label="Record Date"
            type="date"
            value={formData.recordDate}
            onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Weight (kg)"
              type="number"
              step="0.01"
              min="30"
              max="200"
              placeholder="e.g. 65.40"
              value={formData.weightKg}
              onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
              required
            />
            <Input
              label="SFH — Belly Growth (cm)"
              type="number"
              step="0.1"
              min="10"
              max="60"
              placeholder="e.g. 28.0"
              value={formData.sfhCm}
              onChange={(e) => setFormData({ ...formData, sfhCm: e.target.value })}
            />
          </div>
          <Textarea
            label="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any observations or remarks…"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowAddModal(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Saving…' : 'Save Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Record Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); resetForm(); }}
        title="Edit Growth Record"
        size="lg"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          {/* Mother is fixed — show as read-only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mother</label>
            <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
              {selectedRecord?.mother?.user?.name || '—'}
            </p>
          </div>
          <Input
            label="Record Date"
            type="date"
            value={formData.recordDate}
            onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Weight (kg)"
              type="number"
              step="0.01"
              min="30"
              max="200"
              value={formData.weightKg}
              onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
              required
            />
            <Input
              label="SFH — Belly Growth (cm)"
              type="number"
              step="0.1"
              min="10"
              max="60"
              value={formData.sfhCm}
              onChange={(e) => setFormData({ ...formData, sfhCm: e.target.value })}
            />
          </div>
          <Textarea
            label="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowEditModal(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Updating…' : 'Update Record'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
