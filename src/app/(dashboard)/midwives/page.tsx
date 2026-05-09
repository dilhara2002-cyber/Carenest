'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Textarea,
} from '@/components/ui';
import {
  UserPlus,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  MapPin,
  Award,
  Briefcase,
  Shield,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Midwife {
  id: string;
  userId: string;
  licenseNumber: string | null;
  specialization: string | null;
  experience: number | null;
  workArea: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    profileImage: string | null;
    isActive: boolean;
    language: string;
  };
  _count: {
    assignedMothers: number;
  };
}

const specializationOptions = [
  'General Midwifery',
  'Prenatal Care',
  'Postnatal Care',
  'High-Risk Pregnancy',
  'Home Birth',
  'Water Birth',
  'Lactation Consultant',
  'Neonatal Care',
  'Family Planning',
  'Maternal Mental Health',
  'Community Midwifery',
];

const workAreaOptions = [
  'Colombo District',
  'Gampaha District',
  'Kalutara District',
  'Kandy District',
  'Matale District',
  'Nuwara Eliya District',
  'Galle District',
  'Matara District',
  'Hambantota District',
  'Jaffna District',
  'Kilinochchi District',
  'Mannar District',
  'Vavuniya District',
  'Mullaitivu District',
  'Batticaloa District',
  'Ampara District',
  'Trincomalee District',
  'Kurunegala District',
  'Puttalam District',
  'Anuradhapura District',
  'Polonnaruwa District',
  'Badulla District',
  'Monaragala District',
  'Ratnapura District',
  'Kegalle District',
];

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'si', label: 'Sinhala (සිංහල)' },
  { value: 'ta', label: 'Tamil (தமிழ்)' },
];

export default function MidwivesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [midwives, setMidwives] = useState<Midwife[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMidwife, setSelectedMidwife] = useState<Midwife | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Registration form data
  const [formData, setFormData] = useState({
    // Personal Information (Step 1)
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    language: 'en',
    // Professional Information (Step 2)
    licenseNumber: '',
    specialization: '',
    experience: '',
    workArea: '',
    qualifications: '',
    // Account Settings (Step 3)
    password: '',
    confirmPassword: '',
    sendWelcomeEmail: true,
  });

  const isAdmin = session?.user?.role === 'ADMIN';

  // Redirect non-admin users
  useEffect(() => {
    if (session && !isAdmin) {
      router.push('/');
    }
  }, [session, isAdmin, router]);

  const fetchMidwives = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const res = await fetch(`/api/midwives?${params.toString()}`);
      const data = await res.json();
      setMidwives(data.data || []);
    } catch (error) {
      console.error('Failed to fetch midwives:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      fetchMidwives();
    }
  }, [fetchMidwives, isAdmin]);

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.firstName.trim()) errors.firstName = 'First name is required';
      if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
      if (!formData.email.trim()) errors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Invalid email format';
      }
      if (!formData.phone.trim()) errors.phone = 'Phone number is required';
      else if (!/^[0-9+\-\s()]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
        errors.phone = 'Invalid phone number';
      }
    }

    if (step === 2) {
      if (!formData.licenseNumber.trim()) errors.licenseNumber = 'License number is required';
      if (!formData.specialization) errors.specialization = 'Specialization is required';
      if (!formData.experience) errors.experience = 'Years of experience is required';
      else if (parseInt(formData.experience) < 0 || parseInt(formData.experience) > 50) {
        errors.experience = 'Experience must be between 0 and 50 years';
      }
      if (!formData.workArea) errors.workArea = 'Work area is required';
    }

    if (step === 3) {
      if (!formData.password) errors.password = 'Password is required';
      else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password = 'Password must contain uppercase, lowercase, and number';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(formStep)) {
      setFormStep(formStep + 1);
    }
  };

  const handlePrevStep = () => {
    setFormStep(formStep - 1);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      language: 'en',
      licenseNumber: '',
      specialization: '',
      experience: '',
      workArea: '',
      qualifications: '',
      password: '',
      confirmPassword: '',
      sendWelcomeEmail: true,
    });
    setFormStep(1);
    setFormErrors({});
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/midwives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          language: formData.language,
          licenseNumber: formData.licenseNumber,
          specialization: formData.specialization,
          experience: parseInt(formData.experience),
          workArea: formData.workArea,
          qualifications: formData.qualifications,
          password: formData.password,
          sendWelcomeEmail: formData.sendWelcomeEmail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowRegisterModal(false);
        resetForm();
        fetchMidwives();
        alert('Midwife registered successfully!');
      } else {
        alert(data.error || 'Failed to register midwife');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to register midwife');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (midwife: Midwife) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/midwives/${midwife.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !midwife.user.isActive }),
      });

      if (res.ok) {
        fetchMidwives();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Toggle active error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMidwife) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/midwives/${selectedMidwife.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShowDeleteModal(false);
        setSelectedMidwife(null);
        fetchMidwives();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete midwife');
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const openViewModal = (midwife: Midwife) => {
    setSelectedMidwife(midwife);
    setShowViewModal(true);
  };

  const openDeleteModal = (midwife: Midwife) => {
    setSelectedMidwife(midwife);
    setShowDeleteModal(true);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const activeMidwives = midwives.filter(m => m.user.isActive);
  const inactiveMidwives = midwives.filter(m => !m.user.isActive);
  const totalAssignedMothers = midwives.reduce((sum, m) => sum + m._count.assignedMothers, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Midwife Management</h1>
          <p className="text-gray-500">Register and manage midwives in the system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMidwives}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowRegisterModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Register Midwife
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-purple-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Midwives</p>
              <p className="text-2xl font-bold">{midwives.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold">{activeMidwives.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inactive</p>
              <p className="text-2xl font-bold">{inactiveMidwives.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Assigned Mothers</p>
              <p className="text-2xl font-bold">{totalAssignedMothers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'active', label: 'Active Midwives' },
                { value: 'inactive', label: 'Inactive Midwives' },
              ]}
              placeholder="Filter by status"
            />
          </div>
        </CardContent>
      </Card>

      {/* Midwives List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-purple-500" />
            Registered Midwives ({midwives.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {midwives.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Midwife</TableHead>
                    <TableHead>License #</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Work Area</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Assigned Mothers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {midwives.map((midwife) => (
                    <TableRow key={midwife.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-700 font-semibold">
                              {midwife.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{midwife.user.name}</p>
                            <p className="text-xs text-gray-500">{midwife.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {midwife.licenseNumber || 'N/A'}
                        </code>
                      </TableCell>
                      <TableCell>{midwife.specialization || 'N/A'}</TableCell>
                      <TableCell>{midwife.workArea || 'N/A'}</TableCell>
                      <TableCell>
                        {midwife.experience ? `${midwife.experience} years` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{midwife._count.assignedMothers}</Badge>
                      </TableCell>
                      <TableCell>
                        {midwife.user.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openViewModal(midwife)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={midwife.user.isActive ? 'outline' : 'default'}
                            onClick={() => handleToggleActive(midwife)}
                            disabled={actionLoading}
                          >
                            {midwife.user.isActive ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openDeleteModal(midwife)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">No midwives registered</p>
              <p className="text-sm text-gray-400">Click "Register Midwife" to add one</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register Midwife Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false);
          resetForm();
        }}
        title="Register New Midwife"
        size="lg"
      >
        <form onSubmit={handleRegister}>
          {/* Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      formStep >= step
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`w-24 h-1 mx-2 ${
                        formStep > step ? 'bg-teal-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className={formStep >= 1 ? 'text-teal-600 font-medium' : 'text-gray-500'}>
                Personal Info
              </span>
              <span className={formStep >= 2 ? 'text-teal-600 font-medium' : 'text-gray-500'}>
                Professional
              </span>
              <span className={formStep >= 3 ? 'text-teal-600 font-medium' : 'text-gray-500'}>
                Account
              </span>
            </div>
          </div>

          {/* Step 1: Personal Information */}
          {formStep === 1 && (
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Personal Information
                </h3>
                <p className="text-sm text-purple-700 mt-1">
                  Enter the midwife's personal details
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  error={formErrors.firstName}
                  placeholder="Enter first name"
                />
                <Input
                  label="Last Name *"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  error={formErrors.lastName}
                  placeholder="Enter last name"
                />
              </div>

              <Input
                label="Email Address *"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                error={formErrors.email}
                placeholder="midwife@example.com"
              />

              <Input
                label="Phone Number *"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                error={formErrors.phone}
                placeholder="+94 77 123 4567"
              />

              <Textarea
                label="Address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Enter full address"
                rows={2}
              />

              <Select
                label="Preferred Language"
                value={formData.language}
                onChange={(e) =>
                  setFormData({ ...formData, language: e.target.value })
                }
                options={languageOptions}
              />
            </div>
          )}

          {/* Step 2: Professional Information */}
          {formStep === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Professional Information
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Enter qualifications and work details
                </p>
              </div>

              <Input
                label="License Number *"
                value={formData.licenseNumber}
                onChange={(e) =>
                  setFormData({ ...formData, licenseNumber: e.target.value })
                }
                error={formErrors.licenseNumber}
                placeholder="e.g., MW-2024-001"
              />

              <Select
                label="Specialization *"
                value={formData.specialization}
                onChange={(e) =>
                  setFormData({ ...formData, specialization: e.target.value })
                }
                options={specializationOptions.map((s) => ({ value: s, label: s }))}
                placeholder="Select specialization"
                error={formErrors.specialization}
              />

              <Input
                label="Years of Experience *"
                type="number"
                min="0"
                max="50"
                value={formData.experience}
                onChange={(e) =>
                  setFormData({ ...formData, experience: e.target.value })
                }
                error={formErrors.experience}
                placeholder="e.g., 5"
              />

              <Select
                label="Work Area / District *"
                value={formData.workArea}
                onChange={(e) =>
                  setFormData({ ...formData, workArea: e.target.value })
                }
                options={workAreaOptions.map((a) => ({ value: a, label: a }))}
                placeholder="Select work area"
                error={formErrors.workArea}
              />

              <Textarea
                label="Qualifications & Certifications"
                value={formData.qualifications}
                onChange={(e) =>
                  setFormData({ ...formData, qualifications: e.target.value })
                }
                placeholder="List relevant qualifications, certifications, and training..."
                rows={3}
              />
            </div>
          )}

          {/* Step 3: Account Settings */}
          {formStep === 3 && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-green-900 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Settings
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Set up login credentials for the midwife
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Account Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-medium">
                    {formData.firstName} {formData.lastName}
                  </span>
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium">{formData.email}</span>
                  <span className="text-gray-500">License:</span>
                  <span className="font-medium">{formData.licenseNumber}</span>
                  <span className="text-gray-500">Specialization:</span>
                  <span className="font-medium">{formData.specialization}</span>
                </div>
              </div>

              <Input
                label="Password *"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                error={formErrors.password}
                placeholder="Minimum 8 characters"
              />

              <Input
                label="Confirm Password *"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                error={formErrors.confirmPassword}
                placeholder="Re-enter password"
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendWelcomeEmail"
                  checked={formData.sendWelcomeEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, sendWelcomeEmail: e.target.checked })
                  }
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="sendWelcomeEmail" className="text-sm text-gray-700">
                  Send welcome email with login credentials
                </label>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <strong>Note:</strong> The midwife will use their email and password to log in
                to the CareNest system. Make sure to securely share the credentials.
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <div>
              {formStep > 1 && (
                <Button type="button" variant="outline" onClick={handlePrevStep}>
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRegisterModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              {formStep < 3 ? (
                <Button type="button" onClick={handleNextStep}>
                  Next Step
                </Button>
              ) : (
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Registering...' : 'Register Midwife'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* View Midwife Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedMidwife(null);
        }}
        title="Midwife Details"
        size="md"
      >
        {selectedMidwife && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-purple-200 flex items-center justify-center">
                <span className="text-purple-700 text-2xl font-bold">
                  {selectedMidwife.user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedMidwife.user.name}
                </h3>
                <p className="text-gray-500">{selectedMidwife.specialization || 'Midwife'}</p>
                {selectedMidwife.user.isActive ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="danger">Inactive</Badge>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Contact Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{selectedMidwife.user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{selectedMidwife.user.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{selectedMidwife.user.address || 'Not provided'}</span>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Professional Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">License Number</p>
                  <p className="font-medium">{selectedMidwife.licenseNumber || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Experience</p>
                  <p className="font-medium">
                    {selectedMidwife.experience ? `${selectedMidwife.experience} years` : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Work Area</p>
                  <p className="font-medium">{selectedMidwife.workArea || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500">Assigned Mothers</p>
                  <p className="font-medium">{selectedMidwife._count.assignedMothers}</p>
                </div>
              </div>
            </div>

            {/* Registration Info */}
            <div className="text-sm text-gray-500 pt-4 border-t">
              <p>Registered on: {formatDate(selectedMidwife.createdAt)}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedMidwife(null);
        }}
        title="Delete Midwife"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <Trash2 className="h-8 w-8 text-red-600" />
            <div>
              <p className="font-medium text-red-900">
                Are you sure you want to delete this midwife?
              </p>
              <p className="text-sm text-red-700">This action cannot be undone.</p>
            </div>
          </div>

          {selectedMidwife && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedMidwife.user.name}</p>
              <p className="text-sm text-gray-500">{selectedMidwife.user.email}</p>
              {selectedMidwife._count.assignedMothers > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  ⚠️ This midwife has {selectedMidwife._count.assignedMothers} assigned mother(s)
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedMidwife(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete Midwife'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
