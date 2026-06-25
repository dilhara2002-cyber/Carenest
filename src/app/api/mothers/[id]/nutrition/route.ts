import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper to check authorization and get the mother
async function getMotherAndCheckPermission(
  motherId: string,
  session: any,
  allowedRoles: string[]
): Promise<{ mother: any; error: string | null; status: number | null }> {
  if (!session || !session.user) {
    return { mother: null, error: 'Unauthorized', status: 401 };
  }

  if (!allowedRoles.includes(session.user.role)) {
    return { mother: null, error: 'Unauthorized', status: 401 };
  }

  const mother = await prisma.mother.findUnique({
    where: { id: motherId },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });

  if (!mother) {
    return { mother: null, error: 'Mother not found', status: 404 };
  }

  // Mother can only access if it is her own profile
  if (session.user.role === 'MOTHER' && mother.id !== session.user.motherId) {
    return { mother: null, error: 'Forbidden - Cannot access other mother profiles', status: 403 };
  }

  // Midwife can only access if mother is assigned to her
  if (
    session.user.role === 'MIDWIFE' &&
    session.user.midwifeId &&
    mother.assignedMidwifeId !== session.user.midwifeId
  ) {
    return { mother: null, error: 'Forbidden - Mother is not assigned to you', status: 403 };
  }

  return { mother, error: null, status: null };
}

// GET mother nutrition and weight history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: motherId } = await params;

    const { mother, error, status } = await getMotherAndCheckPermission(
      motherId,
      session,
      ['MOTHER', 'MIDWIFE', 'ADMIN']
    );

    if (error || !mother) {
      return NextResponse.json({ error: error || 'Mother not found' }, { status: status || 404 });
    }

    // Get all completed visits with weight data
    const visits = await prisma.visit.findMany({
      where: {
        motherId,
        status: 'COMPLETED',
        weight: { not: null },
      },
      orderBy: { visitDate: 'asc' },
    });

    const heightVal = mother.height ? Number(mother.height) : null;
    const history = visits.map((visit) => {
      const weightVal = visit.weight ? Number(visit.weight) : null;
      let bmi = null;

      if (weightVal && heightVal && heightVal > 0) {
        const heightInMeters = heightVal / 100;
        bmi = Number((weightVal / (heightInMeters * heightInMeters)).toFixed(2));
      }

      return {
        visitId: visit.id,
        visitDate: visit.visitDate,
        visitType: visit.visitType,
        weightKg: weightVal,
        bmi,
        notes: visit.notes,
      };
    });

    // Determine current status
    const latestRecord = history[history.length - 1] || null;
    const currentWeight = latestRecord ? latestRecord.weightKg : null;
    const currentBmi = latestRecord ? latestRecord.bmi : null;

    let nutritionalCategory = 'UNKNOWN';
    if (currentBmi) {
      if (currentBmi < 18.5) {
        nutritionalCategory = 'UNDERWEIGHT';
      } else if (currentBmi < 25) {
        nutritionalCategory = 'NORMAL';
      } else if (currentBmi < 30) {
        nutritionalCategory = 'OVERWEIGHT';
      } else {
        nutritionalCategory = 'OBESE';
      }
    }

    return NextResponse.json({
      data: {
        motherId,
        motherName: mother.user.name,
        heightCm: heightVal,
        currentWeightKg: currentWeight,
        currentBmi,
        nutritionalCategory,
        history,
      },
    });
  } catch (error) {
    console.error('Get mother nutrition error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nutrition data' },
      { status: 500 }
    );
  }
}

// POST/PATCH to set or update mother's height (Admin/Midwife only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: motherId } = await params;

    const { mother, error, status } = await getMotherAndCheckPermission(
      motherId,
      session,
      ['MIDWIFE', 'ADMIN']
    );

    if (error || !mother) {
      return NextResponse.json({ error: error || 'Mother not found' }, { status: status || 404 });
    }

    const body = await req.json();
    const { height } = body;

    if (height === undefined) {
      return NextResponse.json(
        { error: 'Height parameter is required' },
        { status: 400 }
      );
    }

    const heightVal = Number(height);
    if (isNaN(heightVal) || heightVal <= 0) {
      return NextResponse.json(
        { error: 'Height must be a positive number' },
        { status: 400 }
      );
    }

    const updatedMother = await prisma.mother.update({
      where: { id: motherId },
      data: {
        height: heightVal,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MOTHER_HEIGHT_UPDATED',
        entity: 'Mother',
        entityId: motherId,
        details: `Updated height to ${heightVal}cm for ${mother.user.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Mother height updated successfully',
      data: {
        id: updatedMother.id,
        height: Number(updatedMother.height),
      },
    });
  } catch (error) {
    console.error('Update mother height error:', error);
    return NextResponse.json(
      { error: 'Failed to update height' },
      { status: 500 }
    );
  }
}

// Support POST as alias for PATCH
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(req, { params });
}
