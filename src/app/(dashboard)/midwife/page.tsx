'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Users, Heart, Calendar, Syringe, AlertTriangle, CheckCircle, Clock, ArrowRight, Stethoscope } from 'lucide-react';
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
        <div className="relative">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 border-t-teal-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Stethoscope className="h-5 w-5 text-teal-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 p-8 text-white animate-gradient-shift hero-pattern">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full blur-2xl -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-300/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />

        {/* Shimmer */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="h-4 w-4 text-teal-200" />
              <span className="text-sm text-teal-100 font-medium tracking-wide">Midwife Dashboard</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {greeting}, {session?.user?.name}! 👩‍⚕️
            </h1>
            <p className="text-teal-50 text-lg max-w-lg">
              You have <span className="font-bold text-white">{dashboardData?.todayVisits || 0} visits</span> scheduled for today.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-teal-200">Today</p>
              <p className="text-lg font-semibold text-white">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            {(dashboardData?.highRiskCases || 0) > 0 && (
              <>
                <div className="w-px h-10 bg-white/20" />
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/15 rounded-lg border border-red-400/20">
                  <AlertTriangle className="h-4 w-4 text-red-300" />
                  <span className="text-sm text-red-200 font-medium">{dashboardData?.highRiskCases} High Risk</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Mothers"
          value={dashboardData?.assignedMothers?.toString() || '0'}
          icon={<Users className="h-5 w-5 text-white" />}
          href="/mothers"
          gradient="from-blue-500 to-indigo-500"
          delay="stagger-1"
        />
        <StatCard
          title="Active Pregnancies"
          value={dashboardData?.activePregnancies?.toString() || '0'}
          icon={<Heart className="h-5 w-5 text-white" />}
          href="/pregnancies"
          gradient="from-pink-500 to-rose-500"
          delay="stagger-2"
        />
        <StatCard
          title="High Risk Cases"
          value={dashboardData?.highRiskCases?.toString() || '0'}
          icon={<AlertTriangle className="h-5 w-5 text-white" />}
          href="/mothers?filter=high-risk"
          gradient="from-red-500 to-rose-600"
          delay="stagger-3"
        />
        <StatCard
          title="Completed This Month"
          value={dashboardData?.completedVisitsThisMonth?.toString() || '0'}
          icon={<CheckCircle className="h-5 w-5 text-white" />}
          href="/visits?status=completed"
          gradient="from-emerald-500 to-green-500"
          delay="stagger-4"
        />
      </div>

      {/* Today's Visits and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Visits */}
        <Card className="animate-fade-in-up overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-100 rounded-md">
                  <Calendar className="h-4 w-4 text-teal-600" />
                </div>
                Upcoming Visits
              </span>
              <Link href="/visits" className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors group">
                View All
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dashboardData?.upcomingVisits && dashboardData.upcomingVisits.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {dashboardData.upcomingVisits.map((visit: any) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {visit.mother?.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {visit.mother?.user?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(visit.visitDate)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={visit.visitType === 'ANTENATAL' ? 'info' : 'success'}>
                      {visit.visitType}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No upcoming visits</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-fade-in-up stagger-2 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-md">
                <Stethoscope className="h-4 w-4 text-indigo-600" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/mothers"
                className="action-glow flex flex-col items-center p-5 bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-xl border border-blue-100 hover:border-blue-200 transition-all"
              >
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 mb-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-blue-900">View Mothers</span>
                <span className="text-xs text-blue-500 mt-0.5">{dashboardData?.assignedMothers || 0} assigned</span>
              </Link>
              <Link
                href="/visits"
                className="action-glow flex flex-col items-center p-5 bg-gradient-to-br from-emerald-50 to-green-100/60 rounded-xl border border-emerald-100 hover:border-emerald-200 transition-all"
              >
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg shadow-emerald-500/20 mb-3">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-emerald-900">Schedule Visit</span>
                <span className="text-xs text-emerald-500 mt-0.5">{dashboardData?.todayVisits || 0} today</span>
              </Link>
              <Link
                href="/vaccinations"
                className="action-glow flex flex-col items-center p-5 bg-gradient-to-br from-amber-50 to-orange-100/60 rounded-xl border border-amber-100 hover:border-amber-200 transition-all"
              >
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20 mb-3">
                  <Syringe className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-amber-900">Vaccinations</span>
                <span className="text-xs text-amber-600 mt-0.5">{dashboardData?.pendingVaccinations || 0} pending</span>
              </Link>
              <Link
                href="/chat"
                className="action-glow flex flex-col items-center p-5 bg-gradient-to-br from-purple-50 to-violet-100/60 rounded-xl border border-purple-100 hover:border-purple-200 transition-all"
              >
                <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg shadow-purple-500/20 mb-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-purple-900">Messages</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Vaccinations Alert */}
      {(dashboardData?.pendingVaccinations || 0) > 0 && (
        <div className="animate-fade-in-up relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20">
                <Syringe className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 text-lg">
                  {dashboardData?.pendingVaccinations} Pending Vaccinations
                </p>
                <p className="text-sm text-amber-700">
                  Vaccinations due in the next 30 days
                </p>
              </div>
            </div>
            <Link
              href="/vaccinations?status=pending"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 text-sm font-medium transition-all shadow-md shadow-amber-500/20 hover:shadow-lg"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Pregnancy Progress Overview */}
      {dashboardData?.pregnancyOverview && dashboardData.pregnancyOverview.length > 0 && (
        <Card className="animate-fade-in-up overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50/50">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="p-1.5 bg-pink-100 rounded-md">
                  <Heart className="h-4 w-4 text-pink-600" />
                </div>
                Pregnancy Progress Overview
              </span>
              <Link href="/pregnancies" className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors group">
                View All
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.pregnancyOverview.map((item: any) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-xl border transition-all hover:shadow-md ${
                    item.highRisk 
                      ? 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50/50' 
                      : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${
                        item.highRisk 
                          ? 'bg-gradient-to-br from-red-400 to-rose-500' 
                          : 'bg-gradient-to-br from-teal-400 to-cyan-500'
                      }`}>
                        {item.motherName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{item.motherName}</span>
                        {item.highRisk && (
                          <Badge variant="danger">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            High Risk
                          </Badge>
                        )}
                      </div>
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
                        <span className="text-gray-600 font-medium">
                          Week {item.progress.weeks}, Day {item.progress.days} · Month {item.progress.month}
                        </span>
                        <span className="text-gray-500 font-bold">{item.progress.percentComplete}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 relative ${
                            item.progress.isOverdue
                              ? 'bg-gradient-to-r from-red-400 to-red-600'
                              : 'bg-gradient-to-r from-pink-400 via-pink-500 to-rose-500'
                          }`}
                          style={{ width: `${item.progress.percentComplete}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          EDD: {formatDate(item.progress.expectedDeliveryDate)}
                        </span>
                        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
                          item.progress.isOverdue 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
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
  gradient,
  delay,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  href: string;
  gradient: string;
  delay: string;
}) {
  return (
    <Link href={href}>
      <Card className={`card-lift cursor-pointer animate-fade-in-up ${delay} overflow-hidden group`}>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5 animate-count-up">{value}</p>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-105 transition-transform`}>
            {icon}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
