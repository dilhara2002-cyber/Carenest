'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Users, Heart, Baby, Calendar, Syringe, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface DashboardData {
  totalMothers: number;
  totalMidwives: number;
  activePregnancies: number;
  totalChildren: number;
  visitsThisMonth: number;
  vaccinationsThisMonth: number;
  recentRegistrations: any[];
}

export default function AdminDashboard() {
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
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Admin Dashboard 🛡️
        </h1>
        <p className="opacity-90">
          Welcome back, {session?.user?.name}. Monitor and manage the CareNest system.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Mothers"
          value={dashboardData?.totalMothers?.toString() || '0'}
          icon={<Users className="h-5 w-5 text-blue-500" />}
          color="blue"
        />
        <StatCard
          title="Midwives"
          value={dashboardData?.totalMidwives?.toString() || '0'}
          icon={<UserPlus className="h-5 w-5 text-purple-500" />}
          color="purple"
        />
        <StatCard
          title="Active Pregnancies"
          value={dashboardData?.activePregnancies?.toString() || '0'}
          icon={<Heart className="h-5 w-5 text-pink-500" />}
          color="pink"
        />
        <StatCard
          title="Children"
          value={dashboardData?.totalChildren?.toString() || '0'}
          icon={<Baby className="h-5 w-5 text-cyan-500" />}
          color="cyan"
        />
        <StatCard
          title="Visits (Month)"
          value={dashboardData?.visitsThisMonth?.toString() || '0'}
          icon={<Calendar className="h-5 w-5 text-green-500" />}
          color="green"
        />
        <StatCard
          title="Vaccinations"
          value={dashboardData?.vaccinationsThisMonth?.toString() || '0'}
          icon={<Syringe className="h-5 w-5 text-orange-500" />}
          color="orange"
        />
      </div>

      {/* Recent Registrations and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Registrations</span>
              <Link href="/mothers" className="text-sm text-teal-600 hover:underline">
                View All
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.recentRegistrations && dashboardData.recentRegistrations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentRegistrations.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent registrations</p>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions */}
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
                <span className="text-sm font-medium text-blue-900">Manage Mothers</span>
              </Link>
              <Link
                href="/midwives"
                className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <UserPlus className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-purple-900">Manage Midwives</span>
              </Link>
              <Link
                href="/visits"
                className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Calendar className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-green-900">All Visits</span>
              </Link>
              <Link
                href="/vaccinations"
                className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Syringe className="h-8 w-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium text-orange-900">Vaccinations</span>
              </Link>
              <Link
                href="/reports"
                className="flex flex-col items-center p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors col-span-2"
              >
                <svg className="h-8 w-8 text-pink-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-pink-900">Reports & Analytics</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className="p-2 bg-gray-100 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
