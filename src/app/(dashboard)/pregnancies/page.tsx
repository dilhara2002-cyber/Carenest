'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Modal, Input, Select, Textarea } from '@/components/ui';
import { Heart, Plus, Edit, AlertTriangle, User, Calendar, RefreshCw, Search, Eye, Trash2 } from 'lucide-react';
import { formatDate, getPregnancyTrimester } from '@/lib/utils';
import type { PregnancyProgress } from '@/lib/utils';

interface Pregnancy {
  id: string;
  motherId: string;
  lastMenstrualPeriod: string | null;
  expectedDeliveryDate: string | null;
  currentWeek: number | null;
  status: 'ACTIVE' | 'DELIVERED' | 'MISCARRIAGE' | 'INACTIVE';
  highRisk: boolean;
  highRiskReasons: string | null;
  medicalNotes: string | null;
  createdAt: string;
  progress?: PregnancyProgress | null;
  mother?: {
    id: string;
    user: { name: string; email: string };
    assignedMidwife?: {
      user: { name: string };
    };
  };
}

interface Mother {
  id: string;
  user: { id: string; name: string; email: string };
  pregnancies?: { status: string }[];
}

export default function PregnanciesPage() {
  const { data: session } = useSession();
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([]);
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPregnancy, setSelectedPregnancy] = useState<Pregnancy | null>(null);
  const [editingPregnancy, setEditingPregnancy] = useState<Pregnancy | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    motherId: '',
    lastMenstrualPeriod: '',
    medicalNotes: '',
    highRisk: false,
    highRiskReasons: '',
    gravida: '',
    para: '',
    bloodPressure: '',
    weight: '',
  });

  const [editFormData, setEditFormData] = useState({
    lastMenstrualPeriod: '',
    medicalNotes: '',
    highRisk: false,
    highRiskReasons: '',
    gravida: '',
    para: '',
    bloodPressure: '',
    weight: '',
    status: '',
  });

  const isAdmin = session?.user?.role === 'ADMIN';
  const isMidwife = session?.user?.role === 'MIDWIFE';
  const isMother = session?.user?.role === 'MOTHER';
  const canManage = isAdmin || isMidwife;

  const fetchPregnancies = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`/api/pregnancies?${params.toString()}`);
      const data = await res.json();
      setPregnancies(data.data || []);
    } catch (error) {
      console.error('Failed to fetch pregnancies:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchMothers = async () => {
    try {
      const res = await fetch('/api/mothers?pageSize=100');
      const data = await res.json();
      setMothers(data.data || []);
    } catch (error) {
      console.error('Failed to fetch mothers:', error);
    }
  };

  useEffect(() => {
    fetchPregnancies();
    if (canManage) {
      fetchMothers();
    }
  }, [fetchPregnancies, canManage]);

  const resetForm = () => {
    setFormData({
      motherId: '',
      lastMenstrualPeriod: '',
      medicalNotes: '',
      highRisk: false,
      highRiskReasons: '',
      gravida: '',
      para: '',
      bloodPressure: '',
      weight: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.motherId) {
      alert('Please select a mother');
      return;
    }
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/pregnancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motherId: formData.motherId,
          lastMenstrualPeriod: formData.lastMenstrualPeriod,
          medicalNotes: formData.medicalNotes,
          highRisk: formData.highRisk,
          highRiskReasons: formData.highRiskReasons,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        resetForm();
        fetchPregnancies();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add pregnancy');
      }
    } catch (error) {
      console.error('Failed to create pregnancy:', error);
      alert('Failed to add pregnancy');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (pregnancy: Pregnancy, newStatus: string) => {
    try {
      const res = await fetch(`/api/pregnancies/${pregnancy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (res.ok) {
        fetchPregnancies();
      }
    } catch (error) {
      console.error('Failed to update pregnancy:', error);
    }
  };

  const openEditModal = (pregnancy: Pregnancy) => {
    setEditingPregnancy(pregnancy);
    setEditFormData({
      lastMenstrualPeriod: pregnancy.lastMenstrualPeriod 
        ? new Date(pregnancy.lastMenstrualPeriod).toISOString().split('T')[0] 
        : '',
      medicalNotes: pregnancy.medicalNotes || '',
      highRisk: pregnancy.highRisk,
      highRiskReasons: pregnancy.highRiskReasons || '',
      gravida: '',
      para: '',
      bloodPressure: '',
      weight: '',
      status: pregnancy.status,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPregnancy) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/pregnancies/${editingPregnancy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastMenstrualPeriod: editFormData.lastMenstrualPeriod || undefined,
          medicalNotes: editFormData.medicalNotes,
          highRisk: editFormData.highRisk,
          highRiskReasons: editFormData.highRiskReasons,
          status: editFormData.status,
          gravida: editFormData.gravida || undefined,
          para: editFormData.para || undefined,
          bloodPressure: editFormData.bloodPressure || undefined,
          weight: editFormData.weight || undefined,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditingPregnancy(null);
        fetchPregnancies();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update pregnancy');
      }
    } catch (error) {
      console.error('Failed to update pregnancy:', error);
      alert('Failed to update pregnancy');
    } finally {
      setActionLoading(false);
    }
  };

  const openViewModal = (pregnancy: Pregnancy) => {
    setSelectedPregnancy(pregnancy);
    setShowViewModal(true);
  };

  // Filter pregnancies by search
  const filteredPregnancies = pregnancies.filter(p => {
    if (!searchTerm) return true;
    const motherName = p.mother?.user?.name?.toLowerCase() || '';
    const motherEmail = p.mother?.user?.email?.toLowerCase() || '';
    return motherName.includes(searchTerm.toLowerCase()) || motherEmail.includes(searchTerm.toLowerCase());
  });

  // Get mothers without active pregnancy for the dropdown
  const availableMothers = mothers.filter(m => {
    const hasActivePregnancy = m.pregnancies?.some(p => p.status === 'ACTIVE');
    return !hasActivePregnancy;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const activePregnancies = pregnancies.filter(p => p.status === 'ACTIVE');
  const highRiskPregnancies = pregnancies.filter(p => p.highRisk && p.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pregnancy Tracking</h1>
          <p className="text-gray-500">
            {isMother ? 'Monitor your pregnancy progress' : 'Monitor and manage pregnancy records'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPregnancies}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canManage && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Register Pregnancy
            </Button>
          )}
        </div>
      </div>

      {/* Stats (for Admin/Midwife) */}
      {canManage && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-pink-100 rounded-lg">
                <Heart className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold">{pregnancies.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold">{activePregnancies.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">High Risk</p>
                <p className="text-2xl font-bold">{highRiskPregnancies.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Delivered</p>
                <p className="text-2xl font-bold">{pregnancies.filter(p => p.status === 'DELIVERED').length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters (for Admin/Midwife) */}
      {canManage && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by mother name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'DELIVERED', label: 'Delivered' },
                  { value: 'MISCARRIAGE', label: 'Miscarriage' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
                placeholder="All statuses"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pregnancy Cards */}
      {filteredPregnancies.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPregnancies.map((pregnancy) => (
            <Card 
              key={pregnancy.id} 
              className={`overflow-hidden ${pregnancy.status === 'ACTIVE' ? 'border-pink-200' : ''}`}
            >
              <div className={`h-2 ${
                pregnancy.status === 'ACTIVE' ? 'bg-gradient-to-r from-pink-400 to-pink-600' :
                pregnancy.status === 'DELIVERED' ? 'bg-green-500' :
                pregnancy.status === 'MISCARRIAGE' ? 'bg-gray-400' : 'bg-gray-300'
              }`} />
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${pregnancy.status === 'ACTIVE' ? 'bg-pink-100' : 'bg-gray-100'}`}>
                      <Heart className={`h-6 w-6 ${pregnancy.status === 'ACTIVE' ? 'text-pink-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      {canManage && pregnancy.mother && (
                        <>
                          <h3 className="font-semibold text-lg">{pregnancy.mother.user.name}</h3>
                          <p className="text-sm text-gray-500">{pregnancy.mother.user.email}</p>
                        </>
                      )}
                      {isMother && (
                        <h3 className="font-semibold text-lg">My Pregnancy</h3>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pregnancy.highRisk && (
                      <Badge variant="danger">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        High Risk
                      </Badge>
                    )}
                    <Badge variant={
                      pregnancy.status === 'ACTIVE' ? 'success' :
                      pregnancy.status === 'DELIVERED' ? 'info' : 'default'
                    }>
                      {pregnancy.status}
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar (for active pregnancies) */}
                {pregnancy.status === 'ACTIVE' && (pregnancy.progress || pregnancy.currentWeek) && (
                  <div className="mb-4">
                    {pregnancy.progress ? (
                      <>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">
                            Week {pregnancy.progress.weeks}, Day {pregnancy.progress.days} · Month {pregnancy.progress.month}
                          </span>
                          <span className="text-gray-500">{pregnancy.progress.trimesterLabel}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              pregnancy.progress.isOverdue
                                ? 'bg-gradient-to-r from-red-400 to-red-600'
                                : 'bg-gradient-to-r from-pink-400 to-pink-600'
                            }`}
                            style={{ width: `${pregnancy.progress.percentComplete}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>EDD: {formatDate(pregnancy.progress.expectedDeliveryDate)}</span>
                          <span>
                            {pregnancy.progress.isOverdue
                              ? '⚠️ Overdue'
                              : `${pregnancy.progress.daysRemaining} days remaining`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">Week {pregnancy.currentWeek} of 40</span>
                          <span className="text-gray-500">{getPregnancyTrimester(pregnancy.currentWeek!)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-pink-400 to-pink-600 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min((pregnancy.currentWeek! / 40) * 100, 100)}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs">Last Menstrual Period</p>
                    <p className="font-medium">{formatDate(pregnancy.lastMenstrualPeriod) || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500 text-xs">Expected Delivery</p>
                    <p className="font-medium">{formatDate(pregnancy.expectedDeliveryDate) || 'N/A'}</p>
                  </div>
                  {canManage && pregnancy.mother?.assignedMidwife && (
                    <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                      <p className="text-gray-500 text-xs">Assigned Midwife</p>
                      <p className="font-medium">{pregnancy.mother.assignedMidwife.user.name}</p>
                    </div>
                  )}
                </div>

                {/* Medical Notes Preview */}
                {pregnancy.medicalNotes && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium mb-1">Medical Notes</p>
                    <p className="text-sm text-blue-800 line-clamp-2">{pregnancy.medicalNotes}</p>
                  </div>
                )}

                {/* High Risk Reasons */}
                {pregnancy.highRisk && pregnancy.highRiskReasons && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600 font-medium mb-1">High Risk Reasons</p>
                    <p className="text-sm text-red-800 line-clamp-2">{pregnancy.highRiskReasons}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button size="sm" variant="outline" onClick={() => openViewModal(pregnancy)}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {canManage && (
                    <Button size="sm" variant="outline" onClick={() => openEditModal(pregnancy)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {canManage && pregnancy.status === 'ACTIVE' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleUpdateStatus(pregnancy, 'DELIVERED')}
                    >
                      Mark Delivered
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pregnancy records found</h3>
            <p className="text-gray-500 mb-4">
              {canManage ? 'Register a pregnancy to start tracking' : 'No pregnancy records available'}
            </p>
            {canManage && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Register Pregnancy
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Register Pregnancy Modal */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); resetForm(); }} 
        title="Register New Pregnancy" 
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mother Selection */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900 flex items-center gap-2 mb-3">
              <User className="h-5 w-5" />
              Select Mother
            </h3>
            <Select
              label="Registered Mother *"
              value={formData.motherId}
              onChange={(e) => setFormData({ ...formData, motherId: e.target.value })}
              options={availableMothers.map(m => ({ 
                value: m.id, 
                label: `${m.user.name} (${m.user.email})` 
              }))}
              placeholder="Select a mother..."
              required
            />
            {availableMothers.length === 0 && (
              <p className="text-sm text-purple-700 mt-2">
                No mothers available. All registered mothers already have an active pregnancy.
              </p>
            )}
          </div>

          {/* Pregnancy Details */}
          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="font-semibold text-pink-900 flex items-center gap-2 mb-3">
              <Heart className="h-5 w-5" />
              Pregnancy Information
            </h3>
            <div className="space-y-4">
              <Input
                label="Last Menstrual Period (LMP) *"
                type="date"
                value={formData.lastMenstrualPeriod}
                onChange={(e) => setFormData({ ...formData, lastMenstrualPeriod: e.target.value })}
                required
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Gravida (Total Pregnancies)"
                  type="number"
                  min="1"
                  value={formData.gravida}
                  onChange={(e) => setFormData({ ...formData, gravida: e.target.value })}
                  placeholder="e.g., 2"
                />
                <Input
                  label="Para (Deliveries)"
                  type="number"
                  min="0"
                  value={formData.para}
                  onChange={(e) => setFormData({ ...formData, para: e.target.value })}
                  placeholder="e.g., 1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Blood Pressure"
                  value={formData.bloodPressure}
                  onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })}
                  placeholder="e.g., 120/80"
                />
                <Input
                  label="Weight (kg)"
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="e.g., 65.5"
                />
              </div>
            </div>
          </div>

          {/* Medical Notes */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5" />
              Medical Information
            </h3>
            <Textarea
              label="Medical Notes"
              value={formData.medicalNotes}
              onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
              placeholder="Previous pregnancies, medical conditions, allergies, medications..."
              rows={3}
            />
          </div>

          {/* High Risk Section */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-red-900 flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5" />
              Risk Assessment
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="highRisk"
                checked={formData.highRisk}
                onChange={(e) => setFormData({ ...formData, highRisk: e.target.checked })}
                className="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
              />
              <label htmlFor="highRisk" className="text-sm font-medium text-red-800">
                Mark as High-Risk Pregnancy
              </label>
            </div>
            {formData.highRisk && (
              <Textarea
                label="High Risk Reasons"
                value={formData.highRiskReasons}
                onChange={(e) => setFormData({ ...formData, highRiskReasons: e.target.value })}
                placeholder="Describe the reasons for high-risk classification..."
                rows={2}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading || !formData.motherId}>
              {actionLoading ? 'Registering...' : 'Register Pregnancy'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal 
        isOpen={showViewModal} 
        onClose={() => { setShowViewModal(false); setSelectedPregnancy(null); }} 
        title="Pregnancy Details" 
        size="md"
      >
        {selectedPregnancy && (
          <div className="space-y-6">
            {/* Mother Info */}
            {selectedPregnancy.mother && (
              <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
                  <span className="text-purple-700 font-bold text-lg">
                    {selectedPregnancy.mother.user.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{selectedPregnancy.mother.user.name}</h3>
                  <p className="text-sm text-gray-500">{selectedPregnancy.mother.user.email}</p>
                </div>
              </div>
            )}

            {/* Pregnancy Progress */}
            {selectedPregnancy.status === 'ACTIVE' && (selectedPregnancy.progress || selectedPregnancy.currentWeek) && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Progress</h4>
                {selectedPregnancy.progress ? (
                  <>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Week {selectedPregnancy.progress.weeks}, Day {selectedPregnancy.progress.days} of 40</span>
                      <span className="text-gray-500">{selectedPregnancy.progress.trimesterLabel}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
                      <div
                        className={`h-4 rounded-full ${
                          selectedPregnancy.progress.isOverdue
                            ? 'bg-gradient-to-r from-red-400 to-red-600'
                            : 'bg-gradient-to-r from-pink-400 to-pink-600'
                        }`}
                        style={{ width: `${selectedPregnancy.progress.percentComplete}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-purple-50 p-2 rounded-lg text-center">
                        <span className="text-purple-600 text-xs">Month</span>
                        <p className="font-bold text-purple-900">{selectedPregnancy.progress.month}</p>
                      </div>
                      <div className="bg-teal-50 p-2 rounded-lg text-center">
                        <span className="text-teal-600 text-xs">EDD</span>
                        <p className="font-bold text-xs text-teal-900">{formatDate(selectedPregnancy.progress.expectedDeliveryDate)}</p>
                      </div>
                      <div className={`p-2 rounded-lg text-center ${selectedPregnancy.progress.isOverdue ? 'bg-red-50' : 'bg-green-50'}`}>
                        <span className={`text-xs ${selectedPregnancy.progress.isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                          {selectedPregnancy.progress.isOverdue ? 'Overdue' : 'Days Left'}
                        </span>
                        <p className={`font-bold ${selectedPregnancy.progress.isOverdue ? 'text-red-900' : 'text-green-900'}`}>
                          {selectedPregnancy.progress.daysRemaining}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Week {selectedPregnancy.currentWeek} of 40</span>
                      <span className="text-gray-500">{getPregnancyTrimester(selectedPregnancy.currentWeek!)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-gradient-to-r from-pink-400 to-pink-600 h-4 rounded-full"
                        style={{ width: `${Math.min((selectedPregnancy.currentWeek! / 40) * 100, 100)}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Details */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Status</p>
                  <Badge variant={selectedPregnancy.status === 'ACTIVE' ? 'success' : 'default'}>
                    {selectedPregnancy.status}
                  </Badge>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Risk Level</p>
                  <Badge variant={selectedPregnancy.highRisk ? 'danger' : 'success'}>
                    {selectedPregnancy.highRisk ? 'High Risk' : 'Normal'}
                  </Badge>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Last Menstrual Period</p>
                  <p className="font-medium">{formatDate(selectedPregnancy.lastMenstrualPeriod) || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Expected Delivery</p>
                  <p className="font-medium">{formatDate(selectedPregnancy.expectedDeliveryDate) || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                  <p className="text-gray-500">Registered On</p>
                  <p className="font-medium">{formatDate(selectedPregnancy.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Medical Notes */}
            {selectedPregnancy.medicalNotes && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Medical Notes</h4>
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  {selectedPregnancy.medicalNotes}
                </p>
              </div>
            )}

            {/* High Risk Reasons */}
            {selectedPregnancy.highRisk && selectedPregnancy.highRiskReasons && (
              <div>
                <h4 className="font-medium text-red-700 mb-2">High Risk Reasons</h4>
                <p className="text-sm text-red-800 bg-red-50 p-3 rounded-lg border border-red-200">
                  {selectedPregnancy.highRiskReasons}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Pregnancy Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => { setShowEditModal(false); setEditingPregnancy(null); }} 
        title="Edit Pregnancy Record" 
        size="lg"
      >
        {editingPregnancy && (
          <form onSubmit={handleEditSubmit} className="space-y-6">
            {/* Mother Info (read-only) */}
            {editingPregnancy.mother && (
              <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
                  <span className="text-purple-700 font-bold text-lg">
                    {editingPregnancy.mother.user.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{editingPregnancy.mother.user.name}</h3>
                  <p className="text-sm text-gray-500">{editingPregnancy.mother.user.email}</p>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Pregnancy Status</h3>
              <Select
                label="Status"
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'DELIVERED', label: 'Delivered' },
                  { value: 'MISCARRIAGE', label: 'Miscarriage' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
              />
            </div>

            {/* Pregnancy Details */}
            <div className="bg-pink-50 p-4 rounded-lg">
              <h3 className="font-semibold text-pink-900 flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5" />
                Pregnancy Information
              </h3>
              <div className="space-y-4">
                <Input
                  label="Last Menstrual Period (LMP)"
                  type="date"
                  value={editFormData.lastMenstrualPeriod}
                  onChange={(e) => setEditFormData({ ...editFormData, lastMenstrualPeriod: e.target.value })}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Gravida (Total Pregnancies)"
                    type="number"
                    min="1"
                    value={editFormData.gravida}
                    onChange={(e) => setEditFormData({ ...editFormData, gravida: e.target.value })}
                    placeholder="e.g., 2"
                  />
                  <Input
                    label="Para (Deliveries)"
                    type="number"
                    min="0"
                    value={editFormData.para}
                    onChange={(e) => setEditFormData({ ...editFormData, para: e.target.value })}
                    placeholder="e.g., 1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Blood Pressure"
                    value={editFormData.bloodPressure}
                    onChange={(e) => setEditFormData({ ...editFormData, bloodPressure: e.target.value })}
                    placeholder="e.g., 120/80"
                  />
                  <Input
                    label="Weight (kg)"
                    type="number"
                    step="0.1"
                    value={editFormData.weight}
                    onChange={(e) => setEditFormData({ ...editFormData, weight: e.target.value })}
                    placeholder="e.g., 65.5"
                  />
                </div>

                <Textarea
                  label="Medical Notes"
                  value={editFormData.medicalNotes}
                  onChange={(e) => setEditFormData({ ...editFormData, medicalNotes: e.target.value })}
                  placeholder="Additional medical notes, observations, etc."
                  rows={3}
                />
              </div>
            </div>

            {/* High Risk Section */}
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="editHighRisk"
                  checked={editFormData.highRisk}
                  onChange={(e) => setEditFormData({ ...editFormData, highRisk: e.target.checked })}
                  className="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                />
                <label htmlFor="editHighRisk" className="text-sm font-medium text-red-800">
                  Mark as High-Risk Pregnancy
                </label>
              </div>
              {editFormData.highRisk && (
                <Textarea
                  label="High Risk Reasons"
                  value={editFormData.highRiskReasons}
                  onChange={(e) => setEditFormData({ ...editFormData, highRiskReasons: e.target.value })}
                  placeholder="Describe the reasons for high-risk classification..."
                  rows={2}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditingPregnancy(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
