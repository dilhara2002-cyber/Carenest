'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { Heart, Calendar, Syringe, Bell, Baby, Brain } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import ChildGrowthWidget from '@/components/ChildGrowthWidget';
import AssignedMidwifeCard, { AssignedMidwife } from '@/components/AssignedMidwifeCard';

interface DashboardData {
  activePregnancy: {
    id: string;
    lastMenstrualPeriod?: string | null;
    expectedDeliveryDate?: string | null;
    highRisk?: boolean;
  } | null;
  childrenCount: number;
  upcomingVisits: number;
  pendingVaccinations: number;
  unreadNotifications: number;
  assignedMidwife: AssignedMidwife | null;
}

export default function MotherDashboard() {
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

  const pregnancy = dashboardData?.activePregnancy;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {session?.user?.name}! 👋
        </h1>
        <p className="opacity-90">
          {pregnancy?.progress
            ? `You're in week ${pregnancy.progress.weeks} (${pregnancy.progress.trimesterLabel}) of your pregnancy.`
            : pregnancy
            ? `You're in week ${pregnancy.currentWeek || '?'} of your pregnancy.`
            : 'Track your maternal health journey with CareNest.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pregnancy"
          value={
            pregnancy?.progress
              ? `Week ${pregnancy.progress.weeks}`
              : pregnancy
              ? `Week ${pregnancy.currentWeek || '?'}`
              : 'Not Active'
          }
          icon={<Heart className="h-6 w-6 text-pink-500" />}
          href="/pregnancies"
          color="pink"
        />
        <StatCard
          title="Children"
          value={dashboardData?.childrenCount?.toString() || '0'}
          icon={<Baby className="h-6 w-6 text-blue-500" />}
          href="/children"
          color="blue"
        />
        <StatCard
          title="Upcoming Visits"
          value={dashboardData?.upcomingVisits?.toString() || '0'}
          icon={<Calendar className="h-6 w-6 text-green-500" />}
          href="/visits"
          color="green"
        />
        <StatCard
          title="Pending Vaccinations"
          value={dashboardData?.pendingVaccinations?.toString() || '0'}
          icon={<Syringe className="h-6 w-6 text-orange-500" />}
          href="/vaccinations"
          color="orange"
        />
      </div>

      {/* Child Growth Tracker */}
      <ChildGrowthWidget />

      {/* Pregnancy Progress */}
      {pregnancy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Pregnancy Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pregnancy.progress ? (
                <>
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">
                        Week {pregnancy.progress.weeks}, Day {pregnancy.progress.days} of 40
                      </span>
                      <span>{pregnancy.progress.percentComplete}%</span>
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
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <span className="text-purple-600 text-xs font-medium">Month</span>
                      <p className="font-bold text-lg text-purple-900">{pregnancy.progress.month}</p>
                    </div>
                    <div className="bg-pink-50 p-3 rounded-lg text-center">
                      <span className="text-pink-600 text-xs font-medium">Trimester</span>
                      <p className="font-bold text-lg text-pink-900">{pregnancy.progress.trimester}</p>
                      <p className="text-xs text-pink-700">{pregnancy.progress.trimesterLabel}</p>
                    </div>
                    <div className="bg-teal-50 p-3 rounded-lg text-center">
                      <span className="text-teal-600 text-xs font-medium">Expected Delivery</span>
                      <p className="font-bold text-sm text-teal-900">{formatDate(pregnancy.progress.expectedDeliveryDate)}</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${pregnancy.progress.isOverdue ? 'bg-red-50' : 'bg-green-50'}`}>
                      <span className={`text-xs font-medium ${pregnancy.progress.isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                        {pregnancy.progress.isOverdue ? 'Overdue' : 'Days Remaining'}
                      </span>
                      <p className={`font-bold text-lg ${pregnancy.progress.isOverdue ? 'text-red-900' : 'text-green-900'}`}>
                        {pregnancy.progress.daysRemaining}
                      </p>
                    </div>
                  </div>

                  {/* Overdue Warning */}
                  {pregnancy.progress.isOverdue && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                      <span className="text-red-600 font-medium text-sm">
                        ⚠️ This pregnancy is past the expected delivery date. Please consult your midwife.
                      </span>
                    </div>
                  )}

                  {/* Risk Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">Status:</span>
                    <Badge variant={pregnancy.highRisk ? 'danger' : 'success'}>
                      {pregnancy.highRisk ? 'High Risk' : 'Normal'}
                    </Badge>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Week {pregnancy.currentWeek || 0} of 40</span>
                      <span>{Math.round(((pregnancy.currentWeek || 0) / 40) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-pink-400 to-pink-600 h-3 rounded-full"
                        style={{ width: `${Math.min(((pregnancy.currentWeek || 0) / 40) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Expected Delivery:</span>
                      <p className="font-medium">{formatDate(pregnancy.expectedDeliveryDate)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <p className="font-medium">
                        <Badge variant={pregnancy.highRisk ? 'danger' : 'success'}>
                          {pregnancy.highRisk ? 'High Risk' : 'Normal'}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned Midwife Card */}
      <AssignedMidwifeCard midwife={dashboardData?.assignedMidwife ?? null} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/ai-care">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Care Assistant</h3>
                <p className="text-sm text-gray-500">Get nutrition & exercise tips</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/chat">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-teal-100 rounded-lg">
                <svg className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Chat with Midwife</h3>
                <p className="text-sm text-gray-500">Send a message</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/notifications">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-yellow-100 rounded-lg relative">
                <Bell className="h-8 w-8 text-yellow-600" />
                {(dashboardData?.unreadNotifications || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {dashboardData?.unreadNotifications}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <p className="text-sm text-gray-500">
                  {dashboardData?.unreadNotifications || 0} unread
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
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
          <div className={`p-3 bg-${color}-100 rounded-lg`}>
            {icon}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}