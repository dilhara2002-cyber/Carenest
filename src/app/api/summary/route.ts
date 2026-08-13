import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'month';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    if (range === 'custom' && startDateParam) {
      startDate = new Date(startDateParam);
    } else if (range === 'week') {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'quarter') {
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    } else if (range === 'year') {
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    } else if (range === 'all') {
      startDate = new Date(0);
    } else {
      // month
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const dateFilter = {
      gte: startDate,
      lte: endDate,
    };

    const [
      totalMothers,
      totalMidwives,
      activePregnancies,
      totalChildren,
      visitsCount,
      vaccinationsCount,
      distributionsCount,
    ] = await Promise.all([
      prisma.mother.count({
        where: { createdAt: dateFilter },
      }),
      prisma.midwife.count(),
      prisma.pregnancy.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.child.count({
        where: { createdAt: dateFilter },
      }),
      prisma.visit.count({
        where: { visitDate: dateFilter },
      }),
      prisma.vaccination.count({
        where: { scheduledDate: dateFilter },
      }),
      prisma.thriposhaDistribution.count({
        where: { distributionDate: dateFilter },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalMothers,
        totalMidwives,
        activePregnancies,
        totalChildren,
        visitsCount,
        vaccinationsCount,
        distributionsCount,
        range,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error('Summary API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary report' },
      { status: 500 }
    );
  }
}
