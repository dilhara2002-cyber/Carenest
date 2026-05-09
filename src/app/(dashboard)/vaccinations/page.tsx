'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Modal, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Textarea } from '@/components/ui';
import { Syringe, Plus, CheckCircle, Clock, AlertCircle, Search, Filter, X, RefreshCw, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Vaccination {
  id: string;
  vaccineName: string;
  scheduledDate: string;
  administeredDate: string | null;
  status: 'PENDING' | 'COMPLETED' | 'MISSED';
  notes: string | null;
  batchNumber: string | null;
  administeredBy: string | null;
  motherId: string | null;
  childId: string | null;
  mother?: {
    id: string;
    user: { name: string };
    assignedMidwife?: { id: string; user: { id: string; name: string } };
  };
  child?: {
    id: string;
    name: string;
    mother?: {
      id: string;
      user: { name: string };
      assignedMidwife?: { id: string; user: { id: string; name: string } };
    };
  };
}

interface Mother {
  id: string;
  user: { id: string; name: string };
  children?: { id: string; name: string }[];
}

interface Midwife {
  id: string;
  user: { id: string; name: string };
}

const vaccineOptions = [
  'BCG',
  'Hepatitis B - Birth Dose',
  'OPV 0',
  'OPV 1',
  'OPV 2',
  'OPV 3',
  'OPV 4',
  'Pentavalent 1',
  'Pentavalent 2',
  'Pentavalent 3',
  'PCV 1',
  'PCV 2',
  'PCV 3',
  'Rotavirus 1',
  'Rotavirus 2',
  'MMR 1',
  'MMR 2',
  'JE Vaccine',
  'DPT Booster',
  'Tetanus Toxoid (TT)',
  'Other',
];

export default function VaccinationsPage() {
  const { data: session } = useSession();
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [midwives, setMidwives] = useState<Midwife[]>([]);
  const [children, setChildren] = useState<{ id: string; name: string; motherId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedVaccination, setSelectedVaccination] = useState<Vaccination | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    motherId: '',
    childId: '',
    midwifeId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Form data for adding vaccination
  const [formData, setFormData] = useState({
    motherId: '',
    childId: '',
    vaccineName: '',
    scheduledDate: '',
    notes: '',
  });

  // Form data for status update
  const [statusData, setStatusData] = useState({
    status: '',
    administeredDate: '',
    batchNumber: '',
    notes: '',
  });

  const isAdmin = session?.user?.role === 'ADMIN';
  const isMidwife = session?.user?.role === 'MIDWIFE';
  const isMother = session?.user?.role === 'MOTHER';

  // Fetch vaccinations with filters
  const fetchVaccinations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.motherId) params.append('motherId', filters.motherId);
      if (filters.childId) params.append('childId', filters.childId);
      if (filters.midwifeId) params.append('midwifeId', filters.midwifeId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.search) params.append('search', filters.search);

      const res = await fetch(`/api/vaccinations?${params.toString()}`);
      const data = await res.json();
      setVaccinations(data.data || []);
    } catch (error) {
      console.error('Failed to fetch vaccinations:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch mothers (for midwife: only assigned mothers)
  const fetchMothers = async () => {
    try {
      const res = await fetch('/api/mothers');
      const data = await res.json();
      setMothers(data.data || []);
      
      // Extract all children
      const allChildren: { id: string; name: string; motherId: string }[] = [];
      data.data?.forEach((mother: Mother) => {
        mother.children?.forEach((child) => {
          allChildren.push({
            id: child.id,
            name: child.name,
            motherId: mother.id,
          });
        });
      });
      setChildren(allChildren);
    } catch (error) {
      console.error('Failed to fetch mothers:', error);
    }
  };

  // Fetch midwives (for admin filter)
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
    fetchVaccinations();
    if (!isMother) {
      fetchMothers();
    }
    if (isAdmin) {
      fetchMidwives();
    }
  }, [fetchVaccinations, isMother, isAdmin]);

  // Filter children based on selected mother
  const filteredChildren = formData.motherId 
    ? children.filter(c => c.motherId === formData.motherId)
    : children;

  const handleAddVaccination = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    
    try {
      const res = await fetch('/api/vaccinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motherId: formData.childId ? null : formData.motherId || null,
          childId: formData.childId || null,
          vaccineName: formData.vaccineName,
          scheduledDate: formData.scheduledDate,
          notes: formData.notes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setFormData({
          motherId: '',
          childId: '',
          vaccineName: '',
          scheduledDate: '',
          notes: '',
        });
        fetchVaccinations();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add vaccination');
      }
    } catch (error) {
      console.error('Failed to add vaccination:', error);
      alert('Failed to add vaccination');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVaccination) return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/vaccinations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedVaccination.id,
          status: statusData.status,
          administeredDate: statusData.status === 'COMPLETED' ? statusData.administeredDate || new Date().toISOString() : null,
          batchNumber: statusData.batchNumber || null,
          administeredBy: session?.user?.name,
          notes: statusData.notes || selectedVaccination.notes,
        }),
      });

      if (res.ok) {
        setShowStatusModal(false);
        setSelectedVaccination(null);
        setStatusData({ status: '', administeredDate: '', batchNumber: '', notes: '' });
        fetchVaccinations();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update vaccination');
      }
    } catch (error) {
      console.error('Failed to update vaccination:', error);
      alert('Failed to update vaccination');
    } finally {
      setActionLoading(false);
    }
  };

  const openStatusModal = (vaccination: Vaccination) => {
    setSelectedVaccination(vaccination);
    setStatusData({
      status: vaccination.status,
      administeredDate: vaccination.administeredDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      batchNumber: vaccination.batchNumber || '',
      notes: vaccination.notes || '',
    });
    setShowStatusModal(true);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      motherId: '',
      childId: '',
      midwifeId: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const getStatusBadge = (status: string, scheduledDate: string) => {
    const isOverdue = new Date(scheduledDate) < new Date() && status === 'PENDING';
    
    if (isOverdue) {
      return <Badge variant="danger"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
    }
    
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'COMPLETED':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'MISSED':
        return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" />Missed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getAssignedMidwifeName = (vaccination: Vaccination) => {
    const midwife = vaccination.mother?.assignedMidwife || vaccination.child?.mother?.assignedMidwife;
    return midwife?.user?.name || 'Not assigned';
  };

  const getRecipientName = (vaccination: Vaccination) => {
    if (vaccination.child) {
      return (
        <div>
          <span className="font-medium">{vaccination.child.name}</span>
          <span className="text-xs text-gray-500 block">
            Child of {vaccination.child.mother?.user?.name || 'Unknown'}
          </span>
        </div>
      );
    }
    if (vaccination.mother) {
      return (
        <div>
          <span className="font-medium">{vaccination.mother.user?.name}</span>
          <span className="text-xs text-gray-500 block">Mother</span>
        </div>
      );
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const pendingVaccinations = vaccinations.filter(v => v.status === 'PENDING');
  const completedVaccinations = vaccinations.filter(v => v.status === 'COMPLETED');
  const overdueVaccinations = pendingVaccinations.filter(v => new Date(v.scheduledDate) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vaccination Tracking</h1>
          <p className="text-gray-500">
            {isAdmin ? 'View and manage all vaccinations' : 
             isMidwife ? 'Manage vaccinations for your assigned mothers' :
             'View your vaccination schedule'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchVaccinations()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {!isMother && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vaccination
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold">{pendingVaccinations.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold">{overdueVaccinations.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold">{completedVaccinations.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by vaccine name..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <Button 
              variant={showFilters ? 'default' : 'outline'} 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 bg-white text-teal-600 rounded-full px-2 py-0.5 text-xs">
                  Active
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
          
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Select
                label="Status"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'MISSED', label: 'Missed' },
                ]}
                placeholder="All statuses"
              />
              {isAdmin && (
                <Select
                  label="Assigned Midwife"
                  value={filters.midwifeId}
                  onChange={(e) => setFilters({ ...filters, midwifeId: e.target.value })}
                  options={midwives.map(m => ({ value: m.id, label: m.user.name }))}
                  placeholder="All midwives"
                />
              )}
              {!isMother && (
                <Select
                  label="Mother"
                  value={filters.motherId}
                  onChange={(e) => setFilters({ ...filters, motherId: e.target.value, childId: '' })}
                  options={mothers.map(m => ({ value: m.id, label: m.user.name }))}
                  placeholder="All mothers"
                />
              )}
              <Input
                label="From Date"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
              <Input
                label="To Date"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overdue Alert */}
      {overdueVaccinations.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 font-medium">
                {overdueVaccinations.length} vaccination(s) are overdue and need attention!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vaccination List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5 text-teal-500" />
            Vaccination Records ({vaccinations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vaccinations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vaccine</TableHead>
                    <TableHead>Recipient</TableHead>
                    {isAdmin && <TableHead>Assigned Midwife</TableHead>}
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Administered Date</TableHead>
                    <TableHead>Administered By</TableHead>
                    <TableHead>Status</TableHead>
                    {!isMother && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vaccinations.map((vaccination) => (
                    <TableRow key={vaccination.id}>
                      <TableCell>
                        <span className="font-medium">{vaccination.vaccineName}</span>
                        {vaccination.batchNumber && (
                          <span className="text-xs text-gray-500 block">
                            Batch: {vaccination.batchNumber}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getRecipientName(vaccination)}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <span className="text-sm">{getAssignedMidwifeName(vaccination)}</span>
                        </TableCell>
                      )}
                      <TableCell>{formatDate(vaccination.scheduledDate)}</TableCell>
                      <TableCell>
                        {vaccination.administeredDate ? formatDate(vaccination.administeredDate) : '-'}
                      </TableCell>
                      <TableCell>
                        {vaccination.administeredBy || '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(vaccination.status, vaccination.scheduledDate)}
                      </TableCell>
                      {!isMother && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStatusModal(vaccination)}
                          >
                            Update Status
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Syringe className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No vaccinations found</p>
              <p className="text-sm">
                {hasActiveFilters 
                  ? 'Try adjusting your filters'
                  : isMother 
                    ? 'No vaccinations scheduled yet'
                    : 'Add a vaccination to get started'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Vaccination Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Vaccination" size="md">
        <form onSubmit={handleAddVaccination} className="space-y-4">
          <Select
            label="Mother"
            value={formData.motherId}
            onChange={(e) => setFormData({ ...formData, motherId: e.target.value, childId: '' })}
            options={mothers.map(m => ({ value: m.id, label: m.user.name }))}
            placeholder="Select mother"
            required
          />
          
          {formData.motherId && filteredChildren.length > 0 && (
            <Select
              label="Child (Optional - leave empty if for mother)"
              value={formData.childId}
              onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
              options={filteredChildren.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select child (optional)"
            />
          )}
          
          <Select
            label="Vaccine Name"
            value={formData.vaccineName}
            onChange={(e) => setFormData({ ...formData, vaccineName: e.target.value })}
            options={vaccineOptions.map(v => ({ value: v, label: v }))}
            placeholder="Select vaccine"
            required
          />
          
          <Input
            label="Scheduled Date"
            type="date"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
            required
          />
          
          <Textarea
            label="Notes (Optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional notes..."
          />
          
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Adding...' : 'Add Vaccination'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Vaccination Status" size="md">
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          {selectedVaccination && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="font-semibold">{selectedVaccination.vaccineName}</p>
              <p className="text-sm text-gray-500">
                Scheduled: {formatDate(selectedVaccination.scheduledDate)}
              </p>
            </div>
          )}
          
          <Select
            label="Status"
            value={statusData.status}
            onChange={(e) => setStatusData({ ...statusData, status: e.target.value })}
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'MISSED', label: 'Missed' },
            ]}
            required
          />
          
          {statusData.status === 'COMPLETED' && (
            <>
              <Input
                label="Administered Date"
                type="date"
                value={statusData.administeredDate}
                onChange={(e) => setStatusData({ ...statusData, administeredDate: e.target.value })}
                required
              />
              <Input
                label="Batch Number (Optional)"
                value={statusData.batchNumber}
                onChange={(e) => setStatusData({ ...statusData, batchNumber: e.target.value })}
                placeholder="Enter vaccine batch number"
              />
            </>
          )}
          
          <Textarea
            label="Notes (Optional)"
            value={statusData.notes}
            onChange={(e) => setStatusData({ ...statusData, notes: e.target.value })}
            placeholder="Any additional notes..."
          />
          
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
