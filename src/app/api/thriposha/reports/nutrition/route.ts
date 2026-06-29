import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Gather Mothers' BMI Breakdown
    const mothers = await prisma.mother.findMany({
      include: {
        visits: {
          where: { status: 'COMPLETED', weight: { not: null } },
          orderBy: { visitDate: 'desc' },
          take: 1,
        },
      },
    });

    let motherUnderweight = 0;
    let motherNormal = 0;
    let motherOverweight = 0;
    let motherObese = 0;
    let motherMissing = 0;

    for (const mother of mothers) {
      const heightVal = mother.height ? Number(mother.height) : null;
      const latestVisit = mother.visits[0] || null;
      const weightVal = latestVisit && latestVisit.weight ? Number(latestVisit.weight) : null;

      if (heightVal && weightVal && heightVal > 0) {
        const heightM = heightVal / 100;
        const bmi = weightVal / (heightM * heightM);

        if (bmi < 18.5) motherUnderweight++;
        else if (bmi < 25.0) motherNormal++;
        else if (bmi < 30.0) motherOverweight++;
        else motherObese++;
      } else {
        motherMissing++;
      }
    }

    const totalMothersCalculated = motherUnderweight + motherNormal + motherOverweight + motherObese;

    // 2. Gather Children's BMI/Growth Breakdown
    const children = await prisma.child.findMany({
      include: {
        growthRecords: {
          orderBy: { recordDate: 'desc' },
          take: 1,
        },
      },
    });

    let childUnderweight = 0; // BMI < 14
    let childNormal = 0;      // 14 <= BMI < 18
    let childOverweight = 0;  // BMI >= 18
    let childMissing = 0;

    for (const child of children) {
      const latestRecord = child.growthRecords[0] || null;
      const bmiVal = latestRecord && latestRecord.bmi ? Number(latestRecord.bmi) : null;

      if (bmiVal) {
        if (bmiVal < 14.0) childUnderweight++;
        else if (bmiVal < 18.0) childNormal++;
        else childOverweight++;
      } else {
        childMissing++;
      }
    }

    const totalChildrenCalculated = childUnderweight + childNormal + childOverweight;

    // 3. Stock Level Summary and Alert
    const stockRecords = await prisma.thriposhaStock.findMany();
    const totalReceived = stockRecords.reduce(
      (sum, record) => sum + Number(record.quantity),
      0
    );

    const distributedAgg = await prisma.thriposhaDistribution.aggregate({
      _sum: { quantity: true },
    });
    const totalDistributed = Number(distributedAgg._sum.quantity || 0);
    const remainingStock = totalReceived - totalDistributed;

    // Sum received by packetType
    const receivedByColor = { RED: 0, ORANGE: 0, YELLOW: 0 };
    for (const record of stockRecords) {
      receivedByColor[record.packetType] = (receivedByColor[record.packetType] || 0) + Number(record.quantity);
    }

    // Sum distributed by packetType
    const distributedByColor = { RED: 0, ORANGE: 0, YELLOW: 0 };
    const distributionsGroupBy = await prisma.thriposhaDistribution.groupBy({
      by: ['packetType'],
      _sum: { quantity: true },
    });
    for (const item of distributionsGroupBy) {
      if (item.packetType) {
        distributedByColor[item.packetType] = Number(item._sum.quantity || 0);
      }
    }

    const remainingByColor = {
      RED: Math.round((receivedByColor.RED - distributedByColor.RED) * 100) / 100,
      ORANGE: Math.round((receivedByColor.ORANGE - distributedByColor.ORANGE) * 100) / 100,
      YELLOW: Math.round((receivedByColor.YELLOW - distributedByColor.YELLOW) * 100) / 100,
    };

    const isLowStock = remainingStock < 50 || remainingByColor.RED < 20 || remainingByColor.ORANGE < 20 || remainingByColor.YELLOW < 20;

    const alertMessages = [];
    if (remainingStock < 50) alertMessages.push(`Overall stock is low (${remainingStock} packets)`);
    if (remainingByColor.RED < 20) alertMessages.push(`RED packet stock is low (${remainingByColor.RED} packets)`);
    if (remainingByColor.ORANGE < 20) alertMessages.push(`ORANGE packet stock is low (${remainingByColor.ORANGE} packets)`);
    if (remainingByColor.YELLOW < 20) alertMessages.push(`YELLOW packet stock is low (${remainingByColor.YELLOW} packets)`);
    const stockAlertMessage = alertMessages.length > 0 ? alertMessages.join('; ') : 'Stock levels sufficient';

    // 4. Beneficiary Malnutrition & High-Risk Alerts
    const highRiskMothersCount = await prisma.pregnancy.count({
      where: { status: 'ACTIVE', highRisk: true },
    });

    // Low birth weight children count
    const lowBirthWeightChildrenCount = await prisma.child.count({
      where: {
        birthWeight: { lt: 2.5 },
      },
    });

    return NextResponse.json({
      data: {
        stock: {
          totalReceivedKg: Math.round(totalReceived * 100) / 100,
          totalDistributedKg: Math.round(totalDistributed * 100) / 100,
          remainingKg: Math.round(remainingStock * 100) / 100,
          isLowStock,
          stockAlertMessage,
          byColor: {
            received: receivedByColor,
            distributed: distributedByColor,
            remaining: remainingByColor,
          }
        },
        mothersBmiBreakdown: {
          underweight: motherUnderweight,
          normal: motherNormal,
          overweight: motherOverweight,
          obese: motherObese,
          missingData: motherMissing,
          totalCount: mothers.length,
          calculatedCount: totalMothersCalculated,
          percentages: {
            underweight: totalMothersCalculated > 0 ? Math.round((motherUnderweight / totalMothersCalculated) * 100) : 0,
            normal: totalMothersCalculated > 0 ? Math.round((motherNormal / totalMothersCalculated) * 100) : 0,
            overweight: totalMothersCalculated > 0 ? Math.round((motherOverweight / totalMothersCalculated) * 100) : 0,
            obese: totalMothersCalculated > 0 ? Math.round((motherObese / totalMothersCalculated) * 100) : 0,
          },
        },
        childrenBmiBreakdown: {
          underweight: childUnderweight,
          normal: childNormal,
          overweight: childOverweight,
          missingData: childMissing,
          totalCount: children.length,
          calculatedCount: totalChildrenCalculated,
          percentages: {
            underweight: totalChildrenCalculated > 0 ? Math.round((childUnderweight / totalChildrenCalculated) * 100) : 0,
            normal: totalChildrenCalculated > 0 ? Math.round((childNormal / totalChildrenCalculated) * 100) : 0,
            overweight: totalChildrenCalculated > 0 ? Math.round((childOverweight / totalChildrenCalculated) * 100) : 0,
          },
        },
        alerts: {
          highRiskPregnancies: highRiskMothersCount,
          underweightMothers: motherUnderweight,
          lowBirthWeightChildren: lowBirthWeightChildrenCount,
          underweightChildren: childUnderweight,
        },
      },
    });
  } catch (error) {
    console.error('Fetch nutrition analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve nutrition reports and analytics' },
      { status: 500 }
    );
  }
}
