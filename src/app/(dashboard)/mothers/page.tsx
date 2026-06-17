'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Modal, Input, Select, Textarea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Users, Plus, Search, Eye, Edit, UserCheck, Trash2, ToggleLeft, ToggleRight, Heart, Upload } from 'lucide-react';
import { formatDate, bloodGroups, getPregnancyProgress } from '@/lib/utils';

interface Mother {
  id: string;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  emergencyContact: string | null;
  emergencyName: string | null;
  medicalHistory: string | null;
  allergies: string | null;
  mohRegistrationNumber: string | null;
  assignedMidwifeId: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  locationUpdatedAt?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    isActive?: boolean;
  };
  assignedMidwife?: {
    id: string;
    user: { name: string; email: string; phone: string | null };
  } | null;
  pregnancies?: {
    id: string;
    lastMenstrualPeriod?: string | null;
    expectedDeliveryDate?: string | null;
    highRisk?: boolean;
  }[];
  children?: {
    id: string;
    name: string;
    dateOfBirth: string;
  }[];
}

interface Midwife {
  id: string;
  user: { id: string; name: string; email: string; phone: string | null };
  _count?: { assignedMothers: number };
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export default function MothersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [midwives, setMidwives] = useState<Midwife[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMother, setSelectedMother] = useState<Mother | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignedMidwifeSearch, setAssignedMidwifeSearch] = useState('');
  const [accountStatus, setAccountStatus] = useState('all');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [midwifeFilterId, setMidwifeFilterId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    bloodGroup: '',
    emergencyContact: '',
    emergencyName: '',
    medicalHistory: '',
    allergies: '',
    mohRegistrationNumber: '',
    assignedMidwifeId: '',
  });

  const fetchMothers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (assignedMidwifeSearch.trim()) params.set('assignedMidwife', assignedMidwifeSearch.trim());
      if (accountStatus !== 'all') params.set('accountStatus', accountStatus);
      if (bloodGroupFilter) params.set('bloodGroup', bloodGroupFilter);
      if (midwifeFilterId) params.set('midwifeId', midwifeFilterId);

      const query = params.toString();
      const res = await fetch(`/api/mothers${query ? `?${query}` : ''}`);
      const data = await res.json();
      setMothers(data.data || []);
    } catch (error) {
      console.error('Failed to fetch mothers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMidwives = async () => {
    try {
      const res = await fetch('/api/midwives');
      const data = await res.json();
      setMidwives(data.data || []);
    } catch (error) {
      console.error('Failed to fetch midwives:', error);
    }
  };

  useEffect(() => {
    fetchMothers();
  }, [searchTerm, assignedMidwifeSearch, accountStatus, bloodGroupFilter, midwifeFilterId]);

  useEffect(() => {
    fetchMidwives();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password || formData.password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/mothers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          confirmPassword: undefined,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchMothers();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to register mother');
      }
    } catch (error) {
      console.error('Failed to register mother:', error);
      alert('Failed to register mother');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMother) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/mothers/${selectedMother.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          dateOfBirth: formData.dateOfBirth || null,
          bloodGroup: formData.bloodGroup || null,
          emergencyContact: formData.emergencyContact || null,
          emergencyName: formData.emergencyName || null,
          medicalHistory: formData.medicalHistory || null,
          allergies: formData.allergies || null,
          mohRegistrationNumber: formData.mohRegistrationNumber || null,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setSelectedMother(null);
        resetForm();
        fetchMothers();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update mother');
      }
    } catch (error) {
      console.error('Failed to update mother:', error);
      alert('Failed to update mother');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignMidwife = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMother) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/mothers/${selectedMother.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedMidwifeId: formData.assignedMidwifeId || null,
        }),
      });

      if (res.ok) {
        setShowAssignModal(false);
        setSelectedMother(null);
        resetForm();
        fetchMothers();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to assign midwife');
      }
    } catch (error) {
      console.error('Failed to assign midwife:', error);
      alert('Failed to assign midwife');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMidwifeAssignment = async () => {
    if (!selectedMother) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/mothers/${selectedMother.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedMidwifeId: null,
        }),
      });

      if (res.ok) {
        setShowAssignModal(false);
        setSelectedMother(null);
        resetForm();
        fetchMothers();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to remove midwife assignment');
      }
    } catch (error) {
      console.error('Failed to remove midwife assignment:', error);
      alert('Failed to remove midwife assignment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (mother: Mother) => {
    const newStatus = !mother.user.isActive;
    const confirmMsg = newStatus 
      ? `Activate account for ${mother.user.name}?` 
      : `Deactivate account for ${mother.user.name}? They will not be able to login.`;
    
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/mothers/${mother.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (res.ok) {
        fetchMothers();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update account status');
      }
    } catch (error) {
      console.error('Failed to update account status:', error);
      alert('Failed to update account status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMother) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/mothers/${selectedMother.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShowDeleteConfirm(false);
        setSelectedMother(null);
        fetchMothers();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete mother');
      }
    } catch (error) {
      console.error('Failed to delete mother:', error);
      alert('Failed to delete mother');
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      bloodGroup: '',
      emergencyContact: '',
      emergencyName: '',
      medicalHistory: '',
      allergies: '',
      mohRegistrationNumber: '',
      assignedMidwifeId: '',
    });
  };

  const openEditModal = (mother: Mother) => {
    setSelectedMother(mother);
    setFormData({
      name: mother.user.name || '',
      email: mother.user.email || '',
      password: '',
      confirmPassword: '',
      phone: mother.user.phone || '',
      address: mother.user.address || '',
      dateOfBirth: mother.dateOfBirth ? mother.dateOfBirth.split('T')[0] : '',
      bloodGroup: mother.bloodGroup || '',
      emergencyContact: mother.emergencyContact || '',
      emergencyName: mother.emergencyName || '',
      medicalHistory: mother.medicalHistory || '',
      allergies: mother.allergies || '',
      mohRegistrationNumber: mother.mohRegistrationNumber || '',
      assignedMidwifeId: mother.assignedMidwifeId || '',
    });
    setShowEditModal(true);
  };

  const openAssignModal = (mother: Mother) => {
    setSelectedMother(mother);
    setFormData({
      ...formData,
      assignedMidwifeId: mother.assignedMidwifeId || '',
    });
    setShowAssignModal(true);
  };

  const openViewModal = (mother: Mother) => {
    setSelectedMother(mother);
    setShowViewModal(true);
  };

  const openDeleteConfirm = (mother: Mother) => {
    setSelectedMother(mother);
    setShowDeleteConfirm(true);
  };

  const isAdmin = session?.user?.role === 'ADMIN';
  const registeredMothers = mothers.filter((mother) => Boolean(mother.assignedMidwifeId));
  const unregisteredMothers = mothers.filter((mother) => !mother.assignedMidwifeId);
  const selectedMotherLatitude = toNullableNumber(selectedMother?.latitude);
  const selectedMotherLongitude = toNullableNumber(selectedMother?.longitude);
  const hasSelectedMotherCoordinates =
    selectedMotherLatitude !== null && selectedMotherLongitude !== null;
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    Boolean(assignedMidwifeSearch.trim()) ||
    accountStatus !== 'all' ||
    Boolean(bloodGroupFilter) ||
    Boolean(midwifeFilterId);

  const renderMothersTable = (motherRows: Mother[], emptyMessage: string) => (
    motherRows.length > 0 ? (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Blood Group</TableHead>
              <TableHead>Assigned Midwife</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {motherRows.map((mother) => (
              <TableRow key={mother.id}>
                <TableCell className="font-medium">{mother.user?.name}</TableCell>
                <TableCell>{mother.user?.email}</TableCell>
                <TableCell>{mother.user?.phone || '-'}</TableCell>
                <TableCell>
                  {mother.bloodGroup ? (
                    <Badge variant="info">{mother.bloodGroup}</Badge>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {mother.assignedMidwife ? (
                    <Badge variant="success">{mother.assignedMidwife.user.name}</Badge>
                  ) : (
                    <Badge variant="warning">Not Assigned</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {mother.user?.isActive !== false ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="danger">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      title="View Details"
                      onClick={() => openViewModal(mother)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Edit"
                      onClick={() => openEditModal(mother)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Assign Midwife"
                          onClick={() => openAssignModal(mother)}
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={mother.user?.isActive !== false ? 'outline' : 'default'}
                          title={mother.user?.isActive !== false ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggleActive(mother)}
                          disabled={actionLoading}
                        >
                          {mother.user?.isActive !== false ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          title="Delete"
                          onClick={() => openDeleteConfirm(mother)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    ) : (
      <p className="text-center text-gray-500 py-8">{emptyMessage}</p>
    )
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mothers Management</h1>
          <p className="text-gray-500">Manage registered mothers and their records</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/documents/upload')}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Document Upload
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Register Mother
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search mother name, email, phone, or assigned midwife..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-base text-gray-900 placeholder:text-gray-400 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Assigned midwife name..."
                value={assignedMidwifeSearch}
                onChange={(e) => setAssignedMidwifeSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <Select
                value={midwifeFilterId}
                onChange={(e) => setMidwifeFilterId(e.target.value)}
                options={midwives.map((mw) => ({
                  value: mw.id,
                  label: mw.user.name,
                }))}
                placeholder="Filter by midwife"
              />
              <Select
                value={accountStatus}
                onChange={(e) => setAccountStatus(e.target.value)}
                options={[
                  { value: 'active', label: 'Active Accounts' },
                  { value: 'inactive', label: 'Inactive Accounts' },
                ]}
                placeholder="Account status"
              />
              <Select
                value={bloodGroupFilter}
                onChange={(e) => setBloodGroupFilter(e.target.value)}
                options={bloodGroups.map((bg) => ({ value: bg, label: bg }))}
                placeholder="Blood group"
              />
            </div>
            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setAssignedMidwifeSearch('');
                    setAccountStatus('all');
                    setBloodGroupFilter('');
                    setMidwifeFilterId('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isAdmin ? (
        <>
          {/* Registered Mothers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-teal-500" />
                Registered Mothers ({registeredMothers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderMothersTable(registeredMothers, 'No registered mothers found')}
            </CardContent>
          </Card>

          {/* Unregistered Mothers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                Unregistered Mothers ({unregisteredMothers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderMothersTable(unregisteredMothers, 'No unregistered mothers found')}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-500" />
              Mothers ({mothers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderMothersTable(mothers, 'No mothers found')}
          </CardContent>
        </Card>
      )}

      {/* Register Mother Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Register New Mother" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
          </div>
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Blood Group"
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              options={bloodGroups.map(bg => ({ value: bg, label: bg }))}
              placeholder="Select blood group"
            />
            <Select
              label="Assign Midwife"
              value={formData.assignedMidwifeId}
              onChange={(e) => setFormData({ ...formData, assignedMidwifeId: e.target.value })}
              options={midwives.map(mw => ({ 
                value: mw.id, 
                label: `${mw.user.name} (${mw._count?.assignedMothers || 0} mothers)` 
              }))}
              placeholder="Select midwife (optional)"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Emergency Contact"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            />
            <Input
              label="Emergency Contact Name"
              value={formData.emergencyName}
              onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
            />
          </div>
          <Textarea
            label="Medical History"
            value={formData.medicalHistory}
            onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
            placeholder="Any relevant medical history..."
          />
          <Textarea
            label="Allergies"
            value={formData.allergies}
            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
            placeholder="Known allergies..."
          />
          <Input
            label="MOH Registration Number"
            value={formData.mohRegistrationNumber}
            onChange={(e) => setFormData({ ...formData, mohRegistrationNumber: e.target.value })}
            placeholder="e.g., 2026/MAH/102"
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Registering...' : 'Register Mother'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Mother Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Mother Details" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              disabled
              className="bg-gray-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </div>
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Blood Group"
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              options={bloodGroups.map(bg => ({ value: bg, label: bg }))}
              placeholder="Select blood group"
            />
            <Input
              label="Emergency Contact"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            />
          </div>
          <Input
            label="Emergency Contact Name"
            value={formData.emergencyName}
            onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
          />
          <Textarea
            label="Medical History"
            value={formData.medicalHistory}
            onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
            placeholder="Any relevant medical history..."
          />
          <Textarea
            label="Allergies"
            value={formData.allergies}
            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
            placeholder="Known allergies..."
          />
          <Input
            label="MOH Registration Number"
            value={formData.mohRegistrationNumber}
            onChange={(e) => setFormData({ ...formData, mohRegistrationNumber: e.target.value })}
            placeholder="e.g., 2026/MAH/102"
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Midwife Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Midwife" size="md">
        <form onSubmit={handleAssignMidwife} className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600">Assigning midwife for:</p>
            <p className="font-semibold text-gray-900">{selectedMother?.user.name}</p>
            <p className="text-sm text-gray-500">{selectedMother?.user.email}</p>
          </div>
          
          <Select
            label="Select Midwife"
            value={formData.assignedMidwifeId}
            onChange={(e) => setFormData({ ...formData, assignedMidwifeId: e.target.value })}
            options={midwives.map(mw => ({ 
              value: mw.id, 
              label: `${mw.user.name} - ${mw._count?.assignedMothers || 0} assigned mothers` 
            }))}
            placeholder="Select a midwife..."
          />
          
          {selectedMother?.assignedMidwife && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                Currently assigned: <strong>{selectedMother.assignedMidwife.user.name}</strong>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            {selectedMother?.assignedMidwife && (
              <Button 
                type="button" 
                variant="outline"
                onClick={handleRemoveMidwifeAssignment}
                disabled={actionLoading}
              >
                {actionLoading ? 'Removing...' : 'Remove Assignment'}
              </Button>
            )}
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Assigning...' : 'Assign Midwife'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Mother Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Mother Details" size="lg">
        {selectedMother && (
          <div className="space-y-6">
            {/* Header Section with MOH Registration Number */}
            {selectedMother.mohRegistrationNumber && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 p-4 rounded-lg">
                <p className="text-sm text-teal-600 font-semibold">MOH Registration Number</p>
                <p className="text-xl font-bold text-teal-900">{selectedMother.mohRegistrationNumber}</p>
                <p className="text-xs text-teal-700 mt-1">H 502 Registry Serial Number</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Full Name</dt>
                    <dd className="font-medium">{selectedMother.user.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Email</dt>
                    <dd className="font-medium">{selectedMother.user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Phone</dt>
                    <dd className="font-medium">{selectedMother.user.phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Address</dt>
                    <dd className="font-medium">{selectedMother.user.address || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Date of Birth</dt>
                    <dd className="font-medium">
                      {selectedMother.dateOfBirth ? formatDate(selectedMother.dateOfBirth) : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Blood Group</dt>
                    <dd className="font-medium">{selectedMother.bloodGroup || '-'}</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Medical & Emergency</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Emergency Contact</dt>
                    <dd className="font-medium">{selectedMother.emergencyContact || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Emergency Contact Name</dt>
                    <dd className="font-medium">{selectedMother.emergencyName || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Medical History</dt>
                    <dd className="font-medium">{selectedMother.medicalHistory || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Allergies</dt>
                    <dd className="font-medium">{selectedMother.allergies || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Assigned Midwife</h3>
              {selectedMother.assignedMidwife ? (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="font-medium text-green-900">{selectedMother.assignedMidwife.user.name}</p>
                  <p className="text-sm text-green-700">{selectedMother.assignedMidwife.user.email}</p>
                  {selectedMother.assignedMidwife.user.phone && (
                    <p className="text-sm text-green-700">{selectedMother.assignedMidwife.user.phone}</p>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-yellow-800">No midwife assigned yet</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
              {hasSelectedMotherCoordinates ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-900">
                      Coordinates: <strong>{selectedMotherLatitude.toFixed(6)}, {selectedMotherLongitude.toFixed(6)}</strong>
                    </p>
                    {selectedMother.locationUpdatedAt && (
                      <p className="text-xs text-blue-700 mt-1">
                        Updated: {formatDate(selectedMother.locationUpdatedAt)}
                      </p>
                    )}
                  </div>
                  <div className="w-full h-56 rounded-lg overflow-hidden border border-gray-200">
                    <iframe
                      title={`Location of ${selectedMother.user.name}`}
                      src={`https://maps.google.com/maps?q=${selectedMotherLatitude},${selectedMotherLongitude}&z=15&output=embed`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedMotherLatitude},${selectedMotherLongitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm font-medium text-teal-700 hover:text-teal-800 underline"
                  >
                    Open in Google Maps
                  </a>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Location not added by mother yet.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Pregnancies</h3>
                {(() => {
                  const activePreg = selectedMother.pregnancies?.find((p: { status: string }) => p.status === 'ACTIVE');
                  const progress = activePreg ? getPregnancyProgress(activePreg.lastMenstrualPeriod) : null;
                  if (activePreg && progress) {
                    return (
                      <div className="bg-pink-50 border border-pink-200 p-3 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-sm font-medium text-pink-900">
                            <Heart className="h-4 w-4 text-pink-500" />
                            Active Pregnancy
                          </span>
                          <Badge variant={progress.isOverdue ? 'danger' : 'info'}>
                            {progress.trimesterLabel}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Week {progress.weeks}, Day {progress.days} · Month {progress.month}</span>
                          <span>{progress.percentComplete}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${progress.isOverdue ? 'bg-red-500' : 'bg-pink-500'}`}
                            style={{ width: `${progress.percentComplete}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>EDD: {formatDate(progress.expectedDeliveryDate)}</span>
                          <span>{progress.isOverdue ? 'Overdue' : `${progress.daysRemaining} days left`}</span>
                        </div>
                        {activePreg.highRisk && (
                          <Badge variant="danger">High Risk</Badge>
                        )}
                      </div>
                    );
                  }
                  return (
                    <p className="text-2xl font-bold text-teal-600">
                      {selectedMother.pregnancies?.length || 0}
                    </p>
                  );
                })()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Children</h3>
                <p className="text-2xl font-bold text-teal-600">
                  {selectedMother.children?.length || 0}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setShowViewModal(false);
                openEditModal(selectedMother);
              }}>
                Edit Details
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Confirm Delete" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <Trash2 className="h-6 w-6" />
            <p className="font-semibold">Delete Mother Account</p>
          </div>
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedMother?.user.name}</strong>? 
            This will permanently remove all their data including pregnancies, children records, and visits.
          </p>
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded">
            ⚠️ This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
