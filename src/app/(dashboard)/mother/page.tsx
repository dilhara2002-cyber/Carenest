'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui';
import {
  Heart, Calendar, Syringe, Bell, Baby, Brain,
  ArrowRight, Activity, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import ChildGrowthWidget from '@/components/ChildGrowthWidget';
import AssignedMidwifeCard, { type AssignedMidwife } from '@/components/AssignedMidwifeCard';

interface DashboardData {
  activePregnancy: {
    id: string;
    lastMenstrualPeriod?: string | null;
    expectedDeliveryDate?: string | null;
    highRisk?: boolean;
    currentWeek?: number | null;
    progress?: {
      weeks: number;
      days: number;
      percentage: number;
      percentComplete: number;
      trimester: number;
      trimesterLabel: string;
      daysUntilDue: number;
      daysRemaining: number;
      month: number;
      isOverdue: boolean;
      expectedDeliveryDate: string;
    } | null;
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
        <div className="relative">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#E5E7EB] border-t-[#2563EB]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Heart className="h-5 w-5 text-[#F472B6] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const pregnancy = dashboardData?.activePregnancy;
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 bg-[#F9FAFB] min-h-screen">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#111827] p-8 text-white">
        {/* Ambient glow effects matching landing page */}
        <div className="absolute top-0 right-[-10%] w-[50%] h-[120%] bg-gradient-to-l from-[#2563EB]/15 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-[-10%] w-[50%] h-[120%] bg-gradient-to-r from-[#F472B6]/12 to-transparent rounded-full blur-[100px] pointer-events-none" />

        {/* Shimmer sweep */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            {/* Pink "live" pill — mirrors homepage/admin style with landing page pink (#F472B6) */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F472B6]/10 border border-[#F472B6]/20 mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F472B6] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F472B6]"></span>
              </span>
              <span className="text-[#F472B6] text-xs font-semibold tracking-widest uppercase">Your Health Journey</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              {greeting}, {session?.user?.name} 👋
            </h1>
            <p className="text-slate-300 text-base max-w-lg leading-relaxed font-light">
              {pregnancy?.progress
                ? <>You&apos;re in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#F472B6] font-semibold">week {pregnancy.progress.weeks}</span> ({pregnancy.progress.trimesterLabel}) of your pregnancy.</>
                : pregnancy
                ? <>You&apos;re in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#F472B6] font-semibold">week {pregnancy.currentWeek || '?'}</span> of your pregnancy.</>
                : <>Track your maternal health journey with{' '}<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#F472B6] font-semibold">CareNest</span>.</>}
            </p>
          </div>

          {/* Right side info chips */}
          <div className="hidden lg:flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-0.5">Today</p>
              <p className="text-base font-semibold text-white">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#D1FAE5]/10 border border-[#10B981]/20 rounded-full">
                <Activity className="h-3.5 w-3.5 text-[#10B981] animate-pulse" />
                <span className="text-xs text-[#10B981] font-medium">Health Active</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F472B6]/10 border border-[#F472B6]/20 rounded-full">
                <Heart className="h-3.5 w-3.5 text-[#F472B6]" />
                <span className="text-xs text-[#F472B6] font-medium">Mother</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Pregnancy"
          value={pregnancy?.progress ? `Week ${pregnancy.progress.weeks}` : pregnancy ? `Week ${pregnancy.currentWeek || '?'}` : 'N/A'}
          icon={<Heart className="h-5 w-5 text-[#EF4444]" />}
          iconBg="bg-red-50"
          valueColor="text-[#EF4444]"
          barColor="bg-[#EF4444]"
          href="/pregnancies"
          delay="stagger-1"
        />
        <StatCard
          title="Children"
          value={dashboardData?.childrenCount?.toString() || '0'}
          icon={<Baby className="h-5 w-5 text-[#F472B6]" />}
          iconBg="bg-pink-50"
          valueColor="text-[#F472B6]"
          barColor="bg-[#F472B6]"
          href="/children"
          delay="stagger-2"
        />
        <StatCard
          title="Upcoming Visits"
          value={dashboardData?.upcomingVisits?.toString() || '0'}
          icon={<Calendar className="h-5 w-5 text-[#10B981]" />}
          iconBg="bg-emerald-50"
          valueColor="text-[#10B981]"
          barColor="bg-[#10B981]"
          href="/visits"
          delay="stagger-3"
        />
        <StatCard
          title="Vaccinations"
          value={dashboardData?.pendingVaccinations?.toString() || '0'}
          icon={<Syringe className="h-5 w-5 text-[#2563EB]" />}
          iconBg="bg-blue-50"
          valueColor="text-[#2563EB]"
          barColor="bg-[#2563EB]"
          href="/vaccinations"
          delay="stagger-4"
        />
      </div>

      {/* ── Child Growth Tracker ── */}
      <ChildGrowthWidget />

      {/* ── Assigned Midwife ── */}
      <AssignedMidwifeCard midwife={dashboardData?.assignedMidwife ?? null} />

      {/* ── Pregnancy Progress ── */}
      {pregnancy && (
        <div className="animate-fade-in-up bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
            <span className="flex items-center gap-2.5 text-[#111827] font-semibold text-sm">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-pink-50">
                <Heart className="h-4 w-4 text-[#F472B6]" />
              </div>
              Pregnancy Progress
            </span>
            {pregnancy.highRisk !== undefined && (
              <Badge variant={pregnancy.highRisk ? 'danger' : 'success'}>
                {pregnancy.highRisk ? 'High Risk' : 'Normal'}
              </Badge>
            )}
          </div>

          <div className="p-6 space-y-5">
            {pregnancy.progress ? (
              <>
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-[#111827]">
                      Week {pregnancy.progress.weeks}, Day {pregnancy.progress.days} of 40
                    </span>
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#F472B6]">
                      {pregnancy.progress.percentComplete}%
                    </span>
                  </div>
                  <div className="w-full bg-[#F3F4F6] rounded-full h-3.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                        pregnancy.progress.isOverdue
                          ? 'bg-gradient-to-r from-[#EF4444] to-[#DC2626]'
                          : 'bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F472B6]'
                      }`}
                      style={{ width: `${pregnancy.progress.percentComplete}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-[#EFF6FF] to-blue-100/50 p-4 rounded-xl text-center border border-blue-100">
                    <span className="text-[#2563EB] text-[10px] font-semibold uppercase tracking-widest">Month</span>
                    <p className="font-extrabold text-2xl text-[#1E40AF] mt-1">{pregnancy.progress.month}</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-rose-100/50 p-4 rounded-xl text-center border border-pink-100">
                    <span className="text-[#F472B6] text-[10px] font-semibold uppercase tracking-widest">Trimester</span>
                    <p className="font-extrabold text-2xl text-[#BE185D] mt-1">{pregnancy.progress.trimester}</p>
                    <p className="text-xs text-[#F472B6] mt-0.5 font-medium">{pregnancy.progress.trimesterLabel}</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-100/50 p-4 rounded-xl text-center border border-emerald-100">
                    <span className="text-[#10B981] text-[10px] font-semibold uppercase tracking-widest">Expected Delivery</span>
                    <p className="font-bold text-sm text-[#065F46] mt-1">{formatDate(pregnancy.progress.expectedDeliveryDate)}</p>
                  </div>
                  <div className={`p-4 rounded-xl text-center border ${
                    pregnancy.progress.isOverdue
                      ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-100'
                      : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-100'
                  }`}>
                    <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                      pregnancy.progress.isOverdue ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                    }`}>
                      {pregnancy.progress.isOverdue ? 'Overdue' : 'Days Remaining'}
                    </span>
                    <p className={`font-extrabold text-2xl mt-1 ${
                      pregnancy.progress.isOverdue ? 'text-[#991B1B]' : 'text-[#92400E]'
                    }`}>
                      {pregnancy.progress.daysRemaining}
                    </p>
                  </div>
                </div>

                {/* Overdue Warning */}
                {pregnancy.progress.isOverdue && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg shrink-0">
                      <Heart className="h-4 w-4 text-[#EF4444]" />
                    </div>
                    <span className="text-[#991B1B] font-medium text-sm">
                      ⚠️ This pregnancy is past the expected delivery date. Please consult your midwife.
                    </span>
                  </div>
                )}
              </>
            ) : (
              /* Fallback for pregnancies without LMP */
              <>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-[#111827]">Week {pregnancy.currentWeek || 0} of 40</span>
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#F472B6]">
                      {Math.round(((pregnancy.currentWeek || 0) / 40) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#F3F4F6] rounded-full h-3.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#F472B6] h-full rounded-full relative"
                      style={{ width: `${Math.min(((pregnancy.currentWeek || 0) / 40) * 100, 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#6B7280] text-xs font-semibold uppercase tracking-wider">Expected Delivery</span>
                    <p className="font-semibold text-[#111827] mt-1">{formatDate(pregnancy.expectedDeliveryDate)}</p>
                  </div>
                  <div>
                    <span className="text-[#6B7280] text-xs font-semibold uppercase tracking-wider">Status</span>
                    <p className="mt-1">
                      <Badge variant={pregnancy.highRisk ? 'danger' : 'success'}>
                        {pregnancy.highRisk ? 'High Risk' : 'Normal'}
                      </Badge>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="animate-fade-in-up stagger-2 bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
        {/* Card header */}
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#E5E7EB]">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50">
            <Sparkles className="h-4 w-4 text-[#2563EB]" />
          </div>
          <span className="text-[#111827] font-semibold text-sm">Quick Actions</span>
        </div>

        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* AI Care Assistant */}
          <ActionCard
            href="/ai-care"
            icon={<Brain className="h-5 w-5 text-[#7C3AED]" />}
            iconBg="bg-purple-50"
            hoverBorder="hover:border-[#7C3AED]/30"
            hoverShadow="hover:shadow-purple-100"
            label="AI Care Assistant"
            sublabel="Nutrition & exercise tips"
            sublabelColor="text-[#6B7280]"
          />
          {/* Chat with Midwife */}
          <ActionCard
            href="/chat"
            icon={<svg className="h-5 w-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
            iconBg="bg-blue-50"
            hoverBorder="hover:border-[#2563EB]/30"
            hoverShadow="hover:shadow-blue-100"
            label="Chat with Midwife"
            sublabel="Send a message"
            sublabelColor="text-[#6B7280]"
          />
          {/* Notifications — full-width dark CTA */}
          <Link
            href="/notifications"
            className="action-glow md:col-span-1 col-span-2 flex items-center gap-4 p-4 bg-[#111827] rounded-2xl border border-[#1E40AF]/20 hover:border-[#2563EB]/40 hover:shadow-lg hover:shadow-black/10 transition-all duration-500 group"
          >
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#F472B6] shadow-lg group-hover:scale-110 transition-transform duration-300 relative">
              <Bell className="h-5 w-5 text-white" />
              {(dashboardData?.unreadNotifications || 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-[#111827] animate-pulse">
                  {dashboardData?.unreadNotifications}
                </span>
              )}
            </div>
            <div className="flex-1">
              <span className="text-sm font-bold text-white block">Notifications</span>
              <span className="text-xs text-[#6B7280] font-light">
                {dashboardData?.unreadNotifications || 0} unread alerts
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-[#3B82F6] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── StatCard ── */
function StatCard({
  title, value, icon, iconBg, valueColor, barColor, href, delay,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor: string;
  barColor: string;
  href: string;
  delay: string;
}) {
  return (
    <Link href={href}>
      <div
        className={`card-lift animate-fade-in-up ${delay} bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm cursor-pointer`}
      >
        {/* Thin top accent bar */}
        <div className={`h-1 w-full ${barColor} opacity-70`} />
        <div className="p-4 pt-3.5">
          <div className="flex items-center justify-between mb-3">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
              {icon}
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${barColor} animate-pulse`} />
              <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest">Live</span>
            </div>
          </div>
          <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-widest mb-1">{title}</p>
          <p className={`text-3xl font-extrabold ${valueColor} animate-count-up`}>{value}</p>
        </div>
      </div>
    </Link>
  );
}

/* ── ActionCard ── */
function ActionCard({
  href, icon, iconBg, hoverBorder, hoverShadow, label, sublabel, sublabelColor,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  hoverBorder: string;
  hoverShadow: string;
  label: string;
  sublabel: string;
  sublabelColor: string;
}) {
  return (
    <Link
      href={href}
      className={`action-glow flex flex-col items-center p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl ${hoverBorder} hover:bg-white hover:shadow-md ${hoverShadow} transition-all duration-300 group`}
    >
      <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${iconBg} mb-3 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <span className="text-sm font-semibold text-[#111827]">{label}</span>
      <span className={`text-xs ${sublabelColor} mt-0.5 font-light`}>{sublabel}</span>
    </Link>
  );
}