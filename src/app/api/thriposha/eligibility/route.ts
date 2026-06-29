import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ThriposhaPacketType } from '@prisma/client';

// Helper to calculate age in months/years
function getAge(birthDate: Date) {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - birthDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30.43);
  const years = Math.floor(months / 12);
  return { years, months };
}

// Helper to check Mother eligibility
function evaluateMotherEligibility(mother: any) {
  const activePregnancy = mother.pregnancies.find((p: any) => p.status === 'ACTIVE');
  
  // 1. Pregnant Mother check
  if (activePregnancy) {
    const reasons: string[] = ['Active pregnancy'];
    
    // Check latest BMI / weight
    let hasLowBmi = false;
    let hasLowWeight = false;
    let bmiValue = null;
    let weightValue = null;

    if (mother.height && mother.visits.length > 0) {
      const heightVal = Number(mother.height);
      const weightVal = Number(mother.visits[0].weight);
      if (heightVal > 0 && weightVal > 0) {
        weightValue = weightVal;
        bmiValue = weightVal / ((heightVal / 100) * (heightVal / 100));
        if (bmiValue < 18.5) {
          hasLowBmi = true;
        }
        if (weightVal < 45) {
          hasLowWeight = true;
        }
      }
    }

    const isHighRisk = activePregnancy.highRisk === true;
    
    if (isHighRisk) {
      reasons.push(`High-risk pregnancy: ${activePregnancy.highRiskReasons || 'unspecified reasons'}`);
    }
    if (hasLowBmi && bmiValue) {
      reasons.push(`Low BMI: ${bmiValue.toFixed(2)} (Underweight)`);
    }
    if (hasLowWeight && weightValue) {
      reasons.push(`Low weight: ${weightValue.toFixed(2)} kg (Under 45 kg)`);
    }

    const isEligible = hasLowBmi || hasLowWeight || isHighRisk;

    if (!isEligible) {
      return {
        eligible: false,
        recipientType: 'PREGNANT_MOTHER',
        packetType: 'YELLOW' as ThriposhaPacketType,
        reasons: ['Pregnant mother has normal BMI, weight >= 45kg, and is not high-risk'],
        riskLevel: 'NORMAL',
        details: {
          expectedDeliveryDate: activePregnancy.expectedDeliveryDate,
          currentWeek: activePregnancy.currentWeek,
        },
      };
    }

    // Check if expected delivery date is near (within 60 days) and weight/BMI is insufficient
    let isEddNear = false;
    if (activePregnancy.expectedDeliveryDate) {
      const eddDate = new Date(activePregnancy.expectedDeliveryDate);
      const today = new Date();
      const diffTime = eddDate.getTime() - today.getTime();
      const daysToEdd = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysToEdd >= 0 && daysToEdd <= 60) {
        isEddNear = true;
        reasons.push(`Expected delivery date is near (${daysToEdd} days remaining)`);
      }
    }

    let riskLevel = 'NORMAL';
    if (isHighRisk || (isEddNear && (hasLowBmi || hasLowWeight))) {
      riskLevel = 'HIGH';
    }

    return {
      eligible: true,
      recipientType: 'PREGNANT_MOTHER',
      packetType: 'YELLOW' as ThriposhaPacketType,
      reasons,
      riskLevel,
      details: {
        expectedDeliveryDate: activePregnancy.expectedDeliveryDate,
        currentWeek: activePregnancy.currentWeek,
      },
    };
  }

  // 2. Lactating Mother check (child under 6 months)
  const children = mother.children || [];
  const infantChild = children.find((c: any) => {
    const age = getAge(new Date(c.birthDate));
    return age.months < 6;
  });

  if (infantChild) {
    const age = getAge(new Date(infantChild.birthDate));
    const reasons = [`Lactating mother of infant ${infantChild.name} (Age: ${age.months} months)`];
    
    // Check latest BMI / weight as well to set risk level
    let riskLevel = 'NORMAL';
    if (mother.height && mother.visits.length > 0) {
      const heightVal = Number(mother.height);
      const weightVal = Number(mother.visits[0].weight);
      if (heightVal > 0 && weightVal > 0) {
        const bmi = weightVal / ((heightVal / 100) * (heightVal / 100));
        if (bmi < 18.5) {
          riskLevel = 'HIGH';
          reasons.push(`Low BMI: ${bmi.toFixed(2)} (Underweight)`);
        }
        if (weightVal < 45) {
          reasons.push(`Low weight: ${weightVal} kg (Under 45 kg)`);
        }
      }
    }

    return {
      eligible: true,
      recipientType: 'LACTATING_MOTHER',
      packetType: 'YELLOW' as ThriposhaPacketType,
      reasons,
      riskLevel,
      details: {
        childId: infantChild.id,
        childName: infantChild.name,
        childBirthDate: infantChild.birthDate,
      },
    };
  }

  return {
    eligible: false,
    recipientType: null,
    packetType: null,
    reasons: ['Not currently pregnant and does not have a child under 6 months old'],
    riskLevel: 'NORMAL',
  };
}

// Helper to check Child eligibility
function evaluateChildEligibility(child: any) {
  const birthDate = new Date(child.birthDate);
  const age = getAge(birthDate);
  const ageInMonths = age.months;

  // Underweight child is defined as BMI < 14
  const latestRecord = child.growthRecords?.[0] || null;
  const bmiVal = latestRecord && latestRecord.bmi ? Number(latestRecord.bmi) : null;
  const isUnderweight = bmiVal !== null && bmiVal < 14;

  const reasons = [`Child age: ${age.years} years, ${age.months % 12} months`];
  if (bmiVal !== null) {
    reasons.push(`BMI: ${bmiVal.toFixed(2)}`);
  } else {
    reasons.push('No BMI growth record available');
  }

  // Red packet eligibility: Underweight children aged 6 months to 3 years (6–36 months)
  if (ageInMonths >= 6 && ageInMonths <= 36) {
    if (isUnderweight) {
      reasons.push('Underweight child in age group 6 months - 3 years');
      return {
        eligible: true,
        recipientType: 'CHILD_UNDER_5',
        packetType: 'RED' as ThriposhaPacketType,
        reasons,
        riskLevel: 'HIGH', // Underweight at this age is high risk
      };
    } else {
      reasons.push('Child is not underweight (BMI >= 14)');
      return {
        eligible: false,
        recipientType: 'CHILD_UNDER_5',
        packetType: 'RED' as ThriposhaPacketType,
        reasons,
        riskLevel: 'NORMAL',
      };
    }
  }

  // Orange packet eligibility: Underweight children older than 3 years (36–60 months)
  if (ageInMonths > 36 && ageInMonths <= 60) {
    if (isUnderweight) {
      reasons.push('Underweight child in age group 3 years - 5 years');
      return {
        eligible: true,
        recipientType: 'CHILD_UNDER_5',
        packetType: 'ORANGE' as ThriposhaPacketType,
        reasons,
        riskLevel: 'HIGH',
      };
    } else {
      reasons.push('Child is not underweight (BMI >= 14)');
      return {
        eligible: false,
        recipientType: 'CHILD_UNDER_5',
        packetType: 'ORANGE' as ThriposhaPacketType,
        reasons,
        riskLevel: 'NORMAL',
      };
    }
  }

  // If child is under 6 months or over 5 years
  reasons.push('Not in eligible age group (6 months to 5 years)');
  return {
    eligible: false,
    recipientType: null,
    packetType: null,
    reasons,
    riskLevel: 'NORMAL',
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['MIDWIFE', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const motherId = searchParams.get('motherId');
    const childId = searchParams.get('childId');

    // Case 1: Evaluate a single mother
    if (motherId) {
      const mother = await prisma.mother.findUnique({
        where: { id: motherId },
        include: {
          pregnancies: true,
          children: true,
          visits: {
            where: { status: 'COMPLETED', weight: { not: null } },
            orderBy: { visitDate: 'desc' },
            take: 1,
          },
        },
      });

      if (!mother) {
        return NextResponse.json({ error: 'Mother not found' }, { status: 404 });
      }

      const evaluation = evaluateMotherEligibility(mother);
      return NextResponse.json({ data: evaluation });
    }

    // Case 2: Evaluate a single child
    if (childId) {
      const child = await prisma.child.findUnique({
        where: { id: childId },
        include: {
          growthRecords: {
            orderBy: { recordDate: 'desc' },
            take: 1,
          },
        },
      });

      if (!child) {
        return NextResponse.json({ error: 'Child not found' }, { status: 404 });
      }

      const evaluation = evaluateChildEligibility(child);
      return NextResponse.json({ data: evaluation });
    }

    // Case 3: Batch evaluation of assigned mothers & children
    const midwifeId = session.user.role === 'MIDWIFE' ? session.user.midwifeId : searchParams.get('midwifeId');
    const whereClause: any = {};
    if (midwifeId) {
      whereClause.assignedMidwifeId = midwifeId;
    }

    const mothers = await prisma.mother.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true } },
        pregnancies: true,
        children: {
          include: {
            growthRecords: {
              orderBy: { recordDate: 'desc' },
              take: 1,
            },
          },
        },
        visits: {
          where: { status: 'COMPLETED', weight: { not: null } },
          orderBy: { visitDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const eligibleMothers: any[] = [];
    const eligibleChildren: any[] = [];

    for (const m of mothers) {
      const mEval = evaluateMotherEligibility(m);
      if (mEval.eligible) {
        eligibleMothers.push({
          motherId: m.id,
          name: m.user.name,
          recipientType: mEval.recipientType,
          packetType: mEval.packetType,
          reasons: mEval.reasons,
          riskLevel: mEval.riskLevel,
          details: mEval.details,
        });
      }

      for (const c of m.children) {
        const cEval = evaluateChildEligibility(c);
        if (cEval.eligible) {
          eligibleChildren.push({
            childId: c.id,
            name: c.name,
            motherName: m.user.name,
            recipientType: cEval.recipientType,
            packetType: cEval.packetType,
            reasons: cEval.reasons,
            riskLevel: cEval.riskLevel,
          });
        }
      }
    }

    return NextResponse.json({
      data: {
        mothers: eligibleMothers,
        children: eligibleChildren,
        summary: {
          totalEligibleMothers: eligibleMothers.length,
          totalEligibleChildren: eligibleChildren.length,
          highRiskMothers: eligibleMothers.filter((m) => m.riskLevel === 'HIGH').length,
          highRiskChildren: eligibleChildren.filter((c) => c.riskLevel === 'HIGH').length,
        },
      },
    });
  } catch (error) {
    console.error('Check Thriposha eligibility error:', error);
    return NextResponse.json(
      { error: 'Failed to process eligibility checking' },
      { status: 500 }
    );
  }
}
