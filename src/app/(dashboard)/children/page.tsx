'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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
} from '@/components/ui';
import {
  Baby,
  Plus,
  Edit,
  Scale,
  Ruler,
  User,
  Calendar,
  RefreshCw,
  Search,
  Eye,
  Heart,
  MapPin,
  Clock,
  Syringe,
} from 'lucide-react';
import { formatDate, calculateAge } from '@/lib/utils';

interface Child {
  id: string;
  motherId: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  birthWeight: number | null;
  birthHeight: number | null;
  birthTime: string | null;
  birthPlace: string | null;
  healthNotes: string | null;
  createdAt: string;
  mother?: {
    id: string;
    user: { name: string; email: string };
    assignedMidwife?: {
      user: { name: string };
    };
  };
  growthRecords?: {
    id: string;
    weight: number | null;
    height: number | null;
    headCircumference: number | null;
    recordDate: string;
  }[];
  vaccinations?: {
    id: string;
    vaccineName: string;
    status: string;
    scheduledDate: string;
  }[];
}

interface Mother {
  id: string;
  user: { id: string; name: string; email: string };
}

const birthPlaceOptions = [
  'Hospital - Government',
  'Hospital - Private',
  'Maternity Home',
  'Home Delivery',
  'Clinic',
  'Other',
];

export default function ChildrenPage() {
  const { data: session } = useSession();
  const [children, setChildren] = useState<Child[]>([]);
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  const [formData, setFormData] = useState({
    motherId: '',
    name: '',
    gender: 'MALE',
    birthDate: '',
    birthTime: '',
    birthWeight: '',
    birthHeight: '',
    birthPlace: '',
    headCircumference: '',
    apgarScore: '',
    deliveryType: 'NORMAL',
    healthNotes: '',
    birthComplications: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    gender: 'MALE',
    birthDate: '',
    birthTime: '',
    birthWeight: '',
    birthHeight: '',
    birthPlace: '',
    healthNotes: '',
  });

  const isAdmin = session?.user?.role === 'ADMIN';
  const isMidwife = session?.user?.role === 'MIDWIFE';
  const isMother = session?.user?.role === 'MOTHER';
  const canManage = isAdmin || isMidwife;

  const fetchChildren = useCallback(async () => {
    try {
      const res = await fetch('/api/children');
      const data = await res.json();
      setChildren(data.data || []);
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
    fetchChildren();
    if (canManage) {
      fetchMothers();
    }
  }, [fetchChildren, canManage]);

  const resetForm = () => {
    setFormData({
      motherId: '',
      name: '',
      gender: 'MALE',
      birthDate: '',
      birthTime: '',
      birthWeight: '',
      birthHeight: '',
      birthPlace: '',
      headCircumference: '',
      apgarScore: '',
      deliveryType: 'NORMAL',
      healthNotes: '',
      birthComplications: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.motherId && canManage) {
      alert('Please select a mother');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motherId: formData.motherId || undefined,
          name: formData.name,
          gender: formData.gender,
          birthDate: formData.birthDate,
          birthTime: formData.birthTime,
          birthWeight: formData.birthWeight,
          birthHeight: formData.birthHeight,
          birthPlace: formData.birthPlace,
          healthNotes: formData.healthNotes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        resetForm();
        fetchChildren();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to register child');
      }
    } catch (error) {
      console.error('Failed to register child:', error);
      alert('Failed to register child');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (child: Child) => {
    setEditingChild(child);
    setEditFormData({
      name: child.name,
      gender: child.gender,
      birthDate: child.birthDate ? new Date(child.birthDate).toISOString().split('T')[0] : '',
      birthTime: child.birthTime || '',
      birthWeight: child.birthWeight?.toString() || '',
      birthHeight: child.birthHeight?.toString() || '',
      birthPlace: child.birthPlace || '',
      healthNotes: child.healthNotes || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChild) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/children/${editingChild.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          gender: editFormData.gender,
          birthDate: editFormData.birthDate,
          birthTime: editFormData.birthTime || undefined,
          birthWeight: editFormData.birthWeight || undefined,
          birthHeight: editFormData.birthHeight || undefined,
          birthPlace: editFormData.birthPlace || undefined,
          healthNotes: editFormData.healthNotes || undefined,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditingChild(null);
        fetchChildren();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update child');
      }
    } catch (error) {
      console.error('Failed to update child:', error);
      alert('Failed to update child');
    } finally {
      setActionLoading(false);
    }
  };

  const openViewModal = (child: Child) => {
    setSelectedChild(child);
    setShowViewModal(true);
  };

  // Filter children
  const filteredChildren = children.filter((child) => {
    let matches = true;
    if (searchTerm) {
      const motherName = child.mother?.user?.name?.toLowerCase() || '';
      const childName = child.name.toLowerCase();
      matches = motherName.includes(searchTerm.toLowerCase()) || childName.includes(searchTerm.toLowerCase());
    }
    if (genderFilter && matches) {
      matches = child.gender === genderFilter;
    }
    return matches;
  });

  const getAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    
    if (months < 1) {
      const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} days`;
    } else if (months < 24) {
      return `${months} months`;
    } else {
      const years = Math.floor(months / 12);
      return `${years} years`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const maleChildren = children.filter((c) => c.gender === 'MALE');
  const femaleChildren = children.filter((c) => c.gender === 'FEMALE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Children Management</h1>
          <p className="text-gray-500">
            {isMother ? 'Track your children\'s health and growth' : 'Register and manage children records'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchChildren}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canManage && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Register Child
            </Button>
          )}
        </div>
      </div>

      {/* Stats (for Admin/Midwife) */}
      {canManage && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Baby className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Children</p>
                <p className="text-2xl font-bold">{children.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Baby className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Boys</p>
                <p className="text-2xl font-bold">{maleChildren.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-pink-100 rounded-lg">
                <Baby className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Girls</p>
                <p className="text-2xl font-bold">{femaleChildren.length}</p>
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
                    placeholder="Search by child or mother name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <Select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                options={[
                  { value: 'MALE', label: 'Boys' },
                  { value: 'FEMALE', label: 'Girls' },
                ]}
                placeholder="All genders"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Children Grid */}
      {filteredChildren.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChildren.map((child) => (
            <Card key={child.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className={`h-2 ${child.gender === 'MALE' ? 'bg-blue-500' : 'bg-pink-500'}`} />
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-full ${
                        child.gender === 'MALE' ? 'bg-blue-100' : 'bg-pink-100'
                      }`}
                    >
                      <Baby
                        className={`h-6 w-6 ${
                          child.gender === 'MALE' ? 'text-blue-600' : 'text-pink-600'
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{child.name}</h3>
                      <p className="text-sm text-gray-500">{getAge(child.birthDate)} old</p>
                    </div>
                  </div>
                  <Badge variant={child.gender === 'MALE' ? 'info' : 'warning'}>
                    {child.gender === 'MALE' ? 'Boy' : 'Girl'}
                  </Badge>
                </div>

                {/* Mother Info (for Admin/Midwife) */}
                {canManage && child.mother && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg mb-4">
                    <User className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-800">
                      Mother: <strong>{child.mother.user.name}</strong>
                    </span>
                  </div>
                )}

                {/* Birth Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Birth Date
                    </span>
                    <span className="font-medium">{formatDate(child.birthDate)}</span>
                  </div>
                  {child.birthWeight && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Scale className="h-3 w-3" /> Birth Weight
                      </span>
                      <span className="font-medium">{child.birthWeight} kg</span>
                    </div>
                  )}
                  {child.birthHeight && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Ruler className="h-3 w-3" /> Birth Height
                      </span>
                      <span className="font-medium">{child.birthHeight} cm</span>
                    </div>
                  )}
                  {child.birthPlace && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Birth Place
                      </span>
                      <span className="font-medium">{child.birthPlace}</span>
                    </div>
                  )}
                </div>

                {/* Latest Growth Record */}
                {child.growthRecords && child.growthRecords.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Latest Growth Record</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-xs text-gray-500">Weight</p>
                        <p className="font-semibold">{child.growthRecords[0].weight || '-'} kg</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-xs text-gray-500">Height</p>
                        <p className="font-semibold">{child.growthRecords[0].height || '-'} cm</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-xs text-gray-500">Head</p>
                        <p className="font-semibold">{child.growthRecords[0].headCircumference || '-'} cm</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vaccination Status */}
                {child.vaccinations && child.vaccinations.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Syringe className="h-3 w-3" /> Vaccinations
                      </span>
                      <Badge
                        variant={
                          child.vaccinations.filter((v) => v.status === 'PENDING').length > 0
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {child.vaccinations.filter((v) => v.status === 'COMPLETED').length} /{' '}
                        {child.vaccinations.length}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button size="sm" variant="outline" onClick={() => openViewModal(child)}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {canManage && (
                    <Button size="sm" variant="outline" onClick={() => openEditModal(child)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
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
            <Baby className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No children registered</h3>
            <p className="text-gray-500 mb-4">
              {canManage ? 'Register a child to start tracking their health' : 'No children records available'}
            </p>
            {canManage && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Register Child
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Register Child Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Register New Child"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mother Selection */}
          {canManage && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 flex items-center gap-2 mb-3">
                <User className="h-5 w-5" />
                Select Mother
              </h3>
              <Select
                label="Registered Mother *"
                value={formData.motherId}
                onChange={(e) => setFormData({ ...formData, motherId: e.target.value })}
                options={mothers.map((m) => ({
                  value: m.id,
                  label: `${m.user.name} (${m.user.email})`,
                }))}
                placeholder="Select a mother..."
                required
              />
            </div>
          )}

          {/* Child Basic Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
              <Baby className="h-5 w-5" />
              Child Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Child's Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter child's name"
                  required
                />
                <Select
                  label="Gender *"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  options={[
                    { value: 'MALE', label: 'Male' },
                    { value: 'FEMALE', label: 'Female' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Birth Details */}
          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="font-semibold text-pink-900 flex items-center gap-2 mb-3">
              <Heart className="h-5 w-5" />
              Birth Details
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date of Birth *"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  required
                />
                <Input
                  label="Time of Birth"
                  type="time"
                  value={formData.birthTime}
                  onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Birth Weight (kg)"
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="6"
                  value={formData.birthWeight}
                  onChange={(e) => setFormData({ ...formData, birthWeight: e.target.value })}
                  placeholder="e.g., 3.25"
                />
                <Input
                  label="Birth Height (cm)"
                  type="number"
                  step="0.1"
                  min="30"
                  max="60"
                  value={formData.birthHeight}
                  onChange={(e) => setFormData({ ...formData, birthHeight: e.target.value })}
                  placeholder="e.g., 50.5"
                />
                <Input
                  label="Head Circumference (cm)"
                  type="number"
                  step="0.1"
                  min="25"
                  max="45"
                  value={formData.headCircumference}
                  onChange={(e) => setFormData({ ...formData, headCircumference: e.target.value })}
                  placeholder="e.g., 35"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Birth Place"
                  value={formData.birthPlace}
                  onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                  options={birthPlaceOptions.map((p) => ({ value: p, label: p }))}
                  placeholder="Select birth place"
                />
                <Select
                  label="Delivery Type"
                  value={formData.deliveryType}
                  onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                  options={[
                    { value: 'NORMAL', label: 'Normal Vaginal Delivery' },
                    { value: 'CESAREAN', label: 'Cesarean Section' },
                    { value: 'ASSISTED', label: 'Assisted Delivery' },
                    { value: 'VACUUM', label: 'Vacuum Extraction' },
                    { value: 'FORCEPS', label: 'Forceps Delivery' },
                  ]}
                />
              </div>

              <Input
                label="APGAR Score"
                value={formData.apgarScore}
                onChange={(e) => setFormData({ ...formData, apgarScore: e.target.value })}
                placeholder="e.g., 9/10"
              />
            </div>
          </div>

          {/* Health Notes */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5" />
              Health Information
            </h3>
            <div className="space-y-4">
              <Textarea
                label="Health Notes"
                value={formData.healthNotes}
                onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })}
                placeholder="Any special health conditions, allergies, or notes..."
                rows={2}
              />
              <Textarea
                label="Birth Complications (if any)"
                value={formData.birthComplications}
                onChange={(e) => setFormData({ ...formData, birthComplications: e.target.value })}
                placeholder="Describe any complications during birth..."
                rows={2}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading || (canManage && !formData.motherId)}>
              {actionLoading ? 'Registering...' : 'Register Child'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedChild(null);
        }}
        title="Child Details"
        size="md"
      >
        {selectedChild && (
          <div className="space-y-6">
            {/* Child Header */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  selectedChild.gender === 'MALE' ? 'bg-blue-100' : 'bg-pink-100'
                }`}
              >
                <Baby
                  className={`h-8 w-8 ${
                    selectedChild.gender === 'MALE' ? 'text-blue-600' : 'text-pink-600'
                  }`}
                />
              </div>
              <div>
                <h3 className="text-xl font-bold">{selectedChild.name}</h3>
                <p className="text-gray-500">
                  {selectedChild.gender === 'MALE' ? 'Boy' : 'Girl'} • {getAge(selectedChild.birthDate)} old
                </p>
              </div>
            </div>

            {/* Mother Info */}
            {selectedChild.mother && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Mother</h4>
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
                    <span className="text-purple-700 font-bold">
                      {selectedChild.mother.user.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{selectedChild.mother.user.name}</p>
                    <p className="text-sm text-gray-500">{selectedChild.mother.user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Birth Details */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Birth Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Date of Birth</p>
                  <p className="font-medium">{formatDate(selectedChild.birthDate)}</p>
                </div>
                {selectedChild.birthTime && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Time of Birth</p>
                    <p className="font-medium">{selectedChild.birthTime}</p>
                  </div>
                )}
                {selectedChild.birthWeight && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Birth Weight</p>
                    <p className="font-medium">{selectedChild.birthWeight} kg</p>
                  </div>
                )}
                {selectedChild.birthHeight && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Birth Height</p>
                    <p className="font-medium">{selectedChild.birthHeight} cm</p>
                  </div>
                )}
                {selectedChild.birthPlace && (
                  <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                    <p className="text-gray-500">Birth Place</p>
                    <p className="font-medium">{selectedChild.birthPlace}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Health Notes */}
            {selectedChild.healthNotes && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Health Notes</h4>
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  {selectedChild.healthNotes}
                </p>
              </div>
            )}

            {/* Latest Growth */}
            {selectedChild.growthRecords && selectedChild.growthRecords.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Latest Growth Record</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <Scale className="h-5 w-5 mx-auto text-green-600 mb-1" />
                    <p className="text-xs text-gray-500">Weight</p>
                    <p className="font-semibold">{selectedChild.growthRecords[0].weight || '-'} kg</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <Ruler className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-xs text-gray-500">Height</p>
                    <p className="font-semibold">{selectedChild.growthRecords[0].height || '-'} cm</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <Baby className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                    <p className="text-xs text-gray-500">Head</p>
                    <p className="font-semibold">
                      {selectedChild.growthRecords[0].headCircumference || '-'} cm
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Recorded on {formatDate(selectedChild.growthRecords[0].recordDate)}
                </p>
              </div>
            )}

            {/* Vaccination Summary */}
            {selectedChild.vaccinations && selectedChild.vaccinations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Vaccination Progress</h4>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm">Completed</span>
                  <Badge variant="success">
                    {selectedChild.vaccinations.filter((v) => v.status === 'COMPLETED').length} /{' '}
                    {selectedChild.vaccinations.length}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Child Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingChild(null);
        }}
        title="Edit Child Record"
        size="lg"
      >
        {editingChild && (
          <form onSubmit={handleEditSubmit} className="space-y-6">
            {/* Mother Info (read-only) */}
            {editingChild.mother && (
              <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
                  <span className="text-purple-700 font-bold text-lg">
                    {editingChild.mother.user.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{editingChild.mother.user.name}</h3>
                  <p className="text-sm text-gray-500">{editingChild.mother.user.email}</p>
                </div>
              </div>
            )}

            {/* Child Basic Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                <Baby className="h-5 w-5" />
                Child Information
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Child's Name *"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Enter child's name"
                    required
                  />
                  <Select
                    label="Gender *"
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    options={[
                      { value: 'MALE', label: 'Male' },
                      { value: 'FEMALE', label: 'Female' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Birth Details */}
            <div className="bg-pink-50 p-4 rounded-lg">
              <h3 className="font-semibold text-pink-900 flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5" />
                Birth Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Date of Birth *"
                    type="date"
                    value={editFormData.birthDate}
                    onChange={(e) => setEditFormData({ ...editFormData, birthDate: e.target.value })}
                    required
                  />
                  <Input
                    label="Time of Birth"
                    type="time"
                    value={editFormData.birthTime}
                    onChange={(e) => setEditFormData({ ...editFormData, birthTime: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Birth Weight (kg)"
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="6"
                    value={editFormData.birthWeight}
                    onChange={(e) => setEditFormData({ ...editFormData, birthWeight: e.target.value })}
                    placeholder="e.g., 3.25"
                  />
                  <Input
                    label="Birth Height (cm)"
                    type="number"
                    step="0.1"
                    min="30"
                    max="60"
                    value={editFormData.birthHeight}
                    onChange={(e) => setEditFormData({ ...editFormData, birthHeight: e.target.value })}
                    placeholder="e.g., 50.5"
                  />
                </div>

                <Select
                  label="Birth Place"
                  value={editFormData.birthPlace}
                  onChange={(e) => setEditFormData({ ...editFormData, birthPlace: e.target.value })}
                  options={birthPlaceOptions.map((p) => ({ value: p, label: p }))}
                  placeholder="Select birth place"
                />
              </div>
            </div>

            {/* Health Notes */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5" />
                Health Information
              </h3>
              <Textarea
                label="Health Notes"
                value={editFormData.healthNotes}
                onChange={(e) => setEditFormData({ ...editFormData, healthNotes: e.target.value })}
                placeholder="Any special health conditions, allergies, or notes..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingChild(null);
                }}
              >
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
