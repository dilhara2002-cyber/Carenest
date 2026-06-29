'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Modal, Input, Select, Textarea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Calendar, Plus, CheckCircle, Clock, XCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

interface Child {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
}

interface Mother {
  id: string;
  needsSpecialAttention: boolean;
  user: {
    name: string;
    email: string;
  };
  children: Child[];
}

interface Visit {
  id: string;
  motherId: string;
  midwifeId: string;
  visitType: string;
  visitDate: string;
  status: string;
  notes?: string | null;
  postnatalVisitNumber?: number | null;
  postnatalWindowStart?: string | null;
  postnatalWindowEnd?: string | null;
  isPostnatalMandatory?: boolean;
  isMohVisitRequired?: boolean;
  childId?: string | null;
  child?: {
    id: string;
    name: string;
    birthDate: string;
  } | null;
  mother?: {
    user?: {
      name: string;
    };
  };
  midwife?: {
    user?: {
      name: string;
    };
  };
}

export default function VisitsPage() {
  const { data: session } = useSession();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [currentMotherDetails, setCurrentMotherDetails] = useState<Mother | null>(null);
  
  // Tabs: 'PRENATAL' | 'POSTNATAL'
  const [activeTab, setActiveTab] = useState<'PRENATAL' | 'POSTNATAL'>('PRENATAL');
  
  // Midwife selected mother and child for postnatal timeline
  const [selectedMotherId, setSelectedMotherId] = useState<string>('');
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    motherId: '',
    visitType: 'ANTENATAL',
    visitDate: '',
    notes: '',
    childId: '',
    isPostnatalMandatory: false,
    postnatalVisitNumber: '',
    postnatalWindowStart: '',
    postnatalWindowEnd: '',
    isMohVisitRequired: false,
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

  const fetchCurrentMotherDetails = async () => {
    if (session?.user?.role === 'MOTHER' && session.user.motherId) {
      try {
        const res = await fetch(`/api/mothers/${session.user.motherId}`);
        const data = await res.json();
        setCurrentMotherDetails(data.data || null);
      } catch (error) {
        console.error('Failed to fetch mother details:', error);
      }
    }
  };

  useEffect(() => {
    fetchVisits();
    fetchMothers();
    fetchCurrentMotherDetails();
  }, [session]);

  // Set default selected child for postnatal views
  useEffect(() => {
    if (session?.user?.role === 'MOTHER' && currentMotherDetails?.children?.length) {
      setSelectedChildId(currentMotherDetails.children[0].id);
    }
  }, [currentMotherDetails, session]);

  // Handle Mother Selection in Midwife Postnatal view
  useEffect(() => {
    if (selectedMotherId) {
      const mom = mothers.find(m => m.id === selectedMotherId);
      if (mom?.children?.length) {
        setSelectedChildId(mom.children[0].id);
      } else {
        setSelectedChildId('');
      }
    } else {
      setSelectedChildId('');
    }
  }, [selectedMotherId, mothers]);

  // Auto-calculate postnatal windows in Form Modal
  useEffect(() => {
    if (
      formData.visitType === 'POSTNATAL' &&
      formData.isPostnatalMandatory &&
      formData.postnatalVisitNumber &&
      formData.childId
    ) {
      // Find the child birthDate
      let childBirthDateStr = '';
      if (session?.user?.role === 'MOTHER') {
        const child = currentMotherDetails?.children?.find(c => c.id === formData.childId);
        if (child) childBirthDateStr = child.birthDate;
      } else {
        const mom = mothers.find(m => m.id === formData.motherId);
        const child = mom?.children?.find(c => c.id === formData.childId);
        if (child) childBirthDateStr = child.birthDate;
      }

      if (childBirthDateStr) {
        const birthDate = new Date(childBirthDateStr);
        const visitNum = parseInt(formData.postnatalVisitNumber);
        
        let startDays = 0, endDays = 0, suggestedDays = 0;
        let isMoh = false;

        switch (visitNum) {
          case 1:
            startDays = 0; endDays = 5; suggestedDays = 3;
            break;
          case 2:
            startDays = 6; endDays = 10; suggestedDays = 8;
            break;
          case 3:
            startDays = 14; endDays = 21; suggestedDays = 18; isMoh = true;
            break;
          case 4:
            startDays = 42; endDays = 42; suggestedDays = 42;
            break;
        }

        const getOffsetDate = (days: number): string => {
          const d = new Date(birthDate);
          d.setDate(d.getDate() + days);
          d.setHours(9, 0, 0, 0); // Default to 9 AM
          const tzoffset = d.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
          return localISOTime;
        };

        const getRawOffsetDate = (days: number): Date => {
          const d = new Date(birthDate);
          d.setDate(d.getDate() + days);
          return d;
        };

        setFormData(prev => ({
          ...prev,
          postnatalWindowStart: getRawOffsetDate(startDays).toISOString(),
          postnatalWindowEnd: getRawOffsetDate(endDays).toISOString(),
          visitDate: getOffsetDate(suggestedDays),
          isMohVisitRequired: isMoh,
        }));
      }
    }
  }, [
    formData.visitType,
    formData.isPostnatalMandatory,
    formData.postnatalVisitNumber,
    formData.childId,
    formData.motherId,
    mothers,
    currentMotherDetails,
    session,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    // Validate postnatal window dates on submit
    if (
      formData.visitType === 'POSTNATAL' &&
      formData.isPostnatalMandatory &&
      formData.postnatalWindowStart &&
      formData.postnatalWindowEnd
    ) {
      const vDate = new Date(formData.visitDate);
      const start = new Date(formData.postnatalWindowStart);
      const end = new Date(formData.postnatalWindowEnd);
      if (vDate < start || vDate > end) {
        alert(`Visit date must fall within the mandatory window: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);
        setActionLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          postnatalVisitNumber: formData.postnatalVisitNumber ? parseInt(formData.postnatalVisitNumber) : null,
          childId: formData.childId || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          motherId: '',
          visitType: 'ANTENATAL',
          visitDate: '',
          notes: '',
          childId: '',
          isPostnatalMandatory: false,
          postnatalVisitNumber: '',
          postnatalWindowStart: '',
          postnatalWindowEnd: '',
          isMohVisitRequired: false,
        });
        fetchVisits();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to schedule visit');
      }
    } catch (error) {
      console.error('Failed to schedule visit:', error);
      alert('Failed to schedule visit');
    } finally {
      setActionLoading(false);
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
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update visit status');
      }
    } catch (error) {
      console.error('Failed to update visit:', error);
    }
  };

  const handleGeneratePrenatal = async (motherId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/visits/generate-prenatal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motherId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Prenatal visit generated successfully');
        fetchVisits();
      } else {
        alert(data.error || 'Failed to generate visit');
      }
    } catch (error) {
      console.error('Error generating prenatal visit:', error);
      alert('Error generating prenatal visit');
    } finally {
      setActionLoading(false);
    }
  };

  // Find the selected child object
  const getSelectedChild = (): Child | null => {
    if (session?.user?.role === 'MOTHER') {
      return currentMotherDetails?.children?.find(c => c.id === selectedChildId) || null;
    }
    const mom = mothers.find(m => m.id === selectedMotherId);
    return mom?.children?.find(c => c.id === selectedChildId) || null;
  };

  const selectedChild = getSelectedChild();

  // Helper to get status details for a postnatal window
  const getPostnatalVisitStatus = (visitNumber: number) => {
    if (!selectedChild) return { status: 'NOT_SCHEDULED', visit: null };
    
    const visit = visits.find(
      v => v.visitType === 'POSTNATAL' && 
      v.childId === selectedChild.id && 
      v.postnatalVisitNumber === visitNumber
    );

    if (!visit) return { status: 'NOT_SCHEDULED', visit: null };

    if (visit.status === 'SCHEDULED' && new Date(visit.visitDate) < new Date()) {
      return { status: 'OVERDUE', visit };
    }

    return { status: visit.status, visit };
  };

  // Timeline render helper
  const renderPostnatalTimeline = () => {
    if (!selectedChildId) {
      return (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
          Please select a mother and child to view their postnatal visit timeline.
        </div>
      );
    }

    if (!selectedChild) return null;

    const birthDate = new Date(selectedChild.birthDate);
    const windows = [
      { num: 1, label: '1st Visit', range: 'Day 0–5', startDays: 0, endDays: 5, midpoint: 3 },
      { num: 2, label: '2nd Visit', range: 'Day 6–10', startDays: 6, endDays: 10, midpoint: 8 },
      { num: 3, label: '3rd Visit', range: 'Day 14–21 (MOH)', startDays: 14, endDays: 21, midpoint: 18, isMoh: true },
      { num: 4, label: '4th Visit', range: '~Day 42', startDays: 42, endDays: 42, midpoint: 42 },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="font-semibold text-teal-900">Postnatal Visit Timeline for {selectedChild.name}</h4>
            <p className="text-sm text-teal-700">Birth Date: {formatDate(selectedChild.birthDate)} · Gender: {selectedChild.gender}</p>
          </div>
          <Badge variant="success">Sri Lanka MOH Protocol</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {windows.map((w) => {
            const { status, visit } = getPostnatalVisitStatus(w.num);
            
            const getWindowDateStr = (days: number) => {
              const d = new Date(birthDate);
              d.setDate(d.getDate() + days);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            };

            const windowDateRange = `${getWindowDateStr(w.startDays)} – ${getWindowDateStr(w.endDays)}`;
            const suggestedDate = getWindowDateStr(w.midpoint);

            let cardBg = 'bg-white border-gray-200';
            let statusText = 'Not Scheduled';
            let statusVariant: 'default' | 'success' | 'warning' | 'danger' | 'info' = 'default';

            if (status === 'COMPLETED') {
              cardBg = 'bg-green-50/50 border-green-200';
              statusText = 'Completed';
              statusVariant = 'success';
            } else if (status === 'SCHEDULED') {
              cardBg = 'bg-blue-50/50 border-blue-200';
              statusText = 'Scheduled';
              statusVariant = 'info';
            } else if (status === 'OVERDUE') {
              cardBg = 'bg-amber-50/50 border-amber-300';
              statusText = 'Overdue';
              statusVariant = 'warning';
            } else if (status === 'MISSED') {
              cardBg = 'bg-red-50/50 border-red-200';
              statusText = 'Missed';
              statusVariant = 'danger';
            } else if (status === 'CANCELLED') {
              cardBg = 'bg-gray-50 border-gray-200';
              statusText = 'Cancelled';
              statusVariant = 'default';
            }

            return (
              <Card key={w.num} className={`border-2 ${cardBg}`}>
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-gray-900">{w.label}</h5>
                        <p className="text-xs text-gray-500 font-semibold">{w.range}</p>
                      </div>
                      <Badge variant={statusVariant}>{statusText}</Badge>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-gray-600">
                      <div><strong className="text-gray-700">Window:</strong> {windowDateRange}</div>
                      <div><strong className="text-gray-700">Suggested:</strong> {suggestedDate}</div>
                      {visit && (
                        <div className="mt-2 p-1.5 bg-white/80 rounded border text-gray-700 font-medium">
                          Scheduled: {formatDate(visit.visitDate)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {w.isMoh && (
                      <Badge variant="warning" className="w-full justify-center text-center">
                        MOH Doctor Visit Required
                      </Badge>
                    )}

                    {session?.user?.role !== 'MOTHER' && (
                      <div className="flex flex-col gap-1 mt-2">
                        {status === 'NOT_SCHEDULED' && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              const mId = session?.user?.role === 'MOTHER' ? session.user.motherId : selectedMotherId;
                              
                              const targetD = new Date(birthDate);
                              targetD.setDate(targetD.getDate() + w.midpoint);
                              targetD.setHours(9, 0, 0, 0);
                              const tzoffset = targetD.getTimezoneOffset() * 60000;
                              const localTimeStr = (new Date(targetD.getTime() - tzoffset)).toISOString().slice(0, 16);

                              const startD = new Date(birthDate);
                              startD.setDate(startD.getDate() + w.startDays);
                              const endD = new Date(birthDate);
                              endD.setDate(endD.getDate() + w.endDays);

                              setFormData({
                                motherId: mId || '',
                                visitType: 'POSTNATAL',
                                visitDate: localTimeStr,
                                notes: `Mandatory postnatal visit ${w.num}${w.isMoh ? ' (MOH Doctor Clinic visit required)' : ''}`,
                                childId: selectedChildId,
                                isPostnatalMandatory: true,
                                postnatalVisitNumber: w.num.toString(),
                                postnatalWindowStart: startD.toISOString(),
                                postnatalWindowEnd: endD.toISOString(),
                                isMohVisitRequired: w.isMoh || false,
                              });
                              setShowModal(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Schedule
                          </Button>
                        )}
                        {status === 'SCHEDULED' && visit && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleStatusUpdate(visit.id, 'COMPLETED')}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Mark Complete
                          </Button>
                        )}
                        {(status === 'SCHEDULED' || status === 'OVERDUE') && visit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const startD = new Date(birthDate);
                              startD.setDate(startD.getDate() + w.startDays);
                              const endD = new Date(birthDate);
                              endD.setDate(endD.getDate() + w.endDays);

                              const visitT = new Date(visit.visitDate);
                              const tzoffset = visitT.getTimezoneOffset() * 60000;
                              const localTimeStr = (new Date(visitT.getTime() - tzoffset)).toISOString().slice(0, 16);

                              const newDateStr = prompt(
                                `Enter new date & time (between ${startD.toLocaleDateString()} and ${endD.toLocaleDateString()}) in YYYY-MM-DD HH:MM format:`,
                                localTimeStr.replace('T', ' ')
                              );
                              if (newDateStr) {
                                const parsedDate = new Date(newDateStr.trim().replace(' ', 'T'));
                                if (!isNaN(parsedDate.getTime())) {
                                  if (parsedDate >= startD && parsedDate <= endD) {
                                    fetch('/api/visits', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: visit.id, visitDate: parsedDate }),
                                    }).then(res => {
                                      if (res.ok) fetchVisits();
                                      else res.json().then(e => alert(e.error));
                                    });
                                  } else {
                                    alert('Date is outside the mandatory window range!');
                                  }
                                } else {
                                  alert('Invalid date format!');
                                }
                              }
                            }}
                          >
                            Reschedule
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
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

  const antenatalVisits = visits.filter(v => v.visitType === 'ANTENATAL');
  const postnatalVisits = visits.filter(v => v.visitType === 'POSTNATAL');

  const upcomingAntenatal = antenatalVisits.filter(v => v.status === 'SCHEDULED' && new Date(v.visitDate) >= new Date());
  const pastAntenatal = antenatalVisits.filter(v => v.status !== 'SCHEDULED' || new Date(v.visitDate) < new Date());

  const upcomingPostnatal = postnatalVisits.filter(v => v.status === 'SCHEDULED' && new Date(v.visitDate) >= new Date());
  const pastPostnatal = postnatalVisits.filter(v => v.status !== 'SCHEDULED' || new Date(v.visitDate) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visit Management</h1>
          <p className="text-gray-500">Schedule and track prenatal & postnatal visits</p>
        </div>
        {session?.user?.role !== 'MOTHER' && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Visit
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`py-2 px-4 font-semibold text-sm border-b-2 ${
            activeTab === 'PRENATAL'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('PRENATAL')}
        >
          Prenatal Care (Antenatal)
        </button>
        <button
          className={`py-2 px-4 font-semibold text-sm border-b-2 ${
            activeTab === 'POSTNATAL'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('POSTNATAL')}
        >
          Postnatal Care (After Delivery)
        </button>
      </div>

      {activeTab === 'PRENATAL' ? (
        <div className="space-y-6">
          {/* Care plan status summary */}
          {session?.user?.role === 'MOTHER' && currentMotherDetails && (
            <Card className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-teal-900">Your Prenatal Care Plan</h4>
                  <p className="text-sm text-teal-700 mt-1">
                    Care Plan:{' '}
                    <strong>
                      {currentMotherDetails.needsSpecialAttention ? 'Special Attention' : 'Normal Care'}
                    </strong>
                  </p>
                  <p className="text-xs text-teal-600 mt-1">
                    {currentMotherDetails.needsSpecialAttention
                      ? 'Your midwife has scheduled customized care visits based on your needs.'
                      : 'You are on the normal care plan. Standard visits are scheduled monthly.'}
                  </p>
                </div>
                <Badge variant={currentMotherDetails.needsSpecialAttention ? 'warning' : 'success'}>
                  {currentMotherDetails.needsSpecialAttention ? 'Special Attention' : 'Standard Plan'}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Assigned mothers summary (midwife only) */}
          {session?.user?.role !== 'MOTHER' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Mothers Prenatal Care Plan Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mother</TableHead>
                      <TableHead>Care Plan Level</TableHead>
                      <TableHead>Last Antenatal Visit</TableHead>
                      <TableHead>Next Scheduled Visit</TableHead>
                      <TableHead>Quick Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mothers.map((mother) => {
                      const momAntenatalVisits = antenatalVisits.filter(v => v.motherId === mother.id);
                      
                      const lastMomVisit = momAntenatalVisits
                        .filter(v => v.status === 'COMPLETED')
                        .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())[0];
                        
                      const nextMomVisit = momAntenatalVisits
                        .filter(v => v.status === 'SCHEDULED' && new Date(v.visitDate) >= new Date())
                        .sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime())[0];

                      return (
                        <TableRow key={mother.id}>
                          <TableCell className="font-semibold text-gray-900">{mother.user.name}</TableCell>
                          <TableCell>
                            {mother.needsSpecialAttention ? (
                              <Badge variant="warning">Special Attention</Badge>
                            ) : (
                              <Badge variant="default">Normal Care</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {lastMomVisit ? formatDate(lastMomVisit.visitDate) : 'No past visits'}
                          </TableCell>
                          <TableCell>
                            {nextMomVisit ? (
                              <Badge variant="info">{formatDateTime(nextMomVisit.visitDate)}</Badge>
                            ) : (
                              <Badge variant="danger">Not Scheduled</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {!mother.needsSpecialAttention && !nextMomVisit && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGeneratePrenatal(mother.id)}
                                  disabled={actionLoading}
                                >
                                  <Sparkles className="h-3.5 w-3.5 mr-1 text-teal-600" />
                                  Auto-Generate
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setFormData({
                                    motherId: mother.id,
                                    visitType: 'ANTENATAL',
                                    visitDate: '',
                                    notes: '',
                                    childId: '',
                                    isPostnatalMandatory: false,
                                    postnatalVisitNumber: '',
                                    postnatalWindowStart: '',
                                    postnatalWindowEnd: '',
                                    isMohVisitRequired: false,
                                  });
                                  setShowModal(true);
                                }}
                              >
                                Schedule Manually
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Prenatal Visits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-500" />
                Upcoming Prenatal Visits ({upcomingAntenatal.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAntenatal.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAntenatal.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between p-4 bg-teal-50/50 rounded-lg border border-teal-100"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg">
                          <Calendar className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {session?.user?.role === 'MOTHER'
                              ? `Visit with ${visit.midwife?.user?.name || 'Midwife'}`
                              : visit.mother?.user?.name || 'Unknown Mother'}
                          </p>
                          <p className="text-sm text-gray-500">{formatDateTime(visit.visitDate)}</p>
                          {visit.notes && <p className="text-xs text-gray-600 mt-1 italic">Note: {visit.notes}</p>}
                        </div>
                      </div>
                      {session?.user?.role !== 'MOTHER' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStatusUpdate(visit.id, 'COMPLETED')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No upcoming prenatal visits</p>
              )}
            </CardContent>
          </Card>

          {/* Past Prenatal Visits */}
          <Card>
            <CardHeader>
              <CardTitle>Prenatal Visit History</CardTitle>
            </CardHeader>
            <CardContent>
              {pastAntenatal.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      {session?.user?.role !== 'MOTHER' && <TableHead>Mother</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastAntenatal.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell>{formatDateTime(visit.visitDate)}</TableCell>
                        {session?.user?.role !== 'MOTHER' && (
                          <TableCell>{visit.mother?.user?.name || 'Unknown'}</TableCell>
                        )}
                        <TableCell>{getStatusBadge(visit.status)}</TableCell>
                        <TableCell className="max-w-xs truncate">{visit.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500 py-8">No prenatal visit history</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // POSTNATAL TAB
        <div className="space-y-6">
          {/* Midwife Selection Panel */}
          {session?.user?.role !== 'MOTHER' && (
            <Card>
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full md:w-1/2">
                  <Select
                    label="Select Mother"
                    value={selectedMotherId}
                    onChange={(e) => setSelectedMotherId(e.target.value)}
                    options={mothers.map(m => ({ value: m.id, label: m.user?.name || 'Unknown' }))}
                    placeholder="Choose a mother..."
                  />
                </div>
                <div className="w-full md:w-1/2">
                  {selectedMotherId && (
                    <Select
                      label="Select Child"
                      value={selectedChildId}
                      onChange={(e) => setSelectedChildId(e.target.value)}
                      options={(mothers.find(m => m.id === selectedMotherId)?.children || []).map(c => ({
                        value: c.id,
                        label: `${c.name} (${formatDate(c.birthDate)})`,
                      }))}
                      placeholder="Choose a child..."
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mother Selection Panel */}
          {session?.user?.role === 'MOTHER' && currentMotherDetails && (
            <Card>
              <CardContent className="p-4">
                <Select
                  label="Select Child to View Postnatal Timeline"
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  options={(currentMotherDetails.children || []).map(c => ({
                    value: c.id,
                    label: `${c.name} (${formatDate(c.birthDate)})`,
                  }))}
                  placeholder="Choose child..."
                />
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {renderPostnatalTimeline()}

          {/* Ad-hoc / Additional Postnatal Visits */}
          {selectedChildId && (
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-lg">Additional / Ad-Hoc Postnatal Visits</CardTitle>
                {session?.user?.role !== 'MOTHER' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setFormData({
                        motherId: (session?.user?.role === 'MOTHER' ? session.user.motherId : selectedMotherId) || '',
                        visitType: 'POSTNATAL',
                        visitDate: '',
                        notes: 'Additional postnatal visit',
                        childId: selectedChildId,
                        isPostnatalMandatory: false,
                        postnatalVisitNumber: '',
                        postnatalWindowStart: '',
                        postnatalWindowEnd: '',
                        isMohVisitRequired: false,
                      });
                      setShowModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Ad-Hoc Visit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {postnatalVisits.filter(v => v.childId === selectedChildId && !v.isPostnatalMandatory).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        {session?.user?.role !== 'MOTHER' && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {postnatalVisits
                        .filter(v => v.childId === selectedChildId && !v.isPostnatalMandatory)
                        .map((visit) => (
                          <TableRow key={visit.id}>
                            <TableCell>{formatDateTime(visit.visitDate)}</TableCell>
                            <TableCell>{getStatusBadge(visit.status)}</TableCell>
                            <TableCell>{visit.notes || '-'}</TableCell>
                            {session?.user?.role !== 'MOTHER' && (
                              <TableCell>
                                {visit.status === 'SCHEDULED' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleStatusUpdate(visit.id, 'COMPLETED')}
                                  >
                                    Complete
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-gray-500 py-6">No additional postnatal visits scheduled</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
            disabled={session?.user?.role === 'MOTHER'}
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

          {formData.visitType === 'POSTNATAL' && (
            <>
              <Select
                label="Child"
                value={formData.childId}
                onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
                options={(
                  (session?.user?.role === 'MOTHER'
                    ? currentMotherDetails?.children
                    : mothers.find(m => m.id === formData.motherId)?.children) || []
                ).map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select child"
                required
              />

              <div className="flex items-center gap-2 py-2">
                <input
                  id="isPostnatalMandatory"
                  type="checkbox"
                  checked={formData.isPostnatalMandatory}
                  onChange={(e) => setFormData({ ...formData, isPostnatalMandatory: e.target.checked })}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="isPostnatalMandatory" className="text-sm font-medium text-gray-700">
                  Mandatory Postnatal Visit (Sri Lanka MOH Protocol)
                </label>
              </div>

              {formData.isPostnatalMandatory && (
                <Select
                  label="Select Mandatory Visit Number"
                  value={formData.postnatalVisitNumber}
                  onChange={(e) => setFormData({ ...formData, postnatalVisitNumber: e.target.value })}
                  options={[
                    { value: '1', label: '1st Visit (Day 0–5)' },
                    { value: '2', label: '2nd Visit (Day 6–10)' },
                    { value: '3', label: '3rd Visit (Day 14–21, MOH Doctor)' },
                    { value: '4', label: '4th Visit (~Day 42)' },
                  ]}
                  placeholder="Select visit number"
                  required
                />
              )}
            </>
          )}

          {formData.visitType === 'ANTENATAL' && formData.motherId && (
            <div className="p-3 bg-gray-50 border rounded text-sm text-gray-700">
              {(() => {
                const mom = mothers.find(m => m.id === formData.motherId);
                return (
                  <p>
                    Mother Care plan:{' '}
                    <strong className={mom?.needsSpecialAttention ? 'text-amber-600' : 'text-emerald-600'}>
                      {mom?.needsSpecialAttention ? 'Special Attention' : 'Normal Care'}
                    </strong>
                  </p>
                );
              })()}
            </div>
          )}

          <Input
            label="Visit Date & Time"
            type="datetime-local"
            value={formData.visitDate}
            onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
            required
          />

          {formData.isPostnatalMandatory && formData.postnatalWindowStart && formData.postnatalWindowEnd && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-800 space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Postnatal Protocol Window Constraints:
              </p>
              <p>Window Start: {formatDate(formData.postnatalWindowStart)}</p>
              <p>Window End: {formatDate(formData.postnatalWindowEnd)}</p>
              {formData.isMohVisitRequired && <p className="font-bold">⚠️ Mother must visit MOH Clinic for this checkup.</p>}
            </div>
          )}

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
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Scheduling...' : 'Schedule Visit'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
