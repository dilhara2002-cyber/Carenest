'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Modal, Input, Select, Textarea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Calendar, Plus, CheckCircle, Clock, XCircle, Edit } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function VisitsPage() {
  const { data: session } = useSession();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [mothers, setMothers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    motherId: '',
    visitType: 'ANTENATAL',
    visitDate: '',
    notes: '',
  });

  const fetchVisits = async () => {
    try {
      const res = await fetch('/api/visits');
      const data = await res.json();
      setVisits(data.data || []);
    } catch (error) {
      console.error('Failed to fetch visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMothers = async () => {
    if (session?.user?.role !== 'MOTHER') {
      try {
        const res = await fetch('/api/mothers');
        const data = await res.json();
        setMothers(data.data || []);
      } catch (error) {
        console.error('Failed to fetch mothers:', error);
      }
    }
  };

  useEffect(() => {
    fetchVisits();
    fetchMothers();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({ motherId: '', visitType: 'ANTENATAL', visitDate: '', notes: '' });
        fetchVisits();
      }
    } catch (error) {
      console.error('Failed to schedule visit:', error);
    }
  };

  const handleStatusUpdate = async (visitId: string, status: string) => {
    try {
      const res = await fetch('/api/visits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: visitId, status }),
      });

      if (res.ok) {
        fetchVisits();
      }
    } catch (error) {
      console.error('Failed to update visit:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="info"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
      case 'COMPLETED':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'MISSED':
        return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" />Missed</Badge>;
      case 'CANCELLED':
        return <Badge variant="default"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const upcomingVisits = visits.filter(v => v.status === 'SCHEDULED' && new Date(v.visitDate) >= new Date());
  const pastVisits = visits.filter(v => v.status !== 'SCHEDULED' || new Date(v.visitDate) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visit Management</h1>
          <p className="text-gray-500">Schedule and track antenatal & postnatal visits</p>
        </div>
        {session?.user?.role !== 'MOTHER' && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Visit
          </Button>
        )}
      </div>

      {/* Upcoming Visits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-500" />
            Upcoming Visits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingVisits.length > 0 ? (
            <div className="space-y-3">
              {upcomingVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="flex items-center justify-between p-4 bg-teal-50 rounded-lg border border-teal-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-lg">
                      <Calendar className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {session?.user?.role === 'MOTHER'
                          ? `Visit with ${visit.midwife?.user?.name || 'Midwife'}`
                          : visit.mother?.user?.name || 'Unknown Mother'}
                      </p>
                      <p className="text-sm text-gray-500">{formatDateTime(visit.visitDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={visit.visitType === 'ANTENATAL' ? 'info' : 'success'}>
                      {visit.visitType}
                    </Badge>
                    {session?.user?.role !== 'MOTHER' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(visit.id, 'COMPLETED')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No upcoming visits</p>
          )}
        </CardContent>
      </Card>

      {/* Visit History */}
      <Card>
        <CardHeader>
          <CardTitle>Visit History</CardTitle>
        </CardHeader>
        <CardContent>
          {pastVisits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {session?.user?.role !== 'MOTHER' && <TableHead>Mother</TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastVisits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell>{formatDateTime(visit.visitDate)}</TableCell>
                    {session?.user?.role !== 'MOTHER' && (
                      <TableCell>{visit.mother?.user?.name || 'Unknown'}</TableCell>
                    )}
                    <TableCell>
                      <Badge variant={visit.visitType === 'ANTENATAL' ? 'info' : 'success'}>
                        {visit.visitType}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(visit.status)}</TableCell>
                    <TableCell className="max-w-xs truncate">{visit.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500 py-8">No visit history</p>
          )}
        </CardContent>
      </Card>

      {/* Schedule Visit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Schedule Visit">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Mother"
            value={formData.motherId}
            onChange={(e) => setFormData({ ...formData, motherId: e.target.value })}
            options={mothers.map(m => ({ value: m.id, label: m.user?.name || 'Unknown' }))}
            placeholder="Select mother"
            required
          />
          <Select
            label="Visit Type"
            value={formData.visitType}
            onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
            options={[
              { value: 'ANTENATAL', label: 'Antenatal Visit' },
              { value: 'POSTNATAL', label: 'Postnatal Visit' },
            ]}
          />
          <Input
            label="Visit Date & Time"
            type="datetime-local"
            value={formData.visitDate}
            onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
            required
          />
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any notes for this visit..."
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Schedule Visit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
