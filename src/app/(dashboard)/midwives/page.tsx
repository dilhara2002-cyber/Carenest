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
  Trash2,
  Eye,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Shield,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, cn } from '@/lib/utils';

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
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMidwife, setSelectedMidwife] = useState<Midwife | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Registration form data
  const [formData, setFormData] = useState({
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
      setHighRiskCount(data.highRiskCases || 0);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-[#2563EB]"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-[#2563EB]"></div>
      </div>
    );
  }

  const activeMidwives = midwives.filter(m => m.user.isActive);
  const inactiveMidwives = midwives.filter(m => !m.user.isActive);
  const totalAssignedMothers = midwives.reduce((sum, m) => sum + m._count.assignedMothers, 0);

  return (
    <div className="space-y-6 relative overflow-visible">
      {/* Background decoration orbs matching Landing Page */}
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[300px] rounded-full bg-[#FBCFE8]/25 blur-[100px] opacity-40 mix-blend-multiply pointer-events-none -z-10" />
      <div className="absolute top-[35%] right-[-5%] w-[35%] h-[300px] rounded-full bg-[#E0E7FF]/40 blur-[100px] opacity-50 mix-blend-multiply pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Midwife Management</h1>
          <p className="text-gray-500 font-light mt-1">Register and manage midwives in the system</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="font-semibold rounded-xl border-gray-200 hover:bg-gray-50 transition-colors" onClick={fetchMidwives}>
            <RefreshCw className="h-4 w-4 mr-2 text-gray-500" />
            Refresh
          </Button>
          <Button className="bg-[#2563EB] hover:bg-[#1E40AF] text-white font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all" onClick={() => setShowRegisterModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Register Midwife
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Midwives */}
        <Card className="relative card-lift cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-250/85 transition-all duration-300 shadow-sm hover:shadow-md group">
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Midwives</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1.5 animate-count-up">{midwives.length}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600 group-hover:scale-115 group-hover:rotate-3 transition-all duration-300">
              <UserPlus className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Active Midwives */}
        <Card className="relative card-lift cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-250/85 transition-all duration-300 shadow-sm hover:shadow-md group">
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-emerald-500 to-green-500" />
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1.5 animate-count-up">{activeMidwives.length}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-115 group-hover:rotate-3 transition-all duration-300">
              <CheckCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Inactive Midwives */}
        <Card className="relative card-lift cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-250/85 transition-all duration-300 shadow-sm hover:shadow-md group">
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-red-400 to-rose-500" />
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inactive</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1.5 animate-count-up">{inactiveMidwives.length}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-600 group-hover:scale-115 group-hover:rotate-3 transition-all duration-300">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* High Risk Cases */}
        <Card className="relative card-lift cursor-pointer overflow-hidden border border-red-100 bg-red-50/10 hover:border-red-200 transition-all duration-300 shadow-sm hover:shadow-md group">
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-red-500 to-rose-600" />
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">High Risk Cases</p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-3xl font-extrabold text-red-700 animate-count-up">{highRiskCount}</span>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total</span>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-600 group-hover:scale-115 group-hover:rotate-3 transition-all duration-300">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Assigned Mothers */}
        <Card className="relative card-lift cursor-pointer overflow-hidden border border-gray-100 hover:border-gray-250/85 transition-all duration-300 shadow-sm hover:shadow-md group">
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned Mothers</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1.5 animate-count-up">{totalAssignedMothers}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50 text-[#2563EB] group-hover:scale-115 group-hover:rotate-3 transition-all duration-300">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search midwives by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-base text-gray-900 placeholder:text-gray-400 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active Midwives Only' },
                { value: 'inactive', label: 'Inactive Midwives Only' },
              ]}
              placeholder="Filter by status"
              className="rounded-xl border-gray-200 focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Midwives List */}
      <Card className="border border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50/50 to-white/30 border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
            <UserPlus className="h-5 w-5 text-[#2563EB]" />
            Registered Midwives ({midwives.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {midwives.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/70">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700">Midwife</TableHead>
                    <TableHead className="font-bold text-gray-700">License #</TableHead>
                    <TableHead className="font-bold text-gray-700">Specialization</TableHead>
                    <TableHead className="font-bold text-gray-700">Work Area</TableHead>
                    <TableHead className="font-bold text-gray-700">Experience</TableHead>
                    <TableHead className="font-bold text-gray-700">Assigned Mothers</TableHead>
                    <TableHead className="font-bold text-gray-700">Status</TableHead>
                    <TableHead className="font-bold text-gray-700 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {midwives.map((midwife) => (
                    <TableRow key={midwife.id} className="hover:bg-gray-50/40 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                            <span>{midwife.user.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-950 text-sm leading-none">{midwife.user.name}</p>
                            <p className="text-xs text-gray-400 mt-1">{midwife.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-50 border border-gray-150 px-2.5 py-0.5 rounded-lg text-xs font-bold text-gray-600 tracking-wider">
                          {midwife.licenseNumber || 'N/A'}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-700">{midwife.specialization || 'N/A'}</TableCell>
                      <TableCell className="text-sm text-gray-600">{midwife.workArea || 'N/A'}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {midwife.experience ? `${midwife.experience} years` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="info" className="font-bold text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full py-0.5 px-2.5 shadow-sm">
                          {midwife._count.assignedMothers}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {midwife.user.isActive ? (
                          <Badge variant="success" className="font-bold text-[10px] uppercase rounded-full tracking-wider py-0.5 px-2.5 shadow-sm">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="font-bold text-[10px] uppercase rounded-full tracking-wider py-0.5 px-2.5 shadow-sm">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg h-9 w-9 p-0 hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-200 transition-all border-gray-200"
                            onClick={() => openViewModal(midwife)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={midwife.user.isActive ? 'outline' : 'default'}
                            className={cn(
                              "rounded-lg h-9 w-9 p-0 transition-all",
                              midwife.user.isActive 
                                ? "hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-gray-200"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
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
                            className="rounded-lg h-9 w-9 p-0 hover:bg-red-600 hover:text-white transition-all"
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
            <div className="text-center py-16">
              <UserPlus className="h-14 w-14 mx-auto mb-4 text-gray-300 animate-float" />
              <p className="font-bold text-gray-700 text-base">No midwives registered</p>
              <p className="text-sm text-gray-400 font-light mt-1">Click "Register Midwife" to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* High-Risk Alerts */}
      <Card className="border-red-100 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-800">
              <AlertCircle className="h-6 w-6 text-red-600 fill-red-600 text-white" />
              <span className="font-bold text-lg">High-Risk Alerts</span>
            </span>
            <Link href="/pregnancies" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
              View All
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Elena Adams Alert */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-red-50/30 border border-red-100/80 rounded-2xl gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-red-200">
                <img
                  src="/avatars/elena.png"
                  alt="Elena Adams"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Elena Adams</span>
                  <span className="text-xs text-slate-400 font-medium">32 weeks</span>
                </div>
                <p className="text-sm font-bold text-red-600 mt-1">Elevated Blood Pressure (145/92)</p>
                <p className="text-xs text-slate-500 mt-0.5">Recorded 2 hours ago via home monitor</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end md:self-center">
              <button 
                onClick={() => window.open('tel:+94771234567')}
                className="px-5 py-2 border border-slate-200 rounded-full text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Call
              </button>
              <Link
                href="/pregnancies"
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-semibold shadow-sm transition-colors"
              >
                Review Record
              </Link>
            </div>
          </div>

          {/* Maria Wong Alert */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-amber-50/30 border border-amber-100/80 rounded-2xl gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-amber-200">
                <img
                  src="/avatars/maria.png"
                  alt="Maria Wong"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Maria Wong</span>
                  <span className="text-xs text-slate-400 font-medium">28 weeks</span>
                </div>
                <p className="text-sm font-bold text-amber-600 mt-1">Missed Gestational Diabetes Screening</p>
                <p className="text-xs text-slate-500 mt-0.5">Overdue by 3 days</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end md:self-center">
              <Link 
                href="/chat"
                className="px-5 py-2 border border-slate-200 rounded-full text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Message
              </Link>
              <Link
                href="/visits"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-semibold shadow-sm transition-colors"
              >
                Reschedule
              </Link>
            </div>
          </div>
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
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-md mx-auto relative px-4">
              {/* Connector line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-[#2563EB] -translate-y-1/2 z-0 transition-all duration-300"
                style={{ width: `${((formStep - 1) / 2) * 100}%` }}
              />

              {[1, 2, 3].map((step) => (
                <div key={step} className="flex flex-col items-center relative z-10">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                      formStep >= step
                        ? 'bg-[#2563EB] text-white ring-4 ring-blue-100 shadow-md'
                        : 'bg-white border-2 border-gray-300 text-gray-500'
                    )}
                  >
                    {step}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs max-w-md mx-auto px-1 font-semibold text-gray-500">
              <span className={formStep >= 1 ? 'text-[#2563EB]' : ''}>Personal Info</span>
              <span className={formStep >= 2 ? 'text-[#2563EB]' : ''}>Professional Details</span>
              <span className={formStep >= 3 ? 'text-[#2563EB]' : ''}>Account Setup</span>
            </div>
          </div>

          {/* Step 1: Personal Information */}
          {formStep === 1 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/20 border border-blue-100/50 p-4 rounded-2xl mb-2">
                <h3 className="font-bold text-[#1E40AF] flex items-center gap-2 text-sm uppercase tracking-wide">
                  <Users className="h-4 w-4" />
                  Personal Information
                </h3>
                <p className="text-xs text-blue-700/80 font-light mt-0.5">
                  Enter the midwife's personal details and primary contacts.
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
                  placeholder="First name"
                  className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
                />
                <Input
                  label="Last Name *"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  error={formErrors.lastName}
                  placeholder="Last name"
                  className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
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
                className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
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
                className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
              />

              <Textarea
                label="Address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Enter full physical address"
                rows={2}
                className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
              />

              <Select
                label="Preferred Language"
                value={formData.language}
                onChange={(e) =>
                  setFormData({ ...formData, language: e.target.value })
                }
                options={languageOptions}
                className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
              />
            </div>
          )}

          {/* Step 2: Professional Information */}
          {formStep === 2 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/20 border border-indigo-100/50 p-4 rounded-2xl mb-2">
                <h3 className="font-bold text-indigo-950 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <Briefcase className="h-4 w-4" />
                  Professional Information
                </h3>
                <p className="text-xs text-indigo-700/80 font-light mt-0.5">
                  Enter midwife certifications, work areas, and license details.
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
                className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
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
                className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
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
                className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
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
                className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
              />

              <Textarea
                label="Qualifications & Certifications"
                value={formData.qualifications}
                onChange={(e) =>
                  setFormData({ ...formData, qualifications: e.target.value })
                }
                placeholder="List qualifications, training, degree details..."
                rows={3}
                className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
              />
            </div>
          )}

          {/* Step 3: Account Settings */}
          {formStep === 3 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-50/60 to-green-50/20 border border-emerald-100/50 p-4 rounded-2xl mb-2">
                <h3 className="font-bold text-emerald-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <Shield className="h-4 w-4" />
                  Account Settings
                </h3>
                <p className="text-xs text-emerald-700/80 font-light mt-0.5">
                  Establish system login passwords and notifications.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-150 p-4 rounded-2xl">
                <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-2.5">Account Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500 font-medium">Name:</span>
                  <span className="font-bold text-gray-900">
                    {formData.firstName} {formData.lastName}
                  </span>
                  <span className="text-gray-500 font-medium">Email:</span>
                  <span className="font-bold text-gray-900 truncate">{formData.email}</span>
                  <span className="text-gray-500 font-medium">License:</span>
                  <span className="font-bold text-gray-900">{formData.licenseNumber}</span>
                  <span className="text-gray-500 font-medium">Specialization:</span>
                  <span className="font-bold text-gray-900">{formData.specialization}</span>
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
                className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
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
                className="rounded-xl border-gray-250 focus:ring-[#2563EB]"
              />

              <div className="flex items-center gap-2.5 py-1">
                <input
                  type="checkbox"
                  id="sendWelcomeEmail"
                  checked={formData.sendWelcomeEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, sendWelcomeEmail: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <label htmlFor="sendWelcomeEmail" className="text-sm text-gray-600 font-medium cursor-pointer">
                  Send welcome email with login credentials
                </label>
              </div>

              <div className="bg-yellow-50 border border-yellow-200/60 rounded-xl p-3.5 text-xs text-yellow-800 leading-relaxed font-medium">
                <strong>Important Note:</strong> The midwife will log in using this email address and password. Please share these login details securely.
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
            <div>
              {formStep > 1 && (
                <Button type="button" variant="outline" className="rounded-xl px-5" onClick={handlePrevStep}>
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl px-5"
                onClick={() => {
                  setShowRegisterModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              {formStep < 3 ? (
                <Button type="button" className="bg-[#2563EB] hover:bg-[#1E40AF] text-white font-bold rounded-xl px-5 transition-all" onClick={handleNextStep}>
                  Next Step
                </Button>
              ) : (
                <Button type="submit" className="bg-[#2563EB] hover:bg-[#1E40AF] text-white font-bold rounded-xl px-6 transition-all" disabled={actionLoading}>
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
            <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-[#2563EB]/10 via-indigo-50/5 to-[#F472B6]/5 rounded-2xl border border-gray-100/60 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2563EB] to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0">
                <span>{selectedMidwife.user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
                  {selectedMidwife.user.name}
                </h3>
                <p className="text-gray-500 font-medium text-sm mt-0.5">{selectedMidwife.specialization || 'Midwife'}</p>
                <div className="mt-2">
                  {selectedMidwife.user.isActive ? (
                    <Badge variant="success" className="font-bold text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm">Active</Badge>
                  ) : (
                    <Badge variant="danger" className="font-bold text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm">Inactive</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-2">Contact Information</h4>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                  <Mail className="h-4.5 w-4.5 text-gray-400" />
                  <span>{selectedMidwife.user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                  <Phone className="h-4.5 w-4.5 text-gray-400" />
                  <span>{selectedMidwife.user.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                  <MapPin className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                  <span className="leading-tight">{selectedMidwife.user.address || 'Not provided'}</span>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-1">Professional Details</h4>
              <div className="grid grid-cols-2 gap-3.5 text-sm">
                <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">License Number</p>
                  <p className="font-bold text-gray-900 mt-1">{selectedMidwife.licenseNumber || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Experience</p>
                  <p className="font-bold text-gray-900 mt-1">
                    {selectedMidwife.experience ? `${selectedMidwife.experience} years` : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Work Area</p>
                  <p className="font-bold text-gray-900 mt-1">{selectedMidwife.workArea || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Assigned Mothers</p>
                  <p className="font-bold text-gray-900 mt-1">{selectedMidwife._count.assignedMothers}</p>
                </div>
              </div>
            </div>

            {/* Registration Info */}
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider pt-2 text-center">
              Registered on: {formatDate(selectedMidwife.createdAt)}
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
          <div className="flex items-center gap-3.5 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <Trash2 className="h-8 w-8 text-red-600 shrink-0" />
            <div>
              <p className="font-bold text-red-950 text-sm">
                Are you sure you want to delete this midwife?
              </p>
              <p className="text-xs text-red-700/90 font-light mt-0.5">This action is permanent and cannot be undone.</p>
            </div>
          </div>

          {selectedMidwife && (
            <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-1">
              <p className="font-bold text-gray-900 text-sm">{selectedMidwife.user.name}</p>
              <p className="text-xs text-gray-500 font-medium">{selectedMidwife.user.email}</p>
              {selectedMidwife._count.assignedMothers > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl mt-3">
                  <span>⚠️ This midwife has {selectedMidwife._count.assignedMothers} assigned mother(s)</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              className="rounded-xl px-4"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedMidwife(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" className="rounded-xl px-5" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete Midwife'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href,
  bgAccent,
  borderAccent,
  delay,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  href: string;
  bgAccent: string;
  borderAccent: string;
  delay: string;
}) {
  return (
    <Link href={href}>
      <Card className={`relative card-lift cursor-pointer animate-fade-in-up ${delay} overflow-hidden group border border-gray-100 hover:border-gray-250/80 transition-all duration-300 shadow-sm hover:shadow-md`}>
        {/* Top accent line */}
        <div className={`h-1 w-full absolute top-0 left-0 bg-gradient-to-r ${borderAccent}`} />
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1.5 animate-count-up">{value}</p>
          </div>
          <div className={`p-3.5 rounded-2xl ${bgAccent} shadow-sm group-hover:scale-115 group-hover:rotate-3 transition-all duration-300`}>
            {icon}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
