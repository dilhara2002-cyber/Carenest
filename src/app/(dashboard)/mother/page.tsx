'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { Heart, Calendar, Syringe, Bell, Baby, Brain, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import ChildGrowthWidget from '@/components/ChildGrowthWidget';

interface DashboardData {
  activePregnancy: any;
  childrenCount: number;
  upcomingVisits: number;
  pendingVaccinations: number;
  unreadNotifications: number;
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
        <div className="relative">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 border-t-teal-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Heart className="h-5 w-5 text-teal-600 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const pregnancy = dashboardData?.activePregnancy;
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

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-teal-200" />
            <span className="text-sm text-teal-100 font-medium tracking-wide">Your Health Journey</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {greeting}, {session?.user?.name}! 👋
          </h1>
          <p className="text-teal-50 text-lg max-w-lg">
            {pregnancy?.progress
              ? `You're in week ${pregnancy.progress.weeks} (${pregnancy.progress.trimesterLabel}) of your pregnancy.`
              : pregnancy
              ? `You're in week ${pregnancy.currentWeek || '?'} of your pregnancy.`
              : 'Track your maternal health journey with CareNest.'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pregnancy"
          value={pregnancy?.progress ? `Week ${pregnancy.progress.weeks}` : pregnancy ? `Week ${pregnancy.currentWeek || '?'}` : 'Not Active'}
          icon={<Heart className="h-5 w-5 text-white" />}
          href="/pregnancies"
          gradient="from-pink-500 to-rose-500"
          lightBg="bg-pink-50"
          accent="text-pink-600"
          delay="stagger-1"
        />
        <StatCard
          title="Children"
          value={dashboardData?.childrenCount?.toString() || '0'}
          icon={<Baby className="h-5 w-5 text-white" />}
          href="/children"
          gradient="from-blue-500 to-indigo-500"
          lightBg="bg-blue-50"
          accent="text-blue-600"
          delay="stagger-2"
        />
        <StatCard
          title="Upcoming Visits"
          value={dashboardData?.upcomingVisits?.toString() || '0'}
          icon={<Calendar className="h-5 w-5 text-white" />}
          href="/visits"
          gradient="from-emerald-500 to-green-500"
          lightBg="bg-emerald-50"
          accent="text-emerald-600"
          delay="stagger-3"
        />
        <StatCard
          title="Pending Vaccinations"
          value={dashboardData?.pendingVaccinations?.toString() || '0'}
          icon={<Syringe className="h-5 w-5 text-white" />}
          href="/vaccinations"
          gradient="from-amber-500 to-orange-500"
          lightBg="bg-amber-50"
          accent="text-amber-600"
          delay="stagger-4"
        />
      </div>

      {/* Child Growth Tracker */}
      <ChildGrowthWidget />

      {/* Pregnancy Progress */}
      {pregnancy && (
        <Card className="animate-fade-in-up overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50/50">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 bg-pink-100 rounded-md">
                <Heart className="h-4 w-4 text-pink-600" />
              </div>
              Pregnancy Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {pregnancy.progress ? (
                <>
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-gray-800">
                        Week {pregnancy.progress.weeks}, Day {pregnancy.progress.days} of 40
                      </span>
                      <span className="font-bold text-pink-600">{pregnancy.progress.percentComplete}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                          pregnancy.progress.isOverdue
                            ? 'bg-gradient-to-r from-red-400 to-red-600'
                            : 'bg-gradient-to-r from-pink-400 via-pink-500 to-rose-500'
                        }`}
                        style={{ width: `${pregnancy.progress.percentComplete}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 rounded-xl text-center border border-purple-100">
                      <span className="text-purple-500 text-xs font-semibold uppercase tracking-wider">Month</span>
                      <p className="font-bold text-2xl text-purple-800 mt-1">{pregnancy.progress.month}</p>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-rose-100/50 p-4 rounded-xl text-center border border-pink-100">
                      <span className="text-pink-500 text-xs font-semibold uppercase tracking-wider">Trimester</span>
                      <p className="font-bold text-2xl text-pink-800 mt-1">{pregnancy.progress.trimester}</p>
                      <p className="text-xs text-pink-600 mt-0.5">{pregnancy.progress.trimesterLabel}</p>
                    </div>
                    <div className="bg-gradient-to-br from-teal-50 to-cyan-100/50 p-4 rounded-xl text-center border border-teal-100">
                      <span className="text-teal-500 text-xs font-semibold uppercase tracking-wider">Expected Delivery</span>
                      <p className="font-bold text-sm text-teal-800 mt-1">{formatDate(pregnancy.progress.expectedDeliveryDate)}</p>
                    </div>
                    <div className={`p-4 rounded-xl text-center border ${
                      pregnancy.progress.isOverdue 
                        ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-100' 
                        : 'bg-gradient-to-br from-green-50 to-emerald-100/50 border-green-100'
                    }`}>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${pregnancy.progress.isOverdue ? 'text-red-500' : 'text-green-500'}`}>
                        {pregnancy.progress.isOverdue ? 'Overdue' : 'Days Remaining'}
                      </span>
                      <p className={`font-bold text-2xl mt-1 ${pregnancy.progress.isOverdue ? 'text-red-800' : 'text-green-800'}`}>
                        {pregnancy.progress.daysRemaining}
                      </p>
                    </div>
                  </div>

                  {/* Overdue Warning */}
                  {pregnancy.progress.isOverdue && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg shrink-0">
                        <Heart className="h-4 w-4 text-red-600" />
                      </div>
                      <span className="text-red-700 font-medium text-sm">
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
                /* Fallback for pregnancies without LMP */
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Week {pregnancy.currentWeek || 0} of 40</span>
                      <span className="font-bold text-pink-600">{Math.round(((pregnancy.currentWeek || 0) / 40) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-pink-400 via-pink-500 to-rose-500 h-full rounded-full relative"
                        style={{ width: `${Math.min(((pregnancy.currentWeek || 0) / 40) * 100, 100)}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                      </div>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/ai-care">
          <Card className="card-lift cursor-pointer h-full animate-fade-in-up stagger-1 overflow-hidden group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/30 transition-shadow">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">AI Care Assistant</h3>
                <p className="text-sm text-gray-500">Get nutrition & exercise tips</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/chat">
          <Card className="card-lift cursor-pointer h-full animate-fade-in-up stagger-2 overflow-hidden group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/30 transition-shadow">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Chat with Midwife</h3>
                <p className="text-sm text-gray-500">Send a message</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/notifications">
          <Card className="card-lift cursor-pointer h-full animate-fade-in-up stagger-3 overflow-hidden group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-shadow relative">
                <Bell className="h-7 w-7 text-white" />
                {(dashboardData?.unreadNotifications || 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                    {dashboardData?.unreadNotifications}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <p className="text-sm text-gray-500">
                  {dashboardData?.unreadNotifications || 0} unread
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
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
  gradient,
  lightBg,
  accent,
  delay,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  href: string;
  gradient: string;
  lightBg: string;
  accent: string;
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
