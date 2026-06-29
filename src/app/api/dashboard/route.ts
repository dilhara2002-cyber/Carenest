import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPregnancyProgress } from '@/lib/utils';

// Get dashboard statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, motherId, midwifeId } = session.user;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (role === 'MOTHER' && motherId) {
      // Mother dashboard stats
      const [
        pregnancies,
        children,
        upcomingVisits,
        pendingVaccinations,
        unreadNotifications,
        motherProfile,
      ] = await Promise.all([
        prisma.pregnancy.findMany({
          where: { motherId, status: 'ACTIVE' },
        }),
        prisma.child.count({ where: { motherId } }),
        prisma.visit.count({
          where: {
            motherId,
            visitDate: { gte: today },
            status: 'SCHEDULED',
          },
        }),
        prisma.vaccination.count({
          where: {
            OR: [
              { motherId },
              { child: { motherId } },
            ],
            status: 'PENDING',
            scheduledDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.notification.count({
          where: { userId: session.user.id, status: 'UNREAD' },
        }),
        prisma.mother.findUnique({
          where: { id: motherId },
          select: {
            assignedMidwife: {
              select: {
                id: true,
                userId: true,
                licenseNumber: true,
                specialization: true,
                workArea: true,
                experience: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true,
                    profileImage: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      const activePregnancy = pregnancies[0] || null;
      const progress = activePregnancy
        ? getPregnancyProgress(activePregnancy.lastMenstrualPeriod)
        : null;

      return NextResponse.json({
        data: {
          activePregnancy: activePregnancy
            ? { ...activePregnancy, currentWeek: progress?.weeks ?? activePregnancy.currentWeek, progress }
            : null,
          childrenCount: children,
          upcomingVisits,
          pendingVaccinations,
          unreadNotifications,
          assignedMidwife: motherProfile?.assignedMidwife ?? null,
        },
      });
    }

    if (role === 'MIDWIFE' && midwifeId) {
      // Midwife dashboard stats
      const [
        assignedMothers,
        activePregnancies,
        todayVisits,
        upcomingVisits,
        pendingVaccinations,
        completedVisitsThisMonth,
        highRiskCases,
      ] = await Promise.all([
        prisma.mother.count({ where: { assignedMidwifeId: midwifeId } }),
        prisma.pregnancy.count({
          where: {
            mother: { assignedMidwifeId: midwifeId },
            status: 'ACTIVE',
          },
        }),
        prisma.visit.count({
          where: {
            midwifeId,
            visitDate: {
              gte: new Date(today.setHours(0, 0, 0, 0)),
              lt: new Date(today.setHours(23, 59, 59, 999)),
            },
            status: 'SCHEDULED',
          },
        }),
        prisma.visit.findMany({
          where: {
            midwifeId,
            visitDate: { gte: new Date() },
            status: 'SCHEDULED',
          },
          include: {
            mother: {
              include: { user: { select: { name: true } } },
            },
          },
          orderBy: { visitDate: 'asc' },
          take: 5,
        }),
        prisma.vaccination.count({
          where: {
            mother: { assignedMidwifeId: midwifeId },
            status: 'PENDING',
          },
        }),
        prisma.visit.count({
          where: {
            midwifeId,
            status: 'COMPLETED',
            updatedAt: { gte: startOfMonth },
          },
        }),
        prisma.pregnancy.count({
          where: {
            mother: { assignedMidwifeId: midwifeId },
            status: 'ACTIVE',
            highRisk: true,
          },
        }),
      ]);

      // Fetch active pregnancies with mother details for progress overview
      const pregnancyRecords = await prisma.pregnancy.findMany({
        where: {
          mother: { assignedMidwifeId: midwifeId },
          status: 'ACTIVE',
        },
        include: {
          mother: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const pregnancyOverview = pregnancyRecords.map((p) => {
        const progress = getPregnancyProgress(p.lastMenstrualPeriod);
        return {
          id: p.id,
          motherName: p.mother?.user?.name || 'Unknown',
          motherId: p.motherId,
          highRisk: p.highRisk,
          lastMenstrualPeriod: p.lastMenstrualPeriod,
          expectedDeliveryDate: p.expectedDeliveryDate,
          currentWeek: progress?.weeks ?? p.currentWeek,
          progress,
        };
      });

      return NextResponse.json({
        data: {
          assignedMothers,
          activePregnancies,
          todayVisits,
          upcomingVisits,
          pendingVaccinations,
          completedVisitsThisMonth,
          highRiskCases,
          pregnancyOverview,
        },
      });
    }

    if (role === 'ADMIN') {
      // Admin dashboard stats
      const [
        totalMothers,
        totalMidwives,
        activePregnancies,
        totalChildren,
        visitsThisMonth,
        vaccinationsThisMonth,
        recentRegistrations,
      ] = await Promise.all([
        prisma.mother.count(),
        prisma.midwife.count(),
        prisma.pregnancy.count({ where: { status: 'ACTIVE' } }),
        prisma.child.count(),
        prisma.visit.count({
          where: { visitDate: { gte: startOfMonth } },
        }),
        prisma.vaccination.count({
          where: {
            status: 'COMPLETED',
            administeredDate: { gte: startOfMonth },
          },
        }),
        prisma.user.findMany({
          where: { role: 'MOTHER' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, name: true, email: true, createdAt: true },
        }),
      ]);

      return NextResponse.json({
        data: {
          totalMothers,
          totalMidwives,
          activePregnancies,
          totalChildren,
          visitsThisMonth,
          vaccinationsThisMonth,
          recentRegistrations,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}