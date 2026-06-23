import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get Thriposha reports — monthly aggregation
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()));

    // Get distributions for the selected month
    const distributions = await prisma.thriposhaDistribution.findMany({
      where: { month, year },
      include: {
        mother: {
          include: { user: { select: { name: true } } },
        },
        child: { select: { id: true, name: true } },
        midwife: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    // Total distributed quantity for the month
    const totalDistributedKg = distributions.reduce(
      (sum, d) => sum + Number(d.quantity),
      0
    );

    // Unique beneficiaries (unique mother IDs + unique child IDs)
    const uniqueMotherIds = new Set(
      distributions.filter((d) => d.motherId).map((d) => d.motherId)
    );
    const uniqueChildIds = new Set(
      distributions.filter((d) => d.childId).map((d) => d.childId)
    );
    const totalBeneficiaries = uniqueMotherIds.size + uniqueChildIds.size;

    // Breakdown by recipient type
    const byRecipientType: Record<string, { count: number; totalKg: number }> = {};
    for (const d of distributions) {
      if (!byRecipientType[d.recipientType]) {
        byRecipientType[d.recipientType] = { count: 0, totalKg: 0 };
      }
      byRecipientType[d.recipientType].count += 1;
      byRecipientType[d.recipientType].totalKg += Number(d.quantity);
    }

    // Round the totalKg values
    for (const key of Object.keys(byRecipientType)) {
      byRecipientType[key].totalKg =
        Math.round(byRecipientType[key].totalKg * 100) / 100;
    }

    // By midwife breakdown
    const midwifeMap: Record<
      string,
      { midwifeName: string; count: number; totalKg: number }
    > = {};
    for (const d of distributions) {
      const midId = d.midwifeId;
      if (!midwifeMap[midId]) {
        midwifeMap[midId] = {
          midwifeName: d.midwife?.user?.name || 'Unknown',
          count: 0,
          totalKg: 0,
        };
      }
      midwifeMap[midId].count += 1;
      midwifeMap[midId].totalKg += Number(d.quantity);
    }
    const byMidwife = Object.values(midwifeMap).map((m) => ({
      ...m,
      totalKg: Math.round(m.totalKg * 100) / 100,
    }));

    // Stock summary
    const stockRecords = await prisma.thriposhaStock.findMany();
    const totalReceivedKg = stockRecords.reduce(
      (sum, s) => sum + Number(s.quantity),
      0
    );
    const allDistributedAgg = await prisma.thriposhaDistribution.aggregate({
      _sum: { quantity: true },
    });
    const allDistributedKg = Number(allDistributedAgg._sum.quantity || 0);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const trendDate = new Date(year, month - 1 - i, 1);
      const trendMonth = trendDate.getMonth() + 1;
      const trendYear = trendDate.getFullYear();

      const agg = await prisma.thriposhaDistribution.aggregate({
        where: { month: trendMonth, year: trendYear },
        _sum: { quantity: true },
        _count: { id: true },
      });

      monthlyTrend.push({
        month: trendMonth,
        year: trendYear,
        totalKg: Math.round(Number(agg._sum.quantity || 0) * 100) / 100,
        count: agg._count.id,
        label: new Date(trendYear, trendMonth - 1).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
      });
    }

    return NextResponse.json({
      data: {
        month,
        year,
        totalDistributedKg: Math.round(totalDistributedKg * 100) / 100,
        totalBeneficiaries,
        byRecipientType,
        byMidwife,
        stockSummary: {
          totalReceivedKg: Math.round(totalReceivedKg * 100) / 100,
          totalDistributedKg: Math.round(allDistributedKg * 100) / 100,
          remainingKg:
            Math.round((totalReceivedKg - allDistributedKg) * 100) / 100,
        },
        monthlyTrend,
        distributions,
      },
    });
  } catch (error) {
    console.error('Thriposha reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report data' },
      { status: 500 }
    );
  }
}
