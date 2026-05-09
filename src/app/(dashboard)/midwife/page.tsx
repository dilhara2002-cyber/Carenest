'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Users, Heart, Calendar, Syringe, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatDateTime } from '@/lib/utils';

interface DashboardData {
  assignedMothers: number;
  activePregnancies: number;
  todayVisits: number;
  upcomingVisits: any[];
  pendingVaccinations: number;
  completedVisitsThisMonth: number;
  highRiskCases: number;
  pregnancyOverview: any[];
}

export default function MidwifeDashboard() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        setDashboardData(data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {session?.user?.name}! 👩‍⚕️
        </h1>
        <p className="opacity-90">
          You have {dashboardData?.todayVisits || 0} visits scheduled for today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Mothers"
          value={dashboardData?.assignedMothers?.toString() || '0'}
          icon={<Users className="h-6 w-6 text-blue-500" />}
          href="/mothers"
          color="blue"
        />
        <StatCard
          title="Active Pregnancies"
          value={dashboardData?.activePregnancies?.toString() || '0'}
          icon={<Heart className="h-6 w-6 text-pink-500" />}
          href="/pregnancies"
          color="pink"
        />
        <StatCard
          title="High Risk Cases"
          value={dashboardData?.highRiskCases?.toString() || '0'}
          icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
          href="/mothers?filter=high-risk"
          color="red"
        />
        <StatCard
          title="Completed This Month"
          value={dashboardData?.completedVisitsThisMonth?.toString() || '0'}
          icon={<CheckCircle className="h-6 w-6 text-green-500" />}
          href="/visits?status=completed"
          color="green"
        />
      </div>

      {/* Today's Visits and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Visits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-500" />
                Upcoming Visits
              </span>
              <Link href="/visits" className="text-sm text-teal-600 hover:underline">
                View All
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.upcomingVisits && dashboardData.upcomingVisits.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.upcomingVisits.map((visit: any) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {visit.mother?.user?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(visit.visitDate)}
                      </p>
                    </div>
                    <Badge variant={visit.visitType === 'ANTENATAL' ? 'info' : 'success'}>
                      {visit.visitType}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No upcoming visits</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/mothers"
                className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-blue-900">View Mothers</span>
              </Link>
              <Link
                href="/visits"
                className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Calendar className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-green-900">Schedule Visit</span>
              </Link>
              <Link
                href="/vaccinations"
                className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Syringe className="h-8 w-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium text-orange-900">Vaccinations</span>
              </Link>
              <Link
                href="/chat"
                className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <svg className="h-8 w-8 text-purple-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm font-medium text-purple-900">Messages</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Vaccinations Alert */}
      {(dashboardData?.pendingVaccinations || 0) > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Syringe className="h-6 w-6 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">
                  {dashboardData?.pendingVaccinations} Pending Vaccinations
                </p>
                <p className="text-sm text-orange-700">
                  Vaccinations due in the next 30 days
                </p>
              </div>
            </div>
            <Link
              href="/vaccinations?status=pending"
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
            >
              View All
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Pregnancy Progress Overview */}
      {dashboardData?.pregnancyOverview && dashboardData.pregnancyOverview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Pregnancy Progress Overview
              </span>
              <Link href="/pregnancies" className="text-sm text-teal-600 hover:underline">
                View All
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.pregnancyOverview.map((item: any) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border ${item.highRisk ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.motherName}</span>
                      {item.highRisk && (
                        <Badge variant="danger">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          High Risk
                        </Badge>
                      )}
                    </div>
                    {item.progress && (
                      <Badge variant={
                        item.progress.isOverdue ? 'danger' :
                        item.progress.trimester === 3 ? 'warning' : 'info'
                      }>
                        {item.progress.trimesterLabel}
                      </Badge>
                    )}
                  </div>

                  {item.progress ? (
                    <>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">
                          Week {item.progress.weeks}, Day {item.progress.days} · Month {item.progress.month}
                        </span>
                        <span className="text-gray-500">{item.progress.percentComplete}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            item.progress.isOverdue
                              ? 'bg-gradient-to-r from-red-400 to-red-600'
                              : 'bg-gradient-to-r from-pink-400 to-pink-600'
                          }`}
                          style={{ width: `${item.progress.percentComplete}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          EDD: {formatDate(item.progress.expectedDeliveryDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.progress.isOverdue
                            ? 'Overdue'
                            : `${item.progress.daysRemaining} days remaining`}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Week {item.currentWeek || '?'} · LMP not recorded
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`p-3 rounded-lg bg-gray-100`}>
            {icon}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
